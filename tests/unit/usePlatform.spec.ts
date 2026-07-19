import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('usePlatform', () => {
  let originalUserAgent: string
  let originalVendor: string
  let originalMaxTouchPoints: number | undefined

  beforeEach(() => {
    vi.resetModules()
    originalUserAgent = window.navigator.userAgent
    originalVendor = window.navigator.vendor
    originalMaxTouchPoints = window.navigator.maxTouchPoints
  })

  const setNavigator = (ua: string, vendor = '', maxTouchPoints = 0) => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: ua,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window.navigator, 'vendor', {
      value: vendor,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      value: maxTouchPoints,
      configurable: true,
      writable: true,
    })
  }

  it('detecta entorno web/escritorio por defecto', async () => {
    setNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    const { usePlatform } = await import('@/composables/usePlatform')
    const platform = usePlatform()

    expect(platform.platform).toBe('web')
    expect(platform.isWeb).toBe(true)
    expect(platform.isDesktop).toBe(true)
    expect(platform.isMobile).toBe(false)
    expect(platform.isIOS).toBe(false)
    expect(platform.isAndroid).toBe(false)
  })

  it('detecta iOS para iPhone', async () => {
    setNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')
    const { usePlatform } = await import('@/composables/usePlatform')
    const platform = usePlatform()

    expect(platform.platform).toBe('ios')
    expect(platform.isIOS).toBe(true)
    expect(platform.isMobile).toBe(true)
    expect(platform.isDesktop).toBe(false)
    expect(platform.isAndroid).toBe(false)
  })

  it('detecta Android para teléfonos Android', async () => {
    setNavigator('Mozilla/5.0 (Linux; Android 10; SM-G960F)')
    const { usePlatform } = await import('@/composables/usePlatform')
    const platform = usePlatform()

    expect(platform.platform).toBe('android')
    expect(platform.isAndroid).toBe(true)
    expect(platform.isMobile).toBe(true)
    expect(platform.isDesktop).toBe(false)
    expect(platform.isIOS).toBe(false)
  })

  it('detecta iOS para iPad con soporte multitáctil (Safari iPadOS)', async () => {
    setNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'Apple Computer, Inc.', 5)
    const { usePlatform } = await import('@/composables/usePlatform')
    const platform = usePlatform()

    expect(platform.platform).toBe('ios')
    expect(platform.isIOS).toBe(true)
    expect(platform.isMobile).toBe(true)
  })
})
