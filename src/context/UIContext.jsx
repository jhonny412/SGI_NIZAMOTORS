import { createContext, useState, useEffect } from "react";

export const UIContext = createContext();

export function UIProvider({ children }) {
  const [paginaActiva, setPaginaActiva] = useState("dashboard");
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [tema, setTema] = useState(() => {
    const hasInitialized = localStorage.getItem("sgi-theme-v2");
    if (!hasInitialized) {
      localStorage.setItem("sgi-theme-v2", "true");
      localStorage.setItem("sgi-theme", "light");
      return "light";
    }
    return localStorage.getItem("sgi-theme") || "light";
  });

  useEffect(() => {
    const isDark = tema === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("sgi-theme", tema);
  }, [tema]);

  const toggleTema = () => setTema(t => t === "dark" ? "light" : "dark");

  return (
    <UIContext.Provider value={{ paginaActiva, setPaginaActiva, sidebarAbierto, setSidebarAbierto, tema, toggleTema }}>
      {children}
    </UIContext.Provider>
  );
}
