import { beforeEach, describe, expect, it, vi } from 'vitest'

type OrderHandler = (event: object) => Promise<{
  id: string
  customerName: string
  dishes: string[]
}>

describe('POST /api/ordering/orders', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', (handler: OrderHandler) => handler)
    vi.stubGlobal('requireFrontAccess', vi.fn(async () => undefined))
    vi.stubGlobal('FOOD_ORDER_ACCESS_KEY', 'orderingfood')
    vi.stubGlobal('readBody', async () => ({
      customerName: '测试用户',
      scheduledFor: '2026-08-20T12:00',
      recipeIds: ['53aaf3ac-4b02-45cf-aef3-22e6cb2ca15a']
    }))
    vi.stubGlobal('normalizeScheduledFor', () => '2026-08-20T12:00:00')
    vi.stubGlobal('isUuid', () => true)
  })

  it('通过单个数据库事务函数创建订单及明细', async () => {
    const single = vi.fn(async () => ({
      data: {
        order_id: 'order-id',
        customer_name: '测试用户',
        scheduled_for: '2026-08-20T12:00:00',
        status: 'pending',
        dishes: ['可乐鸡翅']
      },
      error: null
    }))
    const rpcQuery = { single }
    const supabase = { rpc: vi.fn(() => rpcQuery), from: vi.fn() }
    vi.stubGlobal('useSupabaseServer', () => supabase)
    const handler = (await import('../server/api/ordering/orders.post')).default as OrderHandler

    const result = await handler({})

    expect(supabase.rpc).toHaveBeenCalledWith('create_food_order', {
      p_customer_name: '测试用户',
      p_scheduled_for: '2026-08-20T12:00:00',
      p_recipe_ids: ['53aaf3ac-4b02-45cf-aef3-22e6cb2ca15a']
    })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(result).toMatchObject({ id: 'order-id', dishes: ['可乐鸡翅'] })
  })
})
