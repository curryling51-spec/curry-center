<script setup lang="ts">
import { ShieldCheck, UserRound, UserRoundPlus } from '@lucide/vue'
import { getErrorMessage } from '~/utils/errors'

type AccountRole = 'super' | 'admin'

type AdminAccount = {
  id: string
  username: string
  role: AccountRole
  is_active: boolean
  is_current: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

type AccountUpdateResponse = {
  account: AdminAccount
  reauthentication_required: boolean
}

definePageMeta({ layout: 'admin', middleware: 'super-admin' })
useHead({ title: '账号管理 - Curry 中心' })

const emptyForm = {
  username: '',
  role: 'admin' as AccountRole,
  is_active: true,
  password: '',
  confirm_password: ''
}

const { check, logout } = useAuth()
const accounts = ref<AdminAccount[]>([])
const form = reactive({ ...emptyForm })
const editingId = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isEditorOpen = ref(false)
const errorMessage = ref('')
const confirmDialog = useAdminConfirm()

const activeCount = computed(() => accounts.value.filter(account => account.is_active).length)
const superCount = computed(() => accounts.value.filter(account => account.role === 'super' && account.is_active).length)
const currentAccount = computed(() => accounts.value.find(account => account.is_current) || null)
const editingAccount = computed(() => accounts.value.find(account => account.id === editingId.value) || null)
const isEditingCurrent = computed(() => editingAccount.value?.is_current === true)

const formatDateTime = (value: string | null) => {
  if (!value) return '尚未登录'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

const loadAccounts = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    accounts.value = await $fetch<AdminAccount[]>('/api/admin/accounts')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '账号列表读取失败。')
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

const openEdit = (account: AdminAccount) => {
  editingId.value = account.id
  Object.assign(form, {
    username: account.username,
    role: account.role,
    is_active: account.is_active,
    password: '',
    confirm_password: ''
  })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const closeEditor = () => {
  if (!isSaving.value) isEditorOpen.value = false
}

const validateForm = () => {
  const username = form.username.trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    return '账号需为 3 至 50 位，只能使用小写字母、数字、点、下划线或短横线。'
  }
  if (!editingId.value && !form.password) return '请设置初始密码。'
  if (form.password && (form.password.length < 10 || form.password.length > 128)) {
    return '密码长度需为 10 至 128 位。'
  }
  if (form.password !== form.confirm_password) return '两次输入的密码不一致。'
  return ''
}

const saveAccount = async () => {
  if (isSaving.value) return
  const validationMessage = validateForm()
  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    const body = {
      username: form.username,
      role: form.role,
      is_active: form.is_active,
      password: form.password
    }

    if (editingId.value) {
      const response = await $fetch<AccountUpdateResponse>(`/api/admin/accounts/${editingId.value}`, {
        method: 'PUT',
        body
      })
      if (response.reauthentication_required) {
        isEditorOpen.value = false
        await logout()
        await navigateTo({ path: '/login', query: { notice: 'password-updated' } })
        return
      }
      if (response.account.is_current) await check()
    } else {
      await $fetch('/api/admin/accounts', { method: 'POST', body })
    }

    isEditorOpen.value = false
    await loadAccounts()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '账号保存失败。')
  } finally {
    isSaving.value = false
  }
}

const deleteAccount = (account: AdminAccount) => {
  if (account.is_current) return
  confirmDialog.request({
    title: '删除管理账号',
    message: `确定删除账号“${account.username}”吗？该账号将立即无法登录，历史记录仍会保留在数据库中。`,
    confirmLabel: '删除账号',
    tone: 'danger'
  }, async () => {
    errorMessage.value = ''
    try {
      await $fetch(`/api/admin/accounts/${account.id}`, { method: 'DELETE' })
      await loadAccounts()
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '账号删除失败。')
    }
  })
}

onMounted(loadAccounts)
</script>

<template>
  <div>
    <section class="admin-page-heading">
      <div>
        <h2>账号管理</h2>
        <p>管理后台登录账号、角色、状态和密码</p>
      </div>
      <button class="admin-primary-action" type="button" @click="openCreate">
        <UserRoundPlus :size="17" aria-hidden="true" />
        新增账号
      </button>
    </section>

    <p v-if="errorMessage && !isEditorOpen" class="admin-alert">{{ errorMessage }}</p>

    <section class="admin-stats account-stats" aria-label="账号统计">
      <article>
        <span>账号总数</span>
        <strong>{{ isLoading ? '—' : accounts.length }}</strong>
        <small>未删除的后台账号</small>
      </article>
      <article>
        <span>已启用</span>
        <strong>{{ isLoading ? '—' : activeCount }}</strong>
        <small>当前可以登录</small>
      </article>
      <article>
        <span>超级管理员</span>
        <strong>{{ isLoading ? '—' : superCount }}</strong>
        <small>{{ currentAccount ? `当前：${currentAccount.username}` : '拥有系统设置权限' }}</small>
      </article>
    </section>

    <section class="admin-panel">
      <div class="admin-panel-head">
        <div>
          <h3>后台账号</h3>
          <p>停用或删除后，账号已有登录会立即失效</p>
        </div>
      </div>

      <LoadingSkeleton v-if="isLoading" :count="4" label="正在加载后台账号" />
      <div v-else-if="!accounts.length" class="admin-empty">还没有后台账号</div>
      <div v-else class="account-list">
        <article v-for="account in accounts" :key="account.id">
          <span class="account-avatar" :class="{ super: account.role === 'super' }">
            <ShieldCheck v-if="account.role === 'super'" :size="20" aria-hidden="true" />
            <UserRound v-else :size="20" aria-hidden="true" />
          </span>

          <div class="account-copy">
            <div>
              <h3>{{ account.username }}</h3>
              <span class="account-role" :class="account.role">
                {{ account.role === 'super' ? '超级管理员' : '管理员' }}
              </span>
              <span v-if="account.is_current" class="account-current">当前账号</span>
              <span class="account-status" :class="{ active: account.is_active }">
                {{ account.is_active ? '已启用' : '已停用' }}
              </span>
            </div>
            <p>最近登录：{{ formatDateTime(account.last_login_at) }}</p>
            <small>创建于 {{ formatDateTime(account.created_at) }}</small>
          </div>

          <div class="plan-admin-actions account-actions">
            <button type="button" @click="openEdit(account)">编辑</button>
            <button
              v-if="!account.is_current"
              class="danger"
              type="button"
              @click="deleteAccount(account)"
            >
              删除
            </button>
          </div>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isEditorOpen" class="admin-modal-backdrop">
        <section class="admin-modal account-editor" role="dialog" aria-modal="true" aria-label="后台账号编辑">
          <header>
            <div>
              <p>系统权限</p>
              <h2>{{ editingId ? '编辑后台账号' : '新增后台账号' }}</h2>
            </div>
            <button type="button" aria-label="关闭" title="关闭" @click="closeEditor">×</button>
          </header>

          <form class="admin-recipe-form" @submit.prevent="saveAccount">
            <div class="form-grid">
              <label>
                账号
                <input
                  v-model="form.username"
                  required
                  minlength="3"
                  maxlength="50"
                  autocomplete="off"
                  placeholder="例如：curry.admin"
                />
                <small>小写字母、数字、点、下划线或短横线</small>
              </label>
              <label>
                角色
                <select v-model="form.role" :disabled="isEditingCurrent">
                  <option value="admin">管理员</option>
                  <option value="super">超级管理员</option>
                </select>
                <small>{{ isEditingCurrent ? '不能修改自己的角色' : '超级管理员可管理系统设置和账号' }}</small>
              </label>
            </div>

            <div class="form-grid">
              <label>
                {{ editingId ? '新密码（可留空）' : '初始密码' }}
                <input
                  v-model="form.password"
                  :required="!editingId"
                  minlength="10"
                  maxlength="128"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="editingId ? '留空则不修改' : '至少 10 位'"
                />
              </label>
              <label>
                确认密码
                <input
                  v-model="form.confirm_password"
                  :required="Boolean(form.password)"
                  maxlength="128"
                  type="password"
                  autocomplete="new-password"
                  placeholder="再次输入密码"
                />
              </label>
            </div>

            <p v-if="editingId" class="account-password-note">
              重置密码后，该账号在其他设备上的已有登录会立即失效。
            </p>

            <label class="plan-active-field">
              <input v-model="form.is_active" type="checkbox" :disabled="isEditingCurrent" />
              启用这个后台账号
            </label>

            <p v-if="errorMessage" class="admin-alert">{{ errorMessage }}</p>

            <footer>
              <button class="admin-secondary-action" type="button" @click="closeEditor">取消</button>
              <button class="admin-primary-action" type="submit" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存账号' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>

    <AdminConfirmDialog v-bind="confirmDialog.state" @cancel="confirmDialog.cancel" @confirm="confirmDialog.accept" />
  </div>
</template>
