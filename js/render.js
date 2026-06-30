// ── FUNCIONES DE RENDERIZADO CON FILTROS ──

function renderVentas(textFilter = '', statusFilter = 'todas') {
  const list = document.getElementById('ventas-list');
  const q = textFilter.toLowerCase();

  // Filtrar por texto y por estado
  let data = ventas.filter(v => {
    const matchText = !q || v.cliente.toLowerCase().includes(q) || v.id.includes(q);
    const matchStatus = statusFilter === 'todas' || v.status === statusFilter;
    return matchText && matchStatus;
  });

  if (!data.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No se encontraron ventas</div></div>`;
    updateKPIs();
    return;
  }

  list.innerHTML = data.map(v => `
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
  updateKPIs();
}

function renderInv(textFilter = '', stockFilter = 'todos') {
  const list = document.getElementById('inv-list');
  const q = textFilter.toLowerCase();

  let data = inventario.filter(p => {
    const matchText = !q || p.nombre.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
    const matchStock = stockFilter === 'todos' || p.estado === stockFilter;
    return matchText && matchStock;
  });

  if (!data.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">No se encontraron productos</div></div>`;
    updateKPIs();
    return;
  }

  list.innerHTML = data.map(p => `
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
  updateKPIs();
}

function renderClients(textFilter = '', tagFilter = 'todos') {
  const list = document.getElementById('client-list');
  const q = textFilter.toLowerCase();

  let data = clientes.filter(c => {
    const matchText = !q || c.nombre.toLowerCase().includes(q) || c.phone.includes(q);
    const matchTag = tagFilter === 'todos' || c.tag === tagFilter;
    return matchText && matchTag;
  });

  if (!data.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">👥</div><div class="empty-text">No se encontraron clientes</div></div>`;
    updateKPIs();
    return;
  }

  const tagLabel = { vip: 'VIP', regular: 'Regular', nuevo: 'Nuevo' };
  list.innerHTML = data.map(c => `
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
  updateKPIs();
}

// ── ACTUALIZAR KPIs ──
function updateKPIs() {
  // Ventas hoy (pagadas y con fecha de hoy)
  const hoy = new Date().toLocaleDateString();
  const ventasHoy = ventas.filter(v => {
    if (v.fecha.includes('Hoy')) return v.status === 'pagado';
    try {
      const fechaVenta = new Date(v.fecha);
      return fechaVenta.toLocaleDateString() === hoy && v.status === 'pagado';
    } catch { return false; }
  });
  const totalHoy = ventasHoy.reduce((sum, v) => sum + parseFloat(v.total.replace('$', '')), 0);
  const kpiVentas = document.querySelector('.kpi-card.blue .kpi-value');
  if (kpiVentas) kpiVentas.textContent = '$' + totalHoy.toFixed(2);

  // Total pedidos
  const totalPedidos = ventas.length;
  const kpiPedidos = document.querySelector('.kpi-card.green .kpi-value');
  if (kpiPedidos) kpiPedidos.textContent = totalPedidos;

  // Stock bajo
  const stockBajo = inventario.filter(p => p.estado === 'low').length;
  const kpiStock = document.querySelector('.kpi-card.amber .kpi-value');
  if (kpiStock) kpiStock.textContent = stockBajo;

  // Total clientes
  const totalClientes = clientes.length;
  const kpiClientes = document.querySelector('.kpi-card.purple .kpi-value');
  if (kpiClientes) kpiClientes.textContent = totalClientes;

  // Actualizar subtítulos
  const pendientes = ventas.filter(v => v.status === 'pendiente').length;
  const subPedidos = document.getElementById('kpi-sub-pedidos');
  if (subPedidos) subPedidos.textContent = pendientes + ' pendientes';

  const nuevosHoy = clientes.filter(c => c.tag === 'nuevo').length;
  const subClientes = document.querySelector('.kpi-card.purple .kpi-sub');
  if (subClientes) subClientes.textContent = nuevosHoy + ' nuevos hoy';
}
