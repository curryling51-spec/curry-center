export default defineEventHandler(async (event) => {
  const currentUser = await requireRole(event, ['super'])
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) {
    throw createError({ statusCode: 400, statusMessage: '账号 ID 不正确' })
  }

  const body = await readBody<Record<string, unknown>>(event)
  const username = normalizeAdminUsername(body.username)
  const password = String(body.password ?? '')
  const role = parseAdminRole(body.role)
  const isActive = body.is_active !== false

  validateAdminUsername(username)
  if (password) validateAdminPassword(password)
  if (!role) {
    throw createError({ statusCode: 400, statusMessage: '请选择有效的账号角色' })
  }

  const supabase = useSupabaseServer()
  const { data: existing, error: readError } = await supabase
    .from('admin_users')
    .select('id, username, role, is_active, session_version')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (readError) throw createError({ statusCode: 500, statusMessage: '账号信息读取失败' })
  if (!existing) throw createError({ statusCode: 404, statusMessage: '账号不存在' })

  if (id === currentUser.userId && (role !== 'super' || !isActive)) {
    throw createError({ statusCode: 400, statusMessage: '不能修改自己账号的角色或停用自己' })
  }

  const passwordChanged = Boolean(password)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('admin_users')
    .update({
      username,
      role,
      is_active: isActive,
      updated_at: now,
      ...(passwordChanged
        ? {
            password_hash: hashPassword(password),
            session_version: existing.session_version + 1
          }
        : {})
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, username, role, is_active, last_login_at, created_at, updated_at')
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 500,
      statusMessage: error.code === '23505' ? '这个账号名已被使用' : '账号保存失败'
    })
  }
  if (!data) throw createError({ statusCode: 404, statusMessage: '账号不存在' })

  return {
    account: { ...data, is_current: data.id === currentUser.userId },
    reauthentication_required: passwordChanged && data.id === currentUser.userId
  }
})
