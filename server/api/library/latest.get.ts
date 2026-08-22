import { createMarkdownExcerpt } from '~/utils/markdown'

export default defineEventHandler(async () => {
  const supabase = useSupabaseServer()
  const [{ data: articles, error }, { data: categories, error: categoryError }] = await Promise.all([
    supabase
      .from('knowledge_articles')
      .select('*')
      .eq('status', 'published')
      .is('deleted_at', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(3),
    supabase.from('knowledge_categories').select('id, name, slug').eq('is_active', true).is('deleted_at', null)
  ])
  if (error || categoryError) throw createError({ statusCode: 500, statusMessage: '最新知识读取失败' })

  const categoryMap = new Map((categories || []).map(category => [category.id, category]))
  return (articles || [])
    .filter(article => categoryMap.has(article.category_id))
    .map((article) => {
      const { content_markdown, ...item } = article
      return {
        ...item,
        excerpt: createMarkdownExcerpt(content_markdown),
        category: categoryMap.get(article.category_id)
      }
    })
})
