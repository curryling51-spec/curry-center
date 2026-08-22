<script setup lang="ts">
type Category = {
  id: string
  name: string
  slug: string
  description: string
  article_count: number
}

type Article = {
  id: string
  title: string
  slug: string
  excerpt: string
  published_at: string
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
}

const route = useRoute()
const router = useRouter()
const activeCategory = computed(() => typeof route.query.category === 'string' ? route.query.category : '')
const { data: categories, status: categoryStatus } = await useLazyFetch<Category[]>('/api/library/categories', {
  key: 'library-categories',
  default: () => []
})
const { data: articles, status } = await useLazyFetch<Article[]>('/api/library/articles', {
  query: computed(() => activeCategory.value ? { category: activeCategory.value } : {}),
  default: () => []
})

useHead({
  title: '个人知识库 - Curry 中心'
})

const selectCategory = async (slug: string) => {
  await router.push({ query: slug ? { category: slug } : {} })
}

const formatDate = (date: string) => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric'
}).format(new Date(date))
</script>

<template>
  <main class="library-page">
    <header class="library-header">
      <NuxtLink class="back-link" to="/">返回首页</NuxtLink>
      <div>
        <p>CURRY KNOWLEDGE</p>
        <h1>个人知识库</h1>
        <span>记录值得长期保存的知识与思考</span>
      </div>
    </header>

    <nav class="library-categories" aria-label="知识分类">
      <button type="button" :class="{ active: !activeCategory }" @click="selectCategory('')">全部</button>
      <button v-for="category in categories" :key="category.id" type="button" :class="{ active: activeCategory === category.slug }" @click="selectCategory(category.slug)">
        {{ category.name }} <span>{{ category.article_count }}</span>
      </button>
      <template v-if="categoryStatus === 'pending' && !categories.length">
        <span v-for="index in 3" :key="index" class="library-category-skeleton content-skeleton" aria-hidden="true" />
      </template>
    </nav>

    <section class="library-results">
      <LoadingSkeleton v-if="status === 'pending'" variant="cards" :count="6" label="正在加载知识文章" />
      <div v-else-if="!articles.length" class="library-empty">这个分类还没有已发布文章</div>
      <div v-else class="library-article-grid">
        <NuxtLink v-for="article in articles" :key="article.id" :to="`/library/article/${article.slug}`" class="library-article-card">
          <div class="library-article-content">
            <div><span>{{ article.category?.name || '知识文章' }}</span><time :datetime="article.published_at">{{ formatDate(article.published_at) }}</time></div>
            <h2>{{ article.title }}</h2>
            <p>{{ article.excerpt || '打开文章阅读全文。' }}</p>
            <strong>阅读全文</strong>
          </div>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
