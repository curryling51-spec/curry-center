export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const payload = normalizeKnowledgeCategory(await readBody<Record<string, unknown>>(event))
  validateKnowledgeCategory(payload)

  const { data, error } = await useSupabaseServer()
    .from('knowledge_categories')
    .insert(payload)
    .select('*')
    .single()

  if (error) knowledgeDatabaseError(error, '知识分类创建失败')
  return data
})
