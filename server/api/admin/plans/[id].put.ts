export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id') || ''
  if (!isUuid(id)) {
    throw createError({ statusCode: 400, statusMessage: '计划 ID 不正确' })
  }

  const payload = normalizePlanBody(await readBody<Record<string, unknown>>(event))
  validatePlanPayload(payload)

  const supabase = useSupabaseServer()
  const { data, error } = await supabase
    .from('plans')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: '计划保存失败' })
  }

  return data
})
