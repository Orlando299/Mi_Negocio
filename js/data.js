// ── DATA STORE CON FIRESTORE (MULTI-TENANT) ──
// Incluye paginación, manejo de errores y funciones para reportes

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
  }

  async cargarDatosEmpresa(empresaId, limite = 20) {
    console.log('📦 Cargando datos para empresa:', empresaId);
    try {
      const invData = await this.cargarInventarioPaginado(empresaId, limite);
      const cliData = await this.cargarClientesPaginado(empresaId, limite);
      const venData = await this.cargarVentasPaginado(empresaId, limite);

      this.inventario = invData.items;
      this.clientes = cliData.items;
      this.ventas = venData.items;
      this.cargado = true;

      window.inventario = this.inventario;
      window.clientes = this.clientes;
      window.ventas = this.ventas;

      this.lastInventarioDoc = invData.lastDoc;
      this.lastClienteDoc = cliData.lastDoc;
      this.lastVentaDoc = venData.lastDoc;

      console.log('✅ Datos de empresa cargados correctamente');
      return true;
    } catch (error) {
      handleError(error, 'Error cargando datos de la empresa');
      throw error;
    }
  }

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
      return { items, lastDoc };
    } catch (error) {
      handleError(error, 'Error cargando inventario');
      return { items: [], lastDoc: null };
    }
  }

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
      return { items, lastDoc };
    } catch (error) {
      handleError(error, 'Error cargando clientes');
      return { items: [], lastDoc: null };
    }
  }

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
      return { items, lastDoc };
    } catch (error) {
      handleError(error, 'Error cargando ventas');
      return { items: [], lastDoc: null };
    }
  }

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
      window.ventas = this.ventas;
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
      window.ventas = this.ventas;
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
      window.ventas = this.ventas;
    } catch (error) {
      handleError(error, 'Error al eliminar venta');
      throw error;
    }
  }

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
      window.inventario = this.inventario;
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
      window.inventario = this.inventario;
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
      window.inventario = this.inventario;
    } catch (error) {
      handleError(error, 'Error al eliminar producto');
      throw error;
    }
  }

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
      window.clientes = this.clientes;
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
      window.clientes = this.clientes;
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
      window.clientes = this.clientes;
    } catch (error) {
      handleError(error, 'Error al eliminar cliente');
      throw error;
    }
  }

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
}

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

async function initStore() {
  store.auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log('👤 Usuario autenticado:', user.email);
      try {
        const empresasSnapshot = await firebase.firestore()
          .collectionGroup('usuarios')
          .where('uid', '==', user.uid)
          .get();
        if (!empresasSnapshot.empty) {
          const usuarioDoc = empresasSnapshot.docs[0];
          const empresaId = usuarioDoc.ref.parent.parent.id;
          const usuarioData = usuarioDoc.data();
          sessionStorage.setItem('empresaId', empresaId);
          sessionStorage.setItem('userEmail', user.email);
          sessionStorage.setItem('userName', usuarioData.nombre || user.email);
          sessionStorage.setItem('userRol', usuarioData.rol || 'usuario');
          await store.cargarDatosEmpresa(empresaId);
          syncGlobals();
          if (typeof window.mostrarPanelCliente === 'function') {
            window.mostrarPanelCliente();
          }
          if (typeof renderVentas === 'function') renderVentas('', 'todas');
          if (typeof renderInv === 'function') renderInv('', 'todos');
          if (typeof renderClients === 'function') renderClients('', 'todos');
          if (typeof renderActividadReciente === 'function') renderActividadReciente();
          if (typeof updateKPIs === 'function') updateKPIs();
          if (typeof actualizarResumenConfiguracion === 'function') actualizarResumenConfiguracion();
        } else {
          console.warn('⚠️ No se encontró empresa para el usuario');
        }
      } catch (error) {
        handleError(error, 'Error cargando empresa');
      }
    } else {
      console.log('👤 Usuario no autenticado');
      sessionStorage.clear();
    }
  });
  console.log('🚀 Store inicializado con Firestore');
}

window.store = store;
window.syncGlobals = syncGlobals;
window.initStore = initStore;
