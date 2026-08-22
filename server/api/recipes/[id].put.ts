const normalizeRecipeBody = (body: Record<string, unknown>) => {
  return {
    name: String(body.name || '').trim(),
    calories: String(body.calories || '').trim(),
    ingredients: String(body.ingredients || '').trim(),
    link: String(body.link || '').trim()
  }
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event)
  const payload = normalizeRecipeBody(body)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少菜谱 ID'
    })
  }

  if (!payload.name) {
    throw createError({
      statusCode: 400,
      statusMessage: '菜名不能为空'
    })
  }

  const supabase = useSupabaseServer()
  const { data, error } = await supabase
    .from('recipes')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
