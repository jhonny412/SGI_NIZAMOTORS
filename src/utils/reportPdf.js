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
  return `S/. ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addReportHeadersAndFooter(doc, title, fechaDesde, fechaHasta, usuario) {
  const totalPages = doc.internal.getNumberOfPages();
  const fechaGeneracion = new Date().toLocaleString();

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
