// ── DATA STORE CON FIRESTORE (MULTI-TENANT) ──
// Incluye paginación, manejo de errores, funciones para reportes, envases y facturas

class DataStore {
  constructor() {
    this.db = window.db;
    this.auth = window.auth;
    this.ventas = [];
    this.inventario = [];
    this.clientes = [];
    this.cargado = false;
    this.lastVentaDoc = null;
    this.lastInventarioDoc = null;
    this.lastClienteDoc = null;
    // Flags para saber si hay más datos para cargar
    this.hasMoreVentas = true;
    this.hasMoreInventario = true;
    this.hasMoreClientes = true;
  }

  // ================================================================
  // CARGA INICIAL Y PAGINACIÓN
  // ================================================================

  async cargarDatosEmpresa(empresaId, limite = 20) {
  console.log('📦 Cargando datos para empresa:', empresaId);
  try {
    // Resetear estados de paginación
    this.lastInventarioDoc = null;
    this.lastClienteDoc = null;
    this.lastVentaDoc = null;
    this.hasMoreInventario = true;
    this.hasMoreClientes = true;
    this.hasMoreVentas = true;

    // Determinar el rol del usuario
    const user = this.auth.currentUser;
    let rol = 'cliente';
    if (user) {
      const perfilDoc = await this.db.collection('userProfiles').doc(user.uid).get();
      if (perfilDoc.exists) {
        rol = perfilDoc.data().rol || 'cliente';
      }
    }

    // Siempre cargar inventario (todos pueden verlo)
    const invData = await this.cargarInventarioPaginado(empresaId, limite);
    this.inventario = invData.items;
    this.lastInventarioDoc = invData.lastDoc;

    // Si es admin, cargar clientes y ventas
    if (rol === 'admin') {
      const cliData = await this.cargarClientesPaginado(empresaId, limite);
      const venData = await this.cargarVentasPaginado(empresaId, limite);
      this.clientes = cliData.items;
      this.ventas = venData.items;
      this.lastClienteDoc = cliData.lastDoc;
      this.lastVentaDoc = venData.lastDoc;
    } else {
      // Cliente: no cargar clientes ni ventas (solo sus propias ventas se cargan después)
      this.clientes = [];
      this.ventas = [];
      // Opcional: cargar las ventas del cliente específico aquí si se necesita
      // Pero podemos cargarlas bajo demanda en el módulo cliente
    }

    this.cargado = true;
    syncGlobals();
    console.log('✅ Datos de empresa cargados correctamente');
    return true;
  } catch (error) {
    handleError(error, 'Error cargando datos de la empresa');
    throw error;
  }
}

  // --- Inventario ---
  async cargarInventarioPaginado(empresaId, limite = 20, startAfter = null) {
    try {
      let query = this.db.collection('empresas').doc(empresaId)
        .collection('inventario')
        .orderBy('nombre')
        .limit(limite);
      if (startAfter) query = query.startAfter(startAfter);
      const snapshot = await query.get();
      const items = [];
      let lastDoc = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.fecha && data.fecha.toDate) data.fecha = formatDateLocal(data.fecha.toDate());
        items.push({ id: doc.id, ...data });
        lastDoc = doc;
      });
      if (items.length < limite) this.hasMoreInventario = false;
      return { items, lastDoc };
    } catch (error) {
      handleError(error, 'Error cargando inventario');
      return { items: [], lastDoc: null };
    }
  }

  async cargarMasInventario(empresaId, limite = 20) {
    if (!this.hasMoreInventario || !this.lastInventarioDoc) {
      console.log('No hay más inventario para cargar');
      return { items: [], lastDoc: null };
    }
    const data = await this.cargarInventarioPaginado(empresaId, limite, this.lastInventarioDoc);
    if (data.items.length > 0) {
      this.inventario = this.inventario.concat(data.items);
      this.lastInventarioDoc = data.lastDoc;
      syncGlobals();
    }
    return data;
  }

  // --- Clientes ---
  async cargarClientesPaginado(empresaId, limite = 20, startAfter = null) {
    try {
      let query = this.db.collection('empresas').doc(empresaId)
        .collection('clientes')
        .orderBy('nombre')
        .limit(limite);
      if (startAfter) query = query.startAfter(startAfter);
      const snapshot = await query.get();
      const items = [];
      let lastDoc = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.fecha && data.fecha.toDate) data.fecha = formatDateLocal(data.fecha.toDate());
        items.push({ id: doc.id, ...data });
        lastDoc = doc;
      });
      if (items.length < limite) this.hasMoreClientes = false;
      return { items, lastDoc };
    } catch (error) {
      handleError(error, 'Error cargando clientes');
      return { items: [], lastDoc: null };
    }
  }

  async cargarMasClientes(empresaId, limite = 20) {
    if (!this.hasMoreClientes || !this.lastClienteDoc) {
      console.log('No hay más clientes para cargar');
      return { items: [], lastDoc: null };
    }
    const data = await this.cargarClientesPaginado(empresaId, limite, this.lastClienteDoc);
    if (data.items.length > 0) {
      this.clientes = this.clientes.concat(data.items);
      this.lastClienteDoc = data.lastDoc;
      syncGlobals();
    }
    return data;
  }

  // --- Ventas ---
  async cargarVentasPaginado(empresaId, limite = 20, startAfter = null) {
    try {
      let query = this.db.collection('empresas').doc(empresaId)
        .collection('ventas')
        .orderBy('fecha', 'desc')
        .limit(limite);
      if (startAfter) query = query.startAfter(startAfter);
      const snapshot = await query.get();
      const items = [];
      let lastDoc = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.fecha && data.fecha.toDate) data.fecha = formatDateLocal(data.fecha.toDate());
        items.push({ id: doc.id, ...data });
        lastDoc = doc;
      });
      if (items.length < limite) this.hasMoreVentas = false;
      return { items, lastDoc };
    } catch (error) {
      handleError(error, 'Error cargando ventas');
      return { items: [], lastDoc: null };
    }
  }

  async cargarMasVentas(empresaId, limite = 20) {
    if (!this.hasMoreVentas || !this.lastVentaDoc) {
      console.log('No hay más ventas para cargar');
      return { items: [], lastDoc: null };
    }
    const data = await this.cargarVentasPaginado(empresaId, limite, this.lastVentaDoc);
    if (data.items.length > 0) {
      this.ventas = this.ventas.concat(data.items);
      this.lastVentaDoc = data.lastDoc;
      syncGlobals();
    }
    return data;
  }

  // ================================================================
  // CRUD: VENTAS
  // ================================================================

  async addVenta(venta) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      const docRef = await this.db.collection('empresas').doc(empresaId)
        .collection('ventas').add({
          ...venta,
          fecha: getServerTimestamp()
        });
      const nuevaVenta = { id: docRef.id, ...venta, fecha: formatDateLocal(new Date()) };
      this.ventas.unshift(nuevaVenta);
      syncGlobals();
      return nuevaVenta;
    } catch (error) {
      handleError(error, 'Error al agregar venta');
      throw error;
    }
  }

  async updateVenta(id, updates) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId)
        .collection('ventas').doc(id).update(updates);
      const index = this.ventas.findIndex(v => v.id === id);
      if (index !== -1) this.ventas[index] = { ...this.ventas[index], ...updates };
      syncGlobals();
      return true;
    } catch (error) {
      handleError(error, 'Error al actualizar venta');
      throw error;
    }
  }

  async deleteVenta(id) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId)
        .collection('ventas').doc(id).delete();
      this.ventas = this.ventas.filter(v => v.id !== id);
      syncGlobals();
    } catch (error) {
      handleError(error, 'Error al eliminar venta');
      throw error;
    }
  }

  // ================================================================
  // CRUD: INVENTARIO (PRODUCTOS)
  // ================================================================

  async addProducto(producto) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      const docRef = await this.db.collection('empresas').doc(empresaId)
        .collection('inventario').add({
          ...producto,
          fecha: getServerTimestamp()
        });
      const nuevoProducto = { id: docRef.id, ...producto, fecha: formatDateLocal(new Date()) };
      this.inventario.unshift(nuevoProducto);
      syncGlobals();
      return nuevoProducto;
    } catch (error) {
      handleError(error, 'Error al agregar producto');
      throw error;
    }
  }

  async updateProducto(id, updates) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId)
        .collection('inventario').doc(id).update(updates);
      const index = this.inventario.findIndex(p => p.id === id);
      if (index !== -1) this.inventario[index] = { ...this.inventario[index], ...updates };
      syncGlobals();
      return true;
    } catch (error) {
      handleError(error, 'Error al actualizar producto');
      throw error;
    }
  }

  async deleteProducto(id) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId)
        .collection('inventario').doc(id).delete();
      this.inventario = this.inventario.filter(p => p.id !== id);
      syncGlobals();
    } catch (error) {
      handleError(error, 'Error al eliminar producto');
      throw error;
    }
  }

  // ================================================================
  // CRUD: CLIENTES
  // ================================================================

  async addCliente(cliente) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      const docRef = await this.db.collection('empresas').doc(empresaId)
        .collection('clientes').add({
          ...cliente,
          fecha: getServerTimestamp()
        });
      const nuevoCliente = { id: docRef.id, ...cliente, fecha: formatDateLocal(new Date()) };
      this.clientes.unshift(nuevoCliente);
      syncGlobals();
      return nuevoCliente;
    } catch (error) {
      handleError(error, 'Error al agregar cliente');
      throw error;
    }
  }

  async updateCliente(id, updates) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId)
        .collection('clientes').doc(id).update(updates);
      const index = this.clientes.findIndex(c => c.id === id);
      if (index !== -1) this.clientes[index] = { ...this.clientes[index], ...updates };
      syncGlobals();
      return true;
    } catch (error) {
      handleError(error, 'Error al actualizar cliente');
      throw error;
    }
  }

  async deleteCliente(id) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId)
        .collection('clientes').doc(id).delete();
      this.clientes = this.clientes.filter(c => c.id !== id);
      syncGlobals();
    } catch (error) {
      handleError(error, 'Error al eliminar cliente');
      throw error;
    }
  }

  // ================================================================
  // REPORTES
  // ================================================================

  async obtenerVentasPorPeriodo(empresaId, inicio, fin) {
    try {
      const snapshot = await this.db.collection('empresas').doc(empresaId)
        .collection('ventas')
        .where('fecha', '>=', inicio)
        .where('fecha', '<=', fin)
        .get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.fecha && data.fecha.toDate) data.fecha = formatDateLocal(data.fecha.toDate());
        return { id: doc.id, ...data };
      });
    } catch (error) {
      handleError(error, 'Error obteniendo ventas por período');
      return [];
    }
  }

  async obtenerProductosMasVendidos(empresaId, limite = 5) {
    try {
      const ventas = await this.db.collection('empresas').doc(empresaId)
        .collection('ventas').get();
      const productos = {};
      ventas.forEach(doc => {
        const v = doc.data();
        const nombre = v.producto || 'Sin producto';
        const cantidad = v.items || 1;
        const total = parseCurrency(v.total) || 0;
        if (!productos[nombre]) {
          productos[nombre] = { nombre, cantidad: 0, total: 0 };
        }
        productos[nombre].cantidad += cantidad;
        productos[nombre].total += total;
      });
      const sorted = Object.values(productos).sort((a, b) => b.cantidad - a.cantidad);
      return sorted.slice(0, limite);
    } catch (error) {
      handleError(error, 'Error obteniendo productos más vendidos');
      return [];
    }
  }

  // ================================================================
  // AUTENTICACIÓN
  // ================================================================

  async registrarUsuario(email, password, nombre) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (error) {
      handleError(error, 'Error al registrar usuario');
      throw error;
    }
  }

  async loginUsuario(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (error) {
      handleError(error, 'Error al iniciar sesión');
      throw error;
    }
  }

  async logoutUsuario() {
    try {
      await this.auth.signOut();
    } catch (error) {
      handleError(error, 'Error al cerrar sesión');
      throw error;
    }
  }

  // ================================================================
  // ENVASES Y FACTURAS
  // ================================================================

  async obtenerConfiguracionEnvases(empresaId) {
    try {
      const doc = await this.db.collection('empresas').doc(empresaId).get();
      if (!doc.exists) return null;
      const data = doc.data();
      return {
        stockEnvases: data.stockEnvases || {},
        limitesEnvasesCliente: data.limitesEnvasesCliente || {},
        umbralFacturasPendientes: data.umbralFacturasPendientes || 2
      };
    } catch (error) {
      handleError(error, 'Error al obtener configuración de envases');
      return null;
    }
  }

  async actualizarStockEnvases(empresaId, envases) {
    // envases: objeto con { tipo: cantidad } (puede ser positivo o negativo)
    try {
      const ref = this.db.collection('empresas').doc(empresaId);
      await ref.update({
        stockEnvases: firebase.firestore.FieldValue.increment(envases)
      });
    } catch (error) {
      handleError(error, 'Error al actualizar stock de envases');
      throw error;
    }
  }

  async actualizarSaldoEnvasesCliente(empresaId, clienteId, envases) {
    // envases: objeto con { tipo: cantidad } (incremento)
    try {
      const ref = this.db.collection('empresas').doc(empresaId)
        .collection('clientes').doc(clienteId);
      await ref.update({
        saldoEnvases: firebase.firestore.FieldValue.increment(envases)
      });
    } catch (error) {
      handleError(error, 'Error al actualizar saldo de envases del cliente');
      throw error;
    }
  }

  async contarFacturasPendientes(empresaId, clienteId) {
    try {
      const snapshot = await this.db.collection('empresas').doc(empresaId)
        .collection('ventas')
        .where('clienteId', '==', clienteId)
        .where('status', '==', 'pendiente')
        .get();
      return snapshot.size;
    } catch (error) {
      handleError(error, 'Error al contar facturas pendientes');
      return 0;
    }
  }

  async obtenerSiguienteNumeroFactura(empresaId) {
    const ref = this.db.collection('empresas').doc(empresaId);
    let numero = 0;
    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists) {
        throw new Error('Documento de empresa no existe');
      }
      const data = doc.data();
      numero = (data.ultimoNumeroFactura || 0) + 1;
      transaction.update(ref, { ultimoNumeroFactura: numero });
    });
    return numero;
  }
}

// ================================================================
// INSTANCIA Y VARIABLES GLOBALES
// ================================================================

const store = new DataStore();

let ventas = [];
let inventario = [];
let clientes = [];

function syncGlobals() {
  ventas = store.ventas || [];
  inventario = store.inventario || [];
  clientes = store.clientes || [];
  window.ventas = ventas;
  window.inventario = inventario;
  window.clientes = clientes;
}

function initStore() {
  console.log('🚀 Store inicializado con Firestore');
}

// Exponer al ámbito global
window.store = store;
window.syncGlobals = syncGlobals;
window.initStore = initStore;
