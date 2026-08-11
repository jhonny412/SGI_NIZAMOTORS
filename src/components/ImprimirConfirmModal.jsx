import logoLight from "../assets/logo-light.png";

/**
 * ImprimirConfirmModal
 * Aparece luego de registrar una venta exitosamente.
 * Pregunta al usuario si desea imprimir el comprobante.
 *
 * Props:
 *  - abierto: boolean
 *  - boletaCode: string   (e.g. "BOLETA B001-000001")
 *  - onImprimir: fn()    → el padre debe imprimir y cerrar todo
 *  - onOmitir: fn()      → el padre cierra todo sin imprimir
 */
export default function ImprimirConfirmModal({ abierto, boletaCode, onImprimir, onOmitir }) {
  if (!abierto) return null;

  return (
    <div className="modal-overlay z-[60] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-[#334155] bg-slate-900 animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="imprimir-title"
      >
        {/* Glow decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Body */}
        <div className="relative z-10 flex flex-col items-center px-8 pt-8 pb-6 gap-4">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-amber-900/20 border border-amber-800/20 mb-1">
            <img
              src={logoLight}
              alt="NIZA MOTORS"
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* Success badge */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40">
            <span className="material-symbols-outlined text-xs">check_circle</span>
            Venta registrada
          </span>

          {/* Boleta */}
          {boletaCode && (
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                Comprobante generado
              </p>
              <span className="font-mono font-black text-amber-400 text-sm tracking-wide">
                {boletaCode}
              </span>
            </div>
          )}

          {/* Question */}
          <div className="text-center mt-1">
            <h2
              id="imprimir-title"
              className="text-white font-extrabold text-lg leading-tight"
            >
              ¿Desea imprimir el comprobante?
            </h2>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Puede imprimir el comprobante ahora o hacerlo más tarde desde el detalle de la venta.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#334155]/60 mx-0" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-5">
          {/* Omitir */}
          <button
            type="button"
            id="btn-omitir-imprimir"
            onClick={onOmitir}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-[#334155] text-slate-300 hover:bg-slate-700 hover:text-white font-bold text-sm transition-all cursor-pointer active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-base">close</span>
            No imprimir
          </button>

          {/* Imprimir */}
          <button
            type="button"
            id="btn-confirmar-imprimir"
            onClick={onImprimir}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-900/30 transition-all cursor-pointer active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Sí, imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
