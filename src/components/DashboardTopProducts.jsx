import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { generateDashboardPdf } from "../utils/reportPdf";

const SLICE_COLORS = [
  "#f59e0b", // Ámbar / Dorado
  "#10b981", // Esmeralda
  "#0ea5e9", // Azul Cielo
  "#8b5cf6", // Púrpura
  "#f43f5e", // Rosa
  "#06b6d4", // Cian
  "#f97316", // Naranja
  "#6366f1", // Índigo
  "#eab308", // Amarillo
  "#14b8a6", // Turquesa
];

function getDonutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  // Evitar colapso si es círculo completo (360 grados)
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

export default function DashboardTopProducts({
  ventas = [],
  productos = [],
  categorias = [],
  onNavigateProductos,
}) {
  const { t } = useTranslation();
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [limite, setLimite] = useState(5);
  const [criterioOrden, setCriterioOrden] = useState("cantidad"); // "cantidad" | "dinero"
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // Compilar lista unificada de categorías
  const listaCategorias = useMemo(() => {
    const catMap = new Map();
    (categorias || []).forEach((c) => {
      const nombre = (c.nombre || "").trim();
      if (nombre) catMap.set(nombre.toLowerCase(), nombre);
    });
    (productos || []).forEach((p) => {
      const nombre = (p.categoria || "").trim();
      if (nombre) catMap.set(nombre.toLowerCase(), nombre);
    });
    return Array.from(catMap.values()).sort((a, b) => a.localeCompare(b));
  }, [categorias, productos]);

  // Consolidar ventas por producto
  const rankingProductos = useMemo(() => {
    const acc = {};

    (ventas || []).forEach((venta) => {
      let items = venta.items;
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch {
          items = [];
        }
      }
      if (!Array.isArray(items)) items = [];

      items.forEach((item) => {
        const cant = Number(item.cantidad) || 0;
        const precio = Number(item.precioUnitario) || Number(item.pVenta) || 0;
        const subtotal = cant * precio;

        // Buscar producto asociado
        const prodMatch = (productos || []).find((p) => {
          if (item.productoId && Number(p.id) === Number(item.productoId)) return true;
          if (
            item.codigo &&
            p.codigo &&
            String(p.codigo).trim().toLowerCase() === String(item.codigo).trim().toLowerCase()
          ) {
            return true;
          }
          return false;
        });

        const idKey = prodMatch
          ? `prod-${prodMatch.id}`
          : item.productoId
            ? `prod-${item.productoId}`
            : `sku-${item.codigo || item.descripcion}`;
        const categoria = (prodMatch?.categoria || item.categoria || "Sin categoría").trim();
        const descripcion = prodMatch?.descripcion || item.descripcion || "Repuesto Automotriz";
        const codigo = prodMatch?.codigo || item.codigo || "-";
        const marca = prodMatch?.marca || item.marca || "Niza";
        const stockActual = prodMatch ? Number(prodMatch.stock) : null;
        const imagenUrl = prodMatch?.imagenUrl || "";
        const prodId = prodMatch?.id || item.productoId || null;

        if (!acc[idKey]) {
          acc[idKey] = {
            idKey,
            prodId,
            descripcion,
            codigo,
            categoria,
            marca,
            stockActual,
            imagenUrl,
            cantidadVendida: 0,
            totalDinero: 0,
            vecesVendido: 0,
          };
        }

        acc[idKey].cantidadVendida += cant;
        acc[idKey].totalDinero += subtotal;
        acc[idKey].vecesVendido += 1;
      });
    });

    const lista = Object.values(acc);

    // Ordenar por el criterio seleccionado (mayor a menor)
    lista.sort((a, b) => {
      if (criterioOrden === "dinero") {
        return b.totalDinero - a.totalDinero || b.cantidadVendida - a.cantidadVendida;
      }
      return b.cantidadVendida - a.cantidadVendida || b.totalDinero - a.totalDinero;
    });

    return lista;
  }, [ventas, productos, criterioOrden]);

  // Filtrado por categoría y búsqueda
  const productosFiltrados = useMemo(() => {
    return rankingProductos.filter((item) => {
      // Filtro de categoría
      if (categoriaSeleccionada !== "todas") {
        if (item.categoria.toLowerCase() !== categoriaSeleccionada.toLowerCase()) {
          return false;
        }
      }
      // Filtro de búsqueda
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const matchDesc = item.descripcion.toLowerCase().includes(query);
        const matchCod = item.codigo.toLowerCase().includes(query);
        const matchMarca = item.marca.toLowerCase().includes(query);
        if (!matchDesc && !matchCod && !matchMarca) return false;
      }
      return true;
    });
  }, [rankingProductos, categoriaSeleccionada, busqueda]);

  // Limitar cantidad mostrada
  const itemsVisibles = useMemo(() => {
    if (limite === "todos") return productosFiltrados;
    return productosFiltrados.slice(0, Number(limite));
  }, [productosFiltrados, limite]);

  // Totales para cálculo de porcentajes del gráfico de torta
  const totalValor = useMemo(() => {
    return itemsVisibles.reduce(
      (sum, p) => sum + (criterioOrden === "dinero" ? p.totalDinero : p.cantidadVendida),
      0
    );
  }, [itemsVisibles, criterioOrden]);

  // Cálculo de sectores para el gráfico de torta (Donut SVG)
  const pieSlices = useMemo(() => {
    if (totalValor <= 0 || itemsVisibles.length === 0) return [];

    let currentAngle = -Math.PI / 2; // Empezar en las 12 en punto
    return itemsVisibles.map((prod, index) => {
      const val = criterioOrden === "dinero" ? prod.totalDinero : prod.cantidadVendida;
      const pct = (val / totalValor) * 100;
      const angle = (val / totalValor) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const color = SLICE_COLORS[index % SLICE_COLORS.length];
      const isHovered = hoveredIndex === index;
      const rOuter = isHovered ? 106 : 100;
      const rInner = isHovered ? 56 : 58;

      const pathData = getDonutArcPath(120, 120, rOuter, rInner, startAngle, endAngle);

      return {
        ...prod,
        index,
        color,
        val,
        pct,
        startAngle,
        endAngle,
        pathData,
        isHovered,
      };
    });
  }, [itemsVisibles, totalValor, criterioOrden, hoveredIndex]);

  // Contar cuántos productos vendidos hay por categoría para los chips
  const totalPorCategoria = useMemo(() => {
    const counts = {};
    rankingProductos.forEach((p) => {
      const cat = p.categoria.toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [rankingProductos]);

  const activeHoverItem = hoveredIndex !== null ? pieSlices[hoveredIndex] : null;

  return (
    <div className="bento-card p-6 flex flex-col justify-between border-t-4 border-t-amber-500 shadow-xl transition-all bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-2xl">pie_chart</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Productos Más Vendidos
            </h3>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Gráfico de Torta
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Proporción y volumen comercial de repuestos con mayor rotación por categoría.
          </p>
        </div>

        {/* Selector de Filtro de Categoría y Criterio */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown de Categoría */}
          <div className="relative min-w-[200px]">
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 appearance-none cursor-pointer shadow-xs transition-all"
            >
              <option value="todas">Todas las Categorías ({rankingProductos.length})</option>
              {listaCategorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({totalPorCategoria[cat.toLowerCase()] || 0})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-base pointer-events-none">
              category
            </span>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-base pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Toggle Criterio: Cantidad vs Dinero */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setCriterioOrden("cantidad")}
              title="Distribución por unidades vendidas"
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                criterioOrden === "cantidad"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Unidades
            </button>
            <button
              type="button"
              onClick={() => setCriterioOrden("dinero")}
              title="Distribución por ingresos generados en S/."
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                criterioOrden === "dinero"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Ingresos (S/.)
            </button>
          </div>

          {/* Botón de Impresión PDF de Productos Top */}
          <button
            type="button"
            onClick={async () => {
              setExportandoPdf(true);
              try {
                await generateDashboardPdf({
                  usuario: "Sistema Niza Motors",
                  categoriaFiltro: categoriaSeleccionada === "todas" ? "Todas las Categorías" : categoriaSeleccionada,
                  topProductos: itemsVisibles,
                });
              } catch (err) {
                console.error("Error al exportar PDF de productos:", err);
              } finally {
                setExportandoPdf(false);
              }
            }}
            disabled={exportandoPdf}
            title="Descargar ranking de productos en PDF"
            className="p-1.5 sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-500 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <span className="material-symbols-outlined text-base text-amber-500 leading-none">picture_as_pdf</span>
            <span className="hidden sm:inline">{exportandoPdf ? "Generando..." : "PDF Ranking"}</span>
          </button>
        </div>
      </div>

      {/* Chips Rápidos de Categorías */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar border-b border-slate-200 dark:border-slate-800/80">
        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
          Filtro rápido:
        </span>
        <button
          type="button"
          onClick={() => setCategoriaSeleccionada("todas")}
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
            categoriaSeleccionada === "todas"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Todas ({rankingProductos.length})
        </button>
        {listaCategorias.slice(0, 8).map((cat) => {
          const count = totalPorCategoria[cat.toLowerCase()] || 0;
          const isSelected = categoriaSeleccionada.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaSeleccionada(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span>{cat}</span>
              {count > 0 && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected
                      ? "bg-slate-950/20 text-slate-950"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-barra con búsqueda y selector de cantidad */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 my-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Buscar por código, repuesto o marca..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 focus:border-amber-500 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">
            search
          </span>
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-600 dark:text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mostrar:</span>
          {[5, 8, 10, "todos"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setLimite(opt)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                limite === opt
                  ? "bg-amber-500/15 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {opt === "todos" ? "Todos" : `Top ${opt}`}
            </button>
          ))}
        </div>
      </div>

      {/* Contenedor Principal: Gráfico de Torta + Desglose de Productos */}
      {itemsVisibles.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-3 bg-slate-50/70 dark:bg-slate-950/30 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          {/* Gráfico de Torta (Donut Chart SVG) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-2">
            <div className="relative w-[240px] h-[240px] flex items-center justify-center">
              <svg
                viewBox="0 0 240 240"
                className="w-full h-full transform transition-transform filter drop-shadow-md"
              >
                {/* Sombra de fondo si no hay datos */}
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
                    key={slice.idKey}
                    d={slice.pathData}
                    fill={slice.color}
                    className="cursor-pointer transition-all duration-300 hover:opacity-90 stroke-white dark:stroke-slate-900"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredIndex(slice.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </svg>

              {/* Centro de la Torta / Donut Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
                {activeHoverItem ? (
                  <div className="animate-fade-in max-w-[130px]">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mb-0.5"
                      style={{ backgroundColor: activeHoverItem.color }}
                    />
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase truncate">
                      {activeHoverItem.descripcion}
                    </p>
                    <p className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                      {criterioOrden === "dinero"
                        ? `S/. ${activeHoverItem.totalDinero.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
                        : `${activeHoverItem.cantidadVendida} unids`}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                      {activeHoverItem.pct.toFixed(1)}% del total
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {criterioOrden === "dinero" ? "Total Facturado" : "Total Vendido"}
                    </span>
                    <p className="text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {criterioOrden === "dinero"
                        ? `S/. ${totalValor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `${totalValor} unids`}
                    </p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                      {itemsVisibles.length} productos top
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
              Pasa el cursor sobre un sector para ver su proporción exacta.
            </p>
          </div>

          {/* Leyenda y Listado de Productos del Top */}
          <div className="lg:col-span-7 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {itemsVisibles.map((prod, index) => {
              const slice = pieSlices.find((s) => s.idKey === prod.idKey);
              const color = slice?.color || SLICE_COLORS[index % SLICE_COLORS.length];
              const pct = slice?.pct || 0;
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={prod.idKey}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`group relative rounded-xl p-3 transition-all border cursor-pointer ${
                    isHovered
                      ? "bg-amber-50/80 dark:bg-slate-900 border-amber-500/80 shadow-md ring-1 ring-amber-500/30"
                      : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Indicador de Color de la Torta + Posición */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: color }}
                    >
                      #{index + 1}
                    </div>

                    {/* Descripción y Detalles */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {prod.descripcion}
                        </p>
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-slate-100 shrink-0">
                          {pct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="bg-slate-100 dark:bg-slate-950 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                          SKU-{prod.codigo}
                        </span>
                        <span>•</span>
                        <span>{prod.categoria}</span>
                        <span>•</span>
                        <span>{prod.marca}</span>

                        {prod.stockActual !== null && (
                          <>
                            <span>•</span>
                            <span
                              className={`font-bold ${
                                prod.stockActual === 0
                                  ? "text-red-500 dark:text-red-400"
                                  : prod.stockActual <= 5
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              Stock: {prod.stockActual}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Mini barra de porcentaje */}
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(pct, 3)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Métricas de venta */}
                    <div className="text-right shrink-0 pl-1">
                      <p className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">
                        {prod.cantidadVendida} <span className="text-[10px] font-normal text-slate-500">unids</span>
                      </p>
                      <p className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        S/. {prod.totalDinero.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center my-3">
          <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-600 mb-2">
            search_off
          </span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No se encontraron productos vendidos
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            {categoriaSeleccionada !== "todas"
              ? `No hay registros de ventas para la categoría "${categoriaSeleccionada}".`
              : "Aún no se han registrado transacciones comerciales en el sistema."}
          </p>
          {categoriaSeleccionada !== "todas" && (
            <button
              type="button"
              onClick={() => setCategoriaSeleccionada("todas")}
              className="mt-3 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-500 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              Ver todas las categorías
            </button>
          )}
        </div>
      )}

      {/* Pie con Estadísticas y Enlace */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
        <p>
          Visualizando en torta los <strong className="text-slate-900 dark:text-slate-200">{itemsVisibles.length}</strong> productos principales de{" "}
          <strong className="text-slate-900 dark:text-slate-200">{productosFiltrados.length}</strong> encontrados.
        </p>

        {onNavigateProductos && (
          <button
            type="button"
            onClick={onNavigateProductos}
            className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-500 hover:text-amber-500 font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Gestionar catálogo y reabastecimiento</span>
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
}
