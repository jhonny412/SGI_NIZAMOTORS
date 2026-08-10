/**
 * scripts/alter-imagen-columns.js
 * ================================
 * Amplía los campos imagenUrl, imagenUrl2, imagenUrl3 de TEXT → MEDIUMTEXT
 * para permitir almacenar imágenes en Base64 de mayor calidad (hasta 16 MB).
 *
 * USO:
 *   node scripts/alter-imagen-columns.js
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const AIVEN_MYSQL_URI = process.env.DATABASE_URL;

if (!AIVEN_MYSQL_URI) {
  console.error("❌ ERROR: DATABASE_URL no configurada en .env.local");
  process.exit(1);
}

async function run() {
  console.log("🔧 Conectando a Aiven MySQL...");
  const conn = await mysql.createConnection({
    uri: AIVEN_MYSQL_URI,
    ssl: { rejectUnauthorized: false }
  });
  console.log("✅ Conexión establecida.\n");

  const query = `
    ALTER TABLE \`productos\`
      MODIFY COLUMN \`imagenUrl\`  MEDIUMTEXT NULL,
      MODIFY COLUMN \`imagenUrl2\` MEDIUMTEXT NULL,
      MODIFY COLUMN \`imagenUrl3\` MEDIUMTEXT NULL;
  `;

  console.log("⚙️  Ejecutando ALTER TABLE productos...");
  await conn.execute(query);
  console.log("✅ Columnas actualizadas a MEDIUMTEXT correctamente.\n");

  // Verificar el cambio
  const [rows] = await conn.execute(`
    SELECT COLUMN_NAME, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND COLUMN_NAME IN ('imagenUrl', 'imagenUrl2', 'imagenUrl3')
    ORDER BY ORDINAL_POSITION;
  `);

  console.log("📋 Estado actual de las columnas:");
  rows.forEach(r => console.log("   " + r.COLUMN_NAME.padEnd(16) + " → " + r.COLUMN_TYPE));

  await conn.end();
  console.log("\n🎉 ¡Listo! Las imágenes de alta calidad ahora se guardarán correctamente.");
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
