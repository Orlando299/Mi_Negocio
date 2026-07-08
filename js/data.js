// ── DATA STORE CON FIRESTORE (MULTI-TENANT) ──

class DataStore {
  constructor() {
    this.db = window.db;
    this.auth = window.auth;
    this.ventas = [];
    this.inventario = [];
    this.clientes = [];
    this.cargado = false;
  }

  // ── CARGAR DATOS DESDE FIRESTORE (ya no se usa para datos raíz) ──
  async cargarDatos() {
    console.warn('⚠️ cargarDatos() ya no se usa. Los datos se cargan por empresa usando cargarDatosEmpresa().');
    return true;
  }

  // ── CRUD VENTAS (usando subcolección de empresa) ──
  async addVenta(venta) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      const docRef = await this.db.collection('empresas').doc(empresaId).collection('ventas').add({
        ...venta,
        fecha: new Date().toISOString()
      });
      const nuevaVenta = { id: docRef.id, ...venta, fecha: new Date().toLocaleString() };
      this.ventas.unshift(nuevaVenta);
      // Actualizar variables globales y window
      ventas = this.ventas;
      window.ventas = this.ventas;
      return nuevaVenta;
    } catch (error) {
      console.error('Error al agregar venta:', error);
      throw error;
    }
  }

  async updateVenta(id, updates) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId).collection('ventas').doc(id).update(updates);
      const index = this.ventas.findIndex(v => v.id === id);
      if (index !== -1) {
        this.ventas[index] = { ...this.ventas[index], ...updates };
      }
      ventas = this.ventas;
      window.ventas = this.ventas;
      return true;
    } catch (error) {
      console.error('Error al actualizar venta:', error);
      throw error;
    }
  }

  async deleteVenta(id) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId).collection('ventas').doc(id).delete();
      this.ventas = this.ventas.filter(v => v.id !== id);
      ventas = this.ventas;
      window.ventas = this.ventas;
    } catch (error) {
      console.error('Error al eliminar venta:', error);
      throw error;
    }
  }

  // ── CRUD INVENTARIO (usando subcolección de empresa) ──
  async addProducto(producto) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      const docRef = await this.db.collection('empresas').doc(empresaId).collection('inventario').add(producto);
      const nuevoProducto = { id: docRef.id, ...producto };
      this.inventario.unshift(nuevoProducto);
      inventario = this.inventario;
      window.inventario = this.inventario;
      return nuevoProducto;
    } catch (error) {
      console.error('Error al agregar producto:', error);
      throw error;
    }
  }

  async updateProducto(id, updates) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId).collection('inventario').doc(id).update(updates);
      const index = this.inventario.findIndex(p => p.id === id);
      if (index !== -1) {
        this.inventario[index] = { ...this.inventario[index], ...updates };
      }
      inventario = this.inventario;
      window.inventario = this.inventario;
      return true;
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }
  }

  async deleteProducto(id) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId).collection('inventario').doc(id).delete();
      this.inventario = this.inventario.filter(p => p.id !== id);
      inventario = this.inventario;
      window.inventario = this.inventario;
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  }

  // ── CRUD CLIENTES (usando subcolección de empresa) ──
  async addCliente(cliente) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      const { password, ...clienteData } = cliente;
      const docRef = await this.db.collection('empresas').doc(empresaId).collection('clientes').add(clienteData);
      const nuevoCliente = { id: docRef.id, ...clienteData };
      this.clientes.unshift(nuevoCliente);
      clientes = this.clientes;
      window.clientes = this.clientes;
      return nuevoCliente;
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      throw error;
    }
  }

  async updateCliente(id, updates) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId).collection('clientes').doc(id).update(updates);
      const index = this.clientes.findIndex(c => c.id === id);
      if (index !== -1) {
        this.clientes[index] = { ...this.clientes[index], ...updates };
      }
      clientes = this.clientes;
      window.clientes = this.clientes;
      return true;
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      throw error;
    }
  }

  async deleteCliente(id) {
    try {
      const empresaId = sessionStorage.getItem('empresaId');
      if (!empresaId) throw new Error('No hay empresa seleccionada');
      await this.db.collection('empresas').doc(empresaId).collection('clientes').doc(id).delete();
      this.clientes = this.clientes.filter(c => c.id !== id);
      clientes = this.clientes;
      window.clientes = this.clientes;
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      throw error;
    }
  }

  // ── AUTENTICACIÓN (ya no se usa para login, pero se mantiene) ──
  async registrarUsuario(email, password, nombre) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      throw error;
    }
  }

  async loginUsuario(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    }
  }

  async logoutUsuario() {
    try {
      await this.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }

  async getClientePorEmail(email) {
    // Ya no se usa, pero se mantiene
    const snapshot = await this.db.collection('clientes').where('phone', '==', email).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async getClientePorUid(uid) {
    // Ya no se usa, pero se mantiene
    const snapshot = await this.db.collection('clientes').where('uid', '==', uid).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
}

// ── INSTANCIA GLOBAL ──
const store = new DataStore();

// ── VARIABLES GLOBALES PARA RENDER ──
let ventas = [];
let inventario = [];
let clientes = [];

// ── SINCRONIZAR VARIABLES GLOBALES ──
function syncGlobals() {
  ventas = window.ventas || [];
  inventario = window.inventario || [];
  clientes = window.clientes || [];
  // Sincronizar store también
  store.ventas = ventas;
  store.inventario = inventario;
  store.clientes = clientes;
  store.cargado = true;
  console.log('🔄 syncGlobals: ventas:', ventas.length, 'inventario:', inventario.length, 'clientes:', clientes.length);
}

// ── INICIALIZAR STORE ──
async function initStore() {
  // Escuchar cambios de autenticación
  store.auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log('👤 Usuario autenticado:', user.email);
      
      try {
        // Buscar la empresa del usuario
        const empresasSnapshot = await firebase.firestore()
          .collectionGroup('usuarios')
          .where('uid', '==', user.uid)
          .get();
        
        if (!empresasSnapshot.empty) {
          const usuarioDoc = empresasSnapshot.docs[0];
          const empresaId = usuarioDoc.ref.parent.parent.id;
          const usuarioData = usuarioDoc.data();
          
          console.log('🏢 Empresa encontrada:', empresaId);
          
          // Guardar en sesión
          sessionStorage.setItem('empresaId', empresaId);
          sessionStorage.setItem('userEmail', user.email);
          sessionStorage.setItem('userName', usuarioData.nombre || user.email);
          sessionStorage.setItem('userRol', usuarioData.rol || 'usuario');
          
          // Cargar datos de la empresa (función de app.js)
          if (typeof window.cargarDatosEmpresa === 'function') {
            await window.cargarDatosEmpresa(empresaId);
          } else {
            console.warn('⚠️ window.cargarDatosEmpresa no está definida');
          }
          
          // Sincronizar variables globales
          syncGlobals();
          
          // Mostrar panel de cliente
          if (typeof window.mostrarPanelCliente === 'function') {
            window.mostrarPanelCliente();
          }
          
        } else {
          console.warn('⚠️ No se encontró empresa para el usuario');
        }
      } catch (error) {
        console.error('❌ Error cargando empresa:', error);
      }
      
    } else {
      console.log('👤 Usuario no autenticado');
      sessionStorage.clear();
    }
    
    // Renderizar después de la autenticación
    if (typeof renderVentas === 'function') {
      renderVentas('', filtroVentas || 'todas');
      renderInv('', filtroInv || 'todos');
      renderClients('', filtroCli || 'todos');
      if (typeof renderActividadReciente === 'function') renderActividadReciente();
      if (typeof updateKPIs === 'function') updateKPIs();
    }
  });

  // Render inicial
  if (typeof renderVentas === 'function') {
    renderVentas('', filtroVentas || 'todas');
    renderInv('', filtroInv || 'todos');
    renderClients('', filtroCli || 'todos');
    if (typeof renderActividadReciente === 'function') renderActividadReciente();
    if (typeof updateKPIs === 'function') updateKPIs();
  }

  console.log('🚀 Store inicializado con Firestore');
}

// ── ESTADO DE CLIENTE Y CARRITO ──
let clienteActual = null;
let carrito = [];

function guardarSesion() {
  localStorage.setItem('clienteActual', JSON.stringify(clienteActual));
}

function cargarSesion() {
  const saved = localStorage.getItem('clienteActual');
  if (saved) {
    try {
      clienteActual = JSON.parse(saved);
      return true;
    } catch { return false; }
  }
  return false;
}

function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
}

function cargarCarrito() {
  const saved = localStorage.getItem('carrito');
  if (saved) {
    try {
      carrito = JSON.parse(saved);
      return true;
    } catch { return false; }
  }
  return false;
}
