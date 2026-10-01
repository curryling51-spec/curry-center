<script setup lang="ts">
import { CalendarClock, Check, ChefHat } from '@lucide/vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { zhCN } from 'date-fns/locale'
import { getErrorMessage } from '~/utils/errors'

definePageMeta({
  layout: 'profile',
  middleware: 'front-access',
  frontAccessKey: 'orderingfood'
})

type MenuItem = {
  id: string
  name: string
  calories: string
  ingredients: string
}

type OrderResult = {
  id: string
  customerName: string
  scheduledFor: string
  dishes: string[]
}

type MenuResponse = {
  items: MenuItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

useHead({
  title: '在线点菜 - Curry 中心'
})

const menu = ref<MenuItem[]>([])
const customerName = ref('')
const scheduledFor = ref('')
const selectedItems = ref<MenuItem[]>([])
const searchKeyword = ref('')
const currentPage = ref(1)
const totalItems = ref(0)
const totalPages = ref(1)
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const orderResult = ref<OrderResult | null>(null)

const formatCalories = (value: string) => {
  const number = value.match(/\d+(?:\.\d+)?/)?.[0]
  return number ? `${number} kcal / 100g` : ''
}

const selectedRecipeIds = computed(() => selectedItems.value.map(item => item.id))
const selectedNames = computed(() => selectedItems.value.map(item => item.name))

const formatScheduledFor = (value: string) => {
  const date = new Date(`${value.slice(0, 16)}:00+08:00`)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

const loadMenu = async () => {
  isLoading.value = true
  try {
    const response = await $fetch<MenuResponse>('/api/ordering/menu', {
      query: { page: currentPage.value, search: searchKeyword.value.trim() || undefined }
    })
    menu.value = response.items
    totalItems.value = response.total
    totalPages.value = response.totalPages
    if (currentPage.value > response.totalPages) {
      currentPage.value = response.totalPages
      await loadMenu()
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '菜单读取失败，请稍后再试。')
  } finally {
    isLoading.value = false
  }
}

const toggleRecipe = (item: MenuItem) => {
  selectedItems.value = selectedRecipeIds.value.includes(item.id)
    ? selectedItems.value.filter(selected => selected.id !== item.id)
    : [...selectedItems.value, item]
}

const changePage = async (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value || isLoading.value) return
  currentPage.value = page
  await loadMenu()
}

const submitOrder = async () => {
  if (isSubmitting.value) return
  if (!customerName.value.trim()) {
    errorMessage.value = '请填写点菜人。'
    return
  }
  if (!scheduledFor.value) {
    errorMessage.value = '请选择预约时间。'
    return
  }
  if (!selectedRecipeIds.value.length) {
    errorMessage.value = '请至少选择一道菜。'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  try {
    orderResult.value = await $fetch<OrderResult>('/api/ordering/orders', {
      method: 'POST',
      body: {
        customerName: customerName.value,
        scheduledFor: scheduledFor.value,
        recipeIds: selectedRecipeIds.value
      }
    })
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '点菜提交失败，请稍后再试。')
  } finally {
    isSubmitting.value = false
  }
}

const resetOrder = () => {
  customerName.value = ''
  scheduledFor.value = ''
  selectedItems.value = []
  orderResult.value = null
  errorMessage.value = ''
}

onMounted(loadMenu)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchKeyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    currentPage.value = 1
    await loadMenu()
  }, 300)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <main class="food-order-page">
    <section v-if="orderResult" class="food-order-success">
      <span><Check :size="28" :stroke-width="2.5" /></span>
      <p>ORDER RECEIVED</p>
      <h1>已经记下来了</h1>
      <dl>
        <div><dt>点菜人</dt><dd>{{ orderResult.customerName }}</dd></div>
        <div><dt>预约时间</dt><dd>{{ formatScheduledFor(orderResult.scheduledFor) }}</dd></div>
        <div><dt>已选菜品</dt><dd>{{ orderResult.dishes.join('、') }}</dd></div>
      </dl>
      <button type="button" @click="resetOrder">再点一单</button>
    </section>

    <form v-else class="food-order-content" @submit.prevent="submitOrder">
      <section class="food-order-intro">
        <p>CURRY MENU</p>
        <h1>今天想吃什么？</h1>
        <span>选好菜品和时间，提交后就能在后台看到。</span>
      </section>

      <section class="food-order-details">
        <label>
          <span>点菜人</span>
          <input v-model="customerName" required maxlength="80" placeholder="填写你的名字" autocomplete="name" />
        </label>
        <label>
          <span>预约时间</span>
          <VueDatePicker
            v-model="scheduledFor"
            model-type="yyyy-MM-dd'T'HH:mm"
            :formats="{ input: 'yyyy年MM月dd日 HH:mm' }"
            :locale="zhCN"
            :min-date="new Date()"
            :time-config="{
              enableTimePicker: true,
              is24: true,
              minutesIncrement: 15,
              minutesGridIncrement: 15,
              timePickerInline: true
            }"
            :action-row="{
              showPreview: false,
              selectBtnLabel: '确定',
              cancelBtnLabel: '取消',
              nowBtnLabel: '现在'
            }"
            :clearable="false"
            :teleport="true"
            placeholder="选择日期和时间"
          />
        </label>
      </section>

      <section class="food-menu-section">
        <header>
          <div><ChefHat :size="20" /><h2>选择菜品</h2></div>
          <span>共 {{ totalItems }} 道 · 已选 {{ selectedRecipeIds.length }} 道</span>
        </header>

        <label class="food-menu-search">
          <span>搜索</span>
          <input v-model="searchKeyword" type="search" placeholder="输入菜名" />
        </label>

        <LoadingSkeleton v-if="isLoading" variant="cards" :count="6" label="正在加载菜单" />
        <div v-else-if="!menu.length" class="food-menu-empty">菜单暂时还是空的</div>
        <div v-else class="food-menu-grid">
          <button
            v-for="item in menu"
            :key="item.id"
            type="button"
            :class="{ selected: selectedRecipeIds.includes(item.id) }"
            @click="toggleRecipe(item)"
          >
            <span class="food-menu-check"><Check v-if="selectedRecipeIds.includes(item.id)" :size="16" :stroke-width="3" /></span>
            <strong>{{ item.name }}</strong>
            <small v-if="formatCalories(item.calories)">{{ formatCalories(item.calories) }}</small>
            <p>{{ item.ingredients || '食材待补充' }}</p>
          </button>
        </div>

        <nav v-if="totalPages > 1" class="food-menu-pagination" aria-label="菜单分页">
          <button type="button" :disabled="currentPage === 1 || isLoading" @click="changePage(currentPage - 1)">上一页</button>
          <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button type="button" :disabled="currentPage === totalPages || isLoading" @click="changePage(currentPage + 1)">下一页</button>
        </nav>
      </section>

      <p v-if="errorMessage" class="food-order-error">{{ errorMessage }}</p>

      <footer class="food-order-submit">
        <div>
          <CalendarClock :size="18" />
          <span>{{ selectedNames.length ? selectedNames.join('、') : '还没有选择菜品' }}</span>
        </div>
        <button type="submit" :disabled="isSubmitting || isLoading">{{ isSubmitting ? '正在提交...' : '提交点菜' }}</button>
      </footer>
    </form>
  </main>
</template>
