type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' ? value as UnknownRecord : null

export const getErrorDetails = (error: unknown): UnknownRecord => {
  const payload = asRecord(asRecord(error)?.data)
  return asRecord(payload?.data) || payload || {}
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const source = asRecord(error)
  const payload = asRecord(source?.data)
  const message = payload?.statusMessage ?? source?.statusMessage
  return typeof message === 'string' && message ? message : fallback
}
