export type KnowledgeCategoryPayload = {
  name: string
  slug: string
  description: string
  sort_order: number
  is_active: boolean
}

export type KnowledgeArticlePayload = {
  category_id: string
  title: string
  slug: string
  content_markdown: string
  published_at: string | null
}

export const createKnowledgeSlug = (value: string): string => value
  .normalize('NFKC')
  .toLowerCase()
  .trim()
  .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 220)

export const normalizeKnowledgeCategory = (body: Record<string, unknown>): KnowledgeCategoryPayload => {
  const name = String(body.name || '').trim()
  return {
    name,
    slug: createKnowledgeSlug(String(body.slug || name)),
    description: String(body.description || '').trim(),
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    is_active: body.is_active !== false
  }
}

export const validateKnowledgeCategory = (payload: KnowledgeCategoryPayload): void => {
  if (!payload.name || payload.name.length > 80) {
    throw createError({ statusCode: 400, statusMessage: '分类名称不能为空且不能超过 80 个字' })
  }
  if (!payload.slug || payload.slug.length > 120) {
    throw createError({ statusCode: 400, statusMessage: '分类标识不能为空且不能超过 120 个字符' })
  }
}

export const normalizeKnowledgeArticle = (body: Record<string, unknown>): KnowledgeArticlePayload => {
  const title = String(body.title || '').trim()
  const publishedAtInput = String(body.published_at || '').trim()
  const publishedAt = publishedAtInput ? new Date(publishedAtInput) : null

  if (publishedAt && Number.isNaN(publishedAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: '发布时间格式不正确' })
  }

  return {
    category_id: String(body.category_id || '').trim(),
    title,
    slug: createKnowledgeSlug(String(body.slug || title)),
    content_markdown: String(body.content_markdown || ''),
    published_at: publishedAt?.toISOString() || null
  }
}

export const validateKnowledgeArticle = (payload: KnowledgeArticlePayload): void => {
  if (!isUuid(payload.category_id)) {
    throw createError({ statusCode: 400, statusMessage: '请选择文章分类' })
  }
  if (!payload.title || payload.title.length > 180) {
    throw createError({ statusCode: 400, statusMessage: '文章标题不能为空且不能超过 180 个字' })
  }
  if (!payload.slug || payload.slug.length > 220) {
    throw createError({ statusCode: 400, statusMessage: '文章标识不能为空且不能超过 220 个字符' })
  }
  if (!payload.content_markdown.trim()) {
    throw createError({ statusCode: 400, statusMessage: '文章正文不能为空' })
  }
}

export const knowledgeDatabaseError = (error: { code?: string }, fallback: string): never => {
  if (error.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: '名称或文章标识已经存在' })
  }
  if (error.code === '23503') {
    throw createError({ statusCode: 409, statusMessage: '该分类下仍有文章，不能删除' })
  }
  throw createError({ statusCode: 500, statusMessage: fallback })
}
