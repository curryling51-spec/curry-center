export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.sessionSecret) {
    throw createError({ statusCode: 500, statusMessage: '登录会话密钥未配置' })
  }

  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = String(body?.username ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: '请输入账号和密码' })
  }

  const supabase = useSupabaseServer()
  const { data: user, error } = await supabase
    .from('admin_users')
    .select('id, username, password_hash, role, is_active, session_version')
    .eq('username', username)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: '登录服务暂时不可用' })
  }

  if (!user?.is_active || !verifyPassword(password, user.password_hash)) {
    throw createError({ statusCode: 401, statusMessage: '账号或密码错误' })
  }

  const { error: updateError } = await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('deleted_at', null)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: '登录状态保存失败' })
  }

  const token = createSessionToken(
    config.sessionSecret,
    {
      userId: user.id,
      username: user.username,
      role: user.role
    },
    undefined,
    user.session_version
  )

  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  return {
    ok: true,
    user: { id: user.id, username: user.username, role: user.role }
  }
})
