export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: '文章 ID 不正确' })

  const payload = normalizeKnowledgeArticle(await readBody<Record<string, unknown>>(event))
  validateKnowledgeArticle(payload)
  const supabase = useSupabaseServer()
  const { data: current, error: readError } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (readError) knowledgeDatabaseError(readError, '知识文章读取失败')
  if (!current) throw createError({ statusCode: 404, statusMessage: '知识文章不存在' })
  if (current.status === 'published' && !payload.published_at) {
    throw createError({ statusCode: 400, statusMessage: '已发布文章必须填写前台发布时间' })
  }
  if (!articleContentChanged(current, payload)) return current

  const revisionId = await createArticleRevision(supabase, current, user, 'edit')
  const { data, error } = await supabase
    .from('knowledge_articles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) {
    await rollbackArticleRevision(supabase, revisionId)
    knowledgeDatabaseError(error, '知识文章保存失败')
  }
  return data
})
