<script setup lang="ts">
type PatternPoint = { id: number; x: number; y: number }

const props = withDefaults(defineProps<{
  modelValue: number[]
  disabled?: boolean
  invalid?: boolean
}>(), { disabled: false, invalid: false })

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  complete: [value: number[]]
}>()

const boardRef = ref<HTMLElement | null>(null)
const selected = ref<number[]>([...props.modelValue])
const pointer = ref<{ x: number; y: number } | null>(null)
const isDrawing = ref(false)

const points: PatternPoint[] = Array.from({ length: 9 }, (_, index) => ({
  id: index + 1,
  x: 50 + (index % 3) * 100,
  y: 50 + Math.floor(index / 3) * 100
}))

watch(() => props.modelValue, value => {
  if (value.join(',') !== selected.value.join(',')) selected.value = [...value]
})

const selectedPoints = computed(() => selected.value
  .map(id => points.find(point => point.id === id))
  .filter((point): point is PatternPoint => Boolean(point)))

const polylinePoints = computed(() => {
  const coordinates = selectedPoints.value.map(point => `${point.x},${point.y}`)
  if (isDrawing.value && pointer.value) coordinates.push(`${pointer.value.x},${pointer.value.y}`)
  return coordinates.join(' ')
})

const updateValue = (value: number[]) => {
  selected.value = value
  emit('update:modelValue', [...value])
}

const addPoint = (id: number) => {
  if (selected.value.includes(id)) return
  const value = [...selected.value]
  const previous = points.find(point => point.id === value.at(-1))
  const next = points.find(point => point.id === id)
  if (previous && next) {
    const middle = points.find(point =>
      point.x === (previous.x + next.x) / 2 && point.y === (previous.y + next.y) / 2
    )
    if (middle && !value.includes(middle.id)) value.push(middle.id)
  }
  value.push(id)
  updateValue(value)
}

const updatePointer = (event: PointerEvent) => {
  const board = boardRef.value
  if (!board) return
  const rect = board.getBoundingClientRect()
  pointer.value = {
    x: Math.max(0, Math.min(300, ((event.clientX - rect.left) / rect.width) * 300)),
    y: Math.max(0, Math.min(300, ((event.clientY - rect.top) / rect.height) * 300))
  }
  const hovered = points.find(point => Math.hypot(point.x - pointer.value!.x, point.y - pointer.value!.y) <= 30)
  if (hovered) addPoint(hovered.id)
}

const start = (id: number, event: PointerEvent) => {
  if (props.disabled) return
  updateValue([])
  isDrawing.value = true
  addPoint(id)
  updatePointer(event)
  boardRef.value?.setPointerCapture(event.pointerId)
}

const finish = (event: PointerEvent) => {
  if (!isDrawing.value) return
  isDrawing.value = false
  pointer.value = null
  if (boardRef.value?.hasPointerCapture(event.pointerId)) boardRef.value.releasePointerCapture(event.pointerId)
  emit('complete', [...selected.value])
}

const cancel = () => {
  isDrawing.value = false
  pointer.value = null
}
</script>

<template>
  <div
    ref="boardRef"
    class="pattern-board"
    :class="{ drawing: isDrawing, invalid, locked: disabled }"
    @pointermove="isDrawing && updatePointer($event)"
    @pointerup="finish"
    @pointercancel="cancel"
  >
    <svg viewBox="0 0 300 300" aria-hidden="true">
      <polyline v-if="polylinePoints" :points="polylinePoints" />
    </svg>
    <button
      v-for="point in points"
      :key="point.id"
      type="button"
      :disabled="disabled"
      :class="{ selected: selected.includes(point.id) }"
      :style="{ left: `${point.x / 3}%`, top: `${point.y / 3}%` }"
      :aria-label="`图案节点 ${point.id}`"
      @pointerdown.prevent="start(point.id, $event)"
    ><span /></button>
  </div>
</template>
