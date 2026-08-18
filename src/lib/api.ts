export async function api(path, options = {}) {
  const base = import.meta.env.VITE_API_URL || ''
  const res = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Error de servidor')
  }
  return data
}
