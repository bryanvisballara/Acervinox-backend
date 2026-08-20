import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

async function webPush() {
  const pub = String(process.env.VAPID_PUBLIC_KEY || '').trim()
  const priv = String(process.env.VAPID_PRIVATE_KEY || '').trim()
  if (!pub || !priv) return null
  const mod = await import('web-push')
  const webpush = mod.default || mod
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@acervinox.com', pub, priv)
  return webpush
}

export function vapidPublicKey() {
  return String(process.env.VAPID_PUBLIC_KEY || '').trim()
}

function firebaseCreds() {
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim()
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim()
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim()
  let privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '')
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey.includes('BEGIN PRIVATE KEY')) return null
  return { project_id: projectId, client_email: clientEmail, private_key: privateKey }
}

let cachedAccess = { token: '', exp: 0 }

async function firebaseAccessToken() {
  const creds = firebaseCreds()
  if (!creds) return ''
  if (cachedAccess.token && Date.now() < cachedAccess.exp - 60_000) return cachedAccess.token
  const now = Math.floor(Date.now() / 1000)
  const assertion = jwt.sign(
    {
      iss: creds.client_email,
      sub: creds.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    },
    creds.private_key,
    { algorithm: 'RS256' },
  )
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || 'No se pudo autenticar Firebase')
  }
  cachedAccess = {
    token: data.access_token,
    exp: Date.now() + Number(data.expires_in || 3600) * 1000,
  }
  return cachedAccess.token
}

export async function sendToUsers(userIds, payload) {
  if (!userIds?.length) return
  const users = await User.find({ _id: { $in: userIds } }).select('pushSubs')
  const webpush = await webPush()
  const body = JSON.stringify({
    title: payload.title || 'acervinox',
    body: payload.body || '',
    url: payload.url || '/portal',
  })

  for (const user of users) {
    const subs = Array.isArray(user.pushSubs) ? user.pushSubs : []
    const next = []
    for (const sub of subs) {
      let keep = true
      try {
        if (sub.endpoint && sub.p256dh && sub.auth && webpush) {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          )
        } else if (sub.token) {
          await sendFcm(sub.token, payload)
        }
      } catch (err) {
        const status = err?.statusCode || err?.status
        if (status === 404 || status === 410) keep = false
        else console.error('push send', err?.message || err)
      }
      if (keep) next.push(sub)
    }
    if (next.length !== subs.length) {
      user.pushSubs = next
      await user.save()
    }
  }
}

async function sendFcm(token, payload) {
  const creds = firebaseCreds()
  if (creds) {
    const access = await firebaseAccessToken()
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${creds.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: payload.title || 'acervinox',
              body: payload.body || '',
            },
            data: { url: String(payload.url || '/portal') },
            android: { priority: 'HIGH' },
            apns: {
              payload: {
                aps: { sound: 'default', badge: 1 },
              },
            },
          },
        }),
      },
    )
    if (!res.ok) {
      const text = await res.text()
      const err = new Error(text || 'FCM error')
      err.status = res.status
      throw err
    }
    return
  }

  const key = String(process.env.FCM_SERVER_KEY || '').trim()
  if (!key) return
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: payload.title || 'acervinox',
        body: payload.body || '',
      },
      data: { url: String(payload.url || '/portal') },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(text || 'FCM error')
    err.status = res.status
    throw err
  }
}

export async function notifyProductAudience(product, payload) {
  try {
    const email = String(product.client?.email || '').toLowerCase()
    const tracking = product.tracking
    const users = await User.find({
      $or: [
        { role: 'admin' },
        ...(email ? [{ email }] : []),
        ...(tracking ? [{ savedTrackings: tracking }] : []),
      ],
    }).select('_id')
    await sendToUsers(
      users.map((u) => u._id),
      payload,
    )
  } catch (err) {
    console.error('notify product', err)
  }
}
