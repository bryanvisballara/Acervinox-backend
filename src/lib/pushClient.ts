import { api } from './api'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function registerWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  const vapid = await api('/api/push/vapid')
  if (!vapid.enabled || !vapid.publicKey) return
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return
  const reg = await navigator.serviceWorker.register('/push-sw.js')
  const ready = await navigator.serviceWorker.ready
  let sub = await ready.pushManager.getSubscription()
  if (!sub) {
    sub = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
    })
  }
  const json = sub.toJSON()
  await api('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  })
  void reg
}

async function registerNativeToken(token: string, platform: string) {
  if (!token) return
  await api('/api/push/device', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  })
}

export function initPush() {
  const cap = (window as any).Capacitor
  ;(window as any).acervinoxRegisterDevice = (token: string, platform: string) => {
    registerNativeToken(token, platform === 'ios' ? 'ios' : 'android').catch(() => {})
  }
  window.addEventListener('acervinox:push-token', ((ev: CustomEvent) => {
    registerNativeToken(ev.detail?.token, ev.detail?.platform).catch(() => {})
  }) as EventListener)

  const native = cap?.Plugins?.PushNotifications
  if (native?.requestPermissions) {
    native
      .requestPermissions()
      .then(() => native.register?.())
      .catch(() => {})
    native.addListener?.('registration', (ev: { value?: string }) => {
      const platform = cap?.getPlatform?.() === 'ios' ? 'ios' : 'android'
      registerNativeToken(ev.value || '', platform).catch(() => {})
    })
    return
  }

  registerWebPush().catch(() => {})
}
