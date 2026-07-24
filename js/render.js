// ── FUNCIONES DE RENDERIZADO CON FILTROS Y PAGINACIÓN ──

// Variables de paginación por módulo
let paginaVentas = 1;
let paginaInv = 1;
let paginaCli = 1;
const ITEMS_POR_PAGINA = 10;

function renderVentas(textFilter = '', statusFilter = 'todas', page = 1) {
  const list = document.getElementById('ventas-list');
  const q = textFilter.toLowerCase();

  // Filtrar
  let data = ventas.filter(v => {
    const matchText = !q || v.cliente.toLowerCase().includes(q) || v.id.includes(q);
    const matchStatus = statusFilter === 'todas' || v.status === statusFilter;
    return matchText && matchStatus;
  });

  // Paginar
  const total = data.length;
  const totalPages = Math.ceil(total / ITEMS_POR_PAGINA);
  const start = (page - 1) * ITEMS_POR_PAGINA;
  const end = start + ITEMS_POR_PAGINA;
  const pageData = data.slice(start, end);

  if (!pageData.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No se encontraron ventas</div></div>`;
    updateKPIs();
    return;
  }

  list.innerHTML = pageData.map(v => `
    <div class="sale-card">
      <div class="sale-header">
        <span class="sale-id">${v.id}</span>
        <span class="sale-status ${v.status}">${v.status.charAt(0).toUpperCase() + v.status.slice(1)}</span>
        <div>
          <button class="btn-icon edit" onclick="editVenta('${v.id}')" title="Editar">✏️</button>
          <button class="btn-icon danger" onclick="confirmDeleteVenta('${v.id}')" title="Eliminar">🗑️</button>
        </div>
      </div>
      <div class="sale-client">${v.cliente}</div>
      <div class="sale-meta">${v.fecha}</div>
      <div class="sale-footer">
        <span class="sale-items">${v.items} producto${v.items > 1 ? 's' : ''}</span>
        <span class="sale-total">${v.total}</span>
      </div>
    </div>
  `).join('');

  // Agregar controles de paginación
  agregarPaginacion(list, totalPages, page, 'ventas');
  updateKPIs();
}

function renderInv(textFilter = '', stockFilter = 'todos', page = 1) {
  const list = document.getElementById('inv-list');
  const q = textFilter.toLowerCase();

  let data = inventario.filter(p => {
    const matchText = !q || p.nombre.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
    const matchStock = stockFilter === 'todos' || p.estado === stockFilter;
    return matchText && matchStock;
  });

  const total = data.length;
  const totalPages = Math.ceil(total / ITEMS_POR_PAGINA);
  const start = (page - 1) * ITEMS_POR_PAGINA;
  const end = start + ITEMS_POR_PAGINA;
  const pageData = data.slice(start, end);

  if (!pageData.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">No se encontraron productos</div></div>`;
    updateKPIs();
    return;
  }

  list.innerHTML = pageData.map(p => `
    <div class="inv-card">
      <div class="inv-img">${p.icon}</div>
      <div class="inv-info">
        <div class="inv-name">${p.nombre}</div>
        <div class="inv-cat">${p.cat}</div>
      </div>
      <div class="inv-right">
        <div class="inv-price">${p.precio}</div>
        <div class="inv-stock ${p.estado}">${p.estado === 'out' ? 'Agotado' : p.stock + ' u.'}</div>
      </div>
      <div style="display:flex; gap:4px; align-items:center;">
        <button class="btn-icon edit" onclick="editProducto('${p.nombre}')" title="Editar">✏️</button>
        <button class="btn-icon danger" onclick="confirmDeleteProducto('${p.nombre}')" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');

  agregarPaginacion(list, totalPages, page, 'inv');
  updateKPIs();
}

function renderClients(textFilter = '', tagFilter = 'todos', page = 1) {
  const list = document.getElementById('client-list');
  const q = textFilter.toLowerCase();

  let data = clientes.filter(c => {
    const matchText = !q || c.nombre.toLowerCase().includes(q) || c.phone.includes(q);
    const matchTag = tagFilter === 'todos' || c.tag === tagFilter;
    return matchText && matchTag;
  });

  const total = data.length;
  const totalPages = Math.ceil(total / ITEMS_POR_PAGINA);
  const start = (page - 1) * ITEMS_POR_PAGINA;
  const end = start + ITEMS_POR_PAGINA;
  const pageData = data.slice(start, end);

  if (!pageData.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">👥</div><div class="empty-text">No se encontraron clientes</div></div>`;
    updateKPIs();
    return;
  }

  const tagLabel = { vip: 'VIP', regular: 'Regular', nuevo: 'Nuevo' };
  list.innerHTML = pageData.map(c => `
    <div class="client-card">
      <div class="client-avatar" style="background:${c.color}">${c.init}</div>
      <div class="client-info">
        <div class="client-name">${c.nombre}</div>
        <div class="client-phone">${c.phone}</div>
        <span class="client-tag ${c.tag}">${tagLabel[c.tag]}</span>
      </div>
      <div class="client-right">
        <div class="client-spent">${c.compras}</div>
        <div class="client-orders">${c.pedidos} pedidos</div>
      </div>
      <div style="display:flex; gap:4px; align-items:center;">
        <button class="btn-icon edit" onclick="editCliente('${c.nombre}')" title="Editar">✏️</button>
        <button class="btn-icon danger" onclick="confirmDeleteCliente('${c.nombre}')" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');

  agregarPaginacion(list, totalPages, page, 'cli');
  updateKPIs();
}

// ── PAGINACIÓN: agregar controles al final de la lista ──
function agregarPaginacion(container, totalPages, currentPage, module) {
  if (totalPages <= 1) return;
  const pagWrap = document.createElement('div');
  pagWrap.className = 'pagination';
  pagWrap.style.cssText = 'display:flex; justify-content:center; gap:8px; margin-top:16px; flex-wrap:wrap;';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'btn btn-outline';
    btn.style.cssText = `padding:4px 12px; min-width:36px; ${i === currentPage ? 'background:var(--primary); color:white;' : ''}`;
    btn.onclick = () => {
      if (module === 'ventas') renderVentas(document.getElementById('venta-search').value, filtroVentas, i);
      else if (module === 'inv') renderInv(document.getElementById('inv-search').value, filtroInv, i);
      else if (module === 'cli') renderClients(document.getElementById('client-search').value, filtroCli, i);
    };
    pagWrap.appendChild(btn);
  }
  container.appendChild(pagWrap);
}

// ── REPORTES DINÁMICOS ──
async function renderReportes(periodo = 'semana') {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) {
    showToast('⚠️ Inicia sesión para ver reportes');
    return;
  }

  // Calcular fechas
  const ahora = new Date();
  let inicio, fin;
  if (periodo === 'semana') {
    const dia = ahora.getDay();
    inicio = new Date(ahora);
    inicio.setDate(ahora.getDate() - dia);
    inicio.setHours(0,0,0,0);
    fin = new Date(ahora);
    fin.setHours(23,59,59,999);
  } else if (periodo === 'mes') {
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23,59,59,999);
  } else { // año
    inicio = new Date(ahora.getFullYear(), 0, 1);
    fin = new Date(ahora.getFullYear(), 11, 31, 23,59,59,999);
  }

  const ventasPeriodo = await store.obtenerVentasPorPeriodo(empresaId, inicio.toISOString(), fin.toISOString());
  const totalIngresos = ventasPeriodo.reduce((sum, v) => sum + parseCurrency(v.total), 0);
  const totalPedidos = ventasPeriodo.length;
  const cancelados = ventasPeriodo.filter(v => v.status === 'cancelado').length;
  const ticketPromedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0;

  // Actualizar tarjetas de resumen en reportes
  const rows = document.querySelectorAll('.stat-row');
  if (rows.length >= 4) {
    rows[0].querySelector('.stat-value').textContent = formatCurrency(totalIngresos);
    rows[1].querySelector('.stat-value').textContent = totalPedidos;
    rows[2].querySelector('.stat-value').textContent = formatCurrency(ticketPromedio);
    rows[3].querySelector('.stat-value').textContent = cancelados;
  }

  // Productos más vendidos
  const topProductos = await store.obtenerProductosMasVendidos(empresaId, 5);
  const topContainer = document.querySelector('.card .top-product');
  if (topContainer) {
    const parent = topContainer.parentElement;
    const titulo = parent.querySelector('.section-title');
    parent.innerHTML = `<div class="section-title" style="margin-bottom:12px">Productos más vendidos</div>`;
    if (topProductos.length === 0) {
      parent.innerHTML += '<div class="empty"><div class="empty-text">Sin datos</div></div>';
    } else {
      const maxVentas = topProductos[0]?.cantidad || 1;
      topProductos.forEach((p, i) => {
        const pct = Math.round((p.cantidad / maxVentas) * 100);
        parent.innerHTML += `
          <div class="top-product">
            <div class="top-rank">#${i+1}</div>
            <div class="top-name">${p.nombre}</div>
            <div class="top-bar-wrap"><div class="top-bar" style="width:${pct}%"></div></div>
            <div class="top-val">${formatCurrency(p.total)}</div>
          </div>
        `;
      });
    }
  }
}

// ── ACTUALIZAR KPIs ──
function updateKPIs() {
  const hoy = new Date().toLocaleDateString();
  const ventasHoy = ventas.filter(v => {
    if (v.fecha && v.fecha.includes('Hoy')) return v.status === 'pagado';
    try {
      const fechaVenta = new Date(v.fecha);
      return fechaVenta.toLocaleDateString() === hoy && v.status === 'pagado';
    } catch { return false; }
  });
  const totalHoy = ventasHoy.reduce((sum, v) => sum + parseCurrency(v.total), 0);
  const kpiVentas = document.querySelector('.kpi-card.blue .kpi-value');
  if (kpiVentas) kpiVentas.textContent = formatCurrency(totalHoy);

  const totalPedidos = ventas.length;
  const kpiPedidos = document.querySelector('.kpi-card.green .kpi-value');
  if (kpiPedidos) kpiPedidos.textContent = totalPedidos;

  const stockBajo = inventario.filter(p => p.estado === 'low').length;
  const kpiStock = document.querySelector('.kpi-card.amber .kpi-value');
  if (kpiStock) kpiStock.textContent = stockBajo;

  const totalClientes = clientes.length;
  const kpiClientes = document.querySelector('.kpi-card.purple .kpi-value');
  if (kpiClientes) kpiClientes.textContent = totalClientes;

  const pendientes = ventas.filter(v => v.status === 'pendiente').length;
  const subPedidos = document.getElementById('kpi-sub-pedidos');
  if (subPedidos) subPedidos.textContent = pendientes + ' pendientes';

  const nuevosHoy = clientes.filter(c => c.tag === 'nuevo').length;
  const subClientes = document.querySelector('.kpi-card.purple .kpi-sub');
  if (subClientes) subClientes.textContent = nuevosHoy + ' nuevos hoy';
}

// ── EXPONER FUNCIONES GLOBALES ──
window.renderVentas = renderVentas;
window.renderInv = renderInv;
window.renderClients = renderClients;
window.renderReportes = renderReportes;
window.updateKPIs = updateKPIs;
