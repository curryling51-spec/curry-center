export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const planId = getRouterParam(event, 'id') || ''
  if (!isUuid(planId)) {
    throw createError({ statusCode: 400, statusMessage: '计划 ID 不正确' })
  }

  const body = await readBody<{ date?: string; completed?: boolean }>(event)
  const date = String(body?.date || '')
  if (!isValidDate(date) || typeof body?.completed !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: '完成状态或日期不正确' })
  }

  const today = getTodayDate()
  const earliestDate = getDateDaysBefore(today, 7)
  if (date < earliestDate || date > today) {
    throw createError({ statusCode: 400, statusMessage: '只能操作今天至往前 7 天的计划' })
  }

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

  if (!plan?.is_active || plan.start_date > date || (plan.end_date && plan.end_date < date)) {
    throw createError({ statusCode: 404, statusMessage: '这一天没有该计划' })
  }

  if (body.completed) {
    const { error } = await supabase
      .from('plan_checkins')
      .upsert({ plan_id: planId, checkin_date: date }, { onConflict: 'plan_id,checkin_date' })

    if (error) {
      throw createError({ statusCode: 500, statusMessage: '计划完成状态保存失败' })
    }
  } else {
    const { error } = await supabase
      .from('plan_checkins')
      .delete()
      .eq('plan_id', planId)
      .eq('checkin_date', date)

    if (error) {
      throw createError({ statusCode: 500, statusMessage: '计划完成状态取消失败' })
    }
  }

  return { ok: true, planId, date, completed: body.completed }
})
