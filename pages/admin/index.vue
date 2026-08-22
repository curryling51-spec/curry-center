<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { CalendarDays, Check, ChevronLeft, ChevronRight } from '@lucide/vue'
import { zhCN } from 'date-fns/locale'
import { getErrorMessage } from '~/utils/errors'

type Recipe = {
  id: string
}

type Plan = {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  is_active: boolean
  completed_today: boolean
  checkin_dates: string[]
}

type MonthValue = {
  month: number
  year: number
}

definePageMeta({ layout: 'admin' })
useHead({ title: '后台概览 - Curry 中心' })

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Hong_Kong',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date())
const todayParts = today.split('-').map(Number)
const todayYear = todayParts[0] ?? new Date().getFullYear()
const todayMonth = todayParts[1] ?? new Date().getMonth() + 1

const recipes = ref<Recipe[]>([])
const plans = ref<Plan[]>([])
const monthValue = ref<MonthValue>({ month: todayMonth - 1, year: todayYear })
const tableScroll = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')
const signingPlanId = ref<string | null>(null)
const confirmDialog = useAdminConfirm()

const getDateDaysBefore = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00+08:00`)
  value.setUTCDate(value.getUTCDate() - days)
  return value.toISOString().slice(0, 10)
}

const earliestManageableDate = getDateDaysBefore(today, 7)

const monthKey = computed(() => {
  return `${monthValue.value.year}-${String(monthValue.value.month + 1).padStart(2, '0')}`
})
const monthLabel = computed(() => `${monthValue.value.year}年${monthValue.value.month + 1}月`)
const isCurrentMonth = computed(() => monthKey.value === today.slice(0, 7))
const activePlans = computed(() => plans.value.filter(plan => plan.is_active))
const monthDays = computed(() => {
  const total = new Date(monthValue.value.year, monthValue.value.month + 1, 0).getDate()
  return Array.from({ length: total }, (_, index) => {
    const day = index + 1
    const date = `${monthKey.value}-${String(day).padStart(2, '0')}`
    const weekDay = new Date(`${date}T12:00:00`).getDay()
    return {
      day,
      date,
      week: '日一二三四五六'[weekDay],
      weekend: weekDay === 0 || weekDay === 6
    }
  })
})
const todayPlans = computed(() => activePlans.value.filter(plan => isPlanDate(plan, today)))
const completedTodayCount = computed(() => {
  return todayPlans.value.filter(plan => plan.checkin_dates.includes(today)).length
})

const isPlanDate = (plan: Plan, date: string) => {
  return plan.start_date <= date && (!plan.end_date || plan.end_date >= date)
}

const isManageableDate = (plan: Plan, date: string) => {
  return isPlanDate(plan, date) && date >= earliestManageableDate && date <= today
}

const completedInMonth = (plan: Plan) => {
  return plan.checkin_dates.filter(date => date.startsWith(monthKey.value)).length
}

const scrollToToday = async () => {
  if (!isCurrentMonth.value) return
  await nextTick()
  tableScroll.value?.querySelector<HTMLElement>('[data-today="true"]')?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center'
  })
}

const loadPlans = async () => {
  const data = await $fetch<Plan[]>('/api/admin/plans', {
    query: { month: monthKey.value }
  })
  plans.value = data
}

const loadOverview = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [recipeData] = await Promise.all([
      $fetch<Recipe[]>('/api/recipes'),
      loadPlans()
    ])
    recipes.value = recipeData
  } catch {
    errorMessage.value = '概览数据读取失败，请稍后重试。'
  } finally {
    isLoading.value = false
    await scrollToToday()
  }
}

const changeMonth = (offset: number) => {
  const date = new Date(monthValue.value.year, monthValue.value.month + offset, 1)
  monthValue.value = { month: date.getMonth(), year: date.getFullYear() }
}

const goCurrentMonth = () => {
  monthValue.value = { month: todayMonth - 1, year: todayYear }
}

const updateCheckin = async (plan: Plan, date: string, completed: boolean) => {
  if (!isManageableDate(plan, date) || signingPlanId.value) return

  signingPlanId.value = plan.id
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/plans/${plan.id}/checkins`, {
      method: 'PATCH',
      body: { date, completed }
    })

    if (completed) {
      if (!plan.checkin_dates.includes(date)) plan.checkin_dates.push(date)
    } else {
      plan.checkin_dates = plan.checkin_dates.filter(item => item !== date)
    }
    plan.completed_today = plan.checkin_dates.includes(today)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '计划完成状态保存失败，请稍后重试。')
  } finally {
    signingPlanId.value = null
  }
}

const requestCheckinChange = (plan: Plan, date: string) => {
  if (!isManageableDate(plan, date) || signingPlanId.value) return

  const isCompleted = plan.checkin_dates.includes(date)
  const action = isCompleted ? '取消完成' : '标记完成'
  confirmDialog.request({
    title: `${action}计划`,
    message: `确认将“${plan.title}”在 ${date} 的状态设为${isCompleted ? '未完成' : '已完成'}吗？`,
    confirmLabel: `确认${action}`,
    tone: isCompleted ? 'danger' : 'primary'
  }, () => updateCheckin(plan, date, !isCompleted))
}

watch(monthKey, async () => {
  if (!isLoading.value) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      await loadPlans()
    } catch {
      errorMessage.value = '月度计划读取失败，请稍后重试。'
    } finally {
      isLoading.value = false
      await scrollToToday()
    }
  }
})

onMounted(loadOverview)
</script>

<template>
  <div class="admin-dashboard">
    <section class="admin-page-heading">
      <div>
        <h2>系统概况</h2>
        <p>查看内容数量和每月计划完成情况。</p>
      </div>
    </section>

    <p v-if="errorMessage" class="admin-alert">{{ errorMessage }}</p>

    <section class="admin-stats" aria-label="系统统计">
      <article>
        <span>菜谱记录</span>
        <strong>{{ isLoading ? '—' : recipes.length }}</strong>
        <small>数据库保存总数</small>
      </article>
      <article>
        <span>进行中计划</span>
        <strong>{{ isLoading ? '—' : activePlans.length }}</strong>
        <small>当前已启用</small>
      </article>
      <article>
        <span>今日完成</span>
        <strong>{{ isLoading ? '—' : `${completedTodayCount}/${todayPlans.length}` }}</strong>
        <small>今日签到进度</small>
      </article>
    </section>

    <section class="admin-panel habit-panel">
      <div class="habit-panel-head">
        <div>
          <h3>月度计划表</h3>
          <p>按天查看计划完成记录</p>
        </div>
        <div class="month-controls">
          <button type="button" title="上个月" aria-label="上个月" @click="changeMonth(-1)">
            <ChevronLeft :size="17" />
          </button>
          <VueDatePicker
            v-model="monthValue"
            month-picker
            auto-apply
            :clearable="false"
            :locale="zhCN"
            teleport="body"
          >
            <template #trigger>
              <button class="month-picker-trigger" type="button">
                <CalendarDays :size="16" />
                {{ monthLabel }}
              </button>
            </template>
          </VueDatePicker>
          <button type="button" title="下个月" aria-label="下个月" @click="changeMonth(1)">
            <ChevronRight :size="17" />
          </button>
          <button v-if="!isCurrentMonth" class="month-current" type="button" @click="goCurrentMonth">
            本月
          </button>
        </div>
      </div>

      <div class="habit-legend" aria-label="状态说明">
        <span><i class="done" /> 已完成</span>
        <span><i class="today" /> 今天</span>
        <span><i class="missed" /> 未完成</span>
      </div>

      <LoadingSkeleton v-if="isLoading" variant="table" :count="5" label="正在加载月度计划" />
      <div v-else-if="!activePlans.length" class="admin-empty">还没有进行中的计划</div>
      <div v-else ref="tableScroll" class="habit-table-scroll">
        <table class="habit-table">
          <thead>
            <tr>
              <th class="habit-plan-column">计划</th>
              <th
                v-for="item in monthDays"
                :key="item.date"
                :class="{ today: item.date === today, weekend: item.weekend }"
                :data-today="item.date === today"
              >
                <span>{{ item.week }}</span>
                <strong>{{ item.day }}</strong>
              </th>
              <th class="habit-total-column">本月</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plan in activePlans" :key="plan.id">
              <th class="habit-plan-column">
                <strong>{{ plan.title }}</strong>
                <small>{{ plan.description || '每日计划' }}</small>
              </th>
              <td
                v-for="item in monthDays"
                :key="item.date"
                :class="{
                  today: item.date === today,
                  weekend: item.weekend,
                  outside: !isPlanDate(plan, item.date)
                }"
                :data-today="item.date === today"
              >
                <button
                  class="habit-cell"
                  :class="{
                    completed: plan.checkin_dates.includes(item.date),
                    missed: isPlanDate(plan, item.date) && item.date < today && !plan.checkin_dates.includes(item.date),
                    future: item.date > today,
                    manageable: isManageableDate(plan, item.date)
                  }"
                  type="button"
                  :disabled="
                    !isManageableDate(plan, item.date) ||
                    signingPlanId === plan.id
                  "
                  :aria-label="`${plan.title} ${item.date} ${plan.checkin_dates.includes(item.date) ? '取消完成' : '标记完成'}`"
                  :title="isManageableDate(plan, item.date) ? (plan.checkin_dates.includes(item.date) ? '取消完成' : '标记完成') : undefined"
                  @click="requestCheckinChange(plan, item.date)"
                >
                  <Check v-if="plan.checkin_dates.includes(item.date)" :size="15" :stroke-width="2.5" />
                  <span v-else-if="item.date === today && isPlanDate(plan, item.date)" />
                </button>
              </td>
              <td class="habit-total-column">
                <strong>{{ completedInMonth(plan) }}</strong>
                <span>天</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <AdminConfirmDialog v-bind="confirmDialog.state" @cancel="confirmDialog.cancel" @confirm="confirmDialog.accept" />
  </div>
</template>
