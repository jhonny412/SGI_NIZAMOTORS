export const APP_VERSION = "1.2";

// Fecha de publicación de esta versión (AAAA-MM-DD, hora local).
// Se usa para el aviso de actualización del menú lateral.
export const APP_RELEASE_DATE = "2026-11-13";

// Días durante los que se muestra el aviso de actualización.
export const VERSION_NOTICE_DAYS = 5;

/** Convierte "AAAA-MM-DD" en una fecha local (o null si no es válida). */
export function parseFechaLocal(fecha) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha || "").trim());
  if (!match) return null;

  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const fechaLocal = new Date(anio, mes - 1, dia);

  // Descarta fechas inexistentes (por ejemplo 2026-02-31)
  if (
    fechaLocal.getFullYear() !== anio ||
    fechaLocal.getMonth() !== mes - 1 ||
    fechaLocal.getDate() !== dia
  ) {
    return null;
  }
  return fechaLocal;
}

/**
 * Indica si el aviso de actualización debe mostrarse.
 * Se muestra desde el día de publicación y durante `dias` días completos
 * (el día 1 es la propia fecha de publicación).
 */
export function debeMostrarAvisoVersion(
  ahora = new Date(),
  releaseDate = APP_RELEASE_DATE,
  dias = VERSION_NOTICE_DAYS
) {
  const inicio = parseFechaLocal(releaseDate);
  if (!inicio || !(ahora instanceof Date) || Number.isNaN(ahora.getTime())) return false;

  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + dias);

  return ahora >= inicio && ahora < fin;
}

/** Formatea "AAAA-MM-DD" como "DD/MM/AAAA" para el aviso. */
export function formatearFechaAviso(fecha = APP_RELEASE_DATE) {
  const fechaLocal = parseFechaLocal(fecha);
  if (!fechaLocal) return String(fecha || "");
  const dia = String(fechaLocal.getDate()).padStart(2, "0");
  const mes = String(fechaLocal.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${fechaLocal.getFullYear()}`;
}
