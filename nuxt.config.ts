export default defineNuxtConfig({
  compatibilityDate: '2026-08-07',
  app: {
    head: {
      link: [{ rel: 'icon', href: '/favicon.ico' }]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },
  devServer: {
    port: 9830
  },
  css: ['@vuepic/vue-datepicker/dist/main.css', '~/assets/css/main.css'],
  build: {
    transpile: ['@vuepic/vue-datepicker']
  },
  devtools: { enabled: true },
  runtimeConfig: {
    supabaseSecretKey: '',
    sessionSecret: '',
    public: {
      supabaseUrl: ''
    }
  },
  nitro: {
    preset: 'vercel'
  }
})
