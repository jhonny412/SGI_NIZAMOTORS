import { Fragment } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation } from "react-i18next";
import logoDark from "../assets/logo.png";

export default function Sidebar() {
  const { paginaActiva, setPaginaActiva, sidebarAbierto, setSidebarAbierto, usuarioActivo } = useInventory();
  const { t } = useTranslation();

  const esVendedor = usuarioActivo?.rol?.toLowerCase() === "vendedor";

  const menuStructure = [
    {
      type: "item",
      id: "dashboard",
      label: t("menu.inicio"),
      icon: "dashboard"
    },
    {
      type: "group",
      title: t("menu.comercial"),
      icon: "payments",
      items: [
        { id: "ventas", label: t("menu.ventas"), icon: "point_of_sale" },
        { id: "creditos", label: t("menu.creditos"), icon: "credit_card" }
      ]
    },
    ...(!esVendedor ? [
      {
        type: "group",
        title: t("menu.inventario"),
        icon: "inventory_2",
        items: [
          {
            id: "productos",
            label: t("menu.productos"),
            icon: "inventory_2",
            children: [
              { id: "categorias", label: t("menu.categorias"), icon: "category" },
              { id: "marcas", label: t("menu.marcas"), icon: "sell" }
            ]
          },
          { id: "movimientos", label: t("menu.movimientos"), icon: "history" },
          { id: "kardex", label: t("menu.kardex"), icon: "timeline" }
        ]
      },
      {
        type: "group",
        title: t("menu.compras"),
        icon: "local_shipping",
        items: [
          { id: "proveedores", label: t("menu.proveedores"), icon: "local_shipping" }
        ]
      }
    ] : [
      {
        type: "group",
        title: t("menu.inventario"),
        icon: "inventory_2",
        items: [
          {
            id: "productos",
            label: t("menu.productos"),
            icon: "inventory_2"
          }
        ]
      }
    ])
  ];

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
          bg-[#131b2e] border-[#334155] shadow-2xl shadow-slate-950/50
          ${sidebarAbierto ? "w-64 overflow-hidden" : "w-0 lg:w-[72px] overflow-visible"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex flex-col border-b px-4 py-3 border-[#334155]/60 bg-slate-950/20">
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex-1"></div>
              <button
                onClick={() => setSidebarAbierto(!sidebarAbierto)}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors lg:inline-flex
                  text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label={t("common.toggle_menu_width")}
              >
                <span className="material-symbols-outlined text-lg">
                  {sidebarAbierto ? "chevron_left" : "chevron_right"}
                </span>
              </button>
            </div>
            <div className={`flex flex-col items-center gap-1 ${!sidebarAbierto ? "lg:hidden" : ""}`}>
              <div className="flex flex-col items-center w-full px-2 py-4 relative">
                {/* Accent Background Glow */}
                <div className="absolute inset-x-0 top-0 h-24 bg-radial-gradient from-amber-500/10 to-transparent blur-xl opacity-80 pointer-events-none" />
                
                <div className="flex w-full items-center justify-center overflow-hidden py-1 relative z-10">
                  <img 
                    src={logoDark} 
                    alt="NIZA MOTORS" 
                    className="w-full h-auto max-h-16 object-contain transition-transform duration-500 hover:scale-105 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]" 
                  />
                </div>
                <h2 className="mt-3 text-[14px] font-bold text-center text-slate-100 tracking-tight relative z-10 uppercase">
                  Niza Motors
                </h2>
                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-center text-slate-400 relative z-10">
                  {t("common.system_name")}
                </p>
              </div>
            </div>
          </div>

          <nav className={`flex-1 space-y-1.5 px-3 py-6 ${sidebarAbierto ? "overflow-y-auto" : "overflow-visible"}`}>
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
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-300 ${
                        isActive
                          ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15 font-bold scale-[1.01]"
                          : "text-slate-400 hover:bg-slate-800/40 hover:text-white hover:translate-x-1"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/4 h-1/2 w-1.5 rounded-r-full bg-slate-950 shadow-[0_0_4px_black]" />
                      )}
                      <span className="material-symbols-outlined shrink-0 text-xl">{item.icon}</span>
                      <span className="whitespace-nowrap text-sm font-semibold tracking-wide">
                        {item.label}
                      </span>
                    </button>
                  );
                }

                // Render group expanded state
                return (
                  <div key={item.title} className="space-y-1 pt-2 first:pt-0">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 text-slate-300 font-bold text-sm tracking-wide">
                      <span className="material-symbols-outlined shrink-0 text-xl opacity-80">{item.icon}</span>
                      <span className="whitespace-nowrap">{item.title}</span>
                    </div>

                    <div className="space-y-0.5">
                      {item.items.map((subItem) => {
                        const isSubActive = paginaActiva === subItem.id;
                        return (
                          <Fragment key={subItem.id}>
                            <button
                              onClick={() => {
                                setPaginaActiva(subItem.id);
                                if (window.innerWidth < 1024) setSidebarAbierto(false);
                              }}
                              className={`group relative flex w-full items-center gap-2 rounded-xl py-2 pl-6 pr-3 text-left transition-all duration-300 ${
                                isSubActive
                                  ? "bg-amber-500/10 text-amber-400 font-bold border-l-2 border-amber-500 pl-[22px]"
                                  : "text-slate-400 hover:bg-slate-800/30 hover:text-white hover:translate-x-1"
                              }`}
                            >
                              <span className={`material-symbols-outlined shrink-0 text-lg ${isSubActive ? "text-amber-500" : "text-slate-500 group-hover:text-slate-300"}`}>
                                {subItem.icon || "arrow_right"}
                              </span>
                              <span className="whitespace-nowrap text-sm font-semibold tracking-wide">
                                {subItem.label}
                              </span>
                            </button>

                            {/* Children */}
                            {subItem.children && (
                              <div className="space-y-0.5 pl-4">
                                {subItem.children.map((child) => {
                                  const isChildActive = paginaActiva === child.id;
                                  return (
                                    <button
                                      key={child.id}
                                      onClick={() => {
                                        setPaginaActiva(child.id);
                                        if (window.innerWidth < 1024) setSidebarAbierto(false);
                                      }}
                                      className={`group relative flex w-full items-center gap-2 rounded-xl py-1.5 pl-6 pr-3 text-left transition-all duration-300 ${
                                        isChildActive
                                          ? "bg-amber-500/5 text-amber-400 font-bold border-l-2 border-amber-500 pl-[22px]"
                                          : "text-slate-500 hover:bg-slate-800/20 hover:text-white hover:translate-x-1"
                                      }`}
                                    >
                                      <span className={`material-symbols-outlined shrink-0 text-base ${isChildActive ? "text-amber-500" : "text-slate-600 group-hover:text-slate-400"}`}>
                                        {child.icon || "arrow_right"}
                                      </span>
                                      <span className="whitespace-nowrap text-xs font-medium tracking-wide">
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
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all duration-300 relative ${
                          paginaActiva === item.id
                            ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-105"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                        title={item.label}
                      >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        {paginaActiva === item.id && (
                          <span className="absolute left-1 top-1/4 h-1/2 w-1 rounded-r-full bg-slate-950 shadow-[0_0_4px_black]" />
                        )}
                      </button>
                    ) : (
                      <div className="relative overflow-visible">
                        <button
                          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all duration-300 relative ${
                            isGroupActive(item)
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <span className="material-symbols-outlined">{item.icon}</span>
                          {isGroupActive(item) && (
                            <span className="absolute left-1 top-1/4 h-1/2 w-1 rounded-r-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          )}
                        </button>

                        {/* Floating Dropdown */}
                        <div 
                          className="absolute left-[54px] top-0 ml-1 hidden group-hover:flex flex-col z-50 bg-[#131b2e] border border-[#334155] rounded-xl p-2.5 shadow-2xl w-48 text-white
                            animate-fade-in pointer-events-none group-hover:pointer-events-auto"
                        >
                          <div className="text-[11px] font-bold text-slate-400 px-2.5 py-1 mb-1.5 border-b border-[#334155]/60 uppercase tracking-wider">
                            {item.title}
                          </div>
                          <div className="space-y-1">
                            {item.items.map((subItem) => {
                              const isSubActive = paginaActiva === subItem.id;
                              return (
                                <Fragment key={subItem.id}>
                                  <button
                                    onClick={() => {
                                      setPaginaActiva(subItem.id);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                      isSubActive
                                        ? "bg-amber-500 text-slate-950 font-bold"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                  >
                                    <span className={`material-symbols-outlined text-sm ${isSubActive ? "text-slate-950" : "text-slate-500"}`}>{subItem.icon}</span>
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
                                        className={`w-full text-left pl-6 pr-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                                          isChildActive
                                            ? "bg-amber-500/20 text-amber-400 font-bold"
                                            : "text-slate-450 hover:bg-slate-800 hover:text-white"
                                        }`}
                                      >
                                        <span className={`material-symbols-outlined text-xs ${isChildActive ? "text-amber-500" : "text-slate-650"}`}>{child.icon}</span>
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

          <div className={`border-t border-[#334155]/60 p-4 ${!sidebarAbierto ? "lg:hidden" : ""}`}>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">{t("common.status")}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 led-glow-green animate-pulse" />
                <span className="text-sm font-medium text-slate-300">{t("common.synced")}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
