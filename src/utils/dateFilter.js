export function getLocalDateTimeString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function getDateOnly(fecha) {
  if (!fecha) return "";
  return fecha.split(/[T ]/)[0];
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
