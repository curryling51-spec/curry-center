export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  const revisionId = getRouterParam(event, 'revisionId') || ''
  if (!isUuid(id) || !isUuid(revisionId)) {
    throw createError({ statusCode: 400, statusMessage: '文章历史 ID 不正确' })
  }

  const supabase = useSupabaseServer()
  const { data: article, error: articleError } = await supabase
    .from('knowledge_articles')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (articleError) throw createError({ statusCode: 500, statusMessage: '文章信息读取失败' })
  if (!article) throw createError({ statusCode: 404, statusMessage: '知识文章不存在' })

  const { data, error } = await supabase
    .from('knowledge_article_revisions')
    .select('*')
    .eq('id', revisionId)
    .eq('article_id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: '文章历史读取失败' })
  if (!data) throw createError({ statusCode: 404, statusMessage: '文章历史不存在' })
  return data
})
