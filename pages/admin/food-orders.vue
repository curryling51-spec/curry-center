<script setup lang="ts">
import { getErrorMessage } from '~/utils/errors'

type FoodOrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
type FoodOrder = {
  id: string
  customer_name: string
  scheduled_for: string
  status: FoodOrderStatus
  created_at: string
  items: Array<{ recipe_id: string | null; recipe_name: string; calories: string }>
}
type FoodOrderPage = {
  items: FoodOrder[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  pendingCount: number
}

definePageMeta({ layout: 'admin' })
useHead({ title: '点菜记录 - Curry 中心' })

const orders = ref<FoodOrder[]>([])
const activeStatus = ref<'all' | FoodOrderStatus>('all')
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const pendingCount = ref(0)
const isLoading = ref(true)
const updatingId = ref<string | null>(null)
const errorMessage = ref('')

const statusOptions: Array<{ value: 'all' | FoodOrderStatus; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'confirmed', label: '已确认' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

const statusLabel = (status: 'all' | FoodOrderStatus) => statusOptions.find(option => option.value === status)?.label || status
const formatScheduledFor = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit'
}).format(new Date(`${value.slice(0, 16)}:00+08:00`))

const formatCreatedAt = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
}).format(new Date(value))

const loadOrders = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<FoodOrderPage>('/api/admin/food-orders', {
      query: { page: page.value, status: activeStatus.value }
    })
    if (page.value > result.totalPages) {
      page.value = result.totalPages
      await loadOrders()
      return
    }
    orders.value = result.items
    total.value = result.total
    totalPages.value = result.totalPages
    pendingCount.value = result.pendingCount
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '点菜记录读取失败。')
  } finally {
    isLoading.value = false
  }
}

const selectStatus = async (status: 'all' | FoodOrderStatus) => {
  if (status === activeStatus.value || isLoading.value) return
  activeStatus.value = status
  page.value = 1
  await loadOrders()
}

const changePage = async (nextPage: number) => {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value || isLoading.value) return
  page.value = nextPage
  await loadOrders()
}

const updateStatus = async (order: FoodOrder, event: Event) => {
  const status = (event.target as HTMLSelectElement).value as FoodOrderStatus
  if (status === order.status || updatingId.value) return
  const previous = order.status
  order.status = status
  updatingId.value = order.id
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/food-orders/${order.id}/status`, { method: 'PATCH', body: { status } })
    await loadOrders()
  } catch (error) {
    order.status = previous
    errorMessage.value = getErrorMessage(error, '订单状态更新失败。')
  } finally {
    updatingId.value = null
  }
}

onMounted(loadOrders)
</script>

<template>
  <div>
    <section class="admin-page-heading">
      <div><h2>点菜记录</h2><p>{{ pendingCount }} 单待处理，共 {{ total }} 单</p></div>
      <NuxtLink class="admin-secondary-action" to="/profile/ordering-food" target="_blank">打开点菜页</NuxtLink>
    </section>

    <p v-if="errorMessage" class="admin-alert">{{ errorMessage }}</p>

    <section class="admin-panel food-orders-panel">
      <nav class="food-order-filters" aria-label="订单状态筛选">
        <button v-for="option in statusOptions" :key="option.value" type="button" :class="{ active: activeStatus === option.value }" @click="selectStatus(option.value)">
          {{ option.label }}
        </button>
      </nav>

      <LoadingSkeleton v-if="isLoading" :count="4" label="正在加载点菜记录" />
      <div v-else-if="!orders.length" class="admin-empty">当前没有{{ activeStatus === 'all' ? '' : statusLabel(activeStatus) }}订单</div>
      <div v-else class="food-order-admin-list">
        <article v-for="order in orders" :key="order.id">
          <div class="food-order-admin-time">
            <span>预约时间</span>
            <strong>{{ formatScheduledFor(order.scheduled_for) }}</strong>
            <small>{{ formatCreatedAt(order.created_at) }} 提交</small>
          </div>
          <div class="food-order-admin-main">
            <div><h3>{{ order.customer_name }}</h3><span :class="`order-status-${order.status}`">{{ statusLabel(order.status) }}</span></div>
            <ul><li v-for="item in order.items" :key="`${order.id}-${item.recipe_id || item.recipe_name}`">{{ item.recipe_name }}</li></ul>
          </div>
          <label class="food-order-status-select">
            <span>处理状态</span>
            <select :value="order.status" :disabled="updatingId === order.id" @change="updateStatus(order, $event)">
              <option v-for="option in statusOptions.slice(1)" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
        </article>
      </div>
      <nav v-if="totalPages > 1" class="food-menu-pagination" aria-label="点菜记录分页">
        <button type="button" :disabled="page <= 1 || isLoading" @click="changePage(page - 1)">上一页</button>
        <span>第 {{ page }} / {{ totalPages }} 页</span>
        <button type="button" :disabled="page >= totalPages || isLoading" @click="changePage(page + 1)">下一页</button>
      </nav>
    </section>
  </div>
</template>
