import { beforeEach, describe, expect, it, vi } from 'vitest'

type LoginHandler = (event: object) => Promise<{
  ok: boolean
  user: { id: string; username: string; role: string }
}>

const httpError = (input: { statusCode: number; statusMessage: string }) =>
  Object.assign(new Error(input.statusMessage), input)

describe('POST /api/auth/login', () => {
  const user = {
    id: '53aaf3ac-4b02-45cf-aef3-22e6cb2ca15a',
    username: 'admin',
    password_hash: 'stored-hash',
    role: 'super',
    is_active: true,
    session_version: 0
  }

  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', (handler: LoginHandler) => handler)
    vi.stubGlobal('createError', httpError)
    vi.stubGlobal('useRuntimeConfig', () => ({ sessionSecret: 'test-secret' }))
    vi.stubGlobal('readBody', async () => ({ username: 'admin', password: 'correct-password' }))
    vi.stubGlobal('createSessionToken', () => 'signed-session-token')
    vi.stubGlobal('SESSION_COOKIE', 'curry_session')
    vi.stubGlobal('setCookie', vi.fn())
  })

  const createSupabaseMock = () => {
    const query = {
      error: null,
      select: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: user, error: null }))
    }
    query.select.mockReturnValue(query)
    query.update.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)

    return { from: vi.fn(() => query) }
  }

  it('creates a secure cookie for valid credentials', async () => {
    vi.stubGlobal('verifyPassword', () => true)
    vi.stubGlobal('useSupabaseServer', createSupabaseMock)
    const handler = (await import('../server/api/auth/login.post')).default as LoginHandler

    const result = await handler({})

    expect(result).toMatchObject({ ok: true, user: { username: 'admin', role: 'super' } })
    expect(setCookie).toHaveBeenCalledWith(
      {},
      'curry_session',
      'signed-session-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', maxAge: 604800 })
    )
  })

  it('rejects an invalid password without setting a cookie', async () => {
    vi.stubGlobal('verifyPassword', () => false)
    vi.stubGlobal('useSupabaseServer', createSupabaseMock)
    const handler = (await import('../server/api/auth/login.post')).default as LoginHandler

    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(setCookie).not.toHaveBeenCalled()
  })
})
