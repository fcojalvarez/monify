import { Capacitor } from '@capacitor/core'

export type Platform = 'web' | 'ios' | 'android'

function detectPlatform(): Platform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'web'
  }

  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform()
    if (platform === 'ios' || platform === 'android') {
      return platform
    }
  }

  const ua = navigator.userAgent.toLowerCase()

  const isAppleTouch =
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 1 &&
    (/macintosh/.test(ua) || (navigator.vendor && /apple/.test(navigator.vendor.toLowerCase())))

  if (isAppleTouch || /iphone|ipad|ipod/.test(ua)) {
    return 'ios'
  }

  if (/android/.test(ua)) {
    return 'android'
  }

  return 'web'
}

const currentPlatform = detectPlatform()
const isMobileDevice = currentPlatform === 'ios' || currentPlatform === 'android'

const state = Object.freeze({
  platform: currentPlatform,
  isWeb: currentPlatform === 'web',
  isNative: currentPlatform !== 'web',

  isDesktop: !isMobileDevice,
  isMobile: isMobileDevice,

  isIOS: currentPlatform === 'ios',
  isAndroid: currentPlatform === 'android',
})

export function usePlatform() {
  return state
}
