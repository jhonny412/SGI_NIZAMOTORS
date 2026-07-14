import { useState, useEffect, useRef, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

export default function TrasladoFormModal({ abierto, onCerrar }) {
  const { productos, tiendasVecinas, agregarTraslado } = useInventory();
  const { t } = useTranslation();

  const [tiendaVecina, setTiendaVecina] = useState("");
  const [notas, setNotas] = useState("");

  // Lista de ítems agregados al préstamo
  const [items, setItems] = useState([]); // [{ productoId, cantidad }]

  // Selector temporal para agregar un nuevo ítem
  const [productoSelId, setProductoSelId] = useState("");
  const [cantidadSel, setCantidadSel] = useState(1);

  // Autocomplete search states
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const containerRef = useRef(null);

  // Filter products based on search term
  const productosFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return productos.filter(
      (p) => {
        if (!term) return true;
        const desc = p.descripcion ? String(p.descripcion).toLowerCase() : "";
        const cod = p.codigo ? String(p.codigo).toLowerCase() : "";
        const oem = p.oem ? String(p.oem).toLowerCase() : "";
        return (
          desc.includes(term) ||
          cod.includes(term) ||
          oem.includes(term)
        );
      }
    );
  }, [searchTerm, productos]);

  // Click outside autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setDropdownAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calcular stock disponible restando lo ya comprometido en la lista temporal
  const stockDisponible = (productoId) => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return 0;
    const yaAgregado = items.find((i) => i.productoId === productoId)?.cantidad || 0;
    return prod.stock - yaAgregado;
  };

  const productoEnSel = productos.find((p) => p.id === parseInt(productoSelId));
  const maxCantidad = productoEnSel ? stockDisponible(productoEnSel.id) : 0;

  // Total general
  const totalGeneral = items.reduce((sum, item) => {
    const prod = productos.find((p) => p.id === item.productoId);
    return sum + (prod ? prod.pVenta * item.cantidad : 0);
  }, 0);

  const cantidadTotal = items.reduce((sum, i) => sum + i.cantidad, 0);

  useEffect(() => {
    if (abierto) {
      setTiendaVecina("");
      setNotas("");
      setItems([]);
      setProductoSelId("");
      setCantidadSel(1);
      setSearchTerm("");
      setDropdownAbierto(false);
    }
  }, [abierto]);

  useEffect(() => {
    if (productoEnSel && cantidadSel > maxCantidad) {
      setCantidadSel(Math.max(1, maxCantidad));
    }
    if (cantidadSel < 1) setCantidadSel(1);
  }, [productoSelId, cantidadSel, maxCantidad, productoEnSel]);

  const isDirty = () => {
    return !!tiendaVecina || !!notas || items.length > 0 || !!searchTerm;
  };

  const handleCerrar = () => {
    if (isDirty()) {
      Swal.fire({
        title: "¿Descartar cambios?",
        text: "Hay cambios sin guardar en el formulario.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Sí, descartar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          onCerrar();
        }
      });
    } else {
      onCerrar();
    }
  };

  if (!abierto) return null;

  // Agregar ítem a la lista temporal
  function handleAgregar() {
    if (!productoSelId || cantidadSel < 1) return;
    const pid = parseInt(productoSelId);
    const disp = stockDisponible(pid);
    if (cantidadSel > disp) {
      Swal.fire({ icon: "warning", title: "Sin stock suficiente", text: `Solo hay ${disp} disponibles.`, timer: 2000, showConfirmButton: false });
      return;
    }
    // Si el producto ya está, actualizar su cantidad
    setItems((prev) => {
      const existe = prev.find((i) => i.productoId === pid);
      if (existe) {
        return prev.map((i) =>
          i.productoId === pid
            ? { ...i, cantidad: Math.min(i.cantidad + cantidadSel, stockDisponible(pid) + (existe?.cantidad || 0)) }
            : i
        );
      }
      return [...prev, { productoId: pid, cantidad: cantidadSel }];
    });
    setProductoSelId("");
    setCantidadSel(1);
    setSearchTerm("");
  }

  function handleEliminarItem(productoId) {
    const prod = productos.find((p) => p.id === productoId);
    Swal.fire({
      title: "¿Quitar repuesto?",
      text: prod ? `"${prod.descripcion}" será eliminado de este préstamo.` : "¿Confirmar eliminación?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#334155",
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        setItems((prev) => prev.filter((i) => i.productoId !== productoId));
      }
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!tiendaVecina) {
      Swal.fire({ icon: "error", title: "Error", text: "Selecciona la tienda vecina." });
      return;
    }
    if (items.length === 0) {
      Swal.fire({ icon: "error", title: "Error", text: "Agrega al menos un repuesto al préstamo." });
      return;
    }
    const exito = await agregarTraslado({ tiendaVecina, items, notas });
    if (exito) onCerrar();
  }

  return (
    <div className="modal-overlay z-50" onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div className="modal-content max-w-2xl w-full animate-slide-up border-[#334155]">
        {/* Header */}
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">Módulo de Préstamos</span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">swap_horiz</span>
              Nuevo Préstamo a Tienda Vecina
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Agrega uno o más repuestos al mismo ticket de préstamo
            </p>
          </div>
          <button
            type="button"
            onClick={handleCerrar}
            className="text-slate-400 hover:text-white transition-all p-1.5 rounded-xl hover:bg-white/10 relative z-10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body space-y-5 max-h-[70vh] overflow-y-auto">

            {/* Tienda Vecina */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Tienda Vecina <span className="text-amber-500">*</span>
              </label>
              <select
                value={tiendaVecina}
                onChange={(e) => setTiendaVecina(e.target.value)}
                className="select-field w-full"
                required
              >
                <option value="">Seleccionar tienda...</option>
                {tiendasVecinas.map((tn, index) => (
                  <option key={index} value={tn}>{tn}</option>
                ))}
              </select>
            </div>

            {/* Separador */}
            <div className="border-t border-[#334155]/60 pt-4">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                Repuestos a Prestar
              </p>

              {/* Fila para agregar repuesto */}
              <div className="bg-slate-950/40 rounded-xl p-4 border border-[#334155]/40">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <div className="relative w-full" ref={containerRef}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Repuesto</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar por código, descripción o OEM..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setDropdownAbierto(true);
                          if (productoSelId) {
                            setProductoSelId("");
                          }
                        }}
                        onFocus={() => setDropdownAbierto(true)}
                        className="input-field pl-9 w-full text-sm py-2.5"
                      />
                      <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-sm">search</span>
                    </div>

                    {/* Menú predictivo flotante */}
                    {dropdownAbierto && productosFiltrados.length > 0 && (
                      <ul className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto bg-slate-900 border border-[#334155] rounded-xl shadow-xl divide-y divide-[#334155]/40">
                        {productosFiltrados.map((p) => {
                          const disponible = stockDisponible(p.id);
                          const puedeSeleccionar = disponible > 0;
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (puedeSeleccionar) {
                                    setProductoSelId(p.id.toString());
                                    setSearchTerm(p.descripcion);
                                    setDropdownAbierto(false);
                                  }
                                }}
                                disabled={!puedeSeleccionar}
                                className={`w-full text-left px-4 py-3 transition-colors flex flex-col gap-0.5 ${
                                  puedeSeleccionar 
                                    ? "hover:bg-amber-500/5 cursor-pointer" 
                                    : "opacity-40 cursor-not-allowed"
                                }`}
                              >
                                <span className="text-xs font-bold text-slate-200">
                                  {p.descripcion}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Código: {p.codigo} {p.oem ? `· OEM: ${p.oem}` : ""} · Stock: {disponible} {!puedeSeleccionar ? '(Sin stock)' : ''}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cant.</label>
                    <input
                      type="number"
                      min="1"
                      max={maxCantidad || 1}
                      value={cantidadSel}
                      onChange={(e) => setCantidadSel(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-field w-24 text-sm"
                      disabled={!productoEnSel}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAgregar}
                    disabled={!productoSelId || maxCantidad === 0}
                    className="btn-primary py-2.5 px-4.5 text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Agregar
                  </button>
                </div>

                {/* Precio de referencia */}
                {productoEnSel && (
                  <div className="mt-3 flex gap-4 text-xs font-medium text-slate-400">
                    <span>P. Venta: <strong className="text-slate-300">S/. {productoEnSel.pVenta?.toFixed(2)}</strong></span>
                    <span>Subtotal: <strong className="text-amber-500 font-bold">S/. {(productoEnSel.pVenta * cantidadSel).toFixed(2)}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla de ítems seleccionados */}
            {items.length > 0 && (
              <div className="border border-[#334155]/40 rounded-xl overflow-hidden bg-slate-900/20">
                <table className="min-w-full">
                  <thead className="bg-slate-950/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Repuesto</th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Cant.</th>
                      <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">P. Venta</th>
                      <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Subtotal</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-950/20 divide-y divide-[#334155]/30">
                    {items.map((item) => {
                      const prod = productos.find((p) => p.id === item.productoId);
                      if (!prod) return null;
                      const sub = prod.pVenta * item.cantidad;
                      return (
                        <tr key={item.productoId} className="hover:bg-amber-500/5 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="text-sm font-bold text-slate-200 leading-tight">{prod.descripcion}</div>
                            <div className="text-[11px] text-slate-500 mt-1 font-mono">{prod.codigo}</div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 min-w-[2rem] rounded-lg bg-amber-950/40 text-amber-500 font-extrabold text-xs border border-amber-550/20">
                              {item.cantidad}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-400">
                            S/. {prod.pVenta?.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm font-extrabold text-slate-200">
                            S/. {sub.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleEliminarItem(item.productoId)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-rose-950/30 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              title="Quitar"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-950/40 border-t border-[#334155]/60">
                    <tr>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-450">
                        {items.length} repuesto(s) — {cantidadTotal} unid. total
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">
                        Total General
                      </td>
                      <td className="px-4 py-3 text-right text-base font-extrabold text-amber-500">
                        S/. {totalGeneral.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Estado vacío */}
            {items.length === 0 && (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-[#334155]/40 rounded-2xl bg-slate-950/20">
                <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">inventory_2</span>
                <p className="text-sm font-semibold text-slate-400">Aún no hay repuestos en este préstamo</p>
                <p className="text-xs text-slate-500 mt-1">Usa el selector de arriba para agregarlos</p>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                {t("forms.transfer.notes")}
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="input-field min-h-16 py-2 text-sm"
                placeholder={t("forms.transfer.notes_placeholder")}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between gap-3 px-6 py-4.5 border-t border-[#334155]/60 bg-slate-950/30 rounded-b-2xl">
            <span className="text-xs font-medium text-slate-400">
              {items.length > 0
                ? <><strong className="text-slate-300 font-bold">{items.length}</strong> repuesto(s) — <strong className="text-amber-500 font-extrabold">S/. {totalGeneral.toFixed(2)}</strong></>
                : "Sin repuestos seleccionados"}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={handleCerrar} className="btn-secondary py-2 px-5 text-sm rounded-xl">
                {t("forms.transfer.cancel")}
              </button>
              <button
                type="submit"
                disabled={!tiendaVecina || items.length === 0}
                className="btn-primary py-2 px-5 text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                Registrar Préstamo
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
