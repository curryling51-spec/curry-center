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

type ArticleRevisionSummary = {
  id: string
  article_id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  change_type: 'edit' | 'publish' | 'unpublish' | 'restore'
  changed_by_username: string
  created_at: string
}

type ArticleRevision = ArticleRevisionSummary & {
  category_id: string
  content_markdown: string
  published_at: string | null
  changed_by_user_id: string | null
}

definePageMeta({ layout: 'admin' })
useHead({ title: '知识文章 - Curry 中心' })

const emptyForm = {
  category_id: '',
  title: '',
  slug: '',
  content_markdown: '',
  published_at: ''
}

const articles = ref<Article[]>([])
const categories = ref<Category[]>([])
const form = reactive({ ...emptyForm })
const editingId = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isUploading = ref(false)
const isEditorOpen = ref(false)
const isHistoryOpen = ref(false)
const isHistoryLoading = ref(false)
const isHistoryDetailLoading = ref(false)
const isRestoring = ref(false)
const errorMessage = ref('')
const historyErrorMessage = ref('')
const historyArticle = ref<Article | null>(null)
const revisions = ref<ArticleRevisionSummary[]>([])
const selectedRevisionId = ref<string | null>(null)
const selectedRevision = ref<ArticleRevision | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const contentInput = ref<HTMLTextAreaElement | null>(null)
const confirmDialog = useAdminConfirm()

const publishedCount = computed(() => articles.value.filter(article => article.status === 'published').length)

const historyActionLabel = (changeType: ArticleRevisionSummary['change_type']) => ({
  edit: '编辑前',
  publish: '发布前',
  unpublish: '下架前',
  restore: '恢复前'
})[changeType]

const formatDateTime = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value))

const categoryName = (categoryId: string) =>
  categories.value.find(category => category.id === categoryId)?.name || '原分类已删除'

const toLocalDateTime = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

const toPublishedAt = (value: string) => value ? new Date(value).toISOString() : null

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
    content_markdown: article.content_markdown,
    published_at: toLocalDateTime(article.published_at)
  })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const closeEditor = () => {
  if (!isSaving.value && !isUploading.value) isEditorOpen.value = false
}

const selectRevision = async (revision: ArticleRevisionSummary) => {
  if (!historyArticle.value || isHistoryDetailLoading.value && selectedRevisionId.value === revision.id) return
  selectedRevisionId.value = revision.id
  selectedRevision.value = null
  isHistoryDetailLoading.value = true
  historyErrorMessage.value = ''
  try {
    const detail = await $fetch<ArticleRevision>(
      `/api/admin/knowledge/articles/${historyArticle.value.id}/history/${revision.id}`
    )
    if (selectedRevisionId.value === revision.id) selectedRevision.value = detail
  } catch (error) {
    historyErrorMessage.value = getErrorMessage(error, '历史版本读取失败。')
  } finally {
    if (selectedRevisionId.value === revision.id) isHistoryDetailLoading.value = false
  }
}

const openHistory = async (article: Article) => {
  historyArticle.value = article
  revisions.value = []
  selectedRevisionId.value = null
  selectedRevision.value = null
  historyErrorMessage.value = ''
  isHistoryOpen.value = true
  isHistoryLoading.value = true
  try {
    revisions.value = await $fetch<ArticleRevisionSummary[]>(
      `/api/admin/knowledge/articles/${article.id}/history`
    )
    if (revisions.value[0]) await selectRevision(revisions.value[0])
  } catch (error) {
    historyErrorMessage.value = getErrorMessage(error, '文章历史读取失败。')
  } finally {
    isHistoryLoading.value = false
  }
}

const closeHistory = () => {
  if (!isRestoring.value) isHistoryOpen.value = false
}

const restoreRevision = () => {
  const article = historyArticle.value
  const revision = selectedRevision.value
  if (!article || !revision || isRestoring.value) return

  confirmDialog.request({
    title: '恢复历史版本',
    message: `确定把“${article.title}”恢复到 ${formatDateTime(revision.created_at)} 保存的版本吗？当前版本也会自动保留在历史中。`,
    confirmLabel: '恢复此版本',
    tone: 'primary'
  }, async () => {
    isRestoring.value = true
    historyErrorMessage.value = ''
    try {
      await $fetch(
        `/api/admin/knowledge/articles/${article.id}/history/${revision.id}/restore`,
        { method: 'POST' }
      )
      isHistoryOpen.value = false
      await loadData()
    } catch (error) {
      historyErrorMessage.value = getErrorMessage(error, '文章历史恢复失败。')
    } finally {
      isRestoring.value = false
    }
  })
}

const saveArticle = async () => {
  if (!form.title.trim() || !form.content_markdown.trim() || isSaving.value) return
  isSaving.value = true
  errorMessage.value = ''
  try {
    const options = {
      method: editingId.value ? 'PUT' as const : 'POST' as const,
      body: { ...form, published_at: toPublishedAt(form.published_at) }
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
            <button type="button" @click="openHistory(article)">历史</button>
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
              <label>
                前台发布时间
                <input v-model="form.published_at" type="datetime-local" />
                <small>用于前台“发布于…”的时间；留空时会在首次发布时自动填入当前时间。</small>
              </label>

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

    <Teleport to="body">
      <div v-if="isHistoryOpen" class="admin-modal-backdrop">
        <section class="admin-modal article-history-modal" role="dialog" aria-modal="true" aria-label="文章历史">
          <header>
            <div>
              <p>VERSION HISTORY</p>
              <h2>{{ historyArticle?.title || '文章历史' }}</h2>
            </div>
            <button type="button" aria-label="关闭" title="关闭" @click="closeHistory">×</button>
          </header>

          <div class="article-history-layout">
            <aside class="article-history-sidebar">
              <div class="article-history-sidebar-head">
                <strong>历史版本</strong>
                <span>{{ revisions.length }} 条</span>
              </div>

              <LoadingSkeleton v-if="isHistoryLoading" :count="5" label="正在加载文章历史" />
              <div v-else-if="!revisions.length" class="article-history-empty">
                暂无历史版本<br />首次修改、发布或下架后会自动记录
              </div>
              <div v-else class="article-history-list">
                <button
                  v-for="revision in revisions"
                  :key="revision.id"
                  type="button"
                  :class="{ active: selectedRevisionId === revision.id }"
                  @click="selectRevision(revision)"
                >
                  <span>
                    <strong>{{ historyActionLabel(revision.change_type) }}</strong>
                    <i :class="{ published: revision.status === 'published' }">
                      {{ revision.status === 'published' ? '已发布' : '草稿' }}
                    </i>
                  </span>
                  <small>{{ formatDateTime(revision.created_at) }}</small>
                  <em>{{ revision.changed_by_username }}</em>
                </button>
              </div>
            </aside>

            <main class="article-history-preview">
              <LoadingSkeleton
                v-if="isHistoryDetailLoading"
                variant="list"
                :count="5"
                label="正在加载历史版本"
              />
              <div v-else-if="selectedRevision" class="article-history-document">
                <div class="article-history-meta">
                  <div>
                    <span>{{ categoryName(selectedRevision.category_id) }}</span>
                    <span>{{ selectedRevision.status === 'published' ? '已发布' : '草稿' }}</span>
                    <code>/{{ selectedRevision.slug }}</code>
                  </div>
                  <button
                    class="admin-primary-action"
                    type="button"
                    :disabled="isRestoring"
                    @click="restoreRevision"
                  >
                    {{ isRestoring ? '恢复中...' : '恢复此版本' }}
                  </button>
                </div>
                <h3>{{ selectedRevision.title }}</h3>
                <p>
                  {{ historyActionLabel(selectedRevision.change_type) }} ·
                  {{ formatDateTime(selectedRevision.created_at) }} ·
                  {{ selectedRevision.changed_by_username }}
                </p>
                <div class="article-history-content">
                  <MarkdownContent :source="selectedRevision.content_markdown" />
                </div>
              </div>
              <div v-else class="article-history-empty">选择左侧版本查看内容</div>

              <p v-if="historyErrorMessage" class="admin-alert article-history-error">
                {{ historyErrorMessage }}
              </p>
            </main>
          </div>
        </section>
      </div>
    </Teleport>
    <AdminConfirmDialog v-bind="confirmDialog.state" @cancel="confirmDialog.cancel" @confirm="confirmDialog.accept" />
  </div>
</template>
