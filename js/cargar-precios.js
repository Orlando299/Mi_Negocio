// ================================================================
//  MÓDULO: CARGAR PRECIOS (BLOQUE C)
//  Pantalla del franquiciado para importar productos del catálogo
//  maestro y ponerles precio y stock.
// ================================================================

// ── ESTADO DEL MÓDULO ──
let cpEmpresaId = null;
let cpCatalogoMaestro = [];      // Todos los productos de productosPolar
let cpInventarioEmpresa = [];    // Productos ya en empresas/{id}/inventario
let cpCambios = {};              // Cambios pendientes: { codigo: { precio, stock, accion } }
let cpFiltroCategoria = 'todas';
let cpFiltroEstado = 'todos';
let cpBusqueda = '';
let cpCargando = false;

// ────────────────────────────────────────────────────────────────
//  INICIALIZAR
// ────────────────────────────────────────────────────────────────
async function cpIniciar(empresaId) {
  if (!empresaId) {
    showToast('⚠️ No hay empresa activa');
    return;
  }

  if (cpCargando) return;
  cpCargando = true;

  cpEmpresaId = empresaId;
  cpCambios = {};
  cpFiltroCategoria = 'todas';
  cpFiltroEstado = 'todos';
  cpBusqueda = '';

  const listaEl = document.getElementById('cp-lista');
  if (listaEl) {
    listaEl.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">Cargando catálogo...</div></div>';
  }

  try {
    // 1. Cargar catálogo maestro (productosPolar)
    const catSnap = await firebase.firestore().collection('productosPolar').get();
    cpCatalogoMaestro = [];
    catSnap.forEach(doc => {
      cpCatalogoMaestro.push({ codigo: doc.id, ...doc.data() });
    });
    // Ordenar por código
    cpCatalogoMaestro.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));

    // 2. Cargar inventario de la empresa
    const invSnap = await firebase.firestore()
      .collection('empresas').doc(empresaId)
      .collection('inventario').get();
    cpInventarioEmpresa = [];
    invSnap.forEach(doc => {
      const data = doc.data();
      cpInventarioEmpresa.push({
        id: doc.id,
        codigo: data.codigo,
        nombre: data.nombre,
        precio: data.precio,
        stock: data.stock,
        cat: data.cat || data.categoria
      });
    });

    console.log(`✅ Catálogo: ${cpCatalogoMaestro.length} | Inventario: ${cpInventarioEmpresa.length}`);

    cpRenderizar();
    cpActualizarResumen();

  } catch (error) {
    console.error('❌ Error cargando catálogo:', error);
    if (listaEl) {
      listaEl.innerHTML = `<div class="empty"><div class="empty-icon">❌</div><div class="empty-text">Error: ${escapeHtml(error.message)}</div></div>`;
    }
    showToast('❌ Error al cargar el catálogo');
  } finally {
    cpCargando = false;
  }
}

// ────────────────────────────────────────────────────────────────
//  RENDERIZAR
// ────────────────────────────────────────────────────────────────
function cpRenderizar() {
  const listaEl = document.getElementById('cp-lista');
  if (!listaEl) return;

  const productosFiltrados = cpAplicarFiltros();

  if (productosFiltrados.length === 0) {
    listaEl.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No se encontraron productos</div></div>`;
    return;
  }

  // Agrupar por categoría
  const porCategoria = {};
  for (const p of productosFiltrados) {
    const cat = p.categoria || 'Sin categoría';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(p);
  }

  const iconosCategoria = {
    'Cerveza': '🍺',
    'Maltín': '🍻',
    'Sangría': '🍷',
    'Vinos': '🍇'
  };

  let html = '';
  for (const [categoria, productos] of Object.entries(porCategoria)) {
    const icono = iconosCategoria[categoria] || '📦';
    html += `
      <div style="margin:16px 0 8px; padding:8px 12px; background:var(--primary-soft); border-radius:var(--radius); font-weight:700; font-size:14px; color:var(--primary); display:flex; align-items:center; gap:8px;">
        ${icono} ${escapeHtml(categoria)}
        <span style="font-size:12px; font-weight:400; color:var(--text2);">(${productos.length})</span>
      </div>
    `;
    html += productos.map(p => cpRenderFila(p)).join('');
  }

  listaEl.innerHTML = html;

  // Adjuntar listeners para los inputs
  productosFiltrados.forEach(p => {
    const inputPrecio = document.getElementById(`cp-precio-${cpSanitizeId(p.codigo)}`);
    const inputStock = document.getElementById(`cp-stock-${cpSanitizeId(p.codigo)}`);
    if (inputPrecio) {
      inputPrecio.addEventListener('input', (e) => cpOnPrecioChange(p.codigo, e.target.value));
    }
    if (inputStock) {
      inputStock.addEventListener('input', (e) => cpOnStockChange(p.codigo, e.target.value));
    }
  });
}

function cpRenderFila(p) {
  const importado = cpEstaImportado(p.codigo);
  const invItem = cpInventarioEmpresa.find(i => i.codigo === p.codigo);
  
  // Valores: primero busca cambios pendientes, luego inventario, luego vacío
  const cambio = cpCambios[p.codigo];
  let precio = '';
  let stock = '';

  if (cambio) {
    precio = cambio.precio !== undefined ? cambio.precio : (invItem ? parseFloat(invItem.precio) || '' : '');
    stock = cambio.stock !== undefined ? cambio.stock : (invItem ? invItem.stock : '');
  } else if (invItem) {
    precio = parseFloat(invItem.precio) || '';
    stock = invItem.stock || '';
  }

  const activoMaestro = p.activo !== false;
  const iconoEstado = !activoMaestro ? '⛔' : (importado ? '✅' : '➕');
  const colorEstado = !activoMaestro ? 'var(--text3)' : (importado ? 'var(--green)' : 'var(--primary)');

  const idPrecio = `cp-precio-${cpSanitizeId(p.codigo)}`;
  const idStock = `cp-stock-${cpSanitizeId(p.codigo)}`;

  return `
    <div class="inv-card" style="padding:12px; margin-bottom:8px; ${!activoMaestro ? 'opacity:0.5;' : ''}">
      <div style="display:flex; align-items:center; gap:6px; min-width:24px; font-size:18px;" title="${importado ? 'Importado' : 'Sin importar'}">
        ${iconoEstado}
      </div>
      <div class="inv-info" style="flex:1; min-width:0;">
        <div class="inv-name" style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(p.nombre)}">
          ${escapeHtml(p.nombre)}
        </div>
        <div class="inv-cat" style="font-size:11px; color:var(--text3);">
          <span style="font-family:'JetBrains Mono',monospace; color:${colorEstado};">${escapeHtml(p.codigo)}</span>
          · ${escapeHtml(p.presentacion || '')}
        </div>
      </div>
      <div style="display:flex; gap:4px; align-items:center;">
        <div style="display:flex; flex-direction:column; align-items:center;">
          <label style="font-size:9px; color:var(--text3); font-weight:600;">PRECIO</label>
          <input type="number" id="${idPrecio}" value="${precio}" placeholder="0.00" step="0.01" min="0"
                 style="width:60px; padding:4px 6px; border:1.5px solid var(--border); border-radius:6px; font-size:12px; text-align:right; background:var(--surface); color:var(--text); font-family:'JetBrains Mono',monospace;">
        </div>
        <div style="display:flex; flex-direction:column; align-items:center;">
          <label style="font-size:9px; color:var(--text3); font-weight:600;">STOCK</label>
          <input type="number" id="${idStock}" value="${stock}" placeholder="0" step="1" min="0"
                 style="width:55px; padding:4px 6px; border:1.5px solid var(--border); border-radius:6px; font-size:12px; text-align:right; background:var(--surface); color:var(--text); font-family:'JetBrains Mono',monospace;">
        </div>
        ${importado ? `
          <button class="btn-icon danger" title="Quitar del inventario" onclick="cpQuitarProducto('${escapeJsString(p.codigo)}')" style="font-size:14px;">🗑️</button>
        ` : '<div style="width:24px;"></div>'}
      </div>
    </div>
  `;
}

// ────────────────────────────────────────────────────────────────
//  FILTROS
// ────────────────────────────────────────────────────────────────
function cpAplicarFiltros() {
  const q = (cpBusqueda || '').toLowerCase().trim();
  return cpCatalogoMaestro.filter(p => {
    // Búsqueda
    if (q) {
      const matchQ = 
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.presentacion || '').toLowerCase().includes(q);
      if (!matchQ) return false;
    }

    // Filtro categoría rápida
    if (cpFiltroCategoria === 'cervezas') {
      if (p.categoria !== 'Cerveza') return false;
    }

    // Filtro estado
    if (cpFiltroEstado === 'importados') {
      if (!cpEstaImportado(p.codigo)) return false;
    } else if (cpFiltroEstado === 'no-importados') {
      if (cpEstaImportado(p.codigo)) return false;
    }

    return true;
  });
}

function cpFiltrar() {
  cpBusqueda = document.getElementById('cp-search')?.value || '';
  cpRenderizar();
}

function cpCambiarFiltroCategoria(filtro, el) {
  cpFiltroCategoria = filtro;
  // Actualizar chips
  document.querySelectorAll('[data-cp-filter]').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  cpRenderizar();
}

function cpCambiarFiltroEstado(filtro, el) {
  cpFiltroEstado = filtro === 'importados' ? 'importados' : (filtro === 'no-importados' ? 'no-importados' : 'todos');
  // Quitar active de los otros chips de estado
  document.querySelectorAll('[data-cp-filter="importados"], [data-cp-filter="no-importados"]').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('[data-cp-filter="todas"], [data-cp-filter="cervezas"]').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  cpRenderizar();
}

// ────────────────────────────────────────────────────────────────
//  EVENTOS DE INPUTS
// ────────────────────────────────────────────────────────────────
function cpOnPrecioChange(codigo, valor) {
  const num = parseFloat(valor);
  cpCambios[codigo] = cpCambios[codigo] || {};
  cpCambios[codigo].precio = isNaN(num) ? null : num;
  cpActualizarResumen();
}

function cpOnStockChange(codigo, valor) {
  const num = parseInt(valor);
  cpCambios[codigo] = cpCambios[codigo] || {};
  cpCambios[codigo].stock = isNaN(num) ? null : num;
  cpActualizarResumen();
}

// ────────────────────────────────────────────────────────────────
//  QUITAR PRODUCTO
// ────────────────────────────────────────────────────────────────
async function cpQuitarProducto(codigo) {
  const invItem = cpInventarioEmpresa.find(i => i.codigo === codigo);
  if (!invItem) {
    showToast('⚠️ Producto no encontrado en inventario');
    return;
  }

  if (!confirm(`¿Quitar "${invItem.nombre}" de tu inventario?\n\nLos cambios no se guardan hasta que presiones "Guardar cambios".`)) {
    return;
  }

  // Marcar para eliminar (no eliminar de Firestore todavía)
  cpCambios[codigo] = cpCambios[codigo] || {};
  cpCambios[codigo].accion = 'eliminar';

  // Quitar visualmente
  cpInventarioEmpresa = cpInventarioEmpresa.filter(i => i.codigo !== codigo);
  cpRenderizar();
  cpActualizarResumen();
  showToast(`🗑️ ${invItem.nombre} se quitará al guardar`);
}

// ────────────────────────────────────────────────────────────────
//  GUARDAR CAMBIOS
// ────────────────────────────────────────────────────────────────
async function cpGuardarCambios() {
  const cambiosValidos = {};
  let totalAImportar = 0;
  let totalAActualizar = 0;
  let totalAEliminar = 0;

  for (const [codigo, cambio] of Object.entries(cpCambios)) {
    // Validar
    const tienePrecio = cambio.precio !== undefined && cambio.precio !== null && cambio.precio > 0;
    const tieneStock = cambio.stock !== undefined && cambio.stock !== null && cambio.stock >= 0;
    const esEliminar = cambio.accion === 'eliminar';

    if (esEliminar) {
      cambiosValidos[codigo] = cambio;
      totalAEliminar++;
      continue;
    }

    if (!tienePrecio) continue; // Sin precio, no se importa

    cambiosValidos[codigo] = cambio;
    if (cpEstaImportado(codigo)) {
      totalAActualizar++;
    } else {
      totalAImportar++;
    }
  }

  if (Object.keys(cambiosValidos).length === 0) {
    showToast('⚠️ No hay cambios para guardar');
    return;
  }

  const mensaje = `💾 GUARDAR CAMBIOS\n\n` +
    `• ${totalAImportar} productos a importar\n` +
    `• ${totalAActualizar} productos a actualizar\n` +
    `• ${totalAEliminar} productos a quitar\n\n` +
    `¿Confirmar?`;

  if (!confirm(mensaje)) return;

  showToast('⏳ Guardando cambios...');

  try {
    const batch = firebase.firestore().batch();
    const inventarioRef = firebase.firestore()
      .collection('empresas').doc(cpEmpresaId)
      .collection('inventario');

    let operaciones = 0;

    for (const [codigo, cambio] of Object.entries(cambiosValidos)) {
      const prodMaestro = cpCatalogoMaestro.find(p => p.codigo === codigo);
      if (!prodMaestro) continue;

      const invItem = cpInventarioEmpresa.find(i => i.codigo === codigo);

      // CASO 1: Eliminar
      if (cambio.accion === 'eliminar') {
        // Buscar el doc en Firestore
        const invOriginal = cpInventarioEmpresa.find(i => i.codigo === codigo);
        if (invOriginal && invOriginal.id) {
          batch.delete(inventarioRef.doc(invOriginal.id));
          operaciones++;
        }
        continue;
      }

      // CASO 2: Importar o actualizar
      const precio = cambio.precio || 0;
      const stock = cambio.stock !== undefined && cambio.stock !== null ? cambio.stock : 0;
      const catFinal = prodMaestro.categoria || 'Otros';
      const estadoStock = stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok';

      const datos = {
        nombre: `${prodMaestro.nombre} ${prodMaestro.presentacion}`.trim(),
        codigo: codigo,
        cat: catFinal,
        categoria: catFinal,
        marca: prodMaestro.marca || '',
        presentacion: prodMaestro.presentacion || '',
        icono: prodMaestro.icono || '📦',
        stock: stock,
        estado: estadoStock,
        precio: formatCurrency(precio),
        fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (invItem && invItem.id) {
        // Actualizar
        batch.update(inventarioRef.doc(invItem.id), datos);
      } else {
        // Crear nuevo
        const nuevoDoc = inventarioRef.doc();
        datos.fecha = firebase.firestore.FieldValue.serverTimestamp();
        batch.set(nuevoDoc, datos);
      }
      operaciones++;

      // Firestore batch tiene límite de 500 operaciones
      if (operaciones >= 490) {
        await batch.commit();
        batch = firebase.firestore().batch();
        operaciones = 0;
      }
    }

    if (operaciones > 0) {
      await batch.commit();
    }

    showToast(`✅ Cambios guardados: ${totalAImportar} importados, ${totalAActualizar} actualizados, ${totalAEliminar} eliminados`);

    // Recargar
    cpCambios = {};
    await cpIniciar(cpEmpresaId);

    // Refrescar el inventario general si está cargado
    if (typeof store !== 'undefined' && store.cargarDatosEmpresa) {
      try {
        await store.cargarDatosEmpresa(cpEmpresaId);
        syncGlobals();
      } catch (e) {
        console.warn('Error refrescando store:', e);
      }
    }

  } catch (error) {
    console.error('❌ Error guardando cambios:', error);
    showToast('❌ Error al guardar: ' + error.message);
  }
}

// ────────────────────────────────────────────────────────────────
//  DESCARTAR CAMBIOS
// ────────────────────────────────────────────────────────────────
function cpDescartarCambios() {
  if (Object.keys(cpCambios).length === 0) {
    showToast('ℹ️ No hay cambios pendientes');
    return;
  }
  if (!confirm('¿Descartar todos los cambios sin guardar?')) return;
  cpCambios = {};
  cpIniciar(cpEmpresaId);
  showToast('↩️ Cambios descartados');
}

// ────────────────────────────────────────────────────────────────
//  UTILIDADES
// ────────────────────────────────────────────────────────────────
function cpEstaImportado(codigo) {
  return cpInventarioEmpresa.some(i => i.codigo === codigo);
}

function cpHayCambiosPendientes() {
  return Object.keys(cpCambios).length > 0;
}

function cpActualizarResumen() {
  const el = document.getElementById('cp-resumen');
  if (!el) return;

  const total = cpCatalogoMaestro.length;
  const importados = cpInventarioEmpresa.length;
  const noImportados = total - importados;
  const cambiosPendientes = Object.keys(cpCambios).length;

  el.innerHTML = `
    📊 ${total} productos en el catálogo · 
    <span style="color:var(--green); font-weight:600;">${importados} importados</span> · 
    <span style="color:var(--text3);">${noImportados} sin importar</span>
    ${cambiosPendientes > 0 ? ` · <span style="color:var(--amber); font-weight:600;">${cambiosPendientes} cambios pendientes</span>` : ''}
  `;
}

function cpSanitizeId(str) {
  return String(str).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ────────────────────────────────────────────────────────────────
//  EXPOSICIÓN GLOBAL
// ────────────────────────────────────────────────────────────────
window.cpIniciar = cpIniciar;
window.cpFiltrar = cpFiltrar;
window.cpCambiarFiltroCategoria = cpCambiarFiltroCategoria;
window.cpCambiarFiltroEstado = cpCambiarFiltroEstado;
window.cpQuitarProducto = cpQuitarProducto;
window.cpGuardarCambios = cpGuardarCambios;
window.cpDescartarCambios = cpDescartarCambios;
window.cpHayCambiosPendientes = cpHayCambiosPendientes;

console.log('✅ Módulo Cargar Precios cargado');
