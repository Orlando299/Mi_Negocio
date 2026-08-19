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

// Activación: limpiar caches viejas
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

// Fetch: SOLO interceptar solicitudes a la misma aplicación
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 🔥 CRÍTICO: Solo interceptar solicitudes al mismo origen
  if (url.origin !== self.location.origin) {
    // Para solicitudes externas (FCM, Google, etc.), NO hacer nada (el navegador las maneja)
    return;
  }

  // === HTML: Network-First (siempre fresco) ===
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
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

  // === Otros recursos estáticos: cache primero ===
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Actualizar cache en segundo plano
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
