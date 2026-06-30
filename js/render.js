// ── FUNCIONES DE RENDERIZADO ──

function renderVentas(filter = '') {
  const list = document.getElementById('ventas-list');
  const q = filter.toLowerCase();
  const data = ventas.filter(v => !q || v.cliente.toLowerCase().includes(q) || v.id.includes(q));
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

function filterVentas() {
  renderVentas(document.getElementById('venta-search').value);
}

function renderInv(filter = '') {
  const list = document.getElementById('inv-list');
  const q = filter.toLowerCase();
  const data = inventario.filter(p => !q || p.nombre.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q));
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

function filterInv() {
  renderInv(document.getElementById('inv-search').value);
}

function renderClients(filter = '') {
  const list = document.getElementById('client-list');
  const q = filter.toLowerCase();
  const data = clientes.filter(c => !q || c.nombre.toLowerCase().includes(q) || c.phone.includes(q));
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

function filterClients() {
  renderClients(document.getElementById('client-search').value);
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
  const totalHoy = ventasHoy.reduce((sum, v) => sum + parseFloat(v.total.replace('$','')), 0);
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

  // Actualizar también los subtítulos (opcional)
  const pendientes = ventas.filter(v => v.status === 'pendiente').length;
  const subPedidos = document.getElementById('kpi-sub-pedidos');
  if (subPedidos) subPedidos.textContent = pendientes + ' pendientes';

  const nuevosHoy = clientes.filter(c => c.tag === 'nuevo').length;
  const subClientes = document.querySelector('.kpi-card.purple .kpi-sub');
  if (subClientes) subClientes.textContent = nuevosHoy + ' nuevos hoy';
}
