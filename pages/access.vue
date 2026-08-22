<script setup lang="ts">
import { getErrorDetails, getErrorMessage } from '~/utils/errors'

type PatternPoint = {
  id: number
  x: number
  y: number
}

const route = useRoute()
const boardRef = ref<HTMLElement | null>(null)
const selected = ref<number[]>([])
const pointer = ref<{ x: number; y: number } | null>(null)
const isDrawing = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const ruleName = ref('访问验证')
const attemptsRemaining = ref(5)
const lockedUntil = ref<string | null>(null)

const points: PatternPoint[] = Array.from({ length: 9 }, (_, index) => ({
  id: index + 1,
  x: 50 + (index % 3) * 100,
  y: 50 + Math.floor(index / 3) * 100
}))

const destination = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect.startsWith('/') && !redirect.startsWith('//') && redirect !== '/access'
    ? redirect
    : '/'
})

const accessKey = computed(() => typeof route.query.key === 'string' ? route.query.key : '')
const isLocked = computed(() => Boolean(lockedUntil.value && new Date(lockedUntil.value).getTime() > Date.now()))
const lockedUntilText = computed(() => lockedUntil.value
  ? new Intl.DateTimeFormat('zh-CN', {
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(lockedUntil.value))
  : '')

const selectedPoints = computed(() => selected.value
  .map(id => points.find(point => point.id === id))
  .filter((point): point is PatternPoint => Boolean(point)))

const polylinePoints = computed(() => {
  const coordinates = selectedPoints.value.map(point => `${point.x},${point.y}`)
  if (isDrawing.value && pointer.value) {
    coordinates.push(`${pointer.value.x},${pointer.value.y}`)
  }
  return coordinates.join(' ')
})

useHead({
  title: '访问验证 - Curry 中心'
})

const pointById = (id: number) => points.find(point => point.id === id)

const addPoint = (id: number) => {
  if (selected.value.includes(id)) return

  const previous = pointById(selected.value.at(-1) || 0)
  const next = pointById(id)
  if (previous && next) {
    const middle = points.find(point =>
      point.x === (previous.x + next.x) / 2
      && point.y === (previous.y + next.y) / 2
    )
    if (middle && !selected.value.includes(middle.id)) selected.value.push(middle.id)
  }

  selected.value.push(id)
}

const updatePointer = (event: PointerEvent) => {
  const board = boardRef.value
  if (!board) return

  const rect = board.getBoundingClientRect()
  const current = {
    x: Math.max(0, Math.min(300, ((event.clientX - rect.left) / rect.width) * 300)),
    y: Math.max(0, Math.min(300, ((event.clientY - rect.top) / rect.height) * 300))
  }
  pointer.value = current

  const hovered = points.find(point => Math.hypot(point.x - current.x, point.y - current.y) <= 30)
  if (hovered) addPoint(hovered.id)
}

const startPattern = (id: number, event: PointerEvent) => {
  if (isSubmitting.value || isLocked.value) return
  selected.value = []
  errorMessage.value = ''
  isDrawing.value = true
  addPoint(id)
  updatePointer(event)
  boardRef.value?.setPointerCapture(event.pointerId)
}

const verifyPattern = async () => {
  if (!selected.value.length || isSubmitting.value || isLocked.value || !accessKey.value) return
  isSubmitting.value = true

  try {
    await $fetch('/api/access/verify', {
      method: 'POST',
      body: { key: accessKey.value, pattern: selected.value }
    })
    await navigateTo(destination.value)
  } catch (error) {
    const details = getErrorDetails(error)
    attemptsRemaining.value = typeof details.attemptsRemaining === 'number'
      ? details.attemptsRemaining
      : Math.max(0, attemptsRemaining.value - 1)
    lockedUntil.value = typeof details.lockedUntil === 'string' ? details.lockedUntil : null
    errorMessage.value = lockedUntil.value
      ? `已锁定，请在 ${lockedUntilText.value} 后重试`
      : `图案不正确，还可尝试 ${attemptsRemaining.value} 次`
    selected.value = []
  } finally {
    isSubmitting.value = false
  }
}

const finishPattern = async (event: PointerEvent) => {
  if (!isDrawing.value) return
  isDrawing.value = false
  pointer.value = null
  if (boardRef.value?.hasPointerCapture(event.pointerId)) {
    boardRef.value.releasePointerCapture(event.pointerId)
  }
  await verifyPattern()
}

const cancelPattern = () => {
  isDrawing.value = false
  pointer.value = null
  selected.value = []
}

onMounted(async () => {
  if (!accessKey.value) {
    errorMessage.value = '缺少访问 Key，无法验证'
    return
  }

  try {
    const result = await $fetch<{
      verified: boolean
      name: string
      attemptsRemaining: number
      lockedUntil: string | null
    }>('/api/access/status', { query: { key: accessKey.value } })
    ruleName.value = result.name
    attemptsRemaining.value = result.attemptsRemaining
    lockedUntil.value = result.lockedUntil
    if (result.verified) await navigateTo(destination.value)
    else if (result.lockedUntil) errorMessage.value = `已锁定，请在 ${lockedUntilText.value} 后重试`
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '访问规则读取失败')
  }
})
</script>

<template>
  <main class="access-page">
    <NuxtLink class="access-brand" to="/">
      <img src="/favicon.ico" alt="" />
      <span>Curry 中心</span>
    </NuxtLink>

    <section class="access-panel">
      <header>
        <p>PRIVATE ACCESS</p>
        <h1>{{ ruleName }}</h1>
        <span>{{ isLocked ? `锁定至 ${lockedUntilText}` : isSubmitting ? '正在验证' : '绘制访问图案以继续' }}</span>
      </header>

      <div
        ref="boardRef"
        class="pattern-board"
        :class="{ drawing: isDrawing, invalid: errorMessage, locked: isLocked }"
        @pointermove="isDrawing && updatePointer($event)"
        @pointerup="finishPattern"
        @pointercancel="cancelPattern"
      >
        <svg viewBox="0 0 300 300" aria-hidden="true">
          <polyline v-if="polylinePoints" :points="polylinePoints" />
        </svg>
        <button
          v-for="point in points"
          :key="point.id"
          type="button"
          :disabled="isSubmitting || isLocked"
          :class="{ selected: selected.includes(point.id) }"
          :style="{ left: `${point.x / 3}%`, top: `${point.y / 3}%` }"
          :aria-label="`图案节点 ${point.id}`"
          @pointerdown.prevent="startPattern(point.id, $event)"
        >
          <span />
        </button>
      </div>

      <p class="access-feedback" :class="{ error: errorMessage }" aria-live="polite">
        {{ errorMessage || `${selected.length} 个节点 · 剩余 ${attemptsRemaining} 次机会` }}
      </p>
    </section>
  </main>
</template>
