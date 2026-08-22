<script setup lang="ts">
const { data: health } = await useLazyFetch('/api/health', { key: 'home-health' })

type LatestArticle = {
  id: string
  title: string
  slug: string
  excerpt: string
  published_at: string
  category: { name: string; slug: string }
}

const { data: latestArticles, status: latestStatus } = await useLazyFetch<LatestArticle[]>('/api/library/latest', {
  key: 'library-latest',
  default: () => []
})

const formatArticleDate = (date: string) => new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit', day: '2-digit'
}).format(new Date(date))

useHead({
  title: 'Curry 中心'
})
</script>

<template>
  <main class="page-shell">
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">Personal Command Library</p>
        <h1>Curry 中心</h1>
        <p class="intro">收拢日常所需，沉淀值得保留的内容，让这里慢慢成为真正属于自己的数字空间。</p>

        <div class="actions">
          <NuxtLink class="button primary" to="/checkin">今日签到</NuxtLink>
          <NuxtLink class="button secondary" to="/admin">进入后台</NuxtLink>
          <NuxtLink class="button secondary" to="/games">小游戏</NuxtLink>
          <NuxtLink class="button secondary" to="/library">个人知识库</NuxtLink>
          <NuxtLink class="button secondary" to="/ordering-food">在线点菜</NuxtLink>
        </div>
      </div>

      <div class="status-panel">
        <p class="panel-label">系统状态</p>
        <div class="status-row">
          <span class="dot" />
          <strong>{{ health?.status || 'checking' }}</strong>
        </div>
        <p class="panel-copy">数据库与应用服务连接正常。</p>
      </div>
    </section>

    <section v-if="latestArticles.length" class="home-knowledge" aria-labelledby="latest-knowledge-title">
      <header>
        <div>
          <p class="panel-label">KNOWLEDGE BASE</p>
          <h2 id="latest-knowledge-title">最新知识</h2>
        </div>
        <NuxtLink to="/library">查看全部</NuxtLink>
      </header>

      <div class="home-article-grid">
        <NuxtLink
          v-for="article in latestArticles"
          :key="article.id"
          class="home-article-card"
          :to="`/library/article/${article.slug}`"
        >
          <div>
            <span>{{ article.category.name }}</span>
            <time :datetime="article.published_at">{{ formatArticleDate(article.published_at) }}</time>
          </div>
          <h3>{{ article.title }}</h3>
          <p>{{ article.excerpt || '打开文章阅读全文。' }}</p>
          <strong>阅读文章</strong>
        </NuxtLink>
      </div>
    </section>

    <section v-else-if="latestStatus === 'pending'" class="home-knowledge" aria-label="正在加载最新知识">
      <header>
        <div>
          <p class="panel-label">KNOWLEDGE BASE</p>
          <h2>最新知识</h2>
        </div>
      </header>
      <div class="home-article-grid" aria-hidden="true">
        <div v-for="index in 3" :key="index" class="home-article-card content-skeleton-card">
          <span class="content-skeleton short" />
          <span class="content-skeleton title" />
          <span class="content-skeleton line" />
          <span class="content-skeleton line narrow" />
        </div>
      </div>
    </section>

  </main>
</template>
