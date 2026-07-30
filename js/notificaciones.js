// ═══════════════════════════════════════════════════════════════
// NOTIFICACIONES PUSH — Firebase Cloud Messaging
// ═══════════════════════════════════════════════════════════════

const FCM_SERVER_KEY = 'BIXCOeyKIITXCMLaf_RaGC2QDRKN-C4d3cD3Ocu9FGCQcz-jVQT-WT6FhJiF9RB1yjLQ3HqZS5HqEdTNJd-TJ1I';

let messaging = null;
let fcmTokenActual = null;
let fcmSwRegistration = null;

// Detectar si estamos en un subpath (ej: /Mi_Negocio/)
const BASE_PATH = location.pathname.replace(/\/[^\/]*$/, '/'); // ej: /Mi_Negocio/

// Inicializar Firebase Messaging
function initMessaging() {
  if (typeof firebase === 'undefined' || !firebase.messaging) {
    console.log('[FCM] SDK de messaging no disponible');
    return false;
  }
  try {
    messaging = firebase.messaging();
    console.log('[FCM] Messaging inicializado');
    return true;
  } catch (e) {
    console.log('[FCM] Error al inicializar:', e.message);
    return false;
  }
}

// Solicitar permiso de notificaciones y obtener token
async function solicitarPermisoNotificaciones() {
  if (!messaging) {
    if (!initMessaging()) return null;
  }

  console.log('[FCM] Solicitando permiso...');
  const permiso = await Notification.requestPermission();
  console.log('[FCM] Permiso:', permiso);

  if (permiso !== 'granted') {
    console.log('[FCM] Usuario denegó notificaciones');
    return null;
  }

  try {
    // Registrar el SW de FCM con la ruta correcta (maneja subpaths)
    const swPath = BASE_PATH + 'firebase-messaging-sw.js';
    console.log('[FCM] Registrando SW en:', swPath);
    fcmSwRegistration = await navigator.serviceWorker.register(swPath);
    console.log('[FCM] SW registrado:', fcmSwRegistration.scope);

    // Obtener token pasando el SW registration explícito
    const token = await messaging.getToken({
      serviceWorkerRegistration: fcmSwRegistration
    });

    if (token) {
      console.log('[FCM] Token obtenido:', token.slice(0, 20) + '...');
      fcmTokenActual = token;
      await guardarTokenFCM(token);
      return token;
    } else {
      console.log('[FCM] No se pudo obtener token');
      return null;
    }
  } catch (e) {
    console.error('[FCM] Error obteniendo token:', e);
    return null;
  }
}

// Guardar token en Firestore
async function guardarTokenFCM(token) {
  const uid = sessionStorage.getItem('userUID');
  const empresaId = sessionStorage.getItem('empresaId');
  if (!uid || !empresaId || !token) return;

  try {
    await db.collection('empresas').doc(empresaId).collection('usuarios').doc(uid).update({
      fcmToken: token,
      fcmTokenUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('[FCM] Token guardado en Firestore');
  } catch (e) {
    console.error('[FCM] Error guardando token:', e);
  }
}

// Escuchar mensajes en foreground
function escucharMensajesForeground() {
  if (!messaging) return;
  messaging.onMessage((payload) => {
    console.log('[FCM] Mensaje en foreground:', payload);
    const titulo = payload.notification?.title || 'Nuevo pedido';
    const cuerpo = payload.notification?.body || '';
    showToast(`🔔 ${titulo}: ${cuerpo}`);
    if (Notification.permission === 'granted') {
      new Notification(titulo, { body: cuerpo, icon: BASE_PATH + 'icon-192x192.png' });
    }
  });
}

// Enviar notificación push a un token
async function enviarNotificacionPush(destinoToken, titulo, cuerpo, datos = {}) {
  if (!destinoToken || !FCM_SERVER_KEY) {
    console.warn('[FCM] Server Key no configurada');
    return false;
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': 'key=' + FCM_SERVER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: destinoToken,
        notification: {
          title: titulo,
          body: cuerpo,
          icon: BASE_PATH + 'icon-192x192.png',
          badge: BASE_PATH + 'icon-72x72.png',
          click_action: BASE_PATH
        },
        data: datos
      })
    });

    const result = await response.json();
    console.log('[FCM] Notificación enviada:', result);
    return result.success === 1;
  } catch (e) {
    console.error('[FCM] Error enviando notificación:', e);
    return false;
  }
}

// Notificar a TODOS los admins de una empresa
async function notificarAdmins(empresaId, titulo, cuerpo, datos = {}) {
  try {
    const adminsSnap = await db.collection('empresas').doc(empresaId).collection('usuarios')
      .where('rol', '==', 'admin').get();

    let enviados = 0;
    for (const doc of adminsSnap.docs) {
      const token = doc.data().fcmToken;
      if (token) {
        const ok = await enviarNotificacionPush(token, titulo, cuerpo, datos);
        if (ok) enviados++;
      }
    }

    console.log(`[FCM] Notificaciones enviadas a ${enviados} admin(s)`);
    return enviados;
  } catch (e) {
    console.error('[FCM] Error notificando admins:', e);
    return 0;
  }
}

// Exponer funciones globales
window.initMessaging = initMessaging;
window.solicitarPermisoNotificaciones = solicitarPermisoNotificaciones;
window.escucharMensajesForeground = escucharMensajesForeground;
window.enviarNotificacionPush = enviarNotificacionPush;
window.notificarAdmins = notificarAdmins;
window.guardarTokenFCM = guardarTokenFCM;
