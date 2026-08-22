<script setup lang="ts">
import { ArrowLeft, ArrowUp } from '@lucide/vue'
import { extractMarkdownHeadings } from '~/utils/markdown'

type Article = {
  id: string
  title: string
  slug: string
  content_markdown: string
  published_at: string
  category: { id: string; name: string; slug: string }
}

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const { data: article, error, status } = await useLazyFetch<Article>(
  () => `/api/library/articles/${encodeURIComponent(slug.value)}`,
  { key: `library-article-${slug.value}` }
)

watch(error, (value) => {
  if (value) showError(createError({ statusCode: 404, statusMessage: '文章不存在' }))
}, { immediate: true })

useSeoMeta({
  title: () => `${article.value?.title || '知识文章'} - Curry 中心`,
  description: 'Curry 个人知识库文章'
})

const publishedDate = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric'
}).format(new Date(article.value?.published_at || Date.now())))

const headings = computed(() => extractMarkdownHeadings(article.value?.content_markdown || ''))
const activeHeadingId = ref(headings.value[0]?.id || '')
const showScrollTop = ref(false)
let scrollFrame = 0

const updateScrollTopVisibility = () => {
  showScrollTop.value = window.scrollY > 360
}

const updateActiveHeading = () => {
  scrollFrame = 0
  const headingElements = headings.value
    .map(heading => document.getElementById(heading.id))
    .filter((element): element is HTMLElement => Boolean(element))

  const firstHeading = headingElements[0]
  if (!firstHeading) return

  const currentHeading = [...headingElements]
    .reverse()
    .find(element => element.getBoundingClientRect().top <= 140)

  activeHeadingId.value = (currentHeading || firstHeading).id
}

const handleScroll = () => {
  updateScrollTopVisibility()
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(updateActiveHeading)
}

const scrollToHeading = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  nextTick(updateActiveHeading)
  updateScrollTopVisibility()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <main v-if="article" class="knowledge-article-page">
    <NuxtLink
      class="knowledge-article-back"
      :to="{ path: '/library', query: { category: article.category.slug } }"
      aria-label="返回知识库"
      title="返回知识库"
    >
      <ArrowLeft :size="20" :stroke-width="2" aria-hidden="true" />
    </NuxtLink>
    <header class="knowledge-article-header">
      <div class="knowledge-article-meta">
        <NuxtLink :to="{ path: '/library', query: { category: article.category.slug } }">{{ article.category.name }}</NuxtLink>
        <span aria-hidden="true"></span>
        <time :datetime="article.published_at">发布于 {{ publishedDate }}</time>
      </div>
      <h1>{{ article.title }}</h1>
    </header>
    <nav v-if="headings.length" class="knowledge-article-toc" aria-label="文章目录">
      <p>本页目录</p>
      <a
        v-for="heading in headings"
        :key="heading.id"
        :href="`#${heading.id}`"
        :class="{ active: activeHeadingId === heading.id }"
        @click.prevent="scrollToHeading(heading.id)"
      >
        {{ heading.text }}
      </a>
    </nav>
    <article class="knowledge-article-body"><MarkdownContent :source="article.content_markdown" /></article>
    <Transition name="knowledge-scroll-top">
      <button
        v-if="showScrollTop"
        class="knowledge-scroll-top"
        type="button"
        aria-label="返回顶部"
        title="返回顶部"
        @click="scrollToTop"
      >
        <ArrowUp :size="20" :stroke-width="2" aria-hidden="true" />
      </button>
    </Transition>
  </main>
  <main v-else-if="status === 'pending'" class="knowledge-article-page knowledge-article-loading" aria-label="正在加载文章">
    <div class="content-skeleton article-meta" />
    <div class="content-skeleton article-title" />
    <div class="content-skeleton article-title short" />
    <div class="knowledge-article-loading-body">
      <div v-for="index in 7" :key="index" class="content-skeleton line" :class="{ narrow: index % 3 === 0 }" />
    </div>
  </main>
</template>
