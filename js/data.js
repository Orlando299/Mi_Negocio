// ── DATA STORE CON FIRESTORE ──

class DataStore {
  constructor() {
    this.db = window.db;
    this.auth = window.auth;
    this.ventas = [];
    this.inventario = [];
    this.clientes = [];
    this.cargado = false;
  }

  // ── CARGAR DATOS DESDE FIRESTORE ──
  async cargarDatos() {
    try {
      const [ventasSnap, invSnap, clientesSnap] = await Promise.all([
        this.db.collection('ventas').orderBy('fecha', 'desc').get(),
        this.db.collection('inventario').get(),
        this.db.collection('clientes').get()
      ]);

      this.ventas = ventasSnap.docs.map(doc => {
        const data = doc.data();
        // Convertir timestamp a string si existe
        if (data.fecha && data.fecha.toDate) {
          data.fecha = data.fecha.toDate().toLocaleString();
        }
        return { id: doc.id, ...data };
      });

      this.inventario = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.clientes = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      this.cargado = true;
      console.log('📦 Datos cargados desde Firestore:', this.ventas.length, 'ventas');
      return true;
    } catch (error) {
      console.error('Error al cargar datos:', error);
      return false;
    }
  }
  

  // ── CRUD VENTAS ──
  async addVenta(venta) {
    try {
      const docRef = await this.db.collection('ventas').add({
        ...venta,
        fecha: new Date().toISOString()
      });
      const nuevaVenta = { id: docRef.id, ...venta, fecha: new Date().toLocaleString() };
      this.ventas.unshift(nuevaVenta);
      return nuevaVenta;
    } catch (error) {
      console.error('Error al agregar venta:', error);
      throw error;
    }
  }

  async updateVenta(id, updates) {
    try {
      await this.db.collection('ventas').doc(id).update(updates);
      const index = this.ventas.findIndex(v => v.id === id);
      if (index !== -1) {
        this.ventas[index] = { ...this.ventas[index], ...updates };
      }
      return true;
    } catch (error) {
      console.error('Error al actualizar venta:', error);
      throw error;
    }
  }

  async deleteVenta(id) {
    try {
      await this.db.collection('ventas').doc(id).delete();
      this.ventas = this.ventas.filter(v => v.id !== id);
    } catch (error) {
      console.error('Error al eliminar venta:', error);
      throw error;
    }
  }

  // ── CRUD INVENTARIO ──
  async addProducto(producto) {
    try {
      const docRef = await this.db.collection('inventario').add(producto);
      const nuevoProducto = { id: docRef.id, ...producto };
      this.inventario.unshift(nuevoProducto);
      return nuevoProducto;
    } catch (error) {
      console.error('Error al agregar producto:', error);
      throw error;
    }
  }

  async updateProducto(id, updates) {
    try {
      await this.db.collection('inventario').doc(id).update(updates);
      const index = this.inventario.findIndex(p => p.id === id);
      if (index !== -1) {
        this.inventario[index] = { ...this.inventario[index], ...updates };
      }
      return true;
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }
  }

  async deleteProducto(id) {
    try {
      await this.db.collection('inventario').doc(id).delete();
      this.inventario = this.inventario.filter(p => p.id !== id);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  }

  // ── CRUD CLIENTES ──
  async addCliente(cliente) {
    try {
      // No guardamos password en Firestore por seguridad
      const { password, ...clienteData } = cliente;
      const docRef = await this.db.collection('clientes').add(clienteData);
      const nuevoCliente = { id: docRef.id, ...clienteData };
      this.clientes.unshift(nuevoCliente);
      return nuevoCliente;
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      throw error;
    }
  }

  async updateCliente(id, updates) {
    try {
      await this.db.collection('clientes').doc(id).update(updates);
      const index = this.clientes.findIndex(c => c.id === id);
      if (index !== -1) {
        this.clientes[index] = { ...this.clientes[index], ...updates };
      }
      return true;
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      throw error;
    }
  }

  async deleteCliente(id) {
    try {
      await this.db.collection('clientes').doc(id).delete();
      this.clientes = this.clientes.filter(c => c.id !== id);
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      throw error;
    }
  }

  // ── AUTENTICACIÓN ──
  async registrarUsuario(email, password, nombre) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      // Crear cliente en Firestore
      const cliente = {
        nombre: nombre,
        phone: email,
        compras: '$0.00',
        pedidos: 0,
        tag: 'nuevo',
        color: '#6B7280',
        init: nombre.split(' ').map(p => p.charAt(0).toUpperCase()).join(''),
        uid: user.uid
      };
      await this.db.collection('clientes').add(cliente);
      return user;
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
    const snapshot = await this.db.collection('clientes').where('phone', '==', email).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async getClientePorUid(uid) {
    const snapshot = await this.db.collection('clientes').where('uid', '==', uid).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
}

// Crear instancia global
const store = new DataStore();

// Variables globales para render.js
let ventas = [];
let inventario = [];
let clientes = [];

function syncGlobals() {
  ventas = store.ventas;
  inventario = store.inventario;
  clientes = store.clientes;
}

// ── INICIALIZAR STORE (cargar datos y autenticación) ──
async function initStore() {
  // Cargar datos
  await store.cargarDatos();
  syncGlobals();

  // Verificar sesión de Firebase
  store.auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log('👤 Usuario autenticado:', user.email);
      const clienteData = await store.getClientePorUid(user.uid);
      if (clienteData) {
        clienteActual = clienteData;
        guardarSesion();
        // Si estamos en la pantalla cliente, mostrar panel
        const screen = document.querySelector('.screen.active');
        if (screen && screen.id === 'screen-cliente') {
          mostrarPanelCliente();
        }
      }
    } else {
      console.log('👤 Usuario no autenticado');
    }
    // Renderizar después de cargar autenticación
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

// ── ESTADO DE CLIENTE Y CARRITO (persistencia local) ──
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
