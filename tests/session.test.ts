import { describe, expect, it } from 'vitest'
import { createSessionToken, verifySessionToken } from '../server/utils/session'

describe('admin session', () => {
  const secret = 'test-session-secret-with-enough-entropy'

  it('creates and verifies a signed admin session', () => {
    const token = createSessionToken(secret, {
      userId: '53aaf3ac-4b02-45cf-aef3-22e6cb2ca15a',
      username: 'admin',
      role: 'super'
    })

    expect(verifySessionToken(secret, token)).toMatchObject({
      username: 'admin',
      role: 'super',
      sessionVersion: 0
    })
  })

  it('rejects a modified session token', () => {
    const token = createSessionToken(secret, {
      userId: '53aaf3ac-4b02-45cf-aef3-22e6cb2ca15a',
      username: 'admin',
      role: 'admin'
    })

    expect(verifySessionToken(secret, `${token}changed`)).toBeNull()
  })
})
