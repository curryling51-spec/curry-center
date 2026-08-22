<script setup lang="ts">
type Recipe = {
  id: string
  name: string
  calories: string
  ingredients: string
  link: string
  created_at: string
  updated_at: string
}

definePageMeta({ layout: 'admin' })
useHead({ title: '菜谱管理 - Curry 中心' })

const emptyForm = {
  name: '',
  calories: '',
  ingredients: '',
  link: ''
}

const recipes = ref<Recipe[]>([])
const form = reactive({ ...emptyForm })
const editingId = ref<string | null>(null)
const searchKeyword = ref('')
const isLoading = ref(true)
const isSaving = ref(false)
const isEditorOpen = ref(false)
const errorMessage = ref('')
const confirmDialog = useAdminConfirm()

const filteredRecipes = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return recipes.value
  return recipes.value.filter(recipe =>
    [recipe.name, recipe.ingredients].some(value => value.toLowerCase().includes(keyword))
  )
})

const editorTitle = computed(() => editingId.value ? '编辑菜谱' : '新增菜谱')

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value))
}

const formatCalories = (value: string) => {
  const content = value.trim()
  if (!content) return '—'
  const number = content.match(/\d+(?:\.\d+)?/)?.[0]
  return `${number || content} kcal`
}

const getRecipeSourceUrl = (value: string) => {
  const matchedUrl = value.match(/https?:\/\/\S+/i)?.[0] || ''
  return matchedUrl.replace(/[，。；、）)\]}>'"]+$/g, '')
}

const loadRecipes = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    recipes.value = await $fetch<Recipe[]>('/api/recipes')
  } catch {
    errorMessage.value = '菜谱读取失败，请稍后重试。'
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

const openEdit = (recipe: Recipe) => {
  editingId.value = recipe.id
  Object.assign(form, {
    name: recipe.name,
    calories: recipe.calories,
    ingredients: recipe.ingredients,
    link: recipe.link
  })
  errorMessage.value = ''
  isEditorOpen.value = true
}

const closeEditor = () => {
  if (isSaving.value) return
  isEditorOpen.value = false
}

const submitRecipe = async () => {
  if (!form.name.trim() || isSaving.value) return

  const payload = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, value.trim()])
  )

  isSaving.value = true
  errorMessage.value = ''

  try {
    if (editingId.value) {
      await $fetch(`/api/recipes/${editingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/recipes', { method: 'POST', body: payload })
    }
    await loadRecipes()
    isEditorOpen.value = false
  } catch {
    errorMessage.value = '菜谱保存失败，请检查内容后重试。'
  } finally {
    isSaving.value = false
  }
}

const deleteRecipe = async (recipe: Recipe) => {
  confirmDialog.request({
    title: '删除菜谱',
    message: `确定删除“${recipe.name}”吗？删除后无法恢复。`,
    confirmLabel: '删除菜谱',
    tone: 'danger'
  }, async () => {
    errorMessage.value = ''
    try {
      await $fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
      await loadRecipes()
    } catch {
      errorMessage.value = '菜谱删除失败，请稍后重试。'
    }
  })
}

onMounted(loadRecipes)
</script>

<template>
  <div>
    <section class="admin-page-heading">
      <div>
        <h2>菜谱管理</h2>
        <p>共 {{ recipes.length }} 道菜谱</p>
      </div>
      <button class="admin-primary-action" type="button" @click="openCreate">新增菜谱</button>
    </section>

    <p v-if="errorMessage && !isEditorOpen" class="admin-alert">{{ errorMessage }}</p>

    <section class="admin-panel recipe-management">
      <div class="recipe-toolbar">
        <label class="recipe-search">
          <span>搜索</span>
          <input v-model="searchKeyword" type="search" placeholder="菜名或食材" />
        </label>
        <span>{{ filteredRecipes.length }} 条记录</span>
      </div>

      <LoadingSkeleton v-if="isLoading" variant="table" :count="5" label="正在加载菜谱" />
      <div v-else-if="!filteredRecipes.length" class="admin-empty">
        {{ searchKeyword ? '没有找到相关菜谱' : '还没有菜谱记录' }}
      </div>

      <div v-else class="recipe-table-wrap">
        <table class="recipe-table">
          <thead>
            <tr>
              <th>菜名</th>
              <th>能量 / 100g</th>
              <th>主要食材</th>
              <th>更新时间</th>
              <th><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="recipe in filteredRecipes" :key="recipe.id">
              <td data-label="菜名">
                <strong>{{ recipe.name }}</strong>
                <a v-if="getRecipeSourceUrl(recipe.link)" :href="getRecipeSourceUrl(recipe.link)" target="_blank" rel="noreferrer">查看做法</a>
                <span v-else-if="recipe.link" class="recipe-source-text" :title="recipe.link">{{ recipe.link }}</span>
              </td>
              <td data-label="能量 / 100g">{{ formatCalories(recipe.calories) }}</td>
              <td data-label="主要食材" class="recipe-ingredients">{{ recipe.ingredients || '—' }}</td>
              <td data-label="更新时间">{{ formatDate(recipe.updated_at) }}</td>
              <td class="recipe-row-actions">
                <button type="button" @click="openEdit(recipe)">编辑</button>
                <button class="danger" type="button" @click="deleteRecipe(recipe)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isEditorOpen" class="admin-modal-backdrop" @click.self="closeEditor">
        <section class="admin-modal" role="dialog" aria-modal="true" :aria-label="editorTitle">
          <header>
            <div>
              <p>菜谱资料</p>
              <h2>{{ editorTitle }}</h2>
            </div>
            <button type="button" aria-label="关闭" title="关闭" @click="closeEditor">×</button>
          </header>

          <form class="admin-recipe-form" @submit.prevent="submitRecipe">
            <div class="form-grid">
              <label>
                菜名
                <input v-model="form.name" required placeholder="例如：番茄炒蛋" />
              </label>
              <label>
                每 100g 能量（kcal）
                <input v-model="form.calories" inputmode="decimal" placeholder="例如：150" />
              </label>
            </div>

            <label>
              做法来源 / 分享内容
              <textarea v-model="form.link" rows="3" placeholder="可粘贴网页链接，或抖音、小红书等平台的完整分享内容" />
            </label>
            <label>
              需要的食材
              <textarea v-model="form.ingredients" rows="4" placeholder="番茄、鸡蛋、葱、盐、油" />
            </label>

            <p v-if="errorMessage" class="admin-alert">{{ errorMessage }}</p>

            <footer>
              <button class="admin-secondary-action" type="button" @click="closeEditor">取消</button>
              <button class="admin-primary-action" type="submit" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存菜谱' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
    <AdminConfirmDialog v-bind="confirmDialog.state" @cancel="confirmDialog.cancel" @confirm="confirmDialog.accept" />
  </div>
</template>
