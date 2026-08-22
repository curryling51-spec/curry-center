export default defineEventHandler(async (event) => {
  await requireFrontAccess(event, 'checkin')

  const body = await readBody<{ planId?: string }>(event)
  const planId = String(body?.planId || '')
  if (!isUuid(planId)) {
    throw createError({ statusCode: 400, statusMessage: '计划 ID 不正确' })
  }

  const today = getTodayDate()
  const supabase = useSupabaseServer()
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, is_active, start_date, end_date')
    .eq('id', planId)
    .is('deleted_at', null)
    .maybeSingle()

  if (planError) {
    throw createError({ statusCode: 500, statusMessage: '计划检查失败' })
  }

  if (!plan?.is_active || plan.start_date > today || (plan.end_date && plan.end_date < today)) {
    throw createError({ statusCode: 404, statusMessage: '今日没有这个计划' })
  }

  const { data, error } = await supabase
    .from('plan_checkins')
    .upsert({ plan_id: planId, checkin_date: today }, { onConflict: 'plan_id,checkin_date' })
    .select('plan_id, checkin_date, completed_at')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: '签到失败，请稍后重试' })
  }

  return { ok: true, checkin: data }
})
