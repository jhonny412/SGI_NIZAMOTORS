import { useState, useMemo, useEffect } from "react";
import { useInventory } from "../context/useInventory";
import { useAuth } from "../context/useAuth";
import { useTranslation, Trans } from "react-i18next";
import { SkeletonTable } from "../components/Skeleton";
import ProductFormModal from "../components/ProductFormModal";
import Pagination from "../components/Pagination";
import SortableTh from "../components/SortableTh";
import Swal from "sweetalert2";
import { matchSearch } from "../utils/search";
import { ENDPOINTS } from "../config/endpoints";


export default function Productos() {
  const { productos, eliminarProducto, editarProducto, proveedores, marcas, cargando } = useInventory();
  const { usuarioActivo } = useAuth();
  const { t } = useTranslation();
  const esAdmin = usuarioActivo?.rol?.toLowerCase() === "admin";

  const [busqueda, setBusqueda] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: "id", dir: "asc" });
  const [modalProducto, setModalProducto] = useState(null);

  // Estados para la búsqueda de imagen
  const [imagenModalProducto, setImagenModalProducto] = useState(null);
  const [imagenResultado, setImagenResultado] = useState(null);
  const [buscandoImagen, setBuscandoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");
  const [indexImagen, setIndexImagen] = useState(0);

  // Estados para drag en zoom
  const [draggingImage, setDraggingImage] = useState(null);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const itemsPorPagina = 8;
  const API_URL = ENDPOINTS.IMAGE_SEARCH_API_URL;



  const buscarImagen = async (forzarBusqueda = false) => {
    if (!imagenModalProducto) return;

    if (imagenModalProducto.imagenUrl && !forzarBusqueda) {
      setBuscandoImagen(false);
      return;
    }

    setBuscandoImagen(true);
    setErrorImagen("");
    try {
      const query = `${imagenModalProducto.descripcion} ${imagenModalProducto.oem} spare part`;
      const res = await fetch(`${API_URL}?action=searchImage&query=${encodeURIComponent(query)}`);
      const result = await res.json();
      if (result.status === "success") {
        setImagenResultado(result.image);
      } else {
        setErrorImagen(t("pages.productos.image_not_found") || "No se pudo encontrar una imagen.");
      }
    } catch {
      setErrorImagen("Error de conexión al buscar imagen.");
    } finally {
      setBuscandoImagen(false);
    }
  };

  useEffect(() => {
    if (!imagenModalProducto) {
      setImagenResultado(null);
      setErrorImagen("");
      setIndexImagen(0);
      setImageOffset({ x: 0, y: 0 });
      setDraggingImage(null);
      return;
    }
    buscarImagen();
  }, [imagenModalProducto]);

  useEffect(() => {
    setImageOffset({ x: 0, y: 0 });
  }, [indexImagen]);

  const categorias = useMemo(() => {
    const cats = new Set(productos.map((p) => p.categoria).filter(Boolean));
    return Array.from(cats).sort();
  }, [productos]);

  const filtrosActivosCount = useMemo(() => {
    let count = 0;
    if (busqueda.trim()) count++;
    if (filtroProveedor) count++;
    if (filtroMarca) count++;
    if (filtroCategoria) count++;
    return count;
  }, [busqueda, filtroProveedor, filtroMarca, filtroCategoria]);

  const filtrados = useMemo(() => {
    let data = productos.filter((p) => {
      const matchBusqueda = matchSearch([p.descripcion, p.codigo, p.oem || ""], busqueda);
      const matchProveedor = filtroProveedor ? p.proveedorId === parseInt(filtroProveedor) : true;
      const matchCategoria = filtroCategoria ? p.categoria === filtroCategoria : true;
      const matchMarca = filtroMarca ? p.marca === filtroMarca : true;
      return matchBusqueda && matchProveedor && matchCategoria && matchMarca;
    });
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
  }, [productos, busqueda, filtroProveedor, filtroCategoria, filtroMarca, orden]);

  const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
  const itemsPagina = filtrados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);

  function toggleSort(campo) {
    setOrden((prev) => ({ campo, dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc" }));
  }

  function getStockBadge(stock) {
    if (stock === 0) {
      return (
        <span className="badge-danger">{t("pages.productos.badges.out_of_stock")}</span>
      );
    }
    if (stock <= 5) {
      return (
        <span className="badge-warning">{t("pages.productos.badges.low_stock", { count: stock })}</span>
      );
    }
    return (
      <span className="badge-success">{stock}</span>
    );
  }

  const stats = useMemo(() => {
    const criticos = productos.filter(p => p.stock <= 5).length;
    const valorTotal = productos.reduce((sum, p) => sum + (p.pCompra * p.stock), 0);
    const valorVenta = productos.reduce((sum, p) => sum + (p.pVenta * p.stock), 0);
    const margen = valorVenta > 0 ? parseFloat((((valorVenta - valorTotal) / valorVenta) * 100).toFixed(1)) : 0;

    return { criticos, valorTotal, margen };
  }, [productos]);

  const handleImageMouseDown = (e, imageType) => {
    e.preventDefault();
    setDraggingImage(imageType);
    setDragStart({ x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!draggingImage) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    const maxOffset = 120;
    setImageOffset({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  };

  const handleMouseUp = () => {
    setDraggingImage(null);
  };

  const money = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("pages.productos.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("pages.productos.found", { count: filtrados.length })}</p>
        </div>
        {esAdmin && (
          <button onClick={() => setModalProducto({})} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("pages.productos.new")}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          {cargando ? (
            <SkeletonTable rows={itemsPorPagina} cols={11} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 border-b border-slate-100 pb-5 mb-5 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  placeholder={t("pages.productos.search_placeholder")}
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  className="input-field"
                />
                <select
                  value={filtroCategoria}
                  onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }}
                  className="select-field"
                >
                  <option value="">{t("pages.productos.all_categories")}</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={filtroProveedor}
                  onChange={(e) => { setFiltroProveedor(e.target.value); setPagina(1); }}
                  className="select-field"
                >
                  <option value="">{t("pages.productos.all_suppliers")}</option>
                  {proveedores.map((prov) => (
                    <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                  ))}
                </select>
                <select
                  value={filtroMarca}
                  onChange={(e) => { setFiltroMarca(e.target.value); setPagina(1); }}
                  className="select-field"
                >
                  <option value="">{t("pages.productos.all_brands")}</option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.nombre}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              {filtrosActivosCount > 0 && (
                <div className="flex items-center gap-2 mb-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl text-amber-550 text-xs font-bold animate-fade-in w-fit">
                  <span className="material-symbols-outlined text-sm leading-none">filter_alt</span>
                  <span>{filtrosActivosCount} {filtrosActivosCount === 1 ? "filtro activo" : "filtros activos"}</span>
                  <button
                    onClick={() => {
                      setBusqueda("");
                      setFiltroProveedor("");
                      setFiltroMarca("");
                      setFiltroCategoria("");
                      setPagina(1);
                    }}
                    className="ml-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer flex items-center"
                    title="Limpiar todos los filtros"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </div>
              )}

              {/* Tabla */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <SortableTh campo="id" orden={orden} onSort={toggleSort}>{t("pages.productos.table.id")}</SortableTh>
                      <SortableTh campo="oem" orden={orden} onSort={toggleSort}>{t("pages.productos.table.oem")}</SortableTh>
                      <SortableTh campo="codigo" orden={orden} onSort={toggleSort}>{t("pages.productos.table.code")}</SortableTh>
                      <SortableTh campo="descripcion" orden={orden} onSort={toggleSort}>{t("pages.productos.table.description")}</SortableTh>
                      <SortableTh campo="stock" align="center" orden={orden} onSort={toggleSort}>{t("pages.productos.table.stock")}</SortableTh>
                      {esAdmin && <SortableTh campo="pCompra" align="right" orden={orden} onSort={toggleSort}>{t("pages.productos.table.purchase_price")}</SortableTh>}
                      {esAdmin && <SortableTh campo="margGanancia" align="right" orden={orden} onSort={toggleSort}>{t("pages.productos.table.margin")}</SortableTh>}
                      <SortableTh campo="pVenta" align="right" orden={orden} onSort={toggleSort}>{t("pages.productos.table.sale_price")}</SortableTh>
                      {esAdmin && <SortableTh campo="utilidad" align="right" orden={orden} onSort={toggleSort}>{t("pages.productos.table.utility")}</SortableTh>}
                      <SortableTh campo="proveedorNombre" orden={orden} onSort={toggleSort}>{t("pages.productos.table.supplier")}</SortableTh>
                      <SortableTh align="center" orden={orden} onSort={toggleSort}>{t("pages.productos.table.actions")}</SortableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPagina.map((p) => (
                      <tr key={p.id}>
                        <td className="text-slate-500 font-mono text-xs">{p.id}</td>
                        <td className="text-slate-500 text-xs">{p.oem || "\u2014"}</td>
                        <td className="font-mono text-xs text-rose-700 dark:text-rose-400 font-semibold">{p.codigo}</td>
                        <td className="font-medium text-slate-800 dark:text-slate-200 max-w-[200px] relative group cursor-help">
                          <div className="truncate">{p.descripcion}</div>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-950 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-[#334155] shadow-xl z-50 whitespace-normal min-w-[200px] max-w-xs text-center font-normal">
                            {p.descripcion}
                          </div>
                        </td>
                        <td className="text-center">{getStockBadge(p.stock)}</td>
                        {esAdmin && <td className="text-right text-slate-600 dark:text-slate-400">S/. {money(p.pCompra)}</td>}
                        {esAdmin && <td className="text-right text-slate-600 dark:text-slate-400">{money(p.margGanancia)}%</td>}
                        <td className="text-right font-semibold text-slate-800 dark:text-slate-200">S/. {money(p.pVenta)}</td>
                        {esAdmin && <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">S/. {money(p.utilidad)}</td>}
                        <td className="text-slate-500 max-w-[140px] text-xs relative group cursor-help">
                          <div className="truncate">{p.proveedorNombre}</div>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-950 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-[#334155] shadow-xl z-50 whitespace-normal min-w-[120px] max-w-xs text-center font-normal">
                            {p.proveedorNombre}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setImagenModalProducto(p)}
                              title={t("pages.productos.actions.search_image") || "Buscar imagen"}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            {esAdmin && (
                              <>
                                <button onClick={() => setModalProducto(p)} title={t("pages.productos.actions.edit")} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button onClick={() => eliminarProducto(p.id)} title={t("pages.productos.actions.delete")} className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {itemsPagina.length === 0 && (
                      <tr><td colSpan={esAdmin ? 11 : 8} className="py-12 text-center text-slate-400">{t("pages.productos.no_products")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-500">
                    <Trans 
                      i18nKey="pages.productos.pagination.showing" 
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

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-rose-50 text-rose-600 ring-rose-100/50 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-950/30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Productos Críticos</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{stats.criticos}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-emerald-50 text-emerald-600 ring-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-950/30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Valor Inventario</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              S/. {stats.valorTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-amber-50 text-amber-600 ring-amber-100/50 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-950/30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Margen Promedio</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{stats.margen}%</p>
          </div>
        </div>
      </div>

      <ProductFormModal producto={modalProducto && modalProducto.id ? modalProducto : null} abierto={modalProducto !== null} onCerrar={() => setModalProducto(null)} />

      {/* Modal Búsqueda de Imagen */}
      {imagenModalProducto && (
        <div
          className="modal-overlay"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="modal-content max-w-2xl w-full !overflow-hidden flex flex-col max-h-[min(92vh,900px)]">
            <div className="shrink-0 flex items-start justify-between bg-slate-950 px-6 py-4 sm:py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="relative z-10 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                    Módulo de Imágenes
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">photo_camera</span>
                  Imagen de Referencia
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium hidden sm:block">
                  Visualiza o vincula imágenes de referencia para este producto
                </p>
              </div>
              <button
                onClick={() => setImagenModalProducto(null)}
                className="text-slate-400 hover:text-white transition-all p-1.5 rounded-xl hover:bg-white/10 relative z-10 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 flex flex-col items-center justify-center flex-1 min-h-0 overflow-y-auto">
              {buscandoImagen ? (
                <div className="flex flex-col items-center text-slate-400 py-8">
                  <svg className="w-8 h-8 animate-spin text-rose-500 mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">Buscando en Google Images...</span>
                </div>
              ) : errorImagen ? (
                <div className="text-center text-red-500 text-sm max-w-[80%] py-8">
                  <svg className="w-8 h-8 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p>{errorImagen}</p>
                </div>
              ) : imagenResultado ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-1 dark:ring-purple-800/40 px-2.5 py-0.5 rounded-lg shadow-sm">Resultado de búsqueda</span>
                  <div className="w-full max-w-[500px] h-[min(42vh,320px)] flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950 shadow-inner">
                    <img
                      src={imagenResultado}
                      alt={imagenModalProducto.descripcion}
                      referrerPolicy="no-referrer"
                      onMouseDown={(e) => handleImageMouseDown(e, 'resultado')}
                      style={{
                        transform: `scale(${draggingImage === 'resultado' ? 2.5 : 1}) translate(${draggingImage === 'resultado' ? imageOffset.x : 0}px, ${draggingImage === 'resultado' ? imageOffset.y : 0}px)`,
                        cursor: draggingImage === 'resultado' ? 'grabbing' : 'zoom-in'
                      }}
                      className="max-w-full max-h-full object-contain transition-all shadow-md select-none"
                    />
                  </div>
                </div>
              ) : (imagenModalProducto.imagenUrl || imagenModalProducto.imagenUrl2 || imagenModalProducto.imagenUrl3) ? (
                (() => {
                  const imgs = [imagenModalProducto.imagenUrl, imagenModalProducto.imagenUrl2, imagenModalProducto.imagenUrl3].filter(Boolean);
                  const currentImg = imgs[indexImagen] || imgs[0];

                  return (
                    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-800/40 px-2.5 py-0.5 rounded-lg shadow-sm">
                        Imagen {indexImagen + 1} de {imgs.length} vinculada
                      </span>

                      <div className="w-full max-w-[500px] h-[min(42vh,320px)] relative group flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950 shadow-inner">
                        <img
                          src={currentImg}
                          alt={`Imagen ${indexImagen + 1}`}
                          referrerPolicy="no-referrer"
                          onMouseDown={(e) => handleImageMouseDown(e, 'vinculada')}
                          style={{
                            transform: `scale(${draggingImage === 'vinculada' ? 2.5 : 1}) translate(${draggingImage === 'vinculada' ? imageOffset.x : 0}px, ${draggingImage === 'vinculada' ? imageOffset.y : 0}px)`,
                            cursor: draggingImage === 'vinculada' ? 'grabbing' : 'zoom-in'
                          }}
                          className="max-w-full max-h-full object-contain transition-all shadow-md select-none"
                        />

                        {imgs.length > 1 && (
                          <>
                            <button
                              onClick={() => setIndexImagen((prev) => (prev > 0 ? prev - 1 : imgs.length - 1))}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setIndexImagen((prev) => (prev < imgs.length - 1 ? prev + 1 : 0))}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>

                      {imgs.length > 1 && (
                        <div className="flex gap-2">
                          {imgs.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setIndexImagen(i)}
                              className={`w-2 h-2 rounded-full transition-all ${indexImagen === i ? 'bg-rose-500 w-4' : 'bg-slate-300 dark:bg-slate-700'}`}
                            />
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => { setImagenResultado(null); buscarImagen(true); }}
                        className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer transition-colors"
                      >
                        ¿Buscar una imagen diferente?
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="text-slate-400 text-sm italic py-8">No hay imagen vinculada</div>
              )}
            </div>

            <div className="shrink-0 p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2 sm:gap-3 bg-[var(--surface)]">
              <div className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-2">
                {imagenModalProducto.descripcion} ({imagenModalProducto.oem})
              </div>
              {imagenResultado && (
                <button
                  onClick={() => {
                    editarProducto({ ...imagenModalProducto, imagenUrl: imagenResultado });
                    setImagenModalProducto(null);
                    Swal.fire({ icon: 'success', title: 'Imagen vinculada', text: 'La imagen se ha guardado en el archivo.', timer: 2000, showConfirmButton: false });
                  }}
                  className="btn-primary w-full py-2.5 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Vincular permanentemente esta imagen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}