// ── CONFIGURACIÓN DE FIREBASE ──

const firebaseConfig = {
  apiKey: "AIzaSyBzioMvZHJdN_6uuwXd4fYX73jxAU3ATZ8",
  authDomain: "plataforma-gestion-empresas.firebaseapp.com",
  projectId: "plataforma-gestion-empresas",
  storageBucket: "plataforma-gestion-empresas.firebasestorage.app",
  messagingSenderId: "55247794843",
  appId: "1:55247794843:web:336f847f0dfaf92ec88c3e"
};

// Inicializar Firebase (usando compat para mantener compatibilidad con el código existente)
firebase.initializeApp(firebaseConfig);

// Exportar servicios para usar en otros archivos
const db = firebase.firestore();
const auth = firebase.auth();

// Hacer disponibles globalmente
window.db = db;
window.auth = auth;

console.log('🔥 Firebase inicializado correctamente');
