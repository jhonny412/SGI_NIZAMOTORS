import { createContext, useState, useEffect, useRef } from "react";

export const UIContext = createContext();

// En móvil/tablet el panel lateral es un drawer: debe iniciar cerrado para no
// tapar el contenido. En escritorio (>= 1024px) inicia abierto como siempre.
const esEscritorio = () => (typeof window === "undefined" ? true : window.innerWidth >= 1024);

export function UIProvider({ children }) {
  const [paginaActiva, setPaginaActiva] = useState("dashboard");
  const [sidebarAbierto, setSidebarAbierto] = useState(esEscritorio);
  const eraEscritorio = useRef(esEscritorio());
  const [tema, setTema] = useState(() => {
    const hasInitialized = localStorage.getItem("sgi-theme-v2");
    if (!hasInitialized) {
      localStorage.setItem("sgi-theme-v2", "true");
      localStorage.setItem("sgi-theme", "light");
      return "light";
    }
    return localStorage.getItem("sgi-theme") || "light";
  });

  // Al pasar de escritorio a móvil/tablet se cierra el drawer automáticamente
  useEffect(() => {
    const alRedimensionar = () => {
      const ahora = esEscritorio();
      if (eraEscritorio.current && !ahora) setSidebarAbierto(false);
      eraEscritorio.current = ahora;
    };
    window.addEventListener("resize", alRedimensionar);
    return () => window.removeEventListener("resize", alRedimensionar);
  }, []);

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
