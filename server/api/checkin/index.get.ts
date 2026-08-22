export default defineEventHandler(async (event) => {
  await requireFrontAccess(event, 'checkin')

  const today = getTodayDate()
  const supabase = useSupabaseServer()

  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, title, description, start_date, end_date, sort_order')
    .eq('is_active', true)
    .is('deleted_at', null)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('sort_order')
    .order('created_at')

  if (plansError) {
    throw createError({ statusCode: 500, statusMessage: '今日计划读取失败' })
  }

  const planIds = (plans || []).map(plan => plan.id)
  let checkins: { plan_id: string; completed_at: string }[] = []

  if (planIds.length) {
    const { data, error } = await supabase
      .from('plan_checkins')
      .select('plan_id, completed_at')
      .eq('checkin_date', today)
      .in('plan_id', planIds)

    if (error) {
      throw createError({ statusCode: 500, statusMessage: '签到状态读取失败' })
    }
    checkins = data || []
  }

  const completedMap = new Map(checkins.map(checkin => [checkin.plan_id, checkin.completed_at]))
  return {
    date: today,
    plans: (plans || []).map(plan => ({
      ...plan,
      completed: completedMap.has(plan.id),
      completed_at: completedMap.get(plan.id) || null
    }))
  }
})
