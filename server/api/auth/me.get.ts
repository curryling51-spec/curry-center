export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) {
    return { authenticated: false, user: null }
  }

  return {
    authenticated: true,
    user: {
      id: user.userId,
      username: user.username,
      role: user.role
    }
  }
})
