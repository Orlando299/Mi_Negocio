// ── DATA STORE CON LOCALSTORAGE ──

// Datos iniciales (solo se usan si no hay datos guardados)
const DEFAULT_DATA = {
  ventas: [
    { id:'#V-0091', cliente:'María González', fecha:'Hoy, 10:32', items:3, total:'$45.00', status:'pagado' },
    { id:'#V-0090', cliente:'Carlos Pérez',   fecha:'Hoy, 09:15', items:1, total:'$18.50', status:'pagado' },
    { id:'#V-0089', cliente:'Ana Martínez',   fecha:'Hoy, 08:47', items:5, total:'$92.00', status:'pendiente' },
    { id:'#V-0088', cliente:'Luis Rodríguez', fecha:'Ayer, 17:20', items:2, total:'$34.00', status:'pagado' },
    { id:'#V-0087', cliente:'Rosa Salcedo',   fecha:'Ayer, 14:05', items:1, total:'$12.00', status:'cancelado' },
    { id:'#V-0086', cliente:'Pedro Gómez',    fecha:'Ayer, 11:30', items:4, total:'$67.50', status:'pendiente' },
    { id:'#V-0085', cliente:'Luisa Herrera',  fecha:'Hace 2 días', items:2, total:'$29.00', status:'pagado' },
  ],
  inventario: [
    { nombre:'Café Caracas 250g',   cat:'Bebidas',   precio:'$8.50',  stock:42, icon:'☕', estado:'ok' },
    { nombre:'Chocolate El Rey',    cat:'Dulces',    precio:'$6.00',  stock:28, icon:'🍫', estado:'ok' },
    { nombre:'Papelón de caña',     cat:'Endulzantes',precio:'$3.50', stock:15, icon:'🍯', estado:'ok' },
    { nombre:'Azúcar Morena 1kg',   cat:'Básicos',   precio:'$4.20',  stock:2,  icon:'🧂', estado:'low' },
    { nombre:'Caraotas negras',     cat:'Granos',    precio:'$5.00',  stock:8,  icon:'🫘', estado:'low' },
    { nombre:'Harina PAN 1kg',      cat:'Básicos',   precio:'$3.80',  stock:0,  icon:'🌽', estado:'out' },
    { nombre:'Queso blanco',        cat:'Lácteos',   precio:'$9.00',  stock:11, icon:'🧀', estado:'ok' },
    { nombre:'Aceite vegetal 1L',   cat:'Cocina',    precio:'$7.50',  stock:6,  icon:'🫙', estado:'low' },
  ],
  clientes: [
    { nombre:'María González', phone:'+58 414 111 2233', compras:'$310.50', pedidos:12, tag:'vip',     color:'#7C3AED', init:'MG' },
    { nombre:'Luis Rodríguez', phone:'+58 416 555 6677', compras:'$289.00', pedidos:9,  tag:'vip',     color:'#2563EB', init:'LR' },
    { nombre:'Ana Martínez',   phone:'+58 412 333 4455', compras:'$245.75', pedidos:8,  tag:'regular', color:'#059669', init:'AM' },
    { nombre:'Carlos Pérez',   phone:'+58 426 777 8899', compras:'$134.00', pedidos:5,  tag:'regular', color:'#D97706', init:'CP' },
    { nombre:'Rosa Salcedo',   phone:'+58 414 222 3344', compras:'$87.00',  pedidos:3,  tag:'regular', color:'#DC2626', init:'RS' },
    { nombre:'Pedro Gómez',    phone:'+58 418 444 5566', compras:'$32.00',  pedidos:2,  tag:'nuevo',   color:'#0891B2', init:'PG' },
    { nombre:'Luisa Herrera',  phone:'+58 412 999 0011', compras:'$29.00',  pedidos:1,  tag:'nuevo',   color:'#9333EA', init:'LH' },
  ]
};

// Clase DataStore: maneja la lectura/escritura en localStorage
class DataStore {
  constructor() {
    this.key = 'miNegocioData';
    this.load();
  }

  // Cargar datos desde localStorage o usar los default
  load() {
    const saved = localStorage.getItem(this.key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.ventas = data.ventas || DEFAULT_DATA.ventas;
        this.inventario = data.inventario || DEFAULT_DATA.inventario;
        this.clientes = data.clientes || DEFAULT_DATA.clientes;
      } catch (e) {
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
  }

  // Guardar datos en localStorage
  save() {
    localStorage.setItem(this.key, JSON.stringify({
      ventas: this.ventas,
      inventario: this.inventario,
      clientes: this.clientes
    }));
  }

  // Restaurar datos por defecto
  resetToDefaults() {
    this.ventas = JSON.parse(JSON.stringify(DEFAULT_DATA.ventas));
    this.inventario = JSON.parse(JSON.stringify(DEFAULT_DATA.inventario));
    this.clientes = JSON.parse(JSON.stringify(DEFAULT_DATA.clientes));
    this.save();
  }

  // ── MÉTODOS CRUD PARA VENTAS ──
  addVenta(venta) {
    // Generar ID automático
    const lastId = this.ventas.reduce((max, v) => {
      const num = parseInt(v.id.replace('#V-', ''));
      return num > max ? num : max;
    }, 0);
    const newId = '#V-' + String(lastId + 1).padStart(4, '0');
    venta.id = newId;
    this.ventas.unshift(venta);
    this.save();
    return venta;
  }

  updateVenta(id, updates) {
    const index = this.ventas.findIndex(v => v.id === id);
    if (index !== -1) {
      this.ventas[index] = { ...this.ventas[index], ...updates };
      this.save();
      return true;
    }
    return false;
  }

  deleteVenta(id) {
    this.ventas = this.ventas.filter(v => v.id !== id);
    this.save();
  }

  // ── MÉTODOS CRUD PARA INVENTARIO ──
  addProducto(producto) {
    this.inventario.unshift(producto);
    this.save();
    return producto;
  }

  updateProducto(nombre, updates) {
    const index = this.inventario.findIndex(p => p.nombre === nombre);
    if (index !== -1) {
      this.inventario[index] = { ...this.inventario[index], ...updates };
      this.save();
      return true;
    }
    return false;
  }

  deleteProducto(nombre) {
    this.inventario = this.inventario.filter(p => p.nombre !== nombre);
    this.save();
  }

  // ── MÉTODOS CRUD PARA CLIENTES ──
  addCliente(cliente) {
    // Generar iniciales si no vienen
    if (!cliente.init && cliente.nombre) {
      const parts = cliente.nombre.split(' ');
      cliente.init = parts.map(p => p.charAt(0).toUpperCase()).join('');
    }
    this.clientes.unshift(cliente);
    this.save();
    return cliente;
  }

  updateCliente(nombre, updates) {
    const index = this.clientes.findIndex(c => c.nombre === nombre);
    if (index !== -1) {
      this.clientes[index] = { ...this.clientes[index], ...updates };
      this.save();
      return true;
    }
    return false;
  }

  deleteCliente(nombre) {
    this.clientes = this.clientes.filter(c => c.nombre !== nombre);
    this.save();
  }
}

// Crear instancia global
const store = new DataStore();

// Para mantener compatibilidad con el código existente,
// exponemos las variables globales que ya se usan (ventas, inventario, clientes)
// pero ahora son referencias a los datos del store.
let ventas = store.ventas;
let inventario = store.inventario;
let clientes = store.clientes;

// Actualizar las referencias después de cada modificación
// (esto es opcional, pero útil si quieres usar las variables directamente)
function syncGlobals() {
  ventas = store.ventas;
  inventario = store.inventario;
  clientes = store.clientes;
}
