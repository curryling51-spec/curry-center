export default defineEventHandler(async (event) => {
  await requireRole(event, ['super'])
  const body = await readBody<Record<string, unknown>>(event)
  const accessKey = normalizeAccessKey(body.access_key)
  const name = String(body.name || '').trim()
  const pattern = normalizeAccessPattern(body.pattern)

  if (!isValidAccessKey(accessKey)) {
    throw createError({ statusCode: 400, statusMessage: 'Key 只能使用小写字母、数字、下划线或短横线' })
  }
  if (!name || name.length > 80) {
    throw createError({ statusCode: 400, statusMessage: '请输入 1 至 80 个字符的规则名称' })
  }
  if (!pattern.length) {
    throw createError({ statusCode: 400, statusMessage: '请绘制至少连接 4 个节点的图案' })
  }

  const supabase = useSupabaseServer()
  const { data, error } = await supabase
    .from('front_access_rules')
    .insert({
      access_key: accessKey,
      name,
      pattern_hash: hashAccessPattern(pattern),
      is_active: body.is_active !== false,
      max_attempts: 5,
      lock_duration_hours: 24
    })
    .select('id, access_key, name, is_active, max_attempts, lock_duration_hours, created_at, updated_at')
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 500,
      statusMessage: error.code === '23505' ? '这个访问 Key 已存在' : '访问规则创建失败'
    })
  }
  return data
})
