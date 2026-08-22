import { scryptSync, timingSafeEqual } from 'node:crypto'

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
