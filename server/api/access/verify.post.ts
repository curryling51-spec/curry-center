export default defineEventHandler(async (event) => {
  const body = await readBody<{ key?: unknown; pattern?: unknown }>(event)
  const accessKey = normalizeAccessKey(body?.key)
  const pattern = normalizeAccessPattern(body?.pattern)

  if (!isValidAccessKey(accessKey) || !pattern.length) {
    throw createError({ statusCode: 400, statusMessage: '访问 Key 或图案不正确' })
  }

  const supabase = useSupabaseServer()
  const { data: rule, error } = await supabase
    .from('front_access_rules')
    .select('*')
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

  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
    throw createError({
      statusCode: 429,
      statusMessage: '尝试次数过多，请在锁定结束后重试',
      data: { attemptsRemaining: 0, lockedUntil: attempt.locked_until }
    })
  }

  if (verifyAccessPattern(pattern, rule.pattern_hash)) {
    if (attempt) await supabase.from('front_access_attempts').delete().eq('id', attempt.id)
    grantFrontAccess(event, rule.access_key, rule.updated_at)
    return { verified: true, accessKey: rule.access_key }
  }

  const { data: failures, error: failureError } = await supabase.rpc('record_front_access_failure', {
    p_rule_id: rule.id,
    p_client_hash: clientHash,
    p_max_attempts: rule.max_attempts,
    p_lock_hours: rule.lock_duration_hours
  })

  if (failureError || !failures?.length) {
    throw createError({ statusCode: 500, statusMessage: '验证失败次数记录异常' })
  }

  const failure = failures[0]!
  const locked = Boolean(failure.locked_until)
  throw createError({
    statusCode: locked ? 429 : 401,
    statusMessage: locked ? '连续失败 5 次，已锁定 24 小时' : '验证图案不正确',
    data: {
      attemptsRemaining: Math.max(0, rule.max_attempts - failure.failed_attempts),
      lockedUntil: failure.locked_until
    }
  })
})
