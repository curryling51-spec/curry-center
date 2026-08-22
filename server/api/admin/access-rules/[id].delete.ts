export default defineEventHandler(async (event) => {
  await requireRole(event, ['super'])
  const id = getRouterParam(event, 'id')
  if (!id || !isUuid(id)) throw createError({ statusCode: 400, statusMessage: '访问规则 ID 不正确' })

  const supabase = useSupabaseServer()
  const deletedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('front_access_rules')
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: '访问规则删除失败' })
  if (!data) throw createError({ statusCode: 404, statusMessage: '访问规则不存在' })
  return { ok: true }
})
