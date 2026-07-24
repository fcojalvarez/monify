// Service Worker básico para soporte de notificaciones locales y push en PWA

self.addEventListener('install', (event) => {
  // Activar inmediatamente sin esperar a recargar la página
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let title = 'Monify'
  let options = {
    body: '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
  }

  if (event.data) {
    try {
      const data = event.data.json()
      title = data.title || title
      options = {
        ...options,
        ...data.options,
      }
    } catch (e) {
      options.body = event.data.text()
    }
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Enfocar ventana de la app si está abierta o abrir una nueva
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})
