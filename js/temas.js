// js/temas.js
const TEMAS = {
  polar: {
    id: 'polar',
    nombre: 'Cervecería Polar',
    icono: '🍺',
    variables: {
      '--primary': '#00338D',
      '--primary-soft': '#E8EDF9',
      '--primary-mid': '#8099C4',
      '--bg': '#F7F8FA',
      '--surface': '#FFFFFF',
      '--text': '#111827',
      '--text2': '#6B7280',
      '--text3': '#9CA3AF',
      '--border': '#E4E7EC',
      '--shadow': '0 1px 3px rgba(0,0,0,0.08)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.10)',
      '--radius': '14px'
    }
  },
  empanadas: {
    id: 'empanadas',
    nombre: 'Empanadas & Café',
    icono: '🥟',
    variables: {
      '--primary': '#D97706',
      '--primary-soft': '#FFFBEB',
      '--primary-mid': '#FCD34D',
      '--bg': '#FFF8F0',
      '--surface': '#FFFFFF',
      '--text': '#4B2E0A',
      '--text2': '#7A5A3A',
      '--text3': '#A88B6E',
      '--border': '#F0DCC8',
      '--shadow': '0 1px 3px rgba(0,0,0,0.06)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.08)',
      '--radius': '10px'
    }
  },
  comidaRapida: {
    id: 'comidaRapida',
    nombre: 'Comida Rápida',
    icono: '🍔',
    variables: {
      '--primary': '#DC2626',
      '--primary-soft': '#FEF2F2',
      '--primary-mid': '#FCA5A5',
      '--bg': '#FEFCFB',
      '--surface': '#FFFFFF',
      '--text': '#1F1A17',
      '--text2': '#6B5E55',
      '--text3': '#9A8A7D',
      '--border': '#E5DDD8',
      '--shadow': '0 2px 8px rgba(0,0,0,0.10)',
      '--shadow-md': '0 4px 20px rgba(0,0,0,0.15)',
      '--radius': '8px'
    }
  },
  todoTipo: {
    id: 'todoTipo',
    nombre: 'Todo Tipo de Comidas',
    icono: '🍽️',
    variables: {
      '--primary': '#059669',
      '--primary-soft': '#ECFDF5',
      '--primary-mid': '#6EE7B7',
      '--bg': '#F0FDF4',
      '--surface': '#FFFFFF',
      '--text': '#064E3B',
      '--text2': '#4A7A5A',
      '--text3': '#7A9A8A',
      '--border': '#C8E6D0',
      '--shadow': '0 1px 3px rgba(0,0,0,0.05)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.08)',
      '--radius': '16px'
    }
  }
};

function aplicarTema(idTema) {
  const tema = TEMAS[idTema];
  if (!tema) return;
  const root = document.documentElement;
  Object.keys(tema.variables).forEach(key => {
    root.style.setProperty(key, tema.variables[key]);
  });
  localStorage.setItem('temaSeleccionado', idTema);
  // Actualizar selector de temas si existe
  const selectorItems = document.querySelectorAll('.tema-selector-item');
  selectorItems.forEach(el => {
    el.classList.toggle('active', el.dataset.tema === idTema);
  });
}

function cargarTemaGuardado() {
  const temaGuardado = localStorage.getItem('temaSeleccionado') || 'polar';
  aplicarTema(temaGuardado);
}

// Exponer globalmente
window.TEMAS = TEMAS;
window.aplicarTema = aplicarTema;
window.cargarTemaGuardado = cargarTemaGuardado;
