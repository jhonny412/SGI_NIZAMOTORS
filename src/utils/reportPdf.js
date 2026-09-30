// ──────────────────────────────────────────────────────────────────────────────
// reportPdf.js — Generación de PDFs con carga dinámica de jsPDF + jspdf-autotable
// Las librerías se importan solo cuando el usuario solicita un PDF (dynamic import),
// reduciendo el bundle inicial de la aplicación en ~300 KB.
// ──────────────────────────────────────────────────────────────────────────────
import { LOGO_LIGHT_DATA } from "./logoData";

/**
 * Carga jsPDF y jspdf-autotable dinámicamente la primera vez que se necesiten.
 * Las importaciones se almacenan en caché gracias al módulo ES (singleton).
 */
async function loadPdfLibraries() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
}

function formatMoney(value) {
  return `S/. ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addReportHeadersAndFooter(doc, title, fechaDesde, fechaHasta, usuario) {
  const totalPages = doc.internal.getNumberOfPages();
  const fechaGeneracion = new Date().toLocaleString("es-PE", { hour12: false });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Header Logo
    try {
      doc.addImage(LOGO_LIGHT_DATA, "JPEG", 14, 8, 26, 26);
    } catch (err) {
      console.warn("No se pudo cargar el logo en el PDF:", err);
    }

    // Company & Report Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text("NIZA MOTORS", 44, 16);

    doc.setFontSize(11);
    doc.setTextColor(217, 119, 6);
    doc.text(title.toUpperCase(), 44, 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periodo: ${fechaDesde || "\u2014"} al ${fechaHasta || "\u2014"}`, 44, 30);
    doc.text(`Generado por: ${usuario || "Sistema"}  |  Fecha: ${fechaGeneracion}`, 44, 35);

    // Divider Line
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.8);
    doc.line(14, 39, 283, 39);

    // Page Number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`P\u00e1gina ${i} de ${totalPages}`, 283, 16, { align: "right" });
  }
}

function saveOrPreview(doc, title, prefix, fechaDesde, fechaHasta, usuario, preview) {
  addReportHeadersAndFooter(doc, title, fechaDesde, fechaHasta, usuario);
  if (preview) {
    return doc.output("datauristring");
  }
  doc.save(`${prefix}_${fechaDesde}_${fechaHasta}.pdf`);
  return null;
}

export async function generateVentasPdf({ ventas, fechaDesde, fechaHasta, formatFecha, usuario, preview = false }) {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF({ orientation: "landscape" });
  const title = "Reporte de Ventas";

  const totalVentas = ventas.reduce((sum, v) => sum + (Number(v.totalVenta) || 0), 0);
  const totalUtilidad = ventas.reduce((sum, v) => sum + (Number(v.utilidad) || 0), 0);
  const totalItems = ventas.reduce((sum, v) => sum + (Number(v.cantidadTotal) || 0), 0);

  autoTable(doc, {
    startY: 44,
    margin: { top: 44, left: 14, right: 14, bottom: 14 },
    head: [["Fecha", "Boleta", "Cliente", "M\u00e9todo pago", "Items", "Total (S/.)", "Utilidad (S/.)"]],
    body: ventas.map((v) => [
      formatFecha(v.fecha),
      v.boleta || `LEGACY-${v.id}`,
      v.cliente || "\u2014",
      v.metodoPago || "\u2014",
      String(v.cantidadTotal || 0),
      formatMoney(v.totalVenta),
      formatMoney(v.utilidad),
    ]),
    foot: [[
      { content: "TOTALES", colSpan: 4, styles: { fontStyle: "bold" } },
      { content: String(totalItems), styles: { fontStyle: "bold" } },
      { content: formatMoney(totalVentas), styles: { fontStyle: "bold" } },
      { content: formatMoney(totalUtilidad), styles: { fontStyle: "bold" } },
    ]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
  });

  return saveOrPreview(doc, title, "reporte-ventas", fechaDesde, fechaHasta, usuario, preview);
}

export async function generateMovimientosPdf({
  movimientos,
  productos,
  fechaDesde,
  fechaHasta,
  formatFecha,
  tipo,
  title,
  usuario,
  preview = false,
}) {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF({ orientation: "landscape" });

  const getProducto = (id) => productos.find((p) => p.id === id);
  const totalCantidad = movimientos.reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0);

  autoTable(doc, {
    startY: 44,
    margin: { top: 44, left: 14, right: 14, bottom: 14 },
    head: [["Fecha", "Producto", "C\u00f3digo", "Cantidad", "Motivo", "Stock ant.", "Stock nuevo"]],
    body: movimientos.map((m) => {
      const prod = getProducto(m.productoId);
      return [
        formatFecha(m.fecha),
        prod?.descripcion || "Producto eliminado",
        prod?.codigo || "\u2014",
        String(m.cantidad),
        m.motivo || "\u2014",
        String(m.stockAnterior ?? "\u2014"),
        String(m.stockNuevo ?? "\u2014"),
      ];
    }),
    foot: [[
      { content: "TOTAL", colSpan: 3, styles: { fontStyle: "bold" } },
      { content: String(totalCantidad), styles: { fontStyle: "bold" } },
      { content: `${movimientos.length} movimiento(s)`, colSpan: 3, styles: { fontStyle: "bold" } },
    ]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
  });

  const prefix = tipo === "entrada" ? "reporte-ingresos" : "reporte-salidas";
  return saveOrPreview(doc, title, prefix, fechaDesde, fechaHasta, usuario, preview);
}

export async function generateKardexPdf({
  movimientos,
  productos,
  fechaDesde,
  fechaHasta,
  formatFecha,
  usuario,
  preview = false,
}) {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF({ orientation: "landscape" });
  const title = "Reporte de Kardex de Inventario";

  const getProducto = (id) => productos.find((p) => p.id === id);
  const totalEntradas = movimientos
    .filter((m) => m.tipo === "entrada")
    .reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0);
  const totalSalidas = movimientos
    .filter((m) => m.tipo === "salida")
    .reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0);

  autoTable(doc, {
    startY: 44,
    margin: { top: 44, left: 14, right: 14, bottom: 14 },
    head: [["Fecha", "Producto", "Código", "Tipo", "Cantidad", "Stock ant.", "Stock nuevo", "Motivo"]],
    body: movimientos.map((m) => {
      const prod = getProducto(m.productoId);
      const isEntrada = m.tipo === "entrada";
      return [
        formatFecha(m.fecha),
        prod?.descripcion || "Producto eliminado",
        prod?.codigo || "\u2014",
        isEntrada ? "ENTRADA" : "SALIDA",
        `${isEntrada ? "+" : "-"}${m.cantidad}`,
        String(m.stockAnterior ?? "\u2014"),
        String(m.stockNuevo ?? "\u2014"),
        m.motivo || "\u2014",
      ];
    }),
    foot: [[
      { content: "RESUMEN", colSpan: 3, styles: { fontStyle: "bold" } },
      { content: `Entradas: ${totalEntradas}  |  Salidas: ${totalSalidas}`, colSpan: 2, styles: { fontStyle: "bold" } },
      { content: `${movimientos.length} movimiento(s)`, colSpan: 3, styles: { fontStyle: "bold" } },
    ]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
  });

  return saveOrPreview(doc, title, "reporte-kardex", fechaDesde, fechaHasta, usuario, preview);
}

/**
 * Genera una imagen en formato PNG Data URL de un gráfico estadístico (torta / donut o barras)
 * renderizado en un canvas de alta resolución.
 */
export function generateChartDataUrl({
  title = "",
  tipo = "torta", // "torta" | "barras"
  data = [],
  centerLabel = "",
  centerSub = "",
  width = 800,
  height = 220,
}) {
  if (typeof document === "undefined") return null;
  let canvas;
  try {
    canvas = document.createElement("canvas");
  } catch {
    return null;
  }
  if (!canvas || typeof canvas.getContext !== "function") return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Fondo blanco con borde y acento ámbar corporativo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  ctx.fillStyle = "#f59e0b"; // Ámbar Niza Motors
  ctx.fillRect(0, 0, 5, height);

  // Título de la tarjeta gráfica
  if (title) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(title.toUpperCase(), 18, 18);

    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, 30);
    ctx.lineTo(width - 18, 30);
    ctx.stroke();
  }

  const validData = (data || []).filter((d) => (Number(d.value) || 0) > 0);
  const total = validData.reduce((s, d) => s + (Number(d.value) || 0), 0);

  if (validData.length === 0 || total === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos registrados para graficar en este período", width / 2, height / 2 + 10);
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  const PALETTE = [
    "#f59e0b", // Ámbar
    "#0ea5e9", // Cielo
    "#10b981", // Esmeralda
    "#8b5cf6", // Púrpura
    "#f43f5e", // Rosa
    "#06b6d4", // Cian
    "#f97316", // Naranja
    "#14b8a6", // Verde azulado
    "#6366f1", // Índigo
    "#84cc16", // Lima
  ];

  if (tipo === "barras") {
    // ── Gráfico de Barras Horizontales ──
    const startY = 42;
    const maxBars = Math.min(validData.length, 6);
    const barHeight = 17;
    const gap = 11;
    const maxVal = Math.max(...validData.slice(0, maxBars).map((d) => Number(d.value) || 0));
    const labelWidth = 140;
    const barAreaWidth = width - labelWidth - 140;

    for (let i = 0; i < maxBars; i++) {
      const item = validData[i];
      const val = Number(item.value) || 0;
      const y = startY + i * (barHeight + gap);
      const color = item.color || PALETTE[i % PALETTE.length];
      const barW = maxVal > 0 ? (val / maxVal) * barAreaWidth : 0;

      // Etiqueta
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 10.5px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const lbl = (item.label || "").length > 20 ? item.label.substring(0, 18) + "…" : (item.label || "");
      ctx.fillText(lbl, labelWidth, y + barHeight / 2);

      // Pista de fondo
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(labelWidth + 12, y, barAreaWidth, barHeight);

      // Barra con color
      ctx.fillStyle = color;
      ctx.fillRect(labelWidth + 12, y, Math.max(barW, 3), barHeight);

      // Valor numérico y porcentaje
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const valText = item.valueFormatted || String(val);
      const pctText = `${((val / total) * 100).toFixed(1)}%`;
      ctx.fillText(`${valText} (${pctText})`, labelWidth + 18 + barW, y + barHeight / 2);
    }
  } else {
    // ── Gráfico de Torta / Donut ──
    const cx = 125;
    const cy = 125;
    const rOuter = 76;
    const rInner = 46;

    let currentAngle = -Math.PI / 2;

    validData.forEach((slice, idx) => {
      const val = Number(slice.value) || 0;
      const sliceAngle = (val / total) * (Math.PI * 2);
      const endAngle = currentAngle + sliceAngle;
      const color = slice.color || PALETTE[idx % PALETTE.length];

      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, currentAngle, endAngle);
      ctx.arc(cx, cy, rInner, endAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Línea divisoria blanca entre porciones
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      currentAngle = endAngle;
    });

    // Texto central de la dona
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (centerSub) {
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 8.5px sans-serif";
      ctx.fillText(centerSub.toUpperCase(), cx, cy - 8);
    }
    if (centerLabel) {
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(centerLabel, cx, cy + (centerSub ? 8 : 0));
    }

    // Leyenda estructurada a la derecha (en 2 columnas)
    const legendX = 240;
    const count = validData.length;
    const isTwoCol = count > 5;
    const colWidth = 260;
    const maxItems = Math.min(count, 10);

    for (let i = 0; i < maxItems; i++) {
      const item = validData[i];
      const val = Number(item.value) || 0;
      const color = item.color || PALETTE[i % PALETTE.length];
      const col = isTwoCol && i >= 5 ? 1 : 0;
      const row = isTwoCol && i >= 5 ? i - 5 : i;
      const itemX = legendX + col * colWidth;
      const itemY = 44 + row * 32;

      // Viñeta circular de color
      ctx.beginPath();
      ctx.arc(itemX + 6, itemY + 6, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Nombre del elemento
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 10.5px sans-serif";
      const maxLen = isTwoCol ? 22 : 36;
      const lbl = (item.label || "").length > maxLen ? item.label.substring(0, maxLen - 1) + "…" : (item.label || "");
      ctx.fillText(lbl, itemX + 16, itemY + 5);

      // Valor e indicador porcentual
      const pct = `${((val / total) * 100).toFixed(1)}%`;
      const valText = item.valueFormatted || String(val);
      ctx.fillStyle = "#64748b";
      ctx.font = "9.5px sans-serif";
      ctx.fillText(`${valText}  •  ${pct}`, itemX + 16, itemY + 19);
    }

    if (count > maxItems) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 9px sans-serif";
      ctx.fillText(`+ ${count - maxItems} elementos adicionales`, legendX + 16, 44 + 5 * 32 + 4);
    }
  }

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function generateDashboardPdf({
  usuario,
  totalProductos,
  valorInventario,
  valorVentaInventario,
  periodoVentasLabel,
  tipoGraficoVentas = "torta",
  ventasResumen,
  ventasDesglose = [],
  chartVentasImg: customChartVentasImg,
  categoriaFiltro,
  topProductos = [],
  chartTopProductosImg: customChartTopProductosImg,
  stockCritico = [],
  preview = false,
}) {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF({ orientation: "landscape" });
  const title = "Reporte Ejecutivo de Dashboard";
  const hoy = new Date().toISOString().split("T")[0];

  // 1. Resumen Ejecutivo (KPIs)
  autoTable(doc, {
    startY: 44,
    margin: { top: 44, left: 14, right: 14, bottom: 14 },
    head: [["Productos Catálogo", "Costo Inventario (S/.)", "Valuación Venta (S/.)", "Facturación Período", "Operaciones", "Ticket Promedio", "Unidades Vendidas"]],
    body: [[
      String(totalProductos || 0),
      formatMoney(valorInventario),
      formatMoney(valorVentaInventario),
      formatMoney(ventasResumen?.totalDinero),
      String(ventasResumen?.totalOperaciones || 0),
      formatMoney(ventasResumen?.ticketPromedio),
      String(ventasResumen?.totalUnidades || 0),
    ]],
    styles: { fontSize: 8.5, cellPadding: 3.5, halign: "center" },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
  });

  let currentY = (doc.lastAutoTable?.finalY ?? 50) + 6;

  // 2. Sección Gráfica y Detalle de Ventas Generadas
  if (ventasDesglose.length > 0) {
    // Generar imagen del gráfico de ventas si no se proveyó una pre-renderizada
    let chartVentasImg = customChartVentasImg;
    if (!chartVentasImg) {
      const salesChartData = ventasDesglose.map((v) => ({
        label: v.fullDay || v.fullLabel || v.label,
        value: Number(v.totalDinero) || 0,
        color: v.color,
        valueFormatted: formatMoney(v.totalDinero),
      }));

      chartVentasImg = generateChartDataUrl({
        title: `Gráfico de Ventas Generadas — ${periodoVentasLabel || "Período Seleccionado"}`,
        tipo: tipoGraficoVentas,
        data: salesChartData,
        centerLabel: formatMoney(ventasResumen?.totalDinero),
        centerSub: "Facturado",
      });
    }

    if (chartVentasImg && typeof doc.addImage === "function") {
      try {
        doc.addImage(chartVentasImg, "PNG", 14, currentY, 269, 56);
        currentY += 60;
      } catch (err) {
        console.warn("No se pudo insertar el gráfico de ventas en el PDF:", err);
      }
    }

    autoTable(doc, {
      startY: currentY,
      margin: { top: 44, left: 14, right: 14, bottom: 14 },
      head: [[
        { content: `Ventas Generadas — ${periodoVentasLabel || "Período Seleccionado"}`, colSpan: 6, styles: { fillColor: [245, 158, 11], textColor: [15, 23, 42], fontStyle: "bold" } }
      ], [
        "Período / Día", "Fecha / Rango", "Operaciones", "Repuestos Vendidos", "Total Facturado (S/.)", "% Cuota"
      ]],
      body: ventasDesglose.map((v) => [
        v.fullDay || v.fullLabel || v.label,
        v.dateFormatted || v.rangeLabel || "\u2014",
        String(v.totalOperaciones || 0),
        String(v.totalUnidades || 0),
        formatMoney(v.totalDinero),
        `${(Number(v.pct) || 0).toFixed(1)}%`
      ]),
      foot: [[
        { content: "TOTAL FACTURADO", colSpan: 2, styles: { fontStyle: "bold" } },
        { content: String(ventasResumen?.totalOperaciones || 0), styles: { fontStyle: "bold" } },
        { content: String(ventasResumen?.totalUnidades || 0), styles: { fontStyle: "bold" } },
        { content: formatMoney(ventasResumen?.totalDinero), styles: { fontStyle: "bold" } },
        { content: "100.0%", styles: { fontStyle: "bold" } },
      ]],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    });
    currentY = (doc.lastAutoTable?.finalY ?? (currentY + 40)) + 8;
  }

  // 3. Sección Gráfica y Detalle de Productos Más Vendidos
  if (topProductos.length > 0) {
    if (currentY > 115) {
      if (typeof doc.addPage === "function") doc.addPage();
      currentY = 44;
    }

    // Generar imagen del gráfico de top productos si no se proveyó una pre-renderizada
    let chartTopProductosImg = customChartTopProductosImg;
    if (!chartTopProductosImg) {
      const topChartData = topProductos.slice(0, 10).map((p) => ({
        label: p.descripcion,
        value: Number(p.cantidadVendida) || 0,
        valueFormatted: `${p.cantidadVendida} unids (${formatMoney(p.totalDinero)})`,
      }));

      chartTopProductosImg = generateChartDataUrl({
        title: `Gráfico de Productos Más Vendidos — ${categoriaFiltro || "Todas las Categorías"}`,
        tipo: "torta",
        data: topChartData,
        centerLabel: `${topProductos.reduce((s, p) => s + (Number(p.cantidadVendida) || 0), 0)} unids`,
        centerSub: "Vendidos",
      });
    }

    if (chartTopProductosImg && typeof doc.addImage === "function") {
      try {
        doc.addImage(chartTopProductosImg, "PNG", 14, currentY, 269, 56);
        currentY += 60;
      } catch (err) {
        console.warn("No se pudo insertar el gráfico de top productos en el PDF:", err);
      }
    }

    autoTable(doc, {
      startY: currentY,
      margin: { top: 44, left: 14, right: 14, bottom: 14 },
      head: [[
        { content: `Productos Más Vendidos — Categoría: ${categoriaFiltro || "Todas las categorías"}`, colSpan: 8, styles: { fillColor: [245, 158, 11], textColor: [15, 23, 42], fontStyle: "bold" } }
      ], [
        "#", "SKU / Código", "Descripción del Repuesto", "Categoría", "Marca", "Cant. Vendida", "Total Facturado (S/.)", "Stock Disp."
      ]],
      body: topProductos.map((p, idx) => [
        `#${idx + 1}`,
        p.codigo || "\u2014",
        p.descripcion,
        p.categoria,
        p.marca,
        String(p.cantidadVendida || 0),
        formatMoney(p.totalDinero),
        p.stockActual !== null && p.stockActual !== undefined ? String(p.stockActual) : "\u2014"
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    });
    currentY = (doc.lastAutoTable?.finalY ?? (currentY + 50)) + 8;
  }

  // 4. Stock Crítico (si existen alertas)
  if (stockCritico.length > 0) {
    if (currentY > 125) {
      if (typeof doc.addPage === "function") doc.addPage();
      currentY = 44;
    }

    autoTable(doc, {
      startY: currentY,
      margin: { top: 44, left: 14, right: 14, bottom: 14 },
      head: [[
        { content: "Alertas de Repuestos en Stock Crítico", colSpan: 5, styles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: "bold" } }
      ], [
        "SKU / Código", "Descripción de la Pieza", "Marca", "Stock Actual", "Estado Operativo"
      ]],
      body: stockCritico.map((s) => [
        s.codigo || "\u2014",
        s.descripcion,
        s.marca || "Niza",
        String(s.stock ?? 0),
        s.stock === 0 ? "AGOTADO (0 unidades)" : `STOCK BAJO (${s.stock} unids)`
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    });
  }

  const prefix = "reporte-dashboard";
  return saveOrPreview(doc, title, prefix, hoy, hoy, usuario, preview);
}

