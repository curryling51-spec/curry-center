import type { KnowledgeArticleRow } from './supabase'
import type { SessionUser } from './session'

export type ArticleHistoryChangeType = 'edit' | 'publish' | 'unpublish' | 'restore'

type ArticleSnapshot = Pick<
  KnowledgeArticleRow,
  'id' | 'category_id' | 'title' | 'slug' | 'content_markdown' | 'status' | 'published_at'
>

type SupabaseServerClient = ReturnType<typeof useSupabaseServer>

export const createArticleRevision = async (
  supabase: SupabaseServerClient,
  article: ArticleSnapshot,
  user: SessionUser,
  changeType: ArticleHistoryChangeType
): Promise<string> => {
  const { data, error } = await supabase
    .from('knowledge_article_revisions')
    .insert({
      article_id: article.id,
      category_id: article.category_id,
      title: article.title,
      slug: article.slug,
      content_markdown: article.content_markdown,
      status: article.status,
      published_at: article.published_at,
      change_type: changeType,
      changed_by_user_id: user.userId,
      changed_by_username: user.username
    })
    .select('id')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: '文章历史保存失败' })
  }

  return data.id
}

export const rollbackArticleRevision = async (
  supabase: SupabaseServerClient,
  revisionId: string
): Promise<void> => {
  await supabase
    .from('knowledge_article_revisions')
    .delete()
    .eq('id', revisionId)
}

export const articleContentChanged = (
  article: ArticleSnapshot,
  payload: Pick<ArticleSnapshot, 'category_id' | 'title' | 'slug' | 'content_markdown'>
): boolean => article.category_id !== payload.category_id
  || article.title !== payload.title
  || article.slug !== payload.slug
  || article.content_markdown !== payload.content_markdown
