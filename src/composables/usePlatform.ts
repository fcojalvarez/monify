/**
 * Abstracción de plataforma pensada para el salto futuro a Capacitor.
 *
 * Hoy solo distingue web / móvil por el user-agent. Cuando se añada Capacitor,
 * bastará con sustituir el cuerpo por `Capacitor.getPlatform()` sin tocar el
 * resto de la app, que ya consume este composable.
 */
export type Platform = 'web' | 'ios' | 'android'

export function usePlatform() {
  const detect = (): Platform => {
    if (typeof navigator === 'undefined') return 'web'
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) return 'ios'
    if (/android/.test(ua)) return 'android'
    return 'web'
  }

  const platform = detect()

  return {
    platform,
    isWeb: platform === 'web',
    isNative: platform !== 'web',
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
  }
}
