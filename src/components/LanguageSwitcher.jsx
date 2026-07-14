import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith("es") ? "en" : "es";
    i18n.changeLanguage(newLang);
  };

  const isEs = i18n.language.startsWith("es");

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-xl border border-[#334155] bg-slate-950/65 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 shadow-sm transition-all hover:bg-slate-900 hover:text-white active:scale-95 cursor-pointer"
      title={t("common.switch_lang", { lang: isEs ? t("common.english") : t("common.spanish") })}
    >
      <span className="material-symbols-outlined text-sm text-amber-500">translate</span>
      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-slate-400 border border-[#334155]/60">
        {isEs ? "ES" : "EN"}
      </span>
      <span className="hidden sm:inline font-semibold">{isEs ? t("common.spanish") : t("common.english")}</span>
    </button>
  );
}
