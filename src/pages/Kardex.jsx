import { useState, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation, Trans } from "react-i18next";
import { SkeletonTable } from "../components/Skeleton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";

export default function Kardex() {
  const { movimientos, productos, cargando, formatFecha } = useInventory();
  const { t } = useTranslation();
  const [productoId, setProductoId] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: "fecha", dir: "desc" }); // Default desc for latest
  const itemsPorPagina = 8;

  const productoSeleccionado = productoId
    ? productos.find((p) => p.id === parseInt(productoId))
    : null;

  const kardexFiltrado = useMemo(() => {
    let data = productoId
      ? movimientos.filter((m) => m.productoId === parseInt(productoId))
      : [...movimientos];

    if (filtroTipo !== "todos") data = data.filter((m) => m.tipo === filtroTipo);
    if (fechaDesde) {
      data = data.filter((m) => {
        const dateOnly = m.fecha.includes("T") ? m.fecha.split("T")[0] : m.fecha;
        return dateOnly >= fechaDesde;
      });
    }
    if (fechaHasta) {
      data = data.filter((m) => {
        const dateOnly = m.fecha.includes("T") ? m.fecha.split("T")[0] : m.fecha;
        return dateOnly <= fechaHasta;
      });
    }

    data.sort((a, b) => {
      let va = a[orden.campo];
      let vb = b[orden.campo];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return orden.dir === "asc" ? -1 : 1;
      if (va > vb) return orden.dir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [movimientos, productoId, filtroTipo, fechaDesde, fechaHasta, orden]);

  const totalPaginas = Math.ceil(kardexFiltrado.length / itemsPorPagina);
  const itemsPagina = kardexFiltrado.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);

  const getProductoCodigo = (id) => {
    const p = productos.find((prod) => prod.id === id);
    return p ? p.codigo : "";
  };

  const getProductoDescripcion = (id) => {
    const p = productos.find((prod) => prod.id === id);
    return p ? p.descripcion : "Producto eliminado";
  };

  function toggleSort(campo) {
    setOrden((prev) => ({ campo, dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc" }));
  }

  // Daily snapshots calculations
  const snapshots = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    const entradasHoy = movimientos.filter(m => {
      const dateOnly = m.fecha.includes("T") ? m.fecha.split("T")[0] : m.fecha;
      return dateOnly === todayStr && m.tipo === "entrada";
    }).reduce((sum, m) => sum + m.cantidad, 0);

    const salidasHoy = movimientos.filter(m => {
      const dateOnly = m.fecha.includes("T") ? m.fecha.split("T")[0] : m.fecha;
      return dateOnly === todayStr && m.tipo === "salida";
    }).reduce((sum, m) => sum + m.cantidad, 0);

    const stockCriticoCount = productos.filter(p => p.stock <= 5).length;

    return {
      entradasHoy,
      salidasHoy,
      stockCriticoCount
    };
  }, [movimientos, productos]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-100 tracking-tight">{t("pages.kardex.title")}</h2>
          <p className="text-slate-400 font-medium">Control detallado y trazabilidad total de entradas y salidas de repuestos.</p>
        </div>
      </div>

      {/* Filter Section (Glass Card Style) */}
      <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t("pages.kardex.filters.product")}</label>
            <div className="relative">
              <select 
                value={productoId} 
                onChange={(e) => { setProductoId(e.target.value); setPagina(1); }} 
                className="select-field w-full"
              >
                <option value="">{t("pages.kardex.filters.all_products")}</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>[{p.codigo}] {p.descripcion}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t("pages.kardex.filters.type")}</label>
            <div className="relative">
              <select 
                value={filtroTipo} 
                onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1); }} 
                className="select-field w-full"
              >
                <option value="todos">{t("pages.kardex.filters.all")}</option>
                <option value="entrada">{t("pages.movimientos.entries")}</option>
                <option value="salida">{t("pages.movimientos.exits")}</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t("pages.kardex.filters.date_from")}</label>
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={(e) => { setFechaDesde(e.target.value); setPagina(1); }} 
              className="input-field" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t("pages.kardex.filters.date_to")}</label>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={(e) => { setFechaHasta(e.target.value); setPagina(1); }} 
              className="input-field" 
            />
          </div>
        </div>
      </div>

      {/* Selected Product info overview */}
      {productoSeleccionado && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4.5 flex flex-wrap gap-x-8 gap-y-3 text-sm shadow-sm animate-fade-in">
          <span className="font-extrabold text-amber-500">[{productoSeleccionado.codigo}] {productoSeleccionado.descripcion}</span>
          <span className="text-slate-400">{t("pages.kardex.info.stock")}: <strong className={productoSeleccionado.stock <= 5 ? "text-red-400 font-extrabold" : "text-emerald-400 font-extrabold"}>{productoSeleccionado.stock} u.</strong></span>
          <span className="text-slate-400">{t("pages.kardex.info.supplier")}: <strong className="text-slate-200 font-bold">{productoSeleccionado.proveedorNombre}</strong></span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-[#1c253b] rounded-xl border border-[#334155] overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="p-6"><SkeletonTable rows={itemsPorPagina} cols={productoId ? 6 : 7} /></div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-[#334155]">
                    <SortableTh campo="fecha" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.date")}</SortableTh>
                    {!productoId && <SortableTh campo="productoId" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.product")}</SortableTh>}
                    <SortableTh campo="tipo" align="center" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.type")}</SortableTh>
                    <SortableTh campo="cantidad" align="right" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.quantity")}</SortableTh>
                    <SortableTh campo="stockAnterior" align="right" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.stock_ant")}</SortableTh>
                    <SortableTh campo="stockNuevo" align="right" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.stock_new")}</SortableTh>
                    <SortableTh campo="motivo" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.reason")}</SortableTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/20">
                  {itemsPagina.map((m) => (
                    <tr 
                      key={m.id} 
                      className={`hover:bg-[#131b2e] transition-colors border-l-4 ${m.tipo === "entrada" 
                        ? "border-l-emerald-500 hover:bg-emerald-500/5" 
                        : "border-l-red-500 hover:bg-red-500/5"}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs text-slate-200">{formatFecha(m.fecha).split(" ")[0]}</div>
                        <div className="text-[9px] text-slate-500 tracking-wider mt-0.5">{formatFecha(m.fecha).split(" ")[1] || ""}</div>
                      </td>
                      {!productoId && (
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs text-amber-500 font-bold">[{getProductoCodigo(m.productoId)}]</div>
                          <div className="relative group cursor-help mt-1">
                            <div className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{getProductoDescripcion(m.productoId)}</div>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-950 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-[#334155] shadow-xl z-50 whitespace-normal min-w-[200px] max-w-xs text-center font-normal">
                              {getProductoDescripcion(m.productoId)}
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-4 text-center">
                        <span className={m.tipo === "entrada" ? "badge-success" : "badge-danger"}>
                          {m.tipo === "entrada" ? t("pages.dashboard.entry").toUpperCase() : t("pages.dashboard.exit").toUpperCase()}
                        </span>
                      </td>
                      <td className={`px-5 py-4 text-right font-bold font-mono text-sm ${m.tipo === "entrada" ? "text-emerald-400" : "text-red-400"}`}>
                        {m.tipo === "entrada" ? "+" : "-"}{m.cantidad}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-xs text-slate-450">{m.stockAnterior}</td>
                      <td className="px-5 py-4 text-right font-mono text-xs font-bold text-slate-200">{m.stockNuevo}</td>
                      <td className="px-5 py-4 text-slate-400 text-xs italic">{m.motivo}</td>
                    </tr>
                  ))}
                  {itemsPagina.length === 0 && (
                    <tr>
                      <td colSpan={productoId ? 6 : 7} className="py-12 text-center text-slate-450 italic">
                        {t("pages.kardex.no_movements")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination & Stats */}
              {totalPaginas > 1 && (
                <div className="p-4 bg-slate-950/20 border-t border-[#334155]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-slate-450 font-medium">
                    <Trans 
                      i18nKey="pages.kardex.pagination.showing" 
                      values={{ count: itemsPagina.length, total: kardexFiltrado.length }}
                      components={{ bold: <strong className="text-slate-700 dark:text-slate-200" /> }}
                    />
                  </p>
                  <Pagination pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Snapshot widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] flex items-center gap-4 shadow-md">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-2xl">trending_up</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Entradas hoy</p>
            <h4 className="text-base font-black text-slate-200">{snapshots.entradasHoy} items</h4>
          </div>
        </div>

        <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] flex items-center gap-4 shadow-md">
          <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
            <span className="material-symbols-outlined text-2xl">trending_down</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Salidas hoy</p>
            <h4 className="text-base font-black text-slate-200">{snapshots.salidasHoy} items</h4>
          </div>
        </div>

        <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] flex items-center gap-4 shadow-md">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-505">
            <span className="material-symbols-outlined text-2xl">warning</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Stock Crítico</p>
            <h4 className="text-base font-black text-red-400">{snapshots.stockCriticoCount} alertas</h4>
          </div>
        </div>
      </div>
    </div>
  );
}
