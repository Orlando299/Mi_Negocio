// ── DATOS DE MUESTRA ──

const ventas = [
  { id:'#V-0091', cliente:'María González', fecha:'Hoy, 10:32', items:3, total:'$45.00', status:'pagado' },
  { id:'#V-0090', cliente:'Carlos Pérez',   fecha:'Hoy, 09:15', items:1, total:'$18.50', status:'pagado' },
  { id:'#V-0089', cliente:'Ana Martínez',   fecha:'Hoy, 08:47', items:5, total:'$92.00', status:'pendiente' },
  { id:'#V-0088', cliente:'Luis Rodríguez', fecha:'Ayer, 17:20', items:2, total:'$34.00', status:'pagado' },
  { id:'#V-0087', cliente:'Rosa Salcedo',   fecha:'Ayer, 14:05', items:1, total:'$12.00', status:'cancelado' },
  { id:'#V-0086', cliente:'Pedro Gómez',    fecha:'Ayer, 11:30', items:4, total:'$67.50', status:'pendiente' },
  { id:'#V-0085', cliente:'Luisa Herrera',  fecha:'Hace 2 días', items:2, total:'$29.00', status:'pagado' },
];

const inventario = [
  { nombre:'Café Caracas 250g',   cat:'Bebidas',   precio:'$8.50',  stock:42, icon:'☕', estado:'ok' },
  { nombre:'Chocolate El Rey',    cat:'Dulces',    precio:'$6.00',  stock:28, icon:'🍫', estado:'ok' },
  { nombre:'Papelón de caña',     cat:'Endulzantes',precio:'$3.50', stock:15, icon:'🍯', estado:'ok' },
  { nombre:'Azúcar Morena 1kg',   cat:'Básicos',   precio:'$4.20',  stock:2,  icon:'🧂', estado:'low' },
  { nombre:'Caraotas negras',     cat:'Granos',    precio:'$5.00',  stock:8,  icon:'🫘', estado:'low' },
  { nombre:'Harina PAN 1kg',      cat:'Básicos',   precio:'$3.80',  stock:0,  icon:'🌽', estado:'out' },
  { nombre:'Queso blanco',        cat:'Lácteos',   precio:'$9.00',  stock:11, icon:'🧀', estado:'ok' },
  { nombre:'Aceite vegetal 1L',   cat:'Cocina',    precio:'$7.50',  stock:6,  icon:'🫙', estado:'low' },
];

const clientes = [
  { nombre:'María González', phone:'+58 414 111 2233', compras:'$310.50', pedidos:12, tag:'vip',     color:'#7C3AED', init:'MG' },
  { nombre:'Luis Rodríguez', phone:'+58 416 555 6677', compras:'$289.00', pedidos:9,  tag:'vip',     color:'#2563EB', init:'LR' },
  { nombre:'Ana Martínez',   phone:'+58 412 333 4455', compras:'$245.75', pedidos:8,  tag:'regular', color:'#059669', init:'AM' },
  { nombre:'Carlos Pérez',   phone:'+58 426 777 8899', compras:'$134.00', pedidos:5,  tag:'regular', color:'#D97706', init:'CP' },
  { nombre:'Rosa Salcedo',   phone:'+58 414 222 3344', compras:'$87.00',  pedidos:3,  tag:'regular', color:'#DC2626', init:'RS' },
  { nombre:'Pedro Gómez',    phone:'+58 418 444 5566', compras:'$32.00',  pedidos:2,  tag:'nuevo',   color:'#0891B2', init:'PG' },
  { nombre:'Luisa Herrera',  phone:'+58 412 999 0011', compras:'$29.00',  pedidos:1,  tag:'nuevo',   color:'#9333EA', init:'LH' },
];
