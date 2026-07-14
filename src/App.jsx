import { useEffect } from "react";
import { InventoryProvider } from "./context/InventoryContext";
import { useInventory } from "./context/useInventory";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Proveedores from "./pages/Proveedores";
import Movimientos from "./pages/Movimientos";
import Kardex from "./pages/Kardex";
import Marcas from "./pages/Marcas";
import Creditos from "./pages/Creditos";
import Categorias from "./pages/Categorias";
import Ventas from "./pages/Ventas";
import { initLogger, flushPendingLogs, getPendingCount } from "./utils/logger";

// ──────────────────────────────────────────────────────────────
// Componente raíz: maneja la sincronización de logs pendientes
// ──────────────────────────────────────────────────────────────
function LogSyncManager() {
  useEffect(() => {
    // Al iniciar: resolver la IP del equipo y vaciar logs pendientes offline
    initLogger();

    // Cuando el navegador recupera conexión a internet: vaciar la cola
    const handleOnline = () => {
      console.log("[LogSync] Conexión restaurada. Sincronizando logs pendientes...");
      flushPendingLogs();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return null;
}

function AppContent() {
  const { paginaActiva, usuarioActivo } = useInventory();

  const renderPage = () => {
    const esVendedor = usuarioActivo?.rol?.toLowerCase() === "vendedor";
    const paginasPermitidas = esVendedor
      ? ["dashboard", "productos", "ventas", "creditos"]
      : ["dashboard", "productos", "ventas", "movimientos", "kardex", "proveedores", "marcas", "categorias", "creditos"];

    const paginaARenderizar = paginasPermitidas.includes(paginaActiva) ? paginaActiva : "dashboard";

    switch (paginaARenderizar) {
      case "dashboard":
        return <Dashboard />;
      case "productos":
        return <Productos />;
      case "ventas":
        return <Ventas />;
      case "movimientos":
        return <Movimientos />;
      case "kardex":
        return <Kardex />;
      case "proveedores":
        return <Proveedores />;
      case "marcas":
        return <Marcas />;
      case "categorias":
        return <Categorias />;
      case "creditos":
        return <Creditos />;
      default:
        return <Dashboard />;
    }
  };

  if (!usuarioActivo) {
    return <Login />;
  }

  return <Layout>{renderPage()}</Layout>;
}

export default function App() {
  return (
    <InventoryProvider>
      <LogSyncManager />
      <AppContent />
    </InventoryProvider>
  );
}
