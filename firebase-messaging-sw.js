// firebase-messaging-sw.js
// Service Worker para recibir notificaciones push en background

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBzioMvZHJdN_6uuwXd4fYX73jxAU3ATZ8",
  authDomain: "plataforma-gestion-empresas.firebaseapp.com",
  projectId: "plataforma-gestion-empresas",
  storageBucket: "plataforma-gestion-empresas.firebasestorage.app",
  messagingSenderId: "55247794843",
  appId: "1:55247794843:web:336f847f0dfaf92ec88c3e"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Recibir mensajes en background (app cerrada)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Notificación en background:', payload);
  const notificationTitle = payload.notification?.title || 'Nuevo pedido';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva orden',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'pedido-' + Date.now(),
    requireInteraction: true,
    data: payload.data || {}
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
        clientList[0].postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
      } else {
        clients.openWindow('/');
      }
    })
  );
});
