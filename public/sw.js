// Service Worker - College Attendance System
// Online-only PWA: enables install prompt, no offline caching of API calls

const CACHE_NAME = 'attendance-app-v1'

// Only cache the app shell (HTML, CSS, JS) - NOT API calls
const APP_SHELL = [
  '/',
  '/index.html',
]

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL)
    })
  )
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
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

// ── Fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // ✅ Never intercept API calls — always go to network
  if (
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/attendance') ||
    url.pathname.startsWith('/gps') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/reset') ||
    url.pathname.startsWith('/timetable')
  ) {
    return // let browser handle normally
  }

  // For navigation requests (React Router paths) — serve index.html from cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html')
      })
    )
    return
  }

  // For assets (JS, CSS, icons) — network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      })
  )
})