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
import ReportePage from "../pages/ReportePage";


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
    icon: "grid_view",
    iconColor: "text-sky-500 dark:text-sky-400"
  },
  ventas: {
    id: "ventas",
    component: Ventas,
    roles: ["admin", "vendedor"],
    labelKey: "menu.ventas",
    icon: "receipt_long",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    group: "comercial",
    groupLabelKey: "menu.comercial",
    groupIcon: "storefront",
    groupColor: "text-emerald-500 dark:text-emerald-400"
  },
  creditos: {
    id: "creditos",
    component: Creditos,
    roles: ["admin", "vendedor"],
    labelKey: "menu.creditos",
    icon: "credit_card",
    iconColor: "text-teal-500 dark:text-teal-400",
    group: "comercial",
    groupLabelKey: "menu.comercial",
    groupIcon: "storefront",
    groupColor: "text-emerald-500 dark:text-emerald-400"
  },
  productos: {
    id: "productos",
    component: Productos,
    roles: ["admin", "vendedor"],
    labelKey: "menu.productos",
    icon: "package_2",
    iconColor: "text-amber-500 dark:text-amber-400",
    group: "inventario",
    groupLabelKey: "menu.inventario",
    groupIcon: "inventory_2",
    groupColor: "text-amber-500 dark:text-amber-400"
  },
  categorias: {
    id: "categorias",
    component: Categorias,
    roles: ["admin"],
    labelKey: "menu.categorias",
    icon: "category",
    iconColor: "text-orange-500 dark:text-orange-400",
    group: "inventario",
    groupLabelKey: "menu.inventario",
    groupIcon: "inventory_2",
    groupColor: "text-amber-500 dark:text-amber-400"
  },
  marcas: {
    id: "marcas",
    component: Marcas,
    roles: ["admin"],
    labelKey: "menu.marcas",
    icon: "label",
    iconColor: "text-yellow-500 dark:text-yellow-400",
    group: "inventario",
    groupLabelKey: "menu.inventario",
    groupIcon: "inventory_2",
    groupColor: "text-amber-500 dark:text-amber-400"
  },
  movimientos: {
    id: "movimientos",
    component: Movimientos,
    roles: ["admin"],
    labelKey: "menu.movimientos",
    icon: "swap_vert",
    iconColor: "text-amber-600 dark:text-amber-400",
    group: "inventario",
    groupLabelKey: "menu.inventario",
    groupIcon: "inventory_2",
    groupColor: "text-amber-500 dark:text-amber-400"
  },
  kardex: {
    id: "kardex",
    component: Kardex,
    roles: ["admin"],
    labelKey: "menu.kardex",
    icon: "timeline",
    iconColor: "text-orange-600 dark:text-orange-400",
    group: "inventario",
    groupLabelKey: "menu.inventario",
    groupIcon: "inventory_2",
    groupColor: "text-amber-500 dark:text-amber-400"
  },
  proveedores: {
    id: "proveedores",
    component: Proveedores,
    roles: ["admin"],
    labelKey: "menu.proveedores",
    icon: "badge",
    iconColor: "text-indigo-500 dark:text-indigo-400",
    group: "compras",
    groupLabelKey: "menu.compras",
    groupIcon: "shopping_bag",
    groupColor: "text-indigo-500 dark:text-indigo-400"
  },
  auditoria: {
    id: "auditoria",
    component: Auditoria,
    roles: ["superadmin"],
    labelKey: "menu.auditoria",
    icon: "security",
    iconColor: "text-rose-500 dark:text-rose-400",
    group: "seguridad",
    groupLabelKey: "menu.seguridad",
    groupIcon: "shield",
    groupColor: "text-rose-500 dark:text-rose-400"
  },
  "reporte-ventas": {
    id: "reporte-ventas",
    component: ReportePage,
    roles: ["admin", "vendedor"],
    labelKey: "menu.reporte_ventas",
    icon: "analytics",
    iconColor: "text-purple-500 dark:text-purple-400",
    group: "reportes",
    groupLabelKey: "menu.reportes",
    groupIcon: "insights",
    groupColor: "text-purple-500 dark:text-purple-400"
  },
  "reporte-ingresos": {
    id: "reporte-ingresos",
    component: ReportePage,
    roles: ["admin"],
    labelKey: "menu.reporte_ingresos",
    icon: "arrow_circle_down",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    group: "reportes",
    groupLabelKey: "menu.reportes",
    groupIcon: "insights",
    groupColor: "text-purple-500 dark:text-purple-400"
  },
  "reporte-salidas": {
    id: "reporte-salidas",
    component: ReportePage,
    roles: ["admin"],
    labelKey: "menu.reporte_salidas",
    icon: "arrow_circle_up",
    iconColor: "text-rose-500 dark:text-rose-400",
    group: "reportes",
    groupLabelKey: "menu.reportes",
    groupIcon: "insights",
    groupColor: "text-purple-500 dark:text-purple-400"
  },
  "reporte-kardex": {
    id: "reporte-kardex",
    component: ReportePage,
    roles: ["admin", "vendedor"],
    labelKey: "menu.reporte_kardex",
    icon: "timeline",
    iconColor: "text-amber-500 dark:text-amber-400",
    group: "reportes",
    groupLabelKey: "menu.reportes",
    groupIcon: "insights",
    groupColor: "text-purple-500 dark:text-purple-400"
  },
};

