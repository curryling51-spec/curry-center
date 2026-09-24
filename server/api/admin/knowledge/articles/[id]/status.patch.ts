export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: '文章 ID 不正确' })

  const body = await readBody<{ status?: unknown }>(event)
  const status = body?.status === 'published' ? 'published' : body?.status === 'draft' ? 'draft' : null
  if (!status) throw createError({ statusCode: 400, statusMessage: '文章状态不正确' })

  const supabase = useSupabaseServer()
  const { data: current, error: readError } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (readError) knowledgeDatabaseError(readError, '知识文章读取失败')
  if (!current) throw createError({ statusCode: 404, statusMessage: '知识文章不存在' })
  if (current.status === status) return current

  const changeType = status === 'published' ? 'publish' : 'unpublish'
  const revisionId = await createArticleRevision(supabase, current, user, changeType)
  const { data, error } = await supabase
    .from('knowledge_articles')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) {
    await rollbackArticleRevision(supabase, revisionId)
    knowledgeDatabaseError(error, status === 'published' ? '文章发布失败' : '文章下架失败')
  }
  return data
})
