// ── NAVEGACIÓN Y LÓGICA PRINCIPAL ──

let currentScreen = 'dashboard';
const screens = ['dashboard', 'ventas', 'inventario', 'clientes', 'reportes', 'cliente'];

// Filtros activos por módulo
let filtroVentas = 'todas';
let filtroInv = 'todos';
let filtroCli = 'todos';

function goScreen(name) {
  screens.forEach(s => {
    document.getElementById('screen-' + s).classList.toggle('active', s === name);
    document.getElementById('nav-' + s).classList.toggle('active', s === name);
  });
  currentScreen = name;
  const fabLabels = { dashboard: '＋', ventas: '＋', inventario: '＋', clientes: '＋', reportes: '⬇', cliente: '⬇' };
  document.getElementById('fab-btn').textContent = fabLabels[name] || '＋';

  if (name === 'ventas') renderVentas('', filtroVentas);
  if (name === 'inventario') renderInv('', filtroInv);
  if (name === 'clientes') renderClients('', filtroCli);

  if (name === 'cliente') {
    if (clienteActual) {
      mostrarPanelCliente();
    } else {
      document.getElementById('cliente-login').style.display = 'block';
      document.getElementById('cliente-panel').style.display = 'none';
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

// ── FUNCIONES DE GUARDADO ──

function guardarVenta() {
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

  store.addVenta(nuevaVenta);
  syncGlobals();
  renderVentas('', filtroVentas);
  closeModal();
  showToast('✅ Venta registrada con éxito');
}

function guardarProducto() {
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
  store.addProducto(nuevoProducto);
  syncGlobals();
  renderInv('', filtroInv);
  closeModal();
  showToast('✅ Producto agregado con éxito');
}

function guardarCliente() {
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
  store.addCliente(nuevoCliente);
  syncGlobals();
  renderClients('', filtroCli);
  closeModal();
  showToast('✅ Cliente registrado con éxito');
}

function guardarReporte() { closeModal(); showToast('📊 Reporte generado (simulación)'); }

// ── EDICIÓN ──

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

function updateVentaFromModal(id) {
  const cliente = document.getElementById('edit-cliente').value.trim();
  const producto = document.getElementById('edit-producto').value.trim();
  const cantidad = parseInt(document.getElementById('edit-cantidad').value) || 1;
  const precioUnit = parseFloat(document.getElementById('edit-precio').value.replace('$','')) || 0;
  const metodo = document.getElementById('edit-metodo').value;
  const notas = document.getElementById('edit-notas').value;
  const total = precioUnit * cantidad;

  if (!cliente) { showToast('⚠️ El cliente es obligatorio'); return; }
  const updates = { cliente, producto, items: cantidad, total: '$' + total.toFixed(2), metodo, notas };
  store.updateVenta(id, updates);
  syncGlobals();
  renderVentas('', filtroVentas);
  closeModal();
  showToast('✅ Venta actualizada');
}

function editProducto(nombre) {
  const p = store.inventario.find(item => item.nombre === nombre);
  if (!p) return showToast('Producto no encontrado');
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
      </select>
    </div>
    <div class="row">
      <div class="field"><label>Precio</label><input type="text" value="${p.precio.replace('$','')}" id="edit-precio"></div>
      <div class="field"><label>Stock</label><input type="number" value="${p.stock}" id="edit-stock"></div>
    </div>
    <button class="btn btn-primary" onclick="updateProductoFromModal('${nombre}')">Actualizar producto</button>
    <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
  `;
  openModalWithContent('Editar producto', body);
}

function updateProductoFromModal(nombreOriginal) {
  const nombre = document.getElementById('edit-nombre').value.trim();
  const cat = document.getElementById('edit-cat').value;
  const precio = parseFloat(document.getElementById('edit-precio').value) || 0;
  const stock = parseInt(document.getElementById('edit-stock').value) || 0;
  if (!nombre) { showToast('⚠️ El nombre es obligatorio'); return; }
  let estado = 'ok';
  if (stock === 0) estado = 'out';
  else if (stock <= 5) estado = 'low';
  const updates = { nombre, cat, precio: '$' + precio.toFixed(2), stock, estado };
  if (nombre !== nombreOriginal) {
    store.deleteProducto(nombreOriginal);
    store.addProducto({ ...updates, icon: '📦' });
  } else {
    store.updateProducto(nombreOriginal, updates);
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

function updateClienteFromModal(nombreOriginal) {
  const nombre = document.getElementById('edit-nombre').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const tag = document.getElementById('edit-tag').value;
  if (!nombre) { showToast('⚠️ El nombre es obligatorio'); return; }
  const updates = { nombre, phone, tag };
  if (nombre !== nombreOriginal) {
    store.deleteCliente(nombreOriginal);
    const nuevo = { ...updates, compras: '$0.00', pedidos: 0, color: '#6B7280', init: nombre.split(' ').map(p => p.charAt(0).toUpperCase()).join('') };
    store.addCliente(nuevo);
  } else {
    store.updateCliente(nombreOriginal, updates);
  }
  syncGlobals();
  renderClients('', filtroCli);
  closeModal();
  showToast('✅ Cliente actualizado');
}

// ── ELIMINACIÓN CON CONFIRMACIÓN ──

function confirmDeleteVenta(id) {
  openConfirmModal('¿Seguro que deseas eliminar esta venta?', () => {
    store.deleteVenta(id);
    syncGlobals();
    renderVentas('', filtroVentas);
    showToast('🗑️ Venta eliminada');
  });
}

function confirmDeleteProducto(nombre) {
  openConfirmModal('¿Seguro que deseas eliminar este producto?', () => {
    store.deleteProducto(nombre);
    syncGlobals();
    renderInv('', filtroInv);
    showToast('🗑️ Producto eliminado');
  });
}

function confirmDeleteCliente(nombre) {
  openConfirmModal('¿Seguro que deseas eliminar este cliente?', () => {
    store.deleteCliente(nombre);
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

// ── MÓDULO CLIENTE ──

function toggleCliente() {
  const current = document.querySelector('.screen.active');
  if (current && current.id === 'screen-cliente') {
    goScreen('dashboard');
  } else {
    goScreen('cliente');
    if (cargarSesion()) {
      mostrarPanelCliente();
    } else {
      document.getElementById('cliente-login').style.display = 'block';
      document.getElementById('cliente-panel').style.display = 'none';
    }
    cargarCarrito();
    actualizarCarritoCount();
  }
}

function mostrarLogin() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('registro-form').style.display = 'none';
}

function mostrarRegistro() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('registro-form').style.display = 'block';
}

function loginCliente() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  if (!email || !pass) { showToast('⚠️ Completa todos los campos'); return; }

  const cliente = store.clientes.find(c => c.phone === email);
  if (!cliente) { showToast('❌ Cliente no encontrado'); return; }

  clienteActual = cliente;
  guardarSesion();
  mostrarPanelCliente();
  showToast('✅ Bienvenido ' + cliente.nombre);
}

function registrarCliente() {
  const nombre = document.getElementById('reg-nombre').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value.trim();
  if (!nombre || !email || !pass) { showToast('⚠️ Completa todos los campos'); return; }

  if (store.clientes.some(c => c.phone === email)) {
    showToast('⚠️ Ese correo ya está registrado');
    return;
  }

  const nuevo = {
    nombre: nombre,
    phone: email,
    compras: '$0.00',
    pedidos: 0,
    tag: 'nuevo',
    color: '#6B7280',
    init: nombre.split(' ').map(p => p.charAt(0).toUpperCase()).join(''),
    password: pass
  };
  store.addCliente(nuevo);
  syncGlobals();
  showToast('✅ Registro exitoso, inicia sesión');
  mostrarLogin();
  document.getElementById('login-email').value = email;
}

function mostrarPanelCliente() {
  document.getElementById('cliente-login').style.display = 'none';
  document.getElementById('cliente-panel').style.display = 'block';
  document.getElementById('cliente-nombre').textContent = clienteActual.nombre;
  renderCatalogo();
  renderHistorial();
  actualizarCarritoCount();
}

function cerrarSesionCliente() {
  clienteActual = null;
  carrito = [];
  localStorage.removeItem('clienteActual');
  localStorage.removeItem('carrito');
  document.getElementById('cliente-panel').style.display = 'none';
  document.getElementById('cliente-login').style.display = 'block';
  showToast('👋 Sesión cerrada');
  goScreen('dashboard');
}

function renderCatalogo() {
  const container = document.getElementById('catalogo-productos');
  if (!inventario.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">No hay productos disponibles</div></div>';
    return;
  }
  container.innerHTML = inventario.map(p => `
    <div class="inv-card" style="cursor:default;">
      <div class="inv-img">${p.icon}</div>
      <div class="inv-info">
        <div class="inv-name">${p.nombre}</div>
        <div class="inv-cat">${p.cat}</div>
        <div class="inv-stock ${p.estado}">${p.estado === 'out' ? 'Agotado' : p.stock + ' unidades'}</div>
      </div>
      <div class="inv-right">
        <div class="inv-price">${p.precio}</div>
        ${p.estado !== 'out' ? `<button class="btn btn-primary" style="height:36px;font-size:12px;padding:0 12px;" onclick="agregarAlCarrito('${p.nombre}')">+ Agregar</button>` : '<span style="color:var(--red);font-size:12px;">Agotado</span>'}
      </div>
    </div>
  `).join('');
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

function realizarPedido() {
  if (!clienteActual) { showToast('⚠️ Inicia sesión primero'); return; }
  if (!carrito.length) { showToast('🛒 Carrito vacío'); return; }
  const total = carrito.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
  const items = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  const pedido = {
    cliente: clienteActual.nombre,
    fecha: new Date().toLocaleString(),
    items: items,
    total: '$' + total.toFixed(2),
    status: 'pendiente',
    metodo: 'Cliente app',
    notas: carrito.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
    producto: 'Pedido desde app cliente'
  };

  store.addVenta(pedido);
  syncGlobals();
  carrito = [];
  guardarCarrito();
  actualizarCarritoCount();
  closeModal();
  renderHistorial();
  showToast('✅ Pedido realizado con éxito, espera confirmación');
}

function renderHistorial() {
  const container = document.getElementById('historial-pedidos');
  if (!clienteActual) return;
  const misPedidos = ventas.filter(v => v.cliente === clienteActual.nombre);
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

// ── INICIALIZACIÓN ──

document.addEventListener('DOMContentLoaded', () => {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  document.getElementById('fecha-hoy').textContent = `${dias[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;

  loadTheme();
  syncGlobals();

  // Cargar sesión y carrito si existen
  if (cargarSesion()) {
    // Si el cliente está logueado, no mostramos el panel automáticamente
    // pero dejamos la variable cargada.
  }
  cargarCarrito();

  renderVentas('', filtroVentas);
  renderInv('', filtroInv);
  renderClients('', filtroCli);

  console.log('🚀 App inicializada con módulo cliente');
});
