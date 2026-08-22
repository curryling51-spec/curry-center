type SourceBackupMetadata = {
  generatedAt: string
  fileCount: number
  archiveSize: number
  uncompressedSize: number
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['super'])
  setResponseHeader(event, 'cache-control', 'private, no-store')

  const metadata = await useStorage('assets:server')
    .getItem<SourceBackupMetadata>('source-backup.json')

  if (!metadata) {
    throw createError({ statusCode: 404, statusMessage: '源码备份尚未生成，请先重新发布项目' })
  }

  return metadata
})
