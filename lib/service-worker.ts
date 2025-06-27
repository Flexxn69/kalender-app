// Service Worker für Offline-Funktionalität
const CACHE_NAME = "calendar-app-v1"
const STATIC_CACHE = "static-v1"
const DYNAMIC_CACHE = "dynamic-v1"

const STATIC_FILES = [
  "/",
  "/calendar",
  "/messages",
  "/contacts",
  "/settings",
  "/manifest.json",
  // Weitere statische Ressourcen
]

// Installation
self.addEventListener("install", (event: any) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_FILES)
    }),
  )
})

// Aktivierung
self.addEventListener("activate", (event: any) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})

// Fetch-Events abfangen
self.addEventListener("fetch", (event: any) => {
  // Nur GET-Requests cachen
  if (event.request.method !== "GET") return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          // Nur erfolgreiche Responses cachen
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback für Offline-Modus
          if (event.request.destination === "document") {
            return caches.match("/")
          }
        })
    }),
  )
})

// Background Sync
self.addEventListener("sync", (event: any) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // Hier würde die Synchronisation mit dem Server stattfinden
      syncData(),
    )
  }
})

async function syncData() {
  // Implementierung der Datensynchronisation
  console.log("Background sync triggered")
}

// Push Notifications
self.addEventListener("push", (event: any) => {
  const options = {
    body: event.data?.text() || "Neue Benachrichtigung",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Öffnen",
        icon: "/icon-192x192.png",
      },
      {
        action: "close",
        title: "Schließen",
        icon: "/icon-192x192.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("Calendar App", options))
})

// Notification Click
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close()

  if (event.action === "explore") {
    event.waitUntil(self.clients.openWindow("/"))
  }
})
