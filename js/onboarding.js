// ================================================================
//  MÓDULO: ONBOARDING (BLOQUE E)
//  Guía de inicio para nuevos admins (dueños)
// ================================================================

// ── ESTADO DEL MÓDULO ──
let obEmpresaId = null;
let obEmpresaData = null;
let obSlideActual = 0;
let obEstadoPasos = null;      // { productos, pagos, codigo, categorias, agente }
let obOnboarding = null;       // { tourVisto, completado, ... }

const OB_TOTAL_SLIDES = 5;

const OB_SLIDES = [
  {
    icono: '📊',
    titulo: 'Este es tu Dashboard',
    descripcion: 'Aquí ves un resumen de tu negocio: ventas del día, pedidos pendientes, stock bajo y clientes nuevos.'
  },
  {
    icono: '🛒',
    titulo: 'Aquí llegan las Ventas',
    descripcion: 'Cuando un cliente hace un pedido, aparece aquí. Podrás confirmar el pago, despachar y generar la factura.'
  },
  {
    icono: '📦',
    titulo: 'Tu Inventario',
    descripcion: 'Aquí gestionas tus productos, sus precios y su stock. Los productos con stock bajo se marcan en amarillo.'
  },
  {
    icono: '👥',
    titulo: 'Tus Clientes',
    descripcion: 'Aquí ves a tus compradores. Puedes asignarles categorías para entregarles premios especiales en líquido.'
  },
  {
    icono: '🤖',
    titulo: 'Tu Asistente IA',
    descripcion: 'Un asistente inteligente que responde preguntas sobre tu negocio. Puedes ponerle el nombre que quieras.'
  }
];

// ────────────────────────────────────────────────────────────────
//  VERIFICAR SI DEBE MOSTRARSE EL ONBOARDING
// ────────────────────────────────────────────────────────────────
async function verificarOnboarding(empresaId, empresaData) {
  // Solo para admins dueños
  const esPropietario = sessionStorage.getItem('esPropietario') === 'true';
  const userRol = sessionStorage.getItem('userRol');
  if (userRol !== 'admin' || !esPropietario) {
    console.log('ℹ️ Onboarding: no aplica (no es dueño)');
    return;
  }

  if (!empresaId || !empresaData) {
    console.warn('⚠️ Onboarding: faltan datos');
    return;
  }

  obEmpresaId = empresaId;
  obEmpresaData = empresaData;
  obOnboarding = empresaData.onboarding || {};

  // Si ya está completado, no mostrar
  if (obOnboarding.completado === true) {
    console.log('ℹ️ Onboarding: ya completado');
    return;
  }

  // Esperar un momento para que la UI esté lista
  setTimeout(() => {
    abrirOnboarding();
  }, 1200);
}

// ────────────────────────────────────────────────────────────────
//  ABRIR ONBOARDING
// ────────────────────────────────────────────────────────────────
async function abrirOnboarding() {
  if (!obEmpresaId) return;

  // Calcular estado de los pasos
  await obCalcularEstadoPasos();

  // Si ya está todo completo, mostrar felicitación y no volver a mostrar
  if (obEstadoPasos.productos && obEstadoPasos.pagos) {
    // Si no se ha mostrado la felicitación, mostrarla
    if (obOnboarding.completado !== true) {
      obMostrarFelicitacion();
    }
    return;
  }

  // Si el tour ya se vio, ir directo al checklist
  if (obOnboarding.tourVisto === true) {
    obMostrarChecklist();
  } else {
    obMostrarBienvenida();
  }
}

// ────────────────────────────────────────────────────────────────
//  CALCULAR ESTADO DE LOS PASOS
// ────────────────────────────────────────────────────────────────
async function obCalcularEstadoPasos() {
  const empresaId = obEmpresaId;
  
  obEstadoPasos = {
    productos: false,
    pagos: false,
    codigo: obOnboarding?.codigoCompartido === true,
    categorias: false,
    agente: false
  };

  try {
    // PASO 1: Productos (inventario con al menos 1 producto con precio > 0)
    const invSnap = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('inventario').limit(50).get();
    
    if (!invSnap.empty) {
      const hayConPrecio = invSnap.docs.some(doc => {
        const data = doc.data();
        const precio = parseFloat(String(data.precio || '0').replace(/[$,]/g, '')) || 0;
        return precio > 0;
      });
      obEstadoPasos.productos = hayConPrecio;
    }

    // PASO 2: Pagos (al menos un método configurado)
    const empresaDoc = await firebase.firestore()
      .collection('empresas').doc(empresaId).get();
    
    if (empresaDoc.exists) {
      const data = empresaDoc.data();
      const pagos = data.datosPago || {};
      obEstadoPasos.pagos = !!(
        (pagos.pagoMovil?.telefono) ||
        (pagos.zelle?.email) ||
        (pagos.transferencia?.cuenta)
      );

      // PASO 5: Agente personalizado
      const agentName = data.agentName || 'PolarBot';
      obEstadoPasos.agente = agentName !== 'PolarBot';
    }

    // PASO 4: Categorías (al menos 1 con aporte > 0)
    const catSnap = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('categoriasClientes').get();
    
    catSnap.forEach(doc => {
      const data = doc.data();
      const valor = data.aporteEspecial?.valor || 0;
      if (valor > 0) obEstadoPasos.categorias = true;
    });

  } catch (error) {
    console.warn('⚠️ Error calculando estado de pasos:', error);
  }

  console.log('📋 Estado del onboarding:', obEstadoPasos);
}

// ────────────────────────────────────────────────────────────────
//  PANTALLA: BIENVENIDA
// ────────────────────────────────────────────────────────────────
function obMostrarBienvenida() {
  const modal = document.getElementById('modal-onboarding');
  if (!modal) return;

  const body = document.getElementById('onboarding-body');
  body.innerHTML = `
    <div style="text-align:center; padding:10px 0;">
      <div style="font-size:56px; margin-bottom:16px;">🎉</div>
      <h2 style="font-size:22px; font-weight:700; margin:0 0 8px;">¡Bienvenido!</h2>
      <p style="font-size:14px; color:var(--text2); line-height:1.5; margin-bottom:24px;">
        Estás a punto de empezar a gestionar tu franquicia Polar con <strong>MiNegocio</strong>.
        Te mostraremos cómo funciona en unos segundos.
      </p>

      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; margin-bottom:24px;">
        <div style="background:var(--surface2); padding:12px; border-radius:10px;">
          <div style="font-size:24px;">📊</div>
          <div style="font-size:12px; font-weight:600; margin-top:4px;">Dashboard</div>
        </div>
        <div style="background:var(--surface2); padding:12px; border-radius:10px;">
          <div style="font-size:24px;">🛒</div>
          <div style="font-size:12px; font-weight:600; margin-top:4px;">Ventas</div>
        </div>
        <div style="background:var(--surface2); padding:12px; border-radius:10px;">
          <div style="font-size:24px;">📦</div>
          <div style="font-size:12px; font-weight:600; margin-top:4px;">Inventario</div>
        </div>
        <div style="background:var(--surface2); padding:12px; border-radius:10px;">
          <div style="font-size:24px;">👥</div>
          <div style="font-size:12px; font-weight:600; margin-top:4px;">Clientes</div>
        </div>
        <div style="background:var(--surface2); padding:12px; border-radius:10px; grid-column:1 / -1;">
          <div style="font-size:24px;">🤖</div>
          <div style="font-size:12px; font-weight:600; margin-top:4px;">Asistente IA</div>
        </div>
      </div>

      <button class="btn btn-primary" onclick="obIniciarTour()" style="margin-bottom:8px;">
        🚀 Hacer el tour
      </button>
      <button class="btn btn-outline" onclick="obSaltarTour()">
        Saltar tour
      </button>
    </div>
  `;

  obAbrirModal('modal-onboarding');
}

// ────────────────────────────────────────────────────────────────
//  PANTALLA: TOUR (SLIDES)
// ────────────────────────────────────────────────────────────────
function obMostrarSlide() {
  const slide = OB_SLIDES[obSlideActual];
  const esUltimo = obSlideActual === OB_TOTAL_SLIDES - 1;
  const esPrimero = obSlideActual === 0;

  const puntos = OB_SLIDES.map((_, i) => 
    `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; margin:0 3px; background:${i === obSlideActual ? 'var(--primary)' : 'var(--border)'};"></span>`
  ).join('');

  const body = document.getElementById('onboarding-body');
  body.innerHTML = `
    <div style="text-align:center; padding:10px 0;">
      <div style="font-size:12px; color:var(--text3); margin-bottom:8px; font-weight:600;">
        PASO ${obSlideActual + 1} DE ${OB_TOTAL_SLIDES}
      </div>
      <div style="font-size:64px; margin:20px 0;">${slide.icono}</div>
      <h2 style="font-size:20px; font-weight:700; margin:0 0 12px;">${slide.titulo}</h2>
      <p style="font-size:14px; color:var(--text2); line-height:1.6; margin-bottom:24px; min-height:60px;">
        ${slide.descripcion}
      </p>

      <div style="margin-bottom:24px;">
        ${puntos}
      </div>

      <div style="display:flex; gap:8px;">
        ${!esPrimero ? `
          <button class="btn btn-outline" onclick="obSlideAnterior()" style="flex:1;">← Anterior</button>
        ` : `<div style="flex:1;"></div>`}
        
        ${!esUltimo ? `
          <button class="btn btn-primary" onclick="obSlideSiguiente()" style="flex:1;">Siguiente →</button>
        ` : `
          <button class="btn btn-primary" onclick="obTerminarTour()" style="flex:1;">Continuar →</button>
        `}
      </div>

      <button class="btn btn-outline" onclick="obSaltarTour()" style="margin-top:12px; border:none; color:var(--text3); font-size:12px;">
        Saltar tour
      </button>
    </div>
  `;
}

function obIniciarTour() {
  obSlideActual = 0;
  obMostrarSlide();
}

function obSlideAnterior() {
  if (obSlideActual > 0) {
    obSlideActual--;
    obMostrarSlide();
  }
}

function obSlideSiguiente() {
  if (obSlideActual < OB_TOTAL_SLIDES - 1) {
    obSlideActual++;
    obMostrarSlide();
  }
}

async function obTerminarTour() {
  // Marcar tour como visto
  try {
    await firebase.firestore().collection('empresas').doc(obEmpresaId).set({
      onboarding: {
        ...obOnboarding,
        tourVisto: true
      }
    }, { merge: true });
    obOnboarding.tourVisto = true;
  } catch (e) {
    console.warn('⚠️ No se pudo guardar tourVisto:', e);
  }
  obMostrarChecklist();
}

async function obSaltarTour() {
  if (!confirm('¿Saltar el tour?\n\nPuedes volver a verlo desde "Guía de inicio" en tu menú.')) return;
  await obTerminarTour();
}

// ────────────────────────────────────────────────────────────────
//  PANTALLA: CHECKLIST
// ────────────────────────────────────────────────────────────────
async function obMostrarChecklist() {
  // Recalcular estado
  await obCalcularEstadoPasos();

  const p = obEstadoPasos;
  const obligatoriosListos = p.productos && p.pagos;

  const pasos = [
    {
      num: 1,
      key: 'productos',
      titulo: 'Cargar productos con precios y stock',
      desc: 'Sin productos, tus clientes no podrán hacer pedidos.',
      obligatorio: true,
      icono: '📦',
      accion: 'obIrAProductos'
    },
    {
      num: 2,
      key: 'pagos',
      titulo: 'Configurar datos de pago',
      desc: 'Para que tus clientes sepan cómo pagarte.',
      obligatorio: true,
      icono: '💳',
      accion: 'obIrAPagos'
    },
    {
      num: 3,
      key: 'codigo',
      titulo: 'Compartir código de invitación',
      desc: 'Tus clientes lo usan para registrarse en tu franquicia.',
      obligatorio: false,
      icono: '🎟️',
      accion: 'obIrACodigo'
    },
    {
      num: 4,
      key: 'categorias',
      titulo: 'Crear categorías (opcional)',
      desc: 'Para entregar premios especiales en líquido a tus clientes mayoristas y fidelizados.',
      obligatorio: false,
      icono: '🏷️',
      accion: 'obIrACategorias'
    },
    {
      num: 5,
      key: 'agente',
      titulo: 'Personaliza tu asistente (opcional)',
      desc: 'Ponle el nombre que prefieras: "PolarBot", "MiAsistente", "ElCervecero", etc.',
      obligatorio: false,
      icono: '🤖',
      accion: 'obIrAAgente'
    }
  ];

  const pasosHTML = pasos.map(paso => {
    const completado = obEstadoPasos[paso.key] === true;
    return `
      <div style="background:${completado ? 'var(--green-soft)' : 'var(--surface2)'}; border-radius:10px; padding:12px; margin-bottom:10px; display:flex; align-items:center; gap:12px; border-left:3px solid ${completado ? 'var(--green)' : 'var(--border)'};">
        <div style="font-size:24px; flex-shrink:0;">${completado ? '✅' : paso.icono}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:13px; font-weight:${completado ? '400' : '700'}; ${completado ? 'text-decoration:line-through; opacity:0.7;' : ''}">
            ${paso.num}️⃣ ${paso.titulo}
          </div>
          ${!completado ? `<div style="font-size:11px; color:var(--text3); margin-top:2px;">${paso.desc}</div>` : ''}
        </div>
        ${!completado ? `
          <button class="btn-icon" onclick="${paso.accion}()" title="Ir" style="font-size:18px; color:var(--primary);">➡️</button>
        ` : ''}
      </div>
    `;
  }).join('');

  const body = document.getElementById('onboarding-body');
  body.innerHTML = `
    <div style="padding:4px 0;">
      <h2 style="font-size:20px; font-weight:700; margin:0 0 4px; text-align:center;">
        🚀 Configura tu franquicia
      </h2>
      <p style="font-size:13px; color:var(--text2); text-align:center; margin-bottom:16px;">
        ${obligatoriosListos 
          ? '✅ Los pasos obligatorios están completos. ¡Ya puedes vender!' 
          : 'Completa estos pasos para empezar a vender'}
      </p>

      <div style="max-height:50vh; overflow-y:auto; padding-right:4px;">
        ${pasosHTML}
      </div>

      <div style="display:flex; gap:8px; margin-top:16px;">
        <button class="btn btn-outline" onclick="obCerrarOnboarding()" style="flex:1;">
          Más tarde
        </button>
        ${!obligatoriosListos ? `
          <button class="btn btn-primary" onclick="obIrAProductos()" style="flex:2;">
            Empezar ahora
          </button>
        ` : `
          <button class="btn btn-primary" onclick="obFinalizarOnboarding()" style="flex:2;">
            ✅ Finalizar
          </button>
        `}
      </div>
    </div>
  `;

  obAbrirModal('modal-onboarding');
}

// ────────────────────────────────────────────────────────────────
//  NAVEGACIÓN DESDE EL CHECKLIST
// ────────────────────────────────────────────────────────────────
async function obIrAProductos() {
  // ✅ Marcar que venimos del onboarding
  sessionStorage.setItem('ob_volver_al_onboarding', 'true');
  
  obCerrarOnboarding();
  
  setTimeout(() => {
    if (typeof abrirCargarPrecios === 'function') {
      abrirCargarPrecios();
    } else {
      // Fallback si la función no existe
      goScreen('configuracion');
      cambiarTabConfiguracion('catalogo-polar');
    }
  }, 200);
}

function obIrAPagos() {
  obCerrarOnboarding();
  setTimeout(() => {
    goScreen('configuracion');
    cambiarTabConfiguracion('pagos');
  }, 200);
}

function obIrACodigo() {
  // Marcar como compartido (aproximación: abrir modal)
  firebase.firestore().collection('empresas').doc(obEmpresaId).set({
    onboarding: { ...obOnboarding, codigoCompartido: true }
  }, { merge: true }).catch(() => {});
  obOnboarding.codigoCompartido = true;

  obCerrarOnboarding();
  setTimeout(() => {
    if (typeof mostrarCodigoInvitacion === 'function') {
      mostrarCodigoInvitacion();
    }
  }, 200);
}

function obIrACategorias() {
  obCerrarOnboarding();
  setTimeout(() => {
    goScreen('configuracion');
    cambiarTabConfiguracion('categorias');
  }, 200);
}

function obIrAAgente() {
  obCerrarOnboarding();
  setTimeout(() => {
    goScreen('configuracion');
    cambiarTabConfiguracion('agente');
  }, 200);
}

// ────────────────────────────────────────────────────────────────
//  FELICITACIÓN FINAL
// ────────────────────────────────────────────────────────────────
function obMostrarFelicitacion() {
  const body = document.getElementById('onboarding-body');
  body.innerHTML = `
    <div style="text-align:center; padding:20px 0;">
      <div style="font-size:72px; margin-bottom:16px;">🎉</div>
      <h2 style="font-size:22px; font-weight:700; margin:0 0 8px;">¡Felicidades!</h2>
      <p style="font-size:14px; color:var(--text2); line-height:1.6; margin-bottom:24px;">
        Tu franquicia está configurada y lista para empezar a vender.
        ¡Mucho éxito!
      </p>
      <button class="btn btn-primary" onclick="obFinalizarOnboarding()">
        🚀 Ir al Dashboard
      </button>
    </div>
  `;
  obAbrirModal('modal-onboarding');
}

async function obFinalizarOnboarding() {
  try {
    await firebase.firestore().collection('empresas').doc(obEmpresaId).set({
      onboarding: {
        ...obOnboarding,
        tourVisto: true,
        completado: true,
        fechaCompletado: new Date().toISOString()
      }
    }, { merge: true });
  } catch (e) {
    console.warn('⚠️ No se pudo guardar onboarding completado:', e);
  }
  obCerrarOnboarding();
  showToast('🎉 ¡Franquicia lista!');
}

async function obCerrarOnboarding() {
  obCerrarModal('modal-onboarding');
}

// ────────────────────────────────────────────────────────────────
//  HELPERS DE MODAL
// ────────────────────────────────────────────────────────────────
function obAbrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.style.cssText = '';
  modal.classList.remove('open');
  modal.hidden = false;
  void modal.offsetHeight;
  modal.classList.add('open');
}

function obCerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('open');
  modal.hidden = true;
  modal.style.cssText = 'display:none!important;';
}

// ────────────────────────────────────────────────────────────────
//  EXPOSICIÓN GLOBAL
// ────────────────────────────────────────────────────────────────
window.verificarOnboarding = verificarOnboarding;
window.abrirOnboarding = abrirOnboarding;
window.obIniciarTour = obIniciarTour;
window.obSlideAnterior = obSlideAnterior;
window.obSlideSiguiente = obSlideSiguiente;
window.obTerminarTour = obTerminarTour;
window.obSaltarTour = obSaltarTour;
window.obMostrarChecklist = obMostrarChecklist;
window.obIrAProductos = obIrAProductos;
window.obIrAPagos = obIrAPagos;
window.obIrACodigo = obIrACodigo;
window.obIrACategorias = obIrACategorias;
window.obIrAAgente = obIrAAgente;
window.obFinalizarOnboarding = obFinalizarOnboarding;
window.obCerrarOnboarding = obCerrarOnboarding;

console.log('✅ Módulo Onboarding cargado');
