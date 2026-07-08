// ── NAVEGACIÓN Y LÓGICA PRINCIPAL ──

let currentScreen = 'dashboard';const screens = ['dashboard', 'ventas', 'inventario', 'clientes', 'reportes', 'cliente', 'configuracion'];

// Filtros activos por módulo
let filtroVentas = 'todas';
let filtroInv = 'todos';
let filtroCli = 'todos';

function goScreen(name) {
  screens.forEach(s => {
    const screenEl = document.getElementById('screen-' + s);
    if (screenEl) {
      screenEl.classList.toggle('active', s === name);
    }
    const navEl = document.getElementById('nav-' + s);
    if (navEl) {
      navEl.classList.toggle('active', s === name);
    }
  });
  currentScreen = name;
  const fabLabels = { dashboard: '＋', ventas: '＋', inventario: '＋', clientes: '＋', reportes: '⬇', cliente: '⬇', configuracion: '⚙️' };
  const fabBtn = document.getElementById('fab-btn');
  if (fabBtn) fabBtn.textContent = fabLabels[name] || '＋';

  if (name === 'ventas') renderVentas('', filtroVentas);
  if (name === 'inventario') renderInv('', filtroInv);
  if (name === 'clientes') renderClients('', filtroCli);
  
  if (name === 'configuracion') {
    actualizarResumenConfiguracion();
    // También renderizar las tablas para que estén listas
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
      const loginDiv = document.getElementById('cliente-login');
      const panelDiv = document.getElementById('cliente-panel');
      if (loginDiv) loginDiv.style.display = 'block';
      if (panelDiv) panelDiv.style.display = 'none';
    }
  }
}

// ── FILTROS POR CHIP ──
function filterChip(el, ctx) {
  const chips = el.closest('.chips').querySelectorAll('.chip');
  chips.forEach(c => c.classList.remove('active'));
  el.classList.add('active');

  const valor = el.textContent.toLowerCase();

  if (ctx === 'ventas') {
    filtroVentas = valor === 'todas' ? 'todas' : valor;
    renderVentas(document.getElementById('venta-search').value, filtroVentas);
  } else if (ctx === 'inv') {
    filtroInv = valor === 'todos' ? 'todos' : valor;
    renderInv(document.getElementById('inv-search').value, filtroInv);
  } else if (ctx === 'cli') {
    filtroCli = valor === 'todos' ? 'todos' : valor;
    renderClients(document.getElementById('client-search').value, filtroCli);
  }

  showToast('Filtro: ' + el.textContent);
}

// ── BÚSQUEDA CON FILTRO ──
function filterVentas() {
  renderVentas(document.getElementById('venta-search').value, filtroVentas);
}
function filterInv() {
  renderInv(document.getElementById('inv-search').value, filtroInv);
}
function filterClients() {
  renderClients(document.getElementById('client-search').value, filtroCli);
}

// ── REPORT TABS ──
function switchReportTab(el, period) {
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  showToast('Mostrando datos: ' + el.textContent);
}

// ── TEMA OSCURO ──
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

// ── FUNCIONES DE GUARDADO (adaptadas para async) ──

async function guardarVenta() {
  const modalBody = document.getElementById('modal-body');
  const inputs = modalBody.querySelectorAll('input, select, textarea');

  const cliente = inputs[0]?.value?.trim() || '';
  const producto = inputs[1]?.value?.trim() || '';
  const cantidad = parseInt(inputs[2]?.value) || 1;
  const precioUnit = parseFloat(inputs[3]?.value?.replace('$', '')) || 0;
  const metodo = inputs[4]?.value || 'Efectivo';
  const notas = inputs[5]?.value || '';

  if (!cliente) { showToast('⚠️ Ingresa el nombre del cliente'); return; }
  if (!producto) { showToast('⚠️ Ingresa el nombre del producto'); return; }
  if (precioUnit <= 0) { showToast('⚠️ Ingresa un precio válido'); return; }

  const total = precioUnit * cantidad;
  const nuevaVenta = {
    cliente, producto, items: cantidad, total: '$' + total.toFixed(2),
    status: 'pagado', metodo, notas, fecha: new Date().toLocaleString()
  };

  await store.addVenta(nuevaVenta);
  syncGlobals();
  renderVentas('', filtroVentas);
  renderActividadReciente();
  updateKPIs();
  closeModal();
  showToast('✅ Venta registrada con éxito');
}

async function guardarProducto() {
  const modalBody = document.getElementById('modal-body');
  const inputs = modalBody.querySelectorAll('input, select, textarea');

  const nombre = inputs[0]?.value?.trim() || '';
  const cat = inputs[1]?.value || 'General';
  const precioVenta = parseFloat(inputs[2]?.value) || 0;
  const stock = parseInt(inputs[4]?.value) || 0;
  const stockMin = parseInt(inputs[5]?.value) || 5;

  if (!nombre) { showToast('⚠️ Ingresa el nombre del producto'); return; }
  if (precioVenta <= 0) { showToast('⚠️ Ingresa un precio válido'); return; }

  const iconMap = { 'Bebidas': '☕', 'Dulces': '🍫', 'Endulzantes': '🍯', 'Básicos': '🧂', 'Granos': '🫘', 'Lácteos': '🧀', 'Cocina': '🫙' };
  const icon = iconMap[cat] || '📦';
  let estado = 'ok';
  if (stock === 0) estado = 'out';
  else if (stock <= stockMin) estado = 'low';

  const nuevoProducto = { nombre, cat, precio: '$' + precioVenta.toFixed(2), stock, icon, estado };
  await store.addProducto(nuevoProducto);
  syncGlobals();
  renderInv('', filtroInv);
  closeModal();
  showToast('✅ Producto agregado con éxito');
}

async function guardarCliente() {
  const modalBody = document.getElementById('modal-body');
  const inputs = modalBody.querySelectorAll('input, select, textarea');

  const nombre = inputs[0]?.value?.trim() || '';
  const apellido = inputs[1]?.value?.trim() || '';
  const telefono = inputs[2]?.value?.trim() || '';

  const nombreCompleto = (nombre + ' ' + apellido).trim();
  if (!nombreCompleto) { showToast('⚠️ El nombre es obligatorio'); return; }

  const init = nombreCompleto.split(' ').map(p => p.charAt(0).toUpperCase()).join('');
  const colores = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA', '#E11D48'];
  const color = colores[Math.floor(Math.random() * colores.length)];

  const nuevoCliente = { nombre: nombreCompleto, phone: telefono, compras: '$0.00', pedidos: 0, tag: 'nuevo', color, init };
  await store.addCliente(nuevoCliente);
  syncGlobals();
  renderClients('', filtroCli);
  closeModal();
  showToast('✅ Cliente registrado con éxito');
}

function guardarReporte() { closeModal(); showToast('📊 Reporte generado (simulación)'); }

// ── EDICIÓN (adaptada para async) ──

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
  const updates = { cliente, producto, items: cantidad, total: '$' + total.toFixed(2), metodo, notas };
  await store.updateVenta(id, updates);
  syncGlobals();
  renderVentas('', filtroVentas);
  renderActividadReciente();
  updateKPIs();
  closeModal();
  showToast('✅ Venta actualizada');
}

function editProducto(nombre) {
  const p = store.inventario.find(item => item.nombre === nombre);
  if (!p) return showToast('Producto no encontrado');
  
  // 🔥 CORRECCIÓN: Asegurar que precio sea string antes de usar replace
  let precioStr = p.precio;
  if (typeof precioStr !== 'string') {
    // Si es número, convertirlo a string con formato $0.00
    precioStr = '$' + Number(precioStr).toFixed(2);
  }
  // Si ya es string pero no tiene $, se lo añadimos (por si acaso)
  if (!precioStr.startsWith('$')) {
    precioStr = '$' + precioStr;
  }
  // Ahora podemos hacer replace de forma segura
  const precioNum = parseFloat(precioStr.replace('$', '')) || 0;
  
  const body = `
    <div class="field"><label>Nombre</label><input type="text" value="${p.nombre}" id="edit-nombre"></div>
    <div class="field"><label>Categoría</label>
      <select id="edit-cat">
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
  const updates = { nombre, cat, precio: '$' + precio.toFixed(2), stock, estado };
  const producto = inventario.find(p => p.nombre === nombreOriginal);
  if (!producto) { showToast('⚠️ Producto no encontrado'); return; }
  if (nombre !== nombreOriginal) {
    await store.updateProducto(producto.id, updates);
  } else {
    await store.updateProducto(producto.id, updates);
  }
  syncGlobals();
  renderInv('', filtroInv);
  closeModal();
  showToast('✅ Producto actualizado');
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
  const cliente = clientes.find(c => c.nombre === nombreOriginal);
  if (!cliente) { showToast('⚠️ Cliente no encontrado'); return; }
  const updates = { nombre, phone, tag };
  await store.updateCliente(cliente.id, updates);
  syncGlobals();
  renderClients('', filtroCli);
  closeModal();
  showToast('✅ Cliente actualizado');
}

// ── ELIMINACIÓN CON CONFIRMACIÓN ──

function confirmDeleteVenta(id) {
  openConfirmModal('¿Seguro que deseas eliminar esta venta?', async () => {
    await store.deleteVenta(id);
    syncGlobals();
    renderVentas('', filtroVentas);
    renderActividadReciente();
    updateKPIs();
    showToast('🗑️ Venta eliminada');
  });
}

function confirmDeleteProducto(nombre) {
  const producto = inventario.find(p => p.nombre === nombre);
  if (!producto) { showToast('⚠️ Producto no encontrado'); return; }
  openConfirmModal('¿Seguro que deseas eliminar este producto?', async () => {
    await store.deleteProducto(producto.id);
    syncGlobals();
    renderInv('', filtroInv);
    showToast('🗑️ Producto eliminado');
  });
}

function confirmDeleteCliente(nombre) {
  const cliente = clientes.find(c => c.nombre === nombre);
  if (!cliente) { showToast('⚠️ Cliente no encontrado'); return; }
  openConfirmModal('¿Seguro que deseas eliminar este cliente?', async () => {
    await store.deleteCliente(cliente.id);
    syncGlobals();
    renderClients('', filtroCli);
    showToast('🗑️ Cliente eliminado');
  });
}

// ── MODALES ──

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
        <select id="input-categoria"><option>Bebidas</option><option>Básicos</option><option>Granos</option><option>Lácteos</option><option>Dulces</option><option>Cocina</option></select>
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

// ============================================================
//  LOGIN MULTI-TENANT (VERSIÓN ÚNICA Y CORRECTA)
// ============================================================

async function loginCliente() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    if (!email || !password) {
        showToast('❌ Ingresa correo y contraseña');
        return;
    }

    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('✅ Usuario autenticado:', user.uid);

        const empresasSnapshot = await firebase.firestore()
            .collectionGroup('usuarios')
            .where('uid', '==', user.uid)
            .get();

        if (empresasSnapshot.empty) {
            showToast('❌ Usuario no tiene empresa asignada');
            await firebase.auth().signOut();
            return;
        }

        const usuarioDoc = empresasSnapshot.docs[0];
        const empresaId = usuarioDoc.ref.parent.parent.id;
        const usuarioData = usuarioDoc.data();

        console.log('🏢 Empresa encontrada:', empresaId);

        sessionStorage.setItem('empresaId', empresaId);
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('userName', usuarioData.nombre || email);
        sessionStorage.setItem('userRol', usuarioData.rol || 'usuario');

        await cargarDatosEmpresa(empresaId);
        mostrarPanelCliente();

        showToast(`✅ Bienvenido, ${usuarioData.nombre || email}`);

    } catch (error) {
        console.error('❌ Error en login:', error);
        if (error.code === 'auth/user-not-found') {
            showToast('❌ Usuario no registrado');
        } else if (error.code === 'auth/wrong-password') {
            showToast('❌ Contraseña incorrecta');
        } else {
            showToast('❌ Error: ' + error.message);
        }
    }
}

async function cargarDatosEmpresa(empresaId) {
    console.log('📦 Cargando datos para empresa:', empresaId);
    
    try {
        const inventarioSnapshot = await firebase.firestore()
            .collection('empresas')
            .doc(empresaId)
            .collection('inventario')
            .get();
        
        const inventario = [];
        inventarioSnapshot.forEach(doc => {
            inventario.push({ id: doc.id, ...doc.data() });
        });
        console.log('📦 Inventario cargado:', inventario.length, 'productos');
        
        const clientesSnapshot = await firebase.firestore()
            .collection('empresas')
            .doc(empresaId)
            .collection('clientes')
            .get();
        
        const clientes = [];
        clientesSnapshot.forEach(doc => {
            clientes.push({ id: doc.id, ...doc.data() });
        });
        console.log('👥 Clientes cargados:', clientes.length);
        
        const ventasSnapshot = await firebase.firestore()
            .collection('empresas')
            .doc(empresaId)
            .collection('ventas')
            .get();
        
        const ventas = [];
        ventasSnapshot.forEach(doc => {
            ventas.push({ id: doc.id, ...doc.data() });
        });
        console.log('🛒 Ventas cargadas:', ventas.length);
        
        // ============================================================
        // 🔥 ACTUALIZAR VARIABLES GLOBALES
        // ============================================================
        window.inventario = inventario;
        window.clientes = clientes;
        window.ventas = ventas;
        
        localStorage.setItem('empresaInventario', JSON.stringify(inventario));
        localStorage.setItem('empresaClientes', JSON.stringify(clientes));
        localStorage.setItem('empresaVentas', JSON.stringify(ventas));
        
        actualizarUIEmpresa(inventario, clientes, ventas);
        
        renderInv('', filtroInv);
        renderClients('', filtroCli);
        renderVentas('', filtroVentas);
        renderActividadReciente();
        updateKPIs();
        
        if (currentScreen === 'cliente') {
            renderCatalogo();
            renderHistorial();
        }
        
        showToast(`✅ Datos de ${empresaId.replace(/-/g, ' ').toUpperCase()} cargados`);
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        showToast('⚠️ Error cargando datos de la empresa');
    }
}

function actualizarUIEmpresa(inventario, clientes, ventas) {
    const kpiValues = document.querySelectorAll('.kpi-value');
    if (kpiValues.length >= 4) {
        const totalVentas = ventas.reduce((sum, v) => sum + (v.monto || 0), 0);
        kpiValues[0].textContent = `$${totalVentas.toFixed(2)}`;
        kpiValues[1].textContent = ventas.length;
        kpiValues[2].textContent = inventario.filter(p => p.stock < 10).length;
        kpiValues[3].textContent = clientes.length;
    }
}

// ============================================================
//  🔥 AVATAR DINÁMICO (NUEVO)
// ============================================================

function actualizarAvatar(nombre) {
    const avatarEl = document.getElementById('avatar-iniciales');
    if (!avatarEl) return;
    
    if (nombre) {
        const iniciales = nombre
            .split(' ')
            .filter(palabra => palabra.length > 0)
            .map(palabra => palabra.charAt(0).toUpperCase())
            .join('')
            .slice(0, 2);
        avatarEl.textContent = iniciales || '??';
    } else {
        avatarEl.textContent = 'OR';
    }
}

// ============================================================
//  CONFIGURACIÓN - EXPORTAR/IMPORTAR JSON
// ============================================================

function actualizarResumenConfiguracion() {
    const productos = window.inventario || [];
    const clientes = window.clientes || [];
    const ventas = window.ventas || [];
    
    const elProductos = document.getElementById('resumen-productos');
    const elClientes = document.getElementById('resumen-clientes');
    const elVentas = document.getElementById('resumen-ventas');
    
    if (elProductos) elProductos.textContent = productos.length;
    if (elClientes) elClientes.textContent = clientes.length;
    if (elVentas) elVentas.textContent = ventas.length;
}

function exportarDatosJSON() {
    const empresaId = sessionStorage.getItem('empresaId');
    const nombreEmpresa = sessionStorage.getItem('userName') || 'empresa';
    
    if (!empresaId) {
        showToast('❌ No hay sesión activa');
        return;
    }
    
    const data = {
        empresaId: empresaId,
        nombreEmpresa: nombreEmpresa,
        fechaExportacion: new Date().toISOString(),
        inventario: window.inventario || [],
        clientes: window.clientes || [],
        ventas: window.ventas || []
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
        return;
    }
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Validar estructura del JSON
        if (!data.inventario || !data.clientes || !data.ventas) {
            showToast('❌ JSON inválido: faltan campos requeridos (inventario, clientes, ventas)');
            return;
        }
        
        // Confirmar importación
        if (!confirm(`⚠️ ¿Estás seguro de que quieres reemplazar TODOS los datos de ${sessionStorage.getItem('userName')}?\n\nSe importarán:\n- ${data.inventario.length} productos\n- ${data.clientes.length} clientes\n- ${data.ventas.length} ventas`)) {
            return;
        }
        
        showToast('⏳ Importando datos...');
        
        // 1. Limpiar colecciones existentes
        const collections = ['inventario', 'clientes', 'ventas'];
        for (const col of collections) {
            const snapshot = await firebase.firestore()
                .collection('empresas')
                .doc(empresaId)
                .collection(col)
                .get();
            
            const batch = firebase.firestore().batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        
        // 2. Subir nuevos datos
        for (const col of collections) {
            const items = data[col] || [];
            for (const item of items) {
                await firebase.firestore()
                    .collection('empresas')
                    .doc(empresaId)
                    .collection(col)
                    .add(item);
            }
        }
        
        // 3. Recargar datos
        await cargarDatosEmpresa(empresaId);
        
        // 4. Actualizar resumen
        actualizarResumenConfiguracion();
        
        // 5. Limpiar input file
        event.target.value = '';
        
        showToast(`✅ Datos importados: ${data.inventario.length} productos, ${data.clientes.length} clientes, ${data.ventas.length} ventas`);
        
    } catch (error) {
        console.error('❌ Error importando datos:', error);
        showToast('❌ Error al importar: ' + error.message);
    }
}

// ============================================================
//  TOGGLE CLIENTE - VERSIÓN CORRECTA (CON goScreen)
// ============================================================

function toggleCliente() {
    const current = document.querySelector('.screen.active');
    if (current && current.id === 'screen-cliente') {
        goScreen('dashboard');
    } else {
        goScreen('cliente');
        if (sessionStorage.getItem('empresaId')) {
            mostrarPanelCliente();
        } else {
            document.getElementById('cliente-login').style.display = 'block';
            document.getElementById('cliente-panel').style.display = 'none';
        }
        cargarCarrito();
        actualizarCarritoCount();
    }
}

function mostrarPanelCliente() {
    const loginDiv = document.getElementById('cliente-login');
    const panelDiv = document.getElementById('cliente-panel');
    const nombreSpan = document.getElementById('cliente-nombre');
    
    if (loginDiv) loginDiv.style.display = 'none';
    if (panelDiv) panelDiv.style.display = 'block';
    
    const nombre = sessionStorage.getItem('userName') || sessionStorage.getItem('userEmail');
    if (nombreSpan) {
        nombreSpan.textContent = nombre;
    }
    
    // 🔥 Actualizar avatar
    actualizarAvatar(nombre);
    
    // 🔥 ACTUALIZAR MENSAJE DE BIENVENIDA (¡AQUÍ VA!)
    const bienvenidaEl = document.getElementById('mensaje-bienvenida');
    if (bienvenidaEl && nombre) {
        bienvenidaEl.textContent = `Hola, ${nombre} 👋`;
    }
    
    const empresaId = sessionStorage.getItem('empresaId');
    if (empresaId) {
        const nombreEmpresa = empresaId.replace(/-/g, ' ').toUpperCase();
        const logo = document.querySelector('.nav-logo span');
        if (logo) {
            logo.textContent = ' ' + nombreEmpresa;
        }
    }
    
    // Forzar renderizado de catálogo e historial
    setTimeout(() => {
        renderCatalogo();
        renderHistorial();
        actualizarCarritoCount();
    }, 500);
}

function cerrarSesionCliente() {
    firebase.auth().signOut();
    sessionStorage.clear();
    localStorage.removeItem('empresaInventario');
    localStorage.removeItem('empresaClientes');
    localStorage.removeItem('empresaVentas');
    
    const loginDiv = document.getElementById('cliente-login');
    const panelDiv = document.getElementById('cliente-panel');
    
    if (loginDiv) loginDiv.style.display = 'block';
    if (panelDiv) panelDiv.style.display = 'none';
    
    // Restaurar logo y avatar
    const logo = document.querySelector('.nav-logo span');
    if (logo) {
        logo.textContent = 'Negocio';
    }
    const avatarEl = document.getElementById('avatar-iniciales');
    if (avatarEl) {
        avatarEl.textContent = 'OR';
    }
    
    showToast('👋 Sesión cerrada');
}

function mostrarRegistro() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('registro-form').style.display = 'block';
}

function mostrarLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('registro-form').style.display = 'none';
}

async function registrarCliente() {
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;

    if (!nombre || !email || !password) {
        showToast('❌ Completa todos los campos');
        return;
    }

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const empresaId = 'empresa-' + Date.now();
        await firebase.firestore().collection('empresas').doc(empresaId).set({
            nombre: 'Mi Negocio',
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        await firebase.firestore().collection('empresas').doc(empresaId)
            .collection('usuarios').doc(email).set({
                nombre: nombre,
                email: email,
                rol: 'admin',
                empresaId: empresaId,
                uid: user.uid,
                creado: firebase.firestore.FieldValue.serverTimestamp()
            });

        sessionStorage.setItem('empresaId', empresaId);
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('userName', nombre);

        mostrarPanelCliente();
        showToast(`✅ ¡Bienvenido, ${nombre}!`);

    } catch (error) {
        console.error('❌ Error en registro:', error);
        showToast('❌ Error: ' + error.message);
    }
}

// ── FUNCIONES DE CATÁLOGO Y CARRITO ──

function renderCatalogo() {
    const container = document.getElementById('catalogo-productos');
    if (!container) {
        console.warn('⚠️ Contenedor catalogo-productos no encontrado');
        return;
    }
    
    const productos = window.inventario || [];
    console.log('📦 Renderizando catálogo con', productos.length, 'productos');
    
    if (!productos || productos.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <div class="empty-icon">📦</div>
                <div class="empty-text">No hay productos disponibles</div>
                <button class="btn btn-outline" style="margin-top:12px;" onclick="recargarCatalogo()">🔄 Recargar</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = productos.map(p => {
        const icon = p.icon || '📦';
        const nombre = p.nombre || 'Producto sin nombre';
        const cat = p.cat || 'General';
        const estado = p.estado || 'ok';
        const stock = p.stock || 0;
        const precio = p.precio || '$0.00';
        const nombreEscapado = nombre.replace(/'/g, "\\'");
        
        return `
            <div class="inv-card" style="cursor:default;">
                <div class="inv-img">${icon}</div>
                <div class="inv-info">
                    <div class="inv-name">${nombre}</div>
                    <div class="inv-cat">${cat}</div>
                    <div class="inv-stock ${estado}">${estado === 'out' ? 'Agotado' : stock + ' unidades'}</div>
                </div>
                <div class="inv-right">
                    <div class="inv-price">${precio}</div>
                    ${estado !== 'out' ? `<button class="btn btn-primary" style="height:36px;font-size:12px;padding:0 12px;" onclick="agregarAlCarrito('${nombreEscapado}')">+ Agregar</button>` : '<span style="color:var(--red);font-size:12px;">Agotado</span>'}
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Catálogo renderizado correctamente');
}

async function recargarCatalogo() {
  showToast('🔄 Recargando productos...');
  await store.cargarDatos();
  syncGlobals();
  renderCatalogo();
  showToast('✅ Productos cargados');
}

function agregarAlCarrito(nombre) {
  const producto = inventario.find(p => p.nombre === nombre);
  if (!producto || producto.estado === 'out') return showToast('⚠️ Producto no disponible');
  const item = carrito.find(c => c.nombre === nombre);
  if (item) {
    item.cantidad++;
  } else {
    carrito.push({ nombre: nombre, cantidad: 1, precio: parseFloat(producto.precio.replace('$', '')) });
  }
  guardarCarrito();
  actualizarCarritoCount();
  showToast(`➕ ${nombre} agregado al carrito`);
}

function actualizarCarritoCount() {
  const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  document.getElementById('carrito-count').textContent = total;
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
          <span>$${(item.cantidad * item.precio).toFixed(2)}</span>
        </div>
      `).join('')}
      <div style="display:flex; justify-content:space-between; padding:12px 0; font-weight:700; font-size:18px;">
        <span>Total</span>
        <span>$${total.toFixed(2)}</span>
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
  const total = carrito.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
  const items = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  const pedido = {
    cliente: sessionStorage.getItem('userName') || 'Cliente',
    fecha: new Date().toLocaleString(),
    items: items,
    total: '$' + total.toFixed(2),
    status: 'pendiente',
    metodo: 'Cliente app',
    notas: carrito.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
    producto: 'Pedido desde app cliente'
  };

  await store.addVenta(pedido);
  syncGlobals();
  carrito = [];
  guardarCarrito();
  actualizarCarritoCount();
  closeModal();
  renderHistorial();
  renderActividadReciente();
  updateKPIs();
  showToast('✅ Pedido realizado con éxito, espera confirmación');
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

// ── RENDER ACTIVIDAD RECIENTE ──
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

  const urlParams = new URLSearchParams(window.location.search);
  const temaParam = urlParams.get('tema');
  if (temaParam && window.TEMAS && TEMAS[temaParam]) {
    aplicarTema(temaParam);
    localStorage.setItem('temaSeleccionado', temaParam);
  } else {
    cargarTemaGuardado();
  }

  cargarCarrito();
  initStore();

  console.log('🚀 App inicializada con Firebase');
});

// Escuchar mensajes desde el portafolio para cambiar tema sin recargar (postMessage)
window.addEventListener('message', function(event) {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'cambiarTema' && data.tema) {
      if (window.TEMAS && TEMAS[data.tema]) {
        aplicarTema(data.tema);
        localStorage.setItem('temaSeleccionado', data.tema);
        console.log('🎨 Tema cambiado a:', data.tema);
        event.source.postMessage(JSON.stringify({ type: 'temaAplicado', tema: data.tema }), event.origin);
      }
    }
  } catch (e) {}
});

// ============================================================
//  CONFIGURACIÓN - PESTAÑAS Y RENDERIZADO DE TABLAS
// ============================================================

// Cambiar de pestaña en la configuración
function cambiarTabConfiguracion(tabId) {
    // Quitar active de todas las pestañas y paneles
    document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.config-panel').forEach(p => p.classList.remove('active'));
    
    // Activar la pestaña seleccionada
    const tab = document.querySelector(`.config-tab[data-tab="${tabId}"]`);
    if (tab) tab.classList.add('active');
    
    // Activar el panel correspondiente
    const panel = document.getElementById('panel-' + tabId);
    if (panel) panel.classList.add('active');
    
    // Si es el panel de resumen, actualizar los números
    if (tabId === 'resumen') actualizarResumenConfiguracion();
    if (tabId === 'productos') renderizarTablaProductos();
    if (tabId === 'clientes') renderizarTablaClientes();
    if (tabId === 'ventas') renderizarTablaVentas();
}

// Actualizar resumen de la configuración
function actualizarResumenConfiguracion() {
    const productos = window.inventario || [];
    const clientes = window.clientes || [];
    const ventas = window.ventas || [];
    
    const totalVentas = ventas.reduce((sum, v) => sum + (parseFloat(v.total?.replace('$', '')) || 0), 0);
    
    const elProductos = document.getElementById('resumen-productos');
    const elClientes = document.getElementById('resumen-clientes');
    const elVentas = document.getElementById('resumen-ventas');
    const elTotal = document.getElementById('resumen-total-ventas');
    
    if (elProductos) elProductos.textContent = productos.length;
    if (elClientes) elClientes.textContent = clientes.length;
    if (elVentas) elVentas.textContent = ventas.length;
    if (elTotal) elTotal.textContent = `$${totalVentas.toFixed(2)}`;
    
    // Actualizar nombre de empresa y usuario en el encabezado
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

// Renderizar tabla de productos
function renderizarTablaProductos() {
    const tbody = document.getElementById('tabla-productos');
    if (!tbody) return;
    
    const productos = window.inventario || [];
    if (!productos.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="config-empty">No hay productos registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = productos.map(p => `
        <tr>
            <td>${p.codigo || '—'}</td>
            <td>${p.nombre || 'Sin nombre'}</td>
            <td>${p.cat || 'General'}</td>
            <td>${p.precio || '$0.00'}</td>
            <td>${p.stock || 0}</td>
            <td>
                <div class="config-actions-cell">
                    <button class="btn-sm btn-sm-edit" onclick="editarProductoConfig('${p.nombre}')">✏️</button>
                    <button class="btn-sm btn-sm-delete" onclick="eliminarProductoConfig('${p.nombre}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Renderizar tabla de clientes
function renderizarTablaClientes() {
    const tbody = document.getElementById('tabla-clientes');
    if (!tbody) return;
    
    const clientes = window.clientes || [];
    if (!clientes.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="config-empty">No hay clientes registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = clientes.map(c => `
        <tr>
            <td>${c.nombre || 'Sin nombre'}</td>
            <td>${c.email || '—'}</td>
            <td>${c.phone || '—'}</td>
            <td>
                <div class="config-actions-cell">
                    <button class="btn-sm btn-sm-edit" onclick="editarClienteConfig('${c.nombre}')">✏️</button>
                    <button class="btn-sm btn-sm-delete" onclick="eliminarClienteConfig('${c.nombre}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Renderizar tabla de ventas
function renderizarTablaVentas() {
    const tbody = document.getElementById('tabla-ventas');
    if (!tbody) return;
    
    const ventas = window.ventas || [];
    if (!ventas.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="config-empty">No hay ventas registradas</td></tr>`;
        return;
    }
    
    tbody.innerHTML = ventas.map(v => `
        <tr>
            <td>${v.cliente || '—'}</td>
            <td>${v.producto || '—'}</td>
            <td>${v.total || '$0.00'}</td>
            <td>${v.fecha || '—'}</td>
            <td><span style="color:${v.status === 'pagado' ? '#22c55e' : '#eab308'}; font-weight:600;">${v.status ? v.status.charAt(0).toUpperCase() + v.status.slice(1) : '—'}</span></td>
            <td>
                <div class="config-actions-cell">
                    <button class="btn-sm btn-sm-edit" onclick="editarVentaConfig('${v.id}')">✏️</button>
                    <button class="btn-sm btn-sm-delete" onclick="eliminarVentaConfig('${v.id}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================================
//  FUNCIONES PARA MODALES DE AGREGAR DESDE CONFIGURACIÓN
// ============================================================

function abrirModalProducto() {
    // Usamos el modal existente pero con el formulario de producto
    openModalWithContent('Agregar Producto', `
        <div class="field"><label>Nombre</label><input type="text" id="input-nombre-config" placeholder="Nombre del producto"></div>
        <div class="field"><label>Categoría</label>
            <select id="input-categoria-config">
                <option>Bebidas</option><option>Básicos</option><option>Granos</option><option>Lácteos</option><option>Dulces</option><option>Cocina</option><option>Salsas</option><option>Harinas</option><option>Conservas</option>
            </select>
        </div>
        <div class="row">
            <div class="field"><label>Precio</label><input type="text" id="input-precio-config" placeholder="$0.00"></div>
            <div class="field"><label>Stock</label><input type="number" id="input-stock-config" placeholder="0"></div>
        </div>
        <div class="field"><label>Código</label><input type="text" id="input-codigo-config" placeholder="SKU-001"></div>
        <button class="btn btn-primary" onclick="guardarProductoConfig()">Guardar producto</button>
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    `);
}

function guardarProductoConfig() {
    const nombre = document.getElementById('input-nombre-config').value.trim();
    const cat = document.getElementById('input-categoria-config').value;
    const precio = parseFloat(document.getElementById('input-precio-config').value.replace('$', '')) || 0;
    const stock = parseInt(document.getElementById('input-stock-config').value) || 0;
    const codigo = document.getElementById('input-codigo-config').value.trim() || 'SKU-' + Date.now().toString().slice(-6);
    
    if (!nombre) { showToast('⚠️ El nombre es obligatorio'); return; }
    if (precio <= 0) { showToast('⚠️ Ingresa un precio válido'); return; }
    
    const iconMap = { 'Bebidas': '☕', 'Dulces': '🍫', 'Endulzantes': '🍯', 'Básicos': '🧂', 'Granos': '🫘', 'Lácteos': '🧀', 'Cocina': '🫙', 'Salsas': '🌶️', 'Harinas': '🌾', 'Conservas': '🥫' };
    const icon = iconMap[cat] || '📦';
    let estado = 'ok';
    if (stock === 0) estado = 'out';
    else if (stock <= 5) estado = 'low';
    
    const nuevoProducto = { nombre, cat, precio: '$' + precio.toFixed(2), stock, icon, estado, codigo };
    
    store.addProducto(nuevoProducto).then(() => {
        syncGlobals();
        renderizarTablaProductos();
        actualizarResumenConfiguracion();
        closeModal();
        showToast('✅ Producto agregado');
    }).catch(err => {
        showToast('❌ Error: ' + err.message);
    });
}

function abrirModalCliente() {
    openModalWithContent('Agregar Cliente', `
        <div class="field"><label>Nombre</label><input type="text" id="input-cliente-nombre-config" placeholder="Nombre completo"></div>
        <div class="field"><label>Email</label><input type="email" id="input-cliente-email-config" placeholder="correo@ejemplo.com"></div>
        <div class="field"><label>Teléfono</label><input type="text" id="input-cliente-telefono-config" placeholder="+58 412 000 0000"></div>
        <button class="btn btn-primary" onclick="guardarClienteConfig()">Guardar cliente</button>
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    `);
}

function guardarClienteConfig() {
    const nombre = document.getElementById('input-cliente-nombre-config').value.trim();
    const email = document.getElementById('input-cliente-email-config').value.trim();
    const phone = document.getElementById('input-cliente-telefono-config').value.trim();
    
    if (!nombre) { showToast('⚠️ El nombre es obligatorio'); return; }
    
    const init = nombre.split(' ').map(p => p.charAt(0).toUpperCase()).join('').slice(0, 2);
    const colores = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA', '#E11D48'];
    const color = colores[Math.floor(Math.random() * colores.length)];
    
    const nuevoCliente = { nombre, email, phone, compras: '$0.00', pedidos: 0, tag: 'nuevo', color, init };
    
    store.addCliente(nuevoCliente).then(() => {
        syncGlobals();
        renderizarTablaClientes();
        actualizarResumenConfiguracion();
        closeModal();
        showToast('✅ Cliente agregado');
    }).catch(err => {
        showToast('❌ Error: ' + err.message);
    });
}

function abrirModalVenta() {
    const clientes = (window.clientes || []).map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    const productos = (window.inventario || []).map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
    
    openModalWithContent('Agregar Venta', `
        <div class="field"><label>Cliente</label>
            <select id="input-venta-cliente-config">
                <option value="">Seleccionar cliente...</option>
                ${clientes}
            </select>
        </div>
        <div class="field"><label>Producto</label>
            <select id="input-venta-producto-config">
                <option value="">Seleccionar producto...</option>
                ${productos}
            </select>
        </div>
        <div class="field"><label>Monto</label><input type="text" id="input-venta-monto-config" placeholder="$0.00"></div>
        <div class="field"><label>Estado</label>
            <select id="input-venta-estado-config">
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
                <option value="cancelado">Cancelado</option>
            </select>
        </div>
        <button class="btn btn-primary" onclick="guardarVentaConfig()">Guardar venta</button>
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    `);
}

function guardarVentaConfig() {
    const cliente = document.getElementById('input-venta-cliente-config').value;
    const producto = document.getElementById('input-venta-producto-config').value;
    const monto = parseFloat(document.getElementById('input-venta-monto-config').value.replace('$', '')) || 0;
    const status = document.getElementById('input-venta-estado-config').value;
    
    if (!cliente) { showToast('⚠️ Selecciona un cliente'); return; }
    if (!producto) { showToast('⚠️ Selecciona un producto'); return; }
    if (monto <= 0) { showToast('⚠️ Ingresa un monto válido'); return; }
    
    const nuevaVenta = {
        cliente, producto, items: 1,
        total: '$' + monto.toFixed(2),
        status: status,
        metodo: 'Efectivo',
        notas: '',
        fecha: new Date().toLocaleString()
    };
    
    store.addVenta(nuevaVenta).then(() => {
        syncGlobals();
        renderizarTablaVentas();
        actualizarResumenConfiguracion();
        closeModal();
        showToast('✅ Venta agregada');
    }).catch(err => {
        showToast('❌ Error: ' + err.message);
    });
}

// ============================================================
//  FUNCIONES PARA EDITAR Y ELIMINAR DESDE CONFIGURACIÓN
// ============================================================

function editarProductoConfig(nombre) {
    const producto = (window.inventario || []).find(p => p.nombre === nombre);
    if (!producto) { showToast('⚠️ Producto no encontrado'); return; }
    
    // Reutilizar el modal de edición existente (editProducto)
    editProducto(nombre);
    // Después de editar, refrescar la tabla
    setTimeout(renderizarTablaProductos, 500);
}

function eliminarProductoConfig(nombre) {
    const producto = (window.inventario || []).find(p => p.nombre === nombre);
    if (!producto) { showToast('⚠️ Producto no encontrado'); return; }
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    
    store.deleteProducto(producto.id).then(() => {
        syncGlobals();
        renderizarTablaProductos();
        actualizarResumenConfiguracion();
        showToast('🗑️ Producto eliminado');
    }).catch(err => {
        showToast('❌ Error: ' + err.message);
    });
}

function editarClienteConfig(nombre) {
    editCliente(nombre);
    setTimeout(renderizarTablaClientes, 500);
}

function eliminarClienteConfig(nombre) {
    const cliente = (window.clientes || []).find(c => c.nombre === nombre);
    if (!cliente) { showToast('⚠️ Cliente no encontrado'); return; }
    if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
    
    store.deleteCliente(cliente.id).then(() => {
        syncGlobals();
        renderizarTablaClientes();
        actualizarResumenConfiguracion();
        showToast('🗑️ Cliente eliminado');
    }).catch(err => {
        showToast('❌ Error: ' + err.message);
    });
}

function editarVentaConfig(id) {
    editVenta(id);
    setTimeout(renderizarTablaVentas, 500);
}

function eliminarVentaConfig(id) {
    if (!confirm('¿Eliminar esta venta?')) return;
    store.deleteVenta(id).then(() => {
        syncGlobals();
        renderizarTablaVentas();
        actualizarResumenConfiguracion();
        showToast('🗑️ Venta eliminada');
    }).catch(err => {
        showToast('❌ Error: ' + err.message);
    });
}

// ============================================================
//  EVENTOS PARA PESTAÑAS DE CONFIGURACIÓN
// ============================================================

// Eventos para las pestañas de configuración (se delega porque el contenido se carga dinámicamente)
document.addEventListener('click', function(e) {
    const tab = e.target.closest('.config-tab');
    if (tab && tab.dataset.tab) {
        cambiarTabConfiguracion(tab.dataset.tab);
    }
});

// ============================================================
//  🔥 FORZAR FUNCIONES GLOBALES
// ============================================================

window.toggleCliente = toggleCliente;
window.loginCliente = loginCliente;
window.registrarCliente = registrarCliente;
window.cerrarSesionCliente = cerrarSesionCliente;
window.mostrarRegistro = mostrarRegistro;
window.mostrarLogin = mostrarLogin;
window.goScreen = goScreen;
window.verCarrito = verCarrito;
window.actualizarAvatar = actualizarAvatar;

console.log('✅ app.js cargado correctamente - Funciones globales expuestas');
