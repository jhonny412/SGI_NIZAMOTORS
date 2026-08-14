import { useState, useMemo, useEffect, useCallback } from "react";
import { useInventory } from "../context/useInventory";
import { useAuth } from "../context/useAuth";
import { useTranslation, Trans } from "react-i18next";
import { SkeletonCard, SkeletonTable } from "../components/Skeleton";
import VentaFormModal from "../components/VentaFormModal";
import VentaDetalleModal from "../components/VentaDetalleModal";
import ImprimirConfirmModal from "../components/ImprimirConfirmModal";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import { matchSearch } from "../utils/search";

export default function Ventas() {
  const { ventas, productos, cargando, formatFecha, eliminarVenta } = useInventory();
  const { usuarioActivo } = useAuth();
  const { t } = useTranslation();

  const rol = (usuarioActivo?.rol || "").toLowerCase();
  const esAdmin = rol.includes("admin") || rol.includes("super");

  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: "id", dir: "desc" });
  // Modal: Formulario de nueva venta
  const [modalAbierto, setModalAbierto] = useState(false);
  // Modal: Detalle / comprobante
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [autoImprimirDetalle, setAutoImprimirDetalle] = useState(false);
  // Modal: Confirmación de impresión post-venta
  const [confirmImprimirAbierto, setConfirmImprimirAbierto] = useState(false);
  const [confirmBoletaCode, setConfirmBoletaCode] = useState(null);
  // Boleta pendiente de búsqueda en salesGrouped
  const [pendingBoletaCode, setPendingBoletaCode] = useState(null);
  const itemsPorPagina = 8;

  // Agrupar y enriquecer ventas (base de datos con control de visibilidad por rol)
  const salesGrouped = useMemo(() => {
    const usuarioNombreNorm = (usuarioActivo?.nombre || "").trim().toLowerCase();
    const ventasBase = esAdmin
      ? (ventas || [])
      : (ventas || []).filter((v) => {
          const sellerName = String(v.vendedor || "").trim().toLowerCase();
          return sellerName !== "" && sellerName === usuarioNombreNorm;
        });

    return ventasBase.map((venta) => {
      const enrichedItems = (venta.items || []).map((item) => {
        const prod = productos.find((p) => p.id === item.productoId);
        return {
          ...item,
          producto: prod,
          totalVenta: (Number(item.precioUnitario) || 0) * (Number(item.cantidad) || 0)
        };
      });
      return {
        ...venta,
        id: Number(venta.id),
        groupId: venta.boleta ? venta.boleta : `LEGACY-${venta.id}`,
        items: enrichedItems,
        totalVenta: Number(venta.totalVenta) || 0,
        utilidad: Number(venta.utilidad) || 0,
        cantidadTotal: Number(venta.cantidadTotal) || 0,
        direccion: venta.direccion || "",
        fecha: venta.fecha,
        vendedor: venta.vendedor || ""
      };
    });
  }, [ventas, productos, esAdmin, usuarioActivo]);

  // Cierra todos los modales y limpia el estado
  const closeAll = useCallback(() => {
    setModalAbierto(false);
    setModalDetalleAbierto(false);
    setDetalleVenta(null);
    setAutoImprimirDetalle(false);
    setConfirmImprimirAbierto(false);
    setConfirmBoletaCode(null);
    setPendingBoletaCode(null);
  }, []);

  // Cuando se registra una venta: guarda el código y espera que salesGrouped se actualice
  const handleVentaRegistrada = useCallback((boletaCode) => {
    setModalAbierto(false);          // cierra el formulario de venta
    setPendingBoletaCode(boletaCode);
    setConfirmBoletaCode(boletaCode);
    setConfirmImprimirAbierto(true); // muestra el modal de confirmación
  }, []);

  // Cuando salesGrouped se actualiza, busca la venta recién registrada
  useEffect(() => {
    if (pendingBoletaCode) {
      const group = salesGrouped.find((g) => g.boleta === pendingBoletaCode);
      if (group) {
        setDetalleVenta(group);     // precarga el detalle para poder imprimir
        setPendingBoletaCode(null); // ya encontrado
      }
    }
  }, [salesGrouped, pendingBoletaCode]);

  // Acción: usuario confirma que quiere imprimir
  const handleConfirmImprimir = useCallback(() => {
    setConfirmImprimirAbierto(false);
    setConfirmBoletaCode(null);
    // Abre el modal de detalle con autoImprimir activado
    setAutoImprimirDetalle(true);
    setModalDetalleAbierto(true);
  }, []);

  // Acción: usuario omite la impresión
  const handleOmitirImprimir = useCallback(() => {
    closeAll();
  }, [closeAll]);

  // Filtrar y ordenar las ventas agrupadas
  const filtrados = useMemo(() => {
    let data = salesGrouped.filter((group) => {
      const targets = [
        group.boleta || "",
        group.cliente || "",
        group.metodoPago || ""
      ];
      group.items.forEach((it) => {
        if (it.producto) {
          targets.push(it.producto.descripcion || "");
          targets.push(it.producto.codigo || "");
          targets.push(it.producto.oem || "");
        }
      });
      return matchSearch(targets, busqueda);
    });

    data.sort((a, b) => {
      let va = a[orden.campo];
      let vb = b[orden.campo];
      
      if (orden.campo === "fecha") {
        va = a.fecha;
        vb = b.fecha;
      } else if (orden.campo === "total") {
        va = a.totalVenta;
        vb = b.totalVenta;
      } else if (orden.campo === "utilidad") {
        va = a.utilidad;
        vb = b.utilidad;
      } else if (orden.campo === "cliente") {
        va = a.cliente || "";
        vb = b.cliente || "";
      } else if (orden.campo === "metodoPago") {
        va = a.metodoPago || "";
        vb = b.metodoPago || "";
      } else if (orden.campo === "cantidadTotal") {
        va = a.cantidadTotal;
        vb = b.cantidadTotal;
      }
      
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      
      if (va < vb) return orden.dir === "asc" ? -1 : 1;
      if (va > vb) return orden.dir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [salesGrouped, busqueda, orden]);

  // Cálculos de KPIs basados en todas las ventas agrupadas
  const kpis = useMemo(() => {
    const totalSales = salesGrouped.length;
    const totalRevenue = salesGrouped.reduce((sum, g) => sum + g.totalVenta, 0);
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    const totalProfit = salesGrouped.reduce((sum, g) => sum + g.utilidad, 0);

    return {
      totalSales,
      totalRevenue,
      avgTicket,
      totalProfit
    };
  }, [salesGrouped]);

  const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
  const itemsPagina = useMemo(() => {
    return filtrados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);
  }, [filtrados, pagina]);

  function toggleSort(campo) {
    setOrden((prev) => ({
      campo,
      dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc"
    }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-amber-500 mb-1">
            <span className="material-symbols-outlined text-lg">payments</span>
            <span className="text-[10px] font-black tracking-widest uppercase">REGISTRO COMERCIAL</span>
          </div>
          <h3 className="text-3xl font-black text-slate-100 tracking-tight">{t("pages.ventas.title")}</h3>
          <p className="text-slate-450 mt-1">
            {t("pages.ventas.registered", { count: filtrados.length })} órdenes de servicio encontradas
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="btn-primary flex items-center gap-1.5 shadow-lg shadow-amber-500/15"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>{t("pages.ventas.new")}</span>
        </button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cargando ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Ventas Realizadas */}
            <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/5 to-transparent blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("pages.ventas.stats.total_sales")}
                  </p>
                  <p className="mt-2.5 truncate text-2xl font-black text-slate-100">
                    {kpis.totalSales}
                  </p>
                  <p className="mt-1 text-xs text-slate-450 font-medium">
                    {t("pages.ventas.stats.total_sales_desc")}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/10">
                  <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                </div>
              </div>
            </div>

            {/* Ingresos Totales */}
            <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 to-transparent blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("pages.ventas.stats.total_revenue")}
                  </p>
                  <p className="mt-2.5 truncate text-2xl font-black text-emerald-400">
                    S/. {kpis.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-slate-450 font-medium">
                    {t("pages.ventas.stats.total_revenue_desc")}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                  <span className="material-symbols-outlined text-2xl">monetization_on</span>
                </div>
              </div>
            </div>

            {/* Ticket Promedio */}
            <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-sky-500/5 to-transparent blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("pages.ventas.stats.avg_ticket")}
                  </p>
                  <p className="mt-2.5 truncate text-2xl font-black text-slate-100">
                    S/. {kpis.avgTicket.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-slate-450 font-medium">
                    {t("pages.ventas.stats.avg_ticket_desc")}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/10">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
              </div>
            </div>

            {/* Utilidad Estimada */}
            <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/5 to-transparent blur-2xl rounded-full pointer-events-none" />
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("pages.ventas.stats.total_profit")}
                  </p>
                  <p className="mt-2.5 truncate text-2xl font-black text-amber-500">
                    S/. {kpis.totalProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-slate-450 font-medium">
                    {t("pages.ventas.stats.total_profit_desc")}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/10">
                  <span className="material-symbols-outlined text-2xl">trending_up</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Control Filters and Search */}
      <div className="bg-[#1c253b] rounded-xl border border-[#334155] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-5 border-b border-[#334155] flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-950/20">
          <div className="relative w-full md:max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder={t("pages.ventas.search_placeholder")}
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              className="w-full bg-[#0b1326] border border-[#334155] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" 
            />
          </div>
        </div>

        {/* Sales Table */}
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="p-6"><SkeletonTable rows={itemsPorPagina} cols={8} /></div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-[#334155]">
                    <SortableTh campo="id" orden={orden} onSort={toggleSort}>
                      {t("pages.ventas.table.id")}
                    </SortableTh>
                    <SortableTh campo="fecha" orden={orden} onSort={toggleSort}>
                      {t("pages.ventas.table.date")}
                    </SortableTh>
                    <SortableTh campo="cliente" orden={orden} onSort={toggleSort}>
                      {t("pages.ventas.table.notes")}
                    </SortableTh>
                    <SortableTh campo="metodoPago" orden={orden} onSort={toggleSort}>
                      {t("pages.ventas.table.payment")}
                    </SortableTh>
                    <SortableTh campo="cantidadTotal" align="right" orden={orden} onSort={toggleSort}>
                      {t("pages.ventas.table.items")}
                    </SortableTh>
                    <SortableTh campo="total" align="right" orden={orden} onSort={toggleSort}>
                      {t("pages.ventas.table.total")}
                    </SortableTh>
                    <SortableTh campo="utilidad" align="right" orden={orden} onSort={toggleSort}>
                      {t("pages.ventas.table.profit")}
                    </SortableTh>
                    <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {t("pages.ventas.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/20">
                  {itemsPagina.map((s) => (
                    <tr key={s.groupId} className="hover:bg-amber-500/5 transition-colors group">
                      <td className="px-5 py-4 font-mono text-xs">
                        {s.boleta ? (
                          <span className="block text-[10px] font-black text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-max">
                            {s.boleta.replace("BOLETA ", "")}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic font-normal">Legacy #{s.id}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-450 font-medium">
                        {formatFecha(s.fecha)}
                      </td>
                      <td className="px-5 py-4 text-slate-200 text-xs">
                        <span className="font-bold block uppercase">
                          {s.cliente ? (
                            s.cliente.split("(")[0].trim()
                          ) : (
                            <span className="text-slate-600 italic">- Sin cliente -</span>
                          )}
                        </span>
                        {s.cliente && s.cliente.includes("(") && (
                          <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                            {s.cliente.substring(s.cliente.indexOf("("))}
                          </span>
                        )}
                        {esAdmin && s.vendedor && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded mt-1 border border-amber-500/20">
                            <span className="material-symbols-outlined text-[11px]">person</span>
                            {s.vendedor}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {t(`sale.${s.metodoPago.toLowerCase()}`, { defaultValue: s.metodoPago })}
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-slate-300 font-semibold">
                        <span className="font-extrabold">{s.items.length} {s.items.length === 1 ? "ítem" : "ítems"}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">({s.cantidadTotal} u.)</span>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-amber-500 text-sm font-mono">
                        S/. {s.totalVenta.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-5 py-4 text-right font-bold text-xs font-mono ${s.utilidad >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        S/. {s.utilidad.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setDetalleVenta(s);
                              setModalDetalleAbierto(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500/10 text-slate-300 hover:text-amber-500 border border-[#334155] transition-all text-xs font-bold cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                            <span>{t("pages.productos.actions.view")}</span>
                          </button>
                          {esAdmin && (
                            <button
                              onClick={() => eliminarVenta(s.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 transition-all text-xs font-bold cursor-pointer"
                              title="Eliminar venta y revertir stock"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {itemsPagina.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-medium italic">
                        {t("pages.ventas.no_sales")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPaginas > 1 && (
                <div className="p-4 bg-slate-950/20 border-t border-[#334155]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-slate-450 font-medium">
                    <Trans 
                      i18nKey="pages.ventas.pagination.showing" 
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

      {/* Sale Form Modal */}
      <VentaFormModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onVentaRegistrada={handleVentaRegistrada}
      />

      {/* Confirmación de impresión post-venta */}
      <ImprimirConfirmModal
        abierto={confirmImprimirAbierto}
        boletaCode={confirmBoletaCode}
        onImprimir={handleConfirmImprimir}
        onOmitir={handleOmitirImprimir}
      />

      {/* Sale Detail Modal */}
      <VentaDetalleModal
        abierto={modalDetalleAbierto}
        venta={detalleVenta}
        onCerrar={closeAll}
        formatFecha={formatFecha}
        autoImprimir={autoImprimirDetalle}
      />
    </div>
  );
}
