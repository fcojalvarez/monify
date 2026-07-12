/**
 * Abstracción de plataforma pensada para el salto futuro a Capacitor.
 *
 * Hoy distingue el tipo de dispositivo mediante las APIs del navegador.
 * Cuando se añada Capacitor, bastará con sustituir `detectPlatform()`
 * por `Capacitor.getPlatform()` sin tocar el resto de la aplicación.
 */

export type Platform = 'web' | 'ios' | 'android'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') {
    return 'web'
  }

  const ua = navigator.userAgent.toLowerCase()

  // iPadOS 13+ puede identificarse como macOS.
  const isIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1

  if (isIPad || /iphone|ipad|ipod/.test(ua)) {
    return 'ios'
  }

  if (/android/.test(ua)) {
    return 'android'
  }

  return 'web'
}

const platform = detectPlatform()

const isMobile = platform === 'ios' || platform === 'android'

const state = {
  platform,
  isWeb: platform === 'web',
  isNative: platform !== 'web',

  isDesktop: !isMobile,
  isMobile,

  isIOS: platform === 'ios',
  isAndroid: platform === 'android',
}

export function usePlatform() {
  return state
}
