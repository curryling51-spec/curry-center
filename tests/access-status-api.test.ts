import { beforeEach, describe, expect, it, vi } from 'vitest'

type StatusHandler = (event: object) => Promise<{
  verified: boolean
  attemptsRemaining: number
  lockedUntil: string | null
}>

describe('GET /api/access/status', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', (handler: StatusHandler) => handler)
    vi.stubGlobal('getQuery', () => ({ key: 'checkin' }))
    vi.stubGlobal('normalizeAccessKey', (value: unknown) => String(value))
    vi.stubGlobal('isValidAccessKey', () => true)
    vi.stubGlobal('getFrontAccessClientHash', () => 'client-hash')
    vi.stubGlobal('hasFrontAccess', () => false)
  })

  it('保留尚未达到锁定阈值的失败次数', async () => {
    const ruleQuery = createQuery({
      data: {
        id: 'rule-id',
        access_key: 'checkin',
        name: '今日签到',
        is_active: true,
        max_attempts: 5,
        updated_at: '2026-08-13T00:00:00.000Z'
      },
      error: null
    })
    const attemptQuery = createQuery({
      data: { id: 'attempt-id', failed_attempts: 2, locked_until: null },
      error: null
    })
    const supabase = {
      from: vi.fn((table: string) => table === 'front_access_rules' ? ruleQuery : attemptQuery)
    }
    vi.stubGlobal('useSupabaseServer', () => supabase)
    const handler = (await import('../server/api/access/status.get')).default as StatusHandler

    const result = await handler({})

    expect(result.attemptsRemaining).toBe(3)
    expect(attemptQuery.delete).not.toHaveBeenCalled()
  })
})

const createQuery = (result: unknown) => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    delete: vi.fn(),
    maybeSingle: vi.fn(async () => result)
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.is.mockReturnValue(query)
  query.delete.mockReturnValue(query)
  return query
}
