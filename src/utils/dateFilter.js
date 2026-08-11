export function getDateOnly(fecha) {
  if (!fecha) return "";
  return fecha.includes("T") ? fecha.split("T")[0] : fecha;
}

export function filterByDateRange(items, fechaDesde, fechaHasta, dateField = "fecha") {
  return items.filter((item) => {
    const dateOnly = getDateOnly(item[dateField]);
    if (!dateOnly) return false;
    if (fechaDesde && dateOnly < fechaDesde) return false;
    if (fechaHasta && dateOnly > fechaHasta) return false;
    return true;
  });
}

export function getDefaultDateRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const toInput = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { desde: toInput(firstDay), hasta: toInput(today) };
}
