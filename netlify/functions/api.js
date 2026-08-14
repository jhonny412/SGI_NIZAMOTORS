import mysql from "mysql2/promise";

// Mapeador de nombres de colecciones del frontend a tablas de la base de datos MySQL
const TABLE_MAP = {
  "Productos": "productos",
  "Proveedores": "proveedores",
  "Marcas": "marcas",
  "Movimientos": "movimientos",
  "Categorias": "categorias",
  "Traslados": "traslados",
  "Ventas": "ventas",
  "Logs": "logs",
  "Usuarios": "usuarios"
};

// Declaración del pool de conexiones fuera del handler para reutilizarlo entre invocaciones serverless (Warm Starts)
let pool;

function getPool() {
  if (!pool) {
    const connectionUri = process.env.DATABASE_URL;
    if (!connectionUri) {
      throw new Error("DATABASE_URL variable de entorno no configurada.");
    }
    
    pool = mysql.createPool({
      uri: connectionUri,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      ssl: {
        rejectUnauthorized: false // Requerido para la conexión SSL segura con Aiven
      }
    });
  }
  return pool;
}

const tableColumnsCache = {};

async function getValidColumns(dbPool, tableName) {
  if (!tableColumnsCache[tableName]) {
    const [rows] = await dbPool.query(`DESCRIBE \`${tableName}\``);
    tableColumnsCache[tableName] = new Set(rows.map((r) => r.Field));
  }
  return tableColumnsCache[tableName];
}

const pad = (n) => String(n).padStart(2, '0');

// Helper para normalizar valores (JSON objects -> string, ISO dates -> local DATETIME string)
function formatValue(val) {
  if (val !== null && typeof val === "object") return JSON.stringify(val);
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(val)) {
    if (val.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(val)) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace("T", " ");
      }
    } else {
      return val.replace("T", " ").substring(0, 19);
    }
  }
  return val;
}

export async function handler(event, _context) {
  // Manejo de CORS (Preflight OPTIONS)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS OK" })
    };
  }

  try {
    const dbPool = getPool();

    // ----------------------------------------------------
    // MANEJO DE PETICIONES GET (doGet)
    // ----------------------------------------------------
    if (event.httpMethod === "GET") {
      const sheetName = event.queryStringParameters?.sheet;
      if (!sheetName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ status: "error", message: "Parámetro 'sheet' requerido" })
        };
      }

      const tableName = TABLE_MAP[sheetName];
      if (!tableName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ status: "error", message: `Colección '${sheetName}' no válida.` })
        };
      }

      // Obtener todos los registros ordenados por ID
      let selectQuery = `SELECT * FROM \`${tableName}\` ORDER BY id ASC`;
      if (["productos", "proveedores", "marcas", "categorias"].includes(tableName)) {
        selectQuery = `SELECT * FROM \`${tableName}\` WHERE activo IS NULL OR activo = 1 ORDER BY id ASC`;
      }

      const [rows] = await dbPool.query(selectQuery);
      
      // Asegurarse de que los campos JSON o de objetos (como 'items' en ventas y traslados) se devuelvan como string
      // para mantener la compatibilidad 100% con JSON.parse() en el frontend original
      const formattedRows = rows.map(row => {
        const formatted = { ...row };
        for (const [key, val] of Object.entries(formatted)) {
          if (val instanceof Date) {
            formatted[key] = val.toISOString();
          } else if (val !== null && typeof val === "object") {
            formatted[key] = JSON.stringify(val);
          }
        }
        return formatted;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "success", data: formattedRows })
      };
    }

    // ----------------------------------------------------
    // MANEJO DE PETICIONES POST (doPost)
    // ----------------------------------------------------
    if (event.httpMethod === "POST") {
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ status: "error", message: "Cuerpo de petición requerido" })
        };
      }

      const bodyData = JSON.parse(event.body);
      const { sheet, action, ...payload } = bodyData;

      if (!sheet) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ status: "error", message: "Parámetro 'sheet' requerido en el cuerpo" })
        };
      }

      const tableName = TABLE_MAP[sheet];
      if (!tableName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ status: "error", message: `Colección '${sheet}' no válida.` })
        };
      }

      const currentAction = action || "create";
      let resultData;

      if (currentAction === "create") {
        delete payload.id;

        const validColumns = await getValidColumns(dbPool, tableName);
        const filteredPayload = {};
        for (const [key, val] of Object.entries(payload)) {
          if (validColumns.has(key)) {
            filteredPayload[key] = val;
          }
        }

        const keys = Object.keys(filteredPayload);
        if (keys.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ status: "error", message: "No hay campos válidos para insertar" })
          };
        }

        const mappedValues = Object.values(filteredPayload).map(formatValue);

        const insertQuery = `INSERT INTO \`${tableName}\` (\`${keys.join("`, `")}\`) VALUES (${keys.map(() => "?").join(", ")})`;
        
        try {
          const [insertResult] = await dbPool.execute(insertQuery, mappedValues);
          
          const createdId = insertResult.insertId;
          const [insertedRows] = await dbPool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [createdId]);
          resultData = insertedRows[0] || { id: createdId, ...filteredPayload };
        } catch (dbError) {
          if (tableName === "logs" && (dbError.code === "ER_NO_DEFAULT_FOR_FIELD" || dbError.errno === 1364)) {
            const fallbackId = Date.now() + Math.floor(Math.random() * 10000);
            filteredPayload.id = fallbackId;
            const retryKeys = Object.keys(filteredPayload);
            const retryValues = Object.values(filteredPayload).map(formatValue);
            const retryQuery = `INSERT INTO \`${tableName}\` (\`${retryKeys.join("`, `")}\`) VALUES (${retryKeys.map(() => "?").join(", ")})`;
            const [retryResult] = await dbPool.execute(retryQuery, retryValues);
            const createdId = fallbackId || retryResult.insertId;
            const [insertedRows] = await dbPool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [createdId]);
            resultData = insertedRows[0] || { id: createdId, ...filteredPayload };
          } else {
            throw dbError;
          }
        }

      } else if (currentAction === "edit") {
        const { id, ...updateFields } = payload;
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ status: "error", message: "Se requiere 'id' para editar un registro" })
          };
        }

        const validColumns = await getValidColumns(dbPool, tableName);
        const filteredUpdateFields = {};
        for (const [key, val] of Object.entries(updateFields)) {
          if (validColumns.has(key)) {
            filteredUpdateFields[key] = val;
          }
        }

        const keys = Object.keys(filteredUpdateFields);
        if (keys.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ status: "error", message: "No hay campos válidos para actualizar" })
          };
        }

        const mappedValues = Object.values(filteredUpdateFields).map(formatValue);

        const setClause = keys.map(k => `\`${k}\` = ?`).join(", ");
        const updateQuery = `UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`;
        
        await dbPool.execute(updateQuery, [...mappedValues, id]);

        // Retornar el registro actualizado
        const [updatedRows] = await dbPool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [id]);
        resultData = updatedRows[0];

      } else if (currentAction === "delete") {
        const { id } = payload;
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ status: "error", message: "Se requiere 'id' para eliminar un registro" })
          };
        }

        // Borrado Lógico (Soft Delete) para colecciones del catálogo
        if (["productos", "proveedores", "marcas", "categorias"].includes(tableName)) {
          const updateQuery = `UPDATE \`${tableName}\` SET activo = 0 WHERE id = ?`;
          const [updateResult] = await dbPool.execute(updateQuery, [id]);

          if (updateResult.affectedRows === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ status: "error", message: `ID ${id} no encontrado en ${sheet}` })
            };
          }

          resultData = { message: `Registro ${id} desactivado (borrado lógico)`, id };
        } else {
          // Borrado Físico para otras tablas (ej. ventas de prueba)
          const deleteQuery = `DELETE FROM \`${tableName}\` WHERE id = ?`;
          const [deleteResult] = await dbPool.execute(deleteQuery, [id]);

          if (deleteResult.affectedRows === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ status: "error", message: `ID ${id} no encontrado en ${sheet}` })
            };
          }

          resultData = { message: `Registro ${id} eliminado`, id };
        }

      } else if (currentAction === "procesarVenta") {
        const { venta, movimientos } = payload;
        const conn = await dbPool.getConnection();
        try {
          await conn.beginTransaction();

          // 1. Insertar registro de venta
          const validColumns = await getValidColumns(dbPool, "ventas");
          const vKeys = Object.keys(venta).filter(k => k !== "id" && validColumns.has(k));
          const vVals = vKeys.map(k => formatValue(venta[k]));
          const vQuery = `INSERT INTO ventas (\`${vKeys.join("`, `")}\`) VALUES (${vKeys.map(() => "?").join(", ")})`;
          const [vRes] = await conn.execute(vQuery, vVals);
          const ventaId = vRes.insertId;

          // 2. Insertar movimientos y actualizar stock de productos
          if (Array.isArray(movimientos)) {
            for (const mov of movimientos) {
              const { id: _mId, ...movFields } = mov;
              const mKeys = Object.keys(movFields);
              const mVals = mKeys.map(k => formatValue(movFields[k]));
              const mQuery = `INSERT INTO movimientos (\`${mKeys.join("`, `")}\`) VALUES (${mKeys.map(() => "?").join(", ")})`;
              await conn.execute(mQuery, mVals);

              if (mov.productoId && mov.cantidad) {
                await conn.execute(`UPDATE productos SET stock = stock - ? WHERE id = ?`, [mov.cantidad, mov.productoId]);
              }
            }
          }

          await conn.commit();
          const [ventaRow] = await conn.query(`SELECT * FROM ventas WHERE id = ?`, [ventaId]);
          resultData = ventaRow[0] || { id: ventaId, ...venta };
        } catch (txErr) {
          await conn.rollback();
          throw txErr;
        } finally {
          conn.release();
        }
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ status: "error", message: `Acción '${currentAction}' no reconocida.` })
        };
      }

      // Asegurar formateo de JSON a String si es necesario
      if (resultData && typeof resultData === "object") {
        for (const [key, val] of Object.entries(resultData)) {
          if (val instanceof Date) {
            resultData[key] = val.toISOString();
          } else if (val !== null && typeof val === "object") {
            resultData[key] = JSON.stringify(val);
          }
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "success", data: resultData })
      };
    }

    // Método HTTP no soportado
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ status: "error", message: `Método ${event.httpMethod} no permitido` })
    };

  } catch (error) {
    console.error("❌ ERROR en Netlify Function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ status: "error", message: error.message })
    };
  }
}
