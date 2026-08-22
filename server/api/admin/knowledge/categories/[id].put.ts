export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: '分类 ID 不正确' })

  const payload = normalizeKnowledgeCategory(await readBody<Record<string, unknown>>(event))
  validateKnowledgeCategory(payload)
  const { data, error } = await useSupabaseServer()
    .from('knowledge_categories')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) knowledgeDatabaseError(error, '知识分类保存失败')
  return data
})
