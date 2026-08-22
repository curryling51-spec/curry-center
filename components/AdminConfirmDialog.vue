<script setup lang="ts">
import { AlertTriangle, X } from '@lucide/vue'
import type { AdminConfirmTone } from '~/composables/useAdminConfirm'

defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  tone: AdminConfirmTone
  busy: boolean
}>()

defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-confirm">
      <div v-if="open" class="admin-modal-backdrop admin-confirm-backdrop">
        <section class="admin-confirm-dialog" role="alertdialog" aria-modal="true" :aria-labelledby="'admin-confirm-title'" :aria-describedby="'admin-confirm-message'">
          <button class="admin-confirm-close" type="button" aria-label="关闭" title="关闭" :disabled="busy" @click="$emit('cancel')">
            <X :size="18" aria-hidden="true" />
          </button>
          <span class="admin-confirm-icon" :class="tone" aria-hidden="true">
            <AlertTriangle :size="22" />
          </span>
          <div class="admin-confirm-copy">
            <h2 id="admin-confirm-title">{{ title }}</h2>
            <p id="admin-confirm-message">{{ message }}</p>
          </div>
          <footer>
            <button class="admin-secondary-action" type="button" :disabled="busy" @click="$emit('cancel')">取消</button>
            <button class="admin-confirm-action" :class="tone" type="button" :disabled="busy" @click="$emit('confirm')">
              {{ busy ? '处理中...' : confirmLabel }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
