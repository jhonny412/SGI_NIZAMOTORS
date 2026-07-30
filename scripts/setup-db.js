import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolviendo ruta absoluta
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const AIVEN_MYSQL_URI = process.env.DATABASE_URL;

if (!AIVEN_MYSQL_URI) {
  console.error("❌ ERROR: La variable DATABASE_URL no está configurada en .env.local");
  process.exit(1);
}

async function run() {
  console.log("🚀 Creando tablas en Aiven MySQL...");
  
  let connection;
  try {
    connection = await mysql.createConnection({
      uri: AIVEN_MYSQL_URI,
      ssl: { rejectUnauthorized: false },
      multipleStatements: true // Permitir múltiples statements en el DDL
    });
    console.log("✅ Conexión establecida.");

    const ddlPath = path.join(__dirname, "create-tables.sql");
    const ddlSql = fs.readFileSync(ddlPath, "utf-8");

    console.log("⏳ Ejecutando DDL (scripts/create-tables.sql)...");
    await connection.query(ddlSql);
    console.log("✅ Tablas creadas/verificadas exitosamente.");

  } catch (error) {
    console.error("❌ ERROR al configurar las tablas:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();
