<script setup lang="ts">
definePageMeta({
  middleware: 'front-access',
  frontAccessKey: 'checkin'
})

type CheckinPlan = {
  id: string
  title: string
  description: string
  completed: boolean
  completed_at: string | null
}

type CheckinResponse = {
  date: string
  plans: CheckinPlan[]
}

useHead({
  title: '今日签到 - Curry 中心'
})

const date = ref('')
const plans = ref<CheckinPlan[]>([])
const signingPlanId = ref<string | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')

const completedCount = computed(() => plans.value.filter(plan => plan.completed).length)
const allCompleted = computed(() => plans.value.length > 0 && completedCount.value === plans.value.length)
const progress = computed(() => plans.value.length ? (completedCount.value / plans.value.length) * 100 : 0)

const displayDate = computed(() => {
  if (!date.value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date(`${date.value}T12:00:00`))
})

const loadPlans = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<CheckinResponse>('/api/checkin')
    date.value = response.date
    plans.value = response.plans
  } catch {
    errorMessage.value = '今日计划读取失败，请稍后再试。'
  } finally {
    isLoading.value = false
  }
}

const checkIn = async (plan: CheckinPlan) => {
  if (plan.completed || signingPlanId.value) return

  signingPlanId.value = plan.id
  errorMessage.value = ''
  try {
    const response = await $fetch<{ checkin: { completed_at: string } }>('/api/checkin', {
      method: 'POST',
      body: { planId: plan.id }
    })
    plan.completed = true
    plan.completed_at = response.checkin.completed_at
  } catch {
    errorMessage.value = '签到失败，请稍后再试。'
  } finally {
    signingPlanId.value = null
  }
}

onMounted(loadPlans)
</script>

<template>
  <main class="checkin-page">
    <header class="checkin-topbar">
      <NuxtLink class="checkin-brand" to="/">
        <img src="/favicon.ico" alt="" />
        <strong>Curry 中心</strong>
      </NuxtLink>
      <NuxtLink to="/admin/plans">管理计划</NuxtLink>
    </header>

    <section class="checkin-content">
      <div class="checkin-heading">
        <p>{{ displayDate }}</p>
        <h1>{{ allCompleted ? '今天全部完成' : '今日签到' }}</h1>
        <div class="checkin-progress-copy">
          <span>{{ completedCount }} / {{ plans.length }} 已完成</span>
          <strong>{{ Math.round(progress) }}%</strong>
        </div>
        <div class="checkin-progress" aria-hidden="true">
          <span :style="{ width: `${progress}%` }" />
        </div>
      </div>

      <p v-if="errorMessage" class="checkin-alert">{{ errorMessage }}</p>

      <LoadingSkeleton v-if="isLoading" :count="3" label="正在加载今天的计划" />
      <div v-else-if="!plans.length" class="checkin-empty">
        今天没有需要签到的计划
      </div>
      <section v-else class="checkin-list" aria-label="今日计划">
        <article v-for="(plan, index) in plans" :key="plan.id" :class="{ completed: plan.completed }">
          <span class="checkin-number">{{ String(index + 1).padStart(2, '0') }}</span>
          <div>
            <h2>{{ plan.title }}</h2>
            <p v-if="plan.description">{{ plan.description }}</p>
          </div>
          <button
            type="button"
            :disabled="plan.completed || signingPlanId === plan.id"
            @click="checkIn(plan)"
          >
            {{ plan.completed ? '已完成' : signingPlanId === plan.id ? '提交中...' : '完成签到' }}
          </button>
        </article>
      </section>
    </section>
  </main>
</template>
