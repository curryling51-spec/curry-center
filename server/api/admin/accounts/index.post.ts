export default defineEventHandler(async (event) => {
  await requireRole(event, ['super'])
  const body = await readBody<Record<string, unknown>>(event)
  const username = normalizeAdminUsername(body.username)
  const password = String(body.password ?? '')
  const role = parseAdminRole(body.role)

  validateAdminUsername(username)
  validateAdminPassword(password)
  if (!role) {
    throw createError({ statusCode: 400, statusMessage: '请选择有效的账号角色' })
  }

  const supabase = useSupabaseServer()
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      username,
      password_hash: hashPassword(password),
      role,
      is_active: body.is_active !== false,
      session_version: 0
    })
    .select('id, username, role, is_active, last_login_at, created_at, updated_at')
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 500,
      statusMessage: error.code === '23505' ? '这个账号名已被使用' : '账号创建失败'
    })
  }

  return { ...data, is_current: false }
})
