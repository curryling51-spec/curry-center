export default defineEventHandler(async (event) => {
  const currentUser = await requireRole(event, ['super'])
  const supabase = useSupabaseServer()
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, username, role, is_active, last_login_at, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: '账号列表读取失败' })
  }

  return (data || []).map(account => ({
    ...account,
    is_current: account.id === currentUser.userId
  }))
})
