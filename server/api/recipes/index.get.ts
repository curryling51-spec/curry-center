export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const supabase = useSupabaseServer()

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
