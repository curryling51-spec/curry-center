export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const supabase = useSupabaseServer()
  const [{ data: categories, error }, { data: articles, error: articleError }] = await Promise.all([
    supabase.from('knowledge_categories').select('*').is('deleted_at', null).order('sort_order').order('created_at'),
    supabase.from('knowledge_articles').select('category_id').is('deleted_at', null)
  ])

  if (error || articleError) {
    throw createError({ statusCode: 500, statusMessage: '知识分类读取失败' })
  }

  const counts = new Map<string, number>()
  for (const article of articles || []) {
    counts.set(article.category_id, (counts.get(article.category_id) || 0) + 1)
  }

  return (categories || []).map(category => ({
    ...category,
    article_count: counts.get(category.id) || 0
  }))
})
