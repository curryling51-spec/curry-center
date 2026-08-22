export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/admin' && !to.path.startsWith('/admin/')) return

  const { authenticated, check } = useAuth()
  if (import.meta.client && authenticated.value === true) return
  if (!(await check())) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
