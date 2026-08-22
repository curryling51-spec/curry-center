export default defineEventHandler(async (event) => {
  await requireRole(event, ['super'])
  const id = getRouterParam(event, 'id')
  if (!id || !isUuid(id)) throw createError({ statusCode: 400, statusMessage: '访问规则 ID 不正确' })

  const body = await readBody<Record<string, unknown>>(event)
  const name = String(body.name || '').trim()
  const pattern = body.pattern === undefined ? [] : normalizeAccessPattern(body.pattern)
  if (!name || name.length > 80) {
    throw createError({ statusCode: 400, statusMessage: '请输入 1 至 80 个字符的规则名称' })
  }
  if (body.pattern !== undefined && !pattern.length) {
    throw createError({ statusCode: 400, statusMessage: '新图案至少需要连接 4 个节点' })
  }

  const payload = {
    name,
    is_active: body.is_active !== false,
    updated_at: new Date().toISOString(),
    ...(pattern.length ? { pattern_hash: hashAccessPattern(pattern) } : {})
  }

  const supabase = useSupabaseServer()
  const { data, error } = await supabase
    .from('front_access_rules')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, access_key, name, is_active, max_attempts, lock_duration_hours, created_at, updated_at')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: '访问规则保存失败' })
  if (!data) throw createError({ statusCode: 404, statusMessage: '访问规则不存在' })
  return data
})
