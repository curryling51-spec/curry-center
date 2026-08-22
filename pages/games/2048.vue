<script setup lang="ts">
useHead({
  title: '2048 · curry中心'
})

const SIZE = 4
const board = ref<number[]>(Array(SIZE * SIZE).fill(0))
const score = ref(0)
const best = ref(0)
const won = ref(false)
const over = ref(false)

const spawn = (b: number[]) => {
  const empties = b.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0)
  if (!empties.length) return
  const target = empties[Math.floor(Math.random() * empties.length)]
  if (target !== undefined) b[target] = Math.random() < 0.9 ? 2 : 4
}

const reset = () => {
  const b = Array(SIZE * SIZE).fill(0)
  spawn(b)
  spawn(b)
  board.value = b
  score.value = 0
  won.value = false
  over.value = false
}

const slide = (line: number[]): { line: number[]; gained: number } => {
  const arr = line.filter((v) => v !== 0)
  const res: number[] = []
  let gained = 0
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i]
    if (current === undefined) continue
    if (i < arr.length - 1 && current === arr[i + 1]) {
      const merged = current * 2
      res.push(merged)
      gained += merged
      if (merged === 2048) won.value = true
      i++
    } else {
      res.push(current)
    }
  }
  while (res.length < SIZE) res.push(0)
  return { line: res, gained }
}

const getLine = (b: number[], index: number, axis: 'row' | 'col', reverse: boolean) => {
  const line: number[] = []
  for (let i = 0; i < SIZE; i++) {
    const pos = reverse ? SIZE - 1 - i : i
    line.push((axis === 'row' ? b[index * SIZE + pos] : b[pos * SIZE + index]) ?? 0)
  }
  return line
}

const setLine = (b: number[], index: number, line: number[], axis: 'row' | 'col', reverse: boolean) => {
  for (let i = 0; i < SIZE; i++) {
    const pos = reverse ? SIZE - 1 - i : i
    if (axis === 'row') b[index * SIZE + pos] = line[i] ?? 0
    else b[pos * SIZE + index] = line[i] ?? 0
  }
}

const hasMoves = (b: number[]) => {
  if (b.includes(0)) return true
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = b[r * SIZE + c]
      if (c < SIZE - 1 && v === b[r * SIZE + c + 1]) return true
      if (r < SIZE - 1 && v === b[(r + 1) * SIZE + c]) return true
    }
  }
  return false
}

const move = (axis: 'row' | 'col', reverse: boolean) => {
  if (over.value) return
  const b = [...board.value]
  let moved = false
  let gained = 0
  for (let index = 0; index < SIZE; index++) {
    const line = getLine(b, index, axis, reverse)
    const { line: slid, gained: g } = slide(line)
    gained += g
    setLine(b, index, slid, axis, reverse)
    if (line.some((v, i) => v !== slid[i])) moved = true
  }
  if (!moved) return

  spawn(b)
  board.value = b
  score.value += gained
  if (score.value > best.value) {
    best.value = score.value
    if (import.meta.client) localStorage.setItem('2048-best', String(best.value))
  }
  if (!hasMoves(b)) over.value = true
}

const onKey = (e: KeyboardEvent) => {
  let handled = true
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': move('row', false); break
    case 'ArrowRight': case 'd': case 'D': move('row', true); break
    case 'ArrowUp': case 'w': case 'W': move('col', false); break
    case 'ArrowDown': case 's': case 'S': move('col', true); break
    default: handled = false
  }
  if (handled) e.preventDefault()
}

let touchStart: { x: number; y: number } | null = null
const onTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0]
  if (touch) touchStart = { x: touch.clientX, y: touch.clientY }
}
const onTouchEnd = (e: TouchEvent) => {
  if (!touchStart) return
  const touch = e.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - touchStart.x
  const dy = touch.clientY - touchStart.y
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) move('row', dx > 0)
  else move('col', dy > 0)
  touchStart = null
}

const tileColor = (v: number): string => {
  const map: Record<number, string> = {
    2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
    32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
    512: '#edc850', 1024: '#edc53f', 2048: '#edc22e'
  }
  return map[v] || '#3c3a32'
}
const tileText = (v: number): string => (v <= 4 ? '#776e65' : '#fff')

onMounted(() => {
  best.value = Number(localStorage.getItem('2048-best') || 0)
  reset()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="subpage game-page">
    <NuxtLink class="back-link" to="/games">返回游戏列表</NuxtLink>
    <h1>2048</h1>
    <p class="intro">方向键 / WASD / 滑动，合并相同数字，目标是合成 2048。</p>

    <div class="g2048">
      <div class="game-stats">
        <div><span>得分</span><strong>{{ score }}</strong></div>
        <div><span>最高</span><strong>{{ best }}</strong></div>
        <button class="button secondary" type="button" @click="reset">新游戏</button>
      </div>

      <div
        class="grid2048"
        @touchstart.passive="onTouchStart"
        @touchend="onTouchEnd"
      >
        <div
          v-for="(v, i) in board"
          :key="i"
          class="cell"
          :style="{ background: v ? tileColor(v) : 'rgba(24, 33, 31, 0.06)', color: tileText(v) }"
        >
          <span v-if="v">{{ v }}</span>
        </div>
      </div>

      <p v-if="over" class="form-error">没有可走的步了！点「新游戏」重来。</p>
      <p v-else-if="won" class="win-msg">🎉 合成 2048！可以继续挑战更高分。</p>
    </div>
  </main>
</template>

<style scoped>
.g2048 {
  display: grid;
  gap: 18px;
  width: max-content;
  max-width: 100%;
}

.game-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
}

.game-stats > div {
  display: grid;
  gap: 2px;
  min-width: 84px;
  border: 1px solid rgba(24, 33, 31, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
  padding: 8px 16px;
}

.game-stats span {
  color: #5f6f69;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.game-stats strong {
  font-size: 26px;
  line-height: 1;
}

.grid2048 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 10px;
  width: min(380px, 100%);
  aspect-ratio: 1;
  padding: 10px;
  border-radius: 10px;
  background: rgba(24, 33, 31, 0.08);
  touch-action: none;
  user-select: none;
}

.cell {
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(24, 33, 31, 0.06);
  font-size: clamp(18px, 6vw, 30px);
  font-weight: 800;
  transition: background 0.08s ease;
}

.win-msg {
  margin: 0;
  color: #1f5d50;
  font-weight: 800;
}

@media (max-width: 480px) {
  .g2048 {
    width: 100%;
  }

  .game-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  .game-stats > div {
    min-width: 0;
    padding: 8px 12px;
  }

  .game-stats > button {
    grid-column: 1 / -1;
  }

  .grid2048 {
    gap: 7px;
    padding: 7px;
  }

  .cell {
    font-size: 22px;
  }
}
</style>
