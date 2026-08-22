export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const supabase = useSupabaseServer()
  const [{ data: articles, error }, { data: categories, error: categoryError }] = await Promise.all([
    supabase.from('knowledge_articles').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
    supabase.from('knowledge_categories').select('id, name, slug').is('deleted_at', null)
  ])

  if (error || categoryError) {
    throw createError({ statusCode: 500, statusMessage: '知识文章读取失败' })
  }

  const categoryMap = new Map((categories || []).map(category => [category.id, category]))
  return (articles || []).map(article => ({
    ...article,
    category: categoryMap.get(article.category_id) || null
  }))
})
