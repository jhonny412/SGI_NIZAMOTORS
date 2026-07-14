import { useState, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation, Trans } from "react-i18next";
import { SkeletonTable } from "../components/Skeleton";
import MovementFormModal from "../components/MovementFormModal";
import SortableTh from "../components/SortableTh";
import { matchSearch } from "../utils/search";

export default function Movimientos() {
  const { movimientos, productos, cargando, formatFecha } = useInventory();
  const { t } = useTranslation();
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: "id", dir: "desc" });
  const [modalAbierto, setModalAbierto] = useState(false);
  const itemsPorPagina = 8;

  const getProducto = (id) => productos.find((p) => p.id === id);

  const filtrados = useMemo(() => {
    let data = movimientos.filter((m) => {
      const prod = getProducto(m.productoId);
      const matchB = prod ? matchSearch([prod.descripcion, prod.codigo, prod.oem || ""], busqueda) : true;
      const matchT = filtroTipo === "todos" || m.tipo === filtroTipo;
      return matchB && matchT;
    });
    data.sort((a, b) => {
      let va = a[orden.campo];
      let vb = b[orden.campo];
      if (orden.campo === "producto") {
        const pa = getProducto(a.productoId);
        const pb = getProducto(b.productoId);
        va = pa ? pa.descripcion : "";
        vb = pb ? pb.descripcion : "";
      }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return orden.dir === "asc" ? -1 : 1;
      if (va > vb) return orden.dir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [movimientos, productos, busqueda, filtroTipo, orden]);

  const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
  const itemsPagina = filtrados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);

  function toggleSort(campo) {
    setOrden((prev) => ({ campo, dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc" }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("pages.movimientos.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("pages.movimientos.registered", { count: filtrados.length })}</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("pages.movimientos.new")}
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {cargando ? (
            <SkeletonTable rows={itemsPorPagina} cols={8} />
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 border-b border-slate-100 pb-5 mb-5 justify-between items-center">
                <input
                  placeholder={t("pages.movimientos.search_placeholder")}
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  className="input-field w-full md:max-w-md"
                />
                <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1); }} className="select-field w-56">
                  <option value="todos">{t("pages.movimientos.all_types")}</option>
                  <option value="entrada">{t("pages.movimientos.entries")}</option>
                  <option value="salida">{t("pages.movimientos.exits")}</option>
                </select>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <SortableTh campo="id" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.id")}</SortableTh>
                      <SortableTh campo="producto" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.product")}</SortableTh>
                      <SortableTh campo="tipo" align="center" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.type")}</SortableTh>
                      <SortableTh campo="cantidad" align="right" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.quantity")}</SortableTh>
                      <SortableTh campo="stockAnterior" align="right" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.stock_ant")}</SortableTh>
                      <SortableTh campo="stockNuevo" align="right" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.stock_new")}</SortableTh>
                      <SortableTh campo="motivo" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.reason")}</SortableTh>
                      <SortableTh campo="fecha" orden={orden} onSort={toggleSort}>{t("pages.movimientos.table.date")}</SortableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPagina.map((m) => {
                      const prod = getProducto(m.productoId);
                      const isEntrada = m.tipo === "entrada";
                      return (
                        <tr key={m.id}>
                          <td className="text-slate-500 font-mono text-xs">{m.id}</td>
                          <td>
                            {prod ? (
                              <>
                                <span className="font-mono text-xs text-rose-700 dark:text-rose-400 font-bold">[{prod.codigo}]</span>{" "}
                                <span className="text-slate-800 dark:text-slate-200 font-medium"> {prod.descripcion}</span>
                              </>
                            ) : (
                              <span className="text-slate-400 italic text-sm">{t("pages.movimientos.product_deleted")}</span>
                            )}
                          </td>
                          <td className="text-center">
                            <span className={isEntrada ? "badge-success" : "badge-danger"}>
                              {isEntrada ? t("pages.dashboard.entry").toUpperCase() : t("pages.dashboard.exit").toUpperCase()}
                            </span>
                          </td>
                          <td className={`text-right font-extrabold ${isEntrada ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {isEntrada ? "+" : "-"}{m.cantidad}
                          </td>
                          <td className="text-right text-slate-500 font-mono text-xs">{m.stockAnterior}</td>
                          <td className="text-right font-bold text-slate-700 dark:text-slate-300 font-mono text-xs">{m.stockNuevo}</td>
                          <td className="text-slate-500 dark:text-slate-400 text-xs italic max-w-[150px] truncate" title={m.motivo}>{m.motivo}</td>
                          <td className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatFecha(m.fecha)}</td>
                        </tr>
                      );
                    })}
                    {itemsPagina.length === 0 && (
                      <tr><td colSpan={8} className="py-12 text-center text-slate-400">{t("pages.movimientos.no_movements")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    <Trans 
                      i18nKey="pages.movimientos.pagination.showing" 
                      values={{ count: itemsPagina.length, total: filtrados.length }}
                      components={{ bold: <strong className="text-slate-700 dark:text-slate-200" /> }}
                    />
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="pagination-btn">{t("pages.productos.pagination.previous")}</button>
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                      <button key={n} onClick={() => setPagina(n)} className={pagina === n ? "pagination-btn-active" : "pagination-btn"}>{n}</button>
                    ))}
                    <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="pagination-btn">{t("pages.productos.pagination.next")}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MovementFormModal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </div>
  );
}