export default defineNuxtRouteMiddleware(async (to) => {
  const accessKey = typeof to.meta.frontAccessKey === 'string' ? to.meta.frontAccessKey : ''
  if (!accessKey) return navigateTo('/')

  const verifiedRules = useState<Record<string, boolean>>('front-access:verified', () => ({}))
  if (import.meta.client && verifiedRules.value[accessKey]) return

  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const result = await $fetch<{ verified: boolean }>('/api/access/status', {
      headers,
      query: { key: accessKey }
    })
    if (result.verified) {
      verifiedRules.value = { ...verifiedRules.value, [accessKey]: true }
      return
    }
  } catch {
    // The verification page handles unavailable or invalid access state.
  }

  return navigateTo({ path: '/access', query: { key: accessKey, redirect: to.fullPath } })
})
