import { useMemo, useState } from "react";
import { useInventory } from "../context/useInventory";
import { useAuth } from "../context/useAuth";
import { useUI } from "../context/useUI";
import { useTranslation } from "react-i18next";
import { SkeletonCard, SkeletonTable } from "../components/Skeleton";
import DashboardSalesChart from "../components/DashboardSalesChart";
import DashboardTopProducts from "../components/DashboardTopProducts";
import vendedorBg from "../assets/vendedor-bg.jpg";
import { generateDashboardPdf } from "../utils/reportPdf";

const DIA_LABELS = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];

function getDateOnly(fecha) {
  if (!fecha) return "";
  return fecha.includes("T") ? fecha.split("T")[0] : fecha;
}

function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentWeekDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return DIA_LABELS.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return { label, startStr: formatDateLocal(date), endStr: formatDateLocal(date) };
  });
}

function getCurrentMonthWeeks() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let weekStart = 1;

  while (weekStart <= lastDay) {
    const weekEnd = Math.min(weekStart + 6, lastDay);
    weeks.push({
      label: weekStart === weekEnd ? `${weekStart}` : `${weekStart}-${weekEnd}`,
      startStr: formatDateLocal(new Date(year, month, weekStart)),
      endStr: formatDateLocal(new Date(year, month, weekEnd)),
    });
    weekStart = weekEnd + 1;
  }

  return weeks;
}

function isDateInRange(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr;
}

function buildFlowData(periods, movimientos) {
  const data = periods.map(({ label, startStr, endStr }) => {
    const entradas = movimientos
      .filter((m) => isDateInRange(getDateOnly(m.fecha), startStr, endStr) && m.tipo === "entrada")
      .reduce((sum, m) => sum + m.cantidad, 0);
    const salidas = movimientos
      .filter((m) => isDateInRange(getDateOnly(m.fecha), startStr, endStr) && m.tipo === "salida")
      .reduce((sum, m) => sum + m.cantidad, 0);
    return { label, key: `${startStr}-${endStr}`, entradas, salidas };
  });

  const maxVal = Math.max(...data.flatMap((d) => [d.entradas, d.salidas]), 1);
  return data.map((d) => ({
    ...d,
    entradasPct: (d.entradas / maxVal) * 100,
    salidasPct: (d.salidas / maxVal) * 100,
  }));
}

export default function Dashboard() {
  const {
    totalProductos, valorInventario, valorVentaInventario,
    stockBajo = [], stockAgotado = [],
    cargando, ventas = [], movimientos = [],
    productos = [], categorias = []
  } = useInventory();
  const { setPaginaActiva } = useUI();
  const { usuarioActivo } = useAuth();
  const { t } = useTranslation();
  const esAdmin = usuarioActivo?.rol?.toLowerCase() === "admin" || usuarioActivo?.rol?.toLowerCase() === "superadmin";
  const esVendedor = usuarioActivo?.rol?.toLowerCase() === "vendedor";
  const [periodoFlujo, setPeriodoFlujo] = useState("semana");
  const [vistaVendedor, setVistaVendedor] = useState("pos"); // "pos" | "dashboard"
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const flowData = useMemo(() => {
    const periods = periodoFlujo === "semana" ? getCurrentWeekDays() : getCurrentMonthWeeks();
    return buildFlowData(periods, movimientos || []);
  }, [movimientos, periodoFlujo]);

  // Alert count
  const alertCount = (stockBajo || []).length + (stockAgotado || []).length;
  
  // Get critical items to display
  const criticalItems = [...(stockAgotado || []), ...(stockBajo || [])].slice(0, 5);

  const periodoFlujoLabel = periodoFlujo === "semana" ? "Semana actual" : "Mes actual";
  const btnActivo = "px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-xs";
  const btnInactivo = "px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-wider";

  const handleImprimirReportePdf = async () => {
    setGenerandoPdf(true);
    try {
      // Calcular productos más vendidos
      const acc = {};
      (ventas || []).forEach((v) => {
        let items = v.items;
        if (typeof items === "string") {
          try { items = JSON.parse(items); } catch { items = []; }
        }
        if (Array.isArray(items)) {
          items.forEach((item) => {
            const cant = Number(item.cantidad) || 0;
            const precio = Number(item.precioUnitario) || Number(item.pVenta) || 0;
            const prodMatch = (productos || []).find((p) => {
              if (item.productoId && Number(p.id) === Number(item.productoId)) return true;
              if (item.codigo && p.codigo && String(p.codigo).trim().toLowerCase() === String(item.codigo).trim().toLowerCase()) return true;
              return false;
            });
            const key = prodMatch?.id ? `prod-${prodMatch.id}` : (item.productoId ? `prod-${item.productoId}` : `sku-${item.codigo}`);
            if (!acc[key]) {
              acc[key] = {
                descripcion: prodMatch?.descripcion || item.descripcion || "Repuesto",
                codigo: prodMatch?.codigo || item.codigo || "-",
                categoria: prodMatch?.categoria || item.categoria || "Sin categoría",
                marca: prodMatch?.marca || item.marca || "Niza",
                stockActual: prodMatch?.stock ?? null,
                cantidadVendida: 0,
                totalDinero: 0,
              };
            }
            acc[key].cantidadVendida += cant;
            acc[key].totalDinero += cant * precio;
          });
        }
      });

      const topProds = Object.values(acc)
        .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
        .slice(0, 10);

      // Calcular resumen de ventas
      const totalDineroVentas = (ventas || []).reduce((s, v) => s + (Number(v.totalVenta) || 0), 0);
      const totalOperaciones = (ventas || []).length;
      const totalUnidades = (ventas || []).reduce((s, v) => s + (Number(v.cantidadTotal) || 0), 0);
      const ticketPromedio = totalOperaciones > 0 ? totalDineroVentas / totalOperaciones : 0;

      // Calcular desglose de ventas de la semana actual para el gráfico en PDF
      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const DIAS_CONFIG = [
        { key: 1, label: "LUN", fullDay: "Lunes", color: "#f59e0b" },
        { key: 2, label: "MAR", fullDay: "Martes", color: "#10b981" },
        { key: 3, label: "MIE", fullDay: "Miércoles", color: "#0ea5e9" },
        { key: 4, label: "JUE", fullDay: "Jueves", color: "#8b5cf6" },
        { key: 5, label: "VIE", fullDay: "Viernes", color: "#f43f5e" },
        { key: 6, label: "SAB", fullDay: "Sábado", color: "#06b6d4" },
        { key: 0, label: "DOM", fullDay: "Domingo", color: "#f97316" },
      ];

      const desgloseVentas = DIAS_CONFIG.map((conf, index) => {
        const curDate = new Date(monday);
        curDate.setDate(monday.getDate() + index);
        const yyyy = curDate.getFullYear();
        const mm = String(curDate.getMonth() + 1).padStart(2, "0");
        const dd = String(curDate.getDate()).padStart(2, "0");
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const dateFormatted = `${dd}/${mm}`;

        const daySales = (ventas || []).filter((v) => {
          if (!v.fecha) return false;
          const s = String(v.fecha);
          if (s.startsWith(dateKey) || s.startsWith(`${dd}/${mm}/${yyyy}`)) return true;
          const parsed = new Date(s);
          return !isNaN(parsed.getTime()) && parsed.getFullYear() === yyyy && (parsed.getMonth() + 1) === Number(mm) && parsed.getDate() === Number(dd);
        });

        const totalDinero = daySales.reduce((s, v) => s + (Number(v.totalVenta) || 0), 0);
        const totalUnits = daySales.reduce((s, v) => s + (Number(v.cantidadTotal) || 0), 0);

        return {
          label: conf.label,
          fullDay: conf.fullDay,
          color: conf.color,
          dateFormatted,
          totalDinero,
          totalOperaciones: daySales.length,
          totalUnidades: totalUnits,
          pct: totalDineroVentas > 0 ? (totalDinero / totalDineroVentas) * 100 : 0,
        };
      });

      await generateDashboardPdf({
        usuario: usuarioActivo?.nombre || "Administrador",
        totalProductos,
        valorInventario,
        valorVentaInventario,
        periodoVentasLabel: "Semana Actual",
        tipoGraficoVentas: "torta",
        ventasResumen: {
          totalDinero: totalDineroVentas,
          totalOperaciones,
          ticketPromedio,
          totalUnidades,
        },
        ventasDesglose: desgloseVentas,
        categoriaFiltro: "Todas las Categorías (Top 10)",
        topProductos: topProds,
        stockCritico: criticalItems,
        preview: false,
      });
    } catch (err) {
      console.error("Error al generar PDF del Dashboard:", err);
    } finally {
      setGenerandoPdf(false);
    }
  };

  // ── Vista especial para Vendedor (con opción a ver Dashboard) ──
  if (esVendedor && vistaVendedor === "pos") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center relative animate-fade-in -m-3 sm:-m-4 md:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src={vendedorBg}
            alt="Niza Motors"
            className="w-full h-full object-cover opacity-85 filter brightness-[0.88] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/35 to-slate-950/20" />
        </div>

        {/* Welcome content card */}
        <div className="relative z-10 text-center px-8 py-10 max-w-lg mx-4 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-[#334155] backdrop-blur-md shadow-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-500 mb-6 shadow-inner">
            <span className="material-symbols-outlined text-4xl">storefront</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-500 mb-2">
            NIZA MOTORS — PUNTO DE VENTA
          </p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-3">
            ¡Bienvenido, {usuarioActivo?.nombre || "Vendedor"}!
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-8 leading-relaxed">
            Accede al módulo comercial para registrar ventas, gestionar créditos o revisar métricas del negocio.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <button
              onClick={() => setPaginaActiva("ventas")}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">point_of_sale</span>
              Registrar Venta
            </button>
            <button
              onClick={() => setPaginaActiva("creditos")}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-900 dark:bg-slate-800/90 text-white font-black text-sm rounded-xl border-2 border-amber-500/50 hover:bg-slate-800 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-lg text-amber-400">credit_card</span>
              <span className="text-white font-black drop-shadow-xs">Gestionar Créditos</span>
            </button>
            <button
              onClick={() => setVistaVendedor("dashboard")}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-100 dark:bg-slate-950 text-amber-600 dark:text-amber-400 font-black text-sm rounded-xl border border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:bg-slate-200 dark:hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-lg">pie_chart</span>
              <span>Ver Métricas Dashboard</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10 flex justify-center px-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/90 dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-5 py-2 rounded-full border border-slate-300 dark:border-slate-700 shadow-xl">
            © 2026 NIZA MOTORS • SISTEMA DE GESTIÓN DE INVENTARIO
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#334155]/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-amber-600 dark:text-amber-500 uppercase tracking-tight">
              {t("pages.dashboard.title")}
            </h2>
            {esVendedor && (
              <span className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Vista Vendedor
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Ventas periódicas, productos con mayor rotación y control de inventario.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón Imprimir Reporte PDF */}
          <button
            type="button"
            onClick={handleImprimirReportePdf}
            disabled={generandoPdf}
            title="Descargar o imprimir reporte ejecutivo completo en PDF"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base leading-none">picture_as_pdf</span>
            <span>{generandoPdf ? "Generando..." : "Imprimir Reporte PDF"}</span>
          </button>

          {esVendedor && (
            <button
              type="button"
              onClick={() => setVistaVendedor("pos")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:border-amber-500 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">storefront</span>
              <span>Modo Punto de Venta</span>
            </button>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 led-glow-green animate-pulse" />
            {t("pages.dashboard.updated")}
          </div>
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
            <div className="bento-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500 group relative bg-white dark:bg-slate-900/90 shadow-md">
              <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10 group-hover:opacity-15 transition-opacity">
                <span className="material-symbols-outlined text-[100px] text-slate-700 dark:text-slate-300">inventory_2</span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">{t("pages.dashboard.active_products")}</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{totalProductos || 0}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 relative z-10">
                <span className="text-amber-600 dark:text-amber-500 text-xs font-bold font-mono">Activos</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs">en catálogo oficial</span>
              </div>
            </div>

            {/* KPI 2: Inventory Value or Sales Count */}
            {esAdmin ? (
              <div className="bento-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500 group relative bg-white dark:bg-slate-900/90 shadow-md">
                <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10 group-hover:opacity-15 transition-opacity">
                  <span className="material-symbols-outlined text-[100px] text-slate-700 dark:text-slate-300">payments</span>
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">{t("pages.dashboard.inventory_cost")}</p>
                  <h3 className="text-3xl font-black text-amber-600 dark:text-amber-500 mt-2">
                    S/. {(valorInventario || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="mt-4 flex items-center gap-1.5 relative z-10">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">Valuación venta:</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    S/. {(valorVentaInventario || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bento-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500 group relative bg-white dark:bg-slate-900/90 shadow-md">
                <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10 group-hover:opacity-15 transition-opacity">
                  <span className="material-symbols-outlined text-[100px] text-slate-700 dark:text-slate-300">point_of_sale</span>
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">VENTAS REGISTRADAS</p>
                  <h3 className="text-3xl font-black text-amber-600 dark:text-amber-500 mt-2">
                    {(ventas || []).length}
                  </h3>
                </div>
                <div className="mt-4 flex items-center gap-1.5 relative z-10">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">Estado:</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Operaciones comerciales activas</span>
                </div>
              </div>
            )}

            {/* KPI 3: System Status */}
            <div className="bento-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500 group relative bg-white dark:bg-slate-900/90 shadow-md">
              <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10 group-hover:opacity-15 transition-opacity">
                <span className="material-symbols-outlined text-[100px] text-slate-700 dark:text-slate-300">check_circle</span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">ESTADO DEL SISTEMA</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 led-glow-green animate-pulse"></div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">En línea</h3>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 relative z-10">Sincronizado con Sheets en tiempo real</p>
            </div>
          </>
        )}
      </div>

      {/* ── SECCIÓN 1: Ventas Generadas (Por Semana y Por Mes con Filtro) ── */}
      <DashboardSalesChart
        ventas={ventas}
        onNavigateVentas={() => setPaginaActiva("ventas")}
      />

      {/* ── SECCIÓN 2: Productos Más Vendidos (Gráfico de Torta) + Stock Crítico ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Productos Más Vendidos con Gráfico de Torta (8 columnas) */}
        <div className="lg:col-span-8">
          <DashboardTopProducts
            ventas={ventas}
            productos={productos}
            categorias={categorias}
            onNavigateProductos={() => setPaginaActiva("productos")}
          />
        </div>

        {/* Stock Crítico (4 columnas) */}
        <div className="lg:col-span-4 bento-card flex flex-col justify-between border-t-4 border-t-amber-500 shadow-xl bg-white dark:bg-slate-900/90">
          <div className="p-5 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-[#334155]/60 flex justify-between items-center">
            <div>
              <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Stock Crítico</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Piezas que requieren atención operativa</p>
            </div>
            <span className="bg-red-500/15 text-red-600 dark:text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1 uppercase tracking-wider shrink-0">
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
                  <tr className="bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-[#334155]/30">
                    <th className="px-4 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Pieza / SKU</th>
                    <th className="px-4 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Cant.</th>
                    <th className="px-4 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#334155]/20">
                  {criticalItems.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-500/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px] uppercase">{p.descripcion}</p>
                        <p className="text-[9px] text-amber-600 dark:text-amber-500 font-mono tracking-wider">{p.marca || "Niza"} • SKU-{p.codigo}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-xs font-black ${p.stock === 0 ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-500"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setPaginaActiva("productos")} 
                          className="material-symbols-outlined text-amber-600 dark:text-amber-500 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          title="Gestionar producto en inventario"
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
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t("pages.dashboard.no_alerts")}</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setPaginaActiva("productos")}
            className="w-full py-3 text-center text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-500 hover:bg-amber-500/10 transition-colors border-t border-slate-200 dark:border-[#334155]/60 bg-slate-50 dark:bg-slate-950/40 uppercase cursor-pointer"
          >
            Gestionar Pedidos Pendientes
          </button>
        </div>
      </div>

      {/* ── SECCIÓN 3: Flujo de Inventario (Entradas vs Salidas) ── */}
      <div className="bento-card p-6 flex flex-col justify-between bg-white dark:bg-slate-900/90 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Flujo de Inventario</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Entradas vs Salidas ({periodoFlujoLabel})</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPeriodoFlujo("semana")}
              className={periodoFlujo === "semana" ? btnActivo : btnInactivo}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFlujo("mes")}
              className={periodoFlujo === "mes" ? btnActivo : btnInactivo}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="flex items-end gap-4 min-h-[200px] pt-4 px-2">
          {flowData.map(({ label, key, entradas, salidas, entradasPct, salidasPct }) => (
            <div key={key} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex gap-1 items-end h-[160px]">
                <div className="relative flex-1 group/bar h-full flex items-end">
                  <div
                    className="bg-slate-300 dark:bg-slate-700/40 w-full rounded-t border-x border-t border-slate-300 dark:border-slate-700/60 cursor-default transition-all group-hover/bar:bg-slate-400 dark:group-hover/bar:bg-slate-600/60"
                    style={{ height: `${salidas > 0 ? Math.max(salidasPct, 4) : 2}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-950 text-white border border-slate-700 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity z-20">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Salidas</p>
                    <p className="text-xs font-black text-slate-100">{salidas} <span className="text-[9px] font-bold text-slate-400">items</span></p>
                  </div>
                </div>
                <div className="relative flex-1 group/bar h-full flex items-end">
                  <div
                    className="bg-amber-500 w-full rounded-t led-glow cursor-default transition-all group-hover/bar:brightness-110"
                    style={{ height: `${entradas > 0 ? Math.max(entradasPct, 4) : 2}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-950 text-white border border-amber-500/30 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity z-20">
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Entradas</p>
                    <p className="text-xs font-black text-amber-400">{entradas} <span className="text-[9px] font-bold text-amber-500/60">items</span></p>
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-6 justify-center border-t border-slate-200 dark:border-[#334155]/60 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Entradas (Repuestos)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-700 rounded-sm"></span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Salidas (Servicios)</span>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 4: Quick Actions Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {esAdmin ? (
          <>
            <div 
              onClick={() => setPaginaActiva("productos")}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">add_box</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">Nuevo Producto</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Cargar repuesto</p>
              </div>
            </div>

            <div 
              onClick={() => setPaginaActiva("ventas")}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">point_of_sale</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">Registrar Venta</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Orden de servicio</p>
              </div>
            </div>

            <div 
              onClick={handleImprimirReportePdf}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">picture_as_pdf</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">Generar Reporte PDF</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Descargar informe ejecutivo</p>
              </div>
            </div>

            <div 
              onClick={() => setPaginaActiva("movimientos")}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">history</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">Historial</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Auditoría completa</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div 
              onClick={() => setPaginaActiva("productos")}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group col-span-2 shadow-xs"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">Ver Catálogo de Repuestos</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Buscar piezas y consultar stock</p>
              </div>
            </div>

            <div 
              onClick={() => setPaginaActiva("ventas")}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-[#334155] rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/80 transition-all cursor-pointer group col-span-2 shadow-xs"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner border border-amber-500/20">
                <span className="material-symbols-outlined">point_of_sale</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">Registrar Nueva Venta</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Orden de servicio y emisión rápida</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Details */}
      <footer className="mt-8 border-t border-slate-200 dark:border-[#334155]/30 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        <p className="text-left">© 2026 NIZA MOTORS • MIDNIGHT CHROME MANAGEMENT SYSTEM</p>
        <div className="text-center text-amber-600 dark:text-amber-500 font-extrabold tracking-widest">
          DESARROLLADO POR: <a href="https://www.solbinx.com" target="_blank" rel="noopener noreferrer" className="hover:underline">www.solbinx.com</a>
        </div>
        <div className="flex md:justify-end gap-4">
          <span className="text-amber-600 dark:text-amber-500/80">VERSIÓN 2.4.0-STABLE</span>
          <span>SERVIDOR: CLOUD-AUTO-01</span>
        </div>
      </footer>
    </div>
  );
}
