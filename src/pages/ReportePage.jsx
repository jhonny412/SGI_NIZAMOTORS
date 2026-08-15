import { useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { useInventory } from "../context/useInventory";
import { useAuth } from "../context/useAuth";
import { useUI } from "../context/useUI";
import { useTranslation } from "react-i18next";
import { SkeletonTable } from "../components/Skeleton";
import { filterByDateRange, getDefaultDateRange } from "../utils/dateFilter";
import { generateVentasPdf, generateMovimientosPdf, generateKardexPdf } from "../utils/reportPdf";
import { exportVentasExcel } from "../utils/exportVentasExcel";
import { exportMovimientosExcel } from "../utils/exportMovimientosExcel";

const REPORT_CONFIG = {
  "reporte-ventas": { type: "ventas", titleKey: "pages.reportes.ventas.title" },
  "reporte-ingresos": { type: "ingresos", titleKey: "pages.reportes.ingresos.title", movTipo: "entrada" },
  "reporte-salidas": { type: "salidas", titleKey: "pages.reportes.salidas.title", movTipo: "salida" },
  "reporte-kardex": { type: "kardex", titleKey: "pages.reportes.kardex.title" },
};

const METODOS_PAGO = [
  { value: "", labelKey: "pages.reportes.filters.all" },
  { value: "EFECTIVO", labelKey: "sale.cash" },
  { value: "TARJETA", labelKey: "sale.card" },
  { value: "YAPE_PLIN", labelKey: "sale.yape_plin" },
  { value: "TRANSFERENCIA", labelKey: "sale.transfer" },
];

function getDatePresets() {
  const hoy = new Date();
  const toInput = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const hoyStr = toInput(hoy);
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);

  const hace7d = new Date(hoy);
  hace7d.setDate(hoy.getDate() - 7);
  const hace15d = new Date(hoy);
  hace15d.setDate(hoy.getDate() - 15);
  const hace30d = new Date(hoy);
  hace30d.setDate(hoy.getDate() - 30);

  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);

  return {
    hoy: { desde: hoyStr, hasta: hoyStr, label: "pages.reportes.presets.today" },
    ayer: { desde: toInput(ayer), hasta: toInput(ayer), label: "pages.reportes.presets.yesterday" },
    "7d": { desde: toInput(hace7d), hasta: hoyStr, label: "pages.reportes.presets.last7" },
    "15d": { desde: toInput(hace15d), hasta: hoyStr, label: "pages.reportes.presets.last15" },
    "30d": { desde: toInput(hace30d), hasta: hoyStr, label: "pages.reportes.presets.last30" },
    mes: { desde: toInput(inicioMes), hasta: hoyStr, label: "pages.reportes.presets.thisMonth" },
    anio: { desde: toInput(inicioAnio), hasta: hoyStr, label: "pages.reportes.presets.thisYear" },
  };
}

export default function ReportePage() {
  const { ventas, movimientos, productos, cargando, formatFecha } = useInventory();
  const { usuarioActivo } = useAuth();
  const { paginaActiva } = useUI();
  const { t } = useTranslation();

  const usuarioNombre = usuarioActivo?.nombre || "Administrador";
  const config = REPORT_CONFIG[paginaActiva] || REPORT_CONFIG["reporte-ventas"];
  const defaults = getDefaultDateRange();
  const presets = useMemo(() => getDatePresets(), []);

  const [fechaDesde, setFechaDesde] = useState(defaults.desde);
  const [fechaHasta, setFechaHasta] = useState(defaults.hasta);
  const [presetActivo, setPresetActivo] = useState(null);

  const [metodoPago, setMetodoPago] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [productoFilter, setProductoFilter] = useState("");
  const [movTipoFilter, setMovTipoFilter] = useState("todos");
  const [motivoSearch, setMotivoSearch] = useState("");

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const getProducto = useCallback((id) => productos.find((p) => p.id === id), [productos]);

  const handlePreset = (key) => {
    setPresetActivo(key);
    const p = presets[key];
    if (p) {
      setFechaDesde(p.desde);
      setFechaHasta(p.hasta);
    }
  };

  const clearFilters = () => {
    setPresetActivo(null);
    setFechaDesde(defaults.desde);
    setFechaHasta(defaults.hasta);
    setMetodoPago("");
    setClienteSearch("");
    setProductoFilter("");
    setMovTipoFilter("todos");
    setMotivoSearch("");
  };

  const datosFiltrados = useMemo(() => {
    let datos;
    if (config.type === "ventas") {
      const rol = (usuarioActivo?.rol || "").toLowerCase();
      const esAdmin = rol.includes("admin") || rol.includes("super");
      const usuarioNombreNorm = (usuarioActivo?.nombre || "").trim().toLowerCase();

      datos = esAdmin
        ? (ventas || [])
        : (ventas || []).filter((v) => {
            const sellerName = String(v.vendedor || "").trim().toLowerCase();
            return sellerName !== "" && sellerName === usuarioNombreNorm;
          });

      if (metodoPago) datos = datos.filter((v) => v.metodoPago === metodoPago);
      if (clienteSearch)
        datos = datos.filter((v) =>
          (v.cliente || "").toLowerCase().includes(clienteSearch.toLowerCase())
        );
    } else if (config.type === "kardex") {
      datos = movimientos || [];
      if (movTipoFilter && movTipoFilter !== "todos") {
        datos = datos.filter((m) => m.tipo === movTipoFilter);
      }
      if (productoFilter) {
        datos = datos.filter((m) => {
          const prod = getProducto(m.productoId);
          const desc = (prod?.descripcion || "").toLowerCase();
          const cod = (prod?.codigo || "").toLowerCase();
          const q = productoFilter.toLowerCase();
          return desc.includes(q) || cod.includes(q);
        });
      }
      if (motivoSearch) {
        datos = datos.filter((m) =>
          (m.motivo || "").toLowerCase().includes(motivoSearch.toLowerCase())
        );
      }
    } else {
      datos = (movimientos || []).filter((m) => m.tipo === config.movTipo);
      if (productoFilter) {
        datos = datos.filter((m) => {
          const prod = getProducto(m.productoId);
          const desc = (prod?.descripcion || "").toLowerCase();
          const cod = (prod?.codigo || "").toLowerCase();
          const q = productoFilter.toLowerCase();
          return desc.includes(q) || cod.includes(q);
        });
      }
      if (motivoSearch)
        datos = datos.filter((m) =>
          (m.motivo || "").toLowerCase().includes(motivoSearch.toLowerCase())
        );
    }

    if (fechaDesde || fechaHasta) {
      datos = filterByDateRange(datos, fechaDesde, fechaHasta);
    }
    return datos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [config, ventas, movimientos, fechaDesde, fechaHasta, metodoPago, clienteSearch, productoFilter, movTipoFilter, motivoSearch, getProducto]);

  const resumen = useMemo(() => {
    if (config.type === "ventas") {
      return {
        registros: datosFiltrados.length,
        total: datosFiltrados.reduce((sum, v) => sum + (Number(v.totalVenta) || 0), 0),
        extra: datosFiltrados.reduce((sum, v) => sum + (Number(v.utilidad) || 0), 0),
      };
    }
    if (config.type === "kardex") {
      const entradas = datosFiltrados.filter(m => m.tipo === "entrada").reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0);
      const salidas = datosFiltrados.filter(m => m.tipo === "salida").reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0);
      return {
        registros: datosFiltrados.length,
        total: entradas,
        extra: salidas,
      };
    }
    return {
      registros: datosFiltrados.length,
      total: datosFiltrados.reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0),
      extra: null,
    };
  }, [config, datosFiltrados]);

  const handleVistaPrevia = async () => {
    if (datosFiltrados.length === 0) {
      Swal.fire({
        icon: "info",
        title: t("pages.reportes.no_data_title"),
        text: t("pages.reportes.no_data_text"),
      });
      return;
    }

    let pdfDataUri;
    if (config.type === "ventas") {
      pdfDataUri = await generateVentasPdf({
        ventas: datosFiltrados,
        fechaDesde,
        fechaHasta,
        formatFecha,
        usuario: usuarioNombre,
        preview: true,
      });
    } else if (config.type === "kardex") {
      pdfDataUri = await generateKardexPdf({
        movimientos: datosFiltrados,
        productos,
        fechaDesde,
        fechaHasta,
        formatFecha,
        usuario: usuarioNombre,
        preview: true,
      });
    } else {
      pdfDataUri = await generateMovimientosPdf({
        movimientos: datosFiltrados,
        productos,
        fechaDesde,
        fechaHasta,
        formatFecha,
        tipo: config.movTipo,
        title: t(config.titleKey),
        usuario: usuarioNombre,
        preview: true,
      });
    }
    setPdfUrl(pdfDataUri);
    setShowPreview(true);
  };

  const handleExportExcel = async () => {
    if (config.type === "ventas") {
      await exportVentasExcel({ datos: datosFiltrados, formatFecha, t, nombreArchivo: "reporte-ventas" });
    } else if (config.type === "kardex") {
      await exportMovimientosExcel({ datos: datosFiltrados, productos, formatFecha, t, tipo: "kardex", nombreArchivo: "reporte-kardex" });
    } else {
      const nombreArchivo = config.movTipo === "entrada" ? "reporte-ingresos" : "reporte-salidas";
      await exportMovimientosExcel({ datos: datosFiltrados, productos, formatFecha, t, tipo: config.movTipo, nombreArchivo });
    }
  };

  const handleDownloadPdf = async () => {
    setShowPreview(false);
    if (config.type === "ventas") {
      await generateVentasPdf({ ventas: datosFiltrados, fechaDesde, fechaHasta, formatFecha, usuario: usuarioNombre });
    } else if (config.type === "kardex") {
      await generateKardexPdf({
        movimientos: datosFiltrados,
        productos,
        fechaDesde,
        fechaHasta,
        formatFecha,
        usuario: usuarioNombre,
      });
    } else {
      await generateMovimientosPdf({
        movimientos: datosFiltrados,
        productos,
        fechaDesde,
        fechaHasta,
        formatFecha,
        tipo: config.movTipo,
        title: t(config.titleKey),
        usuario: usuarioNombre,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t(config.titleKey)}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("pages.reportes.subtitle")}</p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button type="button" onClick={() => setShowFilterModal(true)} className="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            Filtros
          </button>
          <button type="button" onClick={handleExportExcel} className="btn-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t("pages.ventas.export_excel")}
          </button>
          <button type="button" onClick={handleVistaPrevia} className="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Generar Reporte
          </button>
        </div>
      </div>

      {/* Mini Resumen en página */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-lg">calendar_today</span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Rango: <span className="font-bold text-slate-800 dark:text-slate-100">{fechaDesde}</span> al <span className="font-bold text-slate-800 dark:text-slate-100">{fechaHasta}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t("pages.reportes.records")}:</span>
            <span className="text-sm font-black text-amber-500">{resumen.registros}</span>
          </div>
          {config.type === "kardex" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Entradas:</span>
                <span className="text-sm font-black text-emerald-500">{resumen.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Salidas:</span>
                <span className="text-sm font-black text-rose-500">{resumen.extra}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {config.type === "ventas" ? t("pages.reportes.total_sales") : t("pages.reportes.total_qty")}:
              </span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                {config.type === "ventas"
                  ? `S/. ${resumen.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : resumen.total}
              </span>
            </div>
          )}
          {config.type === "ventas" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t("pages.reportes.total_profit")}:</span>
              <span className="text-sm font-black text-emerald-500 dark:text-emerald-400">
                S/. {resumen.extra.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pequeño de Filtros de Reporte */}
      {showFilterModal && (
        <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div
            className="modal-content max-w-md w-full p-5 sm:p-6 space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500">
                  <span className="material-symbols-outlined text-xl">filter_alt</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                    {t(config.titleKey)}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configuración de filtros de reporte
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Presets de Fecha */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t("pages.reportes.date_range")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(presets).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePreset(key)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer ${
                        presetActivo === key
                          ? "bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/15 font-bold"
                          : "bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {t(preset.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs Desde y Hasta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t("pages.reportes.date_from")}
                  </label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => {
                      setFechaDesde(e.target.value);
                      setPresetActivo(null);
                    }}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t("pages.reportes.date_to")}
                  </label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => {
                      setFechaHasta(e.target.value);
                      setPresetActivo(null);
                    }}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Filtros Específicos por tipo */}
              {config.type === "ventas" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {t("pages.reportes.filters.payment_method")}
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="select-field w-full"
                    >
                      {METODOS_PAGO.map((mp) => (
                        <option key={mp.value} value={mp.value}>
                          {mp.value ? t(mp.labelKey, { defaultValue: mp.value }) : t(mp.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {t("pages.reportes.filters.client")}
                    </label>
                    <input
                      type="text"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      placeholder={t("pages.reportes.filters.client_placeholder")}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              ) : config.type === "kardex" ? (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        {t("pages.reportes.filters.product")}
                      </label>
                      <input
                        type="text"
                        value={productoFilter}
                        onChange={(e) => setProductoFilter(e.target.value)}
                        placeholder={t("pages.reportes.filters.product_placeholder")}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Tipo Movimiento
                      </label>
                      <select
                        value={movTipoFilter}
                        onChange={(e) => setMovTipoFilter(e.target.value)}
                        className="select-field w-full"
                      >
                        <option value="todos">Todos los movimientos</option>
                        <option value="entrada">Entradas</option>
                        <option value="salida">Salidas</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {t("pages.reportes.filters.reason")}
                    </label>
                    <input
                      type="text"
                      value={motivoSearch}
                      onChange={(e) => setMotivoSearch(e.target.value)}
                      placeholder={t("pages.reportes.filters.reason_placeholder")}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {t("pages.reportes.filters.product")}
                    </label>
                    <input
                      type="text"
                      value={productoFilter}
                      onChange={(e) => setProductoFilter(e.target.value)}
                      placeholder={t("pages.reportes.filters.product_placeholder")}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {t("pages.reportes.filters.reason")}
                    </label>
                    <input
                      type="text"
                      value={motivoSearch}
                      onChange={(e) => setMotivoSearch(e.target.value)}
                      placeholder={t("pages.reportes.filters.reason_placeholder")}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Botones Limpiar Filtros y Generar Reporte */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={clearFilters}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                Limpiar Filtros
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowFilterModal(false);
                  handleVistaPrevia();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                Generar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            {config.type === "ventas" ? (
              <tr>
                <th>{t("pages.reportes.table.date")}</th>
                <th>{t("pages.reportes.table.receipt")}</th>
                <th>{t("pages.reportes.table.client")}</th>
                <th className="text-right">{t("pages.reportes.table.items")}</th>
                <th className="text-right">{t("pages.reportes.table.total")}</th>
                <th className="text-right">{t("pages.reportes.table.profit")}</th>
              </tr>
            ) : config.type === "kardex" ? (
              <tr>
                <th>{t("pages.reportes.table.date")}</th>
                <th>{t("pages.reportes.table.product")}</th>
                <th>{t("pages.reportes.table.code")}</th>
                <th className="text-center">Tipo</th>
                <th className="text-right">{t("pages.reportes.table.qty")}</th>
                <th className="text-right">{t("pages.reportes.table.stock_prev")}</th>
                <th className="text-right">{t("pages.reportes.table.stock_new")}</th>
                <th>{t("pages.reportes.table.reason")}</th>
              </tr>
            ) : (
              <tr>
                <th>{t("pages.reportes.table.date")}</th>
                <th>{t("pages.reportes.table.product")}</th>
                <th>{t("pages.reportes.table.code")}</th>
                <th className="text-right">{t("pages.reportes.table.qty")}</th>
                <th>{t("pages.reportes.table.reason")}</th>
                <th className="text-right">{t("pages.reportes.table.stock_prev")}</th>
                <th className="text-right">{t("pages.reportes.table.stock_new")}</th>
              </tr>
            )}
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={config.type === "ventas" ? 6 : 8}>
                  <SkeletonTable rows={8} cols={config.type === "ventas" ? 6 : 8} />
                </td>
              </tr>
            ) : datosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={config.type === "ventas" ? 6 : 8} className="text-center text-slate-500 py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <p className="text-sm">{t("pages.reportes.no_results")}</p>
                </td>
              </tr>
            ) : config.type === "ventas" ? (
              datosFiltrados.map((v) => (
                <tr key={v.id}>
                  <td className="text-slate-400">{formatFecha(v.fecha)}</td>
                  <td className="font-mono text-amber-500">{v.boleta || `LEGACY-${v.id}`}</td>
                  <td className="text-slate-200">{v.cliente || "\u2014"}</td>
                  <td className="text-right font-mono">{v.cantidadTotal || 0}</td>
                  <td className="text-right font-mono text-slate-200">
                    S/. {(Number(v.totalVenta) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right font-mono text-emerald-400">
                    S/. {(Number(v.utilidad) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : config.type === "kardex" ? (
              datosFiltrados.map((m) => {
                const prod = getProducto(m.productoId);
                const isEntrada = m.tipo === "entrada";
                return (
                  <tr key={m.id}>
                    <td className="text-slate-400">{formatFecha(m.fecha)}</td>
                    <td className="text-slate-200">{prod?.descripcion || t("pages.movimientos.product_deleted")}</td>
                    <td className="font-mono text-amber-500">{prod?.codigo || "\u2014"}</td>
                    <td className="text-center">
                      <span className={isEntrada ? "badge-success" : "badge-danger"}>
                        {isEntrada ? "ENTRADA" : "SALIDA"}
                      </span>
                    </td>
                    <td className={`text-right font-mono font-bold ${isEntrada ? "text-emerald-400" : "text-rose-400"}`}>
                      {isEntrada ? "+" : "-"}{m.cantidad}
                    </td>
                    <td className="text-right font-mono text-slate-400">{m.stockAnterior ?? "\u2014"}</td>
                    <td className="text-right font-mono text-slate-200 font-bold">{m.stockNuevo ?? "\u2014"}</td>
                    <td className="text-slate-400 max-w-[180px] truncate" title={m.motivo}>
                      {m.motivo || "\u2014"}
                    </td>
                  </tr>
                );
              })
            ) : (
              datosFiltrados.map((m) => {
                const prod = getProducto(m.productoId);
                return (
                  <tr key={m.id}>
                    <td className="text-slate-400">{formatFecha(m.fecha)}</td>
                    <td className="text-slate-200">{prod?.descripcion || t("pages.movimientos.product_deleted")}</td>
                    <td className="font-mono text-amber-500">{prod?.codigo || "\u2014"}</td>
                    <td className="text-right font-mono">{m.cantidad}</td>
                    <td className="text-slate-400 max-w-[180px] truncate" title={m.motivo}>
                      {m.motivo || "\u2014"}
                    </td>
                    <td className="text-right font-mono">{m.stockAnterior}</td>
                    <td className="text-right font-mono">{m.stockNuevo}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div
            className="modal-content max-w-5xl w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                  {t("pages.reportes.preview_title")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("pages.reportes.preview_subtitle")}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={handleDownloadPdf} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {t("pages.reportes.download_pdf")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                  {t("pages.reportes.close_preview")}
                </button>
              </div>
            </div>
            <div className="p-0 bg-slate-200 dark:bg-slate-950" style={{ height: "75vh" }}>
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={t("pages.reportes.preview_title")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
