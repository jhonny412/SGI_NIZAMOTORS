import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import Swal from "sweetalert2";

// Etiqueta de 60 × 40 mm a 300 ppp (medidas estándar de sticker)
const ETIQUETA = { anchoMm: 60, altoMm: 40, dpi: 300 };

const mmAPx = (mm) => Math.round((mm / 25.4) * ETIQUETA.dpi);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Nombre de archivo seguro a partir del código del producto. */
const nombreArchivo = (codigo) =>
  String(codigo || "producto")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 60);

/** Ajusta el tamaño de fuente para que el texto entre en el ancho indicado. */
function fuenteQueCabe(ctx, texto, maxWidth, tamInicial, fuente, tamMinimo = 18) {
  let tam = tamInicial;
  while (tam > tamMinimo) {
    ctx.font = fuente(tam);
    if (ctx.measureText(texto).width <= maxWidth) break;
    tam -= 2;
  }
  return tam;
}

/** Divide un texto en líneas que caben en el ancho indicado. */
function envolverTexto(ctx, texto, maxWidth, maxLineas) {
  const palabras = String(texto || "").split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = "";

  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > maxWidth && actual) {
      lineas.push(actual);
      actual = palabra;
      if (lineas.length === maxLineas) return lineas;
    } else {
      actual = prueba;
    }
  }
  if (actual && lineas.length < maxLineas) lineas.push(actual);
  return lineas.slice(0, maxLineas);
}

/** Genera el QR en un canvas (solo cuando se elige ese tipo de código). */
async function generarQr(texto, tamano) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, texto, {
    margin: 1,
    width: tamano,
    errorCorrectionLevel: "M",
  });
  return canvas;
}

/** Genera el código de barras Code 128 en un canvas. */
function generarBarras(texto) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, texto, {
    format: "CODE128",
    width: 3,
    height: 190,
    displayValue: false,
    margin: 0,
    background: "#ffffff",
    lineColor: "#000000",
  });
  return canvas.width > 0 ? canvas : null;
}

/**
 * Dibuja el bloque de datos del producto (código, descripción y marca),
 * centrado verticalmente dentro del área disponible.
 */
function dibujarDatos(ctx, { codigo, descripcion, marca }, x, yTop, ancho, altoArea) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0f172a";

  const fuenteCodigo = (s) => `bold ${s}px "Courier New", Courier, monospace`;
  const tamCodigo = fuenteQueCabe(ctx, codigo, ancho, 42, fuenteCodigo, 20);
  ctx.font = fuenteCodigo(tamCodigo);

  ctx.font = `400 22px Arial, Helvetica, sans-serif`;
  const lineas = envolverTexto(ctx, descripcion, ancho, 3);

  const alturaBloque =
    tamCodigo + 34 + Math.max(0, lineas.length - 1) * 27 + (marca ? 32 : 0);
  const yBase = yTop + Math.max(0, (altoArea - alturaBloque) / 2);

  ctx.fillStyle = "#0f172a";
  ctx.font = fuenteCodigo(tamCodigo);
  ctx.fillText(codigo, x, yBase + tamCodigo);

  ctx.font = `400 22px Arial, Helvetica, sans-serif`;
  lineas.forEach((linea, i) => {
    ctx.fillText(linea, x, yBase + tamCodigo + 34 + i * 27);
  });

  if (marca) {
    ctx.fillStyle = "#475569";
    ctx.font = `bold 18px Arial, Helvetica, sans-serif`;
    const yMarca = yBase + tamCodigo + 34 + Math.max(0, lineas.length - 1) * 27 + 32;
    ctx.fillText(String(marca).toUpperCase(), x, yMarca);
  }
}

/**
 * Compone la etiqueta en un canvas de 60 × 40 mm a 300 ppp.
 * El tipo elegido define si lleva QR **o** código de barras (nunca ambos).
 *
 * @param {"qr"|"barcode"} tipo
 * @returns {Promise<{png: string, jpg: string, codigo: string, tipo: string}>}
 */
async function componerEtiqueta({ tipo, codigo, descripcion, marca }) {
  const texto = String(codigo || "").trim();
  const W = mmAPx(ETIQUETA.anchoMm);
  const H = mmAPx(ETIQUETA.altoMm);
  const margen = mmAPx(2);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  if (tipo === "qr") {
    // Etiqueta con QR grande a la izquierda y datos a la derecha
    const qrTam = mmAPx(30);
    const qrCanvas = await generarQr(texto, qrTam);
    ctx.drawImage(qrCanvas, margen, Math.round((H - qrTam) / 2), qrTam, qrTam);
    dibujarDatos(
      ctx,
      { codigo: texto, descripcion, marca },
      margen + qrTam + mmAPx(3),
      margen,
      W - (margen + qrTam + mmAPx(3)) - margen,
      H - margen * 2
    );
  } else {
    // Etiqueta con código de barras ancho al pie y datos arriba
    const bcCanvas = generarBarras(texto);
    if (!bcCanvas) throw new Error("El código no es válido para Code 128");

    const maxAncho = W - margen * 2;
    const escala = Math.min(1, maxAncho / bcCanvas.width);
    const altoBc = Math.min(mmAPx(16), bcCanvas.height * escala);
    const anchoBc = bcCanvas.width * escala;
    const yBc = H - margen - altoBc;

    dibujarDatos(
      ctx,
      { codigo: texto, descripcion, marca },
      margen,
      margen,
      W - margen * 2,
      yBc - margen - mmAPx(2)
    );

    ctx.drawImage(bcCanvas, (W - anchoBc) / 2, yBc, anchoBc, altoBc);
  }

  return {
    png: canvas.toDataURL("image/png"),
    jpg: canvas.toDataURL("image/jpeg", 0.95),
    codigo: texto,
    tipo,
  };
}

/** Descarga un data URL como archivo. */
function descargarArchivo(dataUrl, nombre) {
  const enlace = document.createElement("a");
  enlace.href = dataUrl;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

/**
 * Modal de etiqueta del producto.
 * Primero pregunta si la etiqueta debe llevar **QR o código de barras**
 * (nunca ambos) y después muestra la vista previa para imprimir o guardar
 * en PDF / JPG.
 */
export default function ProductQrModal({ producto, onCerrar }) {
  const { t } = useTranslation();
  const [tipo, setTipo] = useState(null); // null | "qr" | "barcode"
  const [etiqueta, setEtiqueta] = useState(null);
  const [error, setError] = useState("");
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const codigo = producto?.codigo || "";
  const descripcion = producto?.descripcion || "";
  const marca = producto?.marca || "";

  useEffect(() => {
    if (!producto || !tipo) {
      setEtiqueta(null);
      return;
    }
    let activo = true;
    setEtiqueta(null);
    setError("");

    componerEtiqueta({ tipo, codigo, descripcion, marca })
      .then((datos) => {
        if (activo) setEtiqueta(datos);
      })
      .catch((err) => {
        console.error("[Etiqueta] No se pudo generar:", err);
        if (activo) setError(t("pages.productos.qr.error"));
      });

    return () => {
      activo = false;
    };
  }, [producto, tipo, codigo, descripcion, marca, t]);

  const sufijoTipo = tipo === "barcode" ? "BARRAS" : "QR";
  const nombreBase = () => `Etiqueta-${sufijoTipo}-${nombreArchivo(codigo)}`;

  const imprimirEtiqueta = useCallback(() => {
    if (!etiqueta) return;
    const ventana = window.open("", "_blank", "width=460,height=560");
    if (!ventana) {
      Swal.fire({
        icon: "warning",
        title: t("pages.productos.qr.popup_blocked_title"),
        text: t("pages.productos.qr.popup_blocked_text"),
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    ventana.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(etiqueta.codigo)}</title>
  <style>
    @page { size: ${ETIQUETA.anchoMm}mm ${ETIQUETA.altoMm}mm; margin: 0; }
    html, body { margin: 0; padding: 0; }
    img { width: ${ETIQUETA.anchoMm}mm; height: ${ETIQUETA.altoMm}mm; display: block; }
  </style>
</head>
<body><img src="${etiqueta.png}" alt="${escapeHtml(etiqueta.codigo)}" /></body>
</html>`);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
      try {
        ventana.print();
      } catch {
        // El navegador puede bloquear print() en ventanas emergentes
      }
    }, 350);
  }, [etiqueta, t]);

  const guardarJpg = () => {
    if (!etiqueta) return;
    descargarArchivo(etiqueta.jpg, `${nombreBase()}.jpg`);
  };

  const guardarPdf = async () => {
    if (!etiqueta || generandoPdf) return;
    setGenerandoPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [ETIQUETA.anchoMm, ETIQUETA.altoMm],
      });
      doc.addImage(etiqueta.jpg, "JPEG", 0, 0, ETIQUETA.anchoMm, ETIQUETA.altoMm);
      doc.save(`${nombreBase()}.pdf`);
    } catch (err) {
      console.error("[Etiqueta] Error al generar PDF:", err);
      Swal.fire({
        icon: "error",
        title: t("pages.productos.qr.save_error_title"),
        text: t("pages.productos.qr.save_error_text"),
        confirmButtonColor: "#f59e0b",
      });
    } finally {
      setGenerandoPdf(false);
    }
  };

  if (!producto) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div className="modal-content max-w-lg w-full mx-4 sm:mx-auto animate-slide-up border-[#334155]">
        <div className="flex items-start justify-between border-b border-[#334155]/70 bg-slate-950 px-5 py-4 rounded-t-2xl">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">qr_code_2</span>
              {t("pages.productos.qr.title")}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {tipo ? t("pages.productos.qr.subtitle") : t("pages.productos.qr.choose_subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onCerrar?.()}
            aria-label={t("scan.close")}
            className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Paso 1: elegir el tipo de código */}
        {!tipo ? (
          <div className="space-y-4 p-5">
            <div>
              <p className="text-sm font-bold text-slate-200">{t("pages.productos.qr.choose_title")}</p>
              <p className="mt-1 text-xs text-slate-400">{producto.descripcion}</p>
              <p className="mt-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{codigo}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTipo("qr")}
                className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-4 text-left transition-all hover:border-amber-500 hover:bg-amber-50 dark:border-[#334155] dark:bg-slate-900/50 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-500">qr_code_2</span>
                <span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{t("pages.productos.qr.option_qr")}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t("pages.productos.qr.option_qr_hint")}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTipo("barcode")}
                className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-4 text-left transition-all hover:border-amber-500 hover:bg-amber-50 dark:border-[#334155] dark:bg-slate-900/50 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-500">barcode</span>
                <span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{t("pages.productos.qr.option_barcode")}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t("pages.productos.qr.option_barcode_hint")}</span>
                </span>
              </button>
            </div>

            <div className="flex justify-end border-t border-[#334155]/60 pt-4">
              <button type="button" onClick={() => onCerrar?.()} className="btn-secondary px-4 py-2 text-sm">
                {t("scan.close")}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Vista previa: solo el código elegido */}
            <div className="rounded-xl border border-[#334155]/60 bg-white p-3">
              {etiqueta ? (
                <img
                  src={etiqueta.png}
                  alt={`${t("pages.productos.qr.title")} ${sufijoTipo} ${codigo}`}
                  className="w-full rounded-md"
                />
              ) : (
                <div className="flex aspect-[3/2] w-full animate-pulse items-center justify-center rounded-md bg-slate-200">
                  <span className="material-symbols-outlined text-3xl text-slate-400">
                    {tipo === "qr" ? "qr_code_2" : "barcode"}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <p className="flex items-start gap-1.5 text-xs font-semibold text-rose-400">
                <span className="material-symbols-outlined text-sm leading-none">error</span>
                {error}
              </p>
            )}

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <span className="material-symbols-outlined text-sm leading-none">info</span>
              {t("pages.productos.qr.hint")}
            </p>

            <div className="grid grid-cols-1 gap-2 border-t border-[#334155]/60 pt-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={guardarJpg}
                disabled={!etiqueta}
                className="btn-success px-4 py-2 text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">image</span>
                {t("pages.productos.qr.save_jpg")}
              </button>
              <button
                type="button"
                onClick={guardarPdf}
                disabled={!etiqueta || generandoPdf}
                className="btn-primary px-4 py-2 text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generandoPdf ? (
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                )}
                {t("pages.productos.qr.save_pdf")}
              </button>
              <button
                type="button"
                onClick={imprimirEtiqueta}
                disabled={!etiqueta}
                className="btn-secondary px-4 py-2 text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">print</span>
                {t("pages.productos.qr.print")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipo(null);
                  setEtiqueta(null);
                  setError("");
                }}
                className="btn-secondary px-4 py-2 text-sm w-full"
              >
                <span className="material-symbols-outlined text-base">swap_horiz</span>
                {t("pages.productos.qr.change_type")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
