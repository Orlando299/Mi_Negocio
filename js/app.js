// ── VARIABLES GLOBALES ──
let currentScreen = 'dashboard';
const screens = ['dashboard', 'ventas', 'inventario', 'clientes', 'reportes', 'cliente', 'configuracion'];
let filtroVentas = 'todas';
let filtroInv = 'todos';
let filtroCli = 'todos';
let filtroCatalogo = 'todas';

// Bandera para evitar que onAuthStateChanged interfiera durante registro
let _registrando = false;

// ── CONFIGURACIÓN DE TIPOS DE ENVASE (para despacho) ──
const TIPOS_ENVASE = {
  botella_222ml: { nombre: 'Botella retornable 222 ml', unidadesPorEnvase: 36 },
  botella_330ml: { nombre: 'Botella retornable 330 ml', unidadesPorEnvase: 24 },
  botella_350ml: { nombre: 'Botella de refresco 350 ml', unidadesPorEnvase: 24 }
};

// ═══════════════════════════════════════════════════════════════
//  DETECCIÓN TEMPRANA DE SESIÓN (se ejecuta antes de todo)
// ═══════════════════════════════════════════════════════════════
(function detectarSesionTemprano() {
  const empresaId = sessionStorage.getItem('empresaId');
  const userRol = sessionStorage.getItem('userRol');
  const userName = sessionStorage.getItem('userName');

  if (empresaId && userRol) {
    console.log('🔐 Sesión detectada temprano, redirigiendo...');
    const bienvenida = document.getElementById('screen-bienvenida');
    if (bienvenida) {
      bienvenida.classList.remove('active');
      bienvenida.style.display = 'none';
      bienvenida.style.visibility = 'hidden';
      bienvenida.style.pointerEvents = 'none';
      bienvenida.style.opacity = '0';
    }
    const topNav = document.getElementById('top-nav');
    const bottomNav = document.getElementById('bottom-nav');
    const fabBtn = document.getElementById('fab-btn');
    if (topNav) topNav.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';
    if (fabBtn) fabBtn.style.display = 'flex';

    if (userRol === 'admin') {
      if (typeof actualizarAdminUI === 'function') actualizarAdminUI(userName);
      if (typeof goScreen === 'function') goScreen('dashboard');
    } else {
      const adminMenu = document.getElementById('admin-menu');
      const btnCodigo = document.getElementById('btn-codigo');
      if (adminMenu) adminMenu.style.display = 'none';
      if (btnCodigo) btnCodigo.style.display = 'none';
      if (typeof goScreen === 'function') goScreen('cliente');
      if (typeof mostrarPanelCliente === 'function') mostrarPanelCliente();
    }

    setTimeout(() => {
      if (typeof store !== 'undefined' && store.cargarDatosEmpresa) {
        store.cargarDatosEmpresa(empresaId).then(() => {
          if (typeof syncGlobals === 'function') syncGlobals();
          if (typeof updateKPIs === 'function') updateKPIs();
          if (userRol === 'admin' && typeof renderChartVentas === 'function') {
            setTimeout(() => renderChartVentas(), 300);
          }
        });
      }
    }, 100);
  }
})();

// ═══════════════════════════════════════════════════════════════
//  LIMPIEZA DE SERVICE WORKERS
// ═══════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      console.log('🧹 SW unregister:', reg.scope);
      reg.unregister();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
//  FUNCIONES AUXILIARES DE MODALES
// ═══════════════════════════════════════════════════════════════
const _modalTemplates = {};

function forzarReflowBody() {
  const body = document.body;
  const originalDisplay = body.style.display;
  body.style.display = 'none';
  void body.offsetHeight;
  body.style.display = originalDisplay || '';
  void body.offsetHeight;
  console.log('🔄 Reflow forzado en body');
}

function guardarTemplateModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal && !_modalTemplates[modalId]) {
    _modalTemplates[modalId] = modal.outerHTML;
  }
}

function forzarCierreModal(modalId, destruir = false) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.log('⚠️ Modal no encontrado (ya destruido?):', modalId);
    return;
  }
  console.log('🔒 Cerrando modal:', modalId, '| destruir:', destruir);
  if (destruir) {
    try {
      guardarTemplateModal(modalId);
      if (modal.remove) {
        modal.remove();
        console.log('🗑️ Modal eliminado con remove():', modalId);
      } else if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
        console.log('🗑️ Modal eliminado con removeChild():', modalId);
      } else {
        modal.outerHTML = '';
        console.log('🗑️ Modal eliminado con outerHTML:', modalId);
      }
      if (document.getElementById(modalId)) {
        console.warn('⚠️ El modal aún existe, forzando ocultación extrema');
        const m = document.getElementById(modalId);
        if (m) {
          m.style.cssText = 'display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;position:fixed!important;top:-99999px!important;left:-99999px!important;z-index:-99999!important;transform:scale(0)!important;';
          m.hidden = true;
          m.classList.remove('open');
          if (m.parentNode) m.parentNode.removeChild(m);
        }
      }
    } catch (e) {
      console.error('❌ Error destruyendo modal:', e);
      modal.style.cssText = 'display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;position:fixed!important;top:-99999px!important;left:-99999px!important;z-index:-99999!important;transform:scale(0)!important;';
      modal.hidden = true;
      modal.classList.remove('open');
    }
    return;
  }
  modal.classList.remove('open');
  modal.hidden = true;
  modal.style.cssText = 'display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;position:fixed!important;top:-99999px!important;left:-99999px!important;z-index:-99999!important;transform:scale(0)!important;';
  console.log('👁️ Modal oculto:', modalId);
}

function abrirModalId(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.style.cssText = '';
  modal.classList.remove('open');
  modal.hidden = false;
  void modal.offsetHeight;
  modal.style.display = '';
  modal.style.opacity = '';
  modal.style.visibility = '';
  modal.style.pointerEvents = '';
  modal.style.zIndex = '';
  modal.style.position = '';
  modal.style.top = '';
  modal.style.left = '';
  modal.style.transform = '';
  modal.classList.add('open');
  console.log('📂 Modal abierto:', modalId);
}

// ═══════════════════════════════════════════════════════════════
//  PANTALLA DE BIENVENIDA Y REGISTRO/LOGIN
// ═══════════════════════════════════════════════════════════════
function mostrarPantallaBienvenida() {
  if (sessionStorage.getItem('empresaId') && sessionStorage.getItem('userRol')) {
    console.log('⏳ Sesión activa, no se muestra bienvenida');
    return;
  }
  const bienvenida = document.getElementById('screen-bienvenida');
  if (bienvenida) {
    bienvenida.style.display = '';
    bienvenida.style.visibility = '';
    bienvenida.style.pointerEvents = '';
    bienvenida.style.opacity = '';
    bienvenida.classList.add('active');
  }
  document.getElementById('top-nav').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';
  document.getElementById('fab-btn').style.display = 'none';
  screens.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (el) el.classList.remove('active');
  });
  forzarCierreModal('modal-registro-empresa');
  forzarCierreModal('modal-registro-cliente');
  forzarCierreModal('modal-login');
  forzarCierreModal('modal-codigo');
  forzarCierreModal('modal');
}

function ocultarPantallaBienvenida() {
  const bienvenida = document.getElementById('screen-bienvenida');
  if (bienvenida) {
    bienvenida.classList.remove('active');
    bienvenida.style.display = 'none';
    bienvenida.style.visibility = 'hidden';
    bienvenida.style.pointerEvents = 'none';
    bienvenida.style.opacity = '0';
  }
  document.getElementById('top-nav').style.display = 'flex';
  document.getElementById('bottom-nav').style.display = 'flex';
  document.getElementById('fab-btn').style.display = 'flex';
}

function mostrarRegistroEmpresa() { abrirModalId('modal-registro-empresa'); }
function cerrarModalRegistroEmpresa(e) {
  if (e && e.target !== e.currentTarget) return;
  forzarCierreModal('modal-registro-empresa');
}
function mostrarRegistroCliente() { abrirModalId('modal-registro-cliente'); }
function cerrarModalRegistroCliente(e) {
  if (e && e.target !== e.currentTarget) return;
  forzarCierreModal('modal-registro-cliente');
}
function mostrarLoginUnificado() { abrirModalId('modal-login'); }
function cerrarModalLogin(e) {
  if (e && e.target !== e.currentTarget) return;
  forzarCierreModal('modal-login');
}
function cerrarModalCodigo(e) {
  if (e && e.target !== e.currentTarget) return;
  forzarCierreModal('modal-codigo');
}

function generarCodigoAcceso() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

async function registrarEmpresa() {
  const nombreNegocio = document.getElementById('reg-emp-nombre').value.trim();
  const nombreAdmin   = document.getElementById('reg-emp-admin').value.trim();
  const email         = document.getElementById('reg-emp-email').value.trim();
  const password      = document.getElementById('reg-emp-pass').value;
  
  if (!nombreNegocio || !nombreAdmin || !email || !password) {
    showToast('❌ Completa todos los campos');
    return;
  }
  if (password.length < 6) {
    showToast('❌ La contraseña debe tener al menos 6 caracteres');
    return;
  }

  const btn = document.querySelector('#modal-registro-empresa .btn-primary');
  if (btn) btn.disabled = true;
  _registrando = true;

  try {
    // ============================================================
    //  PASO 1: Crear usuario en Firebase Auth
    // ============================================================
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // ============================================================
    //  PASO 2: Crear el perfil del usuario (con empresaId temporal)
    // ============================================================
    await firebase.firestore()
      .collection('userProfiles')
      .doc(user.uid)
      .set({
        uid: user.uid,
        nombre: nombreAdmin,
        email: email,
        rol: 'admin',
        empresaId: 'temp_' + Date.now(),
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });

    // ============================================================
    //  PASO 3: Crear la empresa
    // ============================================================
    const codigoAcceso = generarCodigoAcceso();
    const empresaRef = await firebase.firestore().collection('empresas').add({
      nombre: nombreNegocio,
      codigoAcceso: codigoAcceso,
      creadoPor: user.uid,
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
    });
    const empresaId = empresaRef.id;

    // ============================================================
    //  PASO 4: Actualizar el perfil con el empresaId real
    // ============================================================
    await firebase.firestore()
      .collection('userProfiles')
      .doc(user.uid)
      .update({
        empresaId: empresaId
      });

    // ============================================================
    //  PASO 5: Crear el usuario en la subcolección de la empresa
    // ============================================================
    await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('usuarios')
      .doc(user.uid)
      .set({
        uid: user.uid,
        nombre: nombreAdmin,
        email: email,
        rol: 'admin',
        fcmToken: ''
      });

    // ============================================================
    //  PASO 6: Crear categoría por defecto "Cliente Regular"
    //  (AHORA después de que el perfil tenga empresaId real)
    // ============================================================
    console.log('📌 Creando categoría por defecto...');
    const categoriaDefault = {
      nombre: 'Cliente Regular',
      descripcion: 'Cliente sin convenio especial',
      codigoInvitacion: '',
      activa: true,
      aporteEspecial: {
        tipo: 'porcentaje_liquido',
        valor: 0,
        aplicaA: ['Cervezas Polar']
      },
      creado: firebase.firestore.FieldValue.serverTimestamp(),
      modificado: firebase.firestore.FieldValue.serverTimestamp()
    };
    const categoriaRef = await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('categoriasClientes')
      .add(categoriaDefault);
    const categoriaDefaultId = categoriaRef.id;

    await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .update({
        categoriaPorDefectoId: categoriaDefaultId
      });
    console.log('✅ Categoría por defecto creada:', categoriaDefaultId);

    // ============================================================
    //  PASO 7: Guardar sesión y redirigir
    // ============================================================
    sessionStorage.setItem('empresaId', empresaId);
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userName', nombreAdmin);
    sessionStorage.setItem('userRol', 'admin');

    showToast(`✅ ¡Franquicia "${nombreNegocio}" creada! Código: ${codigoAcceso}`);
    setTimeout(() => { window.location.reload(); }, 1500);

  } catch (error) {
    console.error('❌ Error registrando franquicia:', error);
    if (error.code === 'auth/email-already-in-use') {
      showToast('❌ Este correo ya está registrado');
    } else if (error.code === 'auth/invalid-email') {
      showToast('❌ Correo electrónico inválido');
    } else {
      showToast('❌ Error: ' + error.message);
    }
    if (btn) btn.disabled = false;
  } finally {
    _registrando = false;
  }
}

async function registrarClienteNuevo() {
  const nombre = document.getElementById('reg-cli-nombre').value.trim();
  const email = document.getElementById('reg-cli-email').value.trim();
  const password = document.getElementById('reg-cli-pass').value;
  const codigo = document.getElementById('reg-cli-codigo').value.trim().toUpperCase();

  if (!nombre || !email || !password || !codigo) {
    showToast('❌ Completa todos los campos');
    return;
  }
  if (password.length < 6) {
    showToast('❌ La contraseña debe tener al menos 6 caracteres');
    return;
  }
  if (codigo.length !== 6) {
    showToast('❌ El código debe tener 6 caracteres');
    return;
  }

  const btn = document.querySelector('#modal-registro-cliente .btn-primary');
  if (btn) btn.disabled = true;

  _registrando = true;
  let user = null;
  let empresaId = null;
  let empresaData = null;

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    user = userCredential.user;
    console.log('✅ Usuario creado:', user.uid);

    await user.getIdToken(true);
    console.log('✅ Token actualizado');

    // 🔍 Buscar empresa por código
    console.log('🔍 Buscando empresa con código:', codigo);
    const empresasSnapshot = await firebase.firestore()
      .collection('empresas')
      .where('codigoAcceso', '==', codigo)
      .get();
    console.log('📊 Resultados encontrados:', empresasSnapshot.size);

    if (empresasSnapshot.empty) {
      await user.delete();
      showToast('❌ Código de invitación no válido');
      if (btn) btn.disabled = false;
      _registrando = false;
      return;
    }

    const empresaDoc = empresasSnapshot.docs[0];
    empresaId = empresaDoc.id;
    empresaData = empresaDoc.data();
    console.log('✅ Empresa encontrada:', empresaId);

    // ============================================================
    //  PASO: Buscar categoría por código de invitación
    // ============================================================
    let categoriaId = null;
    let aporteEspecial = null;

    const categoriasSnapshot = await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('categoriasClientes')
      .where('codigoInvitacion', '==', codigo)
      .limit(1)
      .get();

    if (!categoriasSnapshot.empty) {
      const categoriaDoc = categoriasSnapshot.docs[0];
      const categoriaData = categoriaDoc.data();
      categoriaId = categoriaDoc.id;
      aporteEspecial = {
        tipo: categoriaData.aporteEspecial.tipo,
        valor: categoriaData.aporteEspecial.valor,
        aplicaA: categoriaData.aporteEspecial.aplicaA || ['Cervezas Polar']
      };
      console.log('✅ Categoría encontrada por código:', categoriaData.nombre);
    } else {
      const empresaDataTemp = empresaDoc.data();
      categoriaId = empresaDataTemp.categoriaPorDefectoId || null;
      if (categoriaId) {
        const categoriaDefaultDoc = await firebase.firestore()
          .collection('empresas')
          .doc(empresaId)
          .collection('categoriasClientes')
          .doc(categoriaId)
          .get();
        if (categoriaDefaultDoc.exists) {
          const defaultData = categoriaDefaultDoc.data();
          aporteEspecial = {
            tipo: defaultData.aporteEspecial.tipo,
            valor: defaultData.aporteEspecial.valor || 0,
            aplicaA: defaultData.aporteEspecial.aplicaA || ['Cervezas Polar']
          };
          console.log('✅ Usando categoría por defecto:', defaultData.nombre);
        }
      }
    }

    if (!categoriaId) {
      console.warn('⚠️ No hay categoría por defecto, creando una...');
      const newDefault = {
        nombre: 'Cliente Regular',
        descripcion: 'Categoría automática (sin convenio)',
        codigoInvitacion: '',
        activa: true,
        aporteEspecial: {
          tipo: 'porcentaje_liquido',
          valor: 0,
          aplicaA: ['Cervezas Polar']
        },
        creado: firebase.firestore.FieldValue.serverTimestamp(),
        modificado: firebase.firestore.FieldValue.serverTimestamp()
      };
      const newRef = await firebase.firestore()
        .collection('empresas')
        .doc(empresaId)
        .collection('categoriasClientes')
        .add(newDefault);
      categoriaId = newRef.id;
      aporteEspecial = { tipo: 'porcentaje_liquido', valor: 0, aplicaA: ['Cervezas Polar'] };
    }

    // Crear perfil con nuevos campos
    await firebase.firestore()
      .collection('userProfiles')
      .doc(user.uid)
      .set({
        uid: user.uid,
        nombre: nombre,
        email: email,
        rol: 'cliente',
        empresaId: empresaId,
        categoriaClienteId: categoriaId,
        aportePersonalizado: null,
        fechaAsignacionCategoria: firebase.firestore.FieldValue.serverTimestamp(),
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });
    console.log('✅ Perfil creado');

    await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('clientes')
      .doc(user.uid)
      .set({
        nombre: nombre,
        email: email,
        uid: user.uid,
        creado: firebase.firestore.FieldValue.serverTimestamp(),
        tag: 'nuevo',
        phone: '',
        compras: '$0.00',
        pedidos: 0,
        categoriaId: categoriaId,
        aporteEspecial: aporteEspecial,
        liquidoPendiente: {
          total: 0,
          ultimaLiquidacion: null
        },
       historialCambios: [
          {
            fecha: new Date().toISOString(), // ✅ Usar string ISO en lugar de FieldValue
            categoriaId: categoriaId,
            aporteValor: aporteEspecial.valor,
            motivo: 'Registro inicial'
          }
        ]
      });
    console.log('✅ Cliente creado con categoría y aporte');

    sessionStorage.setItem('empresaId', empresaId);
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userName', nombre);
    sessionStorage.setItem('userRol', 'cliente');

    showToast(`✅ ¡Bienvenido a ${empresaData.nombre || 'tu franquicia'}!`);
    setTimeout(() => window.location.reload(), 1500);

  } catch (error) {
    console.error('❌ Error registrando cliente:', error);
    if (user && !empresaId) {
      try { await user.delete(); } catch(e) {}
    }
    if (error.code === 'auth/email-already-in-use') {
      showToast('❌ Este correo ya está registrado');
    } else if (error.code === 'auth/invalid-email') {
      showToast('❌ Correo electrónico inválido');
    } else if (error.code === 'auth/weak-password') {
      showToast('❌ La contraseña debe tener al menos 6 caracteres');
    } else {
      showToast('❌ Error: ' + error.message);
    }
    if (btn) btn.disabled = false;
  } finally {
    _registrando = false;
  }
}

async function loginUnificado() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!email || !password) {
    showToast('❌ Ingresa correo y contraseña');
    return;
  }
  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const perfilDoc = await firebase.firestore()
      .collection('userProfiles').doc(user.uid)
      .get();
    if (!perfilDoc.exists) {
      showToast('❌ Perfil de usuario no encontrado');
      await firebase.auth().signOut();
      return;
    }
    const perfil = perfilDoc.data();
    const empresaId = perfil.empresaId;
    const rol = perfil.rol;
    const nombre = perfil.nombre || email;
    sessionStorage.setItem('empresaId', empresaId);
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userName', nombre);
    sessionStorage.setItem('userRol', rol);
    forzarCierreModal('modal-login', true);
    forzarReflowBody();
    await new Promise(r => setTimeout(r, 100));
    setTimeout(() => { window.location.reload(); }, 300);
  } catch (error) {
    console.error('❌ Error en login:', error);
    if (error.code === 'auth/user-not-found') {
      showToast('❌ Usuario no registrado');
    } else if (error.code === 'auth/wrong-password') {
      showToast('❌ Contraseña incorrecta');
    } else if (error.code === 'auth/invalid-email') {
      showToast('❌ Correo inválido');
    } else {
      showToast('❌ Error: ' + error.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  FUNCIONES DE NAVEGACIÓN Y RENDERIZADO (BÁSICAS)
// ═══════════════════════════════════════════════════════════════
async function mostrarCodigoInvitacion() {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { showToast('⚠️ No hay franquicia seleccionada'); return; }
  try {
    const doc = await firebase.firestore().collection('empresas').doc(empresaId).get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById('codigo-display').textContent = data.codigoAcceso || '------';
      abrirModalId('modal-codigo');
    }
  } catch (error) {
    handleError(error, 'Error cargando código');
  }
}

function copiarCodigo() {
  const codigo = document.getElementById('codigo-display').textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(codigo).then(() => showToast('📋 Código copiado'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = codigo;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 Código copiado');
  }
}

async function regenerarCodigo() {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) return;
  const nuevoCodigo = generarCodigoAcceso();
  try {
    await firebase.firestore().collection('empresas').doc(empresaId).update({
      codigoAcceso: nuevoCodigo
    });
    document.getElementById('codigo-display').textContent = nuevoCodigo;
    showToast('🔄 Código regenerado');
  } catch (error) {
    handleError(error, 'Error regenerando código');
  }
}

// ================================================================
//  FUNCIÓN goScreen MODIFICADA (con control de rol)
// ================================================================
function goScreen(name) {
  const userRol = sessionStorage.getItem('userRol');

  if (userRol === 'cliente' && name !== 'cliente') {
    console.warn('⚠️ Cliente intentó acceder a pantalla admin:', name);
    name = 'cliente';
  }

  screens.forEach(s => {
    const screenEl = document.getElementById('screen-' + s);
    if (screenEl) screenEl.classList.toggle('active', s === name);
    const navEl = document.getElementById('nav-' + s);
    if (navEl) navEl.classList.toggle('active', s === name);
  });
  currentScreen = name;

  const bottomNav = document.getElementById('bottom-nav');
  const fabBtn = document.getElementById('fab-btn');
  if (userRol === 'cliente') {
    if (bottomNav) bottomNav.style.display = 'none';
    if (fabBtn) fabBtn.style.display = 'none';
  } else {
    if (name === 'cliente') {
      if (bottomNav) bottomNav.style.display = 'none';
      if (fabBtn) fabBtn.style.display = 'none';
    } else {
      if (bottomNav) bottomNav.style.display = 'flex';
      if (fabBtn) fabBtn.style.display = 'flex';
    }
  }

  const fabLabels = {
    dashboard: '＋',
    ventas: '＋',
    inventario: '＋',
    clientes: '＋',
    reportes: '⬇',
    configuracion: '⚙️'
  };
  if (fabBtn && userRol !== 'cliente') {
    fabBtn.textContent = fabLabels[name] || '＋';
  }

  const bienvenida = document.getElementById('screen-bienvenida');
  if (bienvenida) bienvenida.classList.remove('active');

  if (name === 'cliente') {
    if (sessionStorage.getItem('empresaId')) {
      mostrarPanelCliente();
    } else {
      showToast('⚠️ Inicia sesión primero');
      mostrarPantallaBienvenida();
    }
    return;
  }

  // Lógica admin
  if (name === 'ventas') {
    const empresaId = sessionStorage.getItem('empresaId');
    if (empresaId) {
      store.lastVentaDoc = null;
      store.hasMoreVentas = true;
      setTimeout(async () => {
        try {
          const data = await store.cargarVentasPaginado(empresaId, ITEMS_POR_PAGINA);
          store.ventas = data.items;
          store.lastVentaDoc = data.lastDoc;
          syncGlobals();
          renderVentas('', filtroVentas, false);
          updateKPIs();
          if (typeof renderChartVentas === 'function') renderChartVentas();
        } catch (error) {
          console.warn('Error recargando ventas:', error);
        }
      }, 100);
    }
    renderVentas('', filtroVentas, false);
  }

  if (name === 'inventario') {
    store.lastInventarioDoc = null;
    store.hasMoreInventario = true;
    renderInv('', filtroInv, false);
  }

  if (name === 'clientes') {
    const empresaId = sessionStorage.getItem('empresaId');
    if (empresaId) {
      store.lastClienteDoc = null;
      store.hasMoreClientes = true;
      setTimeout(async () => {
        try {
          const data = await store.cargarClientesPaginado(empresaId, ITEMS_POR_PAGINA);
          store.clientes = data.items;
          store.lastClienteDoc = data.lastDoc;
          syncGlobals();
          renderClients('', filtroCli, false);
          updateKPIs();
        } catch (error) {
          console.warn('Error recargando clientes:', error);
          showToast('⚠️ Error al cargar clientes. Recarga la página.');
        }
      }, 100);
    }
    renderClients('', filtroCli, false);
  }

  if (name === 'reportes') {
    renderReportes('semana');
  }

  if (name === 'configuracion') {
    actualizarResumenConfiguracion();
    setTimeout(() => {
      renderizarTablaProductos();
      renderizarTablaClientes();
      renderizarTablaVentas();
      // Nueva pestaña categorías se carga bajo demanda
    }, 300);
  }

  if (name === 'dashboard') {
    const empresaId = sessionStorage.getItem('empresaId');
    if (empresaId && sessionStorage.getItem('userRol') === 'admin') {
      if (store.clientes.length === 0) {
        setTimeout(async () => {
          try {
            const data = await store.cargarClientesPaginado(empresaId, ITEMS_POR_PAGINA);
            store.clientes = data.items;
            store.lastClienteDoc = data.lastDoc;
            syncGlobals();
            updateKPIs();
            if (typeof renderChartVentas === 'function') renderChartVentas();
          } catch (error) {
            console.warn('Error recargando clientes desde dashboard:', error);
          }
        }, 100);
      } else {
        setTimeout(() => {
          updateKPIs();
          if (typeof renderChartVentas === 'function') renderChartVentas();
        }, 100);
      }
    } else {
      setTimeout(() => {
        updateKPIs();
        if (typeof renderChartVentas === 'function') renderChartVentas();
      }, 100);
    }
  }
}

function filterChip(el, ctx) {
  const chips = el.closest('.chips').querySelectorAll('.chip');
  chips.forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const valor = el.textContent.toLowerCase();
  
  if (ctx === 'ventas') {
    filtroVentas = valor === 'todas' ? 'todas' : valor;
    store.lastVentaDoc = null;
    store.hasMoreVentas = true;
    renderVentas(document.getElementById('venta-search').value, filtroVentas, false);
  } else if (ctx === 'inv') {
    filtroInv = valor === 'todos' ? 'todos' : valor;
    store.lastInventarioDoc = null;
    store.hasMoreInventario = true;
    renderInv(document.getElementById('inv-search').value, filtroInv, false);
  } else if (ctx === 'cli') {
    filtroCli = valor === 'todos' ? 'todos' : valor;
    store.lastClienteDoc = null;
    store.hasMoreClientes = true;
    renderClients(document.getElementById('client-search').value, filtroCli, false);
  }
  showToast('Filtro: ' + el.textContent);
}

function filterVentas() {
  store.lastVentaDoc = null;
  store.hasMoreVentas = true;
  const searchValue = document.getElementById('venta-search')?.value || '';
  renderVentas(searchValue, filtroVentas, false);
}

function filterInv() {
  store.lastInventarioDoc = null;
  store.hasMoreInventario = true;
  const searchValue = document.getElementById('inv-search')?.value || '';
  renderInv(searchValue, filtroInv, false);
}

function filterClients() {
  store.lastClienteDoc = null;
  store.hasMoreClientes = true;
  const searchValue = document.getElementById('client-search')?.value || '';
  renderClients(searchValue, filtroCli, false);
}

function switchReportTab(el, period) {
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderReportes(period);
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.textContent = isDark ? '☀️' : '🌙';
}

function loadTheme() {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.textContent = '☀️';
  }
}

// ═══════════════════════════════════════════════════════════════
//  CRUD DE VENTAS, PRODUCTOS Y CLIENTES
// ═══════════════════════════════════════════════════════════════
async function guardarVenta() {
  const cliente = document.getElementById('input-cliente')?.value?.trim() || '';
  const producto = document.getElementById('input-producto')?.value?.trim() || '';
  const cantidad = parseInt(document.getElementById('input-cantidad')?.value) || 1;
  const precioUnit = parseFloat(document.getElementById('input-precio')?.value?.replace('$', '')) || 0;
  const metodo = document.getElementById('input-metodo')?.value || 'Efectivo';
  const notas = document.getElementById('input-notas')?.value || '';
  if (!cliente) { showToast('⚠️ Ingresa el nombre del cliente'); return; }
  if (!producto) { showToast('⚠️ Ingresa el nombre del producto'); return; }
  if (precioUnit <= 0) { showToast('⚠️ Ingresa un precio válido'); return; }
  const total = precioUnit * cantidad;
  const nuevaVenta = {
    cliente, producto, items: cantidad, total: formatCurrency(total),
    status: 'pagado', metodo, notas
  };
  try {
    await store.addVenta(nuevaVenta);
    syncGlobals();
    renderVentas('', filtroVentas, 1);
    renderActividadReciente();
    updateKPIs();
    closeModal();
    showToast('✅ Venta registrada con éxito');
  } catch (error) {
    handleError(error);
  }
}

async function guardarProducto() {
  const nombre = document.getElementById('input-nombre')?.value?.trim() || '';
  const cat = document.getElementById('input-categoria')?.value || 'General';
  const precioVenta = parseFloat(document.getElementById('input-precio-venta')?.value) || 0;
  const stock = parseInt(document.getElementById('input-stock')?.value) || 0;
  const stockMin = parseInt(document.getElementById('input-stock-min')?.value) || 5;
  if (!nombre) { showToast('⚠️ Ingresa el nombre del producto'); return; }
  if (precioVenta <= 0) { showToast('⚠️ Ingresa un precio válido'); return; }
  const iconMap = { 
    'Cervezas Polar': '🍺', 
    'Alimentos Polar': '🥫', 
    'Bebidas': '☕', 
    'Dulces': '🍫', 
    'Endulzantes': '🍯', 
    'Básicos': '🧂', 
    'Granos': '🫘', 
    'Lácteos': '🧀', 
    'Cocina': '🫙' 
  };
  const icon = iconMap[cat] || '📦';
  let estado = 'ok';
  if (stock === 0) estado = 'out';
  else if (stock <= stockMin) estado = 'low';
  const nuevoProducto = { nombre, cat, precio: formatCurrency(precioVenta), stock, icon, estado };
  try {
    await store.addProducto(nuevoProducto);
    syncGlobals();
    renderInv('', filtroInv, 1);
    closeModal();
    showToast('✅ Producto agregado con éxito');
  } catch (error) {
    handleError(error);
  }
}

async function guardarCliente() {
  const nombre = document.getElementById('input-cliente-nombre')?.value?.trim() || '';
  const apellido = document.getElementById('input-cliente-apellido')?.value?.trim() || '';
  const telefono = document.getElementById('input-cliente-telefono')?.value?.trim() || '';
  const nombreCompleto = (nombre + ' ' + apellido).trim();
  if (!nombreCompleto) { showToast('⚠️ El nombre es obligatorio'); return; }
  const init = nombreCompleto.split(' ').map(p => p.charAt(0).toUpperCase()).join('');
  const colores = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA', '#E11D48'];
  const color = colores[Math.floor(Math.random() * colores.length)];
  const nuevoCliente = { nombre: nombreCompleto, phone: telefono, compras: '$0.00', pedidos: 0, tag: 'nuevo', color, init };
  try {
    await store.addCliente(nuevoCliente);
    syncGlobals();
    renderClients('', filtroCli, 1);
    closeModal();
    showToast('✅ Cliente registrado con éxito');
  } catch (error) {
    handleError(error);
  }
}

function editVenta(id) {
  const v = store.ventas.find(item => item.id === id);
  if (!v) return showToast('Venta no encontrada');
  const body = `
    <div class="field"><label>Cliente</label><input type="text" value="${v.cliente}" id="edit-cliente"></div>
    <div class="field"><label>Producto</label><input type="text" value="${v.producto || ''}" id="edit-producto"></div>
    <div class="row">
      <div class="field"><label>Cantidad</label><input type="number" value="${v.items}" id="edit-cantidad"></div>
      <div class="field"><label>Precio unit.</label><input type="text" value="${(parseFloat(v.total.replace('$','')) / v.items).toFixed(2)}" id="edit-precio"></div>
    </div>
    <div class="field"><label>Método de pago</label>
      <select id="edit-metodo">
        <option ${v.metodo === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
        <option ${v.metodo === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
        <option ${v.metodo === 'Pago Móvil' ? 'selected' : ''}>Pago Móvil</option>
        <option ${v.metodo === 'Divisas' ? 'selected' : ''}>Divisas</option>
      </select>
    </div>
    <div class="field"><label>Notas</label><textarea id="edit-notas">${v.notas || ''}</textarea></div>
    <button class="btn btn-primary" onclick="updateVentaFromModal('${id}')">Actualizar venta</button>
    <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
  `;
  openModalWithContent('Editar venta', body);
}

async function updateVentaFromModal(id) {
  const cliente = document.getElementById('edit-cliente').value.trim();
  const producto = document.getElementById('edit-producto').value.trim();
  const cantidad = parseInt(document.getElementById('edit-cantidad').value) || 1;
  const precioUnit = parseFloat(document.getElementById('edit-precio').value.replace('$','')) || 0;
  const metodo = document.getElementById('edit-metodo').value;
  const notas = document.getElementById('edit-notas').value;
  const total = precioUnit * cantidad;
  if (!cliente) { showToast('⚠️ El cliente es obligatorio'); return; }
  const updates = { cliente, producto, items: cantidad, total: formatCurrency(total), metodo, notas };
  try {
    await store.updateVenta(id, updates);
    syncGlobals();
    renderVentas('', filtroVentas, 1);
    renderActividadReciente();
    updateKPIs();
    closeModal();
    showToast('✅ Venta actualizada');
  } catch (error) {
    handleError(error);
  }
}

function editProducto(nombre) {
  const p = store.inventario.find(item => item.nombre === nombre);
  if (!p) return showToast('Producto no encontrado');
  let precioStr = p.precio;
  if (typeof precioStr !== 'string') {
    precioStr = formatCurrency(Number(precioStr));
  }
  if (!precioStr.startsWith('$')) {
    precioStr = '$' + precioStr;
  }
  const precioNum = parseFloat(precioStr.replace('$', '')) || 0;
  const body = `
    <div class="field"><label>Nombre</label><input type="text" value="${p.nombre}" id="edit-nombre"></div>
    <div class="field"><label>Categoría</label>
      <select id="edit-cat">
  <option ${p.cat === 'Cervezas Polar' ? 'selected' : ''}>Cervezas Polar</option>
  <option ${p.cat === 'Alimentos Polar' ? 'selected' : ''}>Alimentos Polar</option>
  <option ${p.cat === 'Bebidas' ? 'selected' : ''}>Bebidas</option>
  <option ${p.cat === 'Dulces' ? 'selected' : ''}>Dulces</option>
  <option ${p.cat === 'Endulzantes' ? 'selected' : ''}>Endulzantes</option>
  <option ${p.cat === 'Básicos' ? 'selected' : ''}>Básicos</option>
  <option ${p.cat === 'Granos' ? 'selected' : ''}>Granos</option>
  <option ${p.cat === 'Lácteos' ? 'selected' : ''}>Lácteos</option>
  <option ${p.cat === 'Cocina' ? 'selected' : ''}>Cocina</option>
  <option ${p.cat === 'Salsas' ? 'selected' : ''}>Salsas</option>
  <option ${p.cat === 'Harinas' ? 'selected' : ''}>Harinas</option>
  <option ${p.cat === 'Conservas' ? 'selected' : ''}>Conservas</option>
</select>
    </div>
    <div class="row">
      <div class="field"><label>Precio</label><input type="text" value="${precioNum}" id="edit-precio"></div>
      <div class="field"><label>Stock</label><input type="number" value="${p.stock}" id="edit-stock"></div>
    </div>
    <button class="btn btn-primary" onclick="updateProductoFromModal('${nombre}')">Actualizar producto</button>
    <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
  `;
  openModalWithContent('Editar producto', body);
}

async function updateProductoFromModal(nombreOriginal) {
  const nombre = document.getElementById('edit-nombre').value.trim();
  const cat = document.getElementById('edit-cat').value;
  const precio = parseFloat(document.getElementById('edit-precio').value) || 0;
  const stock = parseInt(document.getElementById('edit-stock').value) || 0;
  if (!nombre) { showToast('⚠️ El nombre es obligatorio'); return; }
  let estado = 'ok';
  if (stock === 0) estado = 'out';
  else if (stock <= 5) estado = 'low';
  const updates = { nombre, cat, precio: formatCurrency(precio), stock, estado };
  const producto = store.inventario.find(p => p.nombre === nombreOriginal);
  if (!producto) { showToast('⚠️ Producto no encontrado'); return; }
  try {
    await store.updateProducto(producto.id, updates);
    syncGlobals();
    renderInv('', filtroInv, 1);
    closeModal();
    showToast('✅ Producto actualizado');
  } catch (error) {
    handleError(error);
  }
}

// ================================================================
//  FUNCIÓN editCliente AMPLIADA (con categoría y aporte)
// ================================================================
async function editCliente(nombre) {
  const c = store.clientes.find(item => item.nombre === nombre);
  if (!c) return showToast('Cliente no encontrado');

  // Cargar categorías activas para el selector
  const empresaId = sessionStorage.getItem('empresaId');
  let categoriasHTML = '<option value="">Sin categoría</option>';
  if (empresaId) {
    try {
      const snapshot = await firebase.firestore()
        .collection('empresas').doc(empresaId)
        .collection('categoriasClientes')
        .where('activa', '==', true)
        .orderBy('nombre')
        .get();

      snapshot.forEach(doc => {
        const data = doc.data();
        const selected = doc.id === c.categoriaId ? 'selected' : '';
        categoriasHTML += `<option value="${doc.id}" ${selected}>${escapeHtml(data.nombre)} (${data.aporteEspecial?.valor || 0}%)</option>`;
      });
    } catch (e) {
      console.warn('Error cargando categorías:', e);
    }
  }

  const aportePersonalizado = c.aporteEspecial?.valor || '';
  const liquidoPendiente = c.liquidoPendiente?.total || 0;

  const body = `
    <div class="field"><label>Nombre</label><input type="text" value="${escapeHtml(c.nombre)}" id="edit-nombre"></div>
    <div class="field"><label>Teléfono</label><input type="text" value="${escapeHtml(c.phone)}" id="edit-phone"></div>
    <div class="field"><label>Etiqueta</label>
      <select id="edit-tag">
        <option ${c.tag === 'vip' ? 'selected' : ''}>vip</option>
        <option ${c.tag === 'regular' ? 'selected' : ''}>regular</option>
        <option ${c.tag === 'nuevo' ? 'selected' : ''}>nuevo</option>
      </select>
    </div>
    <div class="field">
      <label>Categoría</label>
      <select id="edit-categoria">
        ${categoriasHTML}
      </select>
      <small style="color:var(--text3); font-size:11px;">Selecciona una categoría para definir el aporte especial</small>
    </div>
    <div class="field">
      <label>Aporte personalizado (%)</label>
      <input type="number" id="edit-aporte-personalizado" value="${aportePersonalizado}" min="0" max="100" placeholder="Dejar vacío para usar el de la categoría">
      <small style="color:var(--text3); font-size:11px;">Si se llena, prevalece sobre el porcentaje de la categoría</small>
    </div>
    <div style="background:var(--surface2); padding:10px; border-radius:var(--radius-sm); margin-bottom:12px;">
      <strong>📦 Líquido pendiente:</strong> ${liquidoPendiente} unidades
    </div>
    <button class="btn btn-primary" onclick="updateClienteFromModal('${escapeJsString(c.nombre)}')">Actualizar cliente</button>
    <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
  `;

  openModalWithContent('Editar cliente', body);
}

// ================================================================
//  FUNCIÓN updateClienteFromModal AMPLIADA
// ================================================================
async function updateClienteFromModal(nombreOriginal) {
  const nombre = document.getElementById('edit-nombre').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const tag = document.getElementById('edit-tag').value;
  const categoriaId = document.getElementById('edit-categoria').value || null;
  const aportePersonalizado = document.getElementById('edit-aporte-personalizado').value.trim();

  if (!nombre) { showToast('⚠️ El nombre es obligatorio'); return; }

  const cliente = store.clientes.find(c => c.nombre === nombreOriginal);
  if (!cliente) { showToast('⚠️ Cliente no encontrado'); return; }

  // Construir objeto de actualización
  const updates = { nombre, phone, tag };

  // Si cambió la categoría o el aporte personalizado, registrar historial
  let categoriaCambio = false;
  let historialEntry = null;

  // Obtener datos actuales del cliente
  const perfilDoc = await firebase.firestore()
    .collection('userProfiles')
    .doc(cliente.id)
    .get();
  const perfil = perfilDoc.data();

  const categoriaAnterior = cliente.categoriaId || null;
  const aporteAnterior = cliente.aporteEspecial?.valor || null;
  const aportePersonalizadoAnterior = perfil?.aportePersonalizado?.valor || null;

  // Determinar nuevo aporte efectivo
  let nuevoAporteValor = null;
  if (aportePersonalizado !== '') {
    const val = parseFloat(aportePersonalizado);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      nuevoAporteValor = val;
    } else {
      showToast('⚠️ Ingresa un porcentaje válido (0-100) o déjalo vacío');
      return;
    }
  }

  // Si hay cambio de categoría o aporte personalizado, registrar historial
  if (categoriaId !== categoriaAnterior || nuevoAporteValor !== aportePersonalizadoAnterior) {
    categoriaCambio = true;
    // Obtener nombre de la nueva categoría (si existe)
    let nuevoNombreCategoria = null;
    if (categoriaId) {
      const catDoc = await firebase.firestore()
        .collection('empresas').doc(sessionStorage.getItem('empresaId'))
        .collection('categoriasClientes').doc(categoriaId)
        .get();
      if (catDoc.exists) nuevoNombreCategoria = catDoc.data().nombre;
    }

    historialEntry = {
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      categoriaId: categoriaId,
      categoriaNombre: nuevoNombreCategoria || 'Sin categoría',
      aporteValor: nuevoAporteValor !== null ? nuevoAporteValor : (categoriaId ? null : 0),
      motivo: 'Cambio manual por administrador'
    };
  }

  // Actualizar cliente en Firestore
  try {
    // 1. Actualizar cliente (subcolección)
    await store.updateCliente(cliente.id, {
      nombre,
      phone,
      tag,
      categoriaId: categoriaId,
      // Si se especifica aporte personalizado, guardarlo; si no, mantener el de la categoría o null
      aporteEspecial: {
        tipo: 'porcentaje_liquido',
        valor: nuevoAporteValor !== null ? nuevoAporteValor : (categoriaId ? null : 0),
        aplicaA: ['Cervezas Polar']
      }
    });

    // 2. Actualizar userProfiles
    const userUpdates = {
      categoriaClienteId: categoriaId,
      fechaAsignacionCategoria: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (nuevoAporteValor !== null) {
      userUpdates.aportePersonalizado = {
        valor: nuevoAporteValor,
        modificadoPor: sessionStorage.getItem('userName') || 'admin',
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      };
    } else {
      // Si se dejó vacío, eliminar el aporte personalizado
      userUpdates.aportePersonalizado = null;
    }
    await firebase.firestore()
      .collection('userProfiles')
      .doc(cliente.id)
      .update(userUpdates);

    // 3. Registrar historial si hubo cambio
    if (categoriaCambio && historialEntry) {
      await firebase.firestore()
        .collection('empresas').doc(sessionStorage.getItem('empresaId'))
        .collection('clientes').doc(cliente.id)
        .update({
          historialCambios: firebase.firestore.FieldValue.arrayUnion(historialEntry)
        });
    }

    // 4. Actualizar store local
    const index = store.clientes.findIndex(c => c.id === cliente.id);
    if (index !== -1) {
      store.clientes[index] = { ...store.clientes[index], ...updates, categoriaId, aporteEspecial: { tipo: 'porcentaje_liquido', valor: nuevoAporteValor !== null ? nuevoAporteValor : (categoriaId ? null : 0), aplicaA: ['Cervezas Polar'] } };
      syncGlobals();
    }

    renderClients('', filtroCli, 1);
    closeModal();
    showToast('✅ Cliente actualizado');
  } catch (error) {
    handleError(error, 'Error actualizando cliente');
  }
}

function confirmDeleteVenta(id) {
  openConfirmModal('¿Seguro que deseas eliminar esta venta?', async () => {
    try {
      await store.deleteVenta(id);
      syncGlobals();
      renderVentas('', filtroVentas, 1);
      renderActividadReciente();
      updateKPIs();
      showToast('🗑️ Venta eliminada');
    } catch (error) {
      handleError(error);
    }
  });
}

function confirmDeleteProducto(nombre) {
  const producto = store.inventario.find(p => p.nombre === nombre);
  if (!producto) { showToast('⚠️ Producto no encontrado'); return; }
  openConfirmModal('¿Seguro que deseas eliminar este producto?', async () => {
    try {
      await store.deleteProducto(producto.id);
      syncGlobals();
      renderInv('', filtroInv, 1);
      showToast('🗑️ Producto eliminado');
    } catch (error) {
      handleError(error);
    }
  });
}

function confirmDeleteCliente(nombre) {
  const cliente = store.clientes.find(c => c.nombre === nombre);
  if (!cliente) { showToast('⚠️ Cliente no encontrado'); return; }
  openConfirmModal('¿Seguro que deseas eliminar este cliente?', async () => {
    try {
      await store.deleteCliente(cliente.id);
      syncGlobals();
      renderClients('', filtroCli, 1);
      showToast('🗑️ Cliente eliminado');
    } catch (error) {
      handleError(error);
    }
  });
}

const modals = {
  ventas: {
    title: 'Nueva venta',
    body: `
      <div class="field"><label>Cliente</label><input type="text" placeholder="Nombre del cliente" id="input-cliente"></div>
      <div class="field"><label>Producto(s)</label><input type="text" placeholder="Buscar producto..." id="input-producto"></div>
      <div class="row">
        <div class="field"><label>Cantidad</label><input type="number" placeholder="1" min="1" id="input-cantidad"></div>
        <div class="field"><label>Precio unit.</label><input type="text" placeholder="$0.00" id="input-precio"></div>
      </div>
      <div class="field"><label>Método de pago</label>
        <select id="input-metodo"><option>Efectivo</option><option>Transferencia</option><option>Pago Móvil</option><option>Divisas</option></select>
      </div>
      <div class="field"><label>Notas</label><textarea placeholder="Observaciones opcionales..." id="input-notas"></textarea></div>
      <button class="btn btn-primary" onclick="guardarVenta()">Registrar venta</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    `
  },
  inventario: {
    title: 'Nuevo producto',
    body: `
      <div class="field"><label>Nombre del producto</label><input type="text" placeholder="Ej: Café Caracas 250g" id="input-nombre"></div>
      <div class="field"><label>Categoría</label>
        <select id="input-categoria">
  <option>Cervezas Polar</option>
  <option>Alimentos Polar</option>
  <option>Bebidas</option>
  <option>Básicos</option>
  <option>Granos</option>
  <option>Lácteos</option>
  <option>Dulces</option>
  <option>Cocina</option>
        </select>
      </div>
      <div class="row">
        <div class="field"><label>Precio venta</label><input type="text" placeholder="$0.00" id="input-precio-venta"></div>
        <div class="field"><label>Precio costo</label><input type="text" placeholder="$0.00" id="input-precio-costo"></div>
      </div>
      <div class="row">
        <div class="field"><label>Stock inicial</label><input type="number" placeholder="0" min="0" id="input-stock"></div>
        <div class="field"><label>Stock mínimo</label><input type="number" placeholder="5" min="0" id="input-stock-min"></div>
      </div>
      <div class="field"><label>Código / referencia</label><input type="text" placeholder="SKU o código de barras" id="input-ref"></div>
      <button class="btn btn-primary" onclick="guardarProducto()">Agregar producto</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    `
  },
  clientes: {
    title: 'Nuevo cliente',
    body: `
      <div class="row">
        <div class="field"><label>Nombre</label><input type="text" placeholder="Nombre" id="input-cliente-nombre"></div>
        <div class="field"><label>Apellido</label><input type="text" placeholder="Apellido" id="input-cliente-apellido"></div>
      </div>
      <div class="field"><label>Teléfono</label><input type="tel" placeholder="+58 412 000 0000" id="input-cliente-telefono"></div>
      <div class="field"><label>Correo electrónico</label><input type="email" placeholder="correo@ejemplo.com" id="input-cliente-email"></div>
      <div class="field"><label>Dirección</label><input type="text" placeholder="Dirección (opcional)" id="input-cliente-direccion"></div>
      <div class="field"><label>Notas</label><textarea placeholder="Preferencias, detalles..." id="input-cliente-notas"></textarea></div>
      <button class="btn btn-primary" onclick="guardarCliente()">Guardar cliente</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    `
  },
  reportes: {
    title: 'Exportar reporte',
    body: `
      <div class="field"><label>Período</label>
        <select><option>Esta semana</option><option>Este mes</option><option>Mes anterior</option><option>Rango personalizado</option></select>
      </div>
      <div class="field"><label>Módulo</label>
        <select><option>Ventas</option><option>Inventario</option><option>Clientes</option><option>Completo</option></select>
      </div>
      <div class="field"><label>Formato</label>
        <select><option>PDF</option><option>Excel</option><option>CSV</option></select>
      </div>
      <button class="btn btn-primary" onclick="guardarReporte()">Generar reporte</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    `
  },
  dashboard: {
    title: 'Acciones rápidas',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <button class="btn btn-primary" style="height:56px;font-size:13px" onclick="goScreen('ventas');closeModal();setTimeout(openModal,100)">🛒 Nueva venta</button>
        <button class="btn btn-outline" style="height:56px;font-size:13px;border-color:var(--border)" onclick="goScreen('inventario');closeModal();setTimeout(openModal,100)">📦 Producto</button>
        <button class="btn btn-outline" style="height:56px;font-size:13px;border-color:var(--border)" onclick="goScreen('clientes');closeModal();setTimeout(openModal,100)">👤 Cliente</button>
        <button class="btn btn-outline" style="height:56px;font-size:13px;border-color:var(--border)" onclick="showToast('Escáner de código en desarrollo');closeModal()">📷 Escanear</button>
      </div>
      <button class="btn btn-outline" onclick="closeModal()">Cerrar</button>
    `
  }
};

function openModal() {
  const m = modals[currentScreen] || modals.dashboard;
  document.getElementById('modal-title').textContent = m.title;
  document.getElementById('modal-body').innerHTML = m.body;
  abrirModalId('modal');
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget && e.target !== document.getElementById('modal')) return;
  forzarCierreModal('modal');
}

function openModalWithContent(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  abrirModalId('modal');
}

function confirmAction() {
  if (typeof window._confirmAction === 'function') {
    window._confirmAction();
    window._confirmAction = null;
  }
  closeModal();
}

function openConfirmModal(mensaje, callback) {
  window._confirmAction = callback;
  const body = `
    <p style="margin-bottom:16px; font-size:15px;">${mensaje}</p>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-danger" onclick="confirmAction()">Sí, eliminar</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  `;
  openModalWithContent('Confirmar acción', body);
}

function toggleCliente() {
  const userRol = sessionStorage.getItem('userRol');
  if (userRol === 'cliente') {
    showToast('🔒 Ya estás en el modo cliente');
    return;
  }
  const current = document.querySelector('.screen.active');
  if (current && current.id === 'screen-cliente') {
    goScreen('dashboard');
  } else {
    goScreen('cliente');
    cargarCarrito();
    actualizarCarritoCount();
  }
}

function cerrarSesion() {
  firebase.auth().signOut();
  sessionStorage.clear();
  localStorage.removeItem('empresaInventario');
  localStorage.removeItem('empresaClientes');
  localStorage.removeItem('empresaVentas');

  const adminMenu = document.getElementById('admin-menu');
  const btnCodigo = document.getElementById('btn-codigo');
  if (adminMenu) adminMenu.style.display = 'none';
  if (btnCodigo) btnCodigo.style.display = 'none';

  const btnLogout = document.getElementById('btn-logout-cliente');
  if (btnLogout) btnLogout.style.display = 'none';

  const btnCliente = document.getElementById('btn-cliente');
  if (btnCliente) btnCliente.style.display = 'inline-flex';

  const logo = document.querySelector('.nav-logo span');
  if (logo) logo.textContent = 'Franquicia Polar';

  const panelDiv = document.getElementById('cliente-panel');
  if (panelDiv) panelDiv.style.display = 'none';

  showToast('👋 Sesión cerrada');
  mostrarPantallaBienvenida();
}

function actualizarAdminUI(nombre) {
  const adminMenu = document.getElementById('admin-menu');
  const avatar = document.getElementById('avatar-admin');
  const nombreEl = document.getElementById('admin-nombre');
  const btnCliente = document.getElementById('btn-cliente');
  const btnCodigo = document.getElementById('btn-codigo');
  const userRol = sessionStorage.getItem('userRol');

  if (userRol === 'cliente') {
    if (adminMenu) adminMenu.style.display = 'none';
    if (btnCliente) btnCliente.style.display = 'none';
    if (btnCodigo) btnCodigo.style.display = 'none';
    return;
  }

  if (nombre) {
    if (adminMenu) adminMenu.style.display = 'block';
    if (btnCliente) btnCliente.style.display = 'inline-flex';
    if (btnCodigo) btnCodigo.style.display = 'inline-flex';
    const iniciales = nombre.split(' ').map(p => p.charAt(0).toUpperCase()).join('').slice(0, 2);
    if (avatar) avatar.textContent = iniciales || 'A';
    if (nombreEl) nombreEl.textContent = nombre;
  } else {
    if (adminMenu) adminMenu.style.display = 'none';
    if (btnCliente) btnCliente.style.display = 'inline-flex';
    if (btnCodigo) btnCodigo.style.display = 'none';
  }
}

function toggleAdminMenu(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('admin-dropdown');
  const menu = document.getElementById('admin-menu');
  if (!dropdown || !menu) return;
  const isOpen = dropdown.style.display === 'block';
  dropdown.style.display = isOpen ? 'none' : 'block';
  menu.style.display = 'block';
}

function closeAdminMenu() {
  const dropdown = document.getElementById('admin-dropdown');
  if (dropdown) dropdown.style.display = 'none';
}

document.addEventListener('click', function(e) {
  const menu = document.getElementById('admin-menu');
  const dropdown = document.getElementById('admin-dropdown');
  if (!menu || !dropdown) return;
  if (dropdown.style.display !== 'block') return;
  if (!menu.contains(e.target)) {
    closeAdminMenu();
  }
});

function loginCliente() { return loginUnificado(); }
function registrarCliente() { return registrarClienteNuevo(); }
function mostrarRegistro() { mostrarRegistroCliente(); }
function mostrarLogin() { mostrarLoginUnificado(); }

// ================================================================
//  FUNCIÓN mostrarPanelCliente MODIFICADA
// ================================================================
async function mostrarPanelCliente() {
  const panelDiv = document.getElementById('cliente-panel');
  const nombreSpan = document.getElementById('cliente-nombre');
  if (panelDiv) panelDiv.style.display = 'block';

  const bottomNav = document.getElementById('bottom-nav');
  const fabBtn = document.getElementById('fab-btn');
  if (bottomNav) bottomNav.style.display = 'none';
  if (fabBtn) fabBtn.style.display = 'none';

  const adminMenu = document.getElementById('admin-menu');
  const btnCodigo = document.getElementById('btn-codigo');
  if (adminMenu) adminMenu.style.display = 'none';
  if (btnCodigo) btnCodigo.style.display = 'none';

  let btnLogout = document.getElementById('btn-logout-cliente');
  if (!btnLogout) {
    btnLogout = document.createElement('button');
    btnLogout.id = 'btn-logout-cliente';
    btnLogout.className = 'nav-icon-btn';
    btnLogout.innerHTML = '🚪';
    btnLogout.title = 'Cerrar sesión';
    btnLogout.onclick = cerrarSesion;
    const navRight = document.querySelector('.nav-right');
    if (navRight) navRight.appendChild(btnLogout);
  }
  btnLogout.style.display = 'inline-flex';

  const btnCliente = document.getElementById('btn-cliente');
  if (btnCliente) btnCliente.style.display = 'none';

  const nombre = sessionStorage.getItem('userName') || sessionStorage.getItem('userEmail');
  if (nombreSpan) nombreSpan.textContent = nombre;
  actualizarAvatar(nombre);

  const bienvenidaEl = document.getElementById('mensaje-bienvenida');
  if (bienvenidaEl && nombre) {
    bienvenidaEl.textContent = `Hola, ${nombre} 👋`;
  }

  await cargarInventarioCliente();
  renderCatalogo();
  await cargarHistorialCliente();
  actualizarCarritoCount();
  cargarMensajesChat();
  cargarAlertas();
}

async function cargarInventarioCliente() {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) return false;
  
  if (store.inventario && store.inventario.length > 0) {
    return true;
  }
  
  try {
    const data = await store.cargarInventarioPaginado(empresaId, 100);
    store.inventario = data.items;
    store.lastInventarioDoc = data.lastDoc;
    syncGlobals();
    return true;
  } catch (error) {
    console.error('Error cargando inventario para cliente:', error);
    return false;
  }
}

async function cargarHistorialCliente() {
  const empresaId = sessionStorage.getItem('empresaId');
  const user = firebase.auth().currentUser;
  if (!empresaId || !user) return;
  
  const perfilDoc = await firebase.firestore().collection('userProfiles').doc(user.uid).get();
  const nombreCliente = perfilDoc.exists ? perfilDoc.data().nombre : sessionStorage.getItem('userName');
  
  if (!nombreCliente) return;
  
  try {
    const snapshot = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('ventas')
      .where('cliente', '==', nombreCliente)
      .orderBy('fecha', 'desc')
      .get();
    
    const pedidos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.fecha && data.fecha.toDate) data.fecha = formatDateLocal(data.fecha.toDate());
      pedidos.push({ id: doc.id, ...data });
    });
    
    window.pedidosCliente = pedidos;
    
    const container = document.getElementById('historial-pedidos');
    if (!container) {
      console.warn('⚠️ Contenedor #historial-pedidos no encontrado, esperando...');
      setTimeout(() => {
        renderHistorialCliente(pedidos);
      }, 300);
      return;
    }
    
    renderHistorialCliente(pedidos);
  } catch (error) {
    console.error('Error cargando historial del cliente:', error);
    renderHistorialCliente([]);
  }
}

function renderHistorialCliente(pedidos = []) {
  const container = document.getElementById('historial-pedidos');
  if (!container) {
    console.warn('⚠️ Contenedor #historial-pedidos no encontrado');
    return;
  }
  
  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Aún no has realizado pedidos</div></div>`;
    return;
  }
  
  container.innerHTML = pedidos.map(v => `
    <div class="sale-card" style="cursor:default;">
      <div class="sale-header">
        <span class="sale-id">${escapeHtml(v.id)}</span>
        <span class="sale-status ${escapeHtml(v.status)}">${escapeHtml(v.status?.charAt(0).toUpperCase() + v.status?.slice(1) || 'Pendiente')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:4px;">
        <span>${escapeHtml(v.fecha || '')}</span>
        <span class="sale-total">${escapeHtml(v.total || '$0.00')}</span>
      </div>
      <div style="font-size:12px; color:var(--text3);">${escapeHtml(v.notas || 'Sin detalles')}</div>
    </div>
  `).join('');
}

// ================================================================
//  CONFIGURACIÓN DE DATOS DE PAGO
// ================================================================
async function cargarDatosPago() {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) return;
  try {
    const doc = await firebase.firestore().collection('empresas').doc(empresaId).get();
    if (doc.exists) {
      const data = doc.data();
      const pagos = data.datosPago || {};
      
      document.getElementById('pago-pmovil-telefono').value = pagos.pagoMovil?.telefono || '';
      document.getElementById('pago-pmovil-cedula').value = pagos.pagoMovil?.cedula || '';
      document.getElementById('pago-pmovil-banco').value = pagos.pagoMovil?.banco || '';
      
      document.getElementById('pago-zelle-email').value = pagos.zelle?.email || '';
      document.getElementById('pago-zelle-nombre').value = pagos.zelle?.nombre || '';
      
      document.getElementById('pago-transferencia-banco').value = pagos.transferencia?.banco || '';
      document.getElementById('pago-transferencia-cuenta').value = pagos.transferencia?.cuenta || '';
      document.getElementById('pago-transferencia-titular').value = pagos.transferencia?.titular || '';
      document.getElementById('pago-transferencia-cedula').value = pagos.transferencia?.cedula || '';
    }
  } catch (error) {
    handleError(error, 'Error cargando datos de pago');
  }
}

async function guardarDatosPago() {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { showToast('⚠️ No hay sesión activa'); return; }
  
  const datosPago = {
    pagoMovil: {
      telefono: document.getElementById('pago-pmovil-telefono').value.trim(),
      cedula: document.getElementById('pago-pmovil-cedula').value.trim(),
      banco: document.getElementById('pago-pmovil-banco').value.trim()
    },
    zelle: {
      email: document.getElementById('pago-zelle-email').value.trim(),
      nombre: document.getElementById('pago-zelle-nombre').value.trim()
    },
    transferencia: {
      banco: document.getElementById('pago-transferencia-banco').value.trim(),
      cuenta: document.getElementById('pago-transferencia-cuenta').value.trim(),
      titular: document.getElementById('pago-transferencia-titular').value.trim(),
      cedula: document.getElementById('pago-transferencia-cedula').value.trim()
    }
  };
  
  try {
    await firebase.firestore().collection('empresas').doc(empresaId).update({
      datosPago: datosPago
    });
    showToast('✅ Datos de pago guardados correctamente');
    document.getElementById('mensaje-pago').innerHTML = '✅ Datos guardados correctamente';
  } catch (error) {
    handleError(error, 'Error guardando datos de pago');
  }
}

// ═══════════════════════════════════════════════════════════════
//  MÓDULO CLIENTE: CATÁLOGO, CARRITO, PEDIDOS, CHAT, ALERTAS
// ═══════════════════════════════════════════════════════════════
function renderCatalogo() {
  const container = document.getElementById('catalogo-productos');
  if (!container) return;
  const productos = window.inventario || [];
  if (!productos || productos.length === 0) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">No hay productos disponibles</div></div>`;
    return;
  }
  const chipsHTML = `
    <div class="chips" style="margin-bottom:12px;">
      <div class="chip ${filtroCatalogo === 'todas' ? 'active' : ''}" onclick="filtrarCatalogo('todas')">Todas</div>
      <div class="chip ${filtroCatalogo === 'cervezas' ? 'active' : ''}" onclick="filtrarCatalogo('cervezas')">🍺 Cervezas Polar</div>
      <div class="chip ${filtroCatalogo === 'alimentos' ? 'active' : ''}" onclick="filtrarCatalogo('alimentos')">🥫 Alimentos Polar</div>
      <div class="chip ${filtroCatalogo === 'otros' ? 'active' : ''}" onclick="filtrarCatalogo('otros')">📦 Otros</div>
    </div>
  `;
  let productosFiltrados = productos;
  if (filtroCatalogo === 'cervezas') {
    productosFiltrados = productos.filter(p => p.cat === 'Cervezas Polar');
  } else if (filtroCatalogo === 'alimentos') {
    productosFiltrados = productos.filter(p => p.cat === 'Alimentos Polar');
  } else if (filtroCatalogo === 'otros') {
    productosFiltrados = productos.filter(p => p.cat !== 'Cervezas Polar' && p.cat !== 'Alimentos Polar');
  }
  if (productosFiltrados.length === 0) {
    container.innerHTML = chipsHTML + `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No hay productos en esta categoría</div></div>`;
    return;
  }
  const cervezas = productosFiltrados.filter(p => p.cat === 'Cervezas Polar');
  const alimentos = productosFiltrados.filter(p => p.cat === 'Alimentos Polar');
  const otros = productosFiltrados.filter(p => p.cat !== 'Cervezas Polar' && p.cat !== 'Alimentos Polar');
  let html = chipsHTML;
  if (cervezas.length > 0) {
    html += `<div style="margin:16px 0 8px; padding:8px 12px; background:var(--primary-soft); border-radius:var(--radius); font-weight:700; font-size:15px; color:var(--primary); display:flex; align-items:center; gap:8px;">🍺 Cervezas Polar <span style="font-size:12px; font-weight:400; color:var(--text2);">(${cervezas.length})</span></div>`;
    html += cervezas.map(p => renderProductoCard(p)).join('');
  }
  if (alimentos.length > 0) {
    html += `<div style="margin:16px 0 8px; padding:8px 12px; background:var(--primary-soft); border-radius:var(--radius); font-weight:700; font-size:15px; color:var(--primary); display:flex; align-items:center; gap:8px;">🥫 Alimentos Polar <span style="font-size:12px; font-weight:400; color:var(--text2);">(${alimentos.length})</span></div>`;
    html += alimentos.map(p => renderProductoCard(p)).join('');
  }
  if (otros.length > 0) {
    html += `<div style="margin:16px 0 8px; padding:8px 12px; background:var(--bg); border-radius:var(--radius); font-weight:700; font-size:15px; color:var(--text2); display:flex; align-items:center; gap:8px;">📦 Otros productos <span style="font-size:12px; font-weight:400;">(${otros.length})</span></div>`;
    html += otros.map(p => renderProductoCard(p)).join('');
  }
  container.innerHTML = html;
}

function filtrarCatalogo(filtro) {
  filtroCatalogo = filtro;
  renderCatalogo();
}

function renderProductoCard(p) {
  const icon = p.icon || '📦';
  const nombre = p.nombre || 'Producto sin nombre';
  const estado = p.estado || 'ok';
  const stock = p.stock || 0;
  const precio = p.precio || '$0.00';
  const nombreEscapado = escapeHtml(nombre);
  const nombreJs = escapeJsString(nombre);
  const maxStock = estado === 'out' ? 0 : stock;

  const inputId = 'cantidad-' + nombreJs.replace(/\s/g, '_');

  return `
    <div class="inv-card" style="cursor:default;">
      <div class="inv-img">${icon}</div>
      <div class="inv-info">
        <div class="inv-name">${nombreEscapado}</div>
        <div class="inv-stock ${estado}">${estado === 'out' ? 'Agotado' : stock + ' unidades'}</div>
      </div>
      <div class="inv-right">
        <div class="inv-price">${precio}</div>
        ${estado !== 'out' ? `
          <div style="display:flex; align-items:center; gap:4px; margin-top:4px; flex-wrap:wrap; justify-content:flex-end;">
            <div style="display:flex; align-items:center; gap:2px;">
              <button class="btn-icon" onclick="cambiarCantidadInput('${inputId}', -1, ${maxStock})" style="font-size:14px; padding:2px 6px;">➖</button>
              <input type="number" id="${inputId}" value="1" min="1" max="${maxStock}" style="width:40px; padding:2px 4px; border:1px solid var(--border); border-radius:4px; text-align:center; font-size:13px; background:var(--bg); color:var(--text);">
              <button class="btn-icon" onclick="cambiarCantidadInput('${inputId}', 1, ${maxStock})" style="font-size:14px; padding:2px 6px;">➕</button>
            </div>
            <button class="btn btn-primary" style="height:32px; font-size:12px; padding:0 10px;" onclick="agregarAlCarritoConCantidad('${nombreJs}', document.getElementById('${inputId}').value)">Agregar</button>
          </div>
        ` : '<span style="color:var(--red);font-size:12px;">Agotado</span>'}
      </div>
    </div>
  `;
}

function agregarAlCarrito(nombre) {
  const producto = inventario.find(p => p.nombre === nombre);
  if (!producto) { showToast('⚠️ Producto no encontrado'); return; }
  if (producto.estado === 'out') { showToast('⚠️ Producto agotado'); return; }
  
  const itemEnCarrito = carrito.find(c => c.nombre === nombre);
  const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;
  
  if (cantidadActual >= producto.stock) {
    showToast(`⚠️ Stock insuficiente, solo quedan ${producto.stock} unidades`);
    return;
  }
  
  if (itemEnCarrito) {
    itemEnCarrito.cantidad++;
  } else {
    carrito.push({ nombre: nombre, cantidad: 1, precio: parseCurrency(producto.precio) });
  }
  
  guardarCarrito();
  actualizarCarritoCount();
  showToast(`➕ ${nombre} agregado al carrito`);
}

function agregarAlCarritoConCantidad(nombre, cantidadInput) {
  const cantidad = parseInt(cantidadInput) || 1;
  if (cantidad < 1) {
    showToast('⚠️ La cantidad debe ser al menos 1');
    return;
  }
  
  const producto = inventario.find(p => p.nombre === nombre);
  if (!producto) {
    showToast('⚠️ Producto no encontrado');
    return;
  }
  if (producto.estado === 'out') {
    showToast('⚠️ Producto agotado');
    return;
  }
  
  const itemEnCarrito = carrito.find(c => c.nombre === nombre);
  const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;
  
  if (cantidadActual + cantidad > producto.stock) {
    showToast(`⚠️ Stock insuficiente. Disponible: ${producto.stock} unidades`);
    return;
  }
  
  if (itemEnCarrito) {
    itemEnCarrito.cantidad += cantidad;
  } else {
    carrito.push({ nombre: nombre, cantidad: cantidad, precio: parseCurrency(producto.precio) });
  }
  
  guardarCarrito();
  actualizarCarritoCount();
  showToast(`➕ ${cantidad} x ${nombre} agregado al carrito`);
}

function actualizarCarritoCount() {
  const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const el = document.getElementById('carrito-count');
  if (el) el.textContent = total;
}

function verCarrito() {
  if (!carrito.length) { showToast('🛒 Carrito vacío'); return; }
  
  const total = carrito.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
  
  let html = `
    <div style="margin-bottom:12px;">
      <h3>🛒 Tu pedido</h3>
      <div style="max-height:300px; overflow-y:auto; margin-bottom:12px;">
  `;
  
  carrito.forEach((item, index) => {
    const subtotal = item.cantidad * item.precio;
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:14px;">${escapeHtml(item.nombre)}</div>
          <div style="font-size:12px; color:var(--text3);">${formatCurrency(item.precio)} c/u</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn-icon" onclick="cambiarCantidadCarrito(${index}, -1)" style="font-size:18px; padding:4px 8px;">−</button>
          <span style="font-weight:700; min-width:30px; text-align:center;">${item.cantidad}</span>
          <button class="btn-icon" onclick="cambiarCantidadCarrito(${index}, 1)" style="font-size:18px; padding:4px 8px;">+</button>
        </div>
        <div style="font-weight:700; min-width:70px; text-align:right;">${formatCurrency(subtotal)}</div>
      </div>
    `;
  });
  
  html += `
      </div>
      <div style="display:flex; justify-content:space-between; padding:12px 0; font-weight:700; font-size:18px; border-top:2px solid var(--border);">
        <span>Total</span>
        <span>${formatCurrency(total)}</span>
      </div>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="btn btn-primary" onclick="realizarPedido()">✅ Confirmar pedido</button>
        <button class="btn btn-outline" onclick="vaciarCarrito()">🗑️ Vaciar carrito</button>
      </div>
    </div>
  `;
  
  openModalWithContent('Carrito', html);
}

function cambiarCantidadCarrito(index, delta) {
  if (!carrito[index]) return;
  
  const nuevaCantidad = carrito[index].cantidad + delta;
  
  if (nuevaCantidad < 1) {
    if (confirm(`¿Eliminar "${carrito[index].nombre}" del carrito?`)) {
      carrito.splice(index, 1);
      guardarCarrito();
      actualizarCarritoCount();
      verCarrito();
    }
    return;
  }
  
  const producto = inventario.find(p => p.nombre === carrito[index].nombre);
  if (producto && nuevaCantidad > producto.stock) {
    showToast(`⚠️ Stock insuficiente. Solo quedan ${producto.stock} unidades.`);
    return;
  }
  
  carrito[index].cantidad = nuevaCantidad;
  guardarCarrito();
  actualizarCarritoCount();
  verCarrito();
}

function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  actualizarCarritoCount();
  closeModal();
  showToast('🗑️ Carrito vacío');
}

function cambiarCantidadInput(inputId, delta, maxStock) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let value = parseInt(input.value) || 1;
  value = Math.min(Math.max(value + delta, 1), maxStock);
  input.value = value;
}

// ================================================================
//  ORDEN DE PAGO (P2P)
// ================================================================
async function mostrarOrdenPago(ventaId) {
  const venta = store.ventas.find(v => v.id === ventaId);
  if (!venta) { showToast('⚠️ Venta no encontrada'); return; }

  const empresaId = sessionStorage.getItem('empresaId');
  const doc = await firebase.firestore().collection('empresas').doc(empresaId).get();
  const datosPago = doc.exists ? doc.data().datosPago : null;
  if (!datosPago) {
    showToast('⚠️ El franquiciado no ha configurado sus datos de pago');
    return;
  }

  const html = `
    <div style="text-align:center; margin-bottom:16px;">
      <h3>🧾 Orden de pago</h3>
      <p style="font-size:14px; color:var(--text2);">Realiza el pago y notifícanos para procesar tu pedido.</p>
    </div>
    <div style="background:var(--primary-soft); padding:12px; border-radius:var(--radius-sm); margin-bottom:12px;">
      <p style="font-size:18px; font-weight:700; text-align:center;">Total: ${venta.total}</p>
    </div>

    ${datosPago.pagoMovil?.telefono ? `
      <div style="border-bottom:1px solid var(--border); padding:8px 0;">
        <strong>📱 Pago Móvil</strong>
        <div style="font-size:13px; margin-top:4px;">
          Teléfono: ${datosPago.pagoMovil.telefono}<br>
          Cédula: ${datosPago.pagoMovil.cedula || 'N/A'}<br>
          Banco: ${datosPago.pagoMovil.banco || 'N/A'}
        </div>
      </div>
    ` : ''}

    ${datosPago.zelle?.email ? `
      <div style="border-bottom:1px solid var(--border); padding:8px 0;">
        <strong>💵 Zelle</strong>
        <div style="font-size:13px; margin-top:4px;">
          Email: ${datosPago.zelle.email}<br>
          Titular: ${datosPago.zelle.nombre || 'N/A'}
        </div>
      </div>
    ` : ''}

    ${datosPago.transferencia?.cuenta ? `
      <div style="border-bottom:1px solid var(--border); padding:8px 0;">
        <strong>🏦 Transferencia</strong>
        <div style="font-size:13px; margin-top:4px;">
          Banco: ${datosPago.transferencia.banco || 'N/A'}<br>
          Cuenta: ${datosPago.transferencia.cuenta}<br>
          Titular: ${datosPago.transferencia.titular || 'N/A'}<br>
          Cédula: ${datosPago.transferencia.cedula || 'N/A'}
        </div>
      </div>
    ` : ''}

    <div style="margin-top:16px; display:flex; gap:8px; flex-direction:column;">
      <button class="btn btn-primary" onclick="notificarPago('${ventaId}')">✅ Ya pagué - Notificar al franquiciado</button>
      <button class="btn btn-outline" onclick="closeModal()">Cerrar</button>
    </div>
    <p style="font-size:12px; color:var(--text3); text-align:center; margin-top:12px;">
      Al notificar, el franquiciado recibirá tu confirmación y podrá procesar tu pedido.
    </p>
  `;

  openModalWithContent('Orden de pago', html);
}

async function notificarPago(ventaId) {
  const venta = store.ventas.find(v => v.id === ventaId);
  if (!venta) { showToast('⚠️ Venta no encontrada'); return; }

  const empresaId = sessionStorage.getItem('empresaId');
  const clienteNombre = sessionStorage.getItem('userName') || 'Un cliente';

  try {
    await store.updateVenta(ventaId, {
      clienteNotificoPago: true,
      fechaNotificacionPago: new Date().toISOString()
    });
    syncGlobals();

    if (typeof notificarAdmins === 'function') {
      notificarAdmins(
        empresaId,
        '💳 Pago notificado',
        `${clienteNombre} ha notificado el pago de ${venta.total}`,
        { tipo: 'pago_notificado', ventaId: ventaId, cliente: clienteNombre }
      );
    }

    showToast('✅ Pago notificado al franquiciado');
    closeModal();
  } catch (error) {
    handleError(error, 'Error al notificar pago');
  }
}

async function realizarPedido() {
  if (!sessionStorage.getItem('empresaId')) { showToast('⚠️ Inicia sesión primero'); return; }
  if (!carrito.length) { showToast('🛒 Carrito vacío'); return; }

  for (const item of carrito) {
    const producto = inventario.find(p => p.nombre === item.nombre);
    if (!producto) { showToast(`⚠️ Producto "${item.nombre}" no existe`); return; }
    if (item.cantidad > producto.stock) {
      showToast(`⚠️ Stock insuficiente para "${item.nombre}" (disponible: ${producto.stock})`);
      return;
    }
  }

  const total = carrito.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
  const items = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  
  const productos = carrito.map(item => ({
    nombre: item.nombre,
    cantidad: item.cantidad,
    precio: item.precio
  }));

  const pedido = {
    cliente: sessionStorage.getItem('userName') || 'Cliente',
    fecha: getCurrentTimestamp(),
    items: items,
    total: formatCurrency(total),
    status: 'pendiente',
    metodo: 'Cliente app',
    notas: carrito.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
    productos: productos
  };

  try {
    await store.addVenta(pedido);
    syncGlobals();

    const pedidoCreado = store.ventas.find(v => 
      v.cliente === sessionStorage.getItem('userName') && 
      v.status === 'pendiente' && 
      v.total === formatCurrency(total)
    );

    carrito = [];
    guardarCarrito();
    actualizarCarritoCount();
    
    renderHistorial();
    renderActividadReciente();
    updateKPIs();

    closeModal();

    if (pedidoCreado) {
      mostrarOrdenPago(pedidoCreado.id);
    } else {
      showToast('⚠️ No se pudo generar la orden de pago, contacta al administrador');
    }

    const empresaIdNotif = sessionStorage.getItem('empresaId');
    const clienteNombre = sessionStorage.getItem('userName') || 'Un cliente';
    if (empresaIdNotif && typeof notificarAdmins === 'function') {
      notificarAdmins(
        empresaIdNotif,
        '🛒 Nuevo pedido recibido',
        `${clienteNombre} hizo un pedido por ${pedido.total}`,
        { tipo: 'nuevo_pedido', cliente: clienteNombre, total: pedido.total }
      );
    }

  } catch (error) {
    handleError(error, 'Error al realizar el pedido');
  }
}

function renderHistorial() {
  const container = document.getElementById('historial-pedidos');
  const nombreCliente = sessionStorage.getItem('userName');
  if (!nombreCliente) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">🔒</div><div class="empty-text">Inicia sesión para ver tus pedidos</div></div>';
    return;
  }
  const misPedidos = ventas.filter(v => v.cliente === nombreCliente);
  if (!misPedidos.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Aún no has realizado pedidos</div></div>';
    return;
  }
  container.innerHTML = misPedidos.map(v => `
    <div class="sale-card" style="cursor:default;">
      <div class="sale-header">
        <span class="sale-id">${v.id}</span>
        <span class="sale-status ${v.status}">${v.status.charAt(0).toUpperCase() + v.status.slice(1)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:4px;">
        <span>${v.fecha}</span>
        <span class="sale-total">${v.total}</span>
      </div>
      <div style="font-size:12px; color:var(--text3);">${v.notas || 'Sin detalles'}</div>
    </div>
  `).join('');
}

function renderActividadReciente() {
  const container = document.getElementById('actividad-list');
  if (!container) return;
  const ultimas = ventas.slice(0, 5);
  if (!ultimas.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sin actividad reciente</div></div>';
    return;
  }
  container.innerHTML = ultimas.map(v => `
    <div class="activity-item">
      <div class="act-icon" style="background:${v.status === 'pagado' ? '#ECFDF5' : '#FFFBEB'}">${v.status === 'pagado' ? '🛒' : '⏳'}</div>
      <div class="act-info">
        <div class="act-name">${v.cliente}</div>
        <div class="act-sub">${v.fecha} · ${v.items} producto${v.items > 1 ? 's' : ''}</div>
      </div>
      <div class="act-amount" style="color:${v.status === 'pagado' ? 'var(--green)' : 'var(--amber)'}">${v.total}</div>
    </div>
  `).join('');
}

// ================================================================
//  CONFIGURACIÓN (pestañas: resumen, productos, clientes, ventas, categorías)
// ================================================================
function cambiarTabConfiguracion(tabId) {
  document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.config-panel').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`.config-tab[data-tab="${tabId}"]`);
  if (tab) tab.classList.add('active');
  const panel = document.getElementById('panel-' + tabId);
  if (panel) panel.classList.add('active');
  if (tabId === 'resumen') actualizarResumenConfiguracion();
  if (tabId === 'productos') renderizarTablaProductos();
  if (tabId === 'clientes') renderizarTablaClientes();
  if (tabId === 'ventas') renderizarTablaVentas();
  if (tabId === 'categorias') cargarCategorias();  // <-- NUEVO
}

function renderizarTablaProductos() {
  const tbody = document.getElementById('tabla-productos');
  if (!tbody) return;
  const productos = window.inventario || [];
  if (!productos.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="config-empty">No hay productos registrados</td></tr>';
    return;
  }
  tbody.innerHTML = productos.map(p => `
    <tr>
      <td>${p.id ? p.id.slice(0, 8) + '...' : '-'}</td>
      <td>${p.nombre || '-'}</td>
      <td>${p.cat || 'General'}</td>
      <td>${p.precio || '$0.00'}</td>
      <td>${p.stock ?? 0}</td>
      <td>
        <div class="config-actions-cell">
          <button class="btn-sm btn-sm-edit" onclick="editProducto('${(p.nombre || '').replace(/'/g, "\\'")}')">Editar</button>
          <button class="btn-sm btn-sm-delete" onclick="confirmDeleteProducto('${(p.nombre || '').replace(/'/g, "\\'")}')">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderizarTablaClientes() {
  const tbody = document.getElementById('tabla-clientes');
  if (!tbody) return;
  const clientes = window.clientes || [];
  if (!clientes.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="config-empty">No hay clientes registrados</td></tr>';
    return;
  }
  tbody.innerHTML = clientes.map(c => `
    <tr>
      <td>${c.nombre || '-'}</td>
      <td>${c.email || c.phone || '-'}</td>
      <td>${c.phone || '-'}</td>
      <td>
        <div class="config-actions-cell">
          <button class="btn-sm btn-sm-edit" onclick="editCliente('${(c.nombre || '').replace(/'/g, "\\'")}')">Editar</button>
          <button class="btn-sm btn-sm-delete" onclick="confirmDeleteCliente('${(c.nombre || '').replace(/'/g, "\\'")}')">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderizarTablaVentas() {
  const tbody = document.getElementById('tabla-ventas');
  if (!tbody) return;
  const ventas = window.ventas || [];
  if (!ventas.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="config-empty">No hay ventas registradas</td></tr>';
    return;
  }
  tbody.innerHTML = ventas.map(v => `
    <tr>
      <td>${v.cliente || '-'}</td>
      <td>${v.producto || '-'}</td>
      <td>${v.total || '$0.00'}</td>
      <td>${v.fecha || '-'}</td>
      <td><span style="color:${v.status === 'pagado' ? 'var(--green)' : v.status === 'pendiente' ? 'var(--amber)' : 'var(--red)'}">${v.status || 'pendiente'}</span></td>
      <td>
        <div class="config-actions-cell">
          <button class="btn-sm btn-sm-edit" onclick="editVenta('${v.id}')">Editar</button>
          <button class="btn-sm btn-sm-delete" onclick="confirmDeleteVenta('${v.id}')">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function actualizarResumenConfiguracion() {
  const productos = window.inventario || [];
  const clientes = window.clientes || [];
  const ventas = window.ventas || [];
  const totalVentas = ventas.reduce((sum, v) => sum + parseCurrency(v.total), 0);
  document.getElementById('resumen-productos').textContent = productos.length;
  document.getElementById('resumen-clientes').textContent = clientes.length;
  document.getElementById('resumen-ventas').textContent = ventas.length;
  document.getElementById('resumen-total-ventas').textContent = formatCurrency(totalVentas);
  const empresaEl = document.getElementById('config-empresa-nombre');
  const usuarioEl = document.getElementById('config-usuario-nombre');
  if (empresaEl) {
    const empresaId = sessionStorage.getItem('empresaId');
    empresaEl.textContent = empresaId ? empresaId.replace(/-/g, ' ').toUpperCase() : 'MI EMPRESA';
  }
  if (usuarioEl) {
    const nombre = sessionStorage.getItem('userName') || sessionStorage.getItem('userEmail') || 'Usuario';
    usuarioEl.textContent = `👤 ${nombre}`;
  }
}

// ================================================================
//  GESTIÓN DE CATEGORÍAS (CRUD) - NUEVO
// ================================================================
async function cargarCategorias() {
  const tbody = document.getElementById('tabla-categorias');
  if (!tbody) return;

  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) {
    tbody.innerHTML = '<tr><td colspan="5" class="config-empty">No hay sesión activa</td></tr>';
    return;
  }

  try {
    const snapshot = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('categoriasClientes')
      .orderBy('nombre')
      .get();

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" class="config-empty">No hay categorías creadas</td></tr>';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      const nombre = escapeHtml(data.nombre || 'Sin nombre');
      const codigo = escapeHtml(data.codigoInvitacion || '');
      const porcentaje = data.aporteEspecial?.valor || 0;
      const activa = data.activa !== false;
      const estadoClase = activa ? 'activa' : 'inactiva';
      const estadoTexto = activa ? 'Activa' : 'Inactiva';

      html += `
        <tr>
          <td><strong>${nombre}</strong></td>
          <td>${codigo ? codigo : '<em style="color:var(--text3);">Sin código</em>'}</td>
          <td>${porcentaje}%</td>
          <td><span class="categoria-estado ${estadoClase}">${estadoTexto}</span></td>
          <td>
            <div class="config-actions-cell">
              <button class="btn-sm btn-sm-edit" onclick="editarCategoria('${id}')">Editar</button>
              <button class="btn-sm btn-sm-toggle ${estadoClase}" onclick="toggleCategoriaEstado('${id}')">
                ${activa ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (error) {
    console.error('Error cargando categorías:', error);
    tbody.innerHTML = `<tr><td colspan="5" class="config-empty">Error al cargar: ${escapeHtml(error.message)}</td></tr>`;
  }
}

function abrirModalCategoria() {
  document.getElementById('modal-categoria-title').textContent = '📝 Nueva categoría';
  document.getElementById('cat-edit-id').value = '';
  document.getElementById('cat-nombre').value = '';
  document.getElementById('cat-codigo').value = '';
  document.getElementById('cat-porcentaje').value = '';
  document.getElementById('cat-descripcion').value = '';
  abrirModalId('modal-categoria');
}

function cerrarModalCategoria(e) {
  if (e && e.target !== e.currentTarget) return;
  forzarCierreModal('modal-categoria');
}

async function guardarCategoria() {
  const nombre = document.getElementById('cat-nombre').value.trim();
  const codigo = document.getElementById('cat-codigo').value.trim().toUpperCase();
  const porcentaje = parseFloat(document.getElementById('cat-porcentaje').value);
  const descripcion = document.getElementById('cat-descripcion').value.trim();
  const editId = document.getElementById('cat-edit-id').value;

  if (!nombre) {
    showToast('⚠️ El nombre es obligatorio');
    return;
  }
  if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    showToast('⚠️ Ingresa un porcentaje válido (0-100)');
    return;
  }

  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) {
    showToast('⚠️ No hay sesión activa');
    return;
  }

  const data = {
    nombre: nombre,
    codigoInvitacion: codigo || '',
    descripcion: descripcion || '',
    aporteEspecial: {
      tipo: 'porcentaje_liquido',
      valor: porcentaje,
      aplicaA: ['Cervezas Polar']
    },
    modificado: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // Validar código único (si se proporciona)
    if (codigo) {
      let query = firebase.firestore()
        .collection('empresas').doc(empresaId)
        .collection('categoriasClientes')
        .where('codigoInvitacion', '==', codigo);

      if (editId) {
        const snapshot = await query.get();
        const existe = snapshot.docs.some(doc => doc.id !== editId);
        if (existe) {
          showToast('⚠️ El código de invitación ya está en uso');
          return;
        }
      } else {
        const snapshot = await query.get();
        if (!snapshot.empty) {
          showToast('⚠️ El código de invitación ya está en uso');
          return;
        }
      }
    }

    if (editId) {
      await firebase.firestore()
        .collection('empresas').doc(empresaId)
        .collection('categoriasClientes').doc(editId)
        .update(data);
      showToast('✅ Categoría actualizada');
    } else {
      data.creado = firebase.firestore.FieldValue.serverTimestamp();
      data.activa = true;
      await firebase.firestore()
        .collection('empresas').doc(empresaId)
        .collection('categoriasClientes')
        .add(data);
      showToast('✅ Categoría creada');
    }

    cerrarModalCategoria();
    cargarCategorias();
  } catch (error) {
    handleError(error, 'Error guardando categoría');
  }
}

async function editarCategoria(id) {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) return;

  try {
    const doc = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('categoriasClientes').doc(id)
      .get();

    if (!doc.exists) {
      showToast('⚠️ Categoría no encontrada');
      return;
    }

    const data = doc.data();
    document.getElementById('modal-categoria-title').textContent = '✏️ Editar categoría';
    document.getElementById('cat-edit-id').value = id;
    document.getElementById('cat-nombre').value = data.nombre || '';
    document.getElementById('cat-codigo').value = data.codigoInvitacion || '';
    document.getElementById('cat-porcentaje').value = data.aporteEspecial?.valor || 0;
    document.getElementById('cat-descripcion').value = data.descripcion || '';

    abrirModalId('modal-categoria');
  } catch (error) {
    handleError(error, 'Error cargando categoría');
  }
}

async function toggleCategoriaEstado(id) {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) return;

  try {
    const doc = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('categoriasClientes').doc(id)
      .get();

    if (!doc.exists) {
      showToast('⚠️ Categoría no encontrada');
      return;
    }

    const data = doc.data();
    const nuevaActiva = !(data.activa !== false);

    // No permitir desactivar la categoría por defecto (codigoInvitacion vacío)
    if (!nuevaActiva && !data.codigoInvitacion) {
      showToast('⚠️ No se puede desactivar la categoría por defecto');
      return;
    }

    await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('categoriasClientes').doc(id)
      .update({
        activa: nuevaActiva,
        modificado: firebase.firestore.FieldValue.serverTimestamp()
      });

    showToast(nuevaActiva ? '✅ Categoría activada' : '✅ Categoría desactivada');
    cargarCategorias();
  } catch (error) {
    handleError(error, 'Error cambiando estado');
  }
}

// ================================================================
//  EXPORTAR / IMPORTAR DATOS
// ================================================================
function exportarDatosJSON() {
  const empresaId = sessionStorage.getItem('empresaId');
  const nombreEmpresa = sessionStorage.getItem('userName') || 'empresa';
  if (!empresaId) { showToast('❌ No hay sesión activa'); return; }
  const data = {
    empresaId, nombreEmpresa, fechaExportacion: new Date().toISOString(),
    inventario: window.inventario || [], clientes: window.clientes || [], ventas: window.ventas || []
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `datos_${empresaId}_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ Datos exportados correctamente');
}

async function importarDatosJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { 
    showToast('❌ No hay sesión activa'); 
    event.target.value = '';
    return; 
  }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.inventario || !data.clientes || !data.ventas) {
      showToast('❌ JSON inválido: faltan campos requeridos');
      event.target.value = '';
      return;
    }
    const confirmMsg = `⚠️ ¿Reemplazar TODOS los datos?\n\nSe importarán:\n- ${data.inventario.length} productos\n- ${data.clientes.length} clientes\n- ${data.ventas.length} ventas`;
    if (!confirm(confirmMsg)) {
      event.target.value = '';
      return;
    }
    showToast('⏳ Importando datos...');
    const collections = ['inventario', 'clientes', 'ventas'];
    for (const col of collections) {
      const snapshot = await firebase.firestore()
        .collection('empresas').doc(empresaId).collection(col).get();
      let batch = firebase.firestore().batch();
      let count = 0;
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = firebase.firestore().batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      const items = data[col] || [];
      batch = firebase.firestore().batch();
      count = 0;
      for (const item of items) {
        const { id, ...cleanItem } = item;
        const docRef = firebase.firestore()
          .collection('empresas').doc(empresaId).collection(col).doc();
        batch.set(docRef, cleanItem);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = firebase.firestore().batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    }
    await store.cargarDatosEmpresa(empresaId);
    syncGlobals();
    renderVentas('', filtroVentas, 1);
    renderInv('', filtroInv, 1);
    renderClients('', filtroCli, 1);
    renderActividadReciente();
    updateKPIs();
    actualizarResumenConfiguracion();
    renderizarTablaProductos();
    renderizarTablaClientes();
    renderizarTablaVentas();
    event.target.value = '';
    showToast(`✅ Datos importados correctamente`);
  } catch (error) {
    console.error('Error importando:', error);
    handleError(error, 'Error al importar datos');
    event.target.value = '';
  }
}

function actualizarAvatar(nombre) {
  const avatarEl = document.getElementById('avatar-iniciales');
  if (!avatarEl) return;
  if (nombre) {
    const iniciales = nombre.split(' ').filter(p => p.length > 0).map(p => p.charAt(0).toUpperCase()).join('').slice(0, 2);
    avatarEl.textContent = iniciales || '??';
  } else {
    avatarEl.textContent = 'OR';
  }
}

// ================================================================
//  CHAT Y ALERTAS (cliente)
// ================================================================
async function enviarMensajeChat() {
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if (!texto) { showToast('⚠️ Escribe un mensaje'); return; }
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { showToast('⚠️ Inicia sesión'); return; }
  const user = firebase.auth().currentUser;
  if (!user) { showToast('⚠️ Usuario no autenticado'); return; }
  try {
    const mensaje = {
      texto: texto,
      remitente: sessionStorage.getItem('userName') || user.email || 'Anónimo',
      uid: user.uid,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    };
    await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('chats')
      .add(mensaje);
    input.value = '';
    cargarMensajesChat();
    showToast('✅ Mensaje enviado');
  } catch (error) {
    handleError(error, 'Error al enviar mensaje');
  }
}

async function cargarMensajesChat() {
  const container = document.getElementById('chat-mensajes');
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { 
    if (container) container.innerHTML = '<div class="empty"><div class="empty-text">Inicia sesión para ver el chat</div></div>';
    return; 
  }
  try {
    const snapshot = await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('chats')
      .orderBy('fecha', 'desc')
      .limit(50)
      .get();
    if (snapshot.empty) {
      if (container) container.innerHTML = '<div class="empty"><div class="empty-icon">💬</div><div class="empty-text">Sin mensajes aún. ¡Sé el primero en escribir!</div></div>';
      return;
    }
    const mensajes = [];
    snapshot.forEach(doc => {
      mensajes.push({ id: doc.id, ...doc.data() });
    });
    mensajes.reverse();
    if (container) {
      container.innerHTML = mensajes.map(m => `
        <div style="padding:8px 12px; margin-bottom:6px; background:var(--bg); border-radius:var(--radius); border-left:3px solid ${m.uid === firebase.auth().currentUser?.uid ? 'var(--primary)' : 'var(--border)'}">
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text3);">
            <strong>${m.remitente}</strong>
            <span>${formatDateLocal(m.fecha?.toDate?.() || m.fecha)}</span>
          </div>
          <div style="font-size:14px;">${m.texto}</div>
        </div>
      `).join('');
      container.scrollTop = container.scrollHeight;
    }
  } catch (error) {
    handleError(error, 'Error cargando mensajes');
  }
}

function abrirModalAlerta() {
  const body = `
    <div class="field">
      <label>Tipo de alerta</label>
      <select id="alerta-tipo">
        <option value="fiscalizacion">🛂 Fiscalización (Seniat, municipio)</option>
        <option value="riña">🥊 Riña o disturbio</option>
        <option value="policial">🚔 Operativo policial</option>
        <option value="corte_luz">💡 Corte de luz/agua</option>
        <option value="otro">⚠️ Otro</option>
      </select>
    </div>
    <div class="field">
      <label>Descripción (opcional)</label>
      <textarea id="alerta-descripcion" placeholder="Detalla lo que está pasando..." rows="3"></textarea>
    </div>
    <div class="field">
      <label>Ubicación (opcional)</label>
      <input type="text" id="alerta-ubicacion" placeholder="Ej: Av. Principal, sector ...">
    </div>
    <button class="btn btn-danger" onclick="enviarAlerta()">🚨 Enviar alerta</button>
    <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
  `;
  openModalWithContent('Enviar alerta de seguridad', body);
}

async function enviarAlerta() {
  const tipo = document.getElementById('alerta-tipo').value;
  const descripcion = document.getElementById('alerta-descripcion').value.trim();
  const ubicacion = document.getElementById('alerta-ubicacion').value.trim();
  if (!tipo) { showToast('⚠️ Selecciona un tipo de alerta'); return; }
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { showToast('⚠️ Inicia sesión primero'); return; }
  const user = firebase.auth().currentUser;
  if (!user) { showToast('⚠️ Usuario no autenticado'); return; }
  try {
    const alerta = {
      tipo: tipo,
      descripcion: descripcion || '',
      ubicacion: ubicacion || '',
      creadoPor: sessionStorage.getItem('userName') || user.email || 'Anónimo',
      uid: user.uid,
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      estado: 'activa',
      votosConfirmacion: 0,
      votosFalso: 0,
      resuelta: false
    };
    await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('alertas')
      .add(alerta);
    closeModal();
    showToast('✅ Alerta enviada correctamente');
    cargarAlertas();
  } catch (error) {
    handleError(error, 'Error al enviar alerta');
  }
}

async function cargarAlertas() {
  const container = document.getElementById('alertas-lista');
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { 
    if (container) container.innerHTML = '<div class="empty"><div class="empty-text">Inicia sesión para ver alertas</div></div>';
    return; 
  }
  try {
    const snapshot = await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('alertas')
      .where('resuelta', '==', false)
      .orderBy('fecha', 'desc')
      .get();
    if (snapshot.empty) {
      if (container) container.innerHTML = '<div class="empty"><div class="empty-icon">🔔</div><div class="empty-text">No hay alertas activas</div></div>';
      return;
    }
    const alertas = [];
    snapshot.forEach(doc => {
      alertas.push({ id: doc.id, ...doc.data() });
    });
    const tipoIcon = {
      'fiscalizacion': '🛂',
      'riña': '🥊',
      'policial': '🚔',
      'corte_luz': '💡',
      'otro': '⚠️'
    };
    if (container) {
      container.innerHTML = alertas.map(a => `
        <div class="card" style="padding:12px; margin-bottom:8px; border-left:4px solid ${a.estado === 'activa' ? 'var(--danger)' : 'var(--green)'}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${tipoIcon[a.tipo] || '⚠️'} ${a.tipo}</strong>
            <span style="font-size:12px; color:var(--text3);">${formatDateLocal(a.fecha?.toDate?.() || a.fecha)}</span>
          </div>
          <div style="font-size:14px; margin:6px 0;">${a.descripcion || 'Sin descripción'}</div>
          <div style="font-size:12px; color:var(--text3);">📍 ${a.ubicacion || 'Sin ubicación'} · 👤 ${a.creadoPor}</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button class="btn btn-sm btn-success" onclick="votarAlerta('${a.id}', 'confirmar')">✅ Confirmar (${a.votosConfirmacion || 0})</button>
            <button class="btn btn-sm btn-danger" onclick="votarAlerta('${a.id}', 'falso')">❌ Falso (${a.votosFalso || 0})</button>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    handleError(error, 'Error cargando alertas');
  }
}

async function votarAlerta(alertaId, voto) {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { showToast('⚠️ Inicia sesión'); return; }
  try {
    const docRef = firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('alertas')
      .doc(alertaId);
    const incremento = voto === 'confirmar' ? 'votosConfirmacion' : 'votosFalso';
    await docRef.update({
      [incremento]: firebase.firestore.FieldValue.increment(1)
    });
    showToast('✅ Voto registrado');
    cargarAlertas();
  } catch (error) {
    handleError(error, 'Error al votar');
  }
}

// ═══════════════════════════════════════════════════════════════
//  ASISTENTE DE COMANDOS (AGENT)
// ═══════════════════════════════════════════════════════════════
function executeManualCommand(comando) {
  const cmd = comando.toLowerCase().trim();
  if (cmd.includes('ventas hoy')) {
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventas.filter(v => {
      try {
        const fechaVenta = new Date(v.fecha);
        return fechaVenta.toLocaleDateString() === hoy;
      } catch { return false; }
    });
    const total = ventasHoy.reduce((sum, v) => sum + parseCurrency(v.total), 0);
    return `ℹ️ Ventas de hoy: ${ventasHoy.length} pedidos por ${formatCurrency(total)}`;
  }
  if (cmd.includes('productos agotados')) {
    const agotados = inventario.filter(p => p.estado === 'out');
    return `ℹ️ Productos agotados: ${agotados.length} (${agotados.map(p => p.nombre).join(', ') || 'ninguno'})`;
  }
  if (cmd.includes('clientes nuevos')) {
    const nuevos = clientes.filter(c => c.tag === 'nuevo');
    return `ℹ️ Clientes nuevos: ${nuevos.length}`;
  }
  if (cmd.includes('top productos')) {
    const top = inventario.sort((a,b) => b.stock - a.stock).slice(0,3);
    return `ℹ️ Top productos por stock: ${top.map(p => `${p.nombre} (${p.stock})`).join(', ')}`;
  }
  if (cmd.includes('ventas') || cmd.includes('pedidos')) { goScreen('ventas'); return '✅ Navegando a ventas'; }
  if (cmd.includes('inventario') || cmd.includes('productos')) { goScreen('inventario'); return '✅ Navegando a inventario'; }
  if (cmd.includes('clientes')) { goScreen('clientes'); return '✅ Navegando a clientes'; }
  if (cmd.includes('reportes') || cmd.includes('estadisticas')) { goScreen('reportes'); return '✅ Navegando a reportes'; }
  if (cmd.includes('inicio') || cmd.includes('dashboard')) { goScreen('dashboard'); return '✅ Navegando a inicio'; }
  if (cmd.includes('nueva venta') || cmd.includes('crear venta')) { openModal(); return '✅ Abriendo formulario de nueva venta'; }
  if (cmd.includes('tema') || cmd.includes('oscuro') || cmd.includes('claro')) { toggleTheme(); return '✅ Cambiando tema'; }
  if (cmd.includes('ayuda') || cmd.includes('comandos')) {
    return `ℹ️ **Comandos disponibles:**\n• "ventas hoy", "productos agotados", "clientes nuevos", "top productos"\n• "ir a ventas", "ir a inventario", "ir a clientes", "ir a reportes", "ir a inicio"\n• "nueva venta", "cambiar tema"`;
  }
  if (cmd.includes('hola') || cmd.includes('buenos días') || cmd.includes('buenas tardes')) {
    const hora = new Date().getHours();
    let saludo = 'Hola';
    if (hora < 12) saludo = 'Buenos días';
    else if (hora < 19) saludo = 'Buenas tardes';
    else saludo = 'Buenas noches';
    return `✅ ${saludo}! ¿En qué puedo ayudarte?`;
  }
  return `ℹ️ Comando no reconocido. Escribe "ayuda" para ver opciones.`;
}

let agent = null;
let agentReady = false;
let ws = null;
let wsConnected = false;

async function executeAgentCommand(comando) {
  console.log(`🎯 Ejecutando comando: "${comando}"`);
  if (agentReady && agent) {
    try {
      const result = await agent.execute(comando);
      if (result && result.success === false) {
        console.warn('⚠️ Page Agent falló, usando modo manual');
        return executeManualCommand(comando);
      }
      return result || '✅ Comando ejecutado';
    } catch (error) {
      console.warn('⚠️ Error con Page Agent, usando modo manual:', error.message);
      return executeManualCommand(comando);
    }
  } else {
    return executeManualCommand(comando);
  }
}

async function agentCommand(comando) {
  if (!comando || comando.trim() === '') {
    document.getElementById('agent-response').innerHTML = 'ℹ️ Escribe un comando.';
    return;
  }
  const result = await executeAgentCommand(comando);
  document.getElementById('agent-response').innerHTML = result;
  return result;
}

function sendAgentCommand() {
  const input = document.getElementById('agent-input');
  const comando = input.value.trim();
  if (comando) {
    agentCommand(comando);
    input.value = '';
  }
}

function toggleAgentPanel() {
  const panel = document.getElementById('agent-panel');
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function connectWebSocket() {
  console.log('ℹ️ Modo Light: WebSocket desactivado para GitHub Pages');
  wsConnected = true;
  const responseEl = document.getElementById('agent-response');
  if (responseEl) responseEl.innerHTML = 'ℹ️ Modo Light: Asistente disponible en versión web.';
  return null;
}

// ================================================================
//  FUNCIÓN cambiarTabCliente MODIFICADA (agregado 'liquidaciones')
// ================================================================
function cambiarTabCliente(tabId) {
  document.querySelectorAll('.cliente-panel-content').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('cliente-panel-' + tabId);
  if (panel) panel.style.display = 'block';
  document.querySelectorAll('[data-tab-cliente]').forEach(tab => tab.classList.remove('active'));
  const tabBtn = document.querySelector(`[data-tab-cliente="${tabId}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  
  if (tabId === 'chat') {
    cargarMensajesChat();
  } else if (tabId === 'alertas') {
    cargarAlertas();
  } else if (tabId === 'pedidos') {
    cargarHistorialCliente();
  } else if (tabId === 'liquidaciones') {
    cargarLiquidacionesCliente();
  }
}

// ================================================================
//  FUNCIONES DE LIQUIDACIÓN DE LÍQUIDO (NUEVO)
// ================================================================

async function abrirModalLiquidacion(clienteId) {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) {
    showToast('⚠️ No hay sesión activa');
    return;
  }

  try {
    // Obtener datos del cliente
    const clienteDoc = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('clientes').doc(clienteId)
      .get();

    if (!clienteDoc.exists) {
      showToast('⚠️ Cliente no encontrado');
      return;
    }

    const cliente = clienteDoc.data();
    const liquidoPendiente = cliente.liquidoPendiente?.total || 0;

    // Cargar productos de cerveza para el selector (opcional)
    const productosSnap = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('inventario')
      .where('cat', '==', 'Cervezas Polar')
      .get();

    let productosHTML = '<option value="">Sin producto (solo liquidación)</option>';
    productosSnap.forEach(doc => {
      const data = doc.data();
      productosHTML += `<option value="${doc.id}">${escapeHtml(data.nombre)}</option>`;
    });

    const body = `
      <div class="field">
        <label>Cliente</label>
        <input type="text" value="${escapeHtml(cliente.nombre)}" disabled>
      </div>
      <div class="field">
        <label>Líquido pendiente</label>
        <input type="text" value="${liquidoPendiente} unidades" disabled>
      </div>
      <div class="field">
        <label>Cantidad a entregar *</label>
        <input type="number" id="liq-cantidad" min="1" max="${liquidoPendiente}" placeholder="Ej: 10">
        <small style="color:var(--text3); font-size:11px;">Máximo ${liquidoPendiente} unidades</small>
      </div>
      <div class="field">
        <label>Producto (opcional)</label>
        <select id="liq-producto">
          ${productosHTML}
        </select>
        <small style="color:var(--text3); font-size:11px;">Selecciona el producto a entregar (opcional)</small>
      </div>
      <div class="field">
        <label>Observaciones</label>
        <textarea id="liq-observaciones" rows="2" placeholder="Motivo de la entrega, notas..."></textarea>
      </div>
      <button class="btn btn-primary" onclick="confirmarLiquidacion('${clienteId}')">✅ Confirmar liquidación</button>
      <button class="btn btn-outline" onclick="cerrarModalLiquidacion()">Cancelar</button>
    `;

    document.getElementById('modal-body-liquidacion').innerHTML = body;
    abrirModalId('modal-liquidacion');
  } catch (error) {
    handleError(error, 'Error al abrir modal de liquidación');
  }
}

function cerrarModalLiquidacion(e) {
  if (e && e.target !== e.currentTarget) return;
  forzarCierreModal('modal-liquidacion');
}

async function confirmarLiquidacion(clienteId) {
  const cantidad = parseInt(document.getElementById('liq-cantidad').value);
  const productoId = document.getElementById('liq-producto').value || null;
  const observaciones = document.getElementById('liq-observaciones').value.trim();

  if (isNaN(cantidad) || cantidad < 1) {
    showToast('⚠️ Ingresa una cantidad válida');
    return;
  }

  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) {
    showToast('⚠️ No hay sesión activa');
    return;
  }

  try {
    // 1. Obtener cliente actual
    const clienteRef = firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('clientes').doc(clienteId);

    const clienteDoc = await clienteRef.get();
    if (!clienteDoc.exists) {
      showToast('⚠️ Cliente no encontrado');
      return;
    }

    const clienteData = clienteDoc.data();
    const liquidoPendiente = clienteData.liquidoPendiente?.total || 0;

    if (cantidad > liquidoPendiente) {
      showToast(`⚠️ No hay suficiente líquido pendiente (máximo: ${liquidoPendiente})`);
      return;
    }

    // 2. Obtener nombre del producto si se seleccionó
    let productoNombre = null;
    if (productoId) {
      const prodDoc = await firebase.firestore()
        .collection('empresas').doc(empresaId)
        .collection('inventario').doc(productoId)
        .get();
      if (prodDoc.exists) {
        productoNombre = prodDoc.data().nombre;
      }
    }

    // 3. Actualizar liquidoPendiente y agregar historial
    const nuevoTotal = liquidoPendiente - cantidad;
    
    // ✅ USAR string ISO en lugar de FieldValue.serverTimestamp()
    const ahora = new Date().toISOString();
    const historialEntry = {
      fecha: ahora,
      cantidad: cantidad,
      producto: productoNombre || null,
      observaciones: observaciones || 'Liquidación realizada',
      entregadoPor: sessionStorage.getItem('userName') || 'admin'
    };

    await clienteRef.update({
      'liquidoPendiente.total': nuevoTotal,
      'liquidoPendiente.ultimaLiquidacion': ahora,
      historialLiquidaciones: firebase.firestore.FieldValue.arrayUnion(historialEntry)
    });

    // 4. Opcional: descontar del inventario si se seleccionó producto
    if (productoId && productoNombre) {
      const prodRef = firebase.firestore()
        .collection('empresas').doc(empresaId)
        .collection('inventario').doc(productoId);
      await prodRef.update({
        stock: firebase.firestore.FieldValue.increment(-cantidad)
      });
      // Actualizar store local
      const prodLocal = store.inventario.find(p => p.id === productoId);
      if (prodLocal) {
        prodLocal.stock -= cantidad;
        if (prodLocal.stock < 0) prodLocal.stock = 0;
        if (prodLocal.stock === 0) prodLocal.estado = 'out';
        else if (prodLocal.stock <= (prodLocal.stockMin || 5)) prodLocal.estado = 'low';
        else prodLocal.estado = 'ok';
      }
    }

    // 5. Actualizar store local del cliente
    const index = store.clientes.findIndex(c => c.id === clienteId);
    if (index !== -1) {
      store.clientes[index].liquidoPendiente = {
        total: nuevoTotal,
        ultimaLiquidacion: ahora
      };
      if (!store.clientes[index].historialLiquidaciones) {
        store.clientes[index].historialLiquidaciones = [];
      }
      store.clientes[index].historialLiquidaciones.push({
        fecha: ahora,
        cantidad: cantidad,
        producto: productoNombre,
        observaciones: observaciones || 'Liquidación realizada',
        entregadoPor: sessionStorage.getItem('userName') || 'admin'
      });
      syncGlobals();
    }

    // 6. Refrescar vistas
    renderClients('', filtroCli, false);
    showToast(`✅ Liquidación registrada: ${cantidad} unidades entregadas`);

    cerrarModalLiquidacion();
  } catch (error) {
    handleError(error, 'Error al confirmar liquidación');
  }
}

async function cargarLiquidacionesCliente() {
  const container = document.getElementById('historial-liquidaciones');
  if (!container) return;

  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = '<div class="empty"><div class="empty-text">Inicia sesión para ver tus liquidaciones</div></div>';
    return;
  }

  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) {
    container.innerHTML = '<div class="empty"><div class="empty-text">No hay sesión activa</div></div>';
    return;
  }

  try {
    const clienteDoc = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('clientes').doc(user.uid)
      .get();

    if (!clienteDoc.exists || !clienteDoc.data().historialLiquidaciones) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">No hay liquidaciones registradas</div></div>';
      return;
    }

    const liquidaciones = clienteDoc.data().historialLiquidaciones;
    // Ordenar de más reciente a más antigua (suponiendo que el array tenga timestamp)
    liquidaciones.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaB - fechaA;
    });

    let html = '<div style="margin-bottom:12px; font-weight:600;">Total entregado: ' + liquidaciones.reduce((sum, l) => sum + l.cantidad, 0) + ' unidades</div>';
    html += liquidaciones.map(l => {
      const fecha = l.fecha?.toDate ? formatDateLocal(l.fecha.toDate()) : (l.fecha || '');
      const producto = l.producto ? `📦 ${escapeHtml(l.producto)}` : '';
      return `
        <div class="sale-card" style="cursor:default;">
          <div class="sale-header">
            <span class="sale-id">${fecha}</span>
            <span class="sale-status pagado" style="background:var(--primary-soft); color:var(--primary);">${l.cantidad} uds.</span>
          </div>
          ${producto ? `<div style="font-size:14px; margin:4px 0;">${producto}</div>` : ''}
          <div style="font-size:12px; color:var(--text3);">${escapeHtml(l.observaciones || 'Sin observaciones')}</div>
          <div style="font-size:11px; color:var(--text3); margin-top:4px;">Entregado por: ${escapeHtml(l.entregadoPor || 'admin')}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Error cargando liquidaciones:', error);
    container.innerHTML = '<div class="empty"><div class="empty-text">Error al cargar liquidaciones</div></div>';
  }
}

// ═══════════════════════════════════════════════════════════════
//  FACTURACIÓN (SIMPLE Y CON DESPACHO)
// ═══════════════════════════════════════════════════════════════
function generarFactura(id) {
  const venta = store.ventas.find(v => v.id === id);
  if (!venta) {
    showToast('⚠️ Venta no encontrada');
    return;
  }
  const empresaId = sessionStorage.getItem('empresaId') || 'MIEMPRESA';
  const empresaNombre = sessionStorage.getItem('empresaNombre') || 'Mi Negocio';
  const empresaRIF = 'J-12345678-9';
  const empresaTelefono = '+58 412 000 0000';
  const empresaDireccion = 'Av. Principal, Local 1, Caracas';
  const empresaEmail = 'info@tunegocio.com';
  const cliente = venta.cliente || 'Cliente general';
  const total = venta.total || formatCurrency(0);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 141);
  doc.text('FACTURA', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${empresaNombre}`, margin, y);
  y += 5;
  doc.text(`RIF: ${empresaRIF}`, margin, y);
  y += 5;
  doc.text(`Teléfono: ${empresaTelefono}`, margin, y);
  y += 5;
  doc.text(`Email: ${empresaEmail}`, margin, y);
  y += 5;
  doc.text(`Dirección: ${empresaDireccion}`, margin, y);
  y += 8;
  doc.setDrawColor(0, 51, 141);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Cliente:`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cliente}`, margin + 25, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Fecha:`, margin, y);
  doc.setFont('helvetica', 'normal');
  const fecha = venta.fecha || new Date().toLocaleDateString();
  doc.text(`${fecha}`, margin + 25, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`N° Factura:`, margin, y);
  doc.setFont('helvetica', 'normal');
  const numFactura = venta.id ? venta.id.slice(0, 8).toUpperCase() : '00000001';
  doc.text(`${numFactura}`, margin + 30, y);
  y += 10;
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  const tableData = [];
  if (venta.items && Array.isArray(venta.items) && venta.items.length > 0) {
    venta.items.forEach(item => {
      tableData.push([
        item.nombre || 'Producto',
        item.cantidad || 1,
        formatCurrency(item.precio || 0),
        formatCurrency((item.cantidad || 1) * (item.precio || 0))
      ]);
    });
  } else {
    const producto = venta.producto || 'Producto';
    const cantidad = venta.items || 1;
    const precioUnit = venta.total ? parseCurrency(venta.total) / cantidad : 0;
    tableData.push([
      producto,
      cantidad,
      formatCurrency(precioUnit),
      venta.total || formatCurrency(precioUnit * cantidad)
    ]);
  }
  doc.autoTable({
    startY: y,
    head: [['Producto', 'Cant.', 'Precio Unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { 
      fillColor: [0, 51, 141], 
      textColor: [255, 255, 255], 
      fontSize: 10,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin },
    didDrawPage: function (data) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const totalFormateado = venta.total || formatCurrency(0);
  doc.text(`TOTAL: ${totalFormateado}`, pageWidth - margin - 10, finalY, { align: 'right' });
  if (venta.notas && venta.notas.trim() !== '') {
    let yNotas = finalY + 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Notas: ${venta.notas}`, margin, yNotas);
  }
  const pieY = doc.internal.pageSize.getHeight() - 18;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('¡Gracias por su compra!', pageWidth / 2, pieY, { align: 'center' });
  doc.text('Este documento es una factura válida para efectos tributarios.', pageWidth / 2, pieY + 5, { align: 'center' });
  doc.save(`factura_${numFactura}.pdf`);
  showToast('✅ Factura generada correctamente');
}

// ================================================================
//  DESPACHO DE PEDIDOS (Facturación + Stock + Envases + Alertas)
// ================================================================

function abrirModalDespacho(id) {
  const venta = store.ventas.find(v => v.id === id);
  if (!venta) {
    showToast('⚠️ Venta no encontrada');
    return;
  }
  if (venta.status !== 'pendiente') {
    showToast('⚠️ Esta venta ya fue despachada');
    return;
  }

  const cliente = clientes.find(c => c.nombre === venta.cliente);
  if (!cliente) {
    showToast('⚠️ Cliente no encontrado');
    return;
  }

  let productos = venta.productos || [];
  if (!productos.length) {
    if (venta.items && venta.producto && venta.producto !== 'Pedido desde app cliente') {
      productos.push({ nombre: venta.producto, cantidad: venta.items });
    } else {
      showToast('⚠️ No se pueden identificar los productos del pedido');
      return;
    }
  }

  const erroresStock = verificarStock(productos);
  if (erroresStock.length > 0) {
    let mensaje = '❌ No se puede despachar por falta de stock:\n';
    erroresStock.forEach(err => mensaje += `- ${err}\n`);
    alert(mensaje);
    return;
  }

  const saldoEnvases = cliente.saldoEnvases || {};
  const facturasPendientes = store.ventas.filter(v => 
    v.cliente === cliente.nombre && 
    v.status === 'pendiente' && 
    v.id !== id
  ).length;

  let envasesHTML = '';
  for (const [tipo, config] of Object.entries(TIPOS_ENVASE)) {
    const saldoActual = saldoEnvases[tipo] || 0;
    envasesHTML += `
      <div style="border-bottom:1px solid var(--border); padding:8px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${config.nombre}</strong>
          <span style="font-size:12px; color:var(--text3);">(${config.unidadesPorEnvase} unds/envase)</span>
        </div>
        <div style="display:flex; gap:8px; margin-top:4px; flex-wrap:wrap;">
          <div style="flex:1; min-width:80px;">
            <label style="font-size:11px; color:var(--text3);">Saldo actual</label>
            <input type="number" id="saldo-actual-${tipo}" value="${saldoActual}" disabled style="width:100%; padding:4px 8px; border:1px solid var(--border); border-radius:4px; background:var(--surface2);">
          </div>
          <div style="flex:1; min-width:80px;">
            <label style="font-size:11px; color:var(--text3);">Prestados hoy</label>
            <input type="number" id="prestados-${tipo}" value="0" min="0" style="width:100%; padding:4px 8px; border:1px solid var(--border); border-radius:4px;" oninput="calcularNuevoSaldo('${tipo}')">
          </div>
          <div style="flex:1; min-width:80px;">
            <label style="font-size:11px; color:var(--text3);">Recuperados hoy</label>
            <input type="number" id="recuperados-${tipo}" value="0" min="0" style="width:100%; padding:4px 8px; border:1px solid var(--border); border-radius:4px;" oninput="calcularNuevoSaldo('${tipo}')">
          </div>
          <div style="flex:1; min-width:80px;">
            <label style="font-size:11px; color:var(--text3);">Nuevo saldo</label>
            <input type="number" id="nuevo-saldo-${tipo}" value="${saldoActual}" disabled style="width:100%; padding:4px 8px; border:1px solid var(--border); border-radius:4px; background:var(--surface2);">
          </div>
        </div>
      </div>
    `;
  }

  let alertasHTML = '';
  if (facturasPendientes >= 2) {
    alertasHTML += `<div style="background:var(--red-soft); color:var(--red); padding:10px; border-radius:var(--radius-sm); margin-bottom:10px;">
      🚨 <strong>Cliente moroso:</strong> Tiene ${facturasPendientes} facturas pendientes.
    </div>`;
  } else if (facturasPendientes === 1) {
    alertasHTML += `<div style="background:var(--amber-soft); color:var(--amber); padding:10px; border-radius:var(--radius-sm); margin-bottom:10px;">
      ⚠️ <strong>Atención:</strong> Cliente tiene 1 factura pendiente.
    </div>`;
  }

  const body = `
    <div style="margin-bottom:16px;">
      <h3>🧾 Despachar pedido</h3>
      <p><strong>Cliente:</strong> ${cliente.nombre}</p>
      <p><strong>Productos:</strong></p>
      <ul>
        ${productos.map(p => `<li>${p.nombre} x ${p.cantidad}</li>`).join('')}
      </ul>
      <p><strong>Total:</strong> ${venta.total}</p>
    </div>
    ${alertasHTML}
    <div class="field">
      <label>Método de pago *</label>
      <select id="despacho-metodo" required>
        <option value="">Seleccionar...</option>
        <option value="Efectivo">Efectivo</option>
        <option value="Pago Móvil">Pago Móvil</option>
        <option value="Transferencia">Transferencia</option>
        <option value="Crédito 8 días">Crédito 8 días</option>
        <option value="Otro">Otro</option>
      </select>
    </div>
    <div class="field" id="campo-otro-metodo" style="display:none;">
      <label>Especificar método</label>
      <input type="text" id="despacho-metodo-otro" placeholder="Ej: Cheque, Depósito...">
    </div>
    <div style="margin:16px 0; border-top:2px solid var(--border); padding-top:12px;">
      <h4>📦 Control de envases (vacíos)</h4>
      <p style="font-size:12px; color:var(--text3);">Ingresa las cantidades de envases que se prestan o recuperan hoy.</p>
      ${envasesHTML}
    </div>
    <div class="field">
      <label>Notas adicionales</label>
      <textarea id="despacho-notas" rows="2" placeholder="Observaciones..."></textarea>
    </div>
    <button class="btn btn-primary" onclick="confirmarDespacho('${id}')">✅ Confirmar despacho</button>
    <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
  `;

  openModalWithContent('Despachar pedido', body);

  document.getElementById('despacho-metodo').addEventListener('change', function() {
    const otroCampo = document.getElementById('campo-otro-metodo');
    if (this.value === 'Otro') {
      otroCampo.style.display = 'block';
    } else {
      otroCampo.style.display = 'none';
    }
  });
}

function calcularNuevoSaldo(tipo) {
  const saldoActual = parseInt(document.getElementById(`saldo-actual-${tipo}`).value) || 0;
  const prestados = parseInt(document.getElementById(`prestados-${tipo}`).value) || 0;
  const recuperados = parseInt(document.getElementById(`recuperados-${tipo}`).value) || 0;
  const nuevoSaldo = saldoActual + prestados - recuperados;
  document.getElementById(`nuevo-saldo-${tipo}`).value = nuevoSaldo;
}

function verificarStock(productos) {
  const errores = [];
  for (const item of productos) {
    const producto = inventario.find(p => p.nombre === item.nombre);
    if (!producto) {
      errores.push(`Producto "${item.nombre}" no encontrado en inventario`);
    } else if (producto.stock < item.cantidad) {
      errores.push(`Stock insuficiente para "${item.nombre}" (disponible: ${producto.stock}, solicitado: ${item.cantidad})`);
    }
  }
  return errores;
}

async function descontarStock(productos) {
  for (const item of productos) {
    const producto = inventario.find(p => p.nombre === item.nombre);
    if (producto) {
      const nuevoStock = producto.stock - item.cantidad;
      const estado = nuevoStock === 0 ? 'out' : nuevoStock <= (producto.stockMin || 5) ? 'low' : 'ok';
      await store.updateProducto(producto.id, {
        stock: nuevoStock,
        estado: estado
      });
      producto.stock = nuevoStock;
      producto.estado = estado;
    }
  }
}

async function obtenerSiguienteNumeroFactura(empresaId) {
  const empresaRef = firebase.firestore().collection('empresas').doc(empresaId);
  return await firebase.firestore().runTransaction(async (transaction) => {
    const doc = await transaction.get(empresaRef);
    if (!doc.exists) {
      throw new Error('Empresa no encontrada');
    }
    const data = doc.data();
    const ultimo = data.ultimoNumeroFactura || 0;
    const nuevo = ultimo + 1;
    transaction.update(empresaRef, { ultimoNumeroFactura: nuevo });
    return nuevo;
  });
}

async function actualizarSaldoEnvases(clienteId, envases) {
  const clienteRef = firebase.firestore()
    .collection('empresas').doc(sessionStorage.getItem('empresaId'))
    .collection('clientes').doc(clienteId);
  await firebase.firestore().runTransaction(async (transaction) => {
    const doc = await transaction.get(clienteRef);
    if (!doc.exists) {
      throw new Error('Cliente no encontrado');
    }
    const data = doc.data();
    const saldoActual = data.saldoEnvases || {};
    const nuevoSaldo = { ...saldoActual };
    for (const [tipo, valores] of Object.entries(envases)) {
      const prestados = valores.prestados || 0;
      const recuperados = valores.recuperados || 0;
      nuevoSaldo[tipo] = (saldoActual[tipo] || 0) + prestados - recuperados;
    }
    transaction.update(clienteRef, { saldoEnvases: nuevoSaldo });
  });
}

// ================================================================
//  NUEVA FUNCIÓN: Obtener aporte efectivo de un cliente
// ================================================================
async function obtenerAporteEfectivoCliente(clienteId) {
  try {
    const perfilDoc = await firebase.firestore()
      .collection('userProfiles')
      .doc(clienteId)
      .get();
    if (!perfilDoc.exists) {
      console.warn('⚠️ Perfil no encontrado para cliente:', clienteId);
      return { valor: 0, tipo: 'porcentaje_liquido', aplicaA: ['Cervezas Polar'] };
    }
    const perfil = perfilDoc.data();

    if (perfil.aportePersonalizado && perfil.aportePersonalizado.valor !== undefined) {
      console.log('📌 Usando aporte personalizado:', perfil.aportePersonalizado.valor);
      return {
        valor: perfil.aportePersonalizado.valor,
        tipo: 'porcentaje_liquido',
        aplicaA: ['Cervezas Polar']
      };
    }

    if (!perfil.categoriaClienteId) {
      console.warn('⚠️ Cliente sin categoría, usando 0%');
      return { valor: 0, tipo: 'porcentaje_liquido', aplicaA: ['Cervezas Polar'] };
    }

    const empresaId = perfil.empresaId;
    const catDoc = await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('categoriasClientes')
      .doc(perfil.categoriaClienteId)
      .get();
    if (!catDoc.exists) {
      console.warn('⚠️ Categoría no encontrada, usando 0%');
      return { valor: 0, tipo: 'porcentaje_liquido', aplicaA: ['Cervezas Polar'] };
    }
    const catData = catDoc.data();
    return {
      valor: catData.aporteEspecial?.valor || 0,
      tipo: catData.aporteEspecial?.tipo || 'porcentaje_liquido',
      aplicaA: catData.aporteEspecial?.aplicaA || ['Cervezas Polar']
    };
  } catch (error) {
    console.error('❌ Error obteniendo aporte del cliente:', error);
    return { valor: 0, tipo: 'porcentaje_liquido', aplicaA: ['Cervezas Polar'] };
  }
}

// ================================================================
//  CONFIRMAR DESPACHO (modificado con acumulación de líquido)
// ================================================================
async function confirmarDespacho(id) {
  const venta = store.ventas.find(v => v.id === id);
  if (!venta) {
    showToast('⚠️ Venta no encontrada');
    return;
  }
  const metodoSelect = document.getElementById('despacho-metodo');
  const metodo = metodoSelect.value;
  if (!metodo) {
    showToast('⚠️ Selecciona un método de pago');
    return;
  }
  let metodoFinal = metodo;
  if (metodo === 'Otro') {
    const otro = document.getElementById('despacho-metodo-otro').value.trim();
    if (!otro) {
      showToast('⚠️ Especifica el método de pago');
      return;
    }
    metodoFinal = otro;
  }
  const notas = document.getElementById('despacho-notas').value.trim();
  const envases = {};
  let hayMovimiento = false;
  for (const tipo of Object.keys(TIPOS_ENVASE)) {
    const prestados = parseInt(document.getElementById(`prestados-${tipo}`).value) || 0;
    const recuperados = parseInt(document.getElementById(`recuperados-${tipo}`).value) || 0;
    if (prestados > 0 || recuperados > 0) {
      hayMovimiento = true;
    }
    const saldoAnterior = parseInt(document.getElementById(`saldo-actual-${tipo}`).value) || 0;
    const nuevoSaldo = saldoAnterior + prestados - recuperados;
    envases[tipo] = {
      saldoAnterior,
      prestados,
      recuperados,
      saldoNuevo: nuevoSaldo
    };
  }
  for (const [tipo, datos] of Object.entries(envases)) {
    if (datos.prestados < 0 || datos.recuperados < 0) {
      showToast(`⚠️ Las cantidades para ${TIPOS_ENVASE[tipo].nombre} no pueden ser negativas`);
      return;
    }
  }
  const productos = venta.productos || [];
  if (!productos.length) {
    if (venta.items && venta.producto) {
      productos.push({ nombre: venta.producto, cantidad: venta.items });
    } else {
      showToast('⚠️ No se pueden identificar los productos del pedido');
      return;
    }
  }
  const erroresStock = verificarStock(productos);
  if (erroresStock.length > 0) {
    let mensaje = '❌ No se puede despachar por falta de stock:\n';
    erroresStock.forEach(err => mensaje += `- ${err}\n`);
    alert(mensaje);
    return;
  }
  const empresaId = sessionStorage.getItem('empresaId');
  let numeroFactura;
  try {
    numeroFactura = await obtenerSiguienteNumeroFactura(empresaId);
  } catch (error) {
    showToast('❌ Error al generar número de factura');
    console.error(error);
    return;
  }
  const cliente = clientes.find(c => c.nombre === venta.cliente);
  if (!cliente) {
    showToast('⚠️ Cliente no encontrado');
    return;
  }
  try {
    // Descontar stock
    await descontarStock(productos);

    // Actualizar saldo de envases
    if (hayMovimiento) {
      const envasesParaCliente = {};
      for (const [tipo, datos] of Object.entries(envases)) {
        envasesParaCliente[tipo] = {
          prestados: datos.prestados,
          recuperados: datos.recuperados
        };
      }
      await actualizarSaldoEnvases(cliente.id, envasesParaCliente);
    }

    // ============================================================
    //  ACUMULAR LÍQUIDO SEGÚN APORTE DEL CLIENTE
    // ============================================================
    let ventaUpdates = {
      status: 'pagado',
      metodo: metodoFinal,
      numeroFactura: numeroFactura,
      fechaDespacho: new Date().toISOString(),
      notas: notas || venta.notas || '',
      envases: envases
    };

    try {
      const aporte = await obtenerAporteEfectivoCliente(cliente.id);
      console.log('📌 Aporte del cliente:', aporte.valor + '%');

      if (aporte.valor > 0) {
        let unidadesCerveza = 0;
        for (const item of productos) {
          const producto = inventario.find(p => p.nombre === item.nombre);
          if (producto && producto.cat === 'Cervezas Polar') {
            unidadesCerveza += item.cantidad;
          }
        }

        if (unidadesCerveza > 0) {
          const unidadesExtra = Math.floor(unidadesCerveza * (aporte.valor / 100));
          console.log(`📌 Unidades vendidas de cerveza: ${unidadesCerveza}, líquido generado: ${unidadesExtra}`);

          if (unidadesExtra > 0) {
            const clienteRef = firebase.firestore()
              .collection('empresas')
              .doc(empresaId)
              .collection('clientes')
              .doc(cliente.id);

            await firebase.firestore().runTransaction(async (transaction) => {
              const doc = await transaction.get(clienteRef);
              if (!doc.exists) return;

              const data = doc.data();
              const liquidoPendiente = data.liquidoPendiente || { total: 0, ultimaLiquidacion: null };
              const nuevoTotal = (liquidoPendiente.total || 0) + unidadesExtra;

              transaction.update(clienteRef, {
                'liquidoPendiente.total': nuevoTotal,
                'liquidoPendiente.ultimaLiquidacion': liquidoPendiente.ultimaLiquidacion || null
              });
            });

            ventaUpdates.aporteGenerado = {
              unidadesVendidas: unidadesCerveza,
              porcentaje: aporte.valor,
              unidadesExtra: unidadesExtra
            };
            console.log(`✅ Líquido acumulado: ${unidadesExtra} unidades para ${cliente.nombre}`);
          }
        } else {
          console.log('ℹ️ No hay productos de cerveza en este pedido, sin líquido acumulado.');
        }
      } else {
        console.log('ℹ️ Cliente sin aporte especial (0%).');
      }
    } catch (error) {
      console.error('❌ Error acumulando líquido:', error);
    }

    await store.updateVenta(id, ventaUpdates);
    syncGlobals();

    const ventaActualizada = store.ventas.find(v => v.id === id);
    generarFacturaDespacho(ventaActualizada, numeroFactura, envases);
    renderVentas('', filtroVentas, 1);
    renderActividadReciente();
    updateKPIs();
    closeModal();
    showToast(`✅ Pedido despachado. Factura #${numeroFactura} generada.`);
  } catch (error) {
    console.error('Error al confirmar despacho:', error);
    showToast('❌ Error al procesar el despacho: ' + error.message);
  }
}

function generarFacturaDespacho(venta, numeroFactura, envases) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  const empresaNombre = sessionStorage.getItem('empresaNombre') || 'Mi Negocio';
  const empresaRIF = 'J-12345678-9';
  const empresaTelefono = '+58 412 000 0000';
  const empresaDireccion = 'Av. Principal, Local 1, Caracas';
  const empresaEmail = 'info@tunegocio.com';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 141);
  doc.text('FACTURA', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(empresaNombre, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`RIF: ${empresaRIF}`, margin, y);
  y += 5;
  doc.text(`Teléfono: ${empresaTelefono}`, margin, y);
  y += 5;
  doc.text(`Email: ${empresaEmail}`, margin, y);
  y += 5;
  doc.text(`Dirección: ${empresaDireccion}`, margin, y);
  y += 8;

  doc.setDrawColor(0, 51, 141);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Cliente:`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(venta.cliente || 'Cliente general', margin + 30, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text(`Fecha:`, margin, y);
  doc.setFont('helvetica', 'normal');
  const fecha = venta.fechaDespacho ? new Date(venta.fechaDespacho) : new Date();
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(fechaFormateada, margin + 30, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text(`N° Factura:`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(numeroFactura), margin + 30, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text(`Método de pago:`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(venta.metodo || 'No especificado', margin + 40, y);
  y += 10;

  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const productos = venta.productos || [];
  let tableData = [];
  
  if (productos.length > 0) {
    productos.forEach(item => {
      const precioUnit = item.precio || 0;
      const cantidad = item.cantidad || 1;
      tableData.push([
        item.nombre || 'Producto',
        cantidad,
        formatCurrency(precioUnit),
        formatCurrency(precioUnit * cantidad)
      ]);
    });
  } else {
    const producto = venta.producto || 'Producto';
    const cantidad = venta.items || 1;
    const precioUnit = venta.total ? parseCurrency(venta.total) / cantidad : 0;
    tableData.push([
      producto,
      cantidad,
      formatCurrency(precioUnit),
      venta.total || formatCurrency(precioUnit * cantidad)
    ]);
  }

  if (tableData.length === 0) {
    tableData.push(['Sin productos', 0, formatCurrency(0), formatCurrency(0)]);
  }

  doc.autoTable({
    startY: y,
    head: [['Producto', 'Cant.', 'Precio Unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [0, 51, 141],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin },
    didDrawPage: function(data) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });

  let finalY = doc.lastAutoTable.finalY + 6;

  const totalFormateado = venta.total || formatCurrency(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL: ${totalFormateado}`, pageWidth - margin - 10, finalY, { align: 'right' });
  finalY += 10;

  if (envases && Object.keys(envases).length > 0) {
    const tieneMovimiento = Object.values(envases).some(e => e.prestados > 0 || e.recuperados > 0);
    if (tieneMovimiento) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('--- CONTROL DE ENVASES ---', margin, finalY);
      finalY += 6;

      const envasesData = [];
      for (const [tipo, datos] of Object.entries(envases)) {
        const nombre = TIPOS_ENVASE[tipo]?.nombre || tipo;
        envasesData.push([
          nombre,
          datos.saldoAnterior || 0,
          datos.prestados || 0,
          datos.recuperados || 0,
          datos.saldoNuevo || 0
        ]);
      }

      if (envasesData.length > 0) {
        doc.autoTable({
          startY: finalY,
          head: [['Tipo', 'Saldo ant.', 'Prestados', 'Recuperados', 'Nuevo saldo']],
          body: envasesData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [100, 100, 100],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });
        finalY = doc.lastAutoTable.finalY + 8;
      } else {
        finalY += 6;
      }
    }
  }

  if (venta.notas && venta.notas.trim() !== '') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Notas: ${venta.notas}`, margin, finalY);
    finalY += 8;
  }

  const pieY = doc.internal.pageSize.getHeight() - 18;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('¡Gracias por su compra!', pageWidth / 2, pieY, { align: 'center' });
  doc.text('Este documento es una factura válida para efectos tributarios.', pageWidth / 2, pieY + 5, { align: 'center' });

  doc.save(`factura_${numeroFactura}.pdf`);
}

// ═══════════════════════════════════════════════════════════════
//  INICIALIZACIÓN (DOMContentLoaded)
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  const fechaEl = document.getElementById('fecha-hoy');
  if (fechaEl) {
    fechaEl.textContent = `${dias[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;
  }
  loadTheme();
  if (typeof cargarTemaGuardado === 'function') cargarTemaGuardado();
  if (typeof cargarCarrito === 'function') cargarCarrito();
  if (typeof initStore === 'function') initStore();

  firebase.auth().onAuthStateChanged(async (user) => {
    if (_registrando) {
      console.log('⏳ Registro en curso, onAuthStateChanged ignorado');
      return;
    }
    if (sessionStorage.getItem('empresaId') && sessionStorage.getItem('userRol')) {
      console.log('ℹ️ Sesión ya activa en sessionStorage, onAuthStateChanged skip');
      return;
    }
    if (user) {
      try {
        const perfilDoc = await firebase.firestore()
          .collection('userProfiles').doc(user.uid)
          .get();
        if (!perfilDoc.exists) {
          console.warn('⚠️ Perfil no encontrado para uid:', user.uid);
          await firebase.auth().signOut();
          mostrarPantallaBienvenida();
          return;
        }
        const perfil = perfilDoc.data();
        const empresaId = perfil.empresaId;
        const rol = perfil.rol;
        const nombre = perfil.nombre || user.email;
        sessionStorage.setItem('empresaId', empresaId);
        sessionStorage.setItem('userEmail', user.email);
        sessionStorage.setItem('userName', nombre);
        sessionStorage.setItem('userRol', rol);
        ocultarPantallaBienvenida();
        if (rol === 'admin') {
          actualizarAdminUI(nombre);
          await store.cargarDatosEmpresa(empresaId);
          syncGlobals();
          goScreen('dashboard');
          setTimeout(() => { if(typeof renderChartVentas === 'function') renderChartVentas(); }, 300);
        } else {
          document.getElementById('admin-menu').style.display = 'none';
          document.getElementById('btn-codigo').style.display = 'none';
          const bottomNav = document.getElementById('bottom-nav');
          const fabBtn = document.getElementById('fab-btn');
          if (bottomNav) bottomNav.style.display = 'none';
          if (fabBtn) fabBtn.style.display = 'none';
          await store.cargarDatosEmpresa(empresaId);
          syncGlobals();
          goScreen('cliente');
          mostrarPanelCliente();
        }
      } catch (error) {
        console.error('❌ Error verificando sesión:', error);
        mostrarPantallaBienvenida();
      }
    } else {
      mostrarPantallaBienvenida();
    }
  });

  document.addEventListener('click', function(e) {
    const tab = e.target.closest('.config-tab');
    if (tab && tab.dataset.tab) {
      cambiarTabConfiguracion(tab.dataset.tab);
    }
  });
  document.addEventListener('click', function(e) {
    const tab = e.target.closest('[data-tab-cliente]');
    if (tab && tab.dataset.tabCliente) {
      cambiarTabCliente(tab.dataset.tabCliente);
    }
  });

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    try {
      if (window.PageAgent) {
        agent = new window.PageAgent({
          model: 'gemma-4-e4b',
          baseURL: 'http://localhost:1235/v1',
          language: 'es-ES'
        });
        agentReady = true;
        console.log('🤖 Page Agent inicializado con LM Studio (modo local)');
      }
    } catch (e) {
      console.warn('⚠️ Error inicializando Page Agent:', e.message);
      agentReady = false;
    }
  } else {
    console.log('ℹ️ Modo Light: Page Agent desactivado (GitHub Pages)');
    agentReady = false;
  }
  setTimeout(connectWebSocket, 1000);
  console.log('🤖 Sistema de comandos listo (modo mixto)');
});

// ================================================================
//  PAGOS INTEGRADOS (P2P) - CONFIRMACIÓN DE PAGO
// ================================================================

async function confirmarPago(id) {
  const venta = store.ventas.find(v => v.id === id);
  if (!venta) {
    showToast('⚠️ Venta no encontrada');
    return;
  }
  
  if (venta.status !== 'pendiente') {
    showToast('⚠️ Esta venta ya fue procesada');
    return;
  }

  if (!confirm(`¿Confirmar pago del pedido de ${venta.cliente} por ${venta.total}?`)) {
    return;
  }

  try {
    await store.updateVenta(id, {
      status: 'pagado',
      fechaPagoConfirmado: new Date().toISOString()
    });
    syncGlobals();
    renderVentas('', filtroVentas, 1);
    updateKPIs();
    showToast('✅ Pago confirmado. Ahora puedes despachar el pedido.');
  } catch (error) {
    handleError(error, 'Error al confirmar pago');
  }
}

// ═══════════════════════════════════════════════════════════════
//  EXPOSICIÓN DE FUNCIONES GLOBALES (incluyendo liquidación)
// ═══════════════════════════════════════════════════════════════
const funcionesGlobales = {
  goScreen, filterChip, filterVentas, filterInv, filterClients,
  switchReportTab, toggleTheme, loadTheme,
  guardarVenta, guardarProducto, guardarCliente,
  editVenta, updateVentaFromModal, editProducto, updateProductoFromModal,
  editCliente, updateClienteFromModal,
  confirmDeleteVenta, confirmDeleteProducto, confirmDeleteCliente,
  openModal, closeModal, openModalWithContent, confirmAction, openConfirmModal,
  loginCliente, registrarCliente, mostrarRegistro, mostrarLogin,
  toggleCliente, mostrarPanelCliente, cerrarSesion,
  renderCatalogo, agregarAlCarrito, actualizarCarritoCount, verCarrito,
  vaciarCarrito, realizarPedido, renderHistorial, renderActividadReciente,
  actualizarResumenConfiguracion,
  exportarDatosJSON, importarDatosJSON, actualizarAvatar,
  agentCommand, sendAgentCommand, toggleAgentPanel, executeAgentCommand, executeManualCommand,
  cambiarTabConfiguracion, cambiarTabCliente,
  enviarMensajeChat, cargarMensajesChat,
  abrirModalAlerta, enviarAlerta, cargarAlertas, votarAlerta,
  toggleAdminMenu, closeAdminMenu, actualizarAdminUI,
  renderizarTablaProductos, renderizarTablaClientes, renderizarTablaVentas,
  filtrarCatalogo,
  mostrarPantallaBienvenida, ocultarPantallaBienvenida,
  mostrarRegistroEmpresa, cerrarModalRegistroEmpresa,
  mostrarRegistroCliente, cerrarModalRegistroCliente,
  mostrarLoginUnificado, cerrarModalLogin,
  registrarEmpresa, registrarClienteNuevo, loginUnificado,
  generarCodigoAcceso, mostrarCodigoInvitacion, copiarCodigo, regenerarCodigo, cerrarModalCodigo,
  forzarCierreModal, abrirModalId,
  abrirModalDespacho, confirmarDespacho, generarFacturaDespacho,
  verificarStock, descontarStock, obtenerSiguienteNumeroFactura,
  actualizarSaldoEnvases, calcularNuevoSaldo,
  generarFactura,
  cargarDatosPago, guardarDatosPago, mostrarOrdenPago, notificarPago, confirmarPago,
  // Nuevas funciones de categorías
  obtenerAporteEfectivoCliente,
  cargarCategorias,
  abrirModalCategoria,
  cerrarModalCategoria,
  guardarCategoria,
  editarCategoria,
  toggleCategoriaEstado,
  // Liquidación de líquido
  abrirModalLiquidacion,
  cerrarModalLiquidacion,
  confirmarLiquidacion,
  cargarLiquidacionesCliente
};

Object.entries(funcionesGlobales).forEach(([nombre, fn]) => {
  window[nombre] = fn;
});

console.log('✅ app.js cargado correctamente — Versión unificada con despacho de pedidos, control de envases, gestión de aportes especiales (categorías y líquido) y CRUD de categorías.');
