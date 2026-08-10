import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function VentaDetalleModal({ abierto, venta, onCerrar, formatFecha, autoImprimir }) {
  const { t } = useTranslation();

  // Auto print if triggered
  useEffect(() => {
    if (abierto && autoImprimir && venta) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [abierto, autoImprimir, venta]);

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

        /* On print: isolate only the print ticket */
        @media print {
          html, body, #root, #root > * {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-only-ticket, .print-only-ticket * {
            visibility: visible !important;
          }
          .print-only-ticket {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* ========================================== */}
      {/* 1. SCREEN VIEW (VISTA PREVIA DEL SISTEMA) */}
      {/* ========================================== */}
      <div className="modal-content max-w-3xl w-full mx-4 sm:mx-auto animate-slide-up border-[#334155] rounded-3xl relative overflow-hidden no-print">

        {/* Modal Header */}
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155] sticky top-0 z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                COMPROBANTE PAGADO
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">receipt_long</span>
              {venta.boleta ? venta.boleta : t("sale.legacy_sale")}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {t("sale.detail_subtitle")}
            </p>
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

          {/* Total Card */}
          <div className="flex justify-end pt-2 border-t border-[#334155]/60">
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

      {/* ========================================== */}
      {/* 2. PRINT-ONLY RECEIPT (VERSIÓN IMPRESA POS) */}
      {/* ========================================== */}
      <div
        className="print-only-ticket bg-white text-black p-4 font-mono text-[11px] leading-normal"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Title */}
        <div className="text-center font-black text-sm tracking-wide uppercase">
          NIZA MOTORS
        </div>

        {/* Shop Name / Document Type */}
        <div className="text-center text-[10px] mt-0.5 font-bold uppercase">
          {venta.boleta ? "BOLETA DE VENTA ELECTRÓNICA" : "TICKET DE VENTA"}
        </div>

        {/* Separator */}
        <div className="text-center tracking-tighter my-2 text-black font-bold select-none overflow-hidden h-[12px] leading-[12px]">
          ::::::::::::::::::::::::::::::::::::::::
        </div>

        {/* Store Metadata */}
        <div className="space-y-0.5 text-[10px] font-mono">
          <div className="flex justify-between">
            <span>Dirección:</span>
            <span className="font-semibold text-right max-w-[190px] truncate">Av. Alfredo Mendiola 3691</span>
          </div>
          <div className="flex justify-between">
            <span>Teléfono:</span>
            <span className="font-semibold text-right">987 654 321</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span className="font-semibold text-right">{formatFecha(venta.fecha)}</span>
          </div>
          <div className="flex justify-between">
            <span>Vendedor:</span>
            <span className="font-semibold text-right">Admin SGI</span>
          </div>
        </div>

        {/* Separator */}
        <div className="text-center tracking-tighter my-2 text-black font-bold select-none overflow-hidden h-[12px] leading-[12px]">
          ::::::::::::::::::::::::::::::::::::::::
        </div>

        {/* Customer Metadata (if present) */}
        <div className="space-y-0.5 text-[10px] font-mono">
          <div className="flex justify-between">
            <span>Cliente:</span>
            <span className="font-bold text-right uppercase max-w-[190px] truncate">{clientInfo.nombre}</span>
          </div>
          {clientInfo.docTipo !== "OTROS" && (
            <div className="flex justify-between">
              <span>{clientInfo.docTipo}:</span>
              <span className="font-semibold text-right">{clientInfo.docNro}</span>
            </div>
          )}
          {venta.direccion && (
            <div className="flex justify-between">
              <span>Dirección:</span>
              <span className="font-semibold text-right max-w-[190px] truncate">{venta.direccion}</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="text-center tracking-tighter my-2 text-black font-bold select-none overflow-hidden h-[12px] leading-[12px]">
          ::::::::::::::::::::::::::::::::::::::::
        </div>

        {/* Items Section */}
        <div className="space-y-2">
          {venta.items.map((item, idx) => (
            <div key={item.id || idx} className="text-[10px] font-mono leading-tight">
              <div className="flex justify-between items-start gap-2 font-bold uppercase tracking-tight">
                <span className="text-left">
                  {item.producto ? item.producto.descripcion : "PRODUCTO ELIMINADO"}
                </span>
                <span className="shrink-0 text-right">
                  {item.totalVenta.toFixed(2)}
                </span>
              </div>
              <div className="text-[9px] text-slate-650 pl-2 font-mono mt-0.5">
                {item.cantidad} u. x S/. {item.precioUnitario.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="text-center tracking-tighter my-2 text-black font-bold select-none overflow-hidden h-[12px] leading-[12px]">
          ::::::::::::::::::::::::::::::::::::::::
        </div>

        {/* Financial Summary */}
        <div className="space-y-0.5 text-[10px] font-mono">
          <div className="flex justify-between">
            <span className="font-bold">Pago ({venta.metodoPago.toUpperCase()})</span>
            <span>{total.toFixed(2)}</span>
          </div>

          {/* Separator before Total */}
          <div className="text-center tracking-tighter my-2 text-black font-bold select-none overflow-hidden h-[12px] leading-[12px]">
            ::::::::::::::::::::::::::::::::::::::::
          </div>

          <div className="flex justify-between font-black text-[12px]">
            <span>Total</span>
            <span>{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="text-center tracking-tighter my-2 text-black font-bold select-none overflow-hidden h-[12px] leading-[12px]">
          ::::::::::::::::::::::::::::::::::::::::
        </div>

        {/* Thank you note */}
        <div className="text-center font-bold text-[11px] tracking-widest uppercase">
          ¡GRACIAS POR SU COMPRA!
        </div>

        {/* QR Code */}
        <div className="mt-3 text-center flex flex-col items-center justify-center">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
              `Boleta: ${venta.boleta || `LEGACY-${venta.id}`}\nFecha: ${formatFecha(venta.fecha)}\nCliente: ${clientInfo.nombre}\nTotal: S/. ${total.toFixed(2)}`
            )}`}
            alt="QR Code Comprobante"
            className="w-24 h-24 mx-auto border border-slate-200 p-1 bg-white"
          />
          <div className="text-[8px] font-mono mt-1.5 tracking-[3px] text-black uppercase select-none">
            {venta.boleta ? venta.boleta.replace("BOLETA ", "") : `LEGACY-${venta.id}`}
          </div>
        </div>
      </div>

    </div>
  );
}
