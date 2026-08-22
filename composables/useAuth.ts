type AuthUser = {
  id: string
  username: string
  role: 'super' | 'admin'
}

type AuthResponse = {
  authenticated: boolean
  user: AuthUser | null
}

export const useAuth = () => {
  const authenticated = useState<boolean | null>('auth:authenticated', () => null)
  const user = useState<AuthUser | null>('auth:user', () => null)

  const check = async (): Promise<boolean> => {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const response = await $fetch<AuthResponse>('/api/auth/me', { headers })
      authenticated.value = response.authenticated
      user.value = response.user
    } catch {
      authenticated.value = false
      user.value = null
    }

    return authenticated.value === true
  }

  const login = async (username: string, password: string): Promise<void> => {
    const response = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    })
    authenticated.value = true
    user.value = response.user
  }

  const logout = async (): Promise<void> => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    authenticated.value = false
    user.value = null
  }

  return { authenticated, user, check, login, logout }
}
