import { createMarkdownExcerpt } from '~/utils/markdown'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const categorySlug = String(query.category || '').trim()
  const requestedLimit = Number(query.limit)
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 30
  const supabase = useSupabaseServer()

  let categoryId = ''
  if (categorySlug) {
    const { data: category, error } = await supabase
      .from('knowledge_categories')
      .select('id')
      .eq('slug', categorySlug)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw createError({ statusCode: 500, statusMessage: '知识分类读取失败' })
    if (!category) return []
    categoryId = category.id
  }

  let articleQuery = supabase
    .from('knowledge_articles')
    .select('*')
    .eq('status', 'published')
    .is('deleted_at', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit)
  if (categoryId) articleQuery = articleQuery.eq('category_id', categoryId)

  const [{ data: articles, error }, { data: categories, error: categoryError }] = await Promise.all([
    articleQuery,
    supabase.from('knowledge_categories').select('id, name, slug').eq('is_active', true).is('deleted_at', null)
  ])
  if (error || categoryError) throw createError({ statusCode: 500, statusMessage: '知识文章读取失败' })

  const categoryMap = new Map((categories || []).map(category => [category.id, category]))
  return (articles || [])
    .filter(article => categoryMap.has(article.category_id))
    .map((article) => {
      const { content_markdown, ...item } = article
      return {
        ...item,
        excerpt: createMarkdownExcerpt(content_markdown),
        category: categoryMap.get(article.category_id) || null
      }
    })
})
