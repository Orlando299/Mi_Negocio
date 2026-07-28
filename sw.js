const CACHE_NAME = 'minegocio-v1';
const STATIC_ASSETS = [
  '/Mi_Negocio/',
  '/Mi_Negocio/index.html',
  '/Mi_Negocio/css/styles.css',
  '/Mi_Negocio/js/firebase.js',
  '/Mi_Negocio/js/helpers.js',
  '/Mi_Negocio/js/data.js',
  '/Mi_Negocio/js/render.js',
  '/Mi_Negocio/js/temas.js',
  '/Mi_Negocio/js/app.js',
  '/Mi_Negocio/manifest.json'
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.warn('[SW] Error cacheando estáticos:', err);
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia Cache-First para estáticos, Network-First para API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase y APIs externas: siempre red
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('gstatic') ||
      url.hostname.includes('cdn.jsdelivr')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Recursos estáticos: cache primero
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Refrescar en segundo plano
        fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then((response) => {
        // Cachear nuevos recursos estáticos
        if (request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
