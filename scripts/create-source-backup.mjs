import { deflateRawSync } from 'node:zlib'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(projectRoot, 'server/assets')
const archivePath = resolve(outputDirectory, 'source-backup.zip')
const metadataPath = resolve(outputDirectory, 'source-backup.json')

const ignoredDirectories = new Set([
  '.claude',
  '.git',
  '.npm-cache',
  '.nuxt',
  '.output',
  '.vercel',
  'dist',
  'node_modules'
])

const ignoredFiles = new Set([
  'server/assets/source-backup.json',
  'server/assets/source-backup.zip'
])

const shouldIgnoreFile = (path) => {
  if (ignoredFiles.has(path)) return true
  return path === '.env' || (path.startsWith('.env.') && path !== '.env.example')
}

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue

    const absolutePath = resolve(directory, entry.name)
    const archiveName = relative(projectRoot, absolutePath).replaceAll('\\', '/')

    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath))
    } else if (entry.isFile() && !shouldIgnoreFile(archiveName)) {
      files.push({ absolutePath, archiveName })
    }
  }

  return files
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  }
  return value >>> 0
})

const crc32 = (data) => {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const toDosDateTime = (date) => {
  const year = Math.max(1980, date.getFullYear())
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  }
}

const createZip = async (files) => {
  const localParts = []
  const centralParts = []
  let offset = 0
  let uncompressedSize = 0
  const generatedAt = new Date()
  const dos = toDosDateTime(generatedAt)

  for (const file of files) {
    const data = await readFile(file.absolutePath)
    const compressed = deflateRawSync(data, { level: 9 })
    const useCompression = compressed.length < data.length
    const body = useCompression ? compressed : data
    const method = useCompression ? 8 : 0
    const name = Buffer.from(file.archiveName, 'utf8')
    const checksum = crc32(data)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(method, 8)
    localHeader.writeUInt16LE(dos.time, 10)
    localHeader.writeUInt16LE(dos.date, 12)
    localHeader.writeUInt32LE(checksum, 14)
    localHeader.writeUInt32LE(body.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(name.length, 26)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(method, 10)
    centralHeader.writeUInt16LE(dos.time, 12)
    centralHeader.writeUInt16LE(dos.date, 14)
    centralHeader.writeUInt32LE(checksum, 16)
    centralHeader.writeUInt32LE(body.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(name.length, 28)
    centralHeader.writeUInt32LE(offset, 42)

    localParts.push(localHeader, name, body)
    centralParts.push(centralHeader, name)
    offset += localHeader.length + name.length + body.length
    uncompressedSize += data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(0x06054b50, 0)
  endRecord.writeUInt16LE(files.length, 8)
  endRecord.writeUInt16LE(files.length, 10)
  endRecord.writeUInt32LE(centralDirectory.length, 12)
  endRecord.writeUInt32LE(offset, 16)

  return {
    archive: Buffer.concat([...localParts, centralDirectory, endRecord]),
    generatedAt: generatedAt.toISOString(),
    uncompressedSize
  }
}

const files = (await collectFiles(projectRoot))
  .sort((first, second) => first.archiveName.localeCompare(second.archiveName))

if (files.length > 0xffff) throw new Error('源码文件数量超过 ZIP 格式限制')

const result = await createZip(files)
await mkdir(outputDirectory, { recursive: true })
await writeFile(archivePath, result.archive)
await writeFile(metadataPath, `${JSON.stringify({
  generatedAt: result.generatedAt,
  fileCount: files.length,
  archiveSize: result.archive.length,
  uncompressedSize: result.uncompressedSize
}, null, 2)}\n`)

console.log(`源码备份已生成：${files.length} 个文件，${(result.archive.length / 1024 / 1024).toFixed(2)} MB`)
