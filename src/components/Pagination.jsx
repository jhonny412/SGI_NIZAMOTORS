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
    <div className={`flex items-center justify-center gap-2 sm:gap-3 py-3 select-none text-slate-400 dark:text-slate-300 ${className}`}>
      {/* Ir a Primera página |< */}
      <button
        type="button"
        onClick={() => setPagina(1)}
        disabled={esPrimera}
        title={t("common.pagination.first", "Primera página")}
        aria-label="Primera página"
        className="p-1.5 rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800/60 hover:text-white disabled:hover:bg-transparent text-slate-400 dark:text-slate-300"
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
        className="p-1.5 rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800/60 hover:text-white disabled:hover:bg-transparent text-slate-400 dark:text-slate-300"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>

      {/* Texto: Page 1 of 8 / Página 1 de 8 */}
      <div className="px-2 text-sm text-slate-400 dark:text-slate-300 font-normal">
        {labelPage}{" "}
        <strong className="font-bold text-slate-900 dark:text-white text-base">{pagina}</strong>{" "}
        {labelOf}{" "}
        <strong className="font-bold text-slate-900 dark:text-white text-base">{totalPaginas}</strong>
      </div>

      {/* Página siguiente > */}
      <button
        type="button"
        onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
        disabled={esUltima}
        title={t("common.pagination.next", "Página siguiente")}
        aria-label="Página siguiente"
        className="p-1.5 rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800/60 hover:text-white disabled:hover:bg-transparent text-slate-400 dark:text-slate-300"
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
        className="p-1.5 rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800/60 hover:text-white disabled:hover:bg-transparent text-slate-400 dark:text-slate-300"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/>
        </svg>
      </button>
    </div>
  );
}
