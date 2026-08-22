<script setup lang="ts">
import { getErrorMessage } from '~/utils/errors'

type Category = { id: string; name: string; slug: string; is_active: boolean }
type Article = {
  id: string
  category_id: string
  title: string
  slug: string
  content_markdown: string
  status: 'draft' | 'published'
  published_at: string | null
  updated_at: string
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
}

definePageMeta({ layout: 'admin' })
useHead({ title: '知识文章 - Curry 中心' })

const emptyForm = {
  category_id: '',
  title: '',
  slug: '',
  content_markdown: ''
}

const articles = ref<Article[]>([])
const categories = ref<Category[]>([])
const form = reactive({ ...emptyForm })
const editingId = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isUploading = ref(false)
const isEditorOpen = ref(false)
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const contentInput = ref<HTMLTextAreaElement | null>(null)
const confirmDialog = useAdminConfirm()

const publishedCount = computed(() => articles.value.filter(article => article.status === 'published').length)

const loadData = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [articleData, categoryData] = await Promise.all([
      $fetch<Article[]>('/api/admin/knowledge/articles'),
      $fetch<Category[]>('/api/admin/knowledge/categories')
    ])
    articles.value = articleData
    categories.value = categoryData
  } catch {
    errorMessage.value = '知识文章读取失败。'
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  if (!categories.value.length) {
    errorMessage.value = '请先创建至少一个知识分类。'
    return
  }
  editingId.value = null
  Object.assign(form, emptyForm, { category_id: categories.value[0]?.id || '' })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const openEdit = (article: Article) => {
  editingId.value = article.id
  Object.assign(form, {
    category_id: article.category_id,
    title: article.title,
    slug: article.slug,
    content_markdown: article.content_markdown
  })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const closeEditor = () => {
  if (!isSaving.value && !isUploading.value) isEditorOpen.value = false
}

const saveArticle = async () => {
  if (!form.title.trim() || !form.content_markdown.trim() || isSaving.value) return
  isSaving.value = true
  errorMessage.value = ''
  try {
    const options = {
      method: editingId.value ? 'PUT' as const : 'POST' as const,
      body: { ...form }
    }
    await $fetch(editingId.value
      ? `/api/admin/knowledge/articles/${editingId.value}`
      : '/api/admin/knowledge/articles', options)
    isEditorOpen.value = false
    await loadData()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '知识文章保存失败。')
  } finally {
    isSaving.value = false
  }
}

const deleteArticle = async (article: Article) => {
  confirmDialog.request({
    title: '删除文章',
    message: `确定删除“${article.title}”吗？删除后无法恢复。`,
    confirmLabel: '删除文章',
    tone: 'danger'
  }, async () => {
    errorMessage.value = ''
    try {
      await $fetch(`/api/admin/knowledge/articles/${article.id}`, { method: 'DELETE' })
      await loadData()
    } catch {
      errorMessage.value = '知识文章删除失败。'
    }
  })
}

const changeStatus = async (article: Article) => {
  const nextStatus = article.status === 'published' ? 'draft' : 'published'
  const action = nextStatus === 'published' ? '发布' : '下架'
  confirmDialog.request({
    title: `${action}文章`,
    message: nextStatus === 'published'
      ? `确定发布“${article.title}”吗？发布后将在前台知识库显示。`
      : `确定下架“${article.title}”吗？下架后前台将无法访问。`,
    confirmLabel: `确认${action}`,
    tone: nextStatus === 'published' ? 'primary' : 'danger'
  }, async () => {
    errorMessage.value = ''
    try {
      await $fetch(`/api/admin/knowledge/articles/${article.id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus }
      })
      await loadData()
    } catch (error) {
      errorMessage.value = getErrorMessage(error, `文章${action}失败。`)
    }
  })
}

const insertImageMarkdown = async (url: string, alt: string) => {
  const textarea = contentInput.value
  const markdown = `\n![${alt}](${url})\n`
  if (!textarea) {
    form.content_markdown += markdown
    return
  }
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  form.content_markdown = `${form.content_markdown.slice(0, start)}${markdown}${form.content_markdown.slice(end)}`
  await nextTick()
  textarea.focus()
  textarea.setSelectionRange(start + markdown.length, start + markdown.length)
}

const uploadImage = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || isUploading.value) return
  isUploading.value = true
  errorMessage.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ url: string }>('/api/admin/knowledge/upload', { method: 'POST', body })
    await insertImageMarkdown(result.url, file.name.replace(/\.[^.]+$/, ''))
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '图片上传失败。')
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

onMounted(loadData)
</script>

<template>
  <div>
    <section class="admin-page-heading">
      <div>
        <h2>知识文章</h2>
        <p>{{ articles.length }} 篇文章，{{ publishedCount }} 篇已发布</p>
      </div>
      <button class="admin-primary-action" type="button" @click="openCreate">新增文章</button>
    </section>

    <p v-if="errorMessage && !isEditorOpen" class="admin-alert">{{ errorMessage }}</p>

    <section class="admin-panel">
      <LoadingSkeleton v-if="isLoading" :count="5" label="正在加载知识文章" />
      <div v-else-if="!articles.length" class="admin-empty">还没有知识文章</div>
      <div v-else class="knowledge-admin-articles">
        <article v-for="article in articles" :key="article.id">
          <div class="knowledge-article-state" :class="{ published: article.status === 'published' }">
            {{ article.status === 'published' ? '已发布' : '草稿' }}
          </div>
          <div class="knowledge-admin-copy">
            <span>{{ article.category?.name || '未分类' }}</span>
            <h3>{{ article.title }}</h3>
            <p>/{{ article.slug }}</p>
            <small>{{ article.status === 'published' && article.published_at ? `发布于 ${new Date(article.published_at).toLocaleDateString('zh-CN')}` : `更新于 ${new Date(article.updated_at).toLocaleDateString('zh-CN')}` }}</small>
          </div>
          <div class="plan-admin-actions">
            <NuxtLink v-if="article.status === 'published'" :to="`/library/article/${article.slug}`" target="_blank">查看</NuxtLink>
            <button type="button" @click="openEdit(article)">编辑</button>
            <button type="button" @click="changeStatus(article)">{{ article.status === 'published' ? '下架' : '发布' }}</button>
            <button class="danger" type="button" @click="deleteArticle(article)">删除</button>
          </div>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isEditorOpen" class="admin-modal-backdrop">
        <section class="admin-modal knowledge-article-modal" role="dialog" aria-modal="true" aria-label="知识文章编辑">
          <header>
            <div><p>MARKDOWN</p><h2>{{ editingId ? '编辑文章' : '新增文章' }}</h2></div>
            <button type="button" aria-label="关闭" title="关闭" @click="closeEditor">×</button>
          </header>

          <form class="admin-recipe-form knowledge-article-form" @submit.prevent="saveArticle">
            <div class="knowledge-article-form-scroll">
              <div class="form-grid">
                <label>文章标题<input v-model="form.title" required maxlength="180" placeholder="输入文章标题" /></label>
                <label>所属分类<select v-model="form.category_id" required><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option></select></label>
              </div>
              <label>文章标识<input v-model="form.slug" maxlength="220" placeholder="留空时根据标题生成" /></label>

              <div class="knowledge-editor-toolbar">
                <strong>Markdown 正文</strong>
                <button class="admin-secondary-action" type="button" :disabled="isUploading" @click="fileInput?.click()">{{ isUploading ? '上传中...' : '上传图片' }}</button>
                <input ref="fileInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="uploadImage" />
              </div>

              <div class="knowledge-editor-grid">
                <textarea ref="contentInput" v-model="form.content_markdown" required rows="20" spellcheck="false" placeholder="# 标题&#10;&#10;开始记录你的知识..." />
                <div class="knowledge-preview"><MarkdownContent :source="form.content_markdown || '*预览区域*'" /></div>
              </div>

              <p v-if="errorMessage" class="admin-alert">{{ errorMessage }}</p>
            </div>
            <footer>
              <button class="admin-secondary-action" type="button" @click="closeEditor">取消</button>
              <button class="admin-primary-action" type="submit" :disabled="isSaving || isUploading">{{ isSaving ? '保存中...' : '保存文章' }}</button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
    <AdminConfirmDialog v-bind="confirmDialog.state" @cancel="confirmDialog.cancel" @confirm="confirmDialog.accept" />
  </div>
</template>
