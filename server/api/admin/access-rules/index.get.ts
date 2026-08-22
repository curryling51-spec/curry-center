export default defineEventHandler(async (event) => {
  await requireRole(event, ['super'])
  const supabase = useSupabaseServer()
  const [{ data: rules, error: rulesError }, { data: attempts, error: attemptsError }] = await Promise.all([
    supabase
      .from('front_access_rules')
      .select('id, access_key, name, is_active, max_attempts, lock_duration_hours, created_at, updated_at')
      .is('deleted_at', null)
      .order('created_at'),
    supabase
      .from('front_access_attempts')
      .select('rule_id, locked_until')
      .gt('locked_until', new Date().toISOString())
  ])

  if (rulesError || attemptsError) {
    throw createError({ statusCode: 500, statusMessage: '访问规则读取失败' })
  }

  const lockedCounts = new Map<string, number>()
  for (const attempt of attempts || []) {
    lockedCounts.set(attempt.rule_id, (lockedCounts.get(attempt.rule_id) || 0) + 1)
  }

  return (rules || []).map(rule => ({
    ...rule,
    locked_count: lockedCounts.get(rule.id) || 0
  }))
})
