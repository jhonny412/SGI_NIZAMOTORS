import Swal from "sweetalert2";

/**
 * Exporta un listado de movimientos de inventario a Excel con el mismo
 * formato usado en las exportaciones de Ventas: encabezado estilo grilla
 * y contenido en Arial, tamaño 10, color negro y sin negrita.
 *
 * @param {Object}   opts
 * @param {Array}    opts.datos         - Movimientos a exportar (filtrados)
 * @param {Array}    opts.productos     - Catálogo de productos para resolver nombres
 * @param {Function} opts.formatFecha   - Formateador de fecha
 * @param {Function} opts.t             - Función de traducción (i18next)
 * @param {String}   opts.tipo          - "entrada" | "salida" | "kardex"
 * @param {String}   [opts.nombreArchivo] - Nombre base del archivo (sin extensión)
 * @returns {Promise<boolean>} true si la exportación fue exitosa
 */
export async function exportMovimientosExcel({ datos, productos, formatFecha, t, tipo, nombreArchivo = "movimientos" }) {
  try {
    const [exceljsModule, fileSaverModule] = await Promise.all([
      import("exceljs"),
      import("file-saver")
    ]);

    const ExcelJS = exceljsModule.default || exceljsModule;
    const saveAs = fileSaverModule.saveAs || fileSaverModule.default || fileSaverModule;

    const esKardex = tipo === "kardex";

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t("pages.reportes.export_sheet") || "Movimientos");

    // Column definitions mapped exactly to the grid's columns
    const columns = [
      { header: t("pages.reportes.table.date"), key: "fecha", width: 16 },
      { header: t("pages.reportes.table.product"), key: "producto", width: 35 },
      { header: t("pages.reportes.table.code"), key: "codigo", width: 16 },
      ...(esKardex ? [{ header: "Tipo", key: "tipo", width: 14 }] : []),
      { header: t("pages.reportes.table.qty"), key: "cantidad", width: 14 },
      { header: t("pages.reportes.table.reason"), key: "motivo", width: 30 },
      { header: t("pages.reportes.table.stock_prev"), key: "stockAnterior", width: 14 },
      { header: t("pages.reportes.table.stock_new"), key: "stockNuevo", width: 14 }
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
        horizontal: ["cantidad", "stockAnterior", "stockNuevo", "tipo"].includes(key)
          ? "right"
          : "left"
      };
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } }
      };
    });

    // Populate data rows (Arial 10, negro, sin negrita)
    (datos || []).forEach((m) => {
      const prod = productos.find((p) => p.id === m.productoId);
      const isEntrada = m.tipo === "entrada";

      const rowData = {
        fecha: formatFecha(m.fecha),
        producto: prod?.descripcion || t("pages.movimientos.product_deleted") || "Producto eliminado",
        codigo: prod?.codigo || "—",
        tipo: isEntrada ? "ENTRADA" : "SALIDA",
        cantidad: esKardex ? `${isEntrada ? "+" : "-"}${m.cantidad}` : m.cantidad,
        motivo: m.motivo || "—",
        stockAnterior: m.stockAnterior ?? "—",
        stockNuevo: m.stockNuevo ?? "—"
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

        // Alineaciones y formato por columna
        if (col.key === "tipo") {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (col.key === "cantidad" || col.key === "stockAnterior" || col.key === "stockNuevo") {
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
            len = val.toString().length + 4;
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
      title: t("pages.reportes.export_success_title") || "Exportación exitosa",
      text: t("pages.reportes.export_success_text") || "Los registros se han exportado correctamente a Excel.",
      timer: 2000,
      showConfirmButton: false
    });
    return true;
  } catch (error) {
    console.error("Error al exportar a Excel:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Ocurrió un error al intentar exportar los registros a Excel."
    });
    return false;
  }
}
