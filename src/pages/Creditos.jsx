import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInventory } from "../context/useInventory";
import TrasladoFormModal from "../components/TrasladoFormModal";
import Swal from "sweetalert2";

export default function Creditos() {
  const { t } = useTranslation();
  const { traslados, productos, resolverTraslado } = useInventory();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [trasladoDetalle, setTrasladoDetalle] = useState(null);

  const getProducto = (productoId) => productos.find((p) => p.id === productoId);
  const getProductoDesc = (productoId) => {
    const prod = getProducto(productoId);
    return prod ? `${prod.descripcion} (${prod.codigo})` : "Producto no encontrado";
  };

  const getItemsLabel = (traslado) => {
    if (traslado.items && traslado.items.length > 0) {
      return traslado.items.map((item) => {
        const prod = getProducto(item.productoId);
        return prod ? `${item.cantidad}× ${prod.descripcion}` : `ID ${item.productoId}`;
      });
    }
    return [getProductoDesc(traslado.productoId)];
  };

  const trasladosFiltrados = traslados.filter((traslado) => {
    const coincideEstado = filtroEstado === "todos" || traslado.estado === filtroEstado;
    const q = busqueda.toLowerCase();
    if (!q) return coincideEstado;

    const tiendaMatch = traslado.tiendaVecina.toLowerCase().includes(q);
    const notasMatch = traslado.notas?.toLowerCase().includes(q);
    const itemsMatch = (traslado.items && traslado.items.length > 0)
      ? traslado.items.some((item) => {
          const prod = getProducto(item.productoId);
          if (!prod) return false;
          const desc = prod.descripcion ? String(prod.descripcion).toLowerCase() : "";
          const cod = prod.codigo ? String(prod.codigo).toLowerCase() : "";
          return desc.includes(q) || cod.includes(q);
        })
      : String(getProductoDesc(traslado.productoId)).toLowerCase().includes(q);

    return coincideEstado && (tiendaMatch || notasMatch || itemsMatch);
  });

  const prestamosPendientes = traslados.filter((t) => t.estado === "pendiente");
  const totalPendientesCount = prestamosPendientes.length;
  const montoTotalPendiente = prestamosPendientes.reduce((sum, t) => sum + t.total, 0);

  const prestamosPorTienda = traslados.reduce((acc, t) => {
    acc[t.tiendaVecina] = (acc[t.tiendaVecina] || 0) + 1;
    return acc;
  }, {});
  let tiendaMasActiva = "Ninguna";
  let maxPrestamos = 0;
  Object.entries(prestamosPorTienda).forEach(([tienda, cant]) => {
    if (cant > maxPrestamos) {
      maxPrestamos = cant;
      tiendaMasActiva = tienda;
    }
  });

  const mostrarNotas = (notas) => {
    Swal.fire({
      title: t("pages.creditos.actions.view_notes"),
      text: notas || "Sin observaciones adicionales.",
      icon: "info",
      confirmButtonText: "Cerrar",
      confirmButtonColor: "#f59e0b"
    });
  };

  const confirmarResolucion = (id, resolucion) => {
    const accionTexto =
      resolucion === "devuelto"
        ? "¿Confirmar que la tienda devolvió el repuesto físico?"
        : "¿Confirmar que la tienda pagó el valor en efectivo?";

    Swal.fire({
      title: "¿Resolver Préstamo?",
      text: accionTexto,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, confirmar",
      cancelButtonText: "Cancelar"
    }).then(async (result) => {
      if (result.isConfirmed) {
        const ok = await resolverTraslado(id, resolucion);
        if (ok && trasladoDetalle?.id === id) {
          setTrasladoDetalle((prev) => ({ ...prev, estado: resolucion, fechaResolucion: new Date().toISOString().split("T")[0] }));
        }
      }
    });
  };

  const money = (n) => n.toFixed(2);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("pages.creditos.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("pages.creditos.subtitle")}</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("pages.creditos.new")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/5 dark:from-amber-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("pages.creditos.filter_pending")}</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{totalPendientesCount}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">Préstamos por resolver</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-amber-50 text-amber-600 ring-amber-100/50 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/5 dark:from-rose-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total por Cobrar</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                S/. {montoTotalPendiente.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">Valor de préstamos pendientes</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-rose-50 text-rose-600 ring-rose-100/50 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card card-hover p-6 relative overflow-hidden animate-slide-up stagger-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-500/5 dark:from-slate-500/10 to-transparent blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tienda con Más Traspasos</p>
              <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{tiendaMasActiva}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-medium">{maxPrestamos > 0 ? `Con ${maxPrestamos} traspaso(s)` : "Sin registros"}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-inner bg-slate-50 text-slate-600 ring-slate-100/50 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-950/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <svg className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por repuesto, tienda o notas..."
              className="input-field pl-9 w-full py-2.5"
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg overflow-x-auto gap-1">
            <button onClick={() => setFiltroEstado("todos")} className={`flex-1 sm:flex-none px-3 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${filtroEstado === "todos" ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"}`}>{t("pages.creditos.filter_all")}</button>
            <button onClick={() => setFiltroEstado("pendiente")} className={`flex-1 sm:flex-none px-3 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${filtroEstado === "pendiente" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"}`}>{t("pages.creditos.filter_pending")}</button>
            <button onClick={() => setFiltroEstado("devuelto")} className={`flex-1 sm:flex-none px-3 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${filtroEstado === "devuelto" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"}`}>Devuelto</button>
            <button onClick={() => setFiltroEstado("pagado")} className={`flex-1 sm:flex-none px-3 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${filtroEstado === "pagado" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"}`}>Pagado</button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-container animate-slide-up stagger-4">
        <table>
          <thead>
            <tr>
              <th>{t("pages.creditos.table.id")}</th>
              <th>{t("pages.creditos.table.date")}</th>
              <th>{t("pages.creditos.table.store")}</th>
              <th>{t("pages.creditos.table.product")}</th>
              <th className="text-right">{t("pages.creditos.table.qty")}</th>
              <th className="text-right">{t("pages.creditos.table.total")}</th>
              <th className="text-center">{t("pages.creditos.table.status")}</th>
              <th className="text-center">{t("pages.creditos.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {trasladosFiltrados.length > 0 ? (
              trasladosFiltrados.map((tItem) => {
                const etiquetas = getItemsLabel(tItem);
                const cantTotal = tItem.items ? tItem.items.reduce((s, i) => s + i.cantidad, 0) : tItem.cantidad;
                return (
                  <tr key={tItem.id}>
                    <td className="text-slate-500 font-mono text-xs">#{tItem.id}</td>
                    <td className="text-slate-600 dark:text-slate-300 text-xs font-medium">{tItem.fechaPrestamo}</td>
                    <td className="font-bold text-slate-800 dark:text-slate-200">{tItem.tiendaVecina}</td>
                    <td>
                      <ul className="space-y-1">
                        {etiquetas.map((label, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                            <span className="leading-tight font-medium text-xs">{label}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="text-right font-bold text-slate-800 dark:text-slate-200">{cantTotal} u.</td>
                    <td className="text-right font-extrabold text-rose-600 dark:text-rose-400">S/. {money(tItem.total)}</td>
                    <td className="text-center">
                      {tItem.estado === "pendiente" && <span className="badge-warning animate-pulse">{t("pages.creditos.status_pending")}</span>}
                      {tItem.estado === "devuelto" && <span className="badge-success">{t("pages.creditos.status_returned")}</span>}
                      {tItem.estado === "pagado" && <span className="badge-info">{t("pages.creditos.status_paid")}</span>}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5 flex-wrap min-w-[120px]">
                        <button onClick={() => setTrasladoDetalle(tItem)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-500/10 text-slate-700 hover:text-rose-600 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800/80 transition-all text-xs font-bold cursor-pointer whitespace-nowrap" title="Ver detalle del préstamo">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="hidden sm:inline">Ver</span>
                        </button>
                        {tItem.estado === "pendiente" ? (
                          <>
                            <button onClick={() => confirmarResolucion(tItem.id, "devuelto")} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all shadow-sm cursor-pointer whitespace-nowrap">Devuelto</button>
                            <button onClick={() => confirmarResolucion(tItem.id, "pagado")} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all shadow-sm cursor-pointer whitespace-nowrap">Pagó</button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium italic whitespace-nowrap">Resuelto</span>
                        )}
                        {tItem.notas && (
                          <button onClick={() => mostrarNotas(tItem.notas)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title={t("pages.creditos.actions.view_notes")}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={8} className="py-12 text-center text-slate-400">{t("pages.creditos.no_transfers")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <TrasladoFormModal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />

      {/* Modal Detalle */}
      {trasladoDetalle && (
        <ModalDetallePréstamo
          traslado={trasladoDetalle}
          productos={productos}
          onCerrar={() => setTrasladoDetalle(null)}
          onResolver={confirmarResolucion}
          t={t}
        />
      )}
    </div>
  );
}

function ModalDetallePréstamo({ traslado, productos, onCerrar, onResolver, t }) {
  const getProducto = (productoId) => productos.find((p) => p.id === productoId);
  const itemsDetalle = traslado.items && traslado.items.length > 0
    ? traslado.items
    : [{ productoId: traslado.productoId, cantidad: traslado.cantidad, precioVenta: null, total: traslado.total }];
  const cantTotal = itemsDetalle.reduce((s, i) => s + i.cantidad, 0);

  const badgeEstado = { pendiente: "badge-warning animate-pulse", devuelto: "badge-success", pagado: "badge-info" }[traslado.estado] || "";
  const labelEstado = { pendiente: t("pages.creditos.status_pending"), devuelto: t("pages.creditos.status_returned"), pagado: t("pages.creditos.status_paid") }[traslado.estado] || traslado.estado;

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content max-w-lg w-full mx-4 sm:mx-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">Detalle de Préstamo</span>
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">Ticket #{traslado.id}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${badgeEstado}`}>{labelEstado}</span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">swap_horiz</span>
              {traslado.tiendaVecina}
            </h3>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-white transition-all p-1.5 rounded-xl hover:bg-white/10 relative z-10 cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="bg-slate-50 dark:bg-slate-950/40 px-4 py-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Fecha Préstamo</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{traslado.fechaPrestamo}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/40 px-4 py-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Fecha Resolución</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
              {traslado.fechaResolucion ? (
                <span className="text-emerald-600 dark:text-emerald-400">{traslado.fechaResolucion}</span>
              ) : (<span className="italic text-slate-400">Pendiente</span>)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden p-4">
          <div className="table-container border rounded-xl overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Repuesto</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-right">P. Venta</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {itemsDetalle.map((item, idx) => {
                  const prod = getProducto(item.productoId);
                  const pv = item.precioVenta ?? prod?.pVenta ?? 0;
                  const sub = item.total ?? (pv * item.cantidad);
                  return (
                    <tr key={idx}>
                      <td>
                        {prod ? (
                          <>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{prod.descripcion}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wide">{prod.codigo}{prod.oem ? ` · OEM: ${prod.oem}` : ""}</p>
                          </>
                        ) : (<span className="text-sm text-slate-400 italic">Producto #{item.productoId}</span>)}
                      </td>
                      <td className="text-center"><span className="badge-warning">{item.cantidad}</span></td>
                      <td className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">S/. {pv.toFixed(2)}</td>
                      <td className="text-right font-extrabold text-slate-800 dark:text-slate-200 font-mono">S/. {sub.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="text-[10px] font-bold text-slate-400">{itemsDetalle.length} repuesto(s) — {cantTotal} unid.</td>
                  <td colSpan={2} className="text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Total</td>
                  <td className="text-right text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">S/. {traslado.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {traslado.notas && (
          <div className="mx-4 mb-4 p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 rounded-xl flex gap-3 items-start">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-0.5">Observaciones</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{traslado.notas}</p>
            </div>
          </div>
        )}

        {traslado.estado === "pendiente" ? (
          <div className="px-6 py-4.5 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mr-auto">Resolver préstamo:</span>
            <button onClick={() => { onResolver(traslado.id, "devuelto"); onCerrar(); }} className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Devuelto
            </button>
            <button onClick={() => { onResolver(traslado.id, "pagado"); onCerrar(); }} className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Pagó Efectivo
            </button>
          </div>
        ) : (
          <div className="px-6 py-4 flex justify-end border-t border-slate-100 dark:border-slate-800/80">
            <button onClick={onCerrar} className="btn-secondary py-2 px-5 text-sm rounded-xl">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}