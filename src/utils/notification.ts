import { Capacitor } from '@capacitor/core'

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
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body })
        return true
      } catch (e) {
        console.error('Error al instanciar la notificación web estándar:', e)
      }
    } else if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          new Notification(title, { body })
          return true
        }
      } catch (e) {
        console.error('Error al solicitar permisos e instanciar notificación web:', e)
      }
    } else {
      console.warn('El permiso de notificaciones de navegador está denegado.')
    }
  } else {
    console.log('Notificaciones de navegador no soportadas. Fallback de consola:', title, '-', body)
  }

  return false
}
