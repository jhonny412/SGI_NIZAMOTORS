import { useTranslation } from "react-i18next";

export default function Pagination({ pagina, totalPaginas, setPagina, className = "" }) {
  const { t, i18n } = useTranslation();

  if (!totalPaginas || totalPaginas <= 1) return null;

  const esPrimera = pagina === 1;
  const esUltima = pagina === totalPaginas;
  const isEn = i18n.language && i18n.language.startsWith("en");

  const labelPage = isEn ? "Page" : "Página";
  const labelOf = isEn ? "of" : "de";

  return (
    <div className={`flex items-center justify-center my-1.5 ${className}`}>
      {/* Contenedor Adaptable y Altamente Legible en Modo Claro y Oscuro */}
      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-md dark:shadow-slate-950/60">
        
        {/* Ir a Primera página |< */}
        <button
          type="button"
          onClick={() => setPagina(1)}
          disabled={esPrimera}
          title={t("common.pagination.first", "Primera página")}
          aria-label="Primera página"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400
            text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-amber-500/15 active:scale-95"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/>
          </svg>
        </button>

        {/* Página anterior < */}
        <button
          type="button"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={esPrimera}
          title={t("common.pagination.previous", "Página anterior")}
          aria-label="Página anterior"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400
            text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-amber-500/15 active:scale-95"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>

        {/* Insignia Central Altamente Legible: Página 1 de 23 */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium">
          <span className="text-slate-600 dark:text-slate-400 font-medium">{labelPage}</span>
          <span className="px-2 py-0.5 rounded bg-amber-500 text-white dark:bg-amber-500/25 dark:text-amber-400 font-black font-mono text-sm shadow-xs border border-amber-600/20 dark:border-amber-500/30">
            {pagina}
          </span>
          <span className="text-slate-600 dark:text-slate-400 font-medium">{labelOf}</span>
          <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">{totalPaginas}</span>
        </div>

        {/* Página siguiente > */}
        <button
          type="button"
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          disabled={esUltima}
          title={t("common.pagination.next", "Página siguiente")}
          aria-label="Página siguiente"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400
            text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-amber-500/15 active:scale-95"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>

        {/* Ir a Última página >| */}
        <button
          type="button"
          onClick={() => setPagina(totalPaginas)}
          disabled={esUltima}
          title={t("common.pagination.last", "Última página")}
          aria-label="Última página"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400
            text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-amber-500/15 active:scale-95"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/>
          </svg>
        </button>

      </div>
    </div>
  );
}
