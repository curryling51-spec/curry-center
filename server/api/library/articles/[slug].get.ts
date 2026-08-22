export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') || '')
  if (!slug) throw createError({ statusCode: 404, statusMessage: '文章不存在' })

  const supabase = useSupabaseServer()
  const { data: article, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .lte('published_at', new Date().toISOString())
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: '知识文章读取失败' })
  if (!article) throw createError({ statusCode: 404, statusMessage: '文章不存在' })

  const { data: category, error: categoryError } = await supabase
    .from('knowledge_categories')
    .select('id, name, slug')
    .eq('id', article.category_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (categoryError) throw createError({ statusCode: 500, statusMessage: '知识分类读取失败' })
  if (!category) throw createError({ statusCode: 404, statusMessage: '文章不存在' })

  return { ...article, category }
})
