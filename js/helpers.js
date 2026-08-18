// ── HELPERS ──

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) { console.warn('Toast not found:', msg); return; }
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function handleError(error, fallback = 'Ocurrió un error inesperado') {
  console.error(error);
  const msg = (typeof error === 'string') ? error : (error.message || fallback);
  showToast('❌ ' + msg, 'error');
}

function formatCurrency(value) {
  return '$' + Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function parseCurrency(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function getServerTimestamp() {
  if (typeof firebase !== 'undefined' && firebase.firestore) {
    return firebase.firestore.FieldValue.serverTimestamp();
  }
  return new Date().toISOString();
}

function convertTimestamp(val) {
  if (!val) return new Date(0);
  if (val.toDate) return val.toDate();
  if (typeof val === 'string') return new Date(val);
  if (val instanceof Date) return val;
  return new Date(0);
}

function formatDateLocal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayName(index) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[index] || '';
}

// ── HELPERS ──

// ... (código existente) ...

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} str - Cadena a escapar
 * @returns {string} Cadena escapada
 */
function escapeHtml(str) {
  if (!str) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ... (resto del código existente) ...

// Exponer la función globalmente
window.escapeHtml = escapeHtml;

window.showToast = showToast;
window.handleError = handleError;
window.formatCurrency = formatCurrency;
window.parseCurrency = parseCurrency;
window.getCurrentTimestamp = getCurrentTimestamp;
window.getServerTimestamp = getServerTimestamp;
window.convertTimestamp = convertTimestamp;
window.formatDateLocal = formatDateLocal;
window.getDayName = getDayName;
