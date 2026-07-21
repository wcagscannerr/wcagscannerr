const CACHE_NAME = 'wcag-scanner-v2'
const STATIC_ASSETS = [
  '/',
  '/scanner',
  '/pricing',
  '/contrast-checker',
  '/about',
  '/statement-generator',
]

// Install — cache static pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([...STATIC_ASSETS, '/offline.html']).catch(() => {
        console.log('[SW] Some pages failed to cache, continuing...')
      })
    })
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Handle navigation requests — serve offline page when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline.html')
      })
    )
    return
  }

  // Skip API routes and Supabase — always go network
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('vercel')
  ) {
    return
  }

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          // Only cache successful same-origin responses
          if (
            response.ok &&
            url.origin === self.location.origin &&
            response.type === 'basic'
          ) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
        .catch(() => {
          // Network failed, return cached version if available
          return cached
        })

      // Return cached immediately if available, update in background
      return cached || fetchPromise
    })
  )
})

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
