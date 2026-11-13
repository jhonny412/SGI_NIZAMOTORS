import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import Swal from "sweetalert2";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Modal con la etiqueta QR de un producto.
 * El QR contiene el código interno, que es el que interpreta el buscador
 * (ScanButton / findProductByScan).
 */
export default function ProductQrModal({ producto, onCerrar }) {
  const { t } = useTranslation();
  const [qrUrl, setQrUrl] = useState("");
  const [error, setError] = useState("");

  const codigo = producto?.codigo || "";
  const descripcion = producto?.descripcion || "";

  useEffect(() => {
    if (!producto) return;
    let activo = true;
    setQrUrl("");
    setError("");

    QRCode.toDataURL(codigo || String(producto.id ?? ""), {
      margin: 1,
      width: 260,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (activo) setQrUrl(url);
      })
      .catch(() => {
        if (activo) setError(t("pages.productos.qr.error"));
      });

    return () => {
      activo = false;
    };
  }, [producto, codigo, t]);

  if (!producto) return null;

  const imprimirEtiqueta = () => {
    if (!qrUrl) return;
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
  <title>${escapeHtml(codigo)}</title>
  <style>
    @page { size: 50mm 30mm; margin: 2mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
    .label { width: 46mm; height: 26mm; display: flex; gap: 2mm; align-items: center; padding: 1mm; }
    .qr { width: 24mm; height: 24mm; flex: 0 0 24mm; }
    .qr img { width: 100%; height: 100%; display: block; }
    .info { min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 1mm; }
    .codigo { font-family: "Courier New", monospace; font-size: 9pt; font-weight: bold; letter-spacing: 0.2px; word-break: break-all; }
    .desc { font-size: 6pt; line-height: 1.15; max-height: 12mm; overflow: hidden; }
    .marca { font-size: 5.5pt; text-transform: uppercase; color: #475569; }
  </style>
</head>
<body>
  <div class="label">
    <div class="qr"><img src="${qrUrl}" alt="${escapeHtml(codigo)}" /></div>
    <div class="info">
      <div class="codigo">${escapeHtml(codigo)}</div>
      <div class="desc">${escapeHtml(descripcion)}</div>
      ${producto.marca ? `<div class="marca">${escapeHtml(producto.marca)}</div>` : ""}
    </div>
  </div>
</body>
</html>`);
    ventana.document.close();
    ventana.focus();

    const imprimir = () => {
      try {
        ventana.print();
      } catch {
        // El navegador puede bloquear print() en ventanas emergentes
      }
    };

    if (ventana.document.readyState === "complete") {
      setTimeout(imprimir, 250);
    } else {
      ventana.onload = () => setTimeout(imprimir, 250);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div className="modal-content max-w-sm w-full mx-4 sm:mx-auto animate-slide-up border-[#334155]">
        <div className="flex items-start justify-between border-b border-[#334155]/70 bg-slate-950 px-5 py-4 rounded-t-2xl">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">qr_code_2</span>
              {t("pages.productos.qr.title")}
            </h3>
            <p className="mt-1 text-xs text-slate-400">{t("pages.productos.qr.subtitle")}</p>
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

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-[#334155]/60 bg-white p-4 flex gap-4 items-center">
            {qrUrl ? (
              <img src={qrUrl} alt={codigo} className="h-28 w-28 shrink-0" />
            ) : (
              <div className="h-28 w-28 shrink-0 animate-pulse rounded-lg bg-slate-200" />
            )}
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold text-slate-900 break-all">{codigo || "—"}</p>
              <p className="mt-1 text-xs text-slate-600 line-clamp-3">{descripcion}</p>
              {producto.marca ? (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{producto.marca}</p>
              ) : null}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
            <span className="material-symbols-outlined text-sm leading-none">info</span>
            {t("pages.productos.qr.hint")}
          </p>

          <div className="flex justify-end gap-2 border-t border-[#334155]/60 pt-4">
            <button type="button" onClick={() => onCerrar?.()} className="btn-secondary px-4 py-2 text-sm">
              {t("scan.close")}
            </button>
            <button
              type="button"
              onClick={imprimirEtiqueta}
              disabled={!qrUrl}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">print</span>
              {t("pages.productos.qr.print")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
