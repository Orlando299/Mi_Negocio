// ── UTILIDADES ──

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── MODAL DE CONFIRMACIÓN ──
function openConfirmModal(message, onConfirm) {
  window._confirmAction = onConfirm;
  const body = `
    <p style="margin-bottom: 16px;">${message}</p>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-primary" style="flex:1;" onclick="confirmAction()">Confirmar</button>
      <button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Cancelar</button>
    </div>
  `;
  // Reutilizar el mismo modal
  document.getElementById('modal-title').textContent = 'Confirmar';
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal').classList.add('open');
}

function confirmAction() {
  if (typeof window._confirmAction === 'function') {
    window._confirmAction();
    window._confirmAction = null;
  }
  closeModal();
}

// ── ABRIR MODAL CON CONTENIDO PERSONALIZADO ──
function openModalWithContent(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal').classList.add('open');
}
