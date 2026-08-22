<script setup lang="ts">
import { getErrorMessage } from '~/utils/errors'

type AccessRule = {
  id: string
  access_key: string
  name: string
  is_active: boolean
  max_attempts: number
  lock_duration_hours: number
  locked_count: number
  created_at: string
  updated_at: string
}

definePageMeta({ layout: 'admin' })
useHead({ title: '访问验证 - Curry 中心' })

const emptyForm = { name: '', access_key: '', pattern: [] as number[], is_active: true }
const rules = ref<AccessRule[]>([])
const form = reactive({ ...emptyForm, pattern: [] as number[] })
const editingId = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isEditorOpen = ref(false)
const errorMessage = ref('')
const confirmDialog = useAdminConfirm()

const loadRules = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    rules.value = await $fetch<AccessRule[]>('/api/admin/access-rules')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '访问规则读取失败。')
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  Object.assign(form, emptyForm, { pattern: [] })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const openEdit = (rule: AccessRule) => {
  editingId.value = rule.id
  Object.assign(form, {
    name: rule.name,
    access_key: rule.access_key,
    pattern: [],
    is_active: rule.is_active
  })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const closeEditor = () => {
  if (!isSaving.value) isEditorOpen.value = false
}

const saveRule = async () => {
  if (!form.name.trim() || !form.access_key.trim() || isSaving.value) return
  if (!editingId.value && form.pattern.length < 4) {
    errorMessage.value = '请绘制至少连接 4 个节点的图案。'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    const body: Record<string, unknown> = {
      name: form.name,
      access_key: form.access_key,
      is_active: form.is_active
    }
    if (form.pattern.length) body.pattern = form.pattern

    await $fetch(editingId.value ? `/api/admin/access-rules/${editingId.value}` : '/api/admin/access-rules', {
      method: editingId.value ? 'PUT' : 'POST',
      body
    })
    isEditorOpen.value = false
    await loadRules()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '访问规则保存失败。')
  } finally {
    isSaving.value = false
  }
}

const deleteRule = (rule: AccessRule) => {
  confirmDialog.request({
    title: '删除访问规则',
    message: `确定删除“${rule.name}”吗？使用 Key「${rule.access_key}」的页面将无法再通过验证。`,
    confirmLabel: '删除规则',
    tone: 'danger'
  }, async () => {
    errorMessage.value = ''
    try {
      await $fetch(`/api/admin/access-rules/${rule.id}`, { method: 'DELETE' })
      await loadRules()
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '访问规则删除失败。')
    }
  })
}

onMounted(loadRules)
</script>

<template>
  <div>
    <section class="admin-page-heading">
      <div>
        <h2>访问验证</h2>
        <p>按 Key 管理前台页面的图案验证</p>
      </div>
      <button class="admin-primary-action" type="button" @click="openCreate">新增规则</button>
    </section>

    <p v-if="errorMessage && !isEditorOpen" class="admin-alert">{{ errorMessage }}</p>

    <section class="admin-panel">
      <LoadingSkeleton v-if="isLoading" :count="4" label="正在加载访问规则" />
      <div v-else-if="!rules.length" class="admin-empty">还没有访问规则</div>
      <div v-else class="access-rule-list">
        <article v-for="rule in rules" :key="rule.id">
          <span class="access-rule-status" :class="{ active: rule.is_active }">{{ rule.is_active ? '已启用' : '已停用' }}</span>
          <div class="access-rule-copy">
            <h3>{{ rule.name }}</h3>
            <code>{{ rule.access_key }}</code>
            <small>5 次失败后锁定 24 小时<span v-if="rule.locked_count"> · 当前锁定 {{ rule.locked_count }} 个来源</span></small>
          </div>
          <div class="plan-admin-actions">
            <button type="button" @click="openEdit(rule)">编辑</button>
            <button class="danger" type="button" @click="deleteRule(rule)">删除</button>
          </div>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isEditorOpen" class="admin-modal-backdrop">
        <section class="admin-modal access-rule-editor" role="dialog" aria-modal="true" aria-label="访问规则编辑">
          <header>
            <div><p>前台安全</p><h2>{{ editingId ? '编辑访问规则' : '新增访问规则' }}</h2></div>
            <button type="button" aria-label="关闭" title="关闭" @click="closeEditor">×</button>
          </header>
          <form class="admin-recipe-form" @submit.prevent="saveRule">
            <div class="form-grid">
              <label>规则名称<input v-model="form.name" required maxlength="80" placeholder="例如：今日签到" /></label>
              <label>访问 Key<input v-model="form.access_key" required maxlength="64" :disabled="Boolean(editingId)" placeholder="例如：checkin" /></label>
            </div>
            <div class="admin-pattern-field">
              <div>
                <strong>{{ editingId ? '绘制新图案（留空则不修改）' : '绘制验证图案' }}</strong>
                <button v-if="form.pattern.length" type="button" @click="form.pattern = []">清除重画</button>
              </div>
              <NinePointPattern v-model="form.pattern" :disabled="isSaving" />
              <p>{{ form.pattern.length ? `已连接 ${form.pattern.length} 个节点` : editingId ? '当前图案保持不变' : '至少连接 4 个节点' }}</p>
            </div>
            <label class="plan-active-field"><input v-model="form.is_active" type="checkbox" />启用这条访问规则</label>
            <p v-if="errorMessage" class="admin-alert">{{ errorMessage }}</p>
            <footer>
              <button class="admin-secondary-action" type="button" @click="closeEditor">取消</button>
              <button class="admin-primary-action" type="submit" :disabled="isSaving">{{ isSaving ? '保存中...' : '保存规则' }}</button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>

    <AdminConfirmDialog v-bind="confirmDialog.state" @cancel="confirmDialog.cancel" @confirm="confirmDialog.accept" />
  </div>
</template>
