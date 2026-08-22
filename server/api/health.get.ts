export default defineEventHandler(() => {
  return {
    status: 'online',
    service: 'curry-center',
    timestamp: new Date().toISOString()
  }
})
