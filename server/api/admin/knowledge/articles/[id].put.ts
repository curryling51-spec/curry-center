export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: '文章 ID 不正确' })

  const payload = normalizeKnowledgeArticle(await readBody<Record<string, unknown>>(event))
  validateKnowledgeArticle(payload)
  const { data, error } = await useSupabaseServer()
    .from('knowledge_articles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) knowledgeDatabaseError(error, '知识文章保存失败')
  return data
})
