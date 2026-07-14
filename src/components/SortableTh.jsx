export default function SortableTh({ campo, children, align = "left", orden, onSort }) {
  const active = !!(campo && orden && orden.campo === campo);

  return (
    <th
      onClick={() => campo && onSort(campo)}
      className={`py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 select-none ${
        campo ? "cursor-pointer hover:text-red-600 transition-colors" : ""
      } ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={orden.dir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        )}
      </span>
    </th>
  );
}
