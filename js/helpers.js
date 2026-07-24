// ── HELPERS ──
// Funciones utilitarias y manejo de errores centralizado

/**
 * Muestra un mensaje tipo toast (notificación)
 */
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) {
    console.warn('Toast element not found:', msg);
    return;
  }
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/**
 * Muestra un mensaje de error al usuario y registra en consola.
 * @param {Error|string} error - Error o mensaje.
 * @param {string} fallback - Mensaje alternativo si error no tiene mensaje.
 */
function handleError(error, fallback = 'Ocurrió un error inesperado') {
  console.error(error);
  const msg = (typeof error === 'string') ? error : (error.message || fallback);
  showToast('❌ ' + msg, 'error');
}

/**
 * Formatea un número como moneda (USD).
 */
function formatCurrency(value) {
  return '$' + Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Extrae el valor numérico de un string con formato '$xxx.xx'
 */
function parseCurrency(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

/**
 * Obtiene la fecha actual formateada para Firestore (ISO string)
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Obtiene la fecha local formateada para mostrar
 */
function formatDateLocal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Obtiene el nombre del día de la semana (abreviado)
 */
function getDayName(index) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[index] || '';
}

// Exponer globalmente
window.showToast = showToast;
window.handleError = handleError;
window.formatCurrency = formatCurrency;
window.parseCurrency = parseCurrency;
window.getCurrentTimestamp = getCurrentTimestamp;
window.formatDateLocal = formatDateLocal;
window.getDayName = getDayName;
