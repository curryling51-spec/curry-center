<script setup lang="ts">
useHead({
  title: '小游戏 · curry中心'
})

const games = [
  { to: '/games/snake', emoji: '🐍', title: '贪吃蛇', desc: '方向键控制蛇身吃食物，越吃越长、越吃越快。' },
  { to: '/games/2048', emoji: '🔢', title: '2048', desc: '滑动合并相同数字，目标是合成 2048。' }
]
</script>

<template>
  <main class="page-shell">
    <section class="games-head">
      <NuxtLink class="back-link" to="/">返回首页</NuxtLink>
      <h1>小游戏</h1>
      <p class="intro">闲暇时玩的几个小作品，纯前端实现，都在 curry中心 里。键盘或触屏都能玩。</p>
    </section>

    <section class="game-grid" aria-label="游戏列表">
      <NuxtLink v-for="g in games" :key="g.to" class="game-card" :to="g.to">
        <span class="game-emoji">{{ g.emoji }}</span>
        <h2>{{ g.title }}</h2>
        <p>{{ g.desc }}</p>
        <span class="game-go">开始玩 →</span>
      </NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.games-head {
  margin-bottom: 32px;
}

.games-head h1 {
  margin-top: 20px;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.game-card {
  display: grid;
  align-content: start;
  gap: 4px;
  border: 1px solid rgba(24, 33, 31, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 18px 50px rgba(24, 33, 31, 0.08);
  padding: 24px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.game-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 60px rgba(24, 33, 31, 0.14);
}

.game-emoji {
  font-size: 34px;
  line-height: 1;
}

.game-card h2 {
  margin: 14px 0 6px;
  font-size: 24px;
}

.game-card p {
  margin: 0;
  color: #52605c;
  line-height: 1.7;
}

.game-go {
  margin-top: 12px;
  color: #1f5d50;
  font-weight: 800;
}
</style>
