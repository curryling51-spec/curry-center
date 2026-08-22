export default defineEventHandler(async (event) => {
  const accessKey = normalizeAccessKey(getQuery(event).key)
  if (!isValidAccessKey(accessKey)) {
    throw createError({ statusCode: 400, statusMessage: '访问 Key 不正确' })
  }

  const supabase = useSupabaseServer()
  const { data: rule, error } = await supabase
    .from('front_access_rules')
    .select('id, access_key, name, is_active, max_attempts, updated_at')
    .eq('access_key', accessKey)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: '访问规则读取失败' })
  if (!rule?.is_active) throw createError({ statusCode: 404, statusMessage: '访问规则不存在或已停用' })

  const clientHash = getFrontAccessClientHash(event)
  const { data: attempt, error: attemptError } = await supabase
    .from('front_access_attempts')
    .select('id, failed_attempts, locked_until')
    .eq('rule_id', rule.id)
    .eq('client_hash', clientHash)
    .maybeSingle()

  if (attemptError) throw createError({ statusCode: 500, statusMessage: '验证状态读取失败' })

  const lockExpired = Boolean(
    attempt?.locked_until && new Date(attempt.locked_until).getTime() <= Date.now()
  )
  const locked = Boolean(attempt?.locked_until && !lockExpired)
  const failedAttempts = lockExpired ? 0 : attempt?.failed_attempts || 0

  if (attempt && lockExpired) {
    await supabase.from('front_access_attempts').delete().eq('id', attempt.id)
  }

  return {
    verified: hasFrontAccess(event, accessKey, rule.updated_at),
    accessKey: rule.access_key,
    name: rule.name,
    attemptsRemaining: Math.max(0, rule.max_attempts - failedAttempts),
    lockedUntil: locked ? attempt?.locked_until : null
  }
})
