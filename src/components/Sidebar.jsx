import { Fragment, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { useUI } from "../context/useUI";
import { ROUTES } from "../config/routes";
import { useTranslation } from "react-i18next";
import logoDark from "../assets/logo.png";
import logoLight from "../assets/logo-light.png";

export default function Sidebar() {
  const { paginaActiva, setPaginaActiva, sidebarAbierto, setSidebarAbierto, tema } = useUI();
  const { usuarioActivo } = useAuth();
  const { t } = useTranslation();

  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const rol = usuarioActivo?.rol?.toLowerCase() || "vendedor";

  // Build menu dynamically based on ROUTES OCP config
  const menuStructure = useMemo(() => {
    const list = [];
    
    // 1. Dashboard (Item principal sin grupo)
    if (ROUTES.dashboard.roles.includes(rol)) {
      list.push({
        type: "item",
        id: "dashboard",
        label: t(ROUTES.dashboard.labelKey),
        icon: ROUTES.dashboard.icon,
        iconColor: ROUTES.dashboard.iconColor
      });
    }

    // Grupos que ya sabemos que existen o se generan de forma dinámica
    const groups = {};

    Object.values(ROUTES).forEach(route => {
      // Ignorar items raíz como dashboard y páginas hijas (con parent)
      if (route.id === "dashboard" || route.parent) return;

      if (route.roles.includes(rol)) {
        if (route.group) {
          if (!groups[route.group]) {
            groups[route.group] = {
              id: route.group,
              type: "group",
              title: t(route.groupLabelKey),
              icon: route.groupIcon || "folder",
              groupColor: route.groupColor,
              items: []
            };
          }
          
          // Buscar si tiene hijos (ej. productos -> categorias, marcas)
          const children = Object.values(ROUTES).filter(r => r.parent === route.id && r.roles.includes(rol)).map(r => ({
            id: r.id,
            label: t(r.labelKey),
            icon: r.icon,
            iconColor: r.iconColor
          }));

          groups[route.group].items.push({
            id: route.id,
            label: t(route.labelKey),
            icon: route.icon,
            iconColor: route.iconColor,
            ...(children.length > 0 ? { children } : {})
          });
        }
      }
    });

    // Mantener orden: Comercial -> Inventario -> Compras -> Reportes -> Seguridad
    const order = ["comercial", "inventario", "compras", "reportes", "seguridad"];
    order.forEach(gId => {
      if (groups[gId]) {
        list.push(groups[gId]);
      }
    });

    return list;
  }, [rol, t]);


  const isGroupActive = (group) => {
    if (group.type === "item") {
      return paginaActiva === group.id;
    }
    if (group.type === "group") {
      return group.items.some(
        (item) =>
          paginaActiva === item.id ||
          (item.children && item.children.some((child) => paginaActiva === child.id))
      );
    }
    return false;
  };

  return (
    <>
      {sidebarAbierto && (
        <button
          aria-label={t("common.close_menu")}
          className="fixed inset-0 z-20 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarAbierto(false)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-30 h-full border-r transition-all duration-300 ease-out 
          bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-xl border-slate-200 dark:border-[#334155] shadow-2xl shadow-slate-900/10 dark:shadow-slate-950/50
          ${sidebarAbierto ? "w-64 overflow-hidden" : "w-0 lg:w-[72px] overflow-visible"}`}
      >
        <div className="flex h-full flex-col">
          {/* macOS Top Bar Header */}
          <div className="flex flex-col border-b px-3.5 py-3 border-slate-200/80 dark:border-[#334155]/60 bg-slate-50/80 dark:bg-slate-950/30 backdrop-blur-md">
            {/* macOS Window Controls (Traffic Lights) & Toggle Button */}
            {sidebarAbierto ? (
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-1.5 px-1 py-0.5 group cursor-default">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-xs flex items-center justify-center text-[7px] font-bold text-red-950 opacity-90 transition-transform group-hover:scale-110"></span>
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-xs flex items-center justify-center text-[7px] font-bold text-amber-950 opacity-90 transition-transform group-hover:scale-110"></span>
                  <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-xs flex items-center justify-center text-[7px] font-bold text-emerald-950 opacity-90 transition-transform group-hover:scale-110"></span>
                </div>
                <button
                  onClick={() => setSidebarAbierto(false)}
                  className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors lg:inline-flex
                    text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  aria-label={t("common.toggle_menu_width")}
                  title="Colapsar menú"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full py-0.5 gap-2">
                <div className="flex items-center gap-1 group cursor-default">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]"></span>
                </div>
                <button
                  onClick={() => setSidebarAbierto(true)}
                  className="hidden h-8 w-8 shrink-0 lg:flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer shadow-xs border border-amber-500/30"
                  aria-label="Expandir menú"
                  title="Expandir menú"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            )}

            {/* Brand Logo & Name */}
            <div className={`flex flex-col items-center gap-1 ${!sidebarAbierto ? "lg:hidden" : ""}`}>
              <div className="flex flex-col items-center w-full px-2 py-1.5 relative">
                <div className="absolute inset-x-0 top-0 h-20 bg-radial-gradient from-amber-500/10 to-transparent blur-xl opacity-80 pointer-events-none" />
                
                <div className="flex w-full items-center justify-center overflow-hidden py-1 relative z-10">
                  <img 
                    src={tema === "dark" ? logoDark : logoLight} 
                    alt="NIZA MOTORS" 
                    className="w-full h-auto max-h-14 object-contain transition-transform duration-500 hover:scale-105 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.25)]" 
                  />
                </div>
                <h2 className="mt-2 text-xs font-black text-center text-slate-800 dark:text-slate-100 tracking-wider relative z-10 uppercase">
                  Niza Motors
                </h2>
                <p className="mt-0.5 text-[8.5px] font-black uppercase tracking-[0.2em] text-center text-slate-500 dark:text-slate-400 relative z-10">
                  {t("common.system_name")}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items (macOS Sidebar Style) */}
          <nav className={`flex-1 space-y-1 px-3 py-4 ${sidebarAbierto ? "overflow-y-auto" : "overflow-visible"}`}>
            {menuStructure.map((item) => {
              if (sidebarAbierto) {
                // Render expanded state
                if (item.type === "item") {
                  const isActive = paginaActiva === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setPaginaActiva(item.id);
                        if (window.innerWidth < 1024) setSidebarAbierto(false);
                      }}
                      className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150 ease-out cursor-pointer ${
                        isActive
                          ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 active:scale-[0.98]"
                          : "text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span className={`material-symbols-outlined shrink-0 text-lg ${isActive ? "text-slate-950" : (item.iconColor || "text-amber-500")}`}>
                        {item.icon}
                      </span>
                      <span className="whitespace-nowrap text-xs font-semibold tracking-wide">
                        {item.label}
                      </span>
                    </button>
                  );
                }

                // Render group expanded state (macOS Category Section)
                const isGroupOpen = !!openGroups[item.id];
                const active = isGroupActive(item);

                return (
                  <div key={item.id || item.title} className="space-y-1 pt-2 first:pt-0">
                    <button
                      onClick={() => toggleGroup(item.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-all duration-150 cursor-pointer ${
                        active
                          ? "text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`material-symbols-outlined shrink-0 text-base ${active ? "text-amber-600 dark:text-amber-500" : (item.groupColor || "text-amber-500")}`}>
                          {item.icon}
                        </span>
                        <span className="truncate text-[10.5px] font-black uppercase tracking-wider">{item.title}</span>
                      </div>
                      <span
                        className={`material-symbols-outlined shrink-0 text-sm transition-transform duration-200 ${
                          isGroupOpen ? "rotate-90 text-amber-600 dark:text-amber-500" : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        chevron_right
                      </span>
                    </button>

                    {isGroupOpen && (
                      <div className="space-y-0.5 pl-1.5 transition-all">
                        {item.items.map((subItem) => {
                          const isSubActive = paginaActiva === subItem.id;
                          return (
                            <Fragment key={subItem.id}>
                              <button
                                onClick={() => {
                                  setPaginaActiva(subItem.id);
                                  if (window.innerWidth < 1024) setSidebarAbierto(false);
                                }}
                                className={`group relative flex w-full items-center gap-2 rounded-lg py-1.5 pl-5 pr-2.5 text-left transition-all duration-150 ease-out cursor-pointer ${
                                  isSubActive
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500 pl-[18px]"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                                }`}
                              >
                                <span className={`material-symbols-outlined shrink-0 text-base ${isSubActive ? "text-amber-600 dark:text-amber-500" : (subItem.iconColor || "text-amber-500")}`}>
                                  {subItem.icon || "arrow_right"}
                                </span>
                                <span className="whitespace-nowrap text-xs font-medium tracking-wide">
                                  {subItem.label}
                                </span>
                              </button>

                              {/* Children */}
                              {subItem.children && (
                                <div className="space-y-0.5 pl-3">
                                  {subItem.children.map((child) => {
                                    const isChildActive = paginaActiva === child.id;
                                    return (
                                      <button
                                        key={child.id}
                                        onClick={() => {
                                          setPaginaActiva(child.id);
                                          if (window.innerWidth < 1024) setSidebarAbierto(false);
                                        }}
                                        className={`group relative flex w-full items-center gap-2 rounded-lg py-1 pl-5 pr-2 text-left transition-all duration-150 ease-out cursor-pointer ${
                                          isChildActive
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500 pl-[18px]"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                      >
                                        <span className={`material-symbols-outlined shrink-0 text-sm ${isChildActive ? "text-amber-600 dark:text-amber-500" : (child.iconColor || "text-amber-500")}`}>
                                          {child.icon || "arrow_right"}
                                        </span>
                                        <span className="whitespace-nowrap text-[11px] font-medium tracking-wide">
                                          {child.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Render collapsed state with tooltips/hover menus
                return (
                  <div key={item.title || item.id} className="relative group flex justify-center py-1 overflow-visible">
                    {item.type === "item" ? (
                      <button
                        onClick={() => {
                          setPaginaActiva(item.id);
                        }}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-all duration-150 relative cursor-pointer ${
                          paginaActiva === item.id
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-105"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                        title={item.label}
                      >
                        <span className={`material-symbols-outlined ${paginaActiva === item.id ? "text-slate-950" : (item.iconColor || "text-sky-500")}`}>{item.icon}</span>
                        {paginaActiva === item.id && (
                          <span className="absolute left-0.5 top-1/4 h-1/2 w-1 rounded-r-full bg-slate-950 shadow-[0_0_4px_black]" />
                        )}
                      </button>
                    ) : (
                      <div className="relative overflow-visible">
                        <button
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-all duration-150 relative cursor-pointer ${
                            isGroupActive(item)
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/30"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <span className={`material-symbols-outlined ${isGroupActive(item) ? "text-amber-600 dark:text-amber-500" : (item.groupColor || "text-amber-500")}`}>{item.icon}</span>
                          {isGroupActive(item) && (
                            <span className="absolute left-0.5 top-1/4 h-1/2 w-1 rounded-r-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          )}
                        </button>

                        {/* Floating Dropdown */}
                        <div 
                          className="absolute left-[52px] top-0 ml-1 hidden group-hover:flex flex-col z-50 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-xl border border-slate-200 dark:border-[#334155] rounded-xl p-2 shadow-2xl w-48 text-slate-800 dark:text-white
                            animate-fade-in pointer-events-none group-hover:pointer-events-auto"
                        >
                          <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 px-2.5 py-1 mb-1 border-b border-slate-200 dark:border-[#334155]/60 uppercase tracking-wider">
                            {item.title}
                          </div>
                          <div className="space-y-0.5">
                            {item.items.map((subItem) => {
                              const isSubActive = paginaActiva === subItem.id;
                              return (
                                <Fragment key={subItem.id}>
                                  <button
                                    onClick={() => {
                                      setPaginaActiva(subItem.id);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                                      isSubActive
                                        ? "bg-amber-500 text-slate-950 font-bold"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                  >
                                    <span className={`material-symbols-outlined text-sm ${isSubActive ? "text-slate-950" : (subItem.iconColor || "text-amber-500")}`}>{subItem.icon}</span>
                                    {subItem.label}
                                  </button>

                                  {subItem.children && subItem.children.map((child) => {
                                    const isChildActive = paginaActiva === child.id;
                                    return (
                                      <button
                                        key={child.id}
                                        onClick={() => {
                                          setPaginaActiva(child.id);
                                        }}
                                        className={`w-full text-left pl-6 pr-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                                          isChildActive
                                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                      >
                                        <span className={`material-symbols-outlined text-xs ${isChildActive ? "text-amber-600 dark:text-amber-500" : (child.iconColor || "text-amber-500")}`}>{child.icon}</span>
                                        {child.label}
                                      </button>
                                    );
                                  })}
                                </Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </nav>

          {/* macOS Footer Status Card */}
          <div className={`border-t border-slate-200/80 dark:border-[#334155]/60 p-3.5 ${!sidebarAbierto ? "lg:hidden" : ""}`}>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 p-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">{t("common.status")}</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{t("common.synced")}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
