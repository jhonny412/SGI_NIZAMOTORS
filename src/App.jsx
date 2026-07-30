import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { InventoryProvider } from "./context/InventoryContext";
import { useInventory } from "./context/useInventory";
import { useAuth } from "./context/useAuth";
import { useUI } from "./context/useUI";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { ROUTES } from "./config/routes";
import { initLogger, flushPendingLogs } from "./utils/logger";



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
  const { paginaActiva } = useUI();
  const { usuarioActivo } = useAuth();


  const renderPage = () => {
    const rol = usuarioActivo?.rol?.toLowerCase() || "vendedor";
    const routeConfig = ROUTES[paginaActiva];
    
    // Si la ruta existe y el rol está permitido, renderizar su componente.
    // De lo contrario, caer en el dashboard (o redirigir si el rol lo permite).
    if (routeConfig && routeConfig.roles.includes(rol)) {
      const Component = routeConfig.component;
      return <Component />;
    }

    // Fallback: buscar dashboard o primera ruta permitida
    const DashboardComponent = ROUTES.dashboard.component;
    return <DashboardComponent />;
  };

  if (!usuarioActivo) {
    return <Login />;
  }

  return <Layout>{renderPage()}</Layout>;
}





export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <InventoryProvider>
          <LogSyncManager />
          <AppContent />
        </InventoryProvider>
      </UIProvider>
    </AuthProvider>
  );
}

