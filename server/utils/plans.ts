export type PlanPayload = {
  title: string
  description: string
  start_date: string
  end_date: string | null
  is_active: boolean
  sort_order: number
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const getTodayDate = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export const getDateDaysBefore = (date: string, days: number): string => {
  const value = new Date(`${date}T12:00:00+08:00`)
  value.setUTCDate(value.getUTCDate() - days)
  return value.toISOString().slice(0, 10)
}

export const isValidDate = (date: string): boolean => {
  if (!DATE_PATTERN.test(date)) return false
  const parsed = new Date(`${date}T12:00:00+08:00`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export const normalizePlanBody = (body: Record<string, unknown>): PlanPayload => {
  const startDate = String(body.start_date || getTodayDate()).trim()
  const endDate = String(body.end_date || '').trim()

  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    start_date: startDate,
    end_date: endDate || null,
    is_active: body.is_active !== false,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0
  }
}

export const validatePlanPayload = (payload: PlanPayload): void => {
  if (!payload.title || payload.title.length > 120) {
    throw createError({ statusCode: 400, statusMessage: '计划名称不能为空且不能超过 120 个字' })
  }

  if (!DATE_PATTERN.test(payload.start_date) || (payload.end_date && !DATE_PATTERN.test(payload.end_date))) {
    throw createError({ statusCode: 400, statusMessage: '计划日期格式不正确' })
  }

  if (payload.end_date && payload.end_date < payload.start_date) {
    throw createError({ statusCode: 400, statusMessage: '结束日期不能早于开始日期' })
  }
}

export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
