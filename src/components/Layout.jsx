import Sidebar from "./Sidebar";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "../context/useAuth";
import { useUI } from "../context/useUI";
import { useTranslation } from "react-i18next";

export default function Layout({ children }) {
  const { sidebarAbierto, paginaActiva, setSidebarAbierto, tema, toggleTema } = useUI();
  const { usuarioActivo, logout } = useAuth();

  const { t } = useTranslation();

  const pageNames = {
    dashboard: t("pages.dashboard.title"),
    productos: t("pages.productos.title"),
    movimientos: t("pages.movimientos.title"),
    kardex: t("pages.kardex.title"),
    proveedores: t("pages.proveedores.title"),
    marcas: t("pages.marcas.title"),
    categorias: "Categorías",
    creditos: t("pages.creditos.title"),
    ventas: t("pages.ventas.title"),
    "reporte-ventas": t("pages.reportes.ventas.title"),
    "reporte-ingresos": t("pages.reportes.ingresos.title"),
    "reporte-salidas": t("pages.reportes.salidas.title"),
    "reporte-kardex": t("pages.reportes.kardex.title"),
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b1326] text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300">
      <Sidebar />
      <main
        className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ease-out ml-0 ${
          sidebarAbierto ? "lg:ml-64" : "lg:ml-[72px]"
        }`}
      >
        <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-[#334155]/60 bg-white/90 dark:bg-[#0b1326]/85 text-slate-800 dark:text-slate-100 backdrop-blur-md transition-all duration-300 shadow-sm dark:shadow-none">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-3 px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarAbierto(!sidebarAbierto)}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 shadow-xs transition-all hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950 dark:hover:bg-amber-500 dark:hover:text-slate-950 shrink-0 cursor-pointer"
                aria-label={t("common.toggle_menu")}
                title={sidebarAbierto ? "Ocultar / Colapsar menú" : "Mostrar / Expandir menú"}
              >
                <span className="material-symbols-outlined text-lg">menu</span>
              </button>
              <div className="min-w-0 flex items-center gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    NIZA MOTORS
                  </p>
                  <h1 className="truncate text-sm sm:text-base font-black text-amber-600 dark:text-amber-500 tracking-tight uppercase">
                    {pageNames[paginaActiva] || t("pages.dashboard.title")}
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <LanguageSwitcher />
              
              <button
                onClick={toggleTema}
                className="theme-toggle rounded-xl"
                aria-label={tema === "dark" ? t("common.change_theme_light") : t("common.change_theme_dark")}
                title={tema === "dark" ? t("common.theme_light") : t("common.theme_dark")}
              >
                {tema === "dark" ? (
                  <span className="material-symbols-outlined text-lg">light_mode</span>
                ) : (
                  <span className="material-symbols-outlined text-lg">dark_mode</span>
                )}
              </button>
              
              {usuarioActivo && (
                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 dark:border-[#334155]/50">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{usuarioActivo.nombre}</p>
                    <p className="text-[8px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-0.5">{usuarioActivo.rol}</p>
                  </div>
                  <div className="group relative">
                    <button
                      onClick={logout}
                      title="Cerrar sesión"
                      className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-sm font-black shadow-md hover:scale-105 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-transparent transition-all duration-300 cursor-pointer ${
                        usuarioActivo.rol.toLowerCase() === "admin"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-purple-600 text-slate-100"
                      }`}
                    >
                      <span className="group-hover:opacity-0 transition-opacity duration-200">
                        {usuarioActivo.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="material-symbols-outlined text-sm absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        logout
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 md:p-6 lg:p-8 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
