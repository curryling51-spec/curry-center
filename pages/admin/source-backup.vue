<script setup lang="ts">
import { Archive, Download, LockKeyhole } from '@lucide/vue'

type SourceBackupMetadata = {
  generatedAt: string
  fileCount: number
  archiveSize: number
  uncompressedSize: number
}

definePageMeta({ layout: 'admin', middleware: 'super-admin' })
useHead({ title: '源码备份 - Curry 中心' })

const { data: backup, error, status, refresh } = await useFetch<SourceBackupMetadata>('/api/admin/source-backup')

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const formatDate = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'long',
  timeStyle: 'short'
}).format(new Date(value))
</script>

<template>
  <div>
    <section class="admin-page-heading">
      <div>
        <h2>源码备份</h2>
        <p>下载最近一次正式发布时生成的项目源码</p>
      </div>
    </section>

    <p v-if="error" class="admin-alert">{{ error.statusMessage || '源码备份信息读取失败。' }}</p>

    <section class="admin-panel source-backup-panel">
      <div class="source-backup-icon"><Archive :size="28" aria-hidden="true" /></div>
      <div class="source-backup-copy">
        <h3>项目源码 ZIP</h3>
        <template v-if="backup">
          <p>生成于 {{ formatDate(backup.generatedAt) }}</p>
          <dl>
            <div><dt>文件数量</dt><dd>{{ backup.fileCount }}</dd></div>
            <div><dt>压缩包大小</dt><dd>{{ formatSize(backup.archiveSize) }}</dd></div>
            <div><dt>源码原始大小</dt><dd>{{ formatSize(backup.uncompressedSize) }}</dd></div>
          </dl>
        </template>
        <p v-else-if="status === 'pending'">正在读取备份信息...</p>
        <p v-else>当前没有可下载的源码备份</p>
      </div>
      <div class="source-backup-actions">
        <a v-if="backup" class="admin-primary-action" href="/api/admin/source-backup/download">
          <Download :size="17" aria-hidden="true" />
          下载备份
        </a>
        <button v-else class="admin-secondary-action" type="button" :disabled="status === 'pending'" @click="refresh()">重新读取</button>
      </div>
      <footer>
        <LockKeyhole :size="16" aria-hidden="true" />
        仅超级管理员可以下载；压缩包不包含环境变量、依赖、构建产物和 Git 历史。
      </footer>
    </section>
  </div>
</template>
