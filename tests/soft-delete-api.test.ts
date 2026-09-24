import { beforeEach, describe, expect, it, vi } from 'vitest'

type DeleteHandler = (event: object) => Promise<{ ok: boolean }>

const recordId = '53aaf3ac-4b02-45cf-aef3-22e6cb2ca15a'
const httpError = (input: { statusCode: number; statusMessage: string }) =>
  Object.assign(new Error(input.statusMessage), input)

const endpoints = [
  { name: '菜谱', table: 'recipes', load: () => import('../server/api/recipes/[id].delete') },
  { name: '计划', table: 'plans', load: () => import('../server/api/admin/plans/[id].delete') },
  { name: '知识分类', table: 'knowledge_categories', load: () => import('../server/api/admin/knowledge/categories/[id].delete') },
  { name: '知识文章', table: 'knowledge_articles', load: () => import('../server/api/admin/knowledge/articles/[id].delete') },
  { name: '访问规则', table: 'front_access_rules', load: () => import('../server/api/admin/access-rules/[id].delete') },
  { name: '后台账号', table: 'admin_users', load: () => import('../server/api/admin/accounts/[id].delete') }
]

describe('business record soft deletion', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', (handler: DeleteHandler) => handler)
    vi.stubGlobal('createError', httpError)
    vi.stubGlobal('requireAuth', vi.fn(async () => undefined))
    vi.stubGlobal('requireRole', vi.fn(async () => ({
      userId: '23c3d113-5d91-4cf8-82d1-8d8721b03373',
      username: 'super',
      role: 'super'
    })))
    vi.stubGlobal('getRouterParam', () => recordId)
    vi.stubGlobal('isUuid', () => true)
    vi.stubGlobal('knowledgeDatabaseError', (error: Error) => { throw error })
  })

  it.each(endpoints)('$name 删除接口只标记 deleted_at', async ({ table, load }) => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: { id: recordId }, error: null }))
    }
    query.update.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.select.mockReturnValue(query)
    const supabase = { from: vi.fn(() => query) }
    vi.stubGlobal('useSupabaseServer', () => supabase)
    const handler = (await load()).default as DeleteHandler

    await expect(handler({})).resolves.toEqual({ ok: true })
    expect(supabase.from).toHaveBeenCalledWith(table)
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      deleted_at: expect.any(String),
      updated_at: expect.any(String)
    }))
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
  })
})
