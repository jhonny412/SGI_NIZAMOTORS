import { useInventory } from "../context/useInventory";
import { useAuth } from "../context/useAuth";
import { useUI } from "../context/useUI";
import { useTranslation } from "react-i18next";
import { SkeletonCard, SkeletonTable } from "../components/Skeleton";

export default function Dashboard() {
  const {
    totalProductos, valorInventario, valorVentaInventario,
    stockBajo, stockAgotado,
    cargando, ventas
  } = useInventory();
  const { setPaginaActiva } = useUI();
  const { usuarioActivo } = useAuth();
  const { t } = useTranslation();
  const esAdmin = usuarioActivo?.rol?.toLowerCase() === "admin";


  // Alert count
  const alertCount = stockBajo.length + stockAgotado.length;
  
  // Get critical items to display
  const criticalItems = [...stockAgotado, ...stockBajo].slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#334155]/60 pb-5">
        <div>
          <h2 className="text-xl font-black text-amber-500 uppercase tracking-tight">{t("pages.dashboard.title")}</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">{t("pages.dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#334155] bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-400 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 led-glow-green animate-pulse" />
          {t("pages.dashboard.updated")}
        </div>
      </div>

      {/* KPI Bento Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cargando ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* KPI 1: Total Products */}
            <div className="bento-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500 group relative">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-[100px]">inventory_2</span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{t("pages.dashboard.active_products")}</p>
                <h3 className="text-3xl font-black text-slate-100 mt-2">{totalProductos}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 relative z-10">
                <span className="text-amber-500 text-xs font-bold font-mono">+12%</span>
                <span className="text-slate-400 text-xs">este mes</span>
              </div>
            </div>

            {/* KPI 2: Inventory Value */}
            {esAdmin ? (
              <div className="bento-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500 group relative">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-[100px]">payments</span>
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{t("pages.dashboard.inventory_cost")}</p>
                  <h3 className="text-3xl font-black text-amber-500 mt-2">
                    S/. {valorInventario.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="mt-4 flex items-center gap-1.5 relative z-10">
                  <span className="text-emerald-400 text-xs font-bold">Valuación:</span>
                  <span className="text-slate-400 text-xs">S/. {valorVentaInventario.toLocaleString(undefined, { minimumFractionDigits: 2 })} (venta)</span>
                </div>
              </div>
            ) : (
              <div className="bento-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500 group relative">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-[100px]">point_of_sale</span>
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">VENTAS REALIZADAS</p>
                  <h3 className="text-3xl font-black text-amber-500 mt-2">
                    {ventas.length}
                  </h3>
                </div>
                <div className="mt-4 flex items-center gap-1.5 relative z-10">
                  <span className="text-emerald-400 text-xs font-bold">Estado:</span>
                  <span className="text-slate-400 text-xs">Operaciones comerciales activas</span>
                </div>
              </div>
            )}

            {/* KPI 3: System Status */}
            <div className="bento-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500 group relative">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-[100px]">check_circle</span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">ESTADO DEL SISTEMA</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 led-glow-green animate-pulse"></div>
                  <h3 className="text-xl font-bold text-slate-100">En línea</h3>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400 relative z-10">Sincronizado con Sheets en tiempo real</p>
            </div>
          </>
        )}
      </div>

      {/* Main Grid: Flow & Critical Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Flow Chart widget */}
        <div className="lg:col-span-8 bento-card p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-base font-black text-slate-200">Flujo de Inventario</h4>
              <p className="text-xs text-slate-400">Entradas vs Salidas (Simulación semanal)</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-wider transition-all">Semana</button>
              <button className="px-3 py-1 bg-slate-800 border border-[#334155] rounded-full text-[10px] font-bold text-slate-300 hover:text-white transition-all uppercase tracking-wider">Mes</button>
            </div>
          </div>

          <div className="flex items-end gap-4 min-h-[200px] pt-4 px-2">
            {/* Monday */}
            <div className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex gap-1 items-end h-[160px]">
                <div className="bg-slate-700/40 w-full rounded-t border-x border-t border-slate-700/60" style={{ height: "40%" }}></div>
                <div className="bg-amber-500 w-full rounded-t led-glow" style={{ height: "60%" }}></div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LUN</span>
            </div>
            {/* Tuesday */}
            <div className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex gap-1 items-end h-[160px]">
                <div className="bg-slate-700/40 w-full rounded-t border-x border-t border-slate-700/60" style={{ height: "55%" }}></div>
                <div className="bg-amber-500 w-full rounded-t led-glow" style={{ height: "45%" }}></div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MAR</span>
            </div>
            {/* Wednesday */}
            <div className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex gap-1 items-end h-[160px]">
                <div className="bg-slate-700/40 w-full rounded-t border-x border-t border-slate-700/60" style={{ height: "30%" }}></div>
                <div className="bg-amber-500 w-full rounded-t led-glow" style={{ height: "80%" }}></div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MIE</span>
            </div>
            {/* Thursday */}
            <div className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex gap-1 items-end h-[160px]">
                <div className="bg-slate-700/40 w-full rounded-t border-x border-t border-slate-700/60" style={{ height: "70%" }}></div>
                <div className="bg-amber-500 w-full rounded-t led-glow" style={{ height: "65%" }}></div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">JUE</span>
            </div>
            {/* Friday */}
            <div className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex gap-1 items-end h-[160px]">
                <div className="bg-slate-700/40 w-full rounded-t border-x border-t border-slate-700/60" style={{ height: "45%" }}></div>
                <div className="bg-amber-500 w-full rounded-t led-glow" style={{ height: "90%" }}></div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VIE</span>
            </div>
            {/* Saturday */}
            <div className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex gap-1 items-end h-[160px]">
                <div className="bg-slate-700/40 w-full rounded-t border-x border-t border-slate-700/60" style={{ height: "20%" }}></div>
                <div className="bg-amber-500 w-full rounded-t led-glow" style={{ height: "30%" }}></div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SAB</span>
            </div>
            {/* Sunday */}
            <div className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex gap-1 items-end h-[160px]">
                <div className="bg-slate-700/40 w-full rounded-t border-x border-t border-slate-700/60" style={{ height: "10%" }}></div>
                <div className="bg-amber-500 w-full rounded-t led-glow" style={{ height: "15%" }}></div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DOM</span>
            </div>
          </div>

          <div className="mt-6 flex gap-6 justify-center border-t border-[#334155]/60 pt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entradas (Repuestos)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-700 rounded-sm"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salidas (Servicios)</span>
            </div>
          </div>
        </div>

        {/* Critical Stock list */}
        <div className="lg:col-span-4 bento-card flex flex-col justify-between">
          <div className="p-5 bg-slate-950/20 border-b border-[#334155]/60 flex justify-between items-center">
            <h4 className="text-base font-black text-slate-200">Stock Crítico</h4>
            <span className="bg-red-500/15 text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1 uppercase tracking-wider">
              <span className="material-symbols-outlined text-xs leading-none">warning</span>
              {alertCount} ALERTAS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cargando ? (
              <div className="p-4"><SkeletonTable rows={4} cols={2} /></div>
            ) : criticalItems.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-[#334155]/30">
                    <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Pieza / SKU</th>
                    <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Cant.</th>
                    <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/20">
                  {criticalItems.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-500/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-250 truncate max-w-[140px] uppercase">{p.descripcion}</p>
                        <p className="text-[9px] text-amber-500 font-mono tracking-wider">{p.marca || "Niza"} • SKU-{p.codigo}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-xs font-black ${p.stock === 0 ? "text-red-400" : "text-amber-500"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setPaginaActiva("productos")} 
                          className="material-symbols-outlined text-amber-500 hover:scale-110 active:scale-95 transition-transform"
                        >
                          shopping_cart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2 leading-none">check_circle</span>
                <p className="text-xs font-bold text-emerald-400">{t("pages.dashboard.no_alerts")}</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setPaginaActiva("productos")}
            className="w-full py-3 text-center text-[10px] font-black tracking-widest text-amber-500 hover:bg-amber-500/10 transition-colors border-t border-[#334155]/60 bg-slate-950/40 uppercase"
          >
            Gestionar Pedidos Pendientes
          </button>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {esAdmin ? (
          <>
            <div 
              onClick={() => setPaginaActiva("productos")}
              className="bg-slate-900/60 border border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">add_box</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-100 group-hover:text-amber-500 transition-colors">Nuevo Producto</p>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">Cargar repuesto</p>
              </div>
            </div>

            <div 
              onClick={() => setPaginaActiva("ventas")}
              className="bg-slate-900/60 border border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">point_of_sale</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-100 group-hover:text-amber-500 transition-colors">Registrar Venta</p>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">Orden de servicio</p>
              </div>
            </div>

            <div 
              onClick={() => setPaginaActiva("productos")}
              className="bg-slate-900/60 border border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-100 group-hover:text-amber-500 transition-colors">Generar Reporte</p>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">Exportar inventario</p>
              </div>
            </div>

            <div 
              onClick={() => setPaginaActiva("movimientos")}
              className="bg-slate-900/60 border border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">history</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-100 group-hover:text-amber-500 transition-colors">Historial</p>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">Auditoría completa</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div 
              onClick={() => setPaginaActiva("productos")}
              className="bg-slate-900/60 border border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group col-span-2"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-100 group-hover:text-amber-500 transition-colors">Ver Catálogo de Repuestos</p>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">Buscar piezas y consultar stock</p>
              </div>
            </div>

            <div 
              onClick={() => setPaginaActiva("ventas")}
              className="bg-slate-900/60 border border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group col-span-2"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">point_of_sale</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-100 group-hover:text-amber-500 transition-colors">Registrar Nueva Venta</p>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">Orden de servicio y emisión rápida</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Details */}
      <footer className="mt-8 border-t border-[#334155]/30 pt-4 flex flex-col gap-3 md:flex-row md:justify-between md:items-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
        <p>© 2026 NIZA MOTORS • MIDNIGHT CHROME MANAGEMENT SYSTEM</p>
        <div className="flex gap-4">
          <span className="text-amber-500/80">VERSIÓN 2.4.0-STABLE</span>
          <span>SERVIDOR: CLOUD-AUTO-01</span>
        </div>
      </footer>
    </div>
  );
}
