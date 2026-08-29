export function appUrl(req) {
  const fromEnv = String(process.env.APP_ORIGIN || process.env.CLIENT_ORIGIN || '').replace(/\/$/, '')
  if (fromEnv && !/localhost|127\.0\.0\.1/.test(fromEnv)) return fromEnv
  if (process.env.NODE_ENV === 'production') return 'https://acervinox.com'
  const host = req?.get?.('host')
  if (host) return `${req.protocol || 'https'}://${host}`
  return 'http://127.0.0.1:5173'
}
