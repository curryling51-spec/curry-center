export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少菜谱 ID'
    })
  }

  const supabase = useSupabaseServer()
  const deletedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('recipes')
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: '菜谱不存在' })
  }

  return { ok: true }
})
