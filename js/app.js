// ── NAVEGACIÓN Y LÓGICA PRINCIPAL ──

let currentScreen = 'dashboard';
const screens = ['dashboard', 'ventas', 'inventario', 'clientes', 'reportes', 'cliente', 'configuracion'];

// Filtros activos por módulo
let filtroVentas = 'todas';
let filtroInv = 'todos';
let filtroCli = 'todos';

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
function filterInv() { renderInv(document.getElementById('inv-search').value, filtroInv, 1); }
function filterClients() { renderClients(document.getElementById('client-search').value, filtroCli, 1); }

// ── REPORT TABS ──
function switchReportTab(el, period) {
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderReportes(period);
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

// ── FUNCIONES DE GUARDADO (usando store) ──
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
    cliente, producto, items: cantidad, total: formatCurrency(total),
    status: 'pagado', metodo, notas, fecha: getCurrentTimestamp()
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

// ── EDICIÓN (actualizada para usar store) ──
// ... (las funciones editVenta, editProducto, editCliente ya existen, solo asegurar que usen store)

// ── CARRITO CON VALIDACIÓN DE STOCK ──
function agregarAlCarrito(nombre) {
  const producto = inventario.find(p => p.nombre === nombre);
  if (!producto) { showToast('⚠️ Producto no encontrado'); return; }
  if (producto.estado === 'out') { showToast('⚠️ Producto agotado'); return; }

  // Verificar stock disponible
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

async function realizarPedido() {
  if (!sessionStorage.getItem('empresaId')) { showToast('⚠️ Inicia sesión primero'); return; }
  if (!carrito.length) { showToast('🛒 Carrito vacío'); return; }

  // Verificar stock de cada producto antes de confirmar
  for (const item of carrito) {
    const producto = inventario.find(p => p.nombre === item.nombre);
    if (!producto) {
      showToast(`⚠️ Producto "${item.nombre}" no existe`); return;
    }
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
    // Descontar stock
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
  } catch (error) {
    handleError(error);
  }
}

// ── ASISTENTE IA: MÁS COMANDOS ──
function executeManualCommand(comando) {
  const cmd = comando.toLowerCase().trim();
  // Comandos nuevos:
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
  // Llamar al comando original
  return superExecuteManualCommand(cmd);
}

// Guardar referencia a la función original y sobrescribir
const superExecuteManualCommand = window.executeManualCommand || function(cmd) {
  return `ℹ️ Comando no reconocido. Escribe "ayuda" para ver opciones.`;
};
window.executeManualCommand = executeManualCommand;

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

  // Eventos para pestañas de configuración
  document.addEventListener('click', function(e) {
    const tab = e.target.closest('.config-tab');
    if (tab && tab.dataset.tab) {
      cambiarTabConfiguracion(tab.dataset.tab);
    }
  });

  console.log('🚀 App inicializada con Firebase y mejoras');
});

// Exponer funciones globales (ya están la mayoría)
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
window.agregarAlCarrito = agregarAlCarrito;
window.realizarPedido = realizarPedido;
window.executeManualCommand = executeManualCommand;
