import { randomUUID } from 'node:crypto'

const allowedTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename)

  if (!file?.data || !file.type || !allowedTypes[file.type]) {
    throw createError({ statusCode: 400, statusMessage: '请选择 JPEG、PNG、WebP 或 GIF 图片' })
  }
  if (file.data.byteLength > 5 * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: '图片不能超过 5 MB' })
  }

  const now = new Date()
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${allowedTypes[file.type]}`
  const supabase = useSupabaseServer()
  const { error } = await supabase.storage.from('knowledge-images').upload(path, file.data, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false
  })

  if (error) throw createError({ statusCode: 500, statusMessage: '图片上传失败' })
  const { data } = supabase.storage.from('knowledge-images').getPublicUrl(path)
  return { url: data.publicUrl, path }
})
