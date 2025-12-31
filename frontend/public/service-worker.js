// Version timestamp - change this on each deploy to force cache update
const CACHE_VERSION = 'v3-' + Date.now();
const CACHE_NAME = 'proyekta-' + CACHE_VERSION;

// Only cache essential static assets
const urlsToCache = [
  '/'
];

// Install event - cache resources and skip waiting
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache).catch(() => {
          console.log('[SW] Some resources could not be cached');
        });
      })
      .catch((error) => {
        console.log('[SW] Cache failed:', error);
      })
  );
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

// Activate event - clean up ALL old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Now ready to handle fetches');
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - NETWORK FIRST strategy (always try network, cache as fallback)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API calls - they should never be cached
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    // Always try network first
    fetch(event.request, {
      // Add cache-busting headers
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then((response) => {
        // If network succeeds, cache the response and return it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache as fallback
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For navigation requests, return the cached index
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      console.log('[SW] All caches cleared');
    });
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ProManage', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Background sync event (for offline support)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-timesheet') {
    event.waitUntil(syncTimesheet());
  }
});

async function syncTimesheet() {
  console.log('[SW] Syncing timesheet entries...');
}
