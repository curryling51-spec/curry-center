export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: '文章 ID 不正确' })

  const deletedAt = new Date().toISOString()
  const { data, error } = await useSupabaseServer()
    .from('knowledge_articles')
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) knowledgeDatabaseError(error, '知识文章删除失败')
  if (!data) throw createError({ statusCode: 404, statusMessage: '知识文章不存在' })
  return { ok: true }
})
