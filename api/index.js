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

// Declaración del pool de conexiones fuera del handler para reutilizarlo entre invocaciones serverless
let pool;

function getPool() {
  if (!pool) {
    let connectionUri = process.env.DATABASE_URL;
    if (!connectionUri) {
      throw new Error("DATABASE_URL variable de entorno no configurada.");
    }

    // Reemplazo automático: Si la URI apunta a /defaultdb, redirigir a /NIZA_MOTORS
    if (connectionUri.includes('/defaultdb')) {
      connectionUri = connectionUri.replace('/defaultdb', '/NIZA_MOTORS');
    }
    
    pool = mysql.createPool({
      uri: connectionUri,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      ssl: {
        rejectUnauthorized: false
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

export default async function handler(req, res) {
  // Manejo de CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).json({ message: "CORS OK" });
  }

  try {
    const dbPool = getPool();

    // ----------------------------------------------------
    // MANEJO DE PETICIONES GET
    // ----------------------------------------------------
    if (req.method === "GET") {
      const sheetName = req.query?.sheet;
      if (!sheetName) {
        return res.status(400).json({ status: "error", message: "Parámetro 'sheet' requerido" });
      }

      const tableName = TABLE_MAP[sheetName];
      if (!tableName) {
        return res.status(400).json({ status: "error", message: `Colección '${sheetName}' no válida.` });
      }

      let selectQuery = `SELECT * FROM \`${tableName}\` ORDER BY id ASC`;
      if (["productos", "proveedores", "marcas", "categorias"].includes(tableName)) {
        selectQuery = `SELECT * FROM \`${tableName}\` WHERE activo IS NULL OR activo = 1 ORDER BY id ASC`;
      }

      const [rows] = await dbPool.query(selectQuery);
      
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

      return res.status(200).json({ status: "success", data: formattedRows });
    }

    // ----------------------------------------------------
    // MANEJO DE PETICIONES POST
    // ----------------------------------------------------
    if (req.method === "POST") {
      const bodyData = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const { sheet, action, ...payload } = bodyData;

      if (!sheet) {
        return res.status(400).json({ status: "error", message: "Parámetro 'sheet' requerido en el cuerpo" });
      }

      const tableName = TABLE_MAP[sheet];
      if (!tableName) {
        return res.status(400).json({ status: "error", message: `Colección '${sheet}' no válida.` });
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
          return res.status(400).json({ status: "error", message: "No hay campos válidos para insertar" });
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
          return res.status(400).json({ status: "error", message: "Se requiere 'id' para editar un registro" });
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
          return res.status(400).json({ status: "error", message: "No hay campos válidos para actualizar" });
        }

        const mappedValues = Object.values(filteredUpdateFields).map(formatValue);
        const setClause = keys.map(k => `\`${k}\` = ?`).join(", ");
        const updateQuery = `UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`;
        
        await dbPool.execute(updateQuery, [...mappedValues, id]);
        const [updatedRows] = await dbPool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [id]);
        resultData = updatedRows[0];

      } else if (currentAction === "delete") {
        const { id } = payload;
        if (!id) {
          return res.status(400).json({ status: "error", message: "Se requiere 'id' para eliminar un registro" });
        }

        if (["productos", "proveedores", "marcas", "categorias"].includes(tableName)) {
          const updateQuery = `UPDATE \`${tableName}\` SET activo = 0 WHERE id = ?`;
          const [updateResult] = await dbPool.execute(updateQuery, [id]);

          if (updateResult.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: `ID ${id} no encontrado en ${sheet}` });
          }
          resultData = { message: `Registro ${id} desactivado (borrado lógico)`, id };
        } else {
          const deleteQuery = `DELETE FROM \`${tableName}\` WHERE id = ?`;
          const [deleteResult] = await dbPool.execute(deleteQuery, [id]);

          if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: `ID ${id} no encontrado en ${sheet}` });
          }
          resultData = { message: `Registro ${id} eliminado`, id };
        }

      } else if (currentAction === "procesarVenta") {
        const { venta, movimientos } = payload;
        const conn = await dbPool.getConnection();
        try {
          await conn.beginTransaction();

          const validColumns = await getValidColumns(dbPool, "ventas");
          const vKeys = Object.keys(venta).filter(k => k !== "id" && validColumns.has(k));
          const vVals = vKeys.map(k => formatValue(venta[k]));
          const vQuery = `INSERT INTO ventas (\`${vKeys.join("`, `")}\`) VALUES (${vKeys.map(() => "?").join(", ")})`;
          const [vRes] = await conn.execute(vQuery, vVals);
          const ventaId = vRes.insertId;

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
        return res.status(400).json({ status: "error", message: `Acción '${currentAction}' no reconocida.` });
      }

      if (resultData && typeof resultData === "object") {
        for (const [key, val] of Object.entries(resultData)) {
          if (val instanceof Date) {
            resultData[key] = val.toISOString();
          } else if (val !== null && typeof val === "object") {
            resultData[key] = JSON.stringify(val);
          }
        }
      }

      return res.status(200).json({ status: "success", data: resultData });
    }

    return res.status(405).json({ status: "error", message: `Método ${req.method} no permitido` });

  } catch (error) {
    console.error("❌ ERROR en Vercel Serverless Function:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
}
