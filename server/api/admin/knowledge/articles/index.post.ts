export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const payload = normalizeKnowledgeArticle(await readBody<Record<string, unknown>>(event))
  validateKnowledgeArticle(payload)

  const { data, error } = await useSupabaseServer()
    .from('knowledge_articles')
    .insert({ ...payload, status: 'draft', published_at: null })
    .select('*')
    .single()

  if (error) knowledgeDatabaseError(error, '知识文章创建失败')
  return data
})
