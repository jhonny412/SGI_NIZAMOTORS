/**
 * GOOGLE APPS SCRIPT para SGI (Sistema de Gestión de Inventario)
 *
 * Este script maneja todas las hojas de Google Sheets:
 * - Productos
 * - Proveedores
 * - Marcas
 * - Movimientos
 * - Categorias (NEW)
 * - Traslados (NEW)
 *
 * INSTALACIÓN:
 * 1. Ve a https://script.google.com
 * 2. Crea un nuevo proyecto
 * 3. Reemplaza el contenido con este código
 * 4. Vincula un Google Sheet: Project Settings > Resources > Google Sheet
 * 5. Despliega como Web App (Deploy > New deployment > Web app)
 * 6. Reemplaza el API_URL en src/context/InventoryContext.jsx con el nuevo endpoint
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Nombres de las hojas
const SHEETS = {
  PRODUCTOS: "Productos",
  PROVEEDORES: "Proveedores",
  MARCAS: "Marcas",
  MOVIMIENTOS: "Movimientos",
  CATEGORIAS: "Categorias",
  TRASLADOS: "Traslados",
  VENTAS: "Ventas",
  LOGS: "Logs",
  USUARIOS: "Usuarios"
};

/**
 * Función principal que maneja GET y POST
 */
function doGet(e) {
  const sheet = e.parameter.sheet;

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Parámetro 'sheet' requerido"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const data = obtenerDatos(sheet);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Función para POST requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = data.sheet;
    const action = data.action || "create";

    if (!sheet) {
      return createResponse("error", "Parámetro 'sheet' requerido");
    }

    // Crear hoja si no existe
    crearHojasiNoExiste(sheet);

    let resultado;

    switch (action) {
      case "create":
        resultado = guardarRegistro(sheet, data);
        break;
      case "edit":
        resultado = editarRegistro(sheet, data);
        break;
      case "delete":
        resultado = eliminarRegistro(sheet, data);
        break;
      default:
        return createResponse("error", `Acción desconocida: ${action}`);
    }

    return createResponse("success", resultado);
  } catch (error) {
    Logger.log("Error en doPost: " + error.toString());
    return createResponse("error", error.toString());
  }
}

/**
 * Obtiene todos los datos de una hoja
 */
function obtenerDatos(nombreHoja) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  try {
    const sheet = ss.getSheetByName(nombreHoja);
    if (!sheet) {
      return [];
    }

    const range = sheet.getDataRange();
    const values = range.getValues();

    if (values.length <= 1) {
      return []; // Solo headers o vacío
    }

    const headers = values[0];
    const data = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      data.push(obj);
    }

    return data;
  } catch (error) {
    Logger.log("Error en obtenerDatos: " + error.toString());
    return [];
  }
}

/**
 * Guarda un nuevo registro
 */
function guardarRegistro(nombreHoja, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  crearHojasiNoExiste(nombreHoja);
  const sheet = ss.getSheetByName(nombreHoja);

  // Obtener headers
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];

  // Preparar fila de datos
  const row = [];
  for (let header of headers) {
    row.push(data[header] !== undefined ? data[header] : "");
  }

  // Agregar fila
  sheet.appendRow(row);

  Logger.log(`Registro guardado en ${nombreHoja}: `, data);
  return { message: `Registro guardado en ${nombreHoja}`, data: data };
}

/**
 * Edita un registro existente
 */
function editarRegistro(nombreHoja, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(nombreHoja);

  if (!sheet) {
    throw new Error(`Hoja ${nombreHoja} no existe`);
  }

  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];

  // Encontrar la fila con el ID
  const idIndex = headers.indexOf("id");
  if (idIndex === -1) {
    throw new Error("Columna 'id' no encontrada");
  }

  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] == data.id) {
      // Actualizar la fila
      for (let j = 0; j < headers.length; j++) {
        if (data[headers[j]] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(data[headers[j]]);
        }
      }
      Logger.log(`Registro editado en ${nombreHoja}: `, data);
      return { message: `Registro ${data.id} actualizado`, data: data };
    }
  }

  throw new Error(`ID ${data.id} no encontrado en ${nombreHoja}`);
}

/**
 * Elimina un registro
 */
function eliminarRegistro(nombreHoja, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(nombreHoja);

  if (!sheet) {
    throw new Error(`Hoja ${nombreHoja} no existe`);
  }

  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];

  // Encontrar la fila con el ID
  const idIndex = headers.indexOf("id");
  if (idIndex === -1) {
    throw new Error("Columna 'id' no encontrada");
  }

  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] == data.id) {
      sheet.deleteRow(i + 1);
      Logger.log(`Registro eliminado en ${nombreHoja}: ID ${data.id}`);
      return { message: `Registro ${data.id} eliminado`, id: data.id };
    }
  }

  throw new Error(`ID ${data.id} no encontrado en ${nombreHoja}`);
}

/**
 * Crea una hoja si no existe
 */
function crearHojasiNoExiste(nombreHoja) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(nombreHoja);

  if (sheet) {
    return; // Ya existe
  }

  // Crear nueva hoja
  sheet = ss.insertSheet(nombreHoja);

  // Agregar headers según el tipo de hoja
  const headers = obtenerHeadersPorHoja(nombreHoja);
  sheet.appendRow(headers);

  Logger.log(`Hoja '${nombreHoja}' creada con headers: ${headers}`);

  // Sembrar usuarios por defecto al crear la hoja de Usuarios
  if (nombreHoja === SHEETS.USUARIOS) {
    sheet.appendRow([1, "Administrador", "1234", "Admin"]);
    sheet.appendRow([2, "Vendedor", "5678", "Vendedor"]);
    Logger.log("Usuarios por defecto (Admin: 1234, Vendedor: 5678) creados.");
  }
}

/**
 * Retorna los headers según el tipo de hoja
 */
function obtenerHeadersPorHoja(nombreHoja) {
  const headersMap = {
    [SHEETS.PRODUCTOS]: [
      "id", "codigo", "descripcion", "marca", "categoria", "stock",
      "pCompra", "margGanancia", "pVenta", "utilidad", "proveedorId",
      "oem", "imagenUrl", "imagenUrl2", "imagenUrl3"
    ],
    [SHEETS.PROVEEDORES]: ["id", "nombre", "contacto", "telefono", "email", "direccion"],
    [SHEETS.MARCAS]: ["id", "nombre", "descripcion"],
    [SHEETS.MOVIMIENTOS]: [
      "id", "productoId", "tipo", "cantidad", "fecha",
      "motivo", "stockAnterior", "stockNuevo"
    ],
    [SHEETS.CATEGORIAS]: ["id", "nombre", "descripcion"],
    [SHEETS.TRASLADOS]: [
      "id", "tiendaVecina", "fechaPrestamo", "total", "cantidad",
      "estado", "fechaResolucion", "notas", "productoId", "itemsResumen", "items"
    ],
    [SHEETS.VENTAS]: [
      "id", "boleta", "fecha", "cliente", "metodoPago", "totalVenta", "utilidad", "cantidadTotal", "direccion", "items"
    ],
    [SHEETS.LOGS]: ["id", "fecha", "usuario", "accion", "modulo", "detalles", "estado", "ip"],
    [SHEETS.USUARIOS]: ["id", "nombre", "pin", "rol"]
  };

  return headersMap[nombreHoja] || [];
}

/**
 * Función auxiliar para crear respuestas JSON
 */
function createResponse(status, data) {
  const response = { status: status };
  if (status === "success") {
    response.data = data;
  } else {
    response.message = data;
  }
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Función para pruebas (ejecutar desde Apps Script)
 */
function test() {
  Logger.log("=== TEST GOOGLE APPS SCRIPT ===");

  // Test 1: Crear hojas
  crearHojasiNoExiste(SHEETS.CATEGORIAS);
  crearHojasiNoExiste(SHEETS.TRASLADOS);

  // Test 2: Guardar una categoría
  const testCategoria = {
    sheet: SHEETS.CATEGORIAS,
    id: 1,
    nombre: "Test Categoría",
    descripcion: "Categoría de prueba"
  };
  Logger.log("Guardando categoría:", testCategoria);
  guardarRegistro(SHEETS.CATEGORIAS, testCategoria);

  // Test 3: Guardar un traslado
  const testTraslado = {
    sheet: SHEETS.TRASLADOS,
    id: 1,
    tiendaVecina: "CANDAO",
    fechaPrestamo: new Date().toISOString().split("T")[0],
    total: 1500,
    cantidad: 10,
    estado: "pendiente",
    notas: "Traslado de prueba"
  };
  Logger.log("Guardando traslado:", testTraslado);
  guardarRegistro(SHEETS.TRASLADOS, testTraslado);

  Logger.log("=== PRUEBAS COMPLETADAS ===");
}
