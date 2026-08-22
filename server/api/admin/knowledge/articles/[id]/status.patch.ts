export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: '文章 ID 不正确' })

  const body = await readBody<{ status?: unknown }>(event)
  const status = body?.status === 'published' ? 'published' : body?.status === 'draft' ? 'draft' : null
  if (!status) throw createError({ statusCode: 400, statusMessage: '文章状态不正确' })

  const { data, error } = await useSupabaseServer()
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

  if (error) knowledgeDatabaseError(error, status === 'published' ? '文章发布失败' : '文章下架失败')
  return data
})
