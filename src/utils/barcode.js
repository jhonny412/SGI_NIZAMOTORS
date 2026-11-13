// ─────────────────────────────────────────────────────────────
// barcode.js — Utilidades para búsquedas por QR / código de barras
//
// Soporta códigos leídos desde:
//   · Un lector USB (el código llega como texto al buscador)
//   · La cámara del dispositivo (BarcodeScannerModal)
//
// El contenido leído puede ser:
//   · El código interno del producto      → "VT-A-254E"
//   · El número OEM                       → "101211-5240"
//   · Una URL con parámetro               → "https://sgi.../p?codigo=VT-A-254E"
//   · Un JSON                             → '{"codigo":"VT-A-254E"}'
//   · Un texto con prefijo de la empresa  → "SGI:VT-A-254E"
// ─────────────────────────────────────────────────────────────

const clean = (value) => String(value ?? "").trim();

/**
 * Normaliza un código para compararlo: mayúsculas, sin acentos y con
 * espacios colapsados.
 * @param {*} value
 * @returns {string}
 */
export const normalizeCode = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ");

/**
 * Versión "suelta" del código: solo letras y números, sin guiones,
 * puntos ni espacios. Sirve para tolerar diferencias de formato entre
 * el código impreso y el escaneado.
 * @param {*} value
 * @returns {string}
 */
export const looseCode = (value) => normalizeCode(value).replace(/[^A-Z0-9]/g, "");

/**
 * Extrae todos los posibles códigos contenidos en el texto leído.
 * El primero de la lista es siempre el texto original.
 * @param {string} raw Texto leído por el escáner
 * @returns {string[]}
 */
export function extractScanCandidates(raw) {
  const text = clean(raw);
  if (!text) return [];

  const candidates = new Set([text]);

  // URL: ?codigo= | ?code= | ?sku= | ?oem= | ?q= | ?search= | última ruta
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      ["codigo", "code", "sku", "oem", "q", "search"].forEach((key) => {
        const value = url.searchParams.get(key);
        if (value && clean(value)) candidates.add(value);
      });
      const lastSegment = url.pathname.split("/").filter(Boolean).pop();
      if (lastSegment) {
        try {
          candidates.add(decodeURIComponent(lastSegment));
        } catch {
          candidates.add(lastSegment);
        }
      }
    } catch {
      // URL inválida: se conserva el texto original
    }
  }

  // JSON: {"codigo":"..."} / {"code":"..."} / {"sku":"..."}
  if (text.startsWith("{")) {
    try {
      const data = JSON.parse(text);
      if (data && typeof data === "object") {
        ["codigo", "code", "sku", "oem", "id"].forEach((key) => {
          if (data[key] !== undefined && data[key] !== null && clean(data[key])) {
            candidates.add(String(data[key]));
          }
        });
      }
    } catch {
      // No es JSON válido: se conserva el texto original
    }
  }

  // Prefijos internos: "SGI:CODIGO", "NIZA MOTORS|CODIGO", "NIZA#CODIGO"
  const prefixed = text.match(/^(?:SGI|NIZA(?:\s*MOTORS)?)\s*[:\-|#]\s*(.+)$/i);
  if (prefixed?.[1]) candidates.add(prefixed[1]);

  return [...candidates];
}

/**
 * Busca el producto correspondiente a un código escaneado.
 *
 * Estrategia:
 *   1. Coincidencia exacta por código interno, OEM o ID.
 *   2. Coincidencia exacta "suelta" (ignorando guiones/espacios) y solo
 *      si identifica a un único producto.
 *
 * @param {Array<object>} productos Lista de productos del inventario
 * @param {string} raw Texto leído por el escáner
 * @returns {object|null} Producto encontrado o null
 */
export function findProductByScan(productos, raw) {
  const lista = Array.isArray(productos) ? productos.filter(Boolean) : [];
  const candidates = extractScanCandidates(raw).map(normalizeCode).filter(Boolean);
  if (lista.length === 0 || candidates.length === 0) return null;

  // 1) Coincidencia exacta (código, OEM o ID)
  for (const candidate of candidates) {
    const exacto = lista.find(
      (p) =>
        normalizeCode(p.codigo) === candidate ||
        normalizeCode(p.oem) === candidate ||
        String(p.id) === candidate
    );
    if (exacto) return exacto;
  }

  // 2) Coincidencia exacta "suelta" (sin guiones, espacios ni símbolos)
  const looseCandidates = candidates.map(looseCode).filter((c) => c.length >= 4);
  for (const candidate of looseCandidates) {
    const coincidencias = lista.filter(
      (p) => looseCode(p.codigo) === candidate || looseCode(p.oem) === candidate
    );
    if (coincidencias.length === 1) return coincidencias[0];
  }

  return null;
}

/**
 * Texto con el que se debe rellenar un buscador tras escanear un producto.
 * Se usa el código porque es el identificador más preciso.
 * @param {object|null} producto
 * @returns {string}
 */
export const getScanSearchTerm = (producto) => {
  if (!producto) return "";
  return clean(producto.codigo) || clean(producto.oem) || String(producto.id ?? "");
};
