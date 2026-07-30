/**
 * scripts/migrate.js
 * ==================
 * Script de migración de datos: Google Sheets → Aiven MySQL
 *
 * PREREQUISITOS:
 *   1. Crear tablas en Aiven con scripts/create-tables.sql
 *   2. Configurar DATABASE_URL en el archivo .env de la raíz del proyecto
 *
 * USO:
 *   node scripts/migrate.js           → Migración completa
 *   node scripts/migrate.js --dry-run → Solo descarga datos, NO inserta en MySQL
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde .env.local (raíz del proyecto)
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// ── Configuración ──────────────────────────────────────────────────────────────

const GOOGLE_API_URL =
  "https://script.google.com/macros/s/AKfycbyD8ODjThfNHRBP3bwHn6U6KgO3ECgDUUYPxavY4ZCi82HldN129AxwTg_gYDosHbVr/exec";

const AIVEN_MYSQL_URI = process.env.DATABASE_URL;
const DRY_RUN = process.argv.includes("--dry-run");

if (!AIVEN_MYSQL_URI) {
  console.error("\n❌ ERROR: La variable de entorno DATABASE_URL no está configurada.");
  console.error("   Crea un archivo .env en la raíz del proyecto con:");
  console.error('   DATABASE_URL="mysql://user:pass@host:port/dbname"\n');
  process.exit(1);
}

if (DRY_RUN) {
  console.log("🔍 MODO DRY-RUN: Solo se descargarán datos. NO se insertará nada en MySQL.\n");
}

// ── Parser de fechas robusto ───────────────────────────────────────────────────
// Soporta formatos de Google Sheets: "30/07/2026 14:30:00", "30/07/2026", ISO 8601
function parseSheetDate(val) {
  if (!val || val === "" || val === null) return null;
  const str = String(val).trim();

  // Formato Sheets: "DD/MM/YYYY HH:MM:SS" o "DD/MM/YYYY"
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s(\d{2}):(\d{2}):(\d{2}))?$/;
  const match = str.match(ddmmyyyy);
  if (match) {
    const [, dd, mm, yyyy, HH = "00", MM = "00", SS = "00"] = match;
    const d = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${HH}:${MM}:${SS}`);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // ISO 8601 y otros formatos estándar
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ── Resultado de migración por tabla ──────────────────────────────────────────
const results = [];

// ── Función principal ─────────────────────────────────────────────────────────
async function migrate() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("  🚀 SGI — Migración: Google Sheets → Aiven MySQL");
  console.log("════════════════════════════════════════════════════════════\n");

  let connection;
  if (!DRY_RUN) {
    try {
      connection = await mysql.createConnection({
        uri: AIVEN_MYSQL_URI,
        ssl: { rejectUnauthorized: false }
      });
      console.log("✅ Conexión a Aiven MySQL establecida.\n");
    } catch (error) {
      console.error("❌ ERROR de conexión a MySQL:", error.message);
      process.exit(1);
    }
  }

  // Orden respeta dependencias: primero tablas sin FK, luego las dependientes
  const tables = [
    "Proveedores",
    "Categorias",
    "Marcas",
    "Usuarios",
    "Productos",
    "Movimientos",
    "Traslados",
    "Ventas",
    "Logs"
  ];

  for (const table of tables) {
    const result = { table, sheetsCount: 0, mysqlCount: 0, status: "⏳", error: null };
    results.push(result);

    try {
      console.log(`────────────────────────────────────────────────────────────`);
      console.log(`📥  Descargando hoja: ${table}...`);

      const response = await fetch(`${GOOGLE_API_URL}?sheet=${table}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al descargar la hoja "${table}"`);
      }

      const json = await response.json();

      if (json.status !== "success") {
        throw new Error(`API error: ${json.message}`);
      }

      const records = Array.isArray(json.data) ? json.data : [];
      result.sheetsCount = records.length;

      if (records.length === 0) {
        console.log(`⚠️   Sin registros en ${table}. Se saltará la inserción.`);
        result.status = "⚠️ vacía";
        continue;
      }

      console.log(`📦  Obtenidos ${records.length} registros de Sheets.`);

      if (DRY_RUN) {
        console.log(`🔍  [DRY-RUN] Se insertarían ${records.length} registros en MySQL (${table.toLowerCase()}).`);
        result.mysqlCount = records.length;
        result.status = "✅ ok (dry)";
        continue;
      }

      // ── Insertar según tabla ─────────────────────────────────────────────────
      await insertTable(connection, table, records);

      // ── Verificación de integridad ───────────────────────────────────────────
      const tableName = table.toLowerCase();
      const [[{ count }]] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      result.mysqlCount = Number(count);

      if (result.mysqlCount >= result.sheetsCount) {
        result.status = "✅ ok";
        console.log(`✅  ${table}: ${result.sheetsCount} en Sheets → ${result.mysqlCount} en MySQL.`);
      } else {
        result.status = "⚠️ difiere";
        console.warn(`⚠️   ${table}: ${result.sheetsCount} en Sheets ≠ ${result.mysqlCount} en MySQL.`);
      }
    } catch (err) {
      result.status = "❌ error";
      result.error = err.message;
      console.error(`❌  ERROR migrando "${table}": ${err.message}`);
    }
  }

  if (!DRY_RUN && connection) {
    await connection.end();
  }

  // ── Tabla de resumen final ───────────────────────────────────────────────────
  printSummary();
}

// ── Inserción por tabla ────────────────────────────────────────────────────────
async function insertTable(conn, table, records) {
  switch (table) {
    case "Proveedores":
      for (const r of records) {
        await conn.execute(
          `INSERT INTO proveedores (id, nombre, contacto, telefono, email, direccion)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nombre = VALUES(nombre), contacto = VALUES(contacto),
             telefono = VALUES(telefono), email = VALUES(email),
             direccion = VALUES(direccion)`,
          [Number(r.id), r.nombre || "", r.contacto || "", r.telefono || "", r.email || "", r.direccion || ""]
        );
      }
      break;

    case "Categorias":
      for (const r of records) {
        await conn.execute(
          `INSERT INTO categorias (id, nombre, descripcion)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion)`,
          [Number(r.id), r.nombre || "", r.descripcion || ""]
        );
      }
      break;

    case "Marcas":
      for (const r of records) {
        await conn.execute(
          `INSERT INTO marcas (id, nombre, descripcion)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion)`,
          [Number(r.id), r.nombre || "", r.descripcion || ""]
        );
      }
      break;

    case "Usuarios":
      for (const r of records) {
        await conn.execute(
          `INSERT INTO usuarios (id, nombre, pin, rol)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE pin = VALUES(pin), rol = VALUES(rol)`,
          [Number(r.id), r.nombre || "", r.pin || "", r.rol || "Vendedor"]
        );
      }
      break;

    case "Productos":
      for (const r of records) {
        await conn.execute(
          `INSERT INTO productos
             (id, codigo, descripcion, marca, categoria, stock, pCompra,
              margGanancia, pVenta, utilidad, proveedorId, oem,
              imagenUrl, imagenUrl2, imagenUrl3)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             codigo = VALUES(codigo), descripcion = VALUES(descripcion),
             marca = VALUES(marca), categoria = VALUES(categoria),
             stock = VALUES(stock), pCompra = VALUES(pCompra),
             margGanancia = VALUES(margGanancia), pVenta = VALUES(pVenta),
             utilidad = VALUES(utilidad), proveedorId = VALUES(proveedorId),
             oem = VALUES(oem), imagenUrl = VALUES(imagenUrl),
             imagenUrl2 = VALUES(imagenUrl2), imagenUrl3 = VALUES(imagenUrl3)`,
          [
            Number(r.id),
            r.codigo || "",
            r.descripcion || "",
            r.marca || null,
            r.categoria || null,
            Number(r.stock) || 0,
            Number(r.pCompra) || 0,
            Number(r.margGanancia) || 0,
            Number(r.pVenta) || 0,
            Number(r.utilidad) || 0,
            r.proveedorId ? Number(r.proveedorId) : null,
            r.oem || "",
            r.imagenUrl || "",
            r.imagenUrl2 || "",
            r.imagenUrl3 || ""
          ]
        );
      }
      break;

    case "Movimientos":
      for (const r of records) {
        await conn.execute(
          `INSERT INTO movimientos
             (id, productoId, tipo, cantidad, fecha, motivo, stockAnterior, stockNuevo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             tipo = VALUES(tipo), cantidad = VALUES(cantidad),
             fecha = VALUES(fecha), motivo = VALUES(motivo),
             stockAnterior = VALUES(stockAnterior), stockNuevo = VALUES(stockNuevo)`,
          [
            Number(r.id),
            Number(r.productoId) || 0,
            r.tipo || "",
            Number(r.cantidad) || 0,
            parseSheetDate(r.fecha) || new Date(),
            r.motivo || "",
            Number(r.stockAnterior) || 0,
            Number(r.stockNuevo) || 0
          ]
        );
      }
      break;

    case "Traslados":
      for (const r of records) {
        // Normalizar campo items (puede venir como string JSON o ya como objeto)
        let itemsJson = r.items;
        if (typeof itemsJson === "string") {
          try { itemsJson = JSON.parse(itemsJson); } catch { itemsJson = []; }
        }
        if (!Array.isArray(itemsJson)) itemsJson = [];

        await conn.execute(
          `INSERT INTO traslados
             (id, tiendaVecina, fechaPrestamo, total, cantidad, estado,
              fechaResolucion, notas, productoId, itemsResumen, items)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             tiendaVecina = VALUES(tiendaVecina),
             fechaPrestamo = VALUES(fechaPrestamo),
             total = VALUES(total), cantidad = VALUES(cantidad),
             estado = VALUES(estado), fechaResolucion = VALUES(fechaResolucion),
             notas = VALUES(notas), productoId = VALUES(productoId),
             itemsResumen = VALUES(itemsResumen), items = VALUES(items)`,
          [
            Number(r.id),
            r.tiendaVecina || "",
            parseSheetDate(r.fechaPrestamo),
            Number(r.total) || 0,
            Number(r.cantidad) || 0,
            r.estado || "pendiente",
            r.fechaResolucion ? parseSheetDate(r.fechaResolucion) : null,
            r.notas || "",
            r.productoId ? Number(r.productoId) : null,
            r.itemsResumen || "",
            JSON.stringify(itemsJson)
          ]
        );
      }
      break;

    case "Ventas":
      for (const r of records) {
        let itemsJson = r.items;
        if (typeof itemsJson === "string") {
          try { itemsJson = JSON.parse(itemsJson); } catch { itemsJson = []; }
        }
        if (!Array.isArray(itemsJson)) itemsJson = [];

        await conn.execute(
          `INSERT INTO ventas
             (id, boleta, fecha, cliente, metodoPago, totalVenta,
              utilidad, cantidadTotal, direccion, items)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             boleta = VALUES(boleta), fecha = VALUES(fecha),
             cliente = VALUES(cliente), metodoPago = VALUES(metodoPago),
             totalVenta = VALUES(totalVenta), utilidad = VALUES(utilidad),
             cantidadTotal = VALUES(cantidadTotal), direccion = VALUES(direccion),
             items = VALUES(items)`,
          [
            Number(r.id),
            r.boleta || "",
            parseSheetDate(r.fecha) || new Date(),
            r.cliente || "",
            r.metodoPago || "",
            Number(r.totalVenta) || 0,
            Number(r.utilidad) || 0,
            Number(r.cantidadTotal) || 0,
            r.direccion || "",
            JSON.stringify(itemsJson)
          ]
        );
      }
      break;

    case "Logs":
      for (const r of records) {
        const logId = Number(r.id);
        if (!logId || isNaN(logId)) continue; // ID inválido, saltar
        await conn.execute(
          `INSERT INTO logs (id, fecha, usuario, accion, modulo, detalles, estado, ip)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             fecha = VALUES(fecha), usuario = VALUES(usuario),
             accion = VALUES(accion), modulo = VALUES(modulo),
             detalles = VALUES(detalles), estado = VALUES(estado),
             ip = VALUES(ip)`,
          [
            logId,
            parseSheetDate(r.fecha) || new Date(),
            r.usuario || "",
            r.accion || "",
            r.modulo || "",
            r.detalles || "",
            r.estado || "",
            r.ip || ""
          ]
        );
      }
      break;

    default:
      console.warn(`⚠️  Tabla "${table}" no tiene handler de inserción definido.`);
  }
}

// ── Resumen final ─────────────────────────────────────────────────────────────
function printSummary() {
  const line = "─".repeat(60);
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log("  📊  RESUMEN DE MIGRACIÓN");
  console.log(`════════════════════════════════════════════════════════════`);
  console.log(` ${"Tabla".padEnd(16)} ${"Sheets".padStart(8)} ${"MySQL".padStart(8)}   Estado`);
  console.log(` ${line}`);

  let allOk = true;
  for (const r of results) {
    const row = ` ${r.table.padEnd(16)} ${String(r.sheetsCount).padStart(8)} ${String(r.mysqlCount).padStart(8)}   ${r.status}`;
    console.log(row);
    if (r.error) {
      console.log(`   └─ Error: ${r.error}`);
      allOk = false;
    }
    if (r.status.includes("difiere")) allOk = false;
  }

  console.log(`\n${allOk ? "✅  Migración completada SIN errores." : "⚠️   Migración completada CON advertencias. Revisar errores arriba."}`);
  console.log("════════════════════════════════════════════════════════════\n");
}

// ── Punto de entrada ──────────────────────────────────────────────────────────
migrate();
