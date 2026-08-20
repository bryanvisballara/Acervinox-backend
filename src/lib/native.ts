import { Capacitor } from '@capacitor/core'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function appHomePath() {
  return isNativeApp() ? '/login' : '/'
}
