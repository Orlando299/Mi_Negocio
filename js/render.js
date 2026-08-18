// ── FUNCIONES DE RENDERIZADO CON FILTROS Y PAGINACIÓN (Carga bajo demanda) ──

let paginaVentas = 1; // Ya no se usa para la paginación numérica, pero lo mantenemos para posibles filtros
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

  // Si no es append, reiniciamos la lista y la paginación
  if (!append) {
    // Resetear el store para que la próxima carga empiece desde el principio
    store.lastVentaDoc = null;
    store.hasMoreVentas = true;
    // Limpiar la lista actual
    list.innerHTML = '';
    // Reiniciar datos locales (solo si no es append)
    // Nota: store.ventas ya contiene todos los datos cargados hasta ahora.
    // Si aplicamos un filtro, debemos recargar desde el principio.
    // Para simplificar, cuando se aplica un filtro, vaciamos store.ventas y recargamos.
    // Esto lo manejaremos en los eventos de filtro (filterChip, filterVentas)
  }

  // Obtener los datos actuales del store (ya filtrados)
  let data = store.ventas.filter(v => {
    const matchText = !q || (v.cliente && v.cliente.toLowerCase().includes(q)) || (v.id && v.id.includes(q));
    const matchStatus = statusFilter === 'todas' || v.status === statusFilter;
    return matchText && matchStatus;
  });

  // Si es append, tomamos solo los nuevos elementos (los últimos agregados)
  // Pero como store.ventas ya contiene todo, y append es true, debemos mostrar todo lo que hay.
  // En append, simplemente volvemos a renderizar toda la lista actualizada.
  // Para evitar duplicados, usamos un enfoque: si es append, añadimos los nuevos elementos al final.
  // Pero es más sencillo: siempre renderizamos todo el contenido de store.ventas filtrado,
  // y cuando se carga más, store.ventas se ha actualizado con los nuevos datos.
  // Por lo tanto, no necesitamos un modo append estricto; simplemente renderizamos siempre todo el array filtrado.

  // Si no hay datos, mostrar mensaje de vacío
  if (!data.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No se encontraron ventas</div></div>`;
    updateKPIs();
    return;
  }

  // Renderizar todas las ventas (ya que store.ventas contiene todas las cargadas)
  let html = data.map(v => {
    // ... (mismo código de renderizado de tarjeta que ya tienes, con escapeHtml y escapeJsString)
    // Aquí copias el bloque de renderizado de ventas que ya tienes en el Enfoque A.
    // Para no repetir, lo resumiré pero debes mantener el código completo.
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

  // Agregar el botón "Cargar más" si hay más datos
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
//  FUNCIONES PARA CARGAR MÁS DATOS (llamadas desde los botones)
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
      // Actualizar la lista (append = true)
      renderVentas(
        document.getElementById('venta-search')?.value || '',
        filtroVentas || 'todas',
        true // append
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
    // Si no hay más, ocultar el botón (se ocultará en el próximo render)
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

// Exponer las nuevas funciones globalmente
window.cargarMasVentas = cargarMasVentas;
window.cargarMasInventario = cargarMasInventario;
window.cargarMasClientes = cargarMasClientes;

// ================================================================
//  REPORTES, KPIS Y GRÁFICO (sin cambios)
// ================================================================

// (Aquí mantienes las funciones renderReportes, updateKPIs, renderChartVentas exactamente como las tienes)

// ================================================================
//  EXPOSICIÓN GLOBAL
// ================================================================

window.renderVentas = renderVentas;
window.renderInv = renderInv;
window.renderClients = renderClients;
window.renderReportes = renderReportes;
window.updateKPIs = updateKPIs;
window.renderChartVentas = renderChartVentas;
