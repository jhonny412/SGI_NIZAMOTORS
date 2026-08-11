import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import QRCode from "qrcode";
import logoLight from "../assets/logo-light.png";

// Helper to convert total amount into Spanish text (monto en letras)
function numeroALetras(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "";
  const num = Math.floor(amount);
  const cents = Math.round((amount - num) * 100);
  const centsStr = String(cents).padStart(2, "0") + "/100 SOLES.";

  if (num === 0) return `SON: CERO Y ${centsStr}`;

  const Unidades = (n) => {
    switch (n) {
      case 1: return "UN";
      case 2: return "DOS";
      case 3: return "TRES";
      case 4: return "CUATRO";
      case 5: return "CINCO";
      case 6: return "SEIS";
      case 7: return "SIETE";
      case 8: return "OCHO";
      case 9: return "NUEVE";
      default: return "";
    }
  };

  const Decenas = (n) => {
    const decena = Math.floor(n / 10);
    const unidad = n % 10;
    switch (decena) {
      case 1:
        switch (unidad) {
          case 0: return "DIEZ";
          case 1: return "ONCE";
          case 2: return "DOCE";
          case 3: return "TRECE";
          case 4: return "CATORCE";
          case 5: return "QUINCE";
          default: return "DIECI" + Unidades(unidad);
        }
      case 2:
        if (unidad === 0) return "VEINTE";
        return "VEINTI" + Unidades(unidad);
      case 3: return "TREINTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 4: return "CUARENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 5: return "CINCUENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 6: return "SESENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 7: return "SETENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 8: return "OCHENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 9: return "NOVENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      default: return Unidades(unidad);
    }
  };

  const Centenas = (n) => {
    const centena = Math.floor(n / 100);
    const decena = n % 100;
    switch (centena) {
      case 1:
        if (decena > 0) return "CIENTO " + Decenas(decena);
        return "CIEN";
      case 2: return "DOSCIENTOS " + Decenas(decena);
      case 3: return "TRESCIENTOS " + Decenas(decena);
      case 4: return "CUATROCIENTOS " + Decenas(decena);
      case 5: return "QUINIENTOS " + Decenas(decena);
      case 6: return "SEISCIENTOS " + Decenas(decena);
      case 7: return "SETECIENTOS " + Decenas(decena);
      case 8: return "OCHOCIENTOS " + Decenas(decena);
      case 9: return "NOVECIENTOS " + Decenas(decena);
      default: return Decenas(decena);
    }
  };

  const Miles = (n) => {
    const divisor = 1000;
    const cientos = Math.floor(n / divisor);
    const resto = n % divisor;
    let strMiles = "";
    if (cientos === 1) strMiles = "UN MIL";
    else if (cientos > 1) strMiles = Centenas(cientos) + " MIL";

    const strCentenas = Centenas(resto);
    if (strMiles === "") return strCentenas;
    return (strMiles + " " + strCentenas).trim();
  };

  const Millones = (n) => {
    const divisor = 1000000;
    const cientos = Math.floor(n / divisor);
    const resto = n % divisor;
    let strMillones = "";
    if (cientos === 1) strMillones = "UN MILLON";
    else if (cientos > 1) strMillones = Centenas(cientos) + " MILLONES";

    const strMiles = Miles(resto);
    if (strMillones === "") return strMiles;
    return (strMillones + " " + strMiles).trim();
  };

  const texto = Millones(num).trim();
  return `SON: ${texto} Y ${centsStr}`;
}

export default function VentaDetalleModal({ abierto, venta, onCerrar, formatFecha, autoImprimir }) {
  const { t } = useTranslation();
  const { usuarioActivo } = useAuth();
  const [qrUrl, setQrUrl] = useState("");
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

  // Auto print if triggered and automatically close modal afterwards (Guarded strictly once per opening)
  useEffect(() => {
    if (abierto && autoImprimir && venta && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      const timer = setTimeout(() => {
        window.print();
        if (onCerrar) {
          onCerrar();
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [abierto, autoImprimir, venta, onCerrar]);

  if (!abierto || !venta) return null;

  // Helper to parse client details
  function parseClienteInfo(clienteStr) {
    if (!clienteStr) {
      return { nombre: "CLIENTE VARIOS", docTipo: "OTROS", docNro: "-" };
    }

    // Try to match "NAME (TYPE: NUMBER)"
    const regex = /^(.*?)\s*\((DNI|RUC|OTROS):\s*(\d+)\)$/;
    const match = clienteStr.match(regex);
    if (match) {
      return {
        nombre: match[1].trim(),
        docTipo: match[2],
        docNro: match[3]
      };
    }

    // Legacy match with just number "NAME (NUMBER)"
    const regexLegacy = /^(.*?)\s*\((\d+)\)$/;
    const matchLegacy = clienteStr.match(regexLegacy);
    if (matchLegacy) {
      return {
        nombre: matchLegacy[1].trim(),
        docTipo: matchLegacy[2].length === 11 ? "RUC" : "DNI",
        docNro: matchLegacy[2]
      };
    }

    return {
      nombre: clienteStr.trim(),
      docTipo: "OTROS",
      docNro: "-"
    };
  }

  const clientInfo = parseClienteInfo(venta.cliente);
  const total = venta.totalVenta;

  const handleImprimir = () => {
    window.print();
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
            width: 85mm !important;
            max-width: 85mm !important;
            padding: 5px 2mm 3mm 20px !important;
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
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 border border-[#334155] text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            {t("sale.print")}
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
          className="print-only-ticket bg-white text-black p-3 font-mono text-[10px] leading-normal"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "2px" }}>
            <img
              src={logoLight}
              alt="NIZA MOTORS"
              style={{ width: "50mm", maxHeight: "18mm", objectFit: "contain", margin: "0 auto" }}
            />
          </div>

          {/* Company Name & Subtitle */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>
            NIZA MOTORS PERU S.A.C.
          </div>
          <div style={{ textAlign: "center", fontSize: "9px", color: "#333" }}>
            Repuestos y Accesorios de Autos
          </div>

          {/* Document Type & Number */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "10.5px", marginTop: "6px", textTransform: "uppercase" }}>
            {venta.boleta ? "BOLETA DE VENTA ELECTRÓNICA" : "TICKET DE VENTA"}
          </div>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "11px" }}>
            {venta.boleta ? venta.boleta.replace("BOLETA ", "") : `B001-${String(venta.id).padStart(6, "0")}`}
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Fiscal Address & Document Data */}
          <div style={{ fontSize: "9.5px", lineHeight: "1.3" }}>
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
          <div style={{ fontSize: "9.5px", lineHeight: "1.3" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>SEÑORES:</span>
              <span style={{ fontWeight: "bold", textTransform: "uppercase", textAlign: "right", maxWidth: "170px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {clientInfo.nombre}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>DIRECCIÓN:</span>
              <span style={{ textTransform: "uppercase", textAlign: "right", maxWidth: "170px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {venta.direccion || "-"}
              </span>
            </div>
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Product Items Table */}
          <div style={{ fontSize: "9.5px" }}>
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
          <div style={{ fontSize: "9.5px", fontWeight: "bold", textTransform: "uppercase" }}>
            VENDEDOR(A) : {vendedorNombre.toUpperCase()}
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          {/* Footer Notes & QR Code */}
          <div style={{ textAlign: "center", fontSize: "8.5px", lineHeight: "1.3" }}>
            <div>Representación impresa de la Boleta de Venta Electrónica.</div>
            <div>Gracias por su preferencia</div>
          </div>

          <div style={{ marginTop: "10px", display: "flex", justifyContent: "center" }}>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code Comprobante"
                style={{ width: "112px", height: "112px", border: "1px solid #ccc", padding: "4px", background: "#fff" }}
              />
            ) : (
              <div style={{ width: "112px", height: "112px", border: "1px solid #ccc", padding: "4px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px" }}>
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
