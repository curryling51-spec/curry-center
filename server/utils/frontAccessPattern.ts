import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const serializePattern = (pattern: number[]) => pattern.join('-')

export const normalizeAccessPattern = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []
  const pattern = value.map(Number)
  if (
    pattern.length < 4
    || pattern.length > 9
    || pattern.some(node => !Number.isInteger(node) || node < 1 || node > 9)
    || new Set(pattern).size !== pattern.length
  ) return []
  return pattern
}

export const hashAccessPattern = (pattern: number[]): string => {
  const salt = randomBytes(16)
  const hash = scryptSync(serializePattern(pattern), salt, 32)
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export const verifyAccessPattern = (pattern: number[], storedHash: string): boolean => {
  const [algorithm, saltValue, hashValue] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false

  try {
    const salt = Buffer.from(saltValue, 'base64url')
    const expectedHash = Buffer.from(hashValue, 'base64url')
    const actualHash = scryptSync(serializePattern(pattern), salt, expectedHash.length)
    return expectedHash.length > 0 && timingSafeEqual(actualHash, expectedHash)
  } catch {
    return false
  }
}

export const normalizeAccessKey = (value: unknown): string => String(value || '').trim().toLowerCase()

export const isValidAccessKey = (value: string): boolean => /^[a-z0-9][a-z0-9_-]{1,63}$/.test(value)
