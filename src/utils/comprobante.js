// ─────────────────────────────────────────────────────────────
// comprobante.js — Utilidades compartidas para comprobantes (boletas)
// Incluye conversión de montos a letras y parseo de datos de cliente.
// Se reutiliza tanto en el modal de detalle como en el PDF del ticket.
// ─────────────────────────────────────────────────────────────

/** Convierte un monto numérico a su representación en letras (soles). */
export function numeroALetras(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "";
  const num = Math.floor(amount);
  const cents = Math.round((amount - num) * 100);
  const centsStr = String(cents).padStart(2, "0") + "/100 SOLES.";

  if (num === 0) return `SON: CERO Y ${centsStr}`;

  const Unidades = (n) => {
    switch (n) {
      case 1: return "UN";
      case 2: return "DOS";
      case 3: return "TRES";
      case 4: return "CUATRO";
      case 5: return "CINCO";
      case 6: return "SEIS";
      case 7: return "SIETE";
      case 8: return "OCHO";
      case 9: return "NUEVE";
      default: return "";
    }
  };

  const Decenas = (n) => {
    const decena = Math.floor(n / 10);
    const unidad = n % 10;
    switch (decena) {
      case 1:
        switch (unidad) {
          case 0: return "DIEZ";
          case 1: return "ONCE";
          case 2: return "DOCE";
          case 3: return "TRECE";
          case 4: return "CATORCE";
          case 5: return "QUINCE";
          default: return "DIECI" + Unidades(unidad);
        }
      case 2:
        if (unidad === 0) return "VEINTE";
        return "VEINTI" + Unidades(unidad);
      case 3: return "TREINTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 4: return "CUARENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 5: return "CINCUENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 6: return "SESENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 7: return "SETENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 8: return "OCHENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      case 9: return "NOVENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
      default: return Unidades(unidad);
    }
  };

  const Centenas = (n) => {
    const centena = Math.floor(n / 100);
    const decena = n % 100;
    switch (centena) {
      case 1:
        if (decena > 0) return "CIENTO " + Decenas(decena);
        return "CIEN";
      case 2: return decena > 0 ? "DOSCIENTOS " + Decenas(decena) : "DOSCIENTOS";
      case 3: return decena > 0 ? "TRESCIENTOS " + Decenas(decena) : "TRESCIENTOS";
      case 4: return decena > 0 ? "CUATROCIENTOS " + Decenas(decena) : "CUATROCIENTOS";
      case 5: return decena > 0 ? "QUINIENTOS " + Decenas(decena) : "QUINIENTOS";
      case 6: return decena > 0 ? "SEISCIENTOS " + Decenas(decena) : "SEISCIENTOS";
      case 7: return decena > 0 ? "SETECIENTOS " + Decenas(decena) : "SETECIENTOS";
      case 8: return decena > 0 ? "OCHOCIENTOS " + Decenas(decena) : "OCHOCIENTOS";
      case 9: return decena > 0 ? "NOVECIENTOS " + Decenas(decena) : "NOVECIENTOS";
      default: return Decenas(decena);
    }
  };

  const Miles = (n) => {
    const divisor = 1000;
    const cientos = Math.floor(n / divisor);
    const resto = n % divisor;
    let strMiles = "";
    if (cientos === 1) strMiles = "UN MIL";
    else if (cientos > 1) strMiles = Centenas(cientos) + " MIL";

    const strCentenas = Centenas(resto);
    if (strMiles === "") return strCentenas;
    return (strMiles + " " + strCentenas).trim();
  };

  const Millones = (n) => {
    const divisor = 1000000;
    const cientos = Math.floor(n / divisor);
    const resto = n % divisor;
    let strMillones = "";
    if (cientos === 1) strMillones = "UN MILLON";
    else if (cientos > 1) strMillones = Centenas(cientos) + " MILLONES";

    const strMiles = Miles(resto);
    if (strMillones === "") return strMiles;
    return (strMillones + " " + strMiles).trim();
  };

  const texto = Millones(num).trim();
  return `SON: ${texto} Y ${centsStr}`;
}

/**
 * Parsea el string de cliente de una venta al formato { nombre, docTipo, docNro }.
 * Formatos soportados:
 *   - "NOMBRE (DNI: 12345678)" / "(RUC: ...)" / "(OTROS: ...)"
 *   - Legacy "NOMBRE (12345678)" (infiere DNI/RUC por longitud)
 */
export function parseClienteInfo(clienteStr) {
  if (!clienteStr) {
    return { nombre: "CLIENTE VARIOS", docTipo: "OTROS", docNro: "-" };
  }

  const regex = /^(.*?)\s*\((DNI|RUC|OTROS):\s*(\d+)\)$/;
  const match = clienteStr.match(regex);
  if (match) {
    return {
      nombre: match[1].trim(),
      docTipo: match[2],
      docNro: match[3]
    };
  }

  const regexLegacy = /^(.*?)\s*\((\d+)\)$/;
  const matchLegacy = clienteStr.match(regexLegacy);
  if (matchLegacy) {
    return {
      nombre: matchLegacy[1].trim(),
      docTipo: matchLegacy[2].length === 11 ? "RUC" : "DNI",
      docNro: matchLegacy[2]
    };
  }

  return {
    nombre: clienteStr.trim(),
    docTipo: "OTROS",
    docNro: "-"
  };
}
