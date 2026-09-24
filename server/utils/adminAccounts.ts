export type AdminAccountRole = 'super' | 'admin'

export const normalizeAdminUsername = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase()

export const isValidAdminUsername = (username: string): boolean =>
  username.length >= 3
  && username.length <= 50
  && /^[a-z0-9._-]+$/.test(username)

export const parseAdminRole = (value: unknown): AdminAccountRole | null =>
  value === 'super' || value === 'admin' ? value : null

export const isValidAdminPassword = (password: string): boolean =>
  password.length >= 10 && password.length <= 128

export const validateAdminUsername = (username: string): void => {
  if (!isValidAdminUsername(username)) {
    throw createError({
      statusCode: 400,
      statusMessage: '账号需为 3 至 50 位，只能使用小写字母、数字、点、下划线或短横线'
    })
  }
}

export const validateAdminPassword = (password: string): void => {
  if (!isValidAdminPassword(password)) {
    throw createError({ statusCode: 400, statusMessage: '密码长度需为 10 至 128 位' })
  }
}
