import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export const verifyPassword = (password: string, storedHash: string): boolean => {
  const [algorithm, saltValue, hashValue] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false

  try {
    const salt = Buffer.from(saltValue, 'base64url')
    const expectedHash = Buffer.from(hashValue, 'base64url')
    const actualHash = scryptSync(password, salt, expectedHash.length)

    return expectedHash.length > 0 && timingSafeEqual(actualHash, expectedHash)
  } catch {
    return false
  }
}
