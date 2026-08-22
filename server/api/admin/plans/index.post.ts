export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const payload = normalizePlanBody(await readBody<Record<string, unknown>>(event))
  validatePlanPayload(payload)

  const supabase = useSupabaseServer()
  const { data, error } = await supabase.from('plans').insert(payload).select('*').single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: '计划创建失败' })
  }

  return data
})
