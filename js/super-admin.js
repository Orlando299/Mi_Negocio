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
