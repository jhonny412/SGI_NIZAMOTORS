const UPPERCASE_FIELDS = Object.freeze({
  productos: new Set(["codigo", "descripcion", "marca", "categoria", "oem"]),
  proveedores: new Set(["nombre", "contacto", "telefono", "email", "direccion"]),
  marcas: new Set(["nombre", "descripcion"]),
  categorias: new Set(["nombre", "descripcion"]),
  usuarios: new Set(["nombre"]),
  movimientos: new Set(["motivo"]),
  traslados: new Set(["tiendaVecina", "notas", "itemsResumen"]),
  ventas: new Set(["boleta", "cliente", "metodoPago", "direccion", "vendedor"]),
});

export function toUppercaseText(value) {
  return typeof value === "string" ? value.toUpperCase() : value;
}

export function normalizeUppercaseFields(collectionName, data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;

  const collectionKey = String(collectionName || "").toLowerCase();
  const uppercaseFields = UPPERCASE_FIELDS[collectionKey];
  if (!uppercaseFields) return { ...data };

  const normalized = { ...data };
  for (const field of uppercaseFields) {
    if (Object.prototype.hasOwnProperty.call(normalized, field)) {
      normalized[field] = toUppercaseText(normalized[field]);
    }
  }
  return normalized;
}
