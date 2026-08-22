<script setup lang="ts">
import { getErrorMessage } from '~/utils/errors'

type Category = {
  id: string
  name: string
  slug: string
  description: string
  sort_order: number
  is_active: boolean
  article_count: number
}

definePageMeta({ layout: 'admin' })
useHead({ title: '知识分类 - Curry 中心' })

const emptyForm = { name: '', slug: '', description: '', sort_order: 0, is_active: true }
const categories = ref<Category[]>([])
const form = reactive({ ...emptyForm })
const editingId = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isEditorOpen = ref(false)
const errorMessage = ref('')
const confirmDialog = useAdminConfirm()

const loadCategories = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    categories.value = await $fetch<Category[]>('/api/admin/knowledge/categories')
  } catch {
    errorMessage.value = '知识分类读取失败。'
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  Object.assign(form, emptyForm)
  errorMessage.value = ''
  isEditorOpen.value = true
}

const openEdit = (category: Category) => {
  editingId.value = category.id
  Object.assign(form, {
    name: category.name,
    slug: category.slug,
    description: category.description,
    sort_order: category.sort_order,
    is_active: category.is_active
  })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const closeEditor = () => {
  if (!isSaving.value) isEditorOpen.value = false
}

const saveCategory = async () => {
  if (!form.name.trim() || isSaving.value) return
  isSaving.value = true
  errorMessage.value = ''
  try {
    const options = { method: editingId.value ? 'PUT' as const : 'POST' as const, body: form }
    await $fetch(editingId.value
      ? `/api/admin/knowledge/categories/${editingId.value}`
      : '/api/admin/knowledge/categories', options)
    isEditorOpen.value = false
    await loadCategories()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '知识分类保存失败。')
  } finally {
    isSaving.value = false
  }
}

const deleteCategory = async (category: Category) => {
  confirmDialog.request({
    title: '删除分类',
    message: `确定删除“${category.name}”吗？包含文章的分类无法删除。`,
    confirmLabel: '删除分类',
    tone: 'danger'
  }, async () => {
    errorMessage.value = ''
    try {
      await $fetch(`/api/admin/knowledge/categories/${category.id}`, { method: 'DELETE' })
      await loadCategories()
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '分类删除失败。')
    }
  })
}

onMounted(loadCategories)
</script>

<template>
  <div>
    <section class="admin-page-heading">
      <div>
        <h2>知识分类</h2>
        <p>管理知识文章的分类与显示顺序</p>
      </div>
      <button class="admin-primary-action" type="button" @click="openCreate">新增分类</button>
    </section>

    <p v-if="errorMessage && !isEditorOpen" class="admin-alert">{{ errorMessage }}</p>

    <section class="admin-panel">
      <LoadingSkeleton v-if="isLoading" :count="4" label="正在加载知识分类" />
      <div v-else-if="!categories.length" class="admin-empty">还没有知识分类</div>
      <div v-else class="knowledge-category-list">
        <article v-for="category in categories" :key="category.id">
          <span class="knowledge-category-order">{{ category.sort_order }}</span>
          <div>
            <div class="knowledge-category-title">
              <h3>{{ category.name }}</h3>
              <span :class="category.is_active ? 'status-active' : 'status-paused'">
                {{ category.is_active ? '显示中' : '已隐藏' }}
              </span>
            </div>
            <p>{{ category.description || '暂无分类说明' }}</p>
            <small>/{{ category.slug }} · {{ category.article_count }} 篇文章</small>
          </div>
          <div class="plan-admin-actions">
            <button type="button" @click="openEdit(category)">编辑</button>
            <button class="danger" type="button" @click="deleteCategory(category)">删除</button>
          </div>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isEditorOpen" class="admin-modal-backdrop">
        <section class="admin-modal" role="dialog" aria-modal="true" aria-label="知识分类编辑">
          <header>
            <div><p>知识库</p><h2>{{ editingId ? '编辑分类' : '新增分类' }}</h2></div>
            <button type="button" aria-label="关闭" title="关闭" @click="closeEditor">×</button>
          </header>
          <form class="admin-recipe-form" @submit.prevent="saveCategory">
            <label>分类名称<input v-model="form.name" required maxlength="80" placeholder="例如：开发笔记" /></label>
            <label>分类标识<input v-model="form.slug" maxlength="120" placeholder="留空时根据名称生成" /></label>
            <label>分类说明<textarea v-model="form.description" rows="3" placeholder="简单说明这个分类记录什么" /></label>
            <div class="form-grid">
              <label>排序<input v-model.number="form.sort_order" type="number" step="1" /></label>
              <label class="plan-active-field"><input v-model="form.is_active" type="checkbox" />在前台显示</label>
            </div>
            <p v-if="errorMessage" class="admin-alert">{{ errorMessage }}</p>
            <footer>
              <button class="admin-secondary-action" type="button" @click="closeEditor">取消</button>
              <button class="admin-primary-action" type="submit" :disabled="isSaving">{{ isSaving ? '保存中...' : '保存分类' }}</button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
    <AdminConfirmDialog v-bind="confirmDialog.state" @cancel="confirmDialog.cancel" @confirm="confirmDialog.accept" />
  </div>
</template>
