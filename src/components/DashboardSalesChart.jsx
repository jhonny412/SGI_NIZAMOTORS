import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { generateDashboardPdf } from "../utils/reportPdf";

const DIAS_SEMANA = [
  { key: 1, label: "LUN", full: "Lunes", color: "#f59e0b" }, // Ámbar
  { key: 2, label: "MAR", full: "Martes", color: "#10b981" }, // Esmeralda
  { key: 3, label: "MIE", full: "Miércoles", color: "#0ea5e9" }, // Cielo
  { key: 4, label: "JUE", full: "Jueves", color: "#8b5cf6" }, // Púrpura
  { key: 5, label: "VIE", full: "Viernes", color: "#f43f5e" }, // Rosa
  { key: 6, label: "SAB", full: "Sábado", color: "#06b6d4" }, // Cian
  { key: 0, label: "DOM", full: "Domingo", color: "#f97316" }, // Naranja
];

const SEMANAS_COLORES = [
  "#f59e0b", // Sem 1
  "#10b981", // Sem 2
  "#0ea5e9", // Sem 3
  "#8b5cf6", // Sem 4
  "#f43f5e", // Sem 5
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function parseSaleDate(fechaStr) {
  if (!fechaStr) return null;
  if (fechaStr instanceof Date) return isNaN(fechaStr.getTime()) ? null : fechaStr;
  const str = String(fechaStr).trim();

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const [, y, m, d, hh, mm, ss] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh || 0), Number(mm || 0), Number(ss || 0));
  }

  // DD/MM/YYYY
  const latamMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (latamMatch) {
    const [, d, m, y, hh, mm, ss] = latamMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh || 0), Number(mm || 0), Number(ss || 0));
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function toLocalDateKey(d) {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDonutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const angleDiff = endAngle - startAngle;
  const isFullCircle = angleDiff >= 2 * Math.PI - 0.001;
  const safeEndAngle = isFullCircle ? startAngle + 2 * Math.PI - 0.0001 : endAngle;

  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(safeEndAngle);
  const y2 = cy + rOuter * Math.sin(safeEndAngle);

  const x3 = cx + rInner * Math.cos(safeEndAngle);
  const y3 = cy + rInner * Math.sin(safeEndAngle);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);

  const largeArc = angleDiff > Math.PI ? 1 : 0;

  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

export default function DashboardSalesChart({ ventas = [], onNavigateVentas }) {
  const { t } = useTranslation();
  // Filtro principal: "semana" o "mes"
  const [periodo, setPeriodo] = useState("semana");
  // Modo de visualización: "torta" (default) o "barras"
  const [tipoGrafico, setTipoGrafico] = useState("torta");
  // Offset relativo para navegar semanas o meses: 0 = actual, -1 = anterior, +1 = siguiente
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [offsetMes, setOffsetMes] = useState(0);
  // Selección de sector/barra para ver detalle puntual
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState(null);
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // Normalizar ventas con fecha parseada
  const ventasConFecha = useMemo(() => {
    return (ventas || []).map((v) => {
      const parsedDate = parseSaleDate(v.fecha);
      const total = Number(v.totalVenta) || 0;
      const cantidad = Number(v.cantidadTotal) || (Array.isArray(v.items) ? v.items.reduce((s, i) => s + (Number(i.cantidad) || 0), 0) : 1);
      return {
        ...v,
        parsedDate,
        dateKey: parsedDate ? toLocalDateKey(parsedDate) : "",
        totalVentaNum: total,
        cantidadItemsNum: cantidad,
      };
    }).filter((v) => v.parsedDate !== null);
  }, [ventas]);

  // ── Cálculo de datos para "Por Semana" ──────────────────────────
  const weekData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ajustar por offset de semana
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + offsetSemana * 7);

    const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + mondayOffset);

    const days = DIAS_SEMANA.map((diaDef, index) => {
      const curDate = new Date(monday);
      curDate.setDate(monday.getDate() + index);
      const curKey = toLocalDateKey(curDate);
      const isToday = curKey === toLocalDateKey(today);

      const daySales = ventasConFecha.filter((v) => v.dateKey === curKey);
      const totalDinero = daySales.reduce((sum, v) => sum + v.totalVentaNum, 0);
      const totalUnidades = daySales.reduce((sum, v) => sum + v.cantidadItemsNum, 0);

      return {
        key: curKey,
        label: diaDef.label,
        fullDay: diaDef.full,
        color: diaDef.color,
        dayNumber: curDate.getDate(),
        monthNumber: curDate.getMonth() + 1,
        dateFormatted: `${String(curDate.getDate()).padStart(2, "0")}/${String(curDate.getMonth() + 1).padStart(2, "0")}`,
        isToday,
        totalDinero,
        totalOperaciones: daySales.length,
        totalUnidades,
        sales: daySales,
      };
    });

    const totalDineroSemana = days.reduce((sum, d) => sum + d.totalDinero, 0);
    const totalOperacionesSemana = days.reduce((sum, d) => sum + d.totalOperaciones, 0);
    const totalUnidadesSemana = days.reduce((sum, d) => sum + d.totalUnidades, 0);
    const ticketPromedio = totalOperacionesSemana > 0 ? totalDineroSemana / totalOperacionesSemana : 0;
    const maxDayDinero = Math.max(...days.map((d) => d.totalDinero), 1);

    const mondayStr = days[0].dateFormatted;
    const sundayStr = days[6].dateFormatted;
    const yearStr = monday.getFullYear();

    return {
      items: days,
      totalDinero: totalDineroSemana,
      totalOperaciones: totalOperacionesSemana,
      totalUnidades: totalUnidadesSemana,
      ticketPromedio,
      maxVal: maxDayDinero,
      rangoTexto: `${mondayStr} al ${sundayStr}, ${yearStr}`,
      isCurrentPeriod: offsetSemana === 0,
    };
  }, [ventasConFecha, offsetSemana]);

  // ── Cálculo de datos para "Por Mes" ────────────────────────────
  const monthData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today.getFullYear(), today.getMonth() + offsetMes, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    // Dividir el mes en semanas (1-7, 8-14, 15-21, 22-28, 29-fin)
    const weeks = [];
    let startDay = 1;
    let weekIndex = 1;

    while (startDay <= lastDayOfMonth) {
      const endDay = Math.min(startDay + 6, lastDayOfMonth);
      const startKey = toLocalDateKey(new Date(year, month, startDay));
      const endKey = toLocalDateKey(new Date(year, month, endDay));

      const weekSales = ventasConFecha.filter((v) => v.dateKey >= startKey && v.dateKey <= endKey);
      const totalDinero = weekSales.reduce((sum, v) => sum + v.totalVentaNum, 0);
      const totalUnidades = weekSales.reduce((sum, v) => sum + v.cantidadItemsNum, 0);

      weeks.push({
        key: `sem-${weekIndex}`,
        label: `Sem ${weekIndex}`,
        fullDay: `Semana ${weekIndex}`,
        color: SEMANAS_COLORES[(weekIndex - 1) % SEMANAS_COLORES.length],
        rangeLabel: `${startDay} - ${endDay} ${MESES[month].substring(0, 3)}`,
        fullLabel: `Semana ${weekIndex} (${startDay} al ${endDay} de ${MESES[month]})`,
        startDay,
        endDay,
        totalDinero,
        totalOperaciones: weekSales.length,
        totalUnidades,
        sales: weekSales,
      });

      startDay = endDay + 1;
      weekIndex++;
    }

    const totalDineroMes = weeks.reduce((sum, w) => sum + w.totalDinero, 0);
    const totalOperacionesMes = weeks.reduce((sum, w) => sum + w.totalOperaciones, 0);
    const totalUnidadesMes = weeks.reduce((sum, w) => sum + w.totalUnidades, 0);
    const ticketPromedio = totalOperacionesMes > 0 ? totalDineroMes / totalOperacionesMes : 0;
    const maxWeekDinero = Math.max(...weeks.map((w) => w.totalDinero), 1);

    return {
      items: weeks,
      totalDinero: totalDineroMes,
      totalOperaciones: totalOperacionesMes,
      totalUnidades: totalUnidadesMes,
      ticketPromedio,
      maxVal: maxWeekDinero,
      rangoTexto: `${MESES[month]} ${year}`,
      isCurrentPeriod: offsetMes === 0,
    };
  }, [ventasConFecha, offsetMes]);

  const activeData = periodo === "semana" ? weekData : monthData;
  const rawItems = activeData.items;

  // Sectores de torta para los elementos con ventas > 0
  const pieSlices = useMemo(() => {
    const itemsConVenta = rawItems.filter((i) => i.totalDinero > 0);
    const totalDinero = activeData.totalDinero;

    if (totalDinero <= 0 || itemsConVenta.length === 0) return [];

    let currentAngle = -Math.PI / 2; // Iniciar a las 12 en punto
    return itemsConVenta.map((item, index) => {
      const pct = (item.totalDinero / totalDinero) * 100;
      const angle = (item.totalDinero / totalDinero) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const isHovered = hoveredSliceIndex === index;
      const rOuter = isHovered ? 106 : 100;
      const rInner = isHovered ? 56 : 58;

      const pathData = getDonutArcPath(120, 120, rOuter, rInner, startAngle, endAngle);

      return {
        ...item,
        sliceIndex: index,
        pct,
        startAngle,
        endAngle,
        pathData,
        isHovered,
      };
    });
  }, [rawItems, activeData.totalDinero, hoveredSliceIndex]);

  const activeHoverSlice = hoveredSliceIndex !== null ? pieSlices[hoveredSliceIndex] : null;

  return (
    <div className="bento-card p-6 flex flex-col justify-between border-t-4 border-t-amber-500 shadow-xl transition-all bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100">
      {/* Encabezado con Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-2xl">pie_chart</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Ventas Generadas
            </h3>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {periodo === "semana" ? "Semanal" : "Mensual"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Distribución proporcional y volumen de ingresos por período.
          </p>
        </div>

        {/* Controles de Filtro: Toggle Semana/Mes + Toggle Torta/Barras + Navegación */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Navegación de período */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                if (periodo === "semana") setOffsetSemana((prev) => prev - 1);
                else setOffsetMes((prev) => prev - 1);
                setItemSeleccionado(null);
              }}
              title="Período anterior"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-500 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 select-none whitespace-nowrap min-w-[130px] text-center">
              {activeData.rangoTexto}
            </span>
            <button
              type="button"
              onClick={() => {
                if (periodo === "semana") setOffsetSemana((prev) => prev + 1);
                else setOffsetMes((prev) => prev + 1);
                setItemSeleccionado(null);
              }}
              title="Período siguiente"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-500 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
            {!activeData.isCurrentPeriod && (
              <button
                type="button"
                onClick={() => {
                  if (periodo === "semana") setOffsetSemana(0);
                  else setOffsetMes(0);
                  setItemSeleccionado(null);
                }}
                className="ml-1 text-[10px] font-black text-amber-600 dark:text-amber-500 hover:text-amber-500 px-2 py-1 bg-amber-500/10 rounded-md uppercase tracking-wider transition-colors cursor-pointer"
                title="Volver a la fecha actual"
              >
                Hoy
              </button>
            )}
          </div>

          {/* Filtro Aplicable: Por Semana / Por Mes */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setPeriodo("semana");
                setItemSeleccionado(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                periodo === "semana"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Por Semana
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodo("mes");
                setItemSeleccionado(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                periodo === "mes"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Por Mes
            </button>
          </div>

          {/* Toggle de Tipo de Gráfico: Torta vs Barras */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setTipoGrafico("torta")}
              title="Ver reporte en Gráfico de Torta"
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                tipoGrafico === "torta"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-base leading-none">pie_chart</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoGrafico("barras")}
              title="Ver reporte en Gráfico de Barras"
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                tipoGrafico === "barras"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-base leading-none">bar_chart</span>
            </button>
          </div>

          {/* Botón de Impresión PDF de Ventas */}
          <button
            type="button"
            onClick={async () => {
              setExportandoPdf(true);
              try {
                await generateDashboardPdf({
                  usuario: "Sistema Niza Motors",
                  periodoVentasLabel: activeData.rangoTexto,
                  tipoGraficoVentas: tipoGrafico,
                  ventasResumen: {
                    totalDinero: activeData.totalDinero,
                    totalOperaciones: activeData.totalOperaciones,
                    ticketPromedio: activeData.ticketPromedio,
                    totalUnidades: activeData.totalUnidades,
                  },
                  ventasDesglose: activeData.items,
                });
              } catch (err) {
                console.error("Error al exportar PDF de ventas:", err);
              } finally {
                setExportandoPdf(false);
              }
            }}
            disabled={exportandoPdf}
            title="Descargar reporte de ventas en PDF"
            className="p-1.5 sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-500 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <span className="material-symbols-outlined text-base text-amber-500 leading-none">picture_as_pdf</span>
            <span className="hidden sm:inline">{exportandoPdf ? "Generando..." : "PDF Ventas"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats del Período Filtrado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Total Recaudado
            </p>
            <span className="material-symbols-outlined text-amber-500 text-base opacity-80">payments</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-500 mt-1 font-mono">
            S/. {activeData.totalDinero.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Ingreso bruto facturado</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Transacciones
            </p>
            <span className="material-symbols-outlined text-sky-500 text-base opacity-80">receipt_long</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {activeData.totalOperaciones} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ventas</span>
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Boletas emitidas</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Ticket Promedio
            </p>
            <span className="material-symbols-outlined text-emerald-500 text-base opacity-80">query_stats</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            S/. {activeData.ticketPromedio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Por operación comercial</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Repuestos Vendidos
            </p>
            <span className="material-symbols-outlined text-purple-500 text-base opacity-80">inventory_2</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {activeData.totalUnidades} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">unids</span>
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Artículos despachados</p>
        </div>
      </div>

      {/* Visualización Principal: Gráfico de Torta (o Gráfico de Barras según selector) */}
      {tipoGrafico === "torta" ? (
        /* ── GRÁFICO DE TORTA DE VENTAS GENERADAS ── */
        <div className="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 my-2">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Proporción de ingresos {periodo === "semana" ? "por día de la semana" : "por semana del mes"}
            </span>
            {itemSeleccionado && (
              <button
                type="button"
                onClick={() => setItemSeleccionado(null)}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">close</span>
                Limpiar selección
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Torta Donut SVG */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center py-2">
              <div className="relative w-[230px] h-[230px] flex items-center justify-center">
                <svg
                  viewBox="0 0 240 240"
                  className="w-full h-full transform transition-transform filter drop-shadow-md"
                >
                  {/* Anillo de fondo */}
                  <circle
                    cx="120"
                    cy="120"
                    r="100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="42"
                    className="text-slate-200 dark:text-slate-800/40"
                  />

                  {/* Sectores de la torta */}
                  {pieSlices.map((slice) => (
                    <path
                      key={slice.key}
                      d={slice.pathData}
                      fill={slice.color}
                      className="cursor-pointer transition-all duration-300 hover:opacity-90 stroke-white dark:stroke-slate-900"
                      strokeWidth="2"
                      onClick={() => setItemSeleccionado(itemSeleccionado?.key === slice.key ? null : slice)}
                      onMouseEnter={() => setHoveredSliceIndex(slice.sliceIndex)}
                      onMouseLeave={() => setHoveredSliceIndex(null)}
                    />
                  ))}
                </svg>

                {/* Hub Central del Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  {activeHoverSlice ? (
                    <div className="animate-fade-in max-w-[130px]">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mb-0.5"
                        style={{ backgroundColor: activeHoverSlice.color }}
                      />
                      <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase truncate">
                        {activeHoverSlice.fullDay || activeHoverSlice.label}
                      </p>
                      <p className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                        S/. {activeHoverSlice.totalDinero.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                        {activeHoverSlice.pct.toFixed(1)}% del período
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Total {periodo === "semana" ? "Semanal" : "Mensual"}
                      </span>
                      <p className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                        S/. {activeData.totalDinero.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                        {activeData.totalOperaciones} transacciones
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                Haz clic en un sector para inspeccionar sus boletas.
              </p>
            </div>

            {/* Desglose / Leyenda Interactiva */}
            <div className="lg:col-span-7 space-y-2">
              {rawItems.map((item) => {
                const slice = pieSlices.find((s) => s.key === item.key);
                const pct = slice?.pct || 0;
                const isSelected = itemSeleccionado?.key === item.key;
                const isHovered = hoveredSliceIndex !== null && pieSlices[hoveredSliceIndex]?.key === item.key;
                const hasSales = item.totalDinero > 0;

                return (
                  <div
                    key={item.key}
                    onClick={() => setItemSeleccionado(isSelected ? null : item)}
                    onMouseEnter={() => {
                      if (slice) setHoveredSliceIndex(slice.sliceIndex);
                    }}
                    onMouseLeave={() => setHoveredSliceIndex(null)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-50 dark:bg-slate-900 border-amber-500 shadow-sm ring-1 ring-amber-500/30"
                        : isHovered
                          ? "bg-slate-100 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700"
                          : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-md shrink-0 shadow-xs"
                        style={{ backgroundColor: hasSales ? item.color : "#94a3b8" }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">
                            {item.fullDay || item.fullLabel || item.label}
                          </p>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            ({item.dateFormatted || item.rangeLabel})
                          </span>
                          {item.isToday && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-500 font-black px-1.5 py-0.2 rounded uppercase">
                              Hoy
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.totalOperaciones} ventas • {item.totalUnidades} items despachados
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <p className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">
                        S/. {item.totalDinero.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-500">
                        {hasSales ? `${pct.toFixed(1)}%` : "0.0%"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── GRÁFICO DE BARRAS ALTERNATIVO ── */
        <div className="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 my-2">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Distribución de ventas por columnas — Haz clic en una para inspeccionar
            </span>
            {itemSeleccionado && (
              <button
                type="button"
                onClick={() => setItemSeleccionado(null)}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">close</span>
                Limpiar selección
              </button>
            )}
          </div>

          <div className="flex items-end gap-2 sm:gap-4 min-h-[190px] pt-6 px-1">
            {rawItems.map((bar) => {
              const heightPct = activeData.maxVal > 0 ? (bar.totalDinero / activeData.maxVal) * 100 : 0;
              const isSelected = itemSeleccionado?.key === bar.key;
              const hasSales = bar.totalDinero > 0;

              return (
                <div
                  key={bar.key}
                  onClick={() => setItemSeleccionado(isSelected ? null : bar)}
                  className="flex-1 flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <div className="w-full flex justify-center items-end h-[160px] relative">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-950 text-white border border-amber-500/40 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-30 whitespace-nowrap min-w-[120px] text-center">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                        {bar.fullDay || bar.fullLabel}
                      </p>
                      <p className="text-xs font-black text-white font-mono mt-0.5">
                        S/. {bar.totalDinero.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-300 mt-0.5">
                        {bar.totalOperaciones} ventas • {bar.totalUnidades} items
                      </p>
                    </div>

                    <div
                      className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 relative ${
                        isSelected
                          ? "bg-gradient-to-t from-amber-600 to-amber-400 ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 shadow-lg shadow-amber-500/30"
                          : hasSales
                            ? "bg-gradient-to-t from-amber-600 to-amber-500 group-hover:brightness-110 shadow-md shadow-amber-500/10"
                            : "bg-slate-200 dark:bg-slate-800/40 border-t border-slate-300 dark:border-slate-700/60 group-hover:bg-slate-300 dark:group-hover:bg-slate-700/60"
                      }`}
                      style={{
                        height: `${hasSales ? Math.max(heightPct, 6) : 3}%`,
                      }}
                    >
                      {hasSales && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          S/.{Math.round(bar.totalDinero)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <span
                      className={`block text-[10px] font-black uppercase tracking-wider ${
                        bar.isToday
                          ? "text-amber-600 dark:text-amber-400 underline underline-offset-2"
                          : isSelected
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {bar.label}
                    </span>
                    <span className="block text-[9px] text-slate-500 dark:text-slate-500 font-mono">
                      {bar.dateFormatted || bar.rangeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detalle puntual si el usuario hizo clic en un sector o barra */}
      {itemSeleccionado && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-amber-500/40 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-lg">calendar_view_day</span>
              <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Detalle de Ventas: {itemSeleccionado.fullDay || itemSeleccionado.fullLabel}
              </h5>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-amber-600 dark:text-amber-500 font-mono">
                Total: S/. {itemSeleccionado.totalDinero.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                ({itemSeleccionado.totalOperaciones} operaciones)
              </span>
            </div>
          </div>

          {itemSeleccionado.sales?.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {itemSeleccionado.sales.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500 text-base">receipt</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {v.boleta || `Venta #${v.id}`}
                        {v.cliente ? <span className="text-slate-500 dark:text-slate-400 font-normal"> • {v.cliente}</span> : null}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Vendedor: {v.vendedor || "Sistema"} • Pago: {v.metodoPago || "Efectivo"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                      S/. {Number(v.totalVentaNum).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {v.cantidadItemsNum} item(s)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">
              No hay transacciones registradas para este día/período.
            </p>
          )}
        </div>
      )}

      {/* Pie con Acceso a Ventas */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
            <span>Monto facturado en Soles (S/.)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-300 dark:bg-slate-800 rounded-sm border border-slate-300 dark:border-slate-700" />
            <span>Sin ventas registradas</span>
          </div>
        </div>

        {onNavigateVentas && (
          <button
            type="button"
            onClick={onNavigateVentas}
            className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-500 hover:text-amber-500 font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Ver historial comercial completo</span>
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
}
