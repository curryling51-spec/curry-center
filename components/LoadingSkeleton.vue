<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'list' | 'cards' | 'table'
  count?: number
  label?: string
}>(), {
  variant: 'list',
  count: 4,
  label: '正在加载内容'
})
</script>

<template>
  <div class="loading-skeleton" :class="`loading-skeleton-${variant}`" role="status" :aria-label="label">
    <div v-for="index in count" :key="index" class="loading-skeleton-item" aria-hidden="true">
      <span class="content-skeleton loading-skeleton-mark" />
      <div>
        <span class="content-skeleton loading-skeleton-title" />
        <span class="content-skeleton loading-skeleton-line" />
      </div>
      <span class="content-skeleton loading-skeleton-action" />
    </div>
  </div>
</template>
