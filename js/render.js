// ── FUNCIONES DE RENDERIZADO CON FILTROS Y PAGINACIÓN (Carga bajo demanda) ──

let paginaVentas = 1;
let paginaInv = 1;
let paginaCli = 1;
const ITEMS_POR_PAGINA = 10;

// Variables para controlar la carga incremental
let cargandoVentas = false;
let cargandoInventario = false;
let cargandoClientes = false;

// ================================================================
//  RENDERIZAR VENTAS (con botón "Cargar más")
// ================================================================

function renderVentas(textFilter = '', statusFilter = 'todas', append = false) {
  const list = document.getElementById('ventas-list');
  const q = textFilter.toLowerCase();

  if (!append) {
    store.lastVentaDoc = null;
    store.hasMoreVentas = true;
    list.innerHTML = '';
  }

  let data = store.ventas.filter(v => {
    const matchText = !q || (v.cliente && v.cliente.toLowerCase().includes(q)) || (v.id && v.id.includes(q));
    const matchStatus = statusFilter === 'todas' || v.status === statusFilter;
    return matchText && matchStatus;
  });

  if (!data.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No se encontraron ventas</div></div>`;
    updateKPIs();
    return;
  }

  let html = data.map(v => {
    const pagoNotificado = v.clienteNotificoPago === true;
    const mostrarConfirmarPago = v.status === 'pendiente' && pagoNotificado;
    const mostrarDespachar = v.status === 'pendiente';
    const idEscapado = escapeHtml(v.id);
    const clienteEscapado = escapeHtml(v.cliente);
    const fechaEscapada = escapeHtml(v.fecha);
    const totalEscapado = escapeHtml(v.total);
    const notasEscapadas = v.notas ? escapeHtml(v.notas) : '';
    const statusEscapado = escapeHtml(v.status);
    const idJs = escapeJsString(v.id);

    return `
      <div class="sale-card">
        <div class="sale-header">
          <span class="sale-id">${idEscapado}</span>
          <span class="sale-status ${statusEscapado}">${statusEscapado.charAt(0).toUpperCase() + statusEscapado.slice(1)}</span>
          ${pagoNotificado ? `<span class="badge" style="background:var(--amber); color:#fff; font-size:10px; padding:2px 8px; border-radius:12px;">💳 Pago notificado</span>` : ''}
          <div>
            ${mostrarConfirmarPago ? `<button class="btn-icon" onclick="confirmarPago('${idJs}')" title="Confirmar pago" style="color:var(--green);">✅</button>` : ''}
            ${mostrarDespachar ? `<button class="btn-icon" onclick="abrirModalDespacho('${idJs}')" title="Despachar pedido" style="color:var(--green);">📦</button>` : ''}
            ${v.status === 'pagado' ? `<button class="btn-icon" onclick="generarFactura('${idJs}')" title="Descargar factura" style="color:var(--primary);">🧾</button>` : ''}
            ${v.status !== 'pendiente' ? `<button class="btn-icon edit" onclick="editVenta('${idJs}')" title="Editar">✏️</button>` : ''}
            ${v.status !== 'pendiente' ? `<button class="btn-icon danger" onclick="confirmDeleteVenta('${idJs}')" title="Eliminar">🗑️</button>` : ''}
          </div>
        </div>
        <div class="sale-client">${clienteEscapado}</div>
        <div class="sale-meta">${fechaEscapada}</div>
        <div class="sale-footer">
          <span class="sale-items">${v.items} producto${v.items > 1 ? 's' : ''}</span>
          <span class="sale-total">${totalEscapado}</span>
        </div>
        ${notasEscapadas ? `<div style="font-size:11px; color:var(--text3); margin-top:4px;">📝 ${notasEscapadas}</div>` : ''}
      </div>
    `;
  }).join('');

  let botonCargar = '';
  if (store.hasMoreVentas) {
    botonCargar = `
      <div style="text-align:center; margin-top:16px;">
        <button class="btn btn-outline" onclick="cargarMasVentas()" id="btn-cargar-ventas" ${cargandoVentas ? 'disabled' : ''}>
          ${cargandoVentas ? '⏳ Cargando...' : '📥 Cargar más ventas'}
        </button>
      </div>
    `;
  }

  list.innerHTML = html + botonCargar;
  updateKPIs();
}

// ================================================================
//  RENDERIZAR INVENTARIO (con "Cargar más")
// ================================================================

function renderInv(textFilter = '', stockFilter = 'todos', append = false) {
  const list = document.getElementById('inv-list');
  const q = textFilter.toLowerCase();

  if (!append) {
    store.lastInventarioDoc = null;
    store.hasMoreInventario = true;
    list.innerHTML = '';
  }

  let data = store.inventario.filter(p => {
    const matchText = !q || (p.nombre && p.nombre.toLowerCase().includes(q)) || (p.cat && p.cat.toLowerCase().includes(q));
    const matchStock = stockFilter === 'todos' || p.estado === stockFilter;
    return matchText && matchStock;
  });

  if (!data.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">No se encontraron productos</div></div>`;
    updateKPIs();
    return;
  }

  let html = data.map(p => {
    const nombreEscapado = escapeHtml(p.nombre);
    const catEscapado = escapeHtml(p.cat);
    const precioEscapado = escapeHtml(p.precio);
    const estadoEscapado = escapeHtml(p.estado);
    const icon = p.icon || '📦';
    const stock = p.stock ?? 0;
    const stockText = estadoEscapado === 'out' ? 'Agotado' : stock + ' u.';
    const nombreJs = escapeJsString(p.nombre);

    return `
      <div class="inv-card">
        <div class="inv-img">${icon}</div>
        <div class="inv-info">
          <div class="inv-name">${nombreEscapado}</div>
          <div class="inv-cat">${catEscapado}</div>
        </div>
        <div class="inv-right">
          <div class="inv-price">${precioEscapado}</div>
          <div class="inv-stock ${estadoEscapado}">${stockText}</div>
        </div>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn-icon edit" onclick="editProducto('${nombreJs}')" title="Editar">✏️</button>
          <button class="btn-icon danger" onclick="confirmDeleteProducto('${nombreJs}')" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  let botonCargar = '';
  if (store.hasMoreInventario) {
    botonCargar = `
      <div style="text-align:center; margin-top:16px;">
        <button class="btn btn-outline" onclick="cargarMasInventario()" id="btn-cargar-inventario" ${cargandoInventario ? 'disabled' : ''}>
          ${cargandoInventario ? '⏳ Cargando...' : '📥 Cargar más productos'}
        </button>
      </div>
    `;
  }

  list.innerHTML = html + botonCargar;
  updateKPIs();
}

// ================================================================
//  RENDERIZAR CLIENTES (con "Cargar más")
// ================================================================

function renderClients(textFilter = '', tagFilter = 'todos', append = false) {
  const list = document.getElementById('client-list');
  const q = textFilter.toLowerCase();

  if (!append) {
    store.lastClienteDoc = null;
    store.hasMoreClientes = true;
    list.innerHTML = '';
  }

  let data = store.clientes.filter(c => {
    const matchText = !q || (c.nombre && c.nombre.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q));
    const matchTag = tagFilter === 'todos' || c.tag === tagFilter;
    return matchText && matchTag;
  });

  if (!data.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">👥</div><div class="empty-text">No se encontraron clientes</div></div>`;
    updateKPIs();
    return;
  }

  const tagLabel = { vip: 'VIP', regular: 'Regular', nuevo: 'Nuevo' };
  let html = data.map(c => {
    const nombreEscapado = escapeHtml(c.nombre);
    const phoneEscapado = escapeHtml(c.phone);
    const comprasEscapado = escapeHtml(c.compras);
    const tag = escapeHtml(c.tag);
    const tagLabelText = tagLabel[tag] || tag;
    const color = c.color || '#7C3AED';
    const init = c.init || '??';
    const nombreJs = escapeJsString(c.nombre);

    return `
      <div class="client-card">
        <div class="client-avatar" style="background:${color}">${init}</div>
        <div class="client-info">
          <div class="client-name">${nombreEscapado}</div>
          <div class="client-phone">${phoneEscapado}</div>
          <span class="client-tag ${tag}">${tagLabelText}</span>
        </div>
        <div class="client-right">
          <div class="client-spent">${comprasEscapado}</div>
          <div class="client-orders">${c.pedidos} pedidos</div>
        </div>
        <div style="display:flex; gap:4px; align-items:center;">
          <button class="btn-icon edit" onclick="editCliente('${nombreJs}')" title="Editar">✏️</button>
          <button class="btn-icon danger" onclick="confirmDeleteCliente('${nombreJs}')" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  let botonCargar = '';
  if (store.hasMoreClientes) {
    botonCargar = `
      <div style="text-align:center; margin-top:16px;">
        <button class="btn btn-outline" onclick="cargarMasClientes()" id="btn-cargar-clientes" ${cargandoClientes ? 'disabled' : ''}>
          ${cargandoClientes ? '⏳ Cargando...' : '📥 Cargar más clientes'}
        </button>
      </div>
    `;
  }

  list.innerHTML = html + botonCargar;
  updateKPIs();
}

// ================================================================
//  FUNCIONES PARA CARGAR MÁS DATOS
// ================================================================

async function cargarMasVentas() {
  if (cargandoVentas || !store.hasMoreVentas) return;
  cargandoVentas = true;
  const btn = document.getElementById('btn-cargar-ventas');
  if (btn) btn.disabled = true;

  try {
    const empresaId = sessionStorage.getItem('empresaId');
    const data = await store.cargarMasVentas(empresaId, ITEMS_POR_PAGINA);
    if (data.items.length > 0) {
      renderVentas(
        document.getElementById('venta-search')?.value || '',
        filtroVentas || 'todas',
        true
      );
      showToast(`✅ Cargadas ${data.items.length} ventas más`);
    } else {
      store.hasMoreVentas = false;
      showToast('📭 No hay más ventas');
    }
  } catch (error) {
    handleError(error, 'Error cargando más ventas');
  } finally {
    cargandoVentas = false;
    const btn = document.getElementById('btn-cargar-ventas');
    if (btn) btn.disabled = false;
    renderVentas(
      document.getElementById('venta-search')?.value || '',
      filtroVentas || 'todas',
      true
    );
  }
}

async function cargarMasInventario() {
  if (cargandoInventario || !store.hasMoreInventario) return;
  cargandoInventario = true;
  const btn = document.getElementById('btn-cargar-inventario');
  if (btn) btn.disabled = true;

  try {
    const empresaId = sessionStorage.getItem('empresaId');
    const data = await store.cargarMasInventario(empresaId, ITEMS_POR_PAGINA);
    if (data.items.length > 0) {
      renderInv(
        document.getElementById('inv-search')?.value || '',
        filtroInv || 'todos',
        true
      );
      showToast(`✅ Cargados ${data.items.length} productos más`);
    } else {
      store.hasMoreInventario = false;
      showToast('📭 No hay más productos');
    }
  } catch (error) {
    handleError(error, 'Error cargando más productos');
  } finally {
    cargandoInventario = false;
    const btn = document.getElementById('btn-cargar-inventario');
    if (btn) btn.disabled = false;
    renderInv(
      document.getElementById('inv-search')?.value || '',
      filtroInv || 'todos',
      true
    );
  }
}

async function cargarMasClientes() {
  if (cargandoClientes || !store.hasMoreClientes) return;
  cargandoClientes = true;
  const btn = document.getElementById('btn-cargar-clientes');
  if (btn) btn.disabled = true;

  try {
    const empresaId = sessionStorage.getItem('empresaId');
    const data = await store.cargarMasClientes(empresaId, ITEMS_POR_PAGINA);
    if (data.items.length > 0) {
      renderClients(
        document.getElementById('client-search')?.value || '',
        filtroCli || 'todos',
        true
      );
      showToast(`✅ Cargados ${data.items.length} clientes más`);
    } else {
      store.hasMoreClientes = false;
      showToast('📭 No hay más clientes');
    }
  } catch (error) {
    handleError(error, 'Error cargando más clientes');
  } finally {
    cargandoClientes = false;
    const btn = document.getElementById('btn-cargar-clientes');
    if (btn) btn.disabled = false;
    renderClients(
      document.getElementById('client-search')?.value || '',
      filtroCli || 'todos',
      true
    );
  }
}

// ================================================================
//  REPORTES
// ================================================================

async function renderReportes(periodo = 'semana') {
  const empresaId = sessionStorage.getItem('empresaId');
  if (!empresaId) {
    showToast('⚠️ Inicia sesión para ver reportes');
    return;
  }

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
  } else {
    inicio = new Date(ahora.getFullYear(), 0, 1);
    fin = new Date(ahora.getFullYear(), 11, 31, 23,59,59,999);
  }

  const ventasPeriodo = await store.obtenerVentasPorPeriodo(empresaId, inicio, fin);
  const totalIngresos = ventasPeriodo.reduce((sum, v) => sum + parseCurrency(v.total), 0);
  const totalPedidos = ventasPeriodo.length;
  const cancelados = ventasPeriodo.filter(v => v.status === 'cancelado').length;
  const ticketPromedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0;

  const rows = document.querySelectorAll('.stat-row');
  if (rows.length >= 4) {
    rows[0].querySelector('.stat-value').textContent = formatCurrency(totalIngresos);
    rows[1].querySelector('.stat-value').textContent = totalPedidos;
    rows[2].querySelector('.stat-value').textContent = formatCurrency(ticketPromedio);
    rows[3].querySelector('.stat-value').textContent = cancelados;
  }

  const topProductos = await store.obtenerProductosMasVendidos(empresaId, 5);
  const topContainer = document.querySelector('.card .top-product');
  if (topContainer) {
    const parent = topContainer.parentElement;
    parent.innerHTML = `<div class="section-title" style="margin-bottom:12px">Productos más vendidos</div>`;
    if (topProductos.length === 0) {
      parent.innerHTML += '<div class="empty"><div class="empty-text">Sin datos</div></div>';
    } else {
      const maxVentas = topProductos[0]?.cantidad || 1;
      topProductos.forEach((p, i) => {
        const pct = Math.round((p.cantidad / maxVentas) * 100);
        const nombreProducto = escapeHtml(p.nombre);
        parent.innerHTML += `
          <div class="top-product">
            <div class="top-rank">#${i+1}</div>
            <div class="top-name">${nombreProducto}</div>
            <div class="top-bar-wrap"><div class="top-bar" style="width:${pct}%"></div></div>
            <div class="top-val">${formatCurrency(p.total)}</div>
          </div>
        `;
      });
    }
  }
}

// ================================================================
//  KPIS
// ================================================================

function updateKPIs() {
  const hoy = new Date().toLocaleDateString();
  const ventasHoy = ventas.filter(v => {
    if (!v.fecha) return false;
    try {
      const fechaVenta = convertTimestamp(v.fecha);
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

// ================================================================
//  GRÁFICO DE VENTAS
// ================================================================

let chartVentasInstance = null;

function renderChartVentas() {
  const ctx = document.getElementById('chart-ventas');
  if (!ctx) {
    console.log('[Chart] Canvas no encontrado');
    return;
  }

  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() + diffLunes);
  inicioSemana.setHours(0, 0, 0, 0);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);
  finSemana.setHours(23, 59, 59, 999);

  const diasLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const totales = [0, 0, 0, 0, 0, 0, 0];

  const ventasData = window.ventas || [];

  ventasData.forEach(v => {
    if (v.status !== 'pagado') return;
    if (!v.fecha && !v._fechaObj) return;

    try {
      let fechaVenta = null;
      
      if (v._fechaObj && v._fechaObj instanceof Date) {
        fechaVenta = v._fechaObj;
      } else if (v.fecha) {
        if (typeof v.fecha === 'string') {
          if (typeof convertTimestamp === 'function') {
            fechaVenta = convertTimestamp(v.fecha);
          }
          if (!fechaVenta || isNaN(fechaVenta.getTime())) {
            const fechaLimpia = v.fecha.replace(/,/g, '');
            fechaVenta = new Date(fechaLimpia);
          }
          if (!fechaVenta || isNaN(fechaVenta.getTime())) {
            const partes = v.fecha.split(/[\s,/:]+/);
            if (partes.length >= 5) {
              const dia = parseInt(partes[0]);
              const mes = parseInt(partes[1]) - 1;
              const anio = parseInt(partes[2]);
              const hora = parseInt(partes[3]);
              const minuto = parseInt(partes[4]);
              fechaVenta = new Date(anio, mes, dia, hora, minuto);
            }
          }
        } else if (v.fecha.toDate) {
          fechaVenta = v.fecha.toDate();
        } else if (v.fecha instanceof Date) {
          fechaVenta = v.fecha;
        }
      }

      if (!fechaVenta || isNaN(fechaVenta.getTime())) {
        console.warn('[Chart] Fecha inválida para venta:', v.fecha);
        return;
      }

      if (fechaVenta >= inicioSemana && fechaVenta <= finSemana) {
        const ds = fechaVenta.getDay();
        const idx = ds === 0 ? 6 : ds - 1;
        const total = parseCurrency(v.total);
        if (total > 0) {
          totales[idx] += total;
          console.log('[Chart] Sumando venta:', v.total, 'en día', diasLabels[idx]);
        }
      }
    } catch (e) {
      console.warn('[Chart] Error procesando venta:', v, e);
    }
  });

  console.log('[Chart] Totales por día:', totales);
  
  const hayDatos = totales.some(t => t > 0);
  const parent = ctx.parentNode;

  const oldMsg = parent.querySelector('.chart-empty-message');
  if (oldMsg) oldMsg.remove();

  if (!hayDatos) {
    console.log('[Chart] No hay ventas en la semana actual');
    if (window.chartVentasInstance) {
      window.chartVentasInstance.destroy();
      window.chartVentasInstance = null;
    }
    const msg = document.createElement('div');
    msg.className = 'chart-empty-message';
    msg.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:var(--text2); font-size:14px; text-align:center; pointer-events:none;';
    msg.textContent = '📊 Sin ventas esta semana';
    parent.appendChild(msg);
    return;
  }

  const maxVal = Math.max(...totales, 1);
  const stepSize = maxVal <= 10 ? 2 : maxVal <= 50 ? 10 : maxVal <= 100 ? 20 : Math.ceil(maxVal / 5);
  const diaHoy = diaSemana === 0 ? 6 : diaSemana - 1;
  const bgColors = totales.map((_, i) => {
    return i === diaHoy ? '#00338D' : 'rgba(0, 51, 141, 0.25)';
  });

  if (window.chartVentasInstance) {
    window.chartVentasInstance.destroy();
    window.chartVentasInstance = null;
  }

  window.chartVentasInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: diasLabels,
      datasets: [{
        label: 'Ventas',
        data: totales,
        backgroundColor: bgColors,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 24,
        maxBarThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 10, bottom: 0, left: 0, right: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            title: (items) => items[0].label,
            label: (ctx) => 'Ventas: $' + ctx.raw.toFixed(2)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: maxVal * 1.2,
          ticks: {
            stepSize: stepSize,
            callback: (v) => {
              if (v >= 1000) return '$' + (v/1000).toFixed(1) + 'k';
              return '$' + v.toFixed(0);
            },
            font: { size: 11, family: 'Inter' },
            color: '#6B7280',
            padding: 8
          },
          grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
          border: { display: false }
        },
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { font: { size: 12, weight: '600', family: 'Inter' }, color: '#374151', padding: 8 },
          border: { display: false }
        }
      },
      animation: { duration: 700, easing: 'easeOutQuart' }
    }
  });
  console.log('[Chart] Gráfico renderizado con:', totales);
}

// ================================================================
//  EXPOSICIÓN GLOBAL
// ================================================================

window.renderVentas = renderVentas;
window.renderInv = renderInv;
window.renderClients = renderClients;
window.renderReportes = renderReportes;
window.updateKPIs = updateKPIs;
window.renderChartVentas = renderChartVentas;
window.cargarMasVentas = cargarMasVentas;
window.cargarMasInventario = cargarMasInventario;
window.cargarMasClientes = cargarMasClientes;
