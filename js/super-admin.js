// ================================================================
//  SUPER ADMIN - LÓGICA DEL PANEL
//  Acceso exclusivo para el desarrollador
// ================================================================

// ⚠️ CONFIGURACIÓN DEL SUPER ADMIN
const SA_UID = 'lA1Y2nHLlYWFtb6xQ32ZlH1ddb82';
const SA_EMAIL = 'osilva2503@gmail.com';
const SA_2FA_CODE = '987654';  // Código secreto - cámbialo por el que quieras

// Variables globales del panel
let saEmpresas = [];
let saUsuarios = [];
let saVentas = [];
let saCharts = {};
let saConfig = {
  precioDueno: 20,
  precioEmpleado: 10,
  limiteAgente: 20,
  nombreAgente: 'PolarBot',
  modoMantenimiento: false,
  mensajeGlobal: ''
};

// ================================================================
//  INDICADOR DE CARGA
// ================================================================

function saShowLoader(mensaje = 'Cargando...') {
  const content = document.getElementById('sa-content');
  if (content) {
    content.innerHTML = `
      <div class="sa-loader">
        <div class="sa-loader-spinner"></div>
        <div class="sa-loader-text">${saEscape(mensaje)}</div>
      </div>
    `;
  }
}

// ================================================================
//  UTILIDADES
// ================================================================

function saToast(msg, type = 'info') {
  const t = document.getElementById('sa-toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'sa-toast show ' + type;
  clearTimeout(window._saToastTimer);
  window._saToastTimer = setTimeout(() => {
    t.className = 'sa-toast ' + type;
  }, 2500);
}

function saEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function saFormatCurrency(v) {
  return '$' + Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function saFormatDate(d) {
  if (!d) return '—';
  try {
    const date = d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '—';
  }
}

function saOpenModal(title, bodyHtml) {
  document.getElementById('sa-modal-title').textContent = title;
  document.getElementById('sa-modal-body').innerHTML = bodyHtml;
  document.getElementById('sa-modal').style.display = 'flex';
}

function saCloseModal() {
  document.getElementById('sa-modal').style.display = 'none';
}

function saToggleSidebar() {
  document.getElementById('sa-sidebar').classList.toggle('open');
}

function saLoadSection(section, event) {
  if (event) event.preventDefault();

  // Actualizar navegación
  document.querySelectorAll('.sa-nav-item').forEach(a => a.classList.remove('active'));
  const navItem = document.querySelector(`.sa-nav-item[data-section="${section}"]`);
  if (navItem) navItem.classList.add('active');

  // Cerrar sidebar en móvil
  document.getElementById('sa-sidebar').classList.remove('open');

  // Renderizar sección
  switch (section) {
    case 'dashboard':      saRenderDashboard(); break;
    case 'empresas':       saRenderEmpresas(); break;
    case 'facturacion':    saRenderFacturacion(); break;
    case 'usuarios':       saRenderUsuarios(); break;
    case 'estadisticas':   saRenderEstadisticas(); break;
    case 'catalogo':       saRenderCatalogo(); break;
    case 'configuracion':  saRenderConfiguracion(); break;
    case 'comunicacion':   saRenderComunicacion(); break;
    case 'auditoria':      saRenderAuditoria(); break;
    default:               saRenderDashboard();
  }
}

// ================================================================
//  AUTENTICACIÓN
// ================================================================

async function saLogin() {
  const email = document.getElementById('sa-email').value.trim();
  const password = document.getElementById('sa-password').value;
  const errorEl = document.getElementById('sa-login-error');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = '❌ Completa todos los campos';
    return;
  }

  // Validar email antes de intentar login
  if (email !== SA_EMAIL) {
    errorEl.textContent = '❌ Acceso denegado';
    return;
  }

  try {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    // Validar UID
    if (uid !== SA_UID) {
      await firebase.auth().signOut();
      errorEl.textContent = '❌ Acceso denegado (UID no autorizado)';
      return;
    }

    // Validar en Firestore
    const saDoc = await firebase.firestore().collection('superAdmins').doc(uid).get();
    if (!saDoc.exists || saDoc.data().activo !== true) {
      await firebase.auth().signOut();
      errorEl.textContent = '❌ No estás registrado como Super Admin';
      return;
    }

    // Mostrar paso 2FA
    document.getElementById('sa-login-step-1').style.display = 'none';
    document.getElementById('sa-login-step-2').style.display = 'block';
    document.getElementById('sa-2fa-code').focus();

  } catch (error) {
    console.error('Error login:', error);
    if (error.code === 'auth/wrong-password') {
      errorEl.textContent = '❌ Contraseña incorrecta';
    } else if (error.code === 'auth/user-not-found') {
      errorEl.textContent = '❌ Usuario no encontrado';
    } else {
      errorEl.textContent = '❌ ' + error.message;
    }
  }
}

async function saVerificarCodigo() {
  const codigo = document.getElementById('sa-2fa-code').value.trim();
  const errorEl = document.getElementById('sa-2fa-error');
  errorEl.textContent = '';

  if (codigo !== SA_2FA_CODE) {
    errorEl.textContent = '❌ Código incorrecto';
    return;
  }

  // Guardar sesión
  sessionStorage.setItem('sa_authenticated', 'true');
  sessionStorage.setItem('sa_email', SA_EMAIL);

  // Mostrar panel
  document.getElementById('sa-login-screen').style.display = 'none';
  document.getElementById('sa-app').style.display = 'block';
  document.getElementById('sa-user-email').textContent = SA_EMAIL;

  saToast('✅ Bienvenido, Super Admin', 'success');
  
  // Cargar datos iniciales y dashboard
  await saCargarDatosGlobales();
  saRenderDashboard();
}

function saVolverLogin() {
  document.getElementById('sa-login-step-1').style.display = 'block';
  document.getElementById('sa-login-step-2').style.display = 'none';
  document.getElementById('sa-2fa-code').value = '';
  document.getElementById('sa-2fa-error').textContent = '';
}

async function saLogout() {
  if (!confirm('¿Cerrar sesión de Super Admin?')) return;
  try {
    await firebase.auth().signOut();
  } catch (e) {}
  sessionStorage.removeItem('sa_authenticated');
  sessionStorage.removeItem('sa_email');
  window.location.reload();
}

// ================================================================
//  CARGA DE DATOS GLOBALES
// ================================================================

async function saCargarDatosGlobales() {
  try {
    // Cargar todas las empresas
    const empresasSnap = await firebase.firestore().collection('empresas').get();
    saEmpresas = [];
    empresasSnap.forEach(doc => {
      saEmpresas.push({ id: doc.id, ...doc.data() });
    });
    console.log(`✅ Empresas cargadas: ${saEmpresas.length}`);

    // Cargar todos los perfiles de usuario
    const usuariosSnap = await firebase.firestore().collection('userProfiles').get();
    saUsuarios = [];
    usuariosSnap.forEach(doc => {
      saUsuarios.push({ id: doc.id, ...doc.data() });
    });
    console.log(`✅ Usuarios cargados: ${saUsuarios.length}`);

    // Cargar todas las ventas (agregando por empresa)
    saVentas = [];
    for (const empresa of saEmpresas) {
      try {
        const ventasSnap = await firebase.firestore()
          .collection('empresas').doc(empresa.id)
          .collection('ventas').get();
        ventasSnap.forEach(doc => {
          saVentas.push({ id: doc.id, empresaId: empresa.id, ...doc.data() });
        });
      } catch (e) {
        console.warn(`Error cargando ventas de ${empresa.nombre}:`, e);
      }
    }
    console.log(`✅ Ventas cargadas: ${saVentas.length}`);

    // Cargar configuración global si existe
    try {
      const configDoc = await firebase.firestore().collection('superAdminConfig').doc('global').get();
      if (configDoc.exists) {
        saConfig = { ...saConfig, ...configDoc.data() };
      }
    } catch (e) {
      console.warn('No hay configuración global aún');
    }

  } catch (error) {
    console.error('Error cargando datos globales:', error);
    saToast('Error al cargar datos: ' + error.message, 'error');
  }
}

// ================================================================
//  SECCIÓN: DASHBOARD
// ================================================================

async function saRenderDashboard() {
  // Calcular métricas
  saShowLoader('Cargando dashboard...');
  const totalEmpresas = saEmpresas.length;
  const empresasActivas = saEmpresas.filter(e => e.plan !== 'suspendida').length;
  const empresasSuspendidas = totalEmpresas - empresasActivas;

  const totalAdmins = saUsuarios.filter(u => u.rol === 'admin' && u.esPropietario).length;
  const totalEmpleados = saUsuarios.filter(u => u.rol === 'admin' && !u.esPropietario).length;
  const totalClientes = saUsuarios.filter(u => u.rol === 'cliente').length;
  const totalUsuarios = saUsuarios.length;

  // Ingresos estimados
  const ingresosEstimados = (totalAdmins * saConfig.precioDueno) + (totalEmpleados * saConfig.precioEmpleado);

  // Uso del agente IA (sumar todos los contadores)
  let totalConsultasIA = 0;
  saEmpresas.forEach(e => {
    if (e.agentUsage && e.agentUsage.contador) {
      totalConsultasIA += e.agentUsage.contador;
    }
  });

  // Total ventas plataforma
  const totalVentasMonto = saVentas.reduce((sum, v) => {
    const monto = parseFloat(String(v.total || '0').replace(/[$,]/g, '')) || 0;
    return sum + monto;
  }, 0);

  const html = `
    <div class="sa-section-header">
      <div>
        <h2 class="sa-section-title">📊 Dashboard Global</h2>
        <p class="sa-section-subtitle">Vista general de toda la plataforma MiNegocio Polar</p>
      </div>
      <button class="sa-btn sa-btn-outline sa-btn-sm" onclick="saRefrescarDashboard()">🔄 Recargar</button>
    </div>

    <div class="sa-metrics-grid">
      <div class="sa-metric-card">
        <div class="sa-metric-label">Ingresos Estimados / Mes</div>
        <div class="sa-metric-value green">${saFormatCurrency(ingresosEstimados)}</div>
        <div class="sa-metric-sub">${totalAdmins} dueños × $${saConfig.precioDueno} + ${totalEmpleados} empleados × $${saConfig.precioEmpleado}</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Empresas Registradas</div>
        <div class="sa-metric-value blue">${totalEmpresas}</div>
        <div class="sa-metric-sub">${empresasActivas} activas · ${empresasSuspendidas} suspendidas</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Usuarios Totales</div>
        <div class="sa-metric-value purple">${totalUsuarios}</div>
        <div class="sa-metric-sub">${totalAdmins} dueños · ${totalEmpleados} empleados · ${totalClientes} clientes</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Consultas IA Totales</div>
        <div class="sa-metric-value amber">${totalConsultasIA.toLocaleString()}</div>
        <div class="sa-metric-sub">Costo DeepSeek aprox.: ~$${(totalConsultasIA * 0.0005).toFixed(2)}</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Ventas Plataforma</div>
        <div class="sa-metric-value blue">${saFormatCurrency(totalVentasMonto)}</div>
        <div class="sa-metric-sub">${saVentas.length} transacciones totales</div>
      </div>
    </div>

    <div class="sa-chart-card">
      <div class="sa-chart-title">📈 Crecimiento de Empresas (últimos 6 meses)</div>
      <div class="sa-chart-container">
        <canvas id="sa-chart-empresas"></canvas>
      </div>
    </div>

    <div class="sa-chart-card">
      <div class="sa-chart-title">🏢 Top 5 Empresas por Ventas</div>
      <div class="sa-chart-container">
        <canvas id="sa-chart-top-empresas"></canvas>
      </div>
    </div>

    <div class="sa-section-header" style="margin-top:24px;">
      <h3 class="sa-section-title" style="font-size:16px;">🆕 Últimas Empresas Registradas</h3>
    </div>
    <div class="sa-table-wrap">
      <table class="sa-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Dueño</th>
            <th>Código</th>
            <th>Fecha</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody id="sa-ultimas-empresas"></tbody>
      </table>
    </div>
  `;

  document.getElementById('sa-content').innerHTML = html;

  // Cargar últimas empresas
  const ultimas = [...saEmpresas]
    .sort((a, b) => {
      const fa = a.fechaCreacion?.toDate?.() || new Date(0);
      const fb = b.fechaCreacion?.toDate?.() || new Date(0);
      return fb - fa;
    })
    .slice(0, 5);

  const tbody = document.getElementById('sa-ultimas-empresas');
  if (tbody) {
    if (ultimas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="sa-table-empty">No hay empresas registradas</td></tr>';
    } else {
      tbody.innerHTML = ultimas.map(e => `
        <tr>
          <td><strong>${saEscape(e.nombre || 'Sin nombre')}</strong></td>
          <td>${saEscape(e.creadoPor || '—')}</td>
          <td><code style="font-family:'JetBrains Mono',monospace;color:#60A5FA;">${saEscape(e.codigoAcceso || '—')}</code></td>
          <td>${saFormatDate(e.fechaCreacion)}</td>
          <td><span class="sa-badge sa-badge-activa">Activa</span></td>
        </tr>
      `).join('');
    }
  }

  // Renderizar gráficos
  saRenderChartEmpresas();
  saRenderChartTopEmpresas();
}

async function saRefrescarDashboard() {
  saToast('🔄 Recargando datos...');
  await saCargarDatosGlobales();
  saRenderDashboard();
  saToast('✅ Datos actualizados', 'success');
}

function saRenderChartEmpresas() {
  const ctx = document.getElementById('sa-chart-empresas');
  if (!ctx) return;
  if (saCharts.empresas) saCharts.empresas.destroy();

  // Calcular empresas por mes (últimos 6 meses)
  const meses = [];
  const conteos = [];
  const hoy = new Date();

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const nombreMes = fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    meses.push(nombreMes);

    const count = saEmpresas.filter(e => {
      const f = e.fechaCreacion?.toDate?.();
      if (!f) return false;
      return f.getFullYear() === fecha.getFullYear() && f.getMonth() === fecha.getMonth();
    }).length;
    conteos.push(count);
  }

  // Verificar si hay datos
  const hayDatos = conteos.some(c => c > 0);

  if (!hayDatos) {
    // Mostrar mensaje de "sin datos"
    const parent = ctx.parentNode;
    if (parent) {
      const oldEmpty = parent.querySelector('.sa-chart-empty');
      if (oldEmpty) oldEmpty.remove();
      ctx.style.display = 'none';
      const empty = document.createElement('div');
      empty.className = 'sa-chart-empty';
      empty.innerHTML = `
        <div class="sa-empty-icon">📊</div>
        <div>Sin empresas registradas<br>en los últimos 6 meses</div>
      `;
      parent.appendChild(empty);
    }
    return;
  }

  // Ocultar mensaje vacío si existe
  const parent = ctx.parentNode;
  const emptyEl = parent.querySelector('.sa-chart-empty');
  if (emptyEl) emptyEl.remove();
  ctx.style.display = 'block';

  saCharts.empresas = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [{
        label: 'Empresas nuevas',
        data: conteos,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#3B82F6',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0F172A',
          titleColor: '#F1F5F9',
          bodyColor: '#CBD5E1',
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748B', font: { size: 10 } },
          grid: { color: 'rgba(51, 65, 85, 0.3)' }
        },
        y: {
          ticks: {
            color: '#64748B',
            font: { size: 10 },
            stepSize: 1
          },
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          beginAtZero: true
        }
      }
    }
  });
}

function saRenderChartTopEmpresas() {
  const ctx = document.getElementById('sa-chart-top-empresas');
  if (!ctx) return;
  if (saCharts.topEmpresas) saCharts.topEmpresas.destroy();

  // Calcular ventas por empresa
  const ventasPorEmpresa = {};
  saVentas.forEach(v => {
    if (!ventasPorEmpresa[v.empresaId]) ventasPorEmpresa[v.empresaId] = 0;
    const monto = parseFloat(String(v.total || '0').replace(/[$,]/g, '')) || 0;
    ventasPorEmpresa[v.empresaId] += monto;
  });

  const top = Object.entries(ventasPorEmpresa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Verificar si hay datos
  if (top.length === 0) {
    const parent = ctx.parentNode;
    if (parent) {
      const oldEmpty = parent.querySelector('.sa-chart-empty');
      if (oldEmpty) oldEmpty.remove();
      ctx.style.display = 'none';
      const empty = document.createElement('div');
      empty.className = 'sa-chart-empty';
      empty.innerHTML = `
        <div class="sa-empty-icon">🛒</div>
        <div>Sin ventas registradas<br>en la plataforma aún</div>
      `;
      parent.appendChild(empty);
    }
    return;
  }

  // Ocultar mensaje vacío si existe
  const parent = ctx.parentNode;
  const emptyEl = parent.querySelector('.sa-chart-empty');
  if (emptyEl) emptyEl.remove();
  ctx.style.display = 'block';

  const labels = top.map(([empresaId]) => {
    const e = saEmpresas.find(x => x.id === empresaId);
    const nombre = e ? e.nombre : empresaId.slice(0, 8);
    return nombre.length > 15 ? nombre.slice(0, 15) + '...' : nombre;
  });
  const data = top.map(([, monto]) => monto);

  saCharts.topEmpresas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventas ($)',
        data: data,
        backgroundColor: '#10B981',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0F172A',
          titleColor: '#F1F5F9',
          bodyColor: '#CBD5E1',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => '$' + Number(ctx.raw).toFixed(2)
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#64748B',
            font: { size: 10 },
            callback: (v) => v >= 1000 ? '$' + (v/1000).toFixed(1) + 'k' : '$' + v
          },
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          beginAtZero: true
        },
        y: {
          ticks: { color: '#94A3B8', font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

// ================================================================
//  SECCIÓN: EMPRESAS
// ================================================================

async function saRenderEmpresas() {
  const html = `
    <div class="sa-section-header">
      <div>
        <h2 class="sa-section-title">🏢 Gestión de Empresas</h2>
        <p class="sa-section-subtitle">Administra todas las franquicias registradas</p>
      </div>
      <button class="sa-btn sa-btn-outline sa-btn-sm" onclick="saCargarDatosGlobales().then(saRenderEmpresas)">🔄 Recargar</button>
    </div>

    <div class="sa-filters">
      <input type="text" id="sa-emp-search" placeholder="🔍 Buscar por nombre, código o dueño..." oninput="saFiltrarEmpresas()" style="flex:1;min-width:200px;">
      <select id="sa-emp-filter" onchange="saFiltrarEmpresas()">
        <option value="todas">Todas</option>
        <option value="activas">Activas</option>
        <option value="suspendidas">Suspendidas</option>
      </select>
    </div>

    <div class="sa-table-wrap">
      <table class="sa-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Dueño</th>
            <th>Código</th>
            <th>Plan</th>
            <th>Usuarios</th>
            <th>Ventas</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="sa-tabla-empresas"></tbody>
      </table>
    </div>
  `;
  document.getElementById('sa-content').innerHTML = html;
  saFiltrarEmpresas();
}

function saFiltrarEmpresas() {
  const search = (document.getElementById('sa-emp-search')?.value || '').toLowerCase();
  const filter = document.getElementById('sa-emp-filter')?.value || 'todas';

  let filtered = saEmpresas.filter(e => {
    const matchSearch = !search || 
      (e.nombre || '').toLowerCase().includes(search) ||
      (e.codigoAcceso || '').toLowerCase().includes(search) ||
      (e.creadoPor || '').toLowerCase().includes(search);
    return matchSearch;
  });

  const tbody = document.getElementById('sa-tabla-empresas');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="sa-table-empty">No se encontraron empresas</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    // Contar usuarios y ventas de esta empresa
    const usuariosEmp = saUsuarios.filter(u => u.empresaId === e.id);
    const ventasEmp = saVentas.filter(v => v.empresaId === e.id);
    const totalVentas = ventasEmp.reduce((sum, v) => {
      const monto = parseFloat(String(v.total || '0').replace(/[$,]/g, '')) || 0;
      return sum + monto;
    }, 0);

    return `
      <tr>
        <td><strong>${saEscape(e.nombre || 'Sin nombre')}</strong></td>
        <td style="font-size:11px;color:#94A3B8;">${saEscape(e.creadoPor || '—')}</td>
        <td><code style="font-family:'JetBrains Mono',monospace;color:#60A5FA;">${saEscape(e.codigoAcceso || '—')}</code></td>
        <td>${saEscape(e.plan || 'basico')}</td>
        <td>${usuariosEmp.length}</td>
        <td>${saFormatCurrency(totalVentas)}</td>
        <td><span class="sa-badge sa-badge-activa">Activa</span></td>
        <td>
          <div class="sa-actions">
            <button class="sa-action-btn" onclick="saVerEmpresa('${e.id}')">👁️ Ver</button>
            <button class="sa-action-btn" onclick="saImpersonarEmpresa('${e.id}')">🎭 Impersonar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function saVerEmpresa(empresaId) {
  const empresa = saEmpresas.find(e => e.id === empresaId);
  if (!empresa) return saToast('Empresa no encontrada', 'error');

  const usuariosEmp = saUsuarios.filter(u => u.empresaId === empresaId);
  const admins = usuariosEmp.filter(u => u.rol === 'admin' && u.esPropietario);
  const empleados = usuariosEmp.filter(u => u.rol === 'admin' && !u.esPropietario);
  const clientes = usuariosEmp.filter(u => u.rol === 'cliente');

  const ventasEmp = saVentas.filter(v => v.empresaId === empresaId);
  const totalVentas = ventasEmp.reduce((sum, v) => {
    const monto = parseFloat(String(v.total || '0').replace(/[$,]/g, '')) || 0;
    return sum + monto;
  }, 0);

  const consultasIA = empresa.agentUsage?.contador || 0;

  const html = `
    <div style="text-align:center;margin-bottom:20px;">
      <h2 style="margin:0;color:#F1F5F9;font-size:20px;">${saEscape(empresa.nombre)}</h2>
      <p style="color:#94A3B8;font-size:13px;margin-top:4px;">ID: ${empresa.id}</p>
    </div>

    <div class="sa-metrics-grid" style="margin-bottom:20px;">
      <div class="sa-metric-card">
        <div class="sa-metric-label">Dueños</div>
        <div class="sa-metric-value blue">${admins.length}</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Empleados</div>
        <div class="sa-metric-value purple">${empleados.length}</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Clientes</div>
        <div class="sa-metric-value green">${clientes.length}</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Ventas Totales</div>
        <div class="sa-metric-value green">${saFormatCurrency(totalVentas)}</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Consultas IA</div>
        <div class="sa-metric-value amber">${consultasIA}</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Código Acceso</div>
        <div class="sa-metric-value blue" style="font-size:20px;">${saEscape(empresa.codigoAcceso)}</div>
      </div>
    </div>

    <h4 style="color:#F1F5F9;margin-bottom:10px;">👥 Usuarios de esta empresa</h4>
    <div class="sa-table-wrap" style="margin-bottom:20px;">
      <table class="sa-table">
        <thead>
          <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Tipo</th></tr>
        </thead>
        <tbody>
          ${usuariosEmp.length === 0 
            ? '<tr><td colspan="4" class="sa-table-empty">Sin usuarios</td></tr>'
            : usuariosEmp.map(u => `
                <tr>
                  <td>${saEscape(u.nombre || '—')}</td>
                  <td style="font-size:11px;">${saEscape(u.email || '—')}</td>
                  <td>${saEscape(u.rol || '—')}</td>
                  <td>
                    ${u.rol === 'cliente' 
                      ? '<span class="sa-badge sa-badge-cliente">Cliente</span>'
                      : u.esPropietario 
                        ? '<span class="sa-badge sa-badge-admin">Dueño</span>'
                        : '<span class="sa-badge sa-badge-empleado">Empleado</span>'
                    }
                  </td>
                </tr>
              `).join('')
          }
        </tbody>
      </table>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
      <button class="sa-btn sa-btn-outline" onclick="saCloseModal()">Cerrar</button>
      <button class="sa-btn sa-btn-danger" onclick="saSuspenderEmpresa('${empresaId}')">🚫 Suspender</button>
    </div>
  `;

  saOpenModal('Detalle de Empresa', html);
}

async function saSuspenderEmpresa(empresaId) {
  const empresa = saEmpresas.find(e => e.id === empresaId);
  if (!empresa) return;

  if (!confirm(`¿Suspender la empresa "${empresa.nombre}"? Los usuarios no podrán acceder.`)) return;

  try {
    await firebase.firestore().collection('empresas').doc(empresaId).update({
      plan: 'suspendida',
      fechaSuspension: firebase.firestore.FieldValue.serverTimestamp()
    });
    empresa.plan = 'suspendida';
    saToast('✅ Empresa suspendida', 'success');
    saCloseModal();
    saRenderEmpresas();
  } catch (error) {
    console.error(error);
    saToast('Error: ' + error.message, 'error');
  }
}

async function saImpersonarEmpresa(empresaId) {
  if (!confirm('⚠️ Esto abrirá la app principal en otra pestaña. ¿Continuar?')) return;
  window.open(`https://minegociopolar.com/?impersonate=${empresaId}`, '_blank');
}

// ================================================================
//  SECCIÓN: FACTURACIÓN
// ================================================================

async function saRenderFacturacion() {
  // Calcular facturación por empresa
  const facturacion = saEmpresas.map(e => {
    const usuariosEmp = saUsuarios.filter(u => u.empresaId === e.id);
    const duenos = usuariosEmp.filter(u => u.rol === 'admin' && u.esPropietario).length;
    const empleados = usuariosEmp.filter(u => u.rol === 'admin' && !u.esPropietario).length;
    const total = (duenos * saConfig.precioDueno) + (empleados * saConfig.precioEmpleado);
    return {
      id: e.id,
      nombre: e.nombre,
      duenos,
      empleados,
      total,
      estado: 'aldia'
    };
  });

  const totalMes = facturacion.reduce((sum, f) => sum + f.total, 0);

  const html = `
    <div class="sa-section-header">
      <div>
        <h2 class="sa-section-title">💰 Facturación</h2>
        <p class="sa-section-subtitle">Gestión de suscripciones y pagos</p>
      </div>
      <button class="sa-btn sa-btn-success sa-btn-sm" onclick="saExportarFacturacion()">📥 Exportar CSV</button>
    </div>

    <div class="sa-metrics-grid" style="margin-bottom:20px;">
      <div class="sa-metric-card">
        <div class="sa-metric-label">Ingresos del Mes</div>
        <div class="sa-metric-value green">${saFormatCurrency(totalMes)}</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Empresas Facturadas</div>
        <div class="sa-metric-value blue">${facturacion.length}</div>
      </div>
    </div>

    <div class="sa-table-wrap">
      <table class="sa-table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Dueños</th>
            <th>Empleados</th>
            <th>Cálculo</th>
            <th>Total Mes</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${facturacion.map(f => `
            <tr>
              <td><strong>${saEscape(f.nombre)}</strong></td>
              <td>${f.duenos} × $${saConfig.precioDueno}</td>
              <td>${f.empleados} × $${saConfig.precioEmpleado}</td>
              <td style="font-size:12px;color:#94A3B8;">
                (${f.duenos} × $${saConfig.precioDueno}) + (${f.empleados} × $${saConfig.precioEmpleado})
              </td>
              <td><strong style="color:#34D399;">${saFormatCurrency(f.total)}</strong></td>
              <td><span class="sa-badge sa-badge-aldia">Al día</span></td>
              <td>
                <div class="sa-actions">
                  <button class="sa-action-btn success" onclick="saRegistrarPago('${f.id}', ${f.total})">💵 Registrar pago</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('sa-content').innerHTML = html;
}

async function saRegistrarPago(empresaId, monto) {
  const html = `
    <div class="sa-field">
      <label>Empresa</label>
      <input type="text" value="${saEscape(saEmpresas.find(e => e.id === empresaId)?.nombre || '')}" disabled>
    </div>
    <div class="sa-field">
      <label>Monto ($)</label>
      <input type="number" id="sa-pago-monto" value="${monto}" step="0.01">
    </div>
    <div class="sa-field">
      <label>Método de pago</label>
      <select id="sa-pago-metodo">
        <option>Zelle</option>
        <option>PayPal</option>
        <option>USDT</option>
        <option>Efectivo</option>
        <option>Otro</option>
      </select>
    </div>
    <div class="sa-field">
      <label>Notas</label>
      <textarea id="sa-pago-notas" placeholder="Observaciones..."></textarea>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="sa-btn sa-btn-outline" onclick="saCloseModal()">Cancelar</button>
      <button class="sa-btn sa-btn-success" onclick="saGuardarPago('${empresaId}')">✅ Guardar</button>
    </div>
  `;
  saOpenModal('Registrar Pago', html);
}

async function saGuardarPago(empresaId) {
  const monto = parseFloat(document.getElementById('sa-pago-monto').value) || 0;
  const metodo = document.getElementById('sa-pago-metodo').value;
  const notas = document.getElementById('sa-pago-notas').value.trim();

  if (monto <= 0) return saToast('Monto inválido', 'error');

  try {
    await firebase.firestore().collection('pagosGlobales').add({
      empresaId,
      monto,
      metodo,
      notas,
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      registradoPor: SA_EMAIL
    });
    saToast('✅ Pago registrado', 'success');
    saCloseModal();
  } catch (error) {
    console.error(error);
    saToast('Error: ' + error.message, 'error');
  }
}

function saExportarFacturacion() {
  const facturacion = saEmpresas.map(e => {
    const usuariosEmp = saUsuarios.filter(u => u.empresaId === e.id);
    const duenos = usuariosEmp.filter(u => u.rol === 'admin' && u.esPropietario).length;
    const empleados = usuariosEmp.filter(u => u.rol === 'admin' && !u.esPropietario).length;
    const total = (duenos * saConfig.precioDueno) + (empleados * saConfig.precioEmpleado);
    return { empresa: e.nombre, duenos, empleados, total };
  });

  let csv = 'Empresa,Dueños,Empleados,Total\n';
  facturacion.forEach(f => {
    csv += `"${f.empresa}",${f.duenos},${f.empleados},${f.total}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `facturacion_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  saToast('✅ CSV descargado', 'success');
}

// ================================================================
//  SECCIÓN: USUARIOS
// ================================================================

async function saRenderUsuarios() {
  const html = `
    <div class="sa-section-header">
      <div>
        <h2 class="sa-section-title">👥 Usuarios Globales</h2>
        <p class="sa-section-subtitle">Todos los usuarios de todas las empresas</p>
      </div>
    </div>

    <div class="sa-filters">
      <input type="text" id="sa-user-search" placeholder="🔍 Buscar por email o nombre..." oninput="saFiltrarUsuarios()" style="flex:1;min-width:200px;">
      <select id="sa-user-filter" onchange="saFiltrarUsuarios()">
        <option value="todos">Todos</option>
        <option value="admin">Dueños</option>
        <option value="empleado">Empleados</option>
        <option value="cliente">Clientes</option>
      </select>
    </div>

    <div class="sa-table-wrap">
      <table class="sa-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Empresa</th>
            <th>Rol</th>
            <th>Tipo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="sa-tabla-usuarios"></tbody>
      </table>
    </div>
  `;
  document.getElementById('sa-content').innerHTML = html;
  saFiltrarUsuarios();
}

function saFiltrarUsuarios() {
  const search = (document.getElementById('sa-user-search')?.value || '').toLowerCase();
  const filter = document.getElementById('sa-user-filter')?.value || 'todos';

  let filtered = saUsuarios.filter(u => {
    const matchSearch = !search || 
      (u.nombre || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search);
    
    let matchFilter = true;
    if (filter === 'admin') matchFilter = u.rol === 'admin' && u.esPropietario;
    else if (filter === 'empleado') matchFilter = u.rol === 'admin' && !u.esPropietario;
    else if (filter === 'cliente') matchFilter = u.rol === 'cliente';

    return matchSearch && matchFilter;
  });

  const tbody = document.getElementById('sa-tabla-usuarios');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="sa-table-empty">No se encontraron usuarios</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.slice(0, 100).map(u => {
    const empresa = saEmpresas.find(e => e.id === u.empresaId);
    return `
      <tr>
        <td>${saEscape(u.nombre || '—')}</td>
        <td style="font-size:11px;">${saEscape(u.email || '—')}</td>
        <td>${saEscape(empresa?.nombre || '—')}</td>
        <td>${saEscape(u.rol || '—')}</td>
        <td>
          ${u.rol === 'cliente' 
            ? '<span class="sa-badge sa-badge-cliente">Cliente</span>'
            : u.esPropietario 
              ? '<span class="sa-badge sa-badge-admin">Dueño</span>'
              : '<span class="sa-badge sa-badge-empleado">Empleado</span>'
          }
        </td>
        <td>
          <div class="sa-actions">
            <button class="sa-action-btn" onclick="saResetPassword('${saEscape(u.email)}')">🔑 Reset</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (filtered.length > 100) {
    tbody.innerHTML += `<tr><td colspan="6" style="text-align:center;color:#64748B;font-size:12px;padding:12px;">Mostrando primeros 100 de ${filtered.length} usuarios</td></tr>`;
  }
}

async function saResetPassword(email) {
  if (!confirm(`¿Enviar correo de recuperación a ${email}?`)) return;
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    saToast('✅ Correo de recuperación enviado', 'success');
  } catch (error) {
    saToast('Error: ' + error.message, 'error');
  }
}

// ================================================================
//  SECCIÓN: ESTADÍSTICAS
// ================================================================

async function saRenderEstadisticas() {
  // Top productos globales
  const productosContador = {};
  saVentas.forEach(v => {
    const prods = v.productos || [];
    prods.forEach(p => {
      if (!productosContador[p.nombre]) productosContador[p.nombre] = 0;
      productosContador[p.nombre] += p.cantidad || 1;
    });
  });

  const topProductos = Object.entries(productosContador)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Uso del agente por empresa
  const usoIA = saEmpresas
    .map(e => ({
      nombre: e.nombre,
      consultas: e.agentUsage?.contador || 0
    }))
    .sort((a, b) => b.consultas - a.consultas)
    .slice(0, 10);

  const html = `
    <div class="sa-section-header">
      <div>
        <h2 class="sa-section-title">📈 Estadísticas Globales</h2>
        <p class="sa-section-subtitle">Datos agregados de toda la plataforma</p>
      </div>
    </div>

    <div class="sa-chart-card">
      <div class="sa-chart-title">🏆 Top 10 Productos Más Vendidos (Plataforma)</div>
      <div class="sa-chart-container">
        <canvas id="sa-chart-top-productos"></canvas>
      </div>
    </div>

    <div class="sa-chart-card">
      <div class="sa-chart-title">🤖 Uso del Agente IA por Empresa</div>
      <div class="sa-chart-container">
        <canvas id="sa-chart-uso-ia"></canvas>
      </div>
    </div>

    <div class="sa-table-wrap">
      <table class="sa-table">
        <thead>
          <tr><th>#</th><th>Producto</th><th>Unidades Vendidas</th></tr>
        </thead>
        <tbody>
          ${topProductos.length === 0 
            ? '<tr><td colspan="3" class="sa-table-empty">Sin datos</td></tr>'
            : topProductos.map((p, i) => `
                <tr>
                  <td>#${i + 1}</td>
                  <td>${saEscape(p[0])}</td>
                  <td><strong>${p[1]}</strong></td>
                </tr>
              `).join('')
          }
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('sa-content').innerHTML = html;

  // Gráfico Top Productos
  const ctxProd = document.getElementById('sa-chart-top-productos');
  if (ctxProd) {
    if (saCharts.topProductos) saCharts.topProductos.destroy();
    saCharts.topProductos = new Chart(ctxProd, {
      type: 'bar',
      data: {
        labels: topProductos.map(p => p[0].slice(0, 25)),
        datasets: [{
          label: 'Unidades',
          data: topProductos.map(p => p[1]),
          backgroundColor: '#3B82F6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748B' }, grid: { color: '#1E293B' } },
          y: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  }

  // Gráfico Uso IA
  const ctxIA = document.getElementById('sa-chart-uso-ia');
  if (ctxIA) {
    if (saCharts.usoIA) saCharts.usoIA.destroy();
    saCharts.usoIA = new Chart(ctxIA, {
      type: 'doughnut',
      data: {
        labels: usoIA.filter(u => u.consultas > 0).map(u => u.nombre),
        datasets: [{
          data: usoIA.filter(u => u.consultas > 0).map(u => u.consultas),
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#94A3B8', font: { size: 11 } } }
        }
      }
    });
  }
}

// ================================================================
//  SECCIÓN: CONFIGURACIÓN
// ================================================================

async function saRenderConfiguracion() {
  const html = `
    <div class="sa-section-header">
      <div>
        <h2 class="sa-section-title">⚙️ Configuración Global</h2>
        <p class="sa-section-subtitle">Parámetros generales de la plataforma</p>
      </div>
    </div>

    <div style="background:#1E293B;border:1px solid #334155;border-radius:14px;padding:24px;max-width:600px;">
      <div class="sa-field">
        <label>Precio por Dueño ($/mes)</label>
        <input type="number" id="sa-cfg-precio-dueno" value="${saConfig.precioDueno}" step="1" min="0">
      </div>
      <div class="sa-field">
        <label>Precio por Empleado ($/mes)</label>
        <input type="number" id="sa-cfg-precio-empleado" value="${saConfig.precioEmpleado}" step="1" min="0">
      </div>
      <div class="sa-field">
        <label>Límite de consultas IA por día (por dueño)</label>
        <input type="number" id="sa-cfg-limite-agente" value="${saConfig.limiteAgente}" min="1">
      </div>
      <div class="sa-field">
        <label>Nombre por defecto del Agente</label>
        <input type="text" id="sa-cfg-nombre-agente" value="${saConfig.nombreAgente}" maxlength="30">
      </div>
      <div class="sa-field">
        <label>Mensaje Global (visible en todas las apps)</label>
        <textarea id="sa-cfg-mensaje-global" placeholder="Ej: La plataforma estará en mantenimiento el domingo...">${saConfig.mensajeGlobal}</textarea>
      </div>
      <div class="sa-field">
        <label style="display:flex;align-items:center;gap:8px;text-transform:none;">
          <input type="checkbox" id="sa-cfg-mantenimiento" ${saConfig.modoMantenimiento ? 'checked' : ''} style="width:auto;height:auto;">
          <span>Activar Modo Mantenimiento</span>
        </label>
      </div>
      <button class="sa-btn sa-btn-primary" onclick="saGuardarConfiguracion()">💾 Guardar Configuración</button>
    </div>
  `;
  document.getElementById('sa-content').innerHTML = html;
}

async function saGuardarConfiguracion() {
  const nuevaConfig = {
    precioDueno: parseFloat(document.getElementById('sa-cfg-precio-dueno').value) || 20,
    precioEmpleado: parseFloat(document.getElementById('sa-cfg-precio-empleado').value) || 10,
    limiteAgente: parseInt(document.getElementById('sa-cfg-limite-agente').value) || 20,
    nombreAgente: document.getElementById('sa-cfg-nombre-agente').value.trim() || 'PolarBot',
    mensajeGlobal: document.getElementById('sa-cfg-mensaje-global').value.trim(),
    modoMantenimiento: document.getElementById('sa-cfg-mantenimiento').checked,
    actualizado: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await firebase.firestore().collection('superAdminConfig').doc('global').set(nuevaConfig, { merge: true });
    saConfig = { ...saConfig, ...nuevaConfig };
    saToast('✅ Configuración guardada', 'success');
  } catch (error) {
    console.error(error);
    saToast('Error: ' + error.message, 'error');
  }
}

// ================================================================
//  SECCIÓN: COMUNICACIÓN
// ================================================================

async function saRenderComunicacion() {
  const html = `
    <div class="sa-section-header">
      <div>
        <h2 class="sa-section-title">📢 Comunicación</h2>
        <p class="sa-section-subtitle">Envía anuncios a los franquiciados</p>
      </div>
    </div>

    <div style="background:#1E293B;border:1px solid #334155;border-radius:14px;padding:24px;max-width:700px;">
      <div class="sa-field">
        <label>Destinatario</label>
        <select id="sa-anuncio-destino">
          <option value="todas">Todas las empresas</option>
          ${saEmpresas.map(e => `<option value="${e.id}">${saEscape(e.nombre)}</option>`).join('')}
        </select>
      </div>
      <div class="sa-field">
        <label>Título</label>
        <input type="text" id="sa-anuncio-titulo" placeholder="Ej: Nueva actualización disponible" maxlength="80">
      </div>
      <div class="sa-field">
        <label>Mensaje</label>
        <textarea id="sa-anuncio-mensaje" placeholder="Contenido del anuncio..." style="min-height:120px;"></textarea>
      </div>
      <button class="sa-btn sa-btn-primary" onclick="saEnviarAnuncio()">📤 Enviar Anuncio</button>
    </div>

    <div class="sa-section-header" style="margin-top:32px;">
      <h3 class="sa-section-title" style="font-size:16px;">📜 Historial de Anuncios</h3>
    </div>
    <div id="sa-historial-anuncios" class="sa-table-wrap">
      <table class="sa-table">
        <thead><tr><th>Fecha</th><th>Destinatario</th><th>Título</th></tr></thead>
        <tbody id="sa-tabla-anuncios">
          <tr><td colspan="3" class="sa-table-empty">Cargando...</td></tr>
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('sa-content').innerHTML = html;
  saCargarAnuncios();
}

async function saCargarAnuncios() {
  try {
    const snap = await firebase.firestore().collection('anunciosGlobales')
      .orderBy('fecha', 'desc').limit(20).get();
    const tbody = document.getElementById('sa-tabla-anuncios');
    if (!tbody) return;
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="3" class="sa-table-empty">Sin anuncios enviados</td></tr>';
      return;
    }
    tbody.innerHTML = snap.docs.map(d => {
      const data = d.data();
      const empresa = data.destino === 'todas' 
        ? '🌎 Todas' 
        : saEscape(saEmpresas.find(e => e.id === data.destino)?.nombre || '—');
      return `
        <tr>
          <td>${saFormatDate(data.fecha)}</td>
          <td>${empresa}</td>
          <td>${saEscape(data.titulo || '—')}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error(error);
  }
}

async function saEnviarAnuncio() {
  const destino = document.getElementById('sa-anuncio-destino').value;
  const titulo = document.getElementById('sa-anuncio-titulo').value.trim();
  const mensaje = document.getElementById('sa-anuncio-mensaje').value.trim();

  if (!titulo || !mensaje) return saToast('Completa título y mensaje', 'error');

  try {
    await firebase.firestore().collection('anunciosGlobales').add({
      destino,
      titulo,
      mensaje,
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      enviadoPor: SA_EMAIL
    });
    saToast('✅ Anuncio enviado', 'success');
    document.getElementById('sa-anuncio-titulo').value = '';
    document.getElementById('sa-anuncio-mensaje').value = '';
    saCargarAnuncios();
  } catch (error) {
    saToast('Error: ' + error.message, 'error');
  }
}

// ================================================================
//  SECCIÓN: AUDITORÍA
// ================================================================

async function saRenderAuditoria() {
  const html = `
    <div class="sa-section-header">
      <div>
        <h2 class="sa-section-title">🔒 Auditoría y Seguridad</h2>
        <p class="sa-section-subtitle">Estado del sistema y registros</p>
      </div>
    </div>

    <div class="sa-metrics-grid">
      <div class="sa-metric-card">
        <div class="sa-metric-label">Firebase</div>
        <div class="sa-metric-value green">✅ OK</div>
        <div class="sa-metric-sub">Conectado</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">DeepSeek API</div>
        <div class="sa-metric-value green">✅ OK</div>
        <div class="sa-metric-sub">Vía Cloudflare Worker</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">Cloudflare Worker</div>
        <div class="sa-metric-value green">✅ Activo</div>
        <div class="sa-metric-sub">minegociopolar-proxy</div>
      </div>
      <div class="sa-metric-card">
        <div class="sa-metric-label">GitHub Pages</div>
        <div class="sa-metric-value green">✅ Online</div>
        <div class="sa-metric-sub">minegociopolar.com</div>
      </div>
    </div>

    <div class="sa-section-header" style="margin-top:24px;">
      <h3 class="sa-section-title" style="font-size:16px;">📋 Información del Sistema</h3>
    </div>
    <div class="sa-table-wrap">
      <table class="sa-table">
        <tbody>
          <tr><td><strong>Super Admin UID</strong></td><td><code>${saEscape(SA_UID)}</code></td></tr>
          <tr><td><strong>Super Admin Email</strong></td><td>${saEscape(SA_EMAIL)}</td></tr>
          <tr><td><strong>Empresas totales</strong></td><td>${saEmpresas.length}</td></tr>
          <tr><td><strong>Usuarios totales</strong></td><td>${saUsuarios.length}</td></tr>
          <tr><td><strong>Ventas totales</strong></td><td>${saVentas.length}</td></tr>
          <tr><td><strong>Fecha de sesión</strong></td><td>${new Date().toLocaleString('es-ES')}</td></tr>
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('sa-content').innerHTML = html;
}

// ================================================================
//  SECCIÓN: CATÁLOGO POLAR (BLOQUE B)
//  Gestión completa del catálogo maestro productosPolar
// ================================================================

// Variables globales de la sección
let saCatalogoProductos = [];
let saCatalogoProductosOriginales = [];
let saCatalogoFiltroCategoria = 'todas';
let saCatalogoFiltroMarca = 'todas';
let saCatalogoFiltroEstado = 'todos';
let saCatalogoBusqueda = '';
let saCatalogoEditandoCodigo = null;

// ────────────────────────────────────────────────────────────────
//  RENDERIZAR SECCIÓN PRINCIPAL
// ────────────────────────────────────────────────────────────────
async function saRenderCatalogo() {
  saShowLoader('Cargando catálogo Polar...');

  try {
    const snapshot = await firebase.firestore().collection('productosPolar').get();
    
    saCatalogoProductos = [];
    snapshot.forEach(doc => {
      saCatalogoProductos.push({ codigo: doc.id, ...doc.data() });
    });

    saCatalogoProductos.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
    saCatalogoProductosOriginales = JSON.parse(JSON.stringify(saCatalogoProductos));

    const categorias = [...new Set(saCatalogoProductos.map(p => p.categoria).filter(Boolean))].sort();
    const marcas = [...new Set(saCatalogoProductos.map(p => p.marca).filter(Boolean))].sort();

    const totalActivos = saCatalogoProductos.filter(p => p.activo !== false).length;
    const totalInactivos = saCatalogoProductos.length - totalActivos;

    const html = `
      <div class="sa-section-header">
        <div>
          <h2 class="sa-section-title">📦 Catálogo Maestro Polar</h2>
          <p class="sa-section-subtitle">Gestiona los productos disponibles para todas las franquicias</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="sa-btn sa-btn-outline sa-btn-sm" onclick="saCatalogoImportar()">📥 Importar</button>
          <button class="sa-btn sa-btn-outline sa-btn-sm" onclick="saCatalogoExportar('json')">📤 JSON</button>
          <button class="sa-btn sa-btn-outline sa-btn-sm" onclick="saCatalogoExportar('csv')">📤 CSV</button>
          <button class="sa-btn sa-btn-primary sa-btn-sm" onclick="saCatalogoAbrirModalCrear()">+ Agregar producto</button>
        </div>
      </div>

      <div class="sa-metrics-grid" style="margin-bottom:20px;">
        <div class="sa-metric-card">
          <div class="sa-metric-label">Total</div>
          <div class="sa-metric-value blue">${saCatalogoProductos.length}</div>
        </div>
        <div class="sa-metric-card">
          <div class="sa-metric-label">Activos</div>
          <div class="sa-metric-value green">${totalActivos}</div>
        </div>
        <div class="sa-metric-card">
          <div class="sa-metric-label">Inactivos</div>
          <div class="sa-metric-value red">${totalInactivos}</div>
        </div>
        <div class="sa-metric-card">
          <div class="sa-metric-label">Categorías</div>
          <div class="sa-metric-value purple">${categorias.length}</div>
        </div>
      </div>

      <div class="sa-filters" style="margin-bottom:16px;">
        <input type="text" id="sa-cat-search" placeholder="🔍 Buscar por código, nombre o presentación..." 
               oninput="saCatalogoBuscar(this.value)" 
               style="flex:1;min-width:220px;" value="${saEscape(saCatalogoBusqueda)}">
        <select id="sa-cat-filter-categoria" onchange="saCatalogoCambiarFiltro('categoria', this.value)">
          <option value="todas">Todas las categorías</option>
          ${categorias.map(c => `<option value="${saEscape(c)}" ${saCatalogoFiltroCategoria === c ? 'selected' : ''}>${saEscape(c)}</option>`).join('')}
        </select>
        <select id="sa-cat-filter-marca" onchange="saCatalogoCambiarFiltro('marca', this.value)">
          <option value="todas">Todas las marcas</option>
          ${marcas.map(m => `<option value="${saEscape(m)}" ${saCatalogoFiltroMarca === m ? 'selected' : ''}>${saEscape(m)}</option>`).join('')}
        </select>
        <select id="sa-cat-filter-estado" onchange="saCatalogoCambiarFiltro('estado', this.value)">
          <option value="todos" ${saCatalogoFiltroEstado === 'todos' ? 'selected' : ''}>Todos los estados</option>
          <option value="activos" ${saCatalogoFiltroEstado === 'activos' ? 'selected' : ''}>Solo activos</option>
          <option value="inactivos" ${saCatalogoFiltroEstado === 'inactivos' ? 'selected' : ''}>Solo inactivos</option>
        </select>
      </div>

      <div id="sa-cat-tabla-container">
        ${saCatalogoRenderTabla()}
      </div>
    `;

    document.getElementById('sa-content').innerHTML = html;

  } catch (error) {
    console.error('Error cargando catálogo:', error);
    document.getElementById('sa-content').innerHTML = `
      <div class="sa-section-header">
        <h2 class="sa-section-title">📦 Catálogo Maestro Polar</h2>
      </div>
      <div style="background:#7F1D1D;color:#FCA5A5;padding:16px;border-radius:12px;">
        ❌ Error al cargar el catálogo: ${saEscape(error.message)}
      </div>
    `;
  }
}

// ────────────────────────────────────────────────────────────────
//  RENDERIZAR TABLA
// ────────────────────────────────────────────────────────────────
function saCatalogoRenderTabla() {
  const filtrados = saCatalogoAplicarFiltros();

  if (filtrados.length === 0) {
    return `
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead><tr><th>Código</th><th>Producto</th><th>Presentación</th><th>Categoría</th><th>Marca</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr><td colspan="7" class="sa-table-empty">No se encontraron productos con esos filtros</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <div class="sa-table-wrap">
      <table class="sa-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Presentación</th>
            <th>Categoría</th>
            <th>Marca</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtrados.map(p => {
            const activo = p.activo !== false;
            return `
              <tr>
                <td><code style="font-family:'JetBrains Mono',monospace;color:#60A5FA;font-size:11px;">${saEscape(p.codigo)}</code></td>
                <td><strong>${saEscape(p.nombre || '—')}</strong></td>
                <td style="font-size:11px;color:#94A3B8;">${saEscape(p.presentacion || '—')}</td>
                <td><span class="sa-badge sa-badge-aldia">${saEscape(p.categoria || '—')}</span></td>
                <td style="font-size:11px;">${saEscape(p.marca || '—')}</td>
                <td>
                  ${activo 
                    ? '<span class="sa-badge sa-badge-activa">✅ Activo</span>' 
                    : '<span class="sa-badge sa-badge-suspendida">⛔ Inactivo</span>'}
                </td>
                <td>
                  <div class="sa-actions">
                    <button class="sa-action-btn" onclick="saCatalogoAbrirModalEditar('${saEscape(p.codigo)}')">✏️ Editar</button>
                    <button class="sa-action-btn ${activo ? 'danger' : 'success'}" onclick="saCatalogoToggleActivo('${saEscape(p.codigo)}')">
                      ${activo ? '⛔ Desactivar' : '✅ Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:12px;font-size:12px;color:#64748B;text-align:center;">
      Mostrando ${filtrados.length} de ${saCatalogoProductos.length} productos
    </div>
  `;
}

// ────────────────────────────────────────────────────────────────
//  APLICAR FILTROS
// ────────────────────────────────────────────────────────────────
function saCatalogoAplicarFiltros() {
  const q = (saCatalogoBusqueda || '').toLowerCase().trim();
  return saCatalogoProductos.filter(p => {
    if (q) {
      const matchQ = 
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.presentacion || '').toLowerCase().includes(q);
      if (!matchQ) return false;
    }
    if (saCatalogoFiltroCategoria !== 'todas' && p.categoria !== saCatalogoFiltroCategoria) return false;
    if (saCatalogoFiltroMarca !== 'todas' && p.marca !== saCatalogoFiltroMarca) return false;
    if (saCatalogoFiltroEstado === 'activos' && p.activo === false) return false;
    if (saCatalogoFiltroEstado === 'inactivos' && p.activo !== false) return false;
    return true;
  });
}

// ────────────────────────────────────────────────────────────────
//  MANEJADORES DE FILTROS
// ────────────────────────────────────────────────────────────────
function saCatalogoBuscar(valor) {
  saCatalogoBusqueda = valor;
  document.getElementById('sa-cat-tabla-container').innerHTML = saCatalogoRenderTabla();
}

function saCatalogoCambiarFiltro(tipo, valor) {
  if (tipo === 'categoria') saCatalogoFiltroCategoria = valor;
  if (tipo === 'marca') saCatalogoFiltroMarca = valor;
  if (tipo === 'estado') saCatalogoFiltroEstado = valor;
  document.getElementById('sa-cat-tabla-container').innerHTML = saCatalogoRenderTabla();
}

// ────────────────────────────────────────────────────────────────
//  MODAL: CREAR PRODUCTO
// ────────────────────────────────────────────────────────────────
function saCatalogoAbrirModalCrear() {
  saCatalogoEditandoCodigo = null;
  const categorias = [...new Set(saCatalogoProductos.map(p => p.categoria).filter(Boolean))].sort();
  const marcas = [...new Set(saCatalogoProductos.map(p => p.marca).filter(Boolean))].sort();

  const html = `
    <div class="sa-field">
      <label>Código * <small style="color:#64748B;font-weight:400;">(ej: F01001)</small></label>
      <input type="text" id="sa-cat-form-codigo" placeholder="F01001" maxlength="20" style="font-family:'JetBrains Mono',monospace;text-transform:uppercase;">
    </div>
    <div class="sa-field">
      <label>Nombre *</label>
      <input type="text" id="sa-cat-form-nombre" placeholder="Ej: Polar Pilsen">
    </div>
    <div class="sa-field">
      <label>Presentación *</label>
      <input type="text" id="sa-cat-form-presentacion" placeholder="Ej: RET 222MLX6UN">
    </div>
    <div class="sa-field">
      <label>Categoría *</label>
      <select id="sa-cat-form-categoria">
        ${categorias.map(c => `<option value="${saEscape(c)}">${saEscape(c)}</option>`).join('')}
        <option value="__otra__">+ Otra categoría...</option>
      </select>
      <input type="text" id="sa-cat-form-categoria-otra" placeholder="Escribe la nueva categoría" style="margin-top:8px;display:none;">
    </div>
    <div class="sa-field">
      <label>Marca *</label>
      <select id="sa-cat-form-marca">
        ${marcas.map(m => `<option value="${saEscape(m)}">${saEscape(m)}</option>`).join('')}
        <option value="__otra__">+ Otra marca...</option>
      </select>
      <input type="text" id="sa-cat-form-marca-otra" placeholder="Escribe la nueva marca" style="margin-top:8px;display:none;">
    </div>
    <div class="sa-field">
      <label>Precio sugerido ($) <small style="color:#64748B;font-weight:400;">(opcional)</small></label>
      <input type="number" id="sa-cat-form-precio" placeholder="0.00" step="0.01" min="0">
    </div>
    <div class="sa-field">
      <label>Stock mínimo sugerido <small style="color:#64748B;font-weight:400;">(opcional)</small></label>
      <input type="number" id="sa-cat-form-stockmin" placeholder="5" step="1" min="0">
    </div>
    <div class="sa-field">
      <label>Estado</label>
      <select id="sa-cat-form-activo">
        <option value="true">✅ Activo</option>
        <option value="false">⛔ Inactivo</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;">
      <button class="sa-btn sa-btn-outline" onclick="saCloseModal()">Cancelar</button>
      <button class="sa-btn sa-btn-primary" onclick="saCatalogoGuardar()">💾 Crear producto</button>
    </div>
  `;

  saOpenModal('➕ Agregar producto al catálogo', html);

  setTimeout(() => {
    const selCat = document.getElementById('sa-cat-form-categoria');
    const inputCat = document.getElementById('sa-cat-form-categoria-otra');
    selCat.addEventListener('change', () => {
      inputCat.style.display = selCat.value === '__otra__' ? 'block' : 'none';
      if (selCat.value === '__otra__') inputCat.focus();
    });

    const selMarca = document.getElementById('sa-cat-form-marca');
    const inputMarca = document.getElementById('sa-cat-form-marca-otra');
    selMarca.addEventListener('change', () => {
      inputMarca.style.display = selMarca.value === '__otra__' ? 'block' : 'none';
      if (selMarca.value === '__otra__') inputMarca.focus();
    });
  }, 100);
}

// ────────────────────────────────────────────────────────────────
//  MODAL: EDITAR PRODUCTO
// ────────────────────────────────────────────────────────────────
function saCatalogoAbrirModalEditar(codigo) {
  const p = saCatalogoProductos.find(x => x.codigo === codigo);
  if (!p) {
    saToast('Producto no encontrado', 'error');
    return;
  }

  saCatalogoEditandoCodigo = codigo;
  const categorias = [...new Set(saCatalogoProductos.map(x => x.categoria).filter(Boolean))].sort();
  const marcas = [...new Set(saCatalogoProductos.map(x => x.marca).filter(Boolean))].sort();

  const html = `
    <div class="sa-field">
      <label>Código <small style="color:#64748B;font-weight:400;">(no editable)</small></label>
      <input type="text" value="${saEscape(p.codigo)}" disabled style="font-family:'JetBrains Mono',monospace;opacity:0.6;">
    </div>
    <div class="sa-field">
      <label>Nombre *</label>
      <input type="text" id="sa-cat-form-nombre" value="${saEscape(p.nombre || '')}">
    </div>
    <div class="sa-field">
      <label>Presentación *</label>
      <input type="text" id="sa-cat-form-presentacion" value="${saEscape(p.presentacion || '')}">
    </div>
    <div class="sa-field">
      <label>Categoría *</label>
      <select id="sa-cat-form-categoria">
        ${categorias.map(c => `<option value="${saEscape(c)}" ${p.categoria === c ? 'selected' : ''}>${saEscape(c)}</option>`).join('')}
        <option value="__otra__">+ Otra categoría...</option>
      </select>
      <input type="text" id="sa-cat-form-categoria-otra" placeholder="Escribe la nueva categoría" style="margin-top:8px;display:none;">
    </div>
    <div class="sa-field">
      <label>Marca *</label>
      <select id="sa-cat-form-marca">
        ${marcas.map(m => `<option value="${saEscape(m)}" ${p.marca === m ? 'selected' : ''}>${saEscape(m)}</option>`).join('')}
        <option value="__otra__">+ Otra marca...</option>
      </select>
      <input type="text" id="sa-cat-form-marca-otra" placeholder="Escribe la nueva marca" style="margin-top:8px;display:none;">
    </div>
    <div class="sa-field">
      <label>Precio sugerido ($) <small style="color:#64748B;font-weight:400;">(opcional)</small></label>
      <input type="number" id="sa-cat-form-precio" value="${p.precioSugerido || ''}" step="0.01" min="0">
    </div>
    <div class="sa-field">
      <label>Stock mínimo sugerido <small style="color:#64748B;font-weight:400;">(opcional)</small></label>
      <input type="number" id="sa-cat-form-stockmin" value="${p.stockMinimoSugerido || ''}" step="1" min="0">
    </div>
    <div class="sa-field">
      <label>Estado</label>
      <select id="sa-cat-form-activo">
        <option value="true" ${p.activo !== false ? 'selected' : ''}>✅ Activo</option>
        <option value="false" ${p.activo === false ? 'selected' : ''}>⛔ Inactivo</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;">
      <button class="sa-btn sa-btn-outline" onclick="saCloseModal()">Cancelar</button>
      <button class="sa-btn sa-btn-primary" onclick="saCatalogoGuardar()">💾 Guardar cambios</button>
    </div>
  `;

  saOpenModal('✏️ Editar producto del catálogo', html);

  setTimeout(() => {
    const selCat = document.getElementById('sa-cat-form-categoria');
    const inputCat = document.getElementById('sa-cat-form-categoria-otra');
    selCat.addEventListener('change', () => {
      inputCat.style.display = selCat.value === '__otra__' ? 'block' : 'none';
      if (selCat.value === '__otra__') inputCat.focus();
    });

    const selMarca = document.getElementById('sa-cat-form-marca');
    const inputMarca = document.getElementById('sa-cat-form-marca-otra');
    selMarca.addEventListener('change', () => {
      inputMarca.style.display = selMarca.value === '__otra__' ? 'block' : 'none';
      if (selMarca.value === '__otra__') inputMarca.focus();
    });
  }, 100);
}

// ────────────────────────────────────────────────────────────────
//  GUARDAR (crear o actualizar)
// ────────────────────────────────────────────────────────────────
async function saCatalogoGuardar() {
  const esCreacion = saCatalogoEditandoCodigo === null;

  let codigo = null;
  if (esCreacion) {
    codigo = (document.getElementById('sa-cat-form-codigo').value || '').trim().toUpperCase();
    if (!codigo) return saToast('El código es obligatorio', 'error');
    if (!/^[A-Z0-9_-]{2,20}$/.test(codigo)) {
      return saToast('El código debe tener 2-20 caracteres (A-Z, 0-9, guion)', 'error');
    }
    if (saCatalogoProductos.some(p => p.codigo === codigo)) {
      return saToast('Ya existe un producto con ese código', 'error');
    }
  } else {
    codigo = saCatalogoEditandoCodigo;
  }

  const nombre = (document.getElementById('sa-cat-form-nombre').value || '').trim();
  const presentacion = (document.getElementById('sa-cat-form-presentacion').value || '').trim();
  
  let categoria = document.getElementById('sa-cat-form-categoria').value;
  if (categoria === '__otra__') {
    categoria = (document.getElementById('sa-cat-form-categoria-otra').value || '').trim();
    if (!categoria) return saToast('Escribe la nueva categoría', 'error');
  }

  let marca = document.getElementById('sa-cat-form-marca').value;
  if (marca === '__otra__') {
    marca = (document.getElementById('sa-cat-form-marca-otra').value || '').trim();
    if (!marca) return saToast('Escribe la nueva marca', 'error');
  }

  const precioSugerido = parseFloat(document.getElementById('sa-cat-form-precio').value) || null;
  const stockMinimoSugerido = parseInt(document.getElementById('sa-cat-form-stockmin').value) || null;
  const activo = document.getElementById('sa-cat-form-activo').value === 'true';

  if (!nombre) return saToast('El nombre es obligatorio', 'error');
  if (!presentacion) return saToast('La presentación es obligatoria', 'error');

  const iconoMap = { 'Cerveza': '🍺', 'Maltín': '🍻', 'Sangría': '🍷', 'Vinos': '🍇' };
  const icono = iconoMap[categoria] || '📦';

  const datos = {
    codigo,
    nombre,
    presentacion,
    categoria,
    marca,
    icono,
    activo,
    precioSugerido,
    stockMinimoSugerido,
    fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await firebase.firestore().collection('productosPolar').doc(codigo).set(datos, { merge: true });
    
    saToast(esCreacion ? '✅ Producto creado' : '✅ Producto actualizado', 'success');
    saCloseModal();
    
    await saRenderCatalogo();
  } catch (error) {
    console.error('Error guardando producto:', error);
    saToast('Error al guardar: ' + error.message, 'error');
  }
}

// ────────────────────────────────────────────────────────────────
//  TOGGLE ACTIVO/INACTIVO
// ────────────────────────────────────────────────────────────────
async function saCatalogoToggleActivo(codigo) {
  const p = saCatalogoProductos.find(x => x.codigo === codigo);
  if (!p) return;
  const nuevoEstado = p.activo === false;
  if (!confirm(`¿${nuevoEstado ? 'Activar' : 'Desactivar'} "${p.nombre}"?\n\nLos franquiciados ${nuevoEstado ? 'podrán' : 'ya no podrán'} importarlo desde el catálogo.`)) return;

  try {
    await firebase.firestore().collection('productosPolar').doc(codigo).update({
      activo: nuevoEstado,
      fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
    });
    saToast(nuevoEstado ? '✅ Producto activado' : '⛔ Producto desactivado', 'success');
    await saRenderCatalogo();
  } catch (error) {
    saToast('Error: ' + error.message, 'error');
  }
}

// ────────────────────────────────────────────────────────────────
//  EXPORTAR (JSON / CSV)
// ────────────────────────────────────────────────────────────────
function saCatalogoExportar(formato) {
  if (saCatalogoProductos.length === 0) {
    return saToast('No hay productos para exportar', 'error');
  }

  if (formato === 'json') {
    const datos = saCatalogoProductos.map(p => ({
      codigo: p.codigo,
      nombre: p.nombre,
      presentacion: p.presentacion,
      categoria: p.categoria,
      marca: p.marca,
      icono: p.icono,
      activo: p.activo !== false,
      precioSugerido: p.precioSugerido || null,
      stockMinimoSugerido: p.stockMinimoSugerido || null
    }));
    const json = JSON.stringify({ total: datos.length, productos: datos }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo_polar_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    saToast('✅ JSON exportado', 'success');
    return;
  }

  if (formato === 'csv') {
    const headers = ['codigo', 'nombre', 'presentacion', 'categoria', 'marca', 'activo', 'precioSugerido', 'stockMinimoSugerido'];
    const filas = saCatalogoProductos.map(p => headers.map(h => {
      const val = h === 'activo' ? (p.activo !== false) : p[h];
      const str = val === null || val === undefined ? '' : String(val);
      return '"' + str.replace(/"/g, '""') + '"';
    }).join(','));
    const csv = headers.join(',') + '\n' + filas.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo_polar_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    saToast('✅ CSV exportado', 'success');
    return;
  }
}

// ────────────────────────────────────────────────────────────────
//  IMPORTAR (JSON texto / JSON archivo / CSV archivo)
// ────────────────────────────────────────────────────────────────
function saCatalogoImportar() {
  const html = `
    <p style="color:#94A3B8;font-size:13px;margin-bottom:12px;">
      Los productos se agregan o actualizan por código. Si ya existe, se sobrescribe.
    </p>
    
    <div class="sa-field">
      <label>Método</label>
      <select id="sa-cat-import-metodo" onchange="saCatalogoImportarCambiarMetodo(this.value)">
        <option value="json-texto">📝 Pegar JSON</option>
        <option value="json-archivo">📁 Subir archivo JSON</option>
        <option value="csv-archivo">📁 Subir archivo CSV</option>
      </select>
    </div>

    <div id="sa-cat-import-json-texto">
      <div class="sa-field">
        <label>Pega el JSON aquí</label>
        <textarea id="sa-cat-import-texto" placeholder='{"productos": [{"codigo": "F01001", "nombre": "...", ...}]}' style="min-height:180px;font-family:'JetBrains Mono',monospace;font-size:11px;"></textarea>
      </div>
    </div>

    <div id="sa-cat-import-json-archivo" style="display:none;">
      <div class="sa-field">
        <label>Archivo JSON</label>
        <input type="file" id="sa-cat-import-file-json" accept=".json">
      </div>
    </div>

    <div id="sa-cat-import-csv-archivo" style="display:none;">
      <div class="sa-field">
        <label>Archivo CSV</label>
        <input type="file" id="sa-cat-import-file-csv" accept=".csv">
        <small style="color:#64748B;font-size:11px;">Columnas: codigo, nombre, presentacion, categoria, marca, activo, precioSugerido, stockMinimoSugerido</small>
      </div>
    </div>

    <div style="background:#7F1D1D;color:#FCA5A5;padding:10px;border-radius:8px;font-size:12px;margin-top:12px;">
      ⚠️ Los productos importados se agregan/actualizan. No se borran los existentes.
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;">
      <button class="sa-btn sa-btn-outline" onclick="saCloseModal()">Cancelar</button>
      <button class="sa-btn sa-btn-primary" onclick="saCatalogoImportarEjecutar()">📥 Importar</button>
    </div>
  `;
  saOpenModal('📥 Importar productos', html);
}

function saCatalogoImportarCambiarMetodo(metodo) {
  document.getElementById('sa-cat-import-json-texto').style.display = metodo === 'json-texto' ? 'block' : 'none';
  document.getElementById('sa-cat-import-json-archivo').style.display = metodo === 'json-archivo' ? 'block' : 'none';
  document.getElementById('sa-cat-import-csv-archivo').style.display = metodo === 'csv-archivo' ? 'block' : 'none';
}

async function saCatalogoImportarEjecutar() {
  const metodo = document.getElementById('sa-cat-import-metodo').value;
  let productos = [];

  try {
    if (metodo === 'json-texto') {
      const texto = document.getElementById('sa-cat-import-texto').value.trim();
      if (!texto) return saToast('Pega el JSON primero', 'error');
      const parsed = JSON.parse(texto);
      productos = Array.isArray(parsed) ? parsed : (parsed.productos || []);
    } else if (metodo === 'json-archivo') {
      const file = document.getElementById('sa-cat-import-file-json').files[0];
      if (!file) return saToast('Selecciona un archivo', 'error');
      const texto = await file.text();
      const parsed = JSON.parse(texto);
      productos = Array.isArray(parsed) ? parsed : (parsed.productos || []);
    } else if (metodo === 'csv-archivo') {
      const file = document.getElementById('sa-cat-import-file-csv').files[0];
      if (!file) return saToast('Selecciona un archivo', 'error');
      const texto = await file.text();
      productos = saCatalogoParsearCSV(texto);
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return saToast('No se encontraron productos válidos', 'error');
    }

    // Validar y normalizar
    const validos = [];
    for (const p of productos) {
      if (!p.codigo || !p.nombre || !p.presentacion || !p.categoria || !p.marca) continue;
      const iconoMap = { 'Cerveza': '🍺', 'Maltín': '🍻', 'Sangría': '🍷', 'Vinos': '🍇' };
      validos.push({
        codigo: String(p.codigo).trim().toUpperCase(),
        nombre: String(p.nombre).trim(),
        presentacion: String(p.presentacion).trim(),
        categoria: String(p.categoria).trim(),
        marca: String(p.marca).trim(),
        icono: p.icono || iconoMap[p.categoria] || '📦',
        activo: p.activo !== false && p.activo !== 'false',
        precioSugerido: p.precioSugerido ? parseFloat(p.precioSugerido) : null,
        stockMinimoSugerido: p.stockMinimoSugerido ? parseInt(p.stockMinimoSugerido) : null
      });
    }

    if (validos.length === 0) {
      return saToast('Ningún producto tiene todos los campos requeridos', 'error');
    }

    if (!confirm(`¿Importar ${validos.length} productos?\n\nSe agregarán o actualizarán por código.`)) return;

    // Batch commit
    const BATCH_SIZE = 400;
    let importados = 0;
    for (let i = 0; i < validos.length; i += BATCH_SIZE) {
      const lote = validos.slice(i, i + BATCH_SIZE);
      const batch = firebase.firestore().batch();
      for (const prod of lote) {
        const ref = firebase.firestore().collection('productosPolar').doc(prod.codigo);
        batch.set(ref, {
          ...prod,
          fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      await batch.commit();
      importados += lote.length;
    }

    saToast(`✅ ${importados} productos importados`, 'success');
    saCloseModal();
    await saRenderCatalogo();

  } catch (error) {
    console.error('Error importando:', error);
    saToast('Error al importar: ' + error.message, 'error');
  }
}

// ────────────────────────────────────────────────────────────────
//  PARSEAR CSV
// ────────────────────────────────────────────────────────────────
function saCatalogoParsearCSV(texto) {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim());
  if (lineas.length < 2) return [];

  const headers = saCatalogoParsearLineaCSV(lineas[0]);
  const productos = [];

  for (let i = 1; i < lineas.length; i++) {
    const valores = saCatalogoParsearLineaCSV(lineas[i]);
    if (valores.length !== headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = valores[idx];
    });
    productos.push(obj);
  }

  return productos;
}

function saCatalogoParsearLineaCSV(linea) {
  const resultado = [];
  let actual = '';
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (enComillas && linea[i+1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (c === ',' && !enComillas) {
      resultado.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  resultado.push(actual);
  return resultado;
}

// ================================================================
//  INICIALIZACIÓN
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Verificar si ya hay sesión activa
  if (sessionStorage.getItem('sa_authenticated') === 'true') {
    const user = firebase.auth().currentUser;
    if (user && user.uid === SA_UID) {
      document.getElementById('sa-login-screen').style.display = 'none';
      document.getElementById('sa-app').style.display = 'block';
      document.getElementById('sa-user-email').textContent = SA_EMAIL;
      saCargarDatosGlobales().then(() => saRenderDashboard());
      return;
    }
  }

  // Detectar Enter en login
  document.getElementById('sa-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saLogin();
  });
  document.getElementById('sa-2fa-code').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saVerificarCodigo();
  });

  console.log('🎯 Super Admin cargado');
});
