export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: '分类 ID 不正确' })

  const deletedAt = new Date().toISOString()
  const { data, error } = await useSupabaseServer()
    .from('knowledge_categories')
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) knowledgeDatabaseError(error, '知识分类删除失败')
  if (!data) throw createError({ statusCode: 404, statusMessage: '知识分类不存在' })
  return { ok: true }
})
