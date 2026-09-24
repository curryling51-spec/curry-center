export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  const revisionId = getRouterParam(event, 'revisionId') || ''
  if (!isUuid(id) || !isUuid(revisionId)) {
    throw createError({ statusCode: 400, statusMessage: '文章历史 ID 不正确' })
  }

  const supabase = useSupabaseServer()
  const [currentResult, revisionResult] = await Promise.all([
    supabase
      .from('knowledge_articles')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('knowledge_article_revisions')
      .select('*')
      .eq('id', revisionId)
      .eq('article_id', id)
      .maybeSingle()
  ])

  if (currentResult.error || revisionResult.error) {
    throw createError({ statusCode: 500, statusMessage: '文章历史读取失败' })
  }
  if (!currentResult.data) throw createError({ statusCode: 404, statusMessage: '知识文章不存在' })
  if (!revisionResult.data) throw createError({ statusCode: 404, statusMessage: '文章历史不存在' })

  const current = currentResult.data
  const revision = revisionResult.data
  const { data: category, error: categoryError } = await supabase
    .from('knowledge_categories')
    .select('id')
    .eq('id', revision.category_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (categoryError) throw createError({ statusCode: 500, statusMessage: '文章分类检查失败' })
  if (!category) {
    throw createError({ statusCode: 409, statusMessage: '该历史版本所属分类已删除，无法恢复' })
  }

  const snapshotId = await createArticleRevision(supabase, current, user, 'restore')
  const { data, error } = await supabase
    .from('knowledge_articles')
    .update({
      category_id: revision.category_id,
      title: revision.title,
      slug: revision.slug,
      content_markdown: revision.content_markdown,
      status: revision.status,
      published_at: revision.published_at,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    await rollbackArticleRevision(supabase, snapshotId)
    knowledgeDatabaseError(error, '文章历史恢复失败')
  }
  if (!data) {
    await rollbackArticleRevision(supabase, snapshotId)
    throw createError({ statusCode: 404, statusMessage: '知识文章不存在' })
  }

  return data
})
