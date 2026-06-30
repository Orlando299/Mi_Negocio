// ── NAVEGACIÓN Y LÓGICA PRINCIPAL ──

let currentScreen = 'dashboard';
const screens = ['dashboard','ventas','inventario','clientes','reportes'];

function goScreen(name) {
  screens.forEach(s => {
    document.getElementById('screen-'+s).classList.toggle('active', s===name);
    document.getElementById('nav-'+s).classList.toggle('active', s===name);
  });
  currentScreen = name;
  // FAB context
  const fabLabels = { dashboard:'＋', ventas:'＋', inventario:'＋', clientes:'＋', reportes:'⬇' };
  document.getElementById('fab-btn').textContent = fabLabels[name] || '＋';
  // render lists
  if(name==='ventas') renderVentas();
  if(name==='inventario') renderInv();
  if(name==='clientes') renderClients();
}

// ── FILTROS POR CHIP ──
function filterChip(el, ctx) {
  el.closest('.chips').querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  showToast('Filtro: '+el.textContent);
}

// ── REPORT TABS ──
function switchReportTab(el, period) {
  document.querySelectorAll('.report-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  showToast('Mostrando datos: '+el.textContent);
}

// ── MODAL ──
const modals = {
  ventas: {
    title: 'Nueva venta',
    body: `
      <div class="field"><label>Cliente</label><input type="text" placeholder="Nombre del cliente"></div>
      <div class="field"><label>Producto(s)</label><input type="text" placeholder="Buscar producto..."></div>
      <div class="row">
        <div class="field"><label>Cantidad</label><input type="number" placeholder="1" min="1"></div>
        <div class="field"><label>Precio unit.</label><input type="text" placeholder="$0.00"></div>
      </div>
      <div class="field"><label>Método de pago</label>
        <select><option>Efectivo</option><option>Transferencia</option><option>Pago Móvil</option><option>Divisas</option></select>
      </div>
      <div class="field"><label>Notas</label><textarea placeholder="Observaciones opcionales..."></textarea></div>
      <button class="btn btn-primary" onclick="saveAndClose('Venta registrada ✓')">Registrar venta</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>`
  },
  inventario: {
    title: 'Nuevo producto',
    body: `
      <div class="field"><label>Nombre del producto</label><input type="text" placeholder="Ej: Café Caracas 250g"></div>
      <div class="field"><label>Categoría</label>
        <select><option>Bebidas</option><option>Básicos</option><option>Granos</option><option>Lácteos</option><option>Dulces</option><option>Cocina</option></select>
      </div>
      <div class="row">
        <div class="field"><label>Precio venta</label><input type="text" placeholder="$0.00"></div>
        <div class="field"><label>Precio costo</label><input type="text" placeholder="$0.00"></div>
      </div>
      <div class="row">
        <div class="field"><label>Stock inicial</label><input type="number" placeholder="0" min="0"></div>
        <div class="field"><label>Stock mínimo</label><input type="number" placeholder="5" min="0"></div>
      </div>
      <div class="field"><label>Código / referencia</label><input type="text" placeholder="SKU o código de barras"></div>
      <button class="btn btn-primary" onclick="saveAndClose('Producto agregado ✓')">Agregar producto</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>`
  },
  clientes: {
    title: 'Nuevo cliente',
    body: `
      <div class="row">
        <div class="field"><label>Nombre</label><input type="text" placeholder="Nombre"></div>
        <div class="field"><label>Apellido</label><input type="text" placeholder="Apellido"></div>
      </div>
      <div class="field"><label>Teléfono</label><input type="tel" placeholder="+58 412 000 0000"></div>
      <div class="field"><label>Correo electrónico</label><input type="email" placeholder="correo@ejemplo.com"></div>
      <div class="field"><label>Dirección</label><input type="text" placeholder="Dirección (opcional)"></div>
      <div class="field"><label>Notas</label><textarea placeholder="Preferencias, detalles..."></textarea></div>
      <button class="btn btn-primary" onclick="saveAndClose('Cliente registrado ✓')">Guardar cliente</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>`
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
      <button class="btn btn-primary" onclick="saveAndClose('Reporte generado ✓')">Generar reporte</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>`
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
      <button class="btn btn-outline" onclick="closeModal()">Cerrar</button>`
  }
};

function openModal() {
  const m = modals[currentScreen] || modals.dashboard;
  document.getElementById('modal-title').textContent = m.title;
  document.getElementById('modal-body').innerHTML = m.body;
  document.getElementById('modal').classList.add('open');
}
function closeModal(e) {
  if(!e || e.target===document.getElementById('modal')) document.getElementById('modal').classList.remove('open');
}
function saveAndClose(msg) {
  closeModal();
  setTimeout(()=>showToast(msg), 150);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', ()=>{
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const hoy = new Date();
  document.getElementById('fecha-hoy').textContent = `${dias[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;
  renderVentas();
  renderInv();
  renderClients();
});
