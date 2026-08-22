type OrderItem = Pick<FoodOrderItemRow, 'order_id' | 'recipe_id' | 'recipe_name' | 'calories' | 'sort_order'>

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const query = getQuery(event)
  const requestedPage = Number(query.page)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = 20
  const requestedStatus = String(query.status || 'all')
  const status = FOOD_ORDER_STATUSES.includes(requestedStatus as FoodOrderStatus)
    ? requestedStatus as FoodOrderStatus
    : 'all'
  const from = (page - 1) * pageSize
  const supabase = useSupabaseServer()
  let orderRequest = supabase
    .from('food_orders')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('scheduled_for', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (status !== 'all') orderRequest = orderRequest.eq('status', status)

  const [
    { data: orders, count, error: orderError },
    { count: pendingCount, error: pendingError }
  ] = await Promise.all([
    orderRequest,
    supabase
      .from('food_orders')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'pending')
  ])

  if (orderError || pendingError) throw createError({ statusCode: 500, statusMessage: '点菜记录读取失败' })
  const orderIds = (orders || []).map(order => order.id)
  const total = count || 0
  const response = {
    items: [] as Array<FoodOrderRow & { items: OrderItem[] }>,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    pendingCount: pendingCount || 0
  }
  if (!orderIds.length) return response

  const { data: items, error: itemError } = await supabase
    .from('food_order_items')
    .select('order_id, recipe_id, recipe_name, calories, sort_order')
    .in('order_id', orderIds)
    .order('sort_order')

  if (itemError) throw createError({ statusCode: 500, statusMessage: '订单菜品读取失败' })
  const itemMap = new Map<string, OrderItem[]>()
  for (const item of items || []) {
    const current = itemMap.get(item.order_id) || []
    current.push(item)
    itemMap.set(item.order_id, current)
  }

  response.items = (orders || []).map(order => ({ ...order, items: itemMap.get(order.id) || [] }))
  return response
})
