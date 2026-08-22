export const FOOD_ORDER_ACCESS_KEY = 'orderingfood'

export const FOOD_ORDER_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const
export type FoodOrderStatus = typeof FOOD_ORDER_STATUSES[number]

export const normalizeScheduledFor = (value: unknown): string => {
  const scheduledFor = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(scheduledFor)) return ''
  const timestamp = new Date(`${scheduledFor}:00+08:00`)
  if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() <= Date.now()) return ''
  return `${scheduledFor}:00`
}
