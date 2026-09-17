// ================================================================
//  SERVICE WORKER - MiNegocio
//  Compatible con dominio propio (minegociopolar.com)
// ================================================================

const CACHE_NAME = 'minegocio-v3';

// Assets a cachear (rutas relativas al dominio raíz)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/firebase.js',
  '/js/helpers.js',
  '/js/data.js',
  '/js/render.js',
  '/js/temas.js',
  '/js/productos-polar.js',
  '/js/agent.js',
  '/js/app.js',
  '/js/notificaciones.js',
  '/manifest.json'
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW v3] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cachear uno por uno para que si uno falla, no rompa todo
      return Promise.all(
        STATIC_ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[SW v3] No se pudo cachear ${asset}:`, err.message);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejas
self.addEventListener('activate', (event) => {
  console.log('[SW v3] Activado - limpiando caches viejas');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW v3] Eliminando cache vieja:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: manejar solicitudes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 🔥 Solo interceptar solicitudes al mismo origen
  if (url.origin !== self.location.origin) {
    return;
  }

  // Ignorar solicitudes de Firebase / Firestore / APIs externas
  if (url.pathname.includes('firestore') || 
      url.pathname.includes('identitytoolkit') ||
      url.pathname.includes('googleapis')) {
    return;
  }

  // === HTML: Network-First ===
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // === CSS y JS: Network-First ===
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

  // === Otros recursos estáticos: Cache-First ===
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
