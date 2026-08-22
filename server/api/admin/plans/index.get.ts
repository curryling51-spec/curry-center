export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const requestedMonth = String(query.month || '')
  const currentMonth = getTodayDate().slice(0, 7)
  const month = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : currentMonth

  const supabase = useSupabaseServer()
  const [{ data: plans, error: plansError }, { data: stats, error: statsError }] = await Promise.all([
    supabase.from('plans').select('*').is('deleted_at', null).order('sort_order').order('created_at'),
    supabase.rpc('get_plan_checkin_stats', { p_month: `${month}-01` })
  ])

  if (plansError || statsError) {
    throw createError({ statusCode: 500, statusMessage: '计划数据读取失败' })
  }

  const statsMap = new Map((stats || []).map(item => [item.plan_id, item]))

  return (plans || []).map(plan => ({
    ...plan,
    checkin_count: Number(statsMap.get(plan.id)?.checkin_count || 0),
    completed_today: statsMap.get(plan.id)?.completed_today || false,
    checkin_dates: statsMap.get(plan.id)?.checkin_dates || []
  }))
})
