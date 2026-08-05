const CACHE_NAME = 'minegocio-v2';
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
  console.log('[SW v2] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.warn('[SW v2] Error cacheando estáticos:', err);
    })
  );
  self.skipWaiting();
});

// Activación: limpiar TODAS las caches viejas (incluyendo v1)
self.addEventListener('activate', (event) => {
  console.log('[SW v2] Activado - limpiando caches viejas');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW v2] Eliminando cache vieja:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: estrategia por tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // === HTML: Network-First (siempre fresco) ===
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request).then((response) => {
        // Actualizar cache en segundo plano
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // === CSS y JS: Network-First (siempre fresco) ===
  if (url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.js') ||
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // === Firebase y APIs externas: siempre red ===
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('gstatic') ||
      url.hostname.includes('cdn.jsdelivr')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // === Recursos estáticos restantes: cache primero ===
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then((response) => {
        if (request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
