// ── NAVEGACIÓN Y LÓGICA PRINCIPAL ──

let currentScreen = 'dashboard';
const screens = ['dashboard', 'ventas', 'inventario', 'clientes', 'reportes', 'cliente', 'configuracion'];

let filtroVentas = 'todas';
let filtroInv = 'todos';
let filtroCli = 'todos';

// Bandera para evitar que onAuthStateChanged interfiera durante registro
let _registrando = false;

// ═══════════════════════════════════════════════════════════════
//  NUEVO FLUJO DE INGRESO — SIN ÍNDICES (userProfiles)
// ═══════════════════════════════════════════════════════════════

function mostrarPantallaBienvenida() {
  document.getElementById('screen-bienvenida').classList.add('active');
  document.getElementById('top-nav').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';
  document.getElementById('fab-btn').style.display = 'none';
  screens.forEach(s => {
    const screenEl = document.getElementById('screen-' + s);
    if (screenEl) screenEl.classList.remove('active');
  });
}

function ocultarPantallaBienvenida() {
  document.getElementById('screen-bienvenida').classList.remove('active');
  document.getElementById('top-nav').style.display = 'flex';
  document.getElementById('bottom-nav').style.display = 'flex';
  document.getElementById('fab-btn').style.display = 'flex';
}

// ── MODALES DEL FLUJO DE INGRESO ──

function mostrarRegistroEmpresa() {
  const modal = document.getElementById('modal-registro-empresa');
  if (modal) {
    modal.style.cssText = ''; // Limpia cualquier cierre forzado anterior
    modal.classList.add('open');
  }
}
function cerrarModalRegistroEmpresa(e) {
  if (e && e.target !== document.getElementById('modal-registro-empresa') && e.target !== e.currentTarget) return;
  const modal = document.getElementById('modal-registro-empresa');
  if (modal) {
    modal.classList.remove('open');
    modal.style.cssText = 'display:none !important; opacity:0; visibility:hidden; pointer-events:none; position:fixed; z-index:-1;';
  }
}

function mostrarRegistroCliente() {
  const modal = document.getElementById('modal-registro-cliente');
  if (modal) {
    modal.style.cssText = '';
    modal.classList.add('open');
  }
}
function cerrarModalRegistroCliente(e) {
  if (e && e.target !== document.getElementById('modal-registro-cliente') && e.target !== e.currentTarget) return;
  const modal = document.getElementById('modal-registro-cliente');
  if (modal) {
    modal.classList.remove('open');
    modal.style.cssText = 'display:none !important; opacity:0; visibility:hidden; pointer-events:none; position:fixed; z-index:-1;';
  }
}

function mostrarLoginUnificado() {
  document.getElementById('modal-login').classList.add('open');
}
function cerrarModalLogin(e) {
  if (!e || e.target === document.getElementById('modal-login')) {
    document.getElementById('modal-login').classList.remove('open');
  }
}

function cerrarModalCodigo(e) {
  if (!e || e.target === document.getElementById('modal-codigo')) {
    document.getElementById('modal-codigo').classList.remove('open');
  }
}

// ── GENERADOR DE CÓDIGO DE ACCESO ──

function generarCodigoAcceso() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

// ── REGISTRO DE FRANQUICIA (ADMIN) ──

async function registrarEmpresa() {
  const nombreNegocio = document.getElementById('reg-emp-nombre').value.trim();
  const nombreAdmin   = document.getElementById('reg-emp-admin').value.trim();
  const email         = document.getElementById('reg-emp-email').value.trim();
  const password      = document.getElementById('reg-emp-pass').value;

  if (!nombreNegocio || !nombreAdmin || !email || !password) {
    showToast('❌ Completa todos los campos'); return;
  }
  if (password.length < 6) {
    showToast('❌ La contraseña debe tener al menos 6 caracteres'); return;
  }

  _registrando = true;
  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    const codigoAcceso = generarCodigoAcceso();
    const empresaRef = await firebase.firestore().collection('empresas').add({
      nombre: nombreNegocio,
      codigoAcceso: codigoAcceso,
      creadoPor: user.uid,
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Crear admin en subcolección de la empresa
    await firebase.firestore()
      .collection('empresas').doc(empresaRef.id)
      .collection('usuarios').doc(user.uid)
      .set({
        uid: user.uid,
        nombre: nombreAdmin,
        email: email,
        rol: 'admin',
        fcmToken: ''
      });

    // Crear perfil raíz para login SIN ÍNDICES
    await firebase.firestore()
      .collection('userProfiles').doc(user.uid)
      .set({
        uid: user.uid,
        nombre: nombreAdmin,
        email: email,
        rol: 'admin',
        empresaId: empresaRef.id,
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });

    sessionStorage.setItem('empresaId', empresaRef.id);
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userName', nombreAdmin);
    sessionStorage.setItem('userRol', 'admin');

    cerrarModalRegistroEmpresa();
// Cierre forzado del modal por si la función anterior falla
const modalEmp = document.getElementById('modal-registro-empresa');
if (modalEmp) { modalEmp.classList.remove('open'); modalEmp.style.display = 'none'; }
    ocultarPantallaBienvenida();
    actualizarAdminUI(nombreAdmin);
    await store.cargarDatosEmpresa(empresaRef.id);
    syncGlobals();
    goScreen('dashboard');

    setTimeout(() => {
      if (typeof solicitarPermisoNotificaciones === 'function') {
        solicitarPermisoNotificaciones().then(token => {
          if (token) {
            showToast('🔔 Notificaciones activadas');
            if (typeof escucharMensajesForeground === 'function') escucharMensajesForeground();
          }
        });
      }
    }, 1000);

    showToast(`✅ ¡Franquicia "${nombreNegocio}" creada! Código: ${codigoAcceso}`);

  } catch (error) {
    console.error('❌ Error registrando franquicia:', error);
    if (error.code === 'auth/email-already-in-use') {
      showToast('❌ Este correo ya está registrado');
    } else if (error.code === 'auth/invalid-email') {
      showToast('❌ Correo electrónico inválido');
    } else {
      showToast('❌ Error: ' + error.message);
    }
  } finally {
    _registrando = false;
  }
}

// ── REGISTRO DE CLIENTE POR CÓDIGO ──

async function registrarClienteNuevo() {
  const nombre   = document.getElementById('reg-cli-nombre').value.trim();
  const email    = document.getElementById('reg-cli-email').value.trim();
  const password = document.getElementById('reg-cli-pass').value;
  const codigo   = document.getElementById('reg-cli-codigo').value.trim().toUpperCase();

  if (!nombre || !email || !password || !codigo) {
    showToast('❌ Completa todos los campos'); return;
  }
  if (password.length < 6) {
    showToast('❌ La contraseña debe tener al menos 6 caracteres'); return;
  }
  if (codigo.length !== 6) {
    showToast('❌ El código debe tener 6 caracteres'); return;
  }

  let user = null;
  _registrando = true;
  try {
    // 1. Crear usuario en Auth PRIMERO (para tener permisos en Firestore)
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    user = userCredential.user;

    // 2. Ahora buscar la empresa por código (usuario ya autenticado)
    const empresasSnapshot = await firebase.firestore()
      .collection('empresas')
      .where('codigoAcceso', '==', codigo)
      .get();

    if (empresasSnapshot.empty) {
      // Código inválido — limpiar usuario creado
      await user.delete();
      showToast('❌ Código de invitación no válido');
      return;
    }

    const empresaDoc = empresasSnapshot.docs[0];
    const empresaId  = empresaDoc.id;
    const empresaData = empresaDoc.data();

    // 3. Crear cliente en subcolección de la empresa
    await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('clientes').doc(user.uid)
      .set({
        nombre: nombre,
        email: email,
        uid: user.uid,
        creado: firebase.firestore.FieldValue.serverTimestamp(),
        tag: 'nuevo',
        phone: '',
        compras: '$0.00',
        pedidos: 0
      });

    // 4. Crear perfil raíz para login SIN ÍNDICES
    await firebase.firestore()
      .collection('userProfiles').doc(user.uid)
      .set({
        uid: user.uid,
        nombre: nombre,
        email: email,
        rol: 'cliente',
        empresaId: empresaId,
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });

    sessionStorage.setItem('empresaId', empresaId);
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userName', nombre);
    sessionStorage.setItem('userRol', 'cliente');

    cerrarModalRegistroCliente();
// Cierre forzado del modal por si la función anterior falla
const modalCli = document.getElementById('modal-registro-cliente');
if (modalCli) { modalCli.classList.remove('open'); modalCli.style.display = 'none'; }
    ocultarPantallaBienvenida();
    document.getElementById('admin-menu').style.display = 'none';
    document.getElementById('btn-codigo').style.display = 'none';

    await store.cargarDatosEmpresa(empresaId);
    syncGlobals();
    goScreen('cliente');
    mostrarPanelCliente();

    showToast(`✅ ¡Bienvenido a ${empresaData.nombre || 'tu franquicia'}!`);

  } catch (error) {
    console.error('❌ Error registrando cliente:', error);
    // Si creamos usuario pero falló después, intentar limpiar
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
  } finally {
    _registrando = false;
  }
}

// ── LOGIN UNIFICADO SIN ÍNDICES (lee userProfiles/{uid}) ──

async function loginUnificado() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;

  if (!email || !password) {
    showToast('❌ Ingresa correo y contraseña'); return;
  }

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Leer perfil raíz directamente — SIN collectionGroup, SIN índices
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

    cerrarModalLogin();
    ocultarPantallaBienvenida();

    if (rol === 'admin') {
      actualizarAdminUI(nombre);
      await store.cargarDatosEmpresa(empresaId);
      syncGlobals();
      goScreen('dashboard');
      setTimeout(() => { if(typeof renderChartVentas === 'function') renderChartVentas(); }, 300);

      setTimeout(() => {
        if (typeof solicitarPermisoNotificaciones === 'function') {
          solicitarPermisoNotificaciones().then(token => {
            if (token) {
              showToast('🔔 Notificaciones activadas');
              if (typeof escucharMensajesForeground === 'function') escucharMensajesForeground();
            }
          });
        }
      }, 1000);

      showToast(`✅ Bienvenido, ${nombre}`);
    } else {
      // Cliente
      document.getElementById('admin-menu').style.display = 'none';
      document.getElementById('btn-codigo').style.display = 'none';
      await store.cargarDatosEmpresa(empresaId);
      syncGlobals();
      goScreen('cliente');
      mostrarPanelCliente();
      showToast(`✅ Bienvenido, ${nombre}`);
    }

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

// ── CÓDIGO DE INVITACIÓN (ADMIN) ──

async function mostrarCodigoInvitacion() {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) { showToast('⚠️ No hay franquicia seleccionada'); return; }

  try {
    const doc = await firebase.firestore().collection('empresas').doc(empresaId).get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById('codigo-display').textContent = data.codigoAcceso || '------';
      document.getElementById('modal-codigo').classList.add('open');
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

// ═══════════════════════════════════════════════════════════════
//  FIN NUEVO FLUJO DE INGRESO
// ═══════════════════════════════════════════════════════════════

function goScreen(name) {
  screens.forEach(s => {
    const screenEl = document.getElementById('screen-' + s);
    if (screenEl) screenEl.classList.toggle('active', s === name);
    const navEl = document.getElementById('nav-' + s);
    if (navEl) navEl.classList.toggle('active', s === name);
  });
  currentScreen = name;
  const fabLabels = { dashboard: '＋', ventas: '＋', inventario: '＋', clientes: '＋', reportes: '⬇', cliente: '⬇', configuracion: '⚙️' };
  const fabBtn = document.getElementById('fab-btn');
  if (fabBtn) fabBtn.textContent = fabLabels[name] || '＋';

  const bienvenida = document.getElementById('screen-bienvenida');
  if (bienvenida) bienvenida.classList.remove('active');

  if (name === 'ventas') renderVentas('', filtroVentas, 1);
  if (name === 'inventario') renderInv('', filtroInv, 1);
  if (name === 'clientes') renderClients('', filtroCli, 1);
  if (name === 'reportes') renderReportes('semana');
  if (name === 'configuracion') {
    actualizarResumenConfiguracion();
    setTimeout(() => {
      renderizarTablaProductos();
      renderizarTablaClientes();
      renderizarTablaVentas();
    }, 300);
  }
  if (name === 'cliente') {
    if (sessionStorage.getItem('empresaId')) {
      mostrarPanelCliente();
    } else {
      showToast('⚠️ Inicia sesión primero');
      mostrarPantallaBienvenida();
    }
  }
  if (name === 'dashboard') {
    setTimeout(() => { if(typeof renderChartVentas === 'function') renderChartVentas(); }, 100);
  }
}

function filterChip(el, ctx) {
  const chips = el.closest('.chips').querySelectorAll('.chip');
  chips.forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const valor = el.textContent.toLowerCase();
  if (ctx === 'ventas') {
    filtroVentas = valor === 'todas' ? 'todas' : valor;
    renderVentas(document.getElementById('venta-search').value, filtroVentas, 1);
  } else if (ctx === 'inv') {
    filtroInv = valor === 'todos' ? 'todos' : valor;
    renderInv(document.getElementById('inv-search').value, filtroInv, 1);
  } else if (ctx === 'cli') {
    filtroCli = valor === 'todos' ? 'todos' : valor;
    renderClients(document.getElementById('client-search').value, filtroCli, 1);
  }
  showToast('Filtro: ' + el.textContent);
}

function filterVentas() { renderVentas(document.getElementById('venta-search').value, filtroVentas, 1); }
function filterInv()     { renderInv(document.getElementById('inv-search').value, filtroInv, 1); }
function filterClients() { renderClients(document.getElementById('client-search').value, filtroCli, 1); }

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

function editCliente(nombre) {
  const c = store.clientes.find(item => item.nombre === nombre);
  if (!c) return showToast('Cliente no encontrado');
  const body = `
    <div class="field"><label>Nombre</label><input type="text" value="${c.nombre}" id="edit-nombre"></div>
    <div class="field"><label>Teléfono</label><input type="text" value="${c.phone}" id="edit-phone"></div>
    <div class="field"><label>Etiqueta</label>
      <select id="edit-tag">
        <option ${c.tag === 'vip' ? 'selected' : ''}>vip</option>
        <option ${c.tag === 'regular' ? 'selected' : ''}>regular</option>
        <option ${c.tag === 'nuevo' ? 'selected' : ''}>nuevo</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="updateClienteFromModal('${nombre}')">Actualizar cliente</button>
    <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
  `;
  openModalWithContent('Editar cliente', body);
}

async function updateClienteFromModal(nombreOriginal) {
  const nombre = document.getElementById('edit-nombre').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const tag = document.getElementById('edit-tag').value;
  if (!nombre) { showToast('⚠️ El nombre es obligatorio'); return; }
  const cliente = store.clientes.find(c => c.nombre === nombreOriginal);
  if (!cliente) { showToast('⚠️ Cliente no encontrado'); return; }
  const updates = { nombre, phone, tag };
  try {
    await store.updateCliente(cliente.id, updates);
    syncGlobals();
    renderClients('', filtroCli, 1);
    closeModal();
    showToast('✅ Cliente actualizado');
  } catch (error) {
    handleError(error);
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
  document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal')) {
    document.getElementById('modal').classList.remove('open');
  }
}

function openModalWithContent(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal').classList.add('open');
}

function confirmAction() {
  if (typeof window._confirmAction === 'function') {
    window._confirmAction();
    window._confirmAction = null;
  }
  closeModal();
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

function actualizarAdminUI(nombre) {
  const adminMenu = document.getElementById('admin-menu');
  const avatar = document.getElementById('avatar-admin');
  const nombreEl = document.getElementById('admin-nombre');
  const btnCliente = document.getElementById('btn-cliente');
  const btnCodigo = document.getElementById('btn-codigo');

  if (nombre) {
    if (adminMenu) adminMenu.style.display = 'block';
    if (btnCliente) btnCliente.style.display = 'none';
    if (btnCodigo) btnCodigo.style.display = 'inline-flex';

    const iniciales = nombre.split(' ').map(p => p.charAt(0).toUpperCase()).join('').slice(0,2);
    if (avatar) avatar.textContent = iniciales || 'A';
    if (nombreEl) nombreEl.textContent = nombre;
  } else {
    if (adminMenu) adminMenu.style.display = 'none';
    if (btnCliente) btnCliente.style.display = 'inline-flex';
    if (btnCodigo) btnCodigo.style.display = 'none';
  }
}

async function loginCliente() {
  await loginUnificado();
}

async function registrarCliente() {
  await registrarClienteNuevo();
}

function mostrarRegistro() {
  mostrarRegistroCliente();
}

function mostrarLogin() {
  mostrarLoginUnificado();
}

function mostrarPanelCliente() {
  const panelDiv = document.getElementById('cliente-panel');
  const nombreSpan = document.getElementById('cliente-nombre');

  if (panelDiv) panelDiv.style.display = 'block';

  const nombre = sessionStorage.getItem('userName') || sessionStorage.getItem('userEmail');
  if (nombreSpan) nombreSpan.textContent = nombre;

  actualizarAvatar(nombre);

  const bienvenidaEl = document.getElementById('mensaje-bienvenida');
  if (bienvenidaEl && nombre) {
    bienvenidaEl.textContent = `Hola, ${nombre} 👋`;
  }

  const empresaId = sessionStorage.getItem('empresaId');
  if (empresaId) {
    firebase.firestore().collection('empresas').doc(empresaId).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        const nombreEmpresa = data.nombre || empresaId;
        const logo = document.querySelector('.nav-logo span');
        if (logo) logo.textContent = ' ' + nombreEmpresa;
      }
    });
  }

  setTimeout(() => {
    renderCatalogo();
    renderHistorial();
    actualizarCarritoCount();
    cargarMensajesChat();
    cargarAlertas();
  }, 500);
}

function cerrarSesion() {
  firebase.auth().signOut();
  sessionStorage.clear();
  localStorage.removeItem('empresaInventario');
  localStorage.removeItem('empresaClientes');
  localStorage.removeItem('empresaVentas');

  document.getElementById('admin-menu').style.display = 'none';
  document.getElementById('btn-codigo').style.display = 'none';
  document.getElementById('btn-cliente').style.display = 'inline-flex';

  const logo = document.querySelector('.nav-logo span');
  if (logo) logo.textContent = 'Franquicia Polar';

  const panelDiv = document.getElementById('cliente-panel');
  if (panelDiv) panelDiv.style.display = 'none';

  showToast('👋 Sesión cerrada');
  mostrarPantallaBienvenida();
}

function toggleCliente() {
  const current = document.querySelector('.screen.active');
  if (current && current.id === 'screen-cliente') {
    goScreen('dashboard');
  } else {
    goScreen('cliente');
    cargarCarrito();
    actualizarCarritoCount();
  }
}

let filtroCatalogo = 'todas';

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
  const nombreEscapado = nombre.replace(/'/g, "\'");

  return `
    <div class="inv-card" style="cursor:default;">
      <div class="inv-img">${icon}</div>
      <div class="inv-info">
        <div class="inv-name">${nombre}</div>
        <div class="inv-stock ${estado}">${estado === 'out' ? 'Agotado' : stock + ' unidades'}</div>
      </div>
      <div class="inv-right">
        <div class="inv-price">${precio}</div>
        ${estado !== 'out' ? `<button class="btn btn-primary" style="height:36px;font-size:12px;padding:0 12px;" onclick="agregarAlCarrito('${nombreEscapado}')">+ Agregar</button>` : '<span style="color:var(--red);font-size:12px;">Agotado</span>'}
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
    showToast('⚠️ Stock insuficiente, solo quedan ' + producto.stock + ' unidades');
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
      ${carrito.map(item => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">
          <span>${item.nombre} x ${item.cantidad}</span>
          <span>${formatCurrency(item.cantidad * item.precio)}</span>
        </div>
      `).join('')}
      <div style="display:flex; justify-content:space-between; padding:12px 0; font-weight:700; font-size:18px;">
        <span>Total</span>
        <span>${formatCurrency(total)}</span>
      </div>
      <button class="btn btn-primary" onclick="realizarPedido()">Confirmar pedido</button>
      <button class="btn btn-outline" onclick="vaciarCarrito()">Vaciar carrito</button>
    </div>
  `;
  openModalWithContent('Carrito', html);
}

function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  actualizarCarritoCount();
  closeModal();
  showToast('🗑️ Carrito vacío');
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
  const pedido = {
    cliente: sessionStorage.getItem('userName') || 'Cliente',
    fecha: getCurrentTimestamp(),
    items: items,
    total: formatCurrency(total),
    status: 'pendiente',
    metodo: 'Cliente app',
    notas: carrito.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
    producto: 'Pedido desde app cliente'
  };

  try {
    await store.addVenta(pedido);
    for (const item of carrito) {
      const producto = inventario.find(p => p.nombre === item.nombre);
      if (producto) {
        producto.stock -= item.cantidad;
        if (producto.stock === 0) producto.estado = 'out';
        else if (producto.stock <= 5) producto.estado = 'low';
        await store.updateProducto(producto.id, { stock: producto.stock, estado: producto.estado });
      }
    }
    syncGlobals();
    carrito = [];
    guardarCarrito();
    actualizarCarritoCount();
    closeModal();
    renderHistorial();
    renderActividadReciente();
    updateKPIs();
    showToast('✅ Pedido realizado con éxito');

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
    handleError(error);
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
          <button class="btn-sm btn-sm-edit" onclick="editProducto('${(p.nombre || '').replace(/'/g, "\'")}')">Editar</button>
          <button class="btn-sm btn-sm-delete" onclick="confirmDeleteProducto('${(p.nombre || '').replace(/'/g, "\'")}')">Eliminar</button>
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
          <button class="btn-sm btn-sm-edit" onclick="editCliente('${(c.nombre || '').replace(/'/g, "\'")}')">Editar</button>
          <button class="btn-sm btn-sm-delete" onclick="confirmDeleteCliente('${(c.nombre || '').replace(/'/g, "\'")}')">Eliminar</button>
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
        <div style="padding:8px 12px; margin-bottom:6px; background:var(--bg); border-radius:var(--radius); border-left:3px solid ${m.uid === firebase.auth().currentUser?.uid ? 'var(--primary)' : 'var(--border)'};">
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
        <div class="card" style="padding:12px; margin-bottom:8px; border-left:4px solid ${a.estado === 'activa' ? 'var(--danger)' : 'var(--green)'};">
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

function cambiarTabCliente(tabId) {
  document.querySelectorAll('.cliente-panel-content').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('cliente-panel-' + tabId);
  if (panel) panel.style.display = 'block';
  document.querySelectorAll('[data-tab-cliente]').forEach(tab => tab.classList.remove('active'));
  const tabBtn = document.querySelector(`[data-tab-cliente="${tabId}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  if (tabId === 'chat') cargarMensajesChat();
  if (tabId === 'alertas') cargarAlertas();
  if (tabId === 'pedidos') renderHistorial();
}

// ── INICIALIZACIÓN ──
document.addEventListener('DOMContentLoaded', () => {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  const fechaEl = document.getElementById('fecha-hoy');
  if (fechaEl) {
    fechaEl.textContent = `${dias[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;
  }

  loadTheme();
  cargarTemaGuardado();
  cargarCarrito();
  initStore();

  // Verificar sesión existente al cargar la página — SIN ÍNDICES (userProfiles)
  firebase.auth().onAuthStateChanged(async (user) => {
    if (_registrando) {
      console.log('⏳ Registro en curso, onAuthStateChanged ignorado');
      return;
    }
    if (user) {
      try {
        const perfilDoc = await firebase.firestore()
          .collection('userProfiles').doc(user.uid)
          .get();

        if (!perfilDoc.exists) {
          // Perfil no encontrado y no estamos registrando — sesión inválida
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

  // Eventos para pestañas de configuración
  document.addEventListener('click', function(e) {
    const tab = e.target.closest('.config-tab');
    if (tab && tab.dataset.tab) {
      cambiarTabConfiguracion(tab.dataset.tab);
    }
  });

  // Eventos para pestañas del módulo cliente
  document.addEventListener('click', function(e) {
    const tab = e.target.closest('[data-tab-cliente]');
    if (tab && tab.dataset.tabCliente) {
      cambiarTabCliente(tab.dataset.tabCliente);
    }
  });

  // Inicializar Page Agent (solo en localhost)
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

// ── EXPONER FUNCIONES GLOBALES ──
window.goScreen = goScreen;
window.filterChip = filterChip;
window.filterVentas = filterVentas;
window.filterInv = filterInv;
window.filterClients = filterClients;
window.switchReportTab = switchReportTab;
window.toggleTheme = toggleTheme;
window.loadTheme = loadTheme;
window.guardarVenta = guardarVenta;
window.guardarProducto = guardarProducto;
window.guardarCliente = guardarCliente;
window.editVenta = editVenta;
window.updateVentaFromModal = updateVentaFromModal;
window.editProducto = editProducto;
window.updateProductoFromModal = updateProductoFromModal;
window.editCliente = editCliente;
window.updateClienteFromModal = updateClienteFromModal;
window.confirmDeleteVenta = confirmDeleteVenta;
window.confirmDeleteProducto = confirmDeleteProducto;
window.confirmDeleteCliente = confirmDeleteCliente;
window.openModal = openModal;
window.closeModal = closeModal;
window.openModalWithContent = openModalWithContent;
window.confirmAction = confirmAction;
window.loginCliente = loginCliente;
window.registrarCliente = registrarCliente;
window.mostrarRegistro = mostrarRegistro;
window.mostrarLogin = mostrarLogin;
window.toggleCliente = toggleCliente;
window.mostrarPanelCliente = mostrarPanelCliente;
window.cerrarSesion = cerrarSesion;
window.renderCatalogo = renderCatalogo;
window.agregarAlCarrito = agregarAlCarrito;
window.actualizarCarritoCount = actualizarCarritoCount;
window.verCarrito = verCarrito;
window.vaciarCarrito = vaciarCarrito;
window.realizarPedido = realizarPedido;
window.renderHistorial = renderHistorial;
window.renderActividadReciente = renderActividadReciente;
window.actualizarResumenConfiguracion = actualizarResumenConfiguracion;
window.exportarDatosJSON = exportarDatosJSON;
window.importarDatosJSON = importarDatosJSON;
window.actualizarAvatar = actualizarAvatar;
window.agentCommand = agentCommand;
window.sendAgentCommand = sendAgentCommand;
window.toggleAgentPanel = toggleAgentPanel;
window.executeAgentCommand = executeAgentCommand;
window.executeManualCommand = executeManualCommand;
window.cambiarTabConfiguracion = cambiarTabConfiguracion;
window.cambiarTabCliente = cambiarTabCliente;
window.enviarMensajeChat = enviarMensajeChat;
window.cargarMensajesChat = cargarMensajesChat;
window.abrirModalAlerta = abrirModalAlerta;
window.enviarAlerta = enviarAlerta;
window.cargarAlertas = cargarAlertas;
window.votarAlerta = votarAlerta;
window.toggleAdminMenu = toggleAdminMenu;
window.closeAdminMenu = closeAdminMenu;
window.actualizarAdminUI = actualizarAdminUI;
window.renderizarTablaProductos = renderizarTablaProductos;
window.renderizarTablaClientes = renderizarTablaClientes;
window.renderizarTablaVentas = renderizarTablaVentas;
window.filtrarCatalogo = filtrarCatalogo;

// Nuevo flujo
window.mostrarPantallaBienvenida = mostrarPantallaBienvenida;
window.ocultarPantallaBienvenida = ocultarPantallaBienvenida;
window.mostrarRegistroEmpresa = mostrarRegistroEmpresa;
window.cerrarModalRegistroEmpresa = cerrarModalRegistroEmpresa;
window.mostrarRegistroCliente = mostrarRegistroCliente;
window.cerrarModalRegistroCliente = cerrarModalRegistroCliente;
window.mostrarLoginUnificado = mostrarLoginUnificado;
window.cerrarModalLogin = cerrarModalLogin;
window.registrarEmpresa = registrarEmpresa;
window.registrarClienteNuevo = registrarClienteNuevo;
window.loginUnificado = loginUnificado;
window.generarCodigoAcceso = generarCodigoAcceso;
window.mostrarCodigoInvitacion = mostrarCodigoInvitacion;
window.copiarCodigo = copiarCodigo;
window.regenerarCodigo = regenerarCodigo;
window.cerrarModalCodigo = cerrarModalCodigo;

console.log('✅ app.js cargado correctamente — Nuevo flujo SIN ÍNDICES activo');
