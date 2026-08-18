// ── FUNCIONES DE RENDERIZADO CON FILTROS Y PAGINACIÓN ──

let paginaVentas = 1;
let paginaInv = 1;
let paginaCli = 1;
const ITEMS_POR_PAGINA = 10;

// ================================================================
//  RENDERIZAR VENTAS (con badge de pago y botón confirmar pago)
// ================================================================

function renderVentas(textFilter = '', statusFilter = 'todas', page = 1, append = false) {
  const list = document.getElementById('ventas-list');
  const q = textFilter.toLowerCase();

  // Si no es append, reiniciamos la lista y la paginación
  if (!append) {
    // Limpiar lista y reiniciar estado de paginación (solo para la primera carga)
    // Pero no reiniciamos el store porque ya se cargaron los datos iniciales
    list.innerHTML = '';
    // Resetear contador de página (aunque no se usa para la carga incremental)
    paginaVentas = 1;
  }

  let data = ventas.filter(v => {
    const matchText = !q || (v.cliente && v.cliente.toLowerCase().includes(q)) || (v.id && v.id.includes(q));
    const matchStatus = statusFilter === 'todas' || v.status === statusFilter;
    return matchText && matchStatus;
  });

  // Si no hay datos, mostrar mensaje
  if (data.length === 0 && !append) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No se encontraron ventas</div></div>`;
    updateKPIs();
    return;
  }

  // Si hay datos, renderizar tarjetas
  const html = data.map(v => {
    // ... (código de renderizado de cada tarjeta, igual que antes, con escapes)
    // Usar escapeHtml y escapeJsString como ya lo tenías
  }).join('');

  if (append) {
    list.innerHTML += html;
  } else {
    list.innerHTML = html;
  }

  // Agregar botón "Cargar más" si hay más datos
  const hasMore = store.hasMoreVentas;
  if (hasMore) {
    // Eliminar botón anterior si existe
    const oldBtn = list.querySelector('.btn-cargar-mas');
    if (oldBtn) oldBtn.remove();

    const btn = document.createElement('button');
    btn.className = 'btn btn-outline btn-cargar-mas';
    btn.textContent = '📦 Cargar más ventas';
    btn.style.cssText = 'margin-top:16px; width:100%;';
    btn.onclick = async () => {
      btn.textContent = '⏳ Cargando...';
      btn.disabled = true;
      const empresaId = sessionStorage.getItem('empresaId');
      await store.cargarMasVentas(empresaId, 10);
      // Volver a renderizar con append=true
      renderVentas(textFilter, statusFilter, 1, true);
      btn.textContent = '📦 Cargar más ventas';
      btn.disabled = false;
      // Si ya no hay más, ocultar el botón
      if (!store.hasMoreVentas) {
        btn.remove();
      }
    };
    list.appendChild(btn);
  } else {
    // Si no hay más, eliminar botón si existe
    const oldBtn = list.querySelector('.btn-cargar-mas');
    if (oldBtn) oldBtn.remove();
  }

  updateKPIs();
}

// ================================================================
//  RENDERIZAR INVENTARIO
// ================================================================

function renderInv(textFilter = '', stockFilter = 'todos', page = 1, append = false) {
  const list = document.getElementById('inv-list');
  const q = textFilter.toLowerCase();

  if (!append) {
    list.innerHTML = '';
    paginaInv = 1;
  }

  let data = inventario.filter(p => {
    const matchText = !q || (p.nombre && p.nombre.toLowerCase().includes(q)) || (p.cat && p.cat.toLowerCase().includes(q));
    const matchStock = stockFilter === 'todos' || p.estado === stockFilter;
    return matchText && matchStock;
  });

  if (data.length === 0 && !append) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">No se encontraron productos</div></div>`;
    updateKPIs();
    return;
  }

  const html = data.map(p => {
    // ... (código de renderizado de cada producto, con escapes)
  }).join('');

  if (append) {
    list.innerHTML += html;
  } else {
    list.innerHTML = html;
  }

  const hasMore = store.hasMoreInventario;
  if (hasMore) {
    const oldBtn = list.querySelector('.btn-cargar-mas');
    if (oldBtn) oldBtn.remove();

    const btn = document.createElement('button');
    btn.className = 'btn btn-outline btn-cargar-mas';
    btn.textContent = '📦 Cargar más productos';
    btn.style.cssText = 'margin-top:16px; width:100%;';
    btn.onclick = async () => {
      btn.textContent = '⏳ Cargando...';
      btn.disabled = true;
      const empresaId = sessionStorage.getItem('empresaId');
      await store.cargarMasInventario(empresaId, 10);
      renderInv(textFilter, stockFilter, 1, true);
      btn.textContent = '📦 Cargar más productos';
      btn.disabled = false;
      if (!store.hasMoreInventario) {
        btn.remove();
      }
    };
    list.appendChild(btn);
  } else {
    const oldBtn = list.querySelector('.btn-cargar-mas');
    if (oldBtn) oldBtn.remove();
  }

  updateKPIs();
}

// ================================================================
//  RENDERIZAR CLIENTES
// ================================================================

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
  list.innerHTML = pageData.map(c => {
    const nombreEscapado = escapeHtml(c.nombre);
    const phoneEscapado = escapeHtml(c.phone);
    const comprasEscapado = escapeHtml(c.compras);
    const tag = escapeHtml(c.tag);
    const tagLabelText = tagLabel[tag] || tag;
    const color = c.color || '#7C3AED';
    const init = c.init || '??';

    // Para onclick
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

  agregarPaginacion(list, totalPages, page, 'cli');
  updateKPIs();
}

// ================================================================
//  PAGINACIÓN (BÁSICA)
// ================================================================

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
