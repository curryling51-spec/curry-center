export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ status?: unknown }>(event)
  const status = String(body.status || '') as FoodOrderStatus
  if (!id || !isUuid(id)) throw createError({ statusCode: 400, statusMessage: '订单 ID 不正确' })
  if (!FOOD_ORDER_STATUSES.includes(status)) {
    throw createError({ statusCode: 400, statusMessage: '订单状态不正确' })
  }

  const supabase = useSupabaseServer()
  const { data, error } = await supabase
    .from('food_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: '订单状态更新失败' })
  if (!data) throw createError({ statusCode: 404, statusMessage: '订单不存在' })
  return data
})
