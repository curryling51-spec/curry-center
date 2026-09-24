export default defineEventHandler(async (event) => {
  const currentUser = await requireRole(event, ['super'])
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) {
    throw createError({ statusCode: 400, statusMessage: '账号 ID 不正确' })
  }
  if (id === currentUser.userId) {
    throw createError({ statusCode: 400, statusMessage: '不能删除当前登录的账号' })
  }

  const supabase = useSupabaseServer()
  const deletedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('admin_users')
    .update({ is_active: false, deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: '账号删除失败' })
  if (!data) throw createError({ statusCode: 404, statusMessage: '账号不存在' })
  return { ok: true }
})
