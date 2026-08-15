import Swal from "sweetalert2";

/**
 * Exporta un listado de ventas a Excel con el mismo formato usado en la
 * opción de menú Ventas: encabezado estilo grilla y contenido en
 * Arial, tamaño 10, color negro y sin negrita.
 *
 * @param {Object}   opts
 * @param {Array}    opts.datos         - Ventas a exportar (filtradas o totales)
 * @param {Function} opts.formatFecha   - Formateador de fecha
 * @param {Function} opts.t             - Función de traducción (i18next)
 * @param {String}   [opts.nombreArchivo] - Nombre base del archivo (sin extensión)
 * @returns {Promise<boolean>} true si la exportación fue exitosa
 */
export async function exportVentasExcel({ datos, formatFecha, t, nombreArchivo = "ventas" }) {
  try {
    const [exceljsModule, fileSaverModule] = await Promise.all([
      import("exceljs"),
      import("file-saver")
    ]);

    const ExcelJS = exceljsModule.default || exceljsModule;
    const saveAs = fileSaverModule.saveAs || fileSaverModule.default || fileSaverModule;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t("pages.ventas.title") || "Ventas");

    // Column definitions mapped exactly to the grid's columns
    const columns = [
      { header: t("pages.ventas.table.id"), key: "boleta", width: 18 },
      { header: t("pages.ventas.table.date"), key: "fecha", width: 16 },
      { header: t("pages.ventas.table.notes"), key: "cliente", width: 30 },
      { header: t("pages.ventas.table.payment"), key: "metodoPago", width: 22 },
      { header: t("pages.ventas.table.items"), key: "items", width: 14 },
      { header: t("pages.ventas.export_qty_total"), key: "cantidadTotal", width: 16 },
      { header: t("pages.ventas.table.total"), key: "total", width: 16 },
      { header: t("pages.ventas.table.profit"), key: "utilidad", width: 16 },
      { header: t("pages.ventas.export_seller"), key: "vendedor", width: 22 }
    ];

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width
    }));

    // Styles for header row (bg-slate-950/40, text-xs font-bold text-slate-400 uppercase tracking-wider)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Segoe UI",
        family: 2,
        size: 10,
        bold: true,
        color: { argb: "FF94A3B8" } // slate-400
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" } // slate-950
      };
      const key = columns[cell.column - 1]?.key;
      cell.alignment = {
        vertical: "middle",
        horizontal: ["items", "cantidadTotal", "total", "utilidad"].includes(key)
          ? "right"
          : "left"
      };
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } }
      };
    });

    // Populate data rows (Arial 10, negro, sin negrita)
    (datos || []).forEach((s) => {
      const esLegacy = !s.boleta;
      const metLabel = s.metodoPago
        ? t(`sale.${s.metodoPago.toLowerCase()}`, { defaultValue: s.metodoPago })
        : "—";
      const numItems = Array.isArray(s.items) ? s.items.length : (Number(s.cantidadTotal) > 0 ? 1 : 0);
      const rowData = {
        boleta: esLegacy ? `Legacy #${s.id}` : s.boleta.replace("BOLETA ", ""),
        fecha: formatFecha(s.fecha),
        cliente: s.cliente ? s.cliente.split("(")[0].trim() : "—",
        metodoPago: metLabel,
        items: numItems,
        cantidadTotal: Number(s.cantidadTotal) || 0,
        total: Number(s.totalVenta) || 0,
        utilidad: Number(s.utilidad) || 0,
        vendedor: s.vendedor || "—"
      };

      const row = worksheet.addRow(rowData);
      row.height = 22;

      columns.forEach((col, index) => {
        const cell = row.getCell(index + 1);

        cell.font = {
          name: "Arial",
          size: 10,
          color: { argb: "FF000000" } // texto negro, sin negrita
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left"
        };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };

        // Alineaciones y formato numérico por columna
        if (col.key === "items") {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (col.key === "cantidadTotal") {
          cell.alignment = { vertical: "middle", horizontal: "right" };
        } else if (col.key === "total" || col.key === "utilidad") {
          cell.numFmt = '"S/."#,##0.00';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
      });
    });

    // Auto-fit column widths to prevent content from cutting off in Excel
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value;
        if (val !== null && val !== undefined) {
          let len;
          if (typeof val === "object" && val.text) {
            len = val.text.toString().length;
          } else if (val instanceof Date) {
            len = val.toISOString().slice(0, 10).length;
          } else if (typeof val === "number") {
            len = val.toString().length + 6; // Approximate formatted currency length
          } else {
            len = val.toString().length;
          }
          if (len > maxLen) {
            maxLen = len;
          }
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 12), 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    saveAs(blob, `${nombreArchivo}_${dateStr}.xlsx`);

    Swal.fire({
      icon: "success",
      title: t("pages.ventas.export_success_title") || "Exportación exitosa",
      text: t("pages.ventas.export_success_text") || "Las ventas se han exportado correctamente a Excel.",
      timer: 2000,
      showConfirmButton: false
    });
    return true;
  } catch (error) {
    console.error("Error al exportar a Excel:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Ocurrió un error al intentar exportar las ventas a Excel."
    });
    return false;
  }
}
