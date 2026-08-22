<script setup lang="ts">
useHead({
  title: '贪吃蛇 · curry中心'
})

const COLS = 20
const ROWS = 20
const CELL = 20

const score = ref(0)
const best = ref(0)
const running = ref(false)
const gameOver = ref(false)

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let snake = [{ x: 10, y: 10 }]
let dir = { x: 1, y: 0 }
let nextDir = { x: 1, y: 0 }
let food = { x: 5, y: 5 }
let speed = 160
let timer: number | null = null

const placeFood = () => {
  let f = { x: 0, y: 0 }
  do {
    f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (snake.some((s) => s.x === f.x && s.y === f.y))
  food = f
}

const draw = () => {
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f6f4ef'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = 'rgba(24, 33, 31, 0.05)'
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, ROWS * CELL); ctx.stroke()
  }
  for (let j = 1; j < ROWS; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(COLS * CELL, j * CELL); ctx.stroke()
  }

  // 食物
  ctx.fillStyle = '#ba5930'
  ctx.beginPath()
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2)
  ctx.fill()

  // 蛇
  snake.forEach((s, i) => {
    ctx!.fillStyle = i === 0 ? '#1f5d50' : '#2f7d6c'
    ctx!.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
  })
}

const step = () => {
  dir = nextDir
  const currentHead = snake[0]
  if (!currentHead) {
    endGame()
    return
  }
  const head = { x: currentHead.x + dir.x, y: currentHead.y + dir.y }

  if (
    head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
    snake.some((s) => s.x === head.x && s.y === head.y)
  ) {
    endGame()
    return
  }

  snake.unshift(head)
  if (head.x === food.x && head.y === food.y) {
    score.value++
    if (speed > 100) {
      speed -= 2
      resetTimer()
    }
    placeFood()
  } else {
    snake.pop()
  }
  draw()
}

const resetTimer = () => {
  if (timer) clearInterval(timer)
  timer = window.setInterval(step, speed)
}

const start = () => {
  snake = [{ x: 10, y: 10 }]
  dir = { x: 1, y: 0 }
  nextDir = { x: 1, y: 0 }
  score.value = 0
  gameOver.value = false
  speed = 160
  placeFood()
  draw()
  running.value = true
  resetTimer()
}

const endGame = () => {
  running.value = false
  gameOver.value = true
  if (timer) clearInterval(timer)
  if (score.value > best.value) {
    best.value = score.value
    if (import.meta.client) localStorage.setItem('snake-best', String(best.value))
  }
}

const turn = (x: number, y: number) => {
  if (dir.x === -x && dir.y === -y) return // 禁止反向
  nextDir = { x, y }
}

const onKey = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp': case 'w': case 'W': turn(0, -1); break
    case 'ArrowDown': case 's': case 'S': turn(0, 1); break
    case 'ArrowLeft': case 'a': case 'A': turn(-1, 0); break
    case 'ArrowRight': case 'd': case 'D': turn(1, 0); break
    case ' ': if (gameOver.value || !running.value) start(); break
  }
}

onMounted(() => {
  canvas = document.getElementById('snake-canvas') as HTMLCanvasElement
  ctx = canvas.getContext('2d')
  best.value = Number(localStorage.getItem('snake-best') || 0)
  draw()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <main class="subpage game-page">
    <NuxtLink class="back-link" to="/games">返回游戏列表</NuxtLink>
    <h1>贪吃蛇</h1>
    <p class="intro">方向键或 WASD 控制方向，吃橙色食物得分。撞墙或撞到自己就结束。</p>

    <div class="game-board">
      <div class="game-stats">
        <div><span>得分</span><strong>{{ score }}</strong></div>
        <div><span>最高</span><strong>{{ best }}</strong></div>
      </div>

      <div class="canvas-wrap">
        <canvas id="snake-canvas" :width="COLS * CELL" :height="ROWS * CELL" />
        <div v-if="!running" class="overlay">
          <p v-if="gameOver">游戏结束 · 得分 {{ score }}</p>
          <p v-else>准备好了吗？</p>
          <button class="button primary" type="button" @click="start">
            {{ gameOver ? '再来一局' : '开始游戏' }}
          </button>
        </div>
      </div>

      <div class="touch-pad">
        <button type="button" @click="turn(0, -1)">↑</button>
        <div class="touch-row">
          <button type="button" @click="turn(-1, 0)">←</button>
          <button type="button" @click="turn(0, 1)">↓</button>
          <button type="button" @click="turn(1, 0)">→</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.game-board {
  display: grid;
  gap: 18px;
  width: min(400px, 100%);
  justify-content: start;
}

.game-stats {
  display: flex;
  gap: 14px;
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

.canvas-wrap {
  position: relative;
  width: 100%;
}

#snake-canvas {
  display: block;
  width: 100%;
  max-width: 400px;
  height: auto;
  border: 1px solid rgba(24, 33, 31, 0.12);
  border-radius: 8px;
  background: #f6f4ef;
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  gap: 12px;
  place-content: center;
  justify-items: center;
  border-radius: 8px;
  background: rgba(24, 33, 31, 0.55);
  color: #fff;
}

.overlay p {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.touch-pad {
  display: grid;
  gap: 6px;
  justify-content: center;
  margin-top: 4px;
}

.touch-row {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.touch-pad button {
  width: 52px;
  height: 52px;
  border: 1px solid #c9d2ce;
  border-radius: 8px;
  background: #fff;
  color: #18211f;
  font-size: 20px;
  cursor: pointer;
}

@media (max-width: 480px) {
  .game-stats {
    width: 100%;
  }

  .game-stats > div {
    min-width: 0;
    flex: 1;
    padding: 8px 12px;
  }

  .touch-pad button {
    width: 56px;
    height: 56px;
  }
}
</style>
