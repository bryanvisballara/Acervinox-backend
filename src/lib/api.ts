const TOKEN_KEY = 'acervinox_token'

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export async function api(path: string, options: RequestInit = {}) {
  const base = import.meta.env.VITE_API_URL || ''
  const token = getToken()
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Error de servidor') as Error & { payload?: unknown }
    err.payload = data
    throw err
  }
  return data
}

export function openPrintWindow() {
  const win = window.open('', 'acervinox-quote')
  if (win) {
    win.document.open()
    win.document.write(
      '<!doctype html><title>Cotización</title><p style="font-family:Arial,sans-serif;padding:28px;color:#555">Generando cotización…</p>',
    )
    win.document.close()
  }
  return win
}

export async function openPrintHtml(path: string, preview?: Window | null) {
  const base = import.meta.env.VITE_API_URL || ''
  const token = getToken()
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const html = await res.text()
  if (!res.ok) {
    preview?.close()
    throw new Error('No se pudo generar el PDF')
  }

  const printable = html.includes('</body>')
    ? html.replace(
        '</body>',
        `<script>
          window.addEventListener('load', function () {
            setTimeout(function () { window.focus(); window.print(); }, 250);
          });
        </script></body>`,
      )
    : html

  const blob = new Blob([printable], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  if (preview && !preview.closed) {
    preview.location.replace(url)
    preview.focus()
  } else {
    const target = window.open(url, 'acervinox-quote')
    if (!target) {
      URL.revokeObjectURL(url)
      throw new Error('Permite ventanas emergentes para imprimir o guardar el PDF')
    }
    target.focus()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120000)
}
