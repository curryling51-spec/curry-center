export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) {
    throw createError({ statusCode: 400, statusMessage: '计划 ID 不正确' })
  }

  const supabase = useSupabaseServer()
  const deletedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('plans')
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: '计划删除失败' })
  }

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: '计划不存在' })
  }

  return { ok: true }
})
