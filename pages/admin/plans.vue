<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { zhCN } from 'date-fns/locale'

type Plan = {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  checkin_count: number
  completed_today: boolean
}

definePageMeta({ layout: 'admin' })
useHead({ title: '计划管理 - Curry 中心' })

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Hong_Kong',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date())

const emptyForm = {
  title: '',
  description: '',
  start_date: today,
  end_date: '',
  is_active: true,
  sort_order: 0
}

const plans = ref<Plan[]>([])
const form = reactive({ ...emptyForm })
const editingId = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isEditorOpen = ref(false)
const errorMessage = ref('')
const confirmDialog = useAdminConfirm()

const activeCount = computed(() => plans.value.filter(plan => plan.is_active).length)

const loadPlans = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    plans.value = await $fetch<Plan[]>('/api/admin/plans')
  } catch {
    errorMessage.value = '计划读取失败，请稍后重试。'
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

const openEdit = (plan: Plan) => {
  editingId.value = plan.id
  Object.assign(form, {
    title: plan.title,
    description: plan.description,
    start_date: plan.start_date,
    end_date: plan.end_date || '',
    is_active: plan.is_active,
    sort_order: plan.sort_order
  })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const closeEditor = () => {
  if (!isSaving.value) isEditorOpen.value = false
}

const savePlan = async () => {
  if (!form.title.trim() || isSaving.value) return
  isSaving.value = true
  errorMessage.value = ''

  try {
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      end_date: form.end_date || null
    }
    if (editingId.value) {
      await $fetch(`/api/admin/plans/${editingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/admin/plans', { method: 'POST', body: payload })
    }
    await loadPlans()
    isEditorOpen.value = false
  } catch {
    errorMessage.value = '计划保存失败，请检查日期后重试。'
  } finally {
    isSaving.value = false
  }
}

const togglePlan = async (plan: Plan) => {
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PUT',
      body: {
        title: plan.title,
        description: plan.description,
        start_date: plan.start_date,
        end_date: plan.end_date,
        is_active: !plan.is_active,
        sort_order: plan.sort_order
      }
    })
    await loadPlans()
  } catch {
    errorMessage.value = '计划状态修改失败。'
  }
}

const deletePlan = async (plan: Plan) => {
  confirmDialog.request({
    title: '删除计划',
    message: `确定删除“${plan.title}”吗？计划将从后台隐藏，已有签到记录会保留。`,
    confirmLabel: '删除计划',
    tone: 'danger'
  }, async () => {
    errorMessage.value = ''
    try {
      await $fetch(`/api/admin/plans/${plan.id}`, { method: 'DELETE' })
      await loadPlans()
    } catch {
      errorMessage.value = '计划删除失败，请稍后重试。'
    }
  })
}

onMounted(loadPlans)
</script>

<template>
  <div>
    <section class="admin-page-heading">
      <div>
        <h2>计划管理</h2>
        <p>{{ activeCount }} 个计划正在进行</p>
      </div>
      <button class="admin-primary-action" type="button" @click="openCreate">新增计划</button>
    </section>

    <p v-if="errorMessage && !isEditorOpen" class="admin-alert">{{ errorMessage }}</p>

    <section class="admin-panel plan-management">
      <LoadingSkeleton v-if="isLoading" :count="4" label="正在加载计划" />
      <div v-else-if="!plans.length" class="admin-empty">还没有计划</div>
      <div v-else class="plan-admin-list">
        <article v-for="plan in plans" :key="plan.id">
          <div class="plan-admin-status" :class="{ completed: plan.completed_today }">
            {{ plan.completed_today ? '今日已完成' : '今日未完成' }}
          </div>
          <div class="plan-admin-copy">
            <div>
              <h3>{{ plan.title }}</h3>
              <span :class="plan.is_active ? 'status-active' : 'status-paused'">
                {{ plan.is_active ? '进行中' : '已停用' }}
              </span>
            </div>
            <p>{{ plan.description || '暂无备注' }}</p>
            <small>
              {{ plan.start_date }} 至 {{ plan.end_date || '长期' }} · 累计签到 {{ plan.checkin_count }} 天
            </small>
          </div>
          <div class="plan-admin-actions">
            <button type="button" @click="openEdit(plan)">编辑</button>
            <button type="button" @click="togglePlan(plan)">{{ plan.is_active ? '停用' : '启用' }}</button>
            <button class="danger" type="button" @click="deletePlan(plan)">删除</button>
          </div>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isEditorOpen" class="admin-modal-backdrop">
        <section class="admin-modal plan-editor" role="dialog" aria-modal="true" aria-label="计划编辑">
          <header>
            <div>
              <p>每日计划</p>
              <h2>{{ editingId ? '编辑计划' : '新增计划' }}</h2>
            </div>
            <button type="button" aria-label="关闭" title="关闭" @click="closeEditor">×</button>
          </header>

          <form class="admin-recipe-form" @submit.prevent="savePlan">
            <label>
              计划名称
              <input v-model="form.title" required maxlength="120" placeholder="例如：每天走路 30 分钟" />
            </label>
            <label>
              计划说明
              <textarea v-model="form.description" rows="4" placeholder="写下目标或完成标准" />
            </label>
            <div class="form-grid">
              <label>
                开始日期
                <VueDatePicker
                  v-model="form.start_date"
                  model-type="yyyy-MM-dd"
                  :formats="{ input: 'yyyy年MM月dd日' }"
                  :locale="zhCN"
                  auto-apply
                  :time-config="{ enableTimePicker: false }"
                  :clearable="false"
                  teleport="body"
                />
              </label>
              <label>
                结束日期
                <VueDatePicker
                  v-model="form.end_date"
                  model-type="yyyy-MM-dd"
                  :formats="{ input: 'yyyy年MM月dd日' }"
                  :locale="zhCN"
                  auto-apply
                  :time-config="{ enableTimePicker: false }"
                  :min-date="form.start_date"
                  placeholder="长期计划可不填写"
                  teleport="body"
                />
              </label>
            </div>
            <div class="form-grid">
              <label>
                排序
                <input v-model.number="form.sort_order" type="number" step="1" />
              </label>
              <label class="plan-active-field">
                <input v-model="form.is_active" type="checkbox" />
                创建后立即启用
              </label>
            </div>

            <p v-if="errorMessage" class="admin-alert">{{ errorMessage }}</p>

            <footer>
              <button class="admin-secondary-action" type="button" @click="closeEditor">取消</button>
              <button class="admin-primary-action" type="submit" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存计划' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
    <AdminConfirmDialog v-bind="confirmDialog.state" @cancel="confirmDialog.cancel" @confirm="confirmDialog.accept" />
  </div>
</template>
