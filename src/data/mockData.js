const proveedores = [
  { id: 1, nombre: "TechParts MX", telefono: "555-1001", email: "ventas@techparts.mx" },
  { id: 2, nombre: "Distribuidora Gamer", telefono: "555-1002", email: "info@dgamer.com" },
  { id: 3, nombre: "Componentes PC Norte", telefono: "555-1003", email: "contacto@cpcnorte.com" },
  { id: 4, nombre: "Importadora Digital", telefono: "555-1004", email: "ventas@importdigital.com" },
  { id: 5, nombre: "Soluciones TI Global", telefono: "555-1005", email: "soporte@soltiglobal.com" },
];

const productos = [
  { id: 1, oem: "INT-I7-13700K", codigo: "CPU-001", descripcion: "Procesador Intel Core i7-13700K", categoria: "Procesadores", marca: "Intel", stock: 25, pCompra: 8500, margGanancia: 25, pVenta: 11333.33, utilidad: 2833.33, proveedorId: 1 },
  { id: 2, oem: "AMD-R7-7800X", codigo: "CPU-002", descripcion: "Procesador AMD Ryzen 7 7800X3D", categoria: "Procesadores", marca: "AMD", stock: 3, pCompra: 9200, margGanancia: 22, pVenta: 11794.87, utilidad: 2594.87, proveedorId: 2 },
  { id: 3, oem: "ASUS-Z790-P", codigo: "MB-001", descripcion: "Tarjeta Madre ASUS PRIME Z790-P", categoria: "Tarjetas Madre", marca: "ASUS", stock: 0, pCompra: 5200, margGanancia: 30, pVenta: 7428.57, utilidad: 2228.57, proveedorId: 1 },
  { id: 4, oem: "GIG-B650-A", codigo: "MB-002", descripcion: "Tarjeta Madre Gigabyte B650 AORUS Elite", categoria: "Tarjetas Madre", marca: "Gigabyte", stock: 8, pCompra: 4800, margGanancia: 28, pVenta: 6666.67, utilidad: 1866.67, proveedorId: 3 },
  { id: 5, oem: "COR-32GB-D5", codigo: "RAM-001", descripcion: "Memoria Corsair Vengeance 32GB DDR5", categoria: "Memoria RAM", marca: "Corsair", stock: 50, pCompra: 2800, margGanancia: 20, pVenta: 3500, utilidad: 700, proveedorId: 4 },
  { id: 6, oem: "KST-16GB-D4", codigo: "RAM-002", descripcion: "Memoria Kingston Fury 16GB DDR4", categoria: "Memoria RAM", marca: "Kingston", stock: 2, pCompra: 1200, margGanancia: 35, pVenta: 1846.15, utilidad: 646.15, proveedorId: 4 },
  { id: 7, oem: "SAM-990PRO2T", codigo: "SSD-001", descripcion: "SSD Samsung 990 PRO 2TB NVMe", categoria: "Almacenamiento", marca: "Samsung", stock: 15, pCompra: 3800, margGanancia: 18, pVenta: 4634.15, utilidad: 834.15, proveedorId: 1 },
  { id: 8, oem: "WD-1TB-BLK", codigo: "SSD-002", descripcion: "SSD WD Black SN850X 1TB NVMe", categoria: "Almacenamiento", marca: "Western Digital", stock: 12, pCompra: 2200, margGanancia: 25, pVenta: 2933.33, utilidad: 733.33, proveedorId: 5 },
  { id: 9, oem: "NVD-RTX4070", codigo: "GPU-001", descripcion: "Tarjeta Video NVIDIA RTX 4070 12GB", categoria: "Tarjetas de Video", marca: "NVIDIA", stock: 6, pCompra: 14500, margGanancia: 15, pVenta: 17058.82, utilidad: 2558.82, proveedorId: 2 },
  { id: 10, oem: "AMD-RX7800", codigo: "GPU-002", descripcion: "Tarjeta Video AMD Radeon RX 7800 XT", categoria: "Tarjetas de Video", marca: "AMD", stock: 4, pCompra: 12800, margGanancia: 16, pVenta: 15238.10, utilidad: 2438.10, proveedorId: 3 },
  { id: 11, oem: "EVG-750-GQ", codigo: "PSU-001", descripcion: "Fuente de Poder EVGA 750W GQ 80+ Gold", categoria: "Fuentes de Poder", marca: "EVGA", stock: 18, pCompra: 2100, margGanancia: 22, pVenta: 2692.31, utilidad: 592.31, proveedorId: 5 },
  { id: 12, oem: "CM-MWE850", codigo: "PSU-002", descripcion: "Fuente Cooler Master MWE 850W Gold", categoria: "Fuentes de Poder", marca: "Cooler Master", stock: 10, pCompra: 2600, margGanancia: 20, pVenta: 3250, utilidad: 650, proveedorId: 2 },
  { id: 13, oem: "NZXT-H5FLW", codigo: "CASE-001", descripcion: "Gabinete NZXT H5 Flow", categoria: "Gabinetes", marca: "NZXT", stock: 7, pCompra: 1900, margGanancia: 30, pVenta: 2714.29, utilidad: 814.29, proveedorId: 1 },
  { id: 14, oem: "LG-27GP850", codigo: "MON-001", descripcion: "Monitor LG 27'' UltraGear 1440p 165Hz", categoria: "Monitores", marca: "LG", stock: 5, pCompra: 7500, margGanancia: 18, pVenta: 9146.34, utilidad: 1646.34, proveedorId: 4 },
  { id: 15, oem: "LOG-G502X", codigo: "PER-001", descripcion: "Mouse Logitech G502 X Plus", categoria: "Periféricos", marca: "Logitech", stock: 20, pCompra: 1800, margGanancia: 25, pVenta: 2400, utilidad: 600, proveedorId: 4 },
  { id: 16, oem: "RAZ-BW-V4", codigo: "PER-002", descripcion: "Teclado Razer BlackWidow V4", categoria: "Periféricos", marca: "Razer", stock: 1, pCompra: 3200, margGanancia: 28, pVenta: 4444.44, utilidad: 1244.44, proveedorId: 2 },
  { id: 17, oem: "HYPC-1TB", codigo: "SSD-003", descripcion: "SSD HyperX Cloud 1TB SATA", categoria: "Almacenamiento", marca: "HyperX", stock: 14, pCompra: 1500, margGanancia: 22, pVenta: 1923.08, utilidad: 423.08, proveedorId: 3 },
  { id: 18, oem: "NOCT-NH-D15", codigo: "COOL-001", descripcion: "Enfriador Noctua NH-D15 Cromax", categoria: "Refrigeración", marca: "Noctua", stock: 0, pCompra: 2400, margGanancia: 25, pVenta: 3200, utilidad: 800, proveedorId: 5 },
  { id: 19, oem: "MSI-MAG321", codigo: "MON-002", descripcion: "Monitor MSI MAG321CURV 4K 144Hz", categoria: "Monitores", marca: "MSI", stock: 3, pCompra: 11000, margGanancia: 12, pVenta: 12500, utilidad: 1500, proveedorId: 1 },
  { id: 20, oem: "ASUS-RT-AX", codigo: "NET-001", descripcion: "Router ASUS RT-AX86U Pro WiFi 6", categoria: "Redes", marca: "ASUS", stock: 9, pCompra: 4500, margGanancia: 20, pVenta: 5625, utilidad: 1125, proveedorId: 5 },
];

const movimientos = [
  { id: 1, productoId: 1, tipo: "entrada", cantidad: 10, fecha: "2026-04-15", motivo: "Compra inicial", stockAnterior: 15, stockNuevo: 25 },
  { id: 2, productoId: 5, tipo: "entrada", cantidad: 20, fecha: "2026-04-18", motivo: "Reabastecimiento", stockAnterior: 30, stockNuevo: 50 },
  { id: 3, productoId: 3, tipo: "salida", cantidad: 5, fecha: "2026-04-20", motivo: "Venta mayorista", stockAnterior: 5, stockNuevo: 0 },
  { id: 4, productoId: 7, tipo: "entrada", cantidad: 8, fecha: "2026-04-22", motivo: "Compra proveedor", stockAnterior: 7, stockNuevo: 15 },
  { id: 5, productoId: 2, tipo: "salida", cantidad: 2, fecha: "2026-04-25", motivo: "Venta al cliente", stockAnterior: 5, stockNuevo: 3 },
  { id: 6, productoId: 9, tipo: "entrada", cantidad: 6, fecha: "2026-05-01", motivo: "Nuevo ingreso", stockAnterior: 0, stockNuevo: 6 },
  { id: 7, productoId: 16, tipo: "salida", cantidad: 3, fecha: "2026-05-02", motivo: "Venta", stockAnterior: 4, stockNuevo: 1 },
  { id: 8, productoId: 14, tipo: "entrada", cantidad: 5, fecha: "2026-05-03", motivo: "Compra a proveedor", stockAnterior: 0, stockNuevo: 5 },
  { id: 9, productoId: 18, tipo: "salida", cantidad: 4, fecha: "2026-05-04", motivo: "Venta urgente", stockAnterior: 4, stockNuevo: 0 },
  { id: 10, productoId: 6, tipo: "salida", cantidad: 1, fecha: "2026-05-05", motivo: "Venta mostrador", stockAnterior: 3, stockNuevo: 2 },
  { id: 11, productoId: 1, tipo: "salida", cantidad: 3, fecha: "2026-05-06", motivo: "Venta", stockAnterior: 25, stockNuevo: 22 },
  { id: 12, productoId: 4, tipo: "entrada", cantidad: 5, fecha: "2026-05-07", motivo: "Devolución de cliente", stockAnterior: 3, stockNuevo: 8 },
];

export { productos, proveedores, movimientos };
