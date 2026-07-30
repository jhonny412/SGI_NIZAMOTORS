import Dashboard from "../pages/Dashboard";
import Productos from "../pages/Productos";
import Ventas from "../pages/Ventas";
import Movimientos from "../pages/Movimientos";
import Kardex from "../pages/Kardex";
import Proveedores from "../pages/Proveedores";
import Marcas from "../pages/Marcas";
import Categorias from "../pages/Categorias";
import Creditos from "../pages/Creditos";
import Auditoria from "../pages/Auditoria";


/**
 * Route Configuration registry.
 * Adheres to the Open/Closed Principle (OCP).
 * New pages can be extended here without altering App.jsx's core layout/switch statements.
 */
export const ROUTES = {
  dashboard: {
    id: "dashboard",
    component: Dashboard,
    roles: ["admin", "vendedor"],
    labelKey: "menu.inicio",
    icon: "dashboard"
  },
  ventas: {
    id: "ventas",
    component: Ventas,
    roles: ["admin", "vendedor"],
    labelKey: "menu.ventas",
    icon: "point_of_sale",
    group: "comercial",
    groupLabelKey: "menu.comercial",
    groupIcon: "payments"
  },
  creditos: {
    id: "creditos",
    component: Creditos,
    roles: ["admin", "vendedor"],
    labelKey: "menu.creditos",
    icon: "credit_card",
    group: "comercial",
    groupLabelKey: "menu.comercial",
    groupIcon: "payments"
  },
  productos: {
    id: "productos",
    component: Productos,
    roles: ["admin", "vendedor"],
    labelKey: "menu.productos",
    icon: "inventory_2",
    group: "inventario",
    groupLabelKey: "menu.inventario",
    groupIcon: "inventory_2"
  },
  categorias: {
    id: "categorias",
    component: Categorias,
    roles: ["admin"],
    labelKey: "menu.categorias",
    icon: "category",
    parent: "productos"
  },
  marcas: {
    id: "marcas",
    component: Marcas,
    roles: ["admin"],
    labelKey: "menu.marcas",
    icon: "sell",
    parent: "productos"
  },
  movimientos: {
    id: "movimientos",
    component: Movimientos,
    roles: ["admin"],
    labelKey: "menu.movimientos",
    icon: "history",
    group: "inventario",
    groupLabelKey: "menu.inventario",
    groupIcon: "inventory_2"
  },
  kardex: {
    id: "kardex",
    component: Kardex,
    roles: ["admin"],
    labelKey: "menu.kardex",
    icon: "timeline",
    group: "inventario",
    groupLabelKey: "menu.inventario",
    groupIcon: "inventory_2"
  },
  proveedores: {
    id: "proveedores",
    component: Proveedores,
    roles: ["admin"],
    labelKey: "menu.proveedores",
    icon: "local_shipping",
    group: "compras",
    groupLabelKey: "menu.compras",
    groupIcon: "local_shipping"
  },
  auditoria: {
    id: "auditoria",
    component: Auditoria,
    roles: ["superadmin"],
    labelKey: "menu.auditoria",
    icon: "security",
    group: "seguridad",
    groupLabelKey: "menu.seguridad",
    groupIcon: "shield"
  }
};

