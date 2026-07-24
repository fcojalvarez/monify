import { Capacitor } from '@capacitor/core'

/**
 * Realiza un diagnóstico detallado del estado de soporte y permisos de las notificaciones en el dispositivo.
 */
export function diagnoseNotifications() {
  const isNative = Capacitor.isNativePlatform()
  const hasNotificationAPI = typeof window !== 'undefined' && 'Notification' in window
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext ?? false) : false
  const webPermission = hasNotificationAPI ? Notification.permission : 'not_supported'
  const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator

  return {
    isNative,
    hasNotificationAPI,
    isSecure,
    webPermission,
    hasServiceWorker,
  }
}

/**
 * Solicita explícitamente permisos de notificación al usuario.
 * @returns Promesa que se resuelve con true si se otorgó el permiso, o false en caso contrario.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const status = await LocalNotifications.requestPermissions()
      return status.display === 'granted'
    } catch (e) {
      console.error('Error al solicitar permisos de notificación en Capacitor:', e)
      return false
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (e) {
      console.error('Error al solicitar permisos de notificación en la Web:', e)
      return false
    }
  }

  return false
}

/**
 * Envía una notificación local con el título y cuerpo indicados.
 * En móviles nativos utiliza el plugin de Capacitor; en navegadores web recurre a la Notification API HTML5.
 * En entornos web móviles y PWAs (especialmente iOS Safari PWA), prioriza mostrar la notificación a través del Service Worker activo.
 * @param title Título de la notificación.
 * @param body Detalles o cuerpo de la notificación.
 * @returns Promesa con un booleano indicando si la notificación se pudo emitir/enviar.
 */
export async function sendNotification(title: string, body: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')

      // Comprobar y solicitar permisos si es necesario
      const check = await LocalNotifications.checkPermissions()
      if (check.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions()
        if (req.display !== 'granted') {
          console.warn('Permisos de notificaciones no concedidos en la plataforma nativa.')
          return false
        }
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 1000000),
            actionTypeId: 'OPEN_ACTION',
            extra: null,
          },
        ],
      })
      return true
    } catch (e) {
      console.error('Error al programar notificación local nativa:', e)
      return false
    }
  }

  // Web fallback (Notification API estándar)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    // Diagnóstico de contexto seguro (HTTP vs HTTPS/localhost)
    if (!window.isSecureContext) {
      throw new Error(
        'Las notificaciones web están bloqueadas por el navegador debido a un contexto inseguro (HTTP). Para recibir notificaciones en tu móvil, accede usando HTTPS o desde localhost.'
      )
    }

    const isGranted = Notification.permission === 'granted'
    const permission = isGranted ? 'granted' : await Notification.requestPermission()

    if (permission === 'granted') {
      try {
        // En navegadores móviles y PWAs (especialmente iOS Safari PWA instalado),
        // el constructor "new Notification" tradicional no funciona o es bloqueado.
        // La forma correcta es lanzar la notificación a través del Service Worker registrado.
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg) {
            await reg.showNotification(title, { body })
            return true
          }
        }

        // Fallback al constructor clásico si no hay un Service Worker activo/listo
        new Notification(title, { body })
        return true
      } catch (e) {
        console.error('Error al instanciar la notificación web:', e)
        // Intentamos fallback directo por si acaso falló el service worker
        try {
          new Notification(title, { body })
          return true
        } catch (innerErr) {
          console.error('Fallback de notificación clásica fallido:', innerErr)
        }
      }
    } else {
      throw new Error(
        `Permiso de notificaciones denegado en el navegador (estado actual: "${Notification.permission}"). Revisa los ajustes de sitio de Chrome para activar las notificaciones.`
      )
    }
  } else {
    throw new Error('Las notificaciones no son soportadas por este navegador.')
  }

  return false
}
