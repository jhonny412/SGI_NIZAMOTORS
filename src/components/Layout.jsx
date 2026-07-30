import Sidebar from "./Sidebar";
import LanguageSwitcher from "./LanguageSwitcher";
import { useInventory } from "../context/useInventory";
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
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-slate-100 flex flex-col">
      <Sidebar />
      <main
        className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ease-out ml-0 ${
          sidebarAbierto ? "lg:ml-64" : "lg:ml-[72px]"
        }`}
      >
        <header className="sticky top-0 z-40 border-b border-[#334155]/60 bg-[#0b1326]/85 backdrop-blur-md transition-all duration-300">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-3 px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarAbierto(!sidebarAbierto)}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#334155] bg-slate-900 text-slate-350 shadow-sm transition-colors hover:bg-slate-800 hover:text-white lg:hidden shrink-0"
                aria-label={t("common.toggle_menu")}
              >
                <span className="material-symbols-outlined text-lg">menu</span>
              </button>
              <div className="min-w-0 flex items-center gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    NIZA MOTORS
                  </p>
                  <h1 className="truncate text-sm sm:text-base font-black text-amber-500 tracking-tight uppercase">
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
                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-[#334155]/50">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-black text-slate-200 leading-tight">{usuarioActivo.nombre}</p>
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-0.5">{usuarioActivo.rol}</p>
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
