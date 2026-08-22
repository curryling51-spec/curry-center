<script setup lang="ts">
const route = useRoute()
const { check, login } = useAuth()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

useHead({
  title: '登录后台 - Curry 中心'
})

const destination = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect.startsWith('/admin') ? redirect : '/admin'
})

const submit = async () => {
  if (!username.value.trim() || !password.value || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await login(username.value, password.value)
    await navigateTo(destination.value)
  } catch {
    errorMessage.value = '账号或密码错误，请重新输入。'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  if (await check()) {
    await navigateTo(destination.value)
  }
})
</script>

<template>
  <main class="subpage">
    <NuxtLink class="back-link" to="/">返回首页</NuxtLink>
    <h1>登录后台</h1>
    <p>使用管理员账号进入 Curry 中心后台。</p>

    <form class="recipe-form login-form" @submit.prevent="submit">
      <label>
        账号
        <input
          v-model="username"
          type="text"
          autocomplete="username"
          placeholder="请输入账号"
          autofocus
          required
        />
      </label>

      <label>
        密码
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="请输入密码"
          required
        />
      </label>

      <div class="form-actions">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? '登录中...' : '登录' }}
        </button>
      </div>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
    </form>
  </main>
</template>
