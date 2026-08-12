// ──────────────────────────────────────────────────────────────────────────────
// src/types/index.ts — Tipos de dominio globales del sistema SGI (NIZA MOTORS)
// ──────────────────────────────────────────────────────────────────────────────

// ── Autenticación ─────────────────────────────────────────────────────────────

export type Rol = "Admin" | "SuperAdmin" | "Vendedor";
export type Avatar = "admin" | "superadmin" | "vendedor";

export interface Usuario {
  id: number;
  nombre: string;
  pin: string;
  rol: Rol;
  avatar: Avatar;
}

// ── Inventario ────────────────────────────────────────────────────────────────

export interface Producto {
  id: number;
  codigo?: string;
  descripcion: string;
  marca?: string;
  categoria?: string;
  oem?: string;
  ubicacion?: string;
  stock: number;
  stockMinimo?: number;
  pCompra: number;
  margGanancia: number;
  pVenta: number;
  proveedorId?: number | null;
  activo?: boolean;
}

export interface Proveedor {
  id: number;
  nombre: string;
  ruc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
}

export interface Marca {
  id: number;
  nombre: string;
}

export interface Categoria {
  id: number;
  nombre: string;
}

// ── Ventas ────────────────────────────────────────────────────────────────────

export type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "YAPE" | "PLIN";

export interface ItemVenta {
  productoId: number;
  descripcion: string;
  codigo?: string;
  cantidad: number;
  pVenta: number;
  pCompra: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  boleta?: string;
  fecha: string;
  cliente?: string;
  metodoPago: MetodoPago;
  items: ItemVenta[];
  totalVenta: number;
  utilidad?: number;
  cantidadTotal?: number;
  usuario?: string;
}

// ── Movimientos ───────────────────────────────────────────────────────────────

export type TipoMovimiento = "entrada" | "salida";

export interface Movimiento {
  id: number;
  productoId: number;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo?: string;
  fecha: string;
  stockAnterior?: number;
  stockNuevo?: number;
  usuario?: string;
}

// ── UI ────────────────────────────────────────────────────────────────────────

export type Tema = "light" | "dark";

export interface RouteConfig {
  id: string;
  component: React.LazyExoticComponent<React.ComponentType> | React.ComponentType;
  roles: string[];
  labelKey: string;
  icon: string;
  iconColor: string;
  group?: string;
  groupLabelKey?: string;
  groupIcon?: string;
  groupColor?: string;
}
