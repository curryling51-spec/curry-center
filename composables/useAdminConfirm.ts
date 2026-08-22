export type AdminConfirmTone = 'primary' | 'danger'

type AdminConfirmOptions = {
  title: string
  message: string
  confirmLabel: string
  tone?: AdminConfirmTone
}

export const useAdminConfirm = () => {
  const state = reactive({
    open: false,
    title: '',
    message: '',
    confirmLabel: '确认',
    tone: 'primary' as AdminConfirmTone,
    busy: false
  })

  let action: (() => Promise<void>) | null = null

  const request = (options: AdminConfirmOptions, callback: () => Promise<void>) => {
    Object.assign(state, options, {
      open: true,
      tone: options.tone || 'primary',
      busy: false
    })
    action = callback
  }

  const cancel = () => {
    if (state.busy) return
    state.open = false
    action = null
  }

  const accept = async () => {
    if (!action || state.busy) return
    state.busy = true
    try {
      await action()
      state.open = false
      action = null
    } finally {
      state.busy = false
    }
  }

  return { state, request, cancel, accept }
}
