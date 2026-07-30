import { useState, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation, Trans } from "react-i18next";
import { SkeletonTable } from "../components/Skeleton";
import BrandFormModal from "../components/BrandFormModal";
import Pagination from "../components/Pagination";
import SortableTh from "../components/SortableTh";
import { matchSearch } from "../utils/search";

export default function Marcas() {
  const { marcas, eliminarMarca, productos, cargando } = useInventory();
  const { t } = useTranslation();
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: "id", dir: "asc" });
  const [modalMarca, setModalMarca] = useState(null);
  const itemsPorPagina = 8;

  function countProductos(marcaNombre) {
    if (!marcaNombre || !Array.isArray(productos)) return 0;
    return productos.filter((p) => p && p.marca === marcaNombre).length;
  }

  const filtrados = useMemo(() => {
    if (!Array.isArray(marcas)) return [];
    let data = marcas.filter((m) =>
      m && typeof m === "object" && m.nombre && matchSearch([m.nombre], busqueda)
    );
    data.sort((a, b) => {
      let va = a?.[orden.campo] ?? "";
      let vb = b?.[orden.campo] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return orden.dir === "asc" ? -1 : 1;
      if (va > vb) return orden.dir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [marcas, busqueda, orden]);

  const totalPaginas = Math.ceil((filtrados?.length || 0) / itemsPorPagina);
  const itemsPagina = (filtrados || []).slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);

  function toggleSort(campo) {
    setOrden((prev) => ({ campo, dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc" }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("pages.marcas.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("pages.marcas.registered", { count: filtrados.length })}</p>
        </div>
        <button
          onClick={() => setModalMarca({})}
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("pages.marcas.new")}
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {cargando ? (
            <SkeletonTable rows={itemsPorPagina} cols={4} />
          ) : (
            <>
              <div className="border-b border-slate-100 pb-5 mb-5">
                <input
                  placeholder={t("pages.marcas.search_placeholder")}
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
                      <SortableTh campo="nombre" orden={orden} onSort={toggleSort}>{t("pages.marcas.table.name")}</SortableTh>
                      <SortableTh align="center">{t("pages.proveedores.table.products")}</SortableTh>
                      <SortableTh align="center">{t("pages.marcas.table.actions")}</SortableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPagina.map((marca) => {
                      if (!marca || !marca.id) return null;
                      const numProd = countProductos(marca.nombre);
                      return (
                        <tr key={marca.id}>
                          <td className="text-slate-500 font-mono text-xs">{marca.id}</td>
                          <td className="font-bold text-slate-800 dark:text-slate-200">{marca.nombre}</td>
                          <td className="text-center">
                            <span className={numProd > 0 ? "badge-success" : "badge-slate"}>
                              {numProd} u.
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setModalMarca(marca)}
                                title={t("pages.productos.actions.edit")}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => eliminarMarca(marca.id)}
                                title={t("pages.productos.actions.delete")}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
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
                      <tr><td colSpan={4} className="py-12 text-center text-slate-400">{t("pages.marcas.no_brands")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-500">
                    <Trans 
                      i18nKey="pages.marcas.pagination.showing" 
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

      <BrandFormModal marca={modalMarca && modalMarca.id ? modalMarca : null} abierto={modalMarca !== null} onCerrar={() => setModalMarca(null)} />
    </div>
  );
}
