import { beforeEach, describe, expect, it, vi } from 'vitest'

import { articleContentChanged } from '../server/utils/articleHistory'
import { normalizeKnowledgeArticle } from '../server/utils/knowledge'

const baseArticle = {
  id: '53aaf3ac-4b02-45cf-aef3-22e6cb2ca15a',
  category_id: '23c3d113-5d91-4cf8-82d1-8d8721b03373',
  title: '测试文章',
  slug: 'test-article',
  content_markdown: '# 正文',
  status: 'published' as const,
  published_at: '2026-08-13T04:00:00.000Z'
}

describe('article published time', () => {
  beforeEach(() => {
    vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(input.statusMessage), input))
  })

  it('normalizes a submitted published time to an ISO timestamp', () => {
    const payload = normalizeKnowledgeArticle({
      ...baseArticle,
      published_at: '2026-08-13T12:00:00+08:00'
    })

    expect(payload.published_at).toBe('2026-08-13T04:00:00.000Z')
  })

  it('allows draft articles to leave the published time empty', () => {
    const payload = normalizeKnowledgeArticle({ ...baseArticle, published_at: '' })

    expect(payload.published_at).toBeNull()
  })

  it('rejects invalid published times', () => {
    expect(() => normalizeKnowledgeArticle({ ...baseArticle, published_at: 'not-a-date' }))
      .toThrow('发布时间格式不正确')
  })

  it('records a published time update as an article content change', () => {
    expect(articleContentChanged(baseArticle, {
      category_id: baseArticle.category_id,
      title: baseArticle.title,
      slug: baseArticle.slug,
      content_markdown: baseArticle.content_markdown,
      published_at: '2026-08-14T04:00:00.000Z'
    })).toBe(true)
  })
})
