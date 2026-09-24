export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: '文章 ID 不正确' })

  const supabase = useSupabaseServer()
  const { data: article, error: articleError } = await supabase
    .from('knowledge_articles')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (articleError) throw createError({ statusCode: 500, statusMessage: '文章信息读取失败' })
  if (!article) throw createError({ statusCode: 404, statusMessage: '知识文章不存在' })

  const { data, error } = await supabase
    .from('knowledge_article_revisions')
    .select('id, article_id, title, slug, status, change_type, changed_by_username, created_at')
    .eq('article_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw createError({ statusCode: 500, statusMessage: '文章历史读取失败' })
  return data || []
})
