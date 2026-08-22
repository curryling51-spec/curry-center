export default defineEventHandler(async (event) => {
  await requireFrontAccess(event, FOOD_ORDER_ACCESS_KEY)
  const body = await readBody<Record<string, unknown>>(event)
  const customerName = String(body.customerName || '').trim()
  const scheduledFor = normalizeScheduledFor(body.scheduledFor)
  const recipeIds = Array.isArray(body.recipeIds)
    ? [...new Set(body.recipeIds.map(String).filter(isUuid))]
    : []

  if (!customerName || customerName.length > 80) {
    throw createError({ statusCode: 400, statusMessage: '请输入点菜人姓名' })
  }
  if (!scheduledFor) {
    throw createError({ statusCode: 400, statusMessage: '请选择未来的预约时间' })
  }
  if (!recipeIds.length) {
    throw createError({ statusCode: 400, statusMessage: '请至少选择一道菜' })
  }

  const supabase = useSupabaseServer()
  const { data: order, error } = await supabase
    .rpc('create_food_order', {
      p_customer_name: customerName,
      p_scheduled_for: scheduledFor,
      p_recipe_ids: recipeIds
    })
    .single()

  if (error || !order) {
    const invalidSelection = error?.message.includes('invalid recipe selection')
    throw createError({
      statusCode: invalidSelection ? 400 : 500,
      statusMessage: invalidSelection ? '选择的菜品中有内容已不存在' : '点菜提交失败'
    })
  }

  return {
    id: order.order_id,
    customerName: order.customer_name,
    scheduledFor: order.scheduled_for,
    status: order.status,
    dishes: order.dishes
  }
})
