import { useState, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { useUI } from "../context/useUI";
import { useTranslation, Trans } from "react-i18next";
import { SkeletonTable } from "../components/Skeleton";
import CategoriaFormModal from "../components/CategoriaFormModal";
import SortableTh from "../components/SortableTh";
import { matchSearch } from "../utils/search";

export default function Categorias() {
  const { categorias, eliminarCategoria, productos, cargando } = useInventory();
  const { setPaginaActiva } = useUI();
  const { t } = useTranslation();

  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: "nombre", dir: "asc" });
  const [modalCat, setModalCat] = useState(null);
  const itemsPorPagina = 8;

  function countProductos(catNombre) {
    return productos.filter((p) => p.categoria === catNombre).length;
  }

  const filtrados = useMemo(() => {
    let data = categorias.filter((c) =>
      matchSearch([c.nombre || "", c.descripcion || ""], busqueda)
    );
    data.sort((a, b) => {
      let va = a[orden.campo] ?? "";
      let vb = b[orden.campo] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return orden.dir === "asc" ? -1 : 1;
      if (va > vb) return orden.dir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [categorias, busqueda, orden]);

  const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
  const itemsPagina = filtrados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);

  function toggleSort(campo) {
    setOrden((prev) => ({ campo, dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc" }));
  }

  const stats = useMemo(() => {
    const total = categorias.length;
    const categorizados = productos.filter((p) => p.categoria && categorias.some((c) => c.nombre === p.categoria)).length;
    const sinCategoria = productos.filter((p) => !p.categoria || !categorias.some((c) => c.nombre === p.categoria)).length;
    return { total, categorizados, sinCategoria };
  }, [categorias, productos]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Categorías</h1>
          <p className="text-sm text-slate-500 mt-1">{stats.total} categorías registradas en el sistema.</p>
        </div>
        <button onClick={() => setModalCat({})} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Categoría
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/5 dark:from-amber-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">TOTAL CATEGORÍAS</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stats.total}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">En el catálogo</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-amber-50 text-amber-600 ring-amber-100/50 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>
        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 dark:from-emerald-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">PRODUCTOS CATEGORIZADOS</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stats.categorizados}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">Distribución activa</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-emerald-50 text-emerald-600 ring-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/5 dark:from-rose-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">SIN CATEGORÍA</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stats.sinCategoria}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">Requieren asignación</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-rose-50 text-rose-600 ring-rose-100/50 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body">
          {cargando ? (
            <SkeletonTable rows={itemsPorPagina} cols={5} />
          ) : (
            <>
              <div className="border-b border-slate-100 pb-5 mb-5">
                <input
                  placeholder="Buscar categoría..."
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  className="input-field max-w-md"
                />
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <SortableTh campo="id" orden={orden} onSort={toggleSort}>{t("pages.marcas.table.id")}</SortableTh>
                      <SortableTh campo="nombre" orden={orden} onSort={toggleSort}>Categoría</SortableTh>
                      <SortableTh campo="descripcion" orden={orden} onSort={toggleSort}>Descripción</SortableTh>
                      <SortableTh align="center">Cant. Productos</SortableTh>
                      <SortableTh align="center">{t("pages.marcas.table.actions")}</SortableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPagina.map((cat) => {
                      const numProductos = countProductos(cat.nombre);
                      return (
                        <tr key={cat.id}>
                          <td className="text-slate-500 font-mono text-xs">{cat.id}</td>
                          <td className="font-bold text-slate-800 dark:text-slate-200 uppercase">{cat.nombre}</td>
                          <td className="text-sm text-slate-500 italic">{cat.descripcion || <span className="text-slate-400">—</span>}</td>
                          <td className="text-center">
                            <span className={numProductos > 0 ? "badge-success" : "badge-slate"}>{numProductos} u.</span>
                          </td>
                          <td>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setModalCat(cat)} title="Editar" className="p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => eliminarCategoria(cat.id)} title="Eliminar" className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {itemsPagina.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400">{busqueda ? "No se encontraron categorías con ese criterio" : "No hay categorías registradas aún"}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    <Trans 
                      i18nKey="pages.categorias.pagination.showing" 
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

      {/* Enlace a Marcas */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Gestionar Marcas</h4>
          <p className="text-xs text-slate-400 mt-0.5">Administra las marcas de autopartes del catálogo</p>
        </div>
        <button onClick={() => setPaginaActiva("marcas")} className="btn-secondary text-xs">
          Ir a Marcas
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <CategoriaFormModal categoria={modalCat && modalCat.id ? modalCat : null} abierto={modalCat !== null} onCerrar={() => setModalCat(null)} />
    </div>
  );
}