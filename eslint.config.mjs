import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    stylistic: false
  }
}).append({
  ignores: ['.nuxt/**', '.output/**', '.vercel/**', '.npm-cache/**'],
  rules: {
    'vue/html-self-closing': 'off'
  }
}, {
  files: ['layouts/**/*.vue'],
  rules: {
    'vue/no-multiple-template-root': 'off'
  }
}, {
  files: ['components/MarkdownContent.vue'],
  rules: {
    'vue/no-v-html': 'off'
  }
})
