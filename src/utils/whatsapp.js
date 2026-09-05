// ─────────────────────────────────────────────────────────────
// whatsapp.js — Helpers para enviar mensajes por WhatsApp (Click to Chat)
// ─────────────────────────────────────────────────────────────

/**
 * Normaliza un número de teléfono a formato internacional sin "+".
 * Acepta: "+51 999 999 999", "51 999999999", "999 999 999", "0051...", etc.
 * @param {string|number} raw
 * @returns {string} número normalizado (ej. "51999999999") o cadena vacía si no es válido
 */
export function normalizarNumeroWhatsApp(raw) {
  let n = String(raw ?? "").replace(/[^\d]/g, "");

  // Quitar prefijos de marcado internacional
  if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("0")) n = n.slice(1); // celular "0999..." → "999..."

  return n;
}

/**
 * Valida y normaliza un número de WhatsApp (asume Perú +51 por defecto).
 * @param {string|number} raw
 * @returns {string|null} número internacional "51XXXXXXXXX" o null si es inválido
 */
export function validarNumeroWhatsApp(raw) {
  const n = normalizarNumeroWhatsApp(raw);

  // Ya viene con código de país 51 + 9 dígitos
  if (/^51\d{9}$/.test(n)) return n;

  // Solo 9 dígitos locales (celular peruano) → anteponer 51
  if (/^9\d{8}$/.test(n)) return "51" + n;

  return null;
}

/**
 * Abre WhatsApp Web/Chat en una nueva pestaña con un mensaje predefinido.
 * @param {string} numeroInternacional - número en formato "51XXXXXXXXX"
 * @param {string} mensaje
 */
export function abrirWhatsApp(numeroInternacional, mensaje) {
  const url = `https://wa.me/${numeroInternacional}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
