import { ENDPOINTS } from "../config/endpoints";

const API_URL = ENDPOINTS.INVENTORY_API_URL;


// Claves de localStorage
const KEY_PENDING   = "sgi-pending-logs";   // Cola de logs pendientes de sincronizar con Sheets
const KEY_ALL_LOCAL = "sgi-local-logs";     // Copia local completa de TODOS los logs (éxitos + errores)
const KEY_IP_CACHE  = "sgi-ip-cache";       // Última IP pública conocida del equipo
const MAX_LOCAL     = 200;                  // Máximo de entradas en la copia local
const MAX_PENDING   = 500;                  // Máximo de entradas en la cola pendiente

export const LOG_LEVELS = {
  INFO: "INFO",
  WARN: "WARNING",
  ERROR: "ERROR"
};

// ─────────────────────────────────────────────────────────────
// Caché de IP en memoria (para no leer localStorage en cada log)
// ─────────────────────────────────────────────────────────────
let _cachedIp = null;
let _lastLogId = 0;

// ─────────────────────────────────────────────────────────────
// Utilidades de localStorage
// ─────────────────────────────────────────────────────────────
function leerStorage(clave) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function leerStorageString(clave) {
  try {
    return localStorage.getItem(clave) || null;
  } catch {
    return null;
  }
}

function escribirStorage(clave, datos) {
  try {
    localStorage.setItem(clave, JSON.stringify(datos));
  } catch (e) {
    console.warn(`[Logger] No se pudo escribir en localStorage (${clave}):`, e);
  }
}

// ─────────────────────────────────────────────────────────────
// Obtener IP pública del equipo con caché en localStorage
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene la IP pública del equipo consultando api.ipify.org.
 * - Si la consulta falla (sin internet), usa la última IP en caché.
 * - Guarda el resultado en módulo + localStorage para reutilización.
 * - Debe llamarse una vez al iniciar la app (initLogger).
 */
export async function resolveClientIp() {
  // Si ya está en caché de módulo, usarla directamente
  if (_cachedIp) return _cachedIp;

  // Intentar recuperar IP en caché de localStorage
  const ipGuardada = leerStorageString(KEY_IP_CACHE);

  try {
    const resp = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(5000) // 5 segundos máximo
    });
    const data = await resp.json();
    const ip = data.ip || "desconocida";

    // Guardar en caché de módulo y en localStorage
    _cachedIp = ip;
    try {
      localStorage.setItem(KEY_IP_CACHE, ip);
    } catch { /* sin storage */ }

    console.log(`[Logger] IP pública detectada: ${ip}`);
    return ip;
  } catch {
    // Sin internet: usar la última IP guardada
    if (ipGuardada) {
      _cachedIp = `${ipGuardada} [caché]`;
      console.warn(`[Logger] No se pudo obtener IP. Usando última conocida: ${ipGuardada}`);
    } else {
      _cachedIp = "desconocida";
      console.warn("[Logger] No se pudo obtener la IP y no hay caché previa.");
    }
    return _cachedIp;
  }
}

/**
 * Inicializador del logger. Llámalo una vez al arrancar la app.
 * Resuelve la IP del equipo y vacía logs pendientes si hay conexión.
 */
export async function initLogger() {
  await resolveClientIp();
  await flushPendingLogs();
}

// ─────────────────────────────────────────────────────────────
// Guardar en la copia local completa (siempre, sin importar estado)
// ─────────────────────────────────────────────────────────────
function guardarLocal(logEntry) {
  const logs = leerStorage(KEY_ALL_LOCAL);
  logs.unshift(logEntry);
  escribirStorage(KEY_ALL_LOCAL, logs.slice(0, MAX_LOCAL));
}

// ─────────────────────────────────────────────────────────────
// Agregar a la cola de pendientes (para enviar a Sheets después)
// ─────────────────────────────────────────────────────────────
function encolarPendiente(logEntry) {
  const pending = leerStorage(KEY_PENDING);
  pending.push(logEntry);
  escribirStorage(KEY_PENDING, pending.slice(-MAX_PENDING));
}

// ─────────────────────────────────────────────────────────────
// Intentar enviar UN log a MySQL
// ─────────────────────────────────────────────────────────────
async function enviarASheets(logEntry) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logEntry)
  });
  if (!response.ok) {
    throw new Error(`HTTP error writing log: ${response.status}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Vaciar la cola de pendientes — llamar cuando se recupera la red
// ─────────────────────────────────────────────────────────────
export async function flushPendingLogs() {
  const pending = leerStorage(KEY_PENDING);
  if (pending.length === 0) return;

  console.log(`[Logger] Sincronizando ${pending.length} log(s) pendiente(s) con Google Sheets...`);
  const fallidos = [];

  for (const entry of pending) {
    try {
      await enviarASheets(entry);
    } catch {
      fallidos.push(entry);
    }
  }

  escribirStorage(KEY_PENDING, fallidos);

  if (fallidos.length === 0) {
    console.log("[Logger] Cola de pendientes sincronizada exitosamente ✓");
  } else {
    console.warn(`[Logger] ${fallidos.length} log(s) siguen pendientes (sin conexión).`);
  }
}

// ─────────────────────────────────────────────────────────────
// API pública: registrar un evento de auditoría
// ─────────────────────────────────────────────────────────────
/**
 * Registra un evento de log con IP del equipo incluida.
 * - Siempre guarda en localStorage (sgi-local-logs).
 * - Intenta enviar a Google Sheets.
 * - Si falla (sin red): encola en sgi-pending-logs para reintento posterior.
 *
 * @param {Object} params
 * @param {string} params.usuario    Nombre del usuario activo
 * @param {string} params.accion     Descripción breve de la acción
 * @param {string} params.modulo     Módulo de la aplicación
 * @param {any}    [params.detalles] Detalles adicionales (string u objeto)
 * @param {string} [params.estado]   "success" | "error"
 */
export async function writeLog({ usuario = "Sistema", accion, modulo, detalles = "", estado = "success" }) {
  // Obtener IP: usar caché si ya está resuelta, si no intentar resolver
  const ip = _cachedIp || await resolveClientIp();

  let id = Date.now();
  if (id <= _lastLogId) {
    id = _lastLogId + 1;
  }
  _lastLogId = id;

  const logEntry = {
    sheet: "Logs",
    action: "create",
    id,
    fecha: new Date().toISOString(),
    usuario,
    accion,
    modulo,
    detalles: typeof detalles === "object" ? JSON.stringify(detalles) : String(detalles),
    estado,
    ip
  };

  // 1. Mostrar en consola (desarrollo)
  console.log(`[LOG][${estado.toUpperCase()}][${modulo}][IP:${ip}] ${accion}`, logEntry);

  // 2. Guardar siempre en la copia local completa
  guardarLocal(logEntry);

  // 3. Intentar enviar a Google Sheets
  if (!API_URL) return;

  try {
    await enviarASheets(logEntry);
  } catch {
    // Sin internet: encolar para sincronizar cuando regrese la red
    console.warn(`[Logger] Sin conexión. Log encolado para sincronización posterior. (${modulo} › ${accion})`);
    encolarPendiente(logEntry);
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers para lectura desde componentes (panel de auditoría)
// ─────────────────────────────────────────────────────────────

/** Retorna todos los logs guardados localmente */
export function getLocalLogs() {
  return leerStorage(KEY_ALL_LOCAL);
}

/** Retorna los logs pendientes de sincronizar con Sheets */
export function getPendingLogs() {
  return leerStorage(KEY_PENDING);
}

/** Retorna el número de logs pendientes de sincronizar */
export function getPendingCount() {
  return leerStorage(KEY_PENDING).length;
}

/** Retorna la última IP pública conocida del equipo */
export function getClientIp() {
  return _cachedIp || leerStorageString(KEY_IP_CACHE) || "desconocida";
}
