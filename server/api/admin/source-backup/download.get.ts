export default defineEventHandler(async (event) => {
  await requireRole(event, ['super'])

  const storage = useStorage('assets:server')
  const [archive, metadata] = await Promise.all([
    storage.getItemRaw<Uint8Array>('source-backup.zip'),
    storage.getItem<{ generatedAt?: string }>('source-backup.json')
  ])

  if (!archive) {
    throw createError({ statusCode: 404, statusMessage: '源码备份尚未生成，请先重新发布项目' })
  }

  const date = metadata?.generatedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  setResponseHeaders(event, {
    'cache-control': 'private, no-store',
    'content-disposition': `attachment; filename="curry-center-source-${date}.zip"`,
    'content-length': archive.byteLength,
    'content-type': 'application/zip',
    'x-content-type-options': 'nosniff'
  })

  return archive
})
