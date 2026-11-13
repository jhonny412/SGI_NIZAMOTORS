import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { ENDPOINTS } from "../config/endpoints";
import { APP_VERSION } from "../config/app";
import { writeLog } from "../utils/logger";
import { fetchSheet } from "../services/api";
import Swal from "sweetalert2";

const CONFIG_STORAGE_KEY = "sgi-app-config";

// Datos fiscales reales con los que la empresa figura en los comprobantes
// emitidos (ver utils/boletaPdf.js y components/VentaDetalleModal.jsx).
export const EMPRESA_NOMBRE_REAL = "NIZA MOTORS PERU S.A.C.";
export const EMPRESA_RUC_REAL = "20603671717";
export const DIRECCION_FISCAL_REAL =
  "CAL.LOS TALADROS NRO. 257 URB. NARANJAL INDUSTRIAL LIMA - LIMA - INDEPENDENCIA";

// Valores de relleno que usaba el formulario antes de cargar los datos
// reales; se reemplazan al leer configuraciones ya guardadas.
const DIRECCIONES_DE_RELLENO = new Set([
  "Av. Principal 123 - Chiclayo, Perú",
  "Av. Principal 123, Chiclayo, Perú",
  "Av. Principal 123",
]);
const NOMBRES_DE_RELLENO = new Set(["NIZA MOTORS S.A.C."]);
const RUCS_DE_RELLENO = new Set(["20609876543"]);

export const DEFAULT_CONFIG = {
  // Parámetros de Empresa
  empresaNombre: EMPRESA_NOMBRE_REAL,
  empresaRuc: EMPRESA_RUC_REAL,
  empresaDireccion: DIRECCION_FISCAL_REAL,
  empresaTelefono: "+51 987 654 321",
  empresaEmail: "ventas@nizamotors.pe",
  monedaSimbolo: "S/.",
  tasaIgv: 18,

  // Parámetros de Inventario y Ventas
  stockMinimoAlerta: 5,
  prefijoBoleta: "B001",
  prefijoFactura: "F001",
  permitirVentaSinStock: false,
  bloquearPrecioMenorCosto: true,
  autoMayusculas: true,

  // Parámetros de Seguridad y Sesión
  pinMinimoDigitos: 4,
  tiempoSesionMinutos: 60,
  auditoriaDetallada: true,
  notificacionesSonoras: true,
};

/**
 * Combina la configuración guardada con los valores por defecto y completa los
 * datos fiscales cuando están vacíos o conservan un valor de relleno antiguo.
 */
export function normalizarConfig(saved) {
  const normalizada = { ...DEFAULT_CONFIG, ...(saved || {}) };

  const nombre = String(normalizada.empresaNombre ?? "").trim();
  if (!nombre || NOMBRES_DE_RELLENO.has(nombre)) {
    normalizada.empresaNombre = EMPRESA_NOMBRE_REAL;
  }

  const ruc = String(normalizada.empresaRuc ?? "").trim();
  if (!ruc || RUCS_DE_RELLENO.has(ruc)) {
    normalizada.empresaRuc = EMPRESA_RUC_REAL;
  }

  const direccion = String(normalizada.empresaDireccion ?? "").trim();
  if (!direccion || DIRECCIONES_DE_RELLENO.has(direccion)) {
    normalizada.empresaDireccion = DIRECCION_FISCAL_REAL;
  }

  return normalizada;
}

export default function Configuracion() {
  const { usuarioActivo } = useAuth();

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      return normalizarConfig(saved ? JSON.parse(saved) : null);
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  });

  // Persiste la corrección de datos fiscales en configuraciones guardadas con
  // valores de relleno, para que el formulario quede completo también después.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);
      const normalizada = normalizarConfig(saved);

      const camposFiscales = ["empresaNombre", "empresaRuc", "empresaDireccion"];
      const requiereCorreccion = camposFiscales.some(
        (campo) => normalizada[campo] !== saved[campo]
      );

      if (requiereCorreccion) {
        localStorage.setItem(
          CONFIG_STORAGE_KEY,
          JSON.stringify({ ...saved, ...normalizada })
        );
      }
    } catch {
      // Sin acceso a localStorage se conserva la configuración en memoria.
    }
    // Solo se ejecuta al entrar a la página.
  }, []);

  const [tabActiva, setTabActiva] = useState("general");
  const [guardando, setGuardando] = useState(false);
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState({
    probado: false,
    ok: true,
    latenciaMs: null,
    mensaje: "Conectado a la Base de Datos (MySQL / Aiven)"
  });

  const [espacioUsado, setEspacioUsado] = useState("0 KB");

  // Calcular tamaño aproximado del localStorage
  useEffect(() => {
    try {
      let total = 0;
      for (const x in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, x)) {
          total += (localStorage[x].length + x.length) * 2;
        }
      }
      setEspacioUsado(`${(total / 1024).toFixed(1)} KB`);
    } catch {
      setEspacioUsado("N/D");
    }
  }, []);

  const handleChange = (campo, valor) => {
    setConfig((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleGuardar = async (e) => {
    if (e) e.preventDefault();
    setGuardando(true);
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

      await writeLog({
        usuario: usuarioActivo?.nombre || "SuperAdmin",
        accion: "Actualizar Configuración",
        modulo: "Seguridad",
        detalles: "Parámetros globales del sistema actualizados",
        estado: "success"
      });

      Swal.fire({
        icon: "success",
        title: "Configuración guardada",
        text: "Los parámetros del sistema se han actualizado correctamente.",
        timer: 2000,
        showConfirmButton: false,
        confirmButtonColor: "#f59e0b"
      });
    } catch (err) {
      console.error("Error al guardar configuración:", err);
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: `No se pudo persistir la configuración: ${err.message}`
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleRestablecer = async () => {
    const result = await Swal.fire({
      title: "¿Restablecer valores predeterminados?",
      text: "Esta acción restaurará todos los parámetros a su configuración de fábrica.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, restablecer",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      setConfig(DEFAULT_CONFIG);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));

      await writeLog({
        usuario: usuarioActivo?.nombre || "SuperAdmin",
        accion: "Restablecer Configuración",
        modulo: "Seguridad",
        detalles: "Configuración restablecida a valores por defecto",
        estado: "warning"
      });

      Swal.fire({
        icon: "success",
        title: "Valores restablecidos",
        text: "La configuración ha vuelto a sus valores por defecto.",
        timer: 1800,
        showConfirmButton: false
      });
    }
  };

  const handleProbarConexion = async () => {
    setProbandoConexion(true);
    const start = performance.now();
    try {
      await fetchSheet("Productos");
      const duration = Math.round(performance.now() - start);
      setEstadoConexion({
        probado: true,
        ok: true,
        latenciaMs: duration,
        mensaje: `Conexión exitosa con la Base de Datos (${duration} ms)`
      });
      Swal.fire({
        icon: "success",
        title: "Conexión Exitosa",
        text: `Latencia de respuesta: ${duration} ms con la Base de Datos MySQL.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      setEstadoConexion({
        probado: true,
        ok: false,
        latenciaMs: duration,
        mensaje: `Fallo de conexión: ${error.message}`
      });
      Swal.fire({
        icon: "error",
        title: "Fallo de Conexión",
        text: `No se pudo contactar el endpoint: ${error.message}`
      });
    } finally {
      setProbandoConexion(false);
    }
  };

  const handleLimpiarCache = async () => {
    const result = await Swal.fire({
      title: "¿Limpiar caché local?",
      text: "Se eliminarán datos temporales de inventario y logs almacenados en este navegador. La sesión activa no se cerrará.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, limpiar caché",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      // Preservar la sesión activa y la configuración
      const user = sessionStorage.getItem("sgi-usuario-activo");
      const token = sessionStorage.getItem("sgi-auth-token");
      const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);

      // Limpiar claves temporales
      localStorage.removeItem("sgi-offline-logs");
      localStorage.removeItem("sgi-report-cache");

      if (user) sessionStorage.setItem("sgi-usuario-activo", user);
      if (token) sessionStorage.setItem("sgi-auth-token", token);
      if (savedConfig) localStorage.setItem(CONFIG_STORAGE_KEY, savedConfig);

      await writeLog({
        usuario: usuarioActivo?.nombre || "SuperAdmin",
        accion: "Limpieza de Caché",
        modulo: "Seguridad",
        detalles: "Caché de navegador limpiada manualmente",
        estado: "success"
      });

      Swal.fire({
        icon: "success",
        title: "Caché liberada",
        text: "Los datos locales se han limpiado correctamente.",
        timer: 1800,
        showConfirmButton: false
      });
    }
  };

  const handleExportarBackup = () => {
    const backupData = {
      app: "SGI_NIZAMOTORS",
      version: APP_VERSION,
      fechaExportacion: new Date().toISOString(),
      usuario: usuarioActivo?.nombre,
      configuracion: config,
      endpoints: {
        inventory: ENDPOINTS.INVENTORY_API_URL,
        logger: ENDPOINTS.LOGGER_API_URL
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sgi-nizamotors-config-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Swal.fire({
      icon: "success",
      title: "Respaldo generado",
      text: "El archivo de configuración JSON ha sido descargado.",
      timer: 2000,
      showConfirmButton: false
    });
  };

  const tabs = [
    { id: "general", label: "Empresa & Facturación", icon: "storefront", color: "text-amber-500" },
    { id: "inventario", label: "Inventario & Ventas", icon: "inventory_2", color: "text-emerald-500" },
    { id: "seguridad", label: "Seguridad & Sesiones", icon: "shield", color: "text-rose-500" },
    { id: "api", label: "Conexión & Base de Datos", icon: "cloud_sync", color: "text-sky-500" },
    { id: "respaldo", label: "Mantenimiento & Sistema", icon: "settings_suggest", color: "text-purple-500" }
  ];

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#334155]/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
              <span className="material-symbols-outlined text-xs">verified_user</span>
              PERFIL SUPER ADMIN
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs">•</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
              Control Global
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Configuración del Sistema
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm mt-1">
            Ajusta los parámetros operativos, conexiones de base de datos, políticas de seguridad y respaldos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={handleRestablecer}
            className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5"
            title="Restablecer valores por defecto"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            <span className="hidden sm:inline">Restablecer</span>
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="btn-primary text-xs sm:text-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">
              {guardando ? "sync" : "save"}
            </span>
            <span>{guardando ? "Guardando..." : "Guardar Cambios"}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0">
            <span className="material-symbols-outlined text-xl">speed</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Estado del Sistema</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">100% Operativo</p>
            </div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-500 shrink-0">
            <span className="material-symbols-outlined text-xl">database</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Base de Datos MySQL</p>
            <p className="text-sm font-black text-sky-600 dark:text-sky-400 truncate">
              {estadoConexion.probado ? (estadoConexion.ok ? `${estadoConexion.latenciaMs} ms` : "Error") : "Sincronizado"}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-500 shrink-0">
            <span className="material-symbols-outlined text-xl">lock</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Seguridad de Acceso</p>
            <p className="text-sm font-black text-rose-600 dark:text-rose-400 truncate">PIN Hash + JWT</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-500 shrink-0">
            <span className="material-symbols-outlined text-xl">storage</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Caché Local Usada</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{espacioUsado}</p>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-950/30 p-2 md:p-3 space-y-1 shrink-0">
          <p className="px-3 py-2 text-[9.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Módulos de Configuración
          </p>
          {tabs.map((tab) => {
            const isSelected = tabActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className={`material-symbols-outlined text-lg ${isSelected ? "text-slate-950" : tab.color}`}>
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 p-5 sm:p-7 bg-white dark:bg-[#131b2e]">
          {/* TAB 1: General & Empresa */}
          {tabActiva === "general" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">storefront</span>
                  Información de la Empresa y Facturación
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Estos datos se reflejan en los encabezados de boletas, facturas y reportes PDF emitidos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Razón Social / Nombre Comercial
                  </label>
                  <input
                    type="text"
                    value={config.empresaNombre}
                    onChange={(e) => handleChange("empresaNombre", e.target.value)}
                    className="input-field"
                    placeholder="Ej. NIZA MOTORS PERU S.A.C."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Número de R.U.C.
                  </label>
                  <input
                    type="text"
                    value={config.empresaRuc}
                    onChange={(e) => handleChange("empresaRuc", e.target.value)}
                    className="input-field font-mono"
                    placeholder="20603671717"
                    maxLength={11}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Dirección Fiscal / Establecimiento
                  </label>
                  <input
                    type="text"
                    value={config.empresaDireccion}
                    onChange={(e) => handleChange("empresaDireccion", e.target.value)}
                    className="input-field"
                    placeholder="CAL.LOS TALADROS NRO. 257 - Independencia, Lima"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Teléfono / WhatsApp de Contacto
                  </label>
                  <input
                    type="text"
                    value={config.empresaTelefono}
                    onChange={(e) => handleChange("empresaTelefono", e.target.value)}
                    className="input-field"
                    placeholder="+51 987 654 321"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Correo Electrónico Institucional
                  </label>
                  <input
                    type="email"
                    value={config.empresaEmail}
                    onChange={(e) => handleChange("empresaEmail", e.target.value)}
                    className="input-field"
                    placeholder="contacto@nizamotors.pe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Símbolo de Moneda Principal
                  </label>
                  <select
                    value={config.monedaSimbolo}
                    onChange={(e) => handleChange("monedaSimbolo", e.target.value)}
                    className="select-field"
                  >
                    <option value="S/.">Soles Peruanos (S/.)</option>
                    <option value="$">Dólares Americanos ($)</option>
                    <option value="€">Euros (€)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Tasa de I.G.V. (%)
                  </label>
                  <input
                    type="number"
                    value={config.tasaIgv}
                    onChange={(e) => handleChange("tasaIgv", Number(e.target.value))}
                    className="input-field"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Inventario & Ventas */}
          {tabActiva === "inventario" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">inventory_2</span>
                  Reglas de Inventario y Comercialización
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Políticas para la emisión de comprobantes, umbrales de alerta y validaciones de caja.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Umbral de Stock Bajo (Alerta Global)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.stockMinimoAlerta}
                      onChange={(e) => handleChange("stockMinimoAlerta", Number(e.target.value))}
                      className="input-field"
                      min={1}
                      max={100}
                    />
                    <span className="text-xs font-bold text-slate-400">unidades</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Productos con existencia menor o igual a este valor se marcarán en amarillo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Serie / Prefijo de Boletas
                  </label>
                  <input
                    type="text"
                    value={config.prefijoBoleta}
                    onChange={(e) => handleChange("prefijoBoleta", e.target.value.toUpperCase())}
                    className="input-field uppercase font-mono"
                    maxLength={5}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Serie / Prefijo de Facturas
                  </label>
                  <input
                    type="text"
                    value={config.prefijoFactura}
                    onChange={(e) => handleChange("prefijoFactura", e.target.value.toUpperCase())}
                    className="input-field uppercase font-mono"
                    maxLength={5}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-4 border-t border-slate-200 dark:border-[#334155] space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-950/30">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Permitir ventas con stock insuficiente (en negativo)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Si se desactiva, el sistema impedirá procesar ventas cuando no haya suficiente stock disponible.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.permitirVentaSinStock}
                    onClick={() => handleChange("permitirVentaSinStock", !config.permitirVentaSinStock)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.permitirVentaSinStock ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.permitirVentaSinStock ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-950/30">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Bloquear precio de venta menor al costo de compra
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Evita que un vendedor liquide un producto por debajo de su costo de adquisición.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.bloquearPrecioMenorCosto}
                    onClick={() => handleChange("bloquearPrecioMenorCosto", !config.bloquearPrecioMenorCosto)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.bloquearPrecioMenorCosto ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.bloquearPrecioMenorCosto ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-950/30">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Convertir descripciones y códigos a MAYÚSCULAS automáticamente
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Mantiene consistencia en el catálogo y facilita la búsqueda de repuestos y marcas.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.autoMayusculas}
                    onClick={() => handleChange("autoMayusculas", !config.autoMayusculas)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.autoMayusculas ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.autoMayusculas ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Seguridad & Sesiones */}
          {tabActiva === "seguridad" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-500">shield</span>
                  Políticas de Seguridad y Control de Sesión
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configuración estricta de autenticación mediante PIN, tokens y auditoría de eventos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Longitud Mínima del PIN de Acceso
                  </label>
                  <select
                    value={config.pinMinimoDigitos}
                    onChange={(e) => handleChange("pinMinimoDigitos", Number(e.target.value))}
                    className="select-field"
                  >
                    <option value={4}>4 dígitos (Recomendado)</option>
                    <option value={6}>6 dígitos (Alta seguridad)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Expiración de Sesión Inactiva
                  </label>
                  <select
                    value={config.tiempoSesionMinutos}
                    onChange={(e) => handleChange("tiempoSesionMinutos", Number(e.target.value))}
                    className="select-field"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora (Estándar)</option>
                    <option value={240}>4 horas</option>
                    <option value={480}>8 horas (Jornada completa)</option>
                  </select>
                </div>
              </div>

              {/* Toggles de Seguridad */}
              <div className="pt-4 border-t border-slate-200 dark:border-[#334155] space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-950/30">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Auditoría estricta de acciones del sistema
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Registra en la hoja de Auditoría cada inicio de sesión, creación de venta, modificación y eliminación con dirección IP.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.auditoriaDetallada}
                    onClick={() => handleChange("auditoriaDetallada", !config.auditoriaDetallada)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.auditoriaDetallada ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.auditoriaDetallada ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-950/30">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Efectos sonoros en operaciones críticas
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Feedback sonoro al completar una venta o detectar un error de validación.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.notificacionesSonoras}
                    onClick={() => handleChange("notificacionesSonoras", !config.notificacionesSonoras)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.notificacionesSonoras ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.notificacionesSonoras ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Conexión & Base de Datos */}
          {tabActiva === "api" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-500">cloud_sync</span>
                  Conexión con Base de Datos MySQL (Aiven Cloud)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supervisión del canal de comunicación con el API backend y la base de datos MySQL en la nube.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Endpoint Principal de Inventario
                    </p>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-xs font-mono break-all text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0b1326] p-2.5 rounded-lg border border-slate-200 dark:border-[#334155]/60">
                    {ENDPOINTS.INVENTORY_API_URL}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Endpoint de Auditoría y Logs
                    </p>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-xs font-mono break-all text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0b1326] p-2.5 rounded-lg border border-slate-200 dark:border-[#334155]/60">
                    {ENDPOINTS.LOGGER_API_URL}
                  </p>
                </div>
              </div>

              {/* Botones de acción técnica */}
              <div className="pt-4 border-t border-slate-200 dark:border-[#334155] flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleProbarConexion}
                  disabled={probandoConexion}
                  className="btn-primary text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">
                    {probandoConexion ? "sync" : "network_ping"}
                  </span>
                  <span>{probandoConexion ? "Probando..." : "Probar Latencia de Conexión"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLimpiarCache}
                  className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5 hover:text-red-400"
                >
                  <span className="material-symbols-outlined text-base">cached</span>
                  <span>Limpiar Caché Local</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Mantenimiento & Sistema */}
          {tabActiva === "respaldo" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500">settings_suggest</span>
                  Mantenimiento y Copias de Seguridad
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Descarga respaldos de configuración y consulta la información técnica del software.
                </p>
              </div>

              {/* Exportación de Backup */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#334155] bg-gradient-to-r from-amber-500/5 via-transparent to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">download</span>
                    Exportar Copia de Seguridad de Configuración
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Genera un archivo JSON con todos los parámetros actuales de la empresa, seguridad, endpoints y preferencias para restaurarlos en caso de ser necesario.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportarBackup}
                  className="btn-primary text-xs sm:text-sm shrink-0 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">file_download</span>
                  <span>Exportar JSON</span>
                </button>
              </div>

              {/* Diagnóstico técnico */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ficha Técnica de la Plataforma
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-slate-950/30 flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Versión del Sistema:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-500">v{APP_VERSION}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-slate-950/30 flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Entorno de Ejecución:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {import.meta.env.MODE || "production"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-slate-950/30 flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Navegador Activo:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate ml-2">
                      {navigator.userAgent.slice(0, 30)}...
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-slate-950/30 flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Usuario Super Admin:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {usuarioActivo?.nombre || "Super Administrador"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
