function splitOrigins(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

export function corsOrigin() {
  const allowed = new Set([
    ...splitOrigins(process.env.CLIENT_ORIGIN),
    ...splitOrigins(process.env.CLIENT_ORIGINS),
    ...splitOrigins(process.env.APP_ORIGIN),
    'https://acervinox.com',
    'https://www.acervinox.com',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'capacitor://localhost',
    'ionic://localhost',
  ])

  return (origin, callback) => {
    if (!origin || allowed.has(origin)) return callback(null, true)
    return callback(null, false)
  }
}
