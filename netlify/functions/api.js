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
      ssl: {
        rejectUnauthorized: false // Requerido para la conexión SSL segura con Aiven
      }
    });
  }
  return pool;
}

export async function handler(event, context) {
  // Manejo de CORS (Preflight OPTIONS)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
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
      const [rows] = await dbPool.query(`SELECT * FROM \`${tableName}\` ORDER BY id ASC`);
      
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
        // Si el id viene en 0 o null, lo removemos para que MySQL genere un auto_increment.
        // Pero si el frontend manda un ID específico (> 0), lo respetamos.
        if (payload.id === 0 || payload.id === null || payload.id === undefined) {
          delete payload.id;
        }

        const keys = Object.keys(payload);

        // Mapear objetos/arrays a strings de JSON para MySQL
        const mappedValues = Object.values(payload).map(val => 
          val !== null && typeof val === "object" ? JSON.stringify(val) : val
        );

        const insertQuery = `INSERT INTO \`${tableName}\` (\`${keys.join("`, `")}\`) VALUES (${keys.map(() => "?").join(", ")})`;
        const [insertResult] = await dbPool.execute(insertQuery, mappedValues);
        
        // Devolvemos el registro recién creado
        const createdId = payload.id || insertResult.insertId;
        const [insertedRows] = await dbPool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [createdId]);
        resultData = insertedRows[0];

      } else if (currentAction === "edit") {
        const { id, ...updateFields } = payload;
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ status: "error", message: "Se requiere 'id' para editar un registro" })
          };
        }

        const keys = Object.keys(updateFields);
        if (keys.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ status: "error", message: "No hay campos para actualizar" })
          };
        }

        const mappedValues = Object.values(updateFields).map(val => 
          val !== null && typeof val === "object" ? JSON.stringify(val) : val
        );

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
