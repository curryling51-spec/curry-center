export default defineNuxtRouteMiddleware(async () => {
  const { user, check } = useAuth()

  if (!user.value && !(await check())) {
    return navigateTo('/login')
  }

  if (user.value?.role !== 'super') {
    return navigateTo('/admin')
  }
})
