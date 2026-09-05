// ─────────────────────────────────────────────────────────────
// boletaPdf.js — Generación del comprobante en PDF (ticket 80mm)
// Reproduce el mismo ticket que se imprime por window.print() en
// VentaDetalleModal, pero en formato PDF para enviar por WhatsApp.
// Papel de 80mm (estándar de máquina registradora) con alto automático
// que se ajusta exactamente al contenido, sin papel sobrante.
// La librería jsPDF se importa dinámicamente solo cuando se necesita.
// ─────────────────────────────────────────────────────────────
import { LOGO_LIGHT_DATA } from "./logoData";
import { numeroALetras, parseClienteInfo } from "./comprobante";

async function loadPdfLibrary() {
  const { default: jsPDF } = await import("jspdf");
  return jsPDF;
}

const W = 80;   // ancho del ticket (mm) — estándar de papel térmico 80mm
const M = 5;    // margen izquierdo
const R = W - 4; // margen derecho (4mm)

/**
 * Dibuja el comprobante sobre un documento jsPDF y devuelve la posición Y final.
 * Se usa en dos pasadas: una para medir el alto exacto y otra para el PDF final.
 */
function buildTicket(doc, venta, { qrUrl, formatFecha, vendedorNombre }) {
  const clientInfo = parseClienteInfo(venta.cliente);
  const total = Number(venta.totalVenta) || 0;
  const items = Array.isArray(venta.items) ? venta.items : [];
  const esBoleta = !!venta.boleta;
  const boletaCodigo = esBoleta
    ? venta.boleta.replace("BOLETA ", "")
    : `B001-${String(venta.id).padStart(6, "0")}`;
  const fecha = formatFecha ? formatFecha(venta.fecha) : (venta.fecha || "");
  const metodoPago = (venta.metodoPago || "").toUpperCase();

  let y = 3;

  const centered = (text, opts = {}) => {
    doc.setFontSize(opts.size || 8);
    doc.setFont(opts.font || "courier", opts.style || "normal");
    doc.setTextColor(opts.r ?? 0, opts.g ?? 0, opts.b ?? 0);
    doc.text(text, W / 2, y, { align: "center" });
    y += opts.lh || 3;
  };

  const dashed = () => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.setLineDash([1.5, 1.5], 0);
    doc.line(M, y, R, y);
    doc.setLineDash([], 0);
    y += 2.6;
  };

  const pair = (label, value, opts = {}) => {
    doc.setFontSize(opts.size || 7);
    doc.setFont("courier", "normal");
    doc.setTextColor(0);
    doc.text(label, M, y);
    doc.setFont("courier", "bold");
    doc.text(String(value), R, y, { align: "right" });
    y += opts.lh || 2.8;
  };

  // ── Logo ──
  try {
    doc.addImage(LOGO_LIGHT_DATA, "JPEG", W / 2 - 17, y, 34, 12);
  } catch (err) {
    console.warn("No se pudo insertar el logo en el PDF:", err);
  }
  y += 13.5;

  // ── Cabecera ──
  centered("NIZA MOTORS PERU S.A.C.", { size: 9, style: "bold", lh: 3.2 });
  doc.setTextColor(51, 51, 51);
  centered("Repuestos y Accesorios de Autos", { size: 6.5, lh: 3.6 });
  doc.setTextColor(0);
  centered(esBoleta ? "BOLETA DE VENTA ELECTRONICA" : "TICKET DE VENTA", { size: 7.5, style: "bold", lh: 3.2 });
  centered(boletaCodigo, { size: 8, style: "bold", lh: 3.2 });
  dashed();

  // ── Datos fiscales ──
  doc.setFontSize(7);
  doc.setFont("courier", "bold");
  doc.setTextColor(0);
  doc.text("DOMICILIO FISCAL:", M, y);
  y += 2.6;
  doc.setFont("courier", "normal");
  doc.setTextColor(51, 51, 51);
  const domicilio = "CAL.LOS TALADROS NRO. 257 URB. NARANJAL INDUSTRIAL LIMA - LIMA - INDEPENDENCIA";
  doc.setFontSize(6.5);
  doc.text(doc.splitTextToSize(domicilio, W - M - 4), M, y);
  y += 5;
  doc.setTextColor(0);
  pair("RUC:", "20603671717");
  pair("FECHA EMISION:", fecha);
  pair("METODO PAGO:", metodoPago);
  dashed();

  // ── Cliente ──
  doc.setFontSize(7);
  doc.setFont("courier", "bold");
  doc.text("SEÑORES:", M, y);
  doc.setFont("courier", "normal");
  doc.text(clientInfo.nombre.toUpperCase(), R, y, { align: "right", maxWidth: 40 });
  y += 2.8;
  doc.setFont("courier", "bold");
  doc.text("DIRECCIÓN:", M, y);
  doc.setFont("courier", "normal");
  doc.text((venta.direccion || "-").toUpperCase(), R, y, { align: "right", maxWidth: 40 });
  y += 2.8;
  dashed();

  // ── Tabla de productos ──
  doc.setFontSize(7);
  doc.setFont("courier", "bold");
  doc.text("PRODUCTO", M, y);
  doc.text("CANT", 50, y, { align: "right" });
  doc.text("P.UNIT", 62, y, { align: "right" });
  doc.text("IMPORTE", R, y, { align: "right" });
  y += 3;
  dashed();

  doc.setFont("courier", "normal");
  doc.setTextColor(0);
  doc.setFontSize(7);
  items.forEach((item) => {
    const desc = (item.producto?.descripcion || "PRODUCTO ELIMINADO").toUpperCase();
    const cant = Number(item.cantidad).toFixed(1);
    const punit = Number(item.precioUnitario).toFixed(2);
    const importe = Number(item.totalVenta).toFixed(2);

    const lines = doc.splitTextToSize(desc, 38);
    doc.text(lines, M, y);
    doc.text(cant, 50, y, { align: "right" });
    doc.text(punit, 62, y, { align: "right" });
    doc.text(importe, R, y, { align: "right" });
    y += 2.6 * lines.length + 0.4;
  });

  dashed();

  // ── Total y monto en letras ──
  doc.setFontSize(8.5);
  doc.setFont("courier", "bold");
  doc.text("TOTAL VENTA", M, y);
  doc.text(`S/.${total.toFixed(2)}`, R, y, { align: "right" });
  y += 3.2;
  doc.setFontSize(6.5);
  doc.setFont("courier", "normal");
  doc.setTextColor(51, 51, 51);
  const enLetras = doc.splitTextToSize(numeroALetras(total), W - M - 4);
  doc.text(enLetras, W / 2, y, { align: "center" });
  y += 2.6 * enLetras.length + 1;
  doc.setTextColor(0);
  dashed();

  // ── Vendedor ──
  doc.setFontSize(7);
  doc.setFont("courier", "bold");
  doc.text(`VENDEDOR(A) : ${(vendedorNombre || "ADMIN SGI").toUpperCase()}`, M, y);
  y += 3;
  dashed();

  // ── Pie ──
  doc.setFontSize(6);
  doc.setFont("courier", "normal");
  doc.setTextColor(0);
  doc.text("Representación impresa de la Boleta de Venta Electrónica.", W / 2, y, { align: "center" });
  y += 2.6;
  doc.text("Gracias por su preferencia", W / 2, y, { align: "center" });
  y += 3;

  // ── QR ──
  if (qrUrl) {
    try {
      doc.addImage(qrUrl, "PNG", W / 2 - 12, y, 24, 24);
    } catch (err) {
      console.warn("No se pudo insertar el QR en el PDF:", err);
    }
    y += 24;
  }

  return y;
}

/**
 * Genera un PDF (Blob) con el comprobante de venta en formato ticket térmico de 80mm.
 * El alto del papel se ajusta automáticamente al contenido (sin espacio sobrante).
 *
 * @param {Object} venta - venta enriquecida (con items que incluyen `producto`, `precioUnitario`, `totalVenta`)
 * @param {Object} [opts]
 * @param {string} [opts.qrUrl]        - Data URL del código QR
 * @param {Function} [opts.formatFecha] - Formateador de fecha
 * @param {string} [opts.vendedorNombre]
 * @returns {Promise<Blob>} PDF listo para descargar
 */
export async function generateBoletaPdf(venta, opts = {}) {
  const jsPDF = await loadPdfLibrary();

  // Pasada 1: medir el alto exacto del contenido
  const measureDoc = new jsPDF({ unit: "mm", format: [W, 500] });
  const contentHeight = buildTicket(measureDoc, venta, opts);

  // Pasada 2: generar el PDF final con el alto justo + pequeño margen inferior
  const pageHeight = Math.max(contentHeight + 4, 60);
  const doc = new jsPDF({ unit: "mm", format: [W, pageHeight] });
  buildTicket(doc, venta, opts);

  return doc.output("blob");
}
