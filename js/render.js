// ── FUNCIONES DE RENDERIZADO CON FILTROS Y PAGINACIÓN ──

let paginaVentas = 1;
let paginaInv = 1;
let paginaCli = 1;
const ITEMS_POR_PAGINA = 10;

// ================================================================
//  RENDERIZAR VENTAS (con badge de pago y botón confirmar pago)
// ================================================================

function renderVentas(textFilter = '', statusFilter = 'todas', page = 1) {
  const list = document.getElementById('ventas-list');
  const q = textFilter.toLowerCase();

  let data = ventas.filter(v => {
    const matchText = !q || (v.cliente && v.cliente.toLowerCase().includes(q)) || (v.id && v.id.includes(q));
    const matchStatus = statusFilter === 'todas' || v.status === statusFilter;
    return matchText && matchStatus;
  });

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

  list.innerHTML = pageData.map(v => {
    // Verificar si el cliente notificó el pago
    const pagoNotificado = v.clienteNotificoPago === true;
    // Verificar si el pedido está pendiente y el pago fue notificado (para mostrar botón confirmar)
    const mostrarConfirmarPago = v.status === 'pendiente' && pagoNotificado;
    // Verificar si el pedido está pendiente (para mostrar botón despachar)
    const mostrarDespachar = v.status === 'pendiente';

    return `
      <div class="sale-card">
        <div class="sale-header">
          <span class="sale-id">${v.id}</span>
          <span class="sale-status ${v.status}">${v.status.charAt(0).toUpperCase() + v.status.slice(1)}</span>
          ${pagoNotificado ? `<span class="badge" style="background:var(--amber); color:#fff; font-size:10px; padding:2px 8px; border-radius:12px;">💳 Pago notificado</span>` : ''}
          <div>
            ${mostrarConfirmarPago ? `<button class="btn-icon" onclick="confirmarPago('${v.id}')" title="Confirmar pago" style="color:var(--green);">✅</button>` : ''}
            ${mostrarDespachar ? `<button class="btn-icon" onclick="abrirModalDespacho('${v.id}')" title="Despachar pedido" style="color:var(--green);">📦</button>` : ''}
            ${v.status === 'pagado' ? `<button class="btn-icon" onclick="generarFactura('${v.id}')" title="Descargar factura" style="color:var(--primary);">🧾</button>` : ''}
            ${v.status !== 'pendiente' ? `<button class="btn-icon edit" onclick="editVenta('${v.id}')" title="Editar">✏️</button>` : ''}
            ${v.status !== 'pendiente' ? `<button class="btn-icon danger" onclick="confirmDeleteVenta('${v.id}')" title="Eliminar">🗑️</button>` : ''}
          </div>
        </div>
        <div class="sale-client">${v.cliente}</div>
        <div class="sale-meta">${v.fecha}</div>
        <div class="sale-footer">
          <span class="sale-items">${v.items} producto${v.items > 1 ? 's' : ''}</span>
          <span class="sale-total">${v.total}</span>
        </div>
        ${v.notas ? `<div style="font-size:11px; color:var(--text3); margin-top:4px;">📝 ${v.notas}</div>` : ''}
      </div>
    `;
  }).join('');

  agregarPaginacion(list, totalPages, page, 'ventas');
  updateKPIs();
}

function renderInv(textFilter = '', stockFilter = 'todos', page = 1) {
  const list = document.getElementById('inv-list');
  const q = textFilter.toLowerCase();

  let data = inventario.filter(p => {
    const matchText = !q || (p.nombre && p.nombre.toLowerCase().includes(q)) || (p.cat && p.cat.toLowerCase().includes(q));
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
    const matchText = !q || (c.nombre && c.nombre.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q));
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
          fechaVenta = new Date(v.fecha);
          if (isNaN(fechaVenta)) {
            if (typeof convertTimestamp === 'function') {
              fechaVenta = convertTimestamp(v.fecha);
            }
          }
        } else if (v.fecha.toDate) {
          fechaVenta = v.fecha.toDate();
        } else if (v.fecha instanceof Date) {
          fechaVenta = v.fecha;
        }
      }

      if (!fechaVenta || isNaN(fechaVenta.getTime())) return;
      if (fechaVenta >= inicioSemana && fechaVenta <= finSemana) {
        const ds = fechaVenta.getDay();
        const idx = ds === 0 ? 6 : ds - 1;
        const total = parseCurrency(v.total);
        if (total > 0) totales[idx] += total;
      }
    } catch (e) {
      console.warn('[Chart] Error procesando venta:', v, e);
    }
  });

  const hayDatos = totales.some(t => t > 0);
  const parent = ctx.parentNode;

  // Remover mensaje anterior si existe
  const oldMsg = parent.querySelector('.chart-empty-message');
  if (oldMsg) oldMsg.remove();

  if (!hayDatos) {
    console.log('[Chart] No hay ventas en la semana actual, mostrando mensaje');
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

  // Si hay datos, renderizar gráfico
  console.log('[Chart] Renderizando con datos:', totales);
  
  const maxVal = Math.max(...totales, 1);
  const stepSize = maxVal <= 10 ? 2 : maxVal <= 50 ? 10 : maxVal <= 100 ? 20 : Math.ceil(maxVal / 5);
  const diaHoy = diaSemana === 0 ? 6 : diaSemana - 1;
  const bgColors = totales.map((_, i) => {
    return i === diaHoy ? '#00338D' : 'rgba(0, 51, 141, 0.25)';
  });

  // --- CRUCIAL: destruir la instancia anterior ANTES de crear una nueva ---
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
  console.log('[Chart] Gráfico renderizado OK');
}

window.renderVentas = renderVentas;
window.renderInv = renderInv;
window.renderClients = renderClients;
window.renderReportes = renderReportes;
window.updateKPIs = updateKPIs;
window.renderChartVentas = renderChartVentas;
