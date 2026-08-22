import { createHmac, timingSafeEqual } from 'node:crypto'
import { getHeader, getRequestIP, type H3Event } from 'h3'

export const FRONT_ACCESS_COOKIE = 'curry_front_access'
const ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60

type AccessPayload = {
  scope: 'front'
  grants: Record<string, string>
  expiresAt: number
}

const sign = (secret: string, payload: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url')

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

const readFrontAccessPayload = (event: H3Event): AccessPayload | null => {
  const secret = useRuntimeConfig(event).sessionSecret
  const token = getCookie(event, FRONT_ACCESS_COOKIE)
  if (!secret || !token) return null

  const [encoded, signature] = token.split('.')
  if (!encoded || !signature || !safeEqual(signature, sign(secret, encoded))) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<AccessPayload>
    if (
      payload.scope !== 'front'
      || !payload.grants
      || typeof payload.grants !== 'object'
      || typeof payload.expiresAt !== 'number'
      || payload.expiresAt <= Date.now()
    ) return null
    return payload as AccessPayload
  } catch {
    return null
  }
}

const createFrontAccessToken = (secret: string, grants: Record<string, string>): string => {
  if (!secret) throw createError({ statusCode: 500, statusMessage: '前台访问验证尚未配置' })
  const payload: AccessPayload = {
    scope: 'front',
    grants,
    expiresAt: Date.now() + ACCESS_TTL_SECONDS * 1000
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(secret, encoded)}`
}

export const hasFrontAccess = (event: H3Event, accessKey: string, ruleVersion: string): boolean => {
  const payload = readFrontAccessPayload(event)
  return payload?.grants[accessKey] === ruleVersion
}

export const grantFrontAccess = (event: H3Event, accessKey: string, ruleVersion: string): void => {
  const secret = useRuntimeConfig(event).sessionSecret
  const current = readFrontAccessPayload(event)
  const grants = { ...(current?.grants || {}), [accessKey]: ruleVersion }
  setCookie(event, FRONT_ACCESS_COOKIE, createFrontAccessToken(secret, grants), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL_SECONDS
  })
}

export const getFrontAccessClientHash = (event: H3Event): string => {
  const secret = useRuntimeConfig(event).sessionSecret
  if (!secret) throw createError({ statusCode: 500, statusMessage: '前台访问验证尚未配置' })
  const identity = getRequestIP(event, { xForwardedFor: true })
    || getHeader(event, 'user-agent')
    || 'unknown-client'
  return createHmac('sha256', secret).update(identity).digest('hex')
}

export const requireFrontAccess = async (event: H3Event, accessKey: string): Promise<void> => {
  const supabase = useSupabaseServer()
  const { data: rule, error } = await supabase
    .from('front_access_rules')
    .select('access_key, updated_at, is_active')
    .eq('access_key', accessKey)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: '访问规则检查失败' })
  if (!rule?.is_active || !hasFrontAccess(event, accessKey, rule.updated_at)) {
    throw createError({ statusCode: 401, statusMessage: '请先完成访问验证' })
  }
}
