export default defineEventHandler(async (event) => {
  await requireFrontAccess(event, FOOD_ORDER_ACCESS_KEY)
  const query = getQuery(event)
  const page = Math.max(1, Math.trunc(Number(query.page) || 1))
  const pageSize = 9
  const search = String(query.search || '').trim().slice(0, 80)
  const from = (page - 1) * pageSize
  const supabase = useSupabaseServer()
  let request = supabase
    .from('recipes')
    .select('id, name, calories, ingredients', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at')
    .range(from, from + pageSize - 1)

  if (search) request = request.ilike('name', `%${search}%`)
  const { data, error, count } = await request

  if (error) throw createError({ statusCode: 500, statusMessage: '菜单读取失败' })
  const total = count || 0
  return {
    items: data || [],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
})
