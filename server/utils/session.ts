import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

export const SESSION_COOKIE = 'curry_session'
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000

export type SessionUser = {
  userId: string
  username: string
  role: 'super' | 'admin'
}

type SessionPayload = SessionUser & {
  expiresAt: number
}

const sign = (secret: string, payload: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url')

const safeEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}

export const createSessionToken = (
  secret: string,
  user: SessionUser,
  ttlMs = DEFAULT_TTL
): string => {
  const payload: SessionPayload = {
    ...user,
    expiresAt: Date.now() + ttlMs
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${sign(secret, encodedPayload)}`
}

export const verifySessionToken = (
  secret: string,
  token: string | undefined
): SessionPayload | null => {
  if (!secret || !token) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature || !safeEqual(signature, sign(secret, encodedPayload))) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as Partial<SessionPayload>

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.username !== 'string' ||
      (payload.role !== 'super' && payload.role !== 'admin') ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Date.now()
    ) {
      return null
    }

    return payload as SessionPayload
  } catch {
    return null
  }
}

export const getAuthenticatedUser = async (event: H3Event): Promise<SessionUser | null> => {
  const config = useRuntimeConfig(event)
  const session = verifySessionToken(
    config.sessionSecret,
    getCookie(event, SESSION_COOKIE)
  )

  if (!session) return null

  const supabase = useSupabaseServer()
  const { data: user, error } = await supabase
    .from('admin_users')
    .select('id, username, role, is_active')
    .eq('id', session.userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: '登录状态检查失败' })
  }

  if (!user?.is_active) return null

  return { userId: user.id, username: user.username, role: user.role }
}

export const requireAuth = async (event: H3Event): Promise<SessionUser> => {
  const user = await getAuthenticatedUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '请先登录或重新登录' })
  }

  return user
}

export const requireRole = async (
  event: H3Event,
  allowedRoles: SessionUser['role'][]
): Promise<SessionUser> => {
  const user = await requireAuth(event)
  if (!allowedRoles.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: '没有操作权限' })
  }

  return user
}
