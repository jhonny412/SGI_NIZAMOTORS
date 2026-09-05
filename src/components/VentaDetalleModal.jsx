import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import logoLight from "../assets/logo-light.png";
import { numeroALetras, parseClienteInfo } from "../utils/comprobante";
import { generateBoletaPdf } from "../utils/boletaPdf";
import { validarNumeroWhatsApp, abrirWhatsApp } from "../utils/whatsapp";

export default function VentaDetalleModal({ abierto, venta, onCerrar, formatFecha, autoImprimir }) {
  const { t } = useTranslation();
  const { usuarioActivo } = useAuth();
  const [qrUrl, setQrUrl] = useState("");
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const hasPrintedRef = useRef(false);

  const vendedorNombre = (venta && venta.vendedor) || usuarioActivo?.nombre || "ADMIN SGI";

  // Reset print ref when modal closes
  useEffect(() => {
    if (!abierto) {
      hasPrintedRef.current = false;
    }
  }, [abierto]);

  // Generate local base64 QR Code image URL so it renders instantly in screen & print
  useEffect(() => {
    if (venta) {
      const boletaNum = venta.boleta ? venta.boleta.replace("BOLETA ", "") : `B001-${String(venta.id).padStart(6, "0")}`;
      const qrData = `RUC: 20603671717 | BOLETA: ${boletaNum} | FECHA: ${formatFecha(venta.fecha)} | TOTAL: S/ ${(venta.totalVenta || 0).toFixed(2)} | VENDEDOR: ${vendedorNombre}`;
      QRCode.toDataURL(qrData, { margin: 1, width: 140 }, (err, url) => {
        if (!err && url) {
          setQrUrl(url);
        }
      });
    }
  }, [venta, formatFecha, vendedorNombre]);

  // Imprime el comprobante generando el mismo PDF (80mm) que se envía por WhatsApp,
  // de modo que formato y tamaño de papel sean idénticos en ambos casos.
  const imprimirBoleta = useCallback(async () => {
    if (!venta) return;
    const blob = await generateBoletaPdf(venta, { qrUrl, formatFecha, vendedorNombre });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("No se pudo imprimir el PDF automáticamente:", err);
      }
      setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 5000);
    };
    document.body.appendChild(iframe);
  }, [venta, qrUrl, formatFecha, vendedorNombre]);

  // Auto print if triggered and automatically close modal afterwards (Guarded strictly once per opening)
  useEffect(() => {
    if (abierto && autoImprimir && venta && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      const timer = setTimeout(async () => {
        try {
          await imprimirBoleta();
        } catch (err) {
          console.error("Error al imprimir el comprobante:", err);
        }
        if (onCerrar) {
          onCerrar();
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [abierto, autoImprimir, venta, onCerrar, imprimirBoleta]);

  if (!abierto || !venta) return null;

  const clientInfo = parseClienteInfo(venta.cliente);
  const total = venta.totalVenta;

  const handleImprimir = async () => {
    setImprimiendo(true);
    try {
      await imprimirBoleta();
    } catch (err) {
      console.error("Error al imprimir el comprobante:", err);
      Swal.fire({
        icon: "error",
        title: t("sale.wa_error_title"),
        text: t("sale.wa_error_text")
      });
    } finally {
      setImprimiendo(false);
    }
  };

  const handleEnviarWhatsApp = async () => {
    const { value: numero } = await Swal.fire({
      title: t("sale.wa_prompt_title"),
      text: t("sale.wa_prompt_text"),
      input: "text",
      inputPlaceholder: t("sale.wa_number_placeholder"),
      showCancelButton: true,
      confirmButtonText: t("sale.wa_send"),
      cancelButtonText: t("sale.wa_cancel"),
      confirmButtonColor: "#25D366",
      inputValidator: (value) => {
        if (!value || !validarNumeroWhatsApp(value)) {
          return t("sale.wa_invalid_number");
        }
        return null;
      },
      preConfirm: (value) => validarNumeroWhatsApp(value)
    });

    if (!numero) return;

    setEnviandoWhatsApp(true);
    try {
      const blob = await generateBoletaPdf(venta, { qrUrl, formatFecha, vendedorNombre });
      const { saveAs } = await import("file-saver");
      const codigo = venta.boleta
        ? venta.boleta.replace("BOLETA ", "")
        : `B001-${String(venta.id).padStart(6, "0")}`;
      saveAs(blob, `boleta-${codigo}.pdf`);
      abrirWhatsApp(numero, t("sale.wa_message", { boleta: codigo }));
    } catch (err) {
      console.error("Error al generar el comprobante PDF:", err);
      Swal.fire({
        icon: "error",
        title: t("sale.wa_error_title"),
        text: t("sale.wa_error_text")
      });
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  return (
    <div className="modal-overlay z-50 bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">

      {/* Styles to control screen showing vs printing */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* On screen: hide print ticket */
        .print-only-ticket {
          display: none !important;
        }

        /* On print: hide EVERYTHING except the ticket */
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm;
          }

          /* Reset page layout */
          html, body {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          /* Hide the entire React app */
          #root {
            display: none !important;
          }

          /* Show ONLY the print ticket (rendered via portal into body) */
          .print-only-ticket {
            display: block !important;
            position: static !important;
            width: 80mm !important;
            max-width: 80mm !important;
            box-sizing: border-box !important;
            padding: 3mm 4mm 4mm 5mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* ========================================== */}
      {/* 1. SCREEN VIEW (VISTA PREVIA DEL SISTEMA) */}
      {/* ========================================== */}
      <div className="modal-content max-w-3xl w-full mx-4 sm:mx-auto animate-slide-up border-[#334155] rounded-3xl relative overflow-hidden">

        {/* Modal Header */}
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155] sticky top-0 z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            {/* Company Logo */}
            <img
              src={logoLight}
              alt="NIZA MOTORS"
              className="h-14 w-14 object-contain rounded-xl bg-white p-1 shadow-md shadow-amber-900/20 border border-amber-800/20"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  COMPROBANTE PAGADO
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-sm">receipt_long</span>
                {venta.boleta ? venta.boleta : t("sale.legacy_sale")}
              </h2>
              <p className="text-[11px] text-amber-400/80 font-bold uppercase tracking-wide">
                NIZA MOTORS S.A.C. &nbsp;·&nbsp; RUC: 20603671717
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-white transition-all p-1.5 rounded-xl hover:bg-white/10 relative z-10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="card-body p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Client & Payment Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Cliente Card */}
            <div className="p-5 bg-slate-950/20 border border-[#334155]/40 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-[#334155]/30 pb-3">
                <div className="p-1.5 rounded-lg bg-emerald-950/20 text-emerald-400">
                  <span className="material-symbols-outlined text-sm">person</span>
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {t("sale.client_info")}
                </h4>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-500 w-16 font-semibold shrink-0">Nombre:</span>
                  <span className="text-slate-200 font-bold uppercase">{clientInfo.nombre}</span>
                </div>

                {clientInfo.docTipo !== "OTROS" && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-slate-500 w-16 font-semibold shrink-0">{clientInfo.docTipo}:</span>
                    <span className="text-slate-250 font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded">
                      {clientInfo.docNro}
                    </span>
                  </div>
                )}

                {venta.direccion && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-slate-500 w-16 font-semibold shrink-0">Dirección:</span>
                    <span className="text-slate-300 font-medium">{venta.direccion}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pago Card */}
            <div className="p-5 bg-slate-950/20 border border-[#334155]/40 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-[#334155]/30 pb-3">
                <div className="p-1.5 rounded-lg bg-sky-950/20 text-sky-400">
                  <span className="material-symbols-outlined text-sm">credit_card</span>
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {t("sale.sale_info")}
                </h4>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-500 w-24 font-semibold shrink-0">Fecha Emisión:</span>
                  <span className="text-slate-200 font-bold">{formatFecha(venta.fecha)}</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-slate-500 w-24 font-semibold shrink-0">Vendedor:</span>
                  <span className="text-slate-200 font-bold uppercase">{vendedorNombre}</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-slate-500 w-24 font-semibold shrink-0">Método de Pago:</span>
                  <span className="badge-info">
                    {t(`sale.${venta.metodoPago.toLowerCase()}`, { defaultValue: venta.metodoPago })}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-slate-500 w-24 font-semibold shrink-0">Total Cantidad:</span>
                  <span className="text-slate-200 font-bold">{venta.cantidadTotal} unidades</span>
                </div>
              </div>
            </div>

          </div>

          {/* Table of products */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              {t("sale.items_list")}
            </h4>
            <div className="border border-[#334155]/40 rounded-2xl overflow-hidden bg-slate-900/20">
              <table className="min-w-full divide-y divide-[#334155]/30">
                <thead className="bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Repuesto / Producto
                    </th>
                    <th className="px-4 py-3.5 text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-24">
                      Cantidad
                    </th>
                    <th className="px-4 py-3.5 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-32">
                      Precio Unitario
                    </th>
                    <th className="px-4 py-3.5 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-32">
                      Importe Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-950/20 divide-y divide-[#334155]/30">
                  {venta.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-amber-500/5 transition-colors duration-150">
                      <td className="px-4 py-3.5">
                        {item.producto ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-slate-200">
                              {item.producto.descripcion}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-900 px-1 py-0.5 rounded border border-[#334155]/30">
                                {item.producto.codigo}
                              </span>
                              {item.producto.oem && (
                                <>
                                  <span className="text-slate-700 text-[10px] font-bold">·</span>
                                  <span className="text-[10px] text-slate-500 font-mono font-medium">
                                    OEM: {item.producto.oem}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-slate-500 text-xs">Producto Eliminado</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg bg-slate-900 text-slate-300 font-extrabold text-xs border border-[#334155]/40">
                          {item.cantidad} u.
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-400 font-mono">
                        S/. {item.precioUnitario.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs font-black text-slate-200 font-mono">
                        S/. {item.totalVenta.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Section: QR Code & Total */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#334155]/60">
            {/* QR Code */}
            <div className="flex items-center gap-3">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="QR Comprobante"
                  className="w-20 h-20 object-contain bg-white p-1.5 rounded-xl border border-slate-700/50 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-950/40 border border-[#334155]/40 rounded-xl flex items-center justify-center text-[10px] text-slate-500">
                  Cargando...
                </div>
              )}
              <div className="text-[11px] text-slate-400 space-y-0.5 hidden sm:block">
                <p className="font-bold text-slate-300">Código QR del Comprobante</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {venta.boleta ? venta.boleta : `B001-${String(venta.id).padStart(6, "0")}`}
                </p>
              </div>
            </div>

            {/* Total Card */}
            <div className="w-full sm:w-72 bg-slate-950/40 border border-[#334155]/40 p-5 rounded-2xl shadow-sm text-xs text-slate-400">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">Total General:</span>
                <span className="text-lg font-black text-amber-500 font-mono">S/. {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 px-6 py-4.5 border-t border-[#334155]/60 bg-slate-950/30 rounded-b-3xl">
          <button
            type="button"
            onClick={handleImprimir}
            disabled={imprimiendo}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 border border-[#334155] text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {imprimiendo ? (
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">print</span>
            )}
            {t("sale.print")}
          </button>

          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            disabled={enviandoWhatsApp}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-slate-950 font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {enviandoWhatsApp ? (
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.064 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            )}
            {t("sale.send_whatsapp")}
          </button>

          <button
            type="button"
            onClick={onCerrar}
            className="btn-secondary py-2.5 px-5 text-sm rounded-xl font-bold active:scale-98"
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. PRINT-ONLY RECEIPT via Portal (rendered directly in body) */}
      {/* ============================================================ */}
      {createPortal(
        <div
          className="print-only-ticket bg-white text-black p-3 font-mono text-[9px] leading-normal"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "2px" }}>
            <img
              src={logoLight}
              alt="NIZA MOTORS"
              style={{ width: "34mm", maxHeight: "12mm", objectFit: "contain", margin: "0 auto" }}
            />
          </div>

          {/* Company Name & Subtitle */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>
            NIZA MOTORS PERU S.A.C.
          </div>
          <div style={{ textAlign: "center", fontSize: "8.5px", color: "#333" }}>
            Repuestos y Accesorios de Autos
          </div>

          {/* Document Type & Number */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "10px", marginTop: "6px", textTransform: "uppercase" }}>
            {venta.boleta ? "BOLETA DE VENTA ELECTRÓNICA" : "TICKET DE VENTA"}
          </div>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "10.5px" }}>
            {venta.boleta ? venta.boleta.replace("BOLETA ", "") : `B001-${String(venta.id).padStart(6, "0")}`}
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Fiscal Address & Document Data */}
          <div style={{ fontSize: "9px", lineHeight: "1.3" }}>
            <div style={{ fontWeight: "bold" }}>DOMICILIO FISCAL:</div>
            <div style={{ fontSize: "8.5px", color: "#333", textTransform: "uppercase" }}>
              CAL.LOS TALADROS NRO. 257 URB. NARANJAL INDUSTRIAL LIMA - LIMA - INDEPENDENCIA
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span>RUC:</span>
              <span style={{ fontWeight: "bold" }}>20603671717</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>FECHA EMISIÓN:</span>
              <span>{formatFecha(venta.fecha)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>MÉTODO PAGO:</span>
              <span style={{ fontWeight: "bold" }}>{venta.metodoPago.toUpperCase()}</span>
            </div>
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Customer Data */}
          <div style={{ fontSize: "9px", lineHeight: "1.3" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>SEÑORES:</span>
              <span style={{ fontWeight: "bold", textTransform: "uppercase", textAlign: "right", maxWidth: "145px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {clientInfo.nombre}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>DIRECCIÓN:</span>
              <span style={{ textTransform: "uppercase", textAlign: "right", maxWidth: "145px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {venta.direccion || "-"}
              </span>
            </div>
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Product Items Table */}
          <div style={{ fontSize: "9px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
              <span style={{ width: "46%", textAlign: "left" }}>PRODUCTO</span>
              <span style={{ width: "14%", textAlign: "right" }}>CANT</span>
              <span style={{ width: "20%", textAlign: "right" }}>P.UNIT</span>
              <span style={{ width: "20%", textAlign: "right" }}>IMPORTE</span>
            </div>
            <div>
              {venta.items.map((item, idx) => (
                <div key={item.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", lineHeight: "1.3", marginBottom: "3px" }}>
                  <span style={{ width: "46%", textTransform: "uppercase", fontWeight: "500", paddingRight: "4px", wordBreak: "break-word" }}>
                    {item.producto ? item.producto.descripcion : "PRODUCTO ELIMINADO"}
                  </span>
                  <span style={{ width: "14%", textAlign: "right", flexShrink: 0 }}>{item.cantidad.toFixed(1)}</span>
                  <span style={{ width: "20%", textAlign: "right", flexShrink: 0 }}>{item.precioUnitario.toFixed(2)}</span>
                  <span style={{ width: "20%", textAlign: "right", flexShrink: 0 }}>{item.totalVenta.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Totals & Amount in words */}
          <div style={{ fontSize: "10px", lineHeight: "1.3" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "11px" }}>
              <span>TOTAL VENTA</span>
              <span>S/.{total.toFixed(2)}</span>
            </div>
            <div style={{ textAlign: "center", fontStyle: "italic", fontSize: "8.5px", marginTop: "4px", color: "#333" }}>
              {numeroALetras(total)}
            </div>
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Seller Info */}
          <div style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase" }}>
            VENDEDOR(A) : {vendedorNombre.toUpperCase()}
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Footer Notes & QR Code */}
          <div style={{ textAlign: "center", fontSize: "8px", lineHeight: "1.3" }}>
            <div>Representación impresa de la Boleta de Venta Electrónica.</div>
            <div>Gracias por su preferencia</div>
          </div>

          <div style={{ marginTop: "10px", display: "flex", justifyContent: "center" }}>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code Comprobante"
                style={{ width: "90px", height: "90px", border: "1px solid #ccc", padding: "4px", background: "#fff" }}
              />
            ) : (
              <div style={{ width: "90px", height: "90px", border: "1px solid #ccc", padding: "4px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px" }}>
                Cargando QR...
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
