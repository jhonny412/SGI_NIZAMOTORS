import { useState, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation, Trans } from "react-i18next";
import { SkeletonTable } from "../components/Skeleton";
import SupplierFormModal from "../components/SupplierFormModal";
import Pagination from "../components/Pagination";
import SortableTh from "../components/SortableTh";
import { matchSearch } from "../utils/search";

export default function Proveedores() {
  const { proveedores, eliminarProveedor, productos, traslados, cargando } = useInventory();
  const { t } = useTranslation();
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: "id", dir: "asc" });
  const [modalProv, setModalProv] = useState(null);
  const itemsPorPagina = 8;

  function countProductos(provId) {
    return productos.filter((p) => p.proveedorId === provId).length;
  }

  const filtrados = useMemo(() => {
    let data = proveedores.filter((p) =>
      matchSearch([p.nombre, p.telefono || "", p.email || ""], busqueda)
    );
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
  }, [proveedores, busqueda, orden]);

  const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
  const itemsPagina = filtrados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);

  function toggleSort(campo) {
    setOrden((prev) => ({ campo, dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc" }));
  }

  const pendingOrders = useMemo(() => traslados.filter(t => t.estado === "pendiente").length, [traslados]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("pages.proveedores.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("pages.proveedores.registered", { count: filtrados.length })}</p>
        </div>
        <button onClick={() => setModalProv({})} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("pages.proveedores.new")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-500/5 dark:from-slate-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Proveedores</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{proveedores.length}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">Aliados comerciales</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-slate-50 text-slate-600 ring-slate-100/50 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m6 0v-2a3 3 0 10-6 0v2m6 0H7m6 0H5m6 0V11m0 4v3m0-3a3 3 0 100-6 3 3 0 000 6zm9 0a24.18 24.18 0 01-3.75 3.75M9.75 5.5a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 dark:from-emerald-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Proveedores Activos</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{proveedores.length}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">Con productos asociados</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-emerald-50 text-emerald-600 ring-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/5 dark:from-amber-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Órdenes Pendientes</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{pendingOrders}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">Traspasos pendientes</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-amber-50 text-amber-600 ring-amber-100/50 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body">
          {cargando ? (
            <SkeletonTable rows={itemsPorPagina} cols={6} />
          ) : (
            <>
              <div className="border-b border-slate-100 pb-5 mb-5">
                <input
                  placeholder={t("pages.proveedores.search_placeholder")}
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  className="input-field max-w-md"
                />
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <SortableTh campo="id" orden={orden} onSort={toggleSort}>{t("pages.proveedores.table.id")}</SortableTh>
                      <SortableTh campo="nombre" orden={orden} onSort={toggleSort}>{t("pages.proveedores.table.name")}</SortableTh>
                      <SortableTh campo="telefono" orden={orden} onSort={toggleSort}>{t("pages.proveedores.table.phone")}</SortableTh>
                      <SortableTh campo="email" orden={orden} onSort={toggleSort}>{t("pages.proveedores.table.email")}</SortableTh>
                      <SortableTh align="center">{t("pages.proveedores.table.products")}</SortableTh>
                      <SortableTh align="center">{t("pages.proveedores.table.actions")}</SortableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPagina.map((prov) => (
                      <tr key={prov.id}>
                        <td className="text-slate-500 font-mono text-xs">{prov.id}</td>
                        <td className="font-bold text-slate-800 dark:text-slate-200 uppercase">{prov.nombre}</td>
                        <td className="text-slate-500 font-mono text-xs">{prov.telefono || "\u2014"}</td>
                        <td className="text-slate-500 text-xs lowercase">{prov.email || "\u2014"}</td>
                        <td className="text-center">
                          <span className={countProductos(prov.id) > 0 ? "badge-success" : "badge-slate"}>{countProductos(prov.id)}</span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setModalProv(prov)} title={t("pages.productos.actions.edit")} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => eliminarProveedor(prov.id)} title={t("pages.productos.actions.delete")} className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {itemsPagina.length === 0 && (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-400">{t("pages.proveedores.no_suppliers")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-500">
                    <Trans 
                      i18nKey="pages.proveedores.pagination.showing" 
                      values={{ count: itemsPagina.length, total: filtrados.length }}
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

      <SupplierFormModal proveedor={modalProv && modalProv.id ? modalProv : null} abierto={modalProv !== null} onCerrar={() => setModalProv(null)} />
    </div>
  );
}