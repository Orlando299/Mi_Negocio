// ── NAVEGACIÓN Y LÓGICA PRINCIPAL ──

let currentScreen = 'dashboard';
const screens = ['dashboard', 'ventas', 'inventario', 'clientes', 'reportes'];

function goScreen(name) {
  screens.forEach(s => {
    document.getElementById('screen-' + s).classList.toggle('active', s === name);
    document.getElementById('nav-' + s).classList.toggle('active', s === name);
  });
  currentScreen = name;
  // Cambiar el ícono del FAB según la pantalla
  const fabLabels = { dashboard: '＋', ventas: '＋', inventario: '＋', clientes: '＋', reportes: '⬇' };
  document.getElementById('fab-btn').textContent = fabLabels[name] || '＋';
  // Renderizar listas al cambiar de pantalla
  if (name === 'ventas') renderVentas();
  if (name === 'inventario') renderInv();
  if (name === 'clientes') renderClients();
}

// ── FILTROS POR CHIP ──
function filterChip(el, ctx) {
  el.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  showToast('Filtro: ' + el.textContent);
}

// ── REPORT TABS ──
function switchReportTab(el, period) {
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  showToast('Mostrando datos: ' + el.textContent);
}

// ── Sincronizar variables globales con el store ──
function syncGlobals() {
  // Estas variables se usan en render.js y en otros lugares
  window.ventas = store.ventas;
  window.inventario = store.inventario;
  window.clientes = store.clientes;
}

// ── FUNCIONES PARA GUARDAR DESDE MODALES ──

function guardarVenta() {
  const modalBody = document.getElementById('modal-body');
  const inputs = modalBody.querySelectorAll('input, select, textarea');

  const cliente = inputs[0]?.value?.trim() || 'Cliente genérico';
  const producto = inputs[1]?.value?.trim() || 'Producto';
  const cantidad = parseInt(inputs[2]?.value) || 1;
  const precioUnit = parseFloat(inputs[3]?.value?.replace('$', '')) || 0;
  const total = precioUnit * cantidad;
  const metodo = inputs[4]?.value || 'Efectivo';
  const notas = inputs[5]?.value || '';

  if (!cliente || cliente === 'Cliente genérico') {
    showToast('⚠️ Ingresa el nombre del cliente');
    return;
  }

  const nuevaVenta = {
    cliente: cliente,
    fecha: new Date().toLocaleString(),
    items: cantidad,
    total: '$' + total.toFixed(2),
    status: 'pagado',
    metodo: metodo,
    notas: notas,
    producto: producto
  };

  store.addVenta(nuevaVenta);
  syncGlobals();
  renderVentas();
  closeModal();
  showToast('✅ Venta registrada con éxito');
}

function guardarProducto() {
  const modalBody = document.getElementById('modal-body');
  const inputs = modalBody.querySelectorAll('input, select, textarea');

  const nombre = inputs[0]?.value?.trim() || 'Producto nuevo';
  const cat = inputs[1]?.value || 'General';
  const precioVenta = parseFloat(inputs[2]?.value) || 0;
  const precioCosto = parseFloat(inputs[3]?.value) || 0;
  const stock = parseInt(inputs[4]?.value) || 0;
  const stockMin = parseInt(inputs[5]?.value) || 5;
  const referencia = inputs[6]?.value || '';

  if (!nombre || nombre === 'Producto nuevo') {
    showToast('⚠️ Ingresa el nombre del producto');
    return;
  }

  // Asignar icono según categoría (simple)
  const iconMap = {
    'Bebidas': '☕',
    'Dulces': '🍫',
    'Endulzantes': '🍯',
    'Básicos': '🧂',
    'Granos': '🫘',
    'Lácteos': '🧀',
    'Cocina': '🫙'
  };
  const icon = iconMap[cat] || '📦';

  // Determinar estado del stock
  let estado = 'ok';
  if (stock === 0) estado = 'out';
  else if (stock <= stockMin) estado = 'low';

  const nuevoProducto = {
    nombre: nombre,
    cat: cat,
    precio: '$' + precioVenta.toFixed(2),
    stock: stock,
    icon: icon,
    estado: estado,
    costo: '$' + precioCosto.toFixed(2),
    referencia: referencia
  };

  store.addProducto(nuevoProducto);
  syncGlobals();
  renderInv();
  closeModal();
  showToast('✅ Producto agregado con éxito');
}

function guardarCliente() {
  const modalBody = document.getElementById('modal-body');
  const inputs = modalBody.querySelectorAll('input, select, textarea');

  const nombre = inputs[0]?.value?.trim() || '';
  const apellido = inputs[1]?.value?.trim() || '';
  const telefono = inputs[2]?.value?.trim() || '';
  const email = inputs[3]?.value?.trim() || '';
  const direccion = inputs[4]?.value?.trim() || '';
  const notas = inputs[5]?.value || '';

  const nombreCompleto = (nombre + ' ' + apellido).trim();

  if (!nombreCompleto) {
    showToast('⚠️ El nombre es obligatorio');
    return;
  }

  // Generar iniciales
  const init = nombreCompleto.split(' ').map(p => p.charAt(0).toUpperCase()).join('');

  // Colores aleatorios para el avatar
  const colores = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA', '#E11D48'];
  const color = colores[Math.floor(Math.random() * colores.length)];

  const nuevoCliente = {
    nombre: nombreCompleto,
    phone: telefono,
    compras: '$0.00',
    pedidos: 0,
    tag: 'nuevo',
    color: color,
    init: init,
    email: email,
    direccion: direccion,
    notas: notas
  };

  store.addCliente(nuevoCliente);
  syncGlobals();
  renderClients();
  closeModal();
  showToast('✅ Cliente registrado con éxito');
}

function guardarReporte() {
  closeModal();
  showToast('📊 Reporte generado (simulación)');
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

function saveAndClose(msg) {
  closeModal();
  setTimeout(() => showToast(msg), 150);
}

// ── INICIALIZACIÓN ──

document.addEventListener('DOMContentLoaded', () => {
  // Fecha actual
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  document.getElementById('fecha-hoy').textContent = `${dias[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;

  // Sincronizar variables globales con el store
  syncGlobals();

  // Renderizar listas iniciales
  renderVentas();
  renderInv();
  renderClients();
});
