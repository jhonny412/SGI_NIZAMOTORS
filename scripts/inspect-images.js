import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const conn = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const [rows] = await conn.execute(
  "SELECT id, descripcion, " +
  "LEFT(imagenUrl, 30) as img1_preview, " +
  "CHAR_LENGTH(imagenUrl) as img1_len, " +
  "LEFT(imagenUrl2, 30) as img2_preview, " +
  "CHAR_LENGTH(imagenUrl2) as img2_len " +
  "FROM productos WHERE imagenUrl IS NOT NULL AND imagenUrl != '' LIMIT 10"
);

console.log("\n=== TIPO DE IMÁGENES EN LA BASE DE DATOS ===\n");
rows.forEach(r => {
  const tipo1 = r.img1_preview?.startsWith("data:") ? "BASE64 local" : "URL externa";
  console.log("ID " + r.id + " | " + r.descripcion.substring(0,40));
  console.log("  Imagen 1: " + tipo1 + " | " + (r.img1_len || 0) + " bytes stored");
  if (r.img2_preview) {
    const tipo2 = r.img2_preview?.startsWith("data:") ? "BASE64 local" : "URL externa";
    console.log("  Imagen 2: " + tipo2 + " | " + (r.img2_len || 0) + " bytes stored");
  }
  console.log("");
});

await conn.end();
