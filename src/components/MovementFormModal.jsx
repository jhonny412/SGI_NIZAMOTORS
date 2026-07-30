import { useState, useEffect, useRef, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

export default function MovementFormModal({ abierto, onCerrar }) {
  const { productos, registrarMovimiento } = useInventory();
  const { t } = useTranslation();
  const [form, setForm] = useState({ productoId: "", tipo: "entrada", cantidad: 1, motivo: "" });
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Autocomplete search states
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const containerRef = useRef(null);

  const productosFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return productos.filter(
      (p) => {
        if (!p) return false;
        // En caso de salida, solo permitir productos con stock mayor a 0
        if (form.tipo === "salida" && p.stock <= 0) return false;

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
  }, [searchTerm, productos, form.tipo]);

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

  useEffect(() => {
    if (form.productoId) {
      setProductoSeleccionado(productos.find((p) => p.id === parseInt(form.productoId)));
    } else {
      setProductoSeleccionado(null);
    }
  }, [form.productoId, productos]);

  useEffect(() => {
    if (abierto) {
      setForm({ productoId: "", tipo: "entrada", cantidad: 1, motivo: "" });
      setSearchTerm("");
      setDropdownAbierto(false);
    }
  }, [abierto]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const nextForm = { ...prev, [name]: name === "motivo" ? value.toUpperCase() : value };
      // Si cambia a salida y el producto seleccionado actual tiene stock <= 0, limpiamos la selección
      if (name === "tipo" && value === "salida" && productoSeleccionado && productoSeleccionado.stock <= 0) {
        nextForm.productoId = "";
        setSearchTerm("");
      }
      return nextForm;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.productoId || form.cantidad <= 0) {
      Swal.fire({ icon: "warning", title: t("forms.product.required_fields"), text: t("forms.movement.required_message") });
      return;
    }
    const ok = registrarMovimiento({
      productoId: parseInt(form.productoId),
      tipo: form.tipo,
      cantidad: parseInt(form.cantidad),
      motivo: form.motivo,
    });
    if (ok) onCerrar();
  }

  const isEntrada = form.tipo === "entrada";

  const isDirty = () => {
    return !!form.productoId || form.cantidad !== 1 || !!form.motivo;
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

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div className="modal-content max-w-lg w-full mx-4 sm:mx-auto animate-slide-up border-[#334155]">
        {/* Redesigned Modal Header */}
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                Módulo de Movimientos
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">swap_horiz</span>
              {t("forms.movement.title")}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {t("forms.movement.subtitle")}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t("forms.movement.type")}</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                isEntrada
                  ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400 shadow-sm shadow-emerald-500/5"
                  : "border-[#334155]/60 bg-slate-950/60 text-slate-455 hover:border-slate-600"
              }`}>
                <input type="radio" name="tipo" value="entrada" checked={isEntrada} onChange={handleChange} className="sr-only" />
                <span className="material-symbols-outlined text-emerald-500 text-lg">arrow_upward</span>
                <span className="font-bold text-sm">{t("pages.dashboard.entry")}</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                !isEntrada
                  ? "border-rose-500/50 bg-rose-950/20 text-rose-400 shadow-sm shadow-rose-500/5"
                  : "border-[#334155]/60 bg-slate-950/60 text-slate-455 hover:border-slate-600"
              }`}>
                <input type="radio" name="tipo" value="salida" checked={!isEntrada} onChange={handleChange} className="sr-only" />
                <span className="material-symbols-outlined text-rose-500 text-lg">arrow_downward</span>
                <span className="font-bold text-sm">{t("pages.dashboard.exit")}</span>
              </label>
            </div>
          </div>

          <div className="relative w-full" ref={containerRef}>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t("forms.movement.product")} <span className="text-amber-500">*</span></label>
            <div className="relative">
              <input
                type="text"
                placeholder={t("forms.movement.product_placeholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setDropdownAbierto(true);
                  if (form.productoId) {
                    setForm((prev) => ({ ...prev, productoId: "" }));
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
                {productosFiltrados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, productoId: p.id.toString() }));
                        setSearchTerm(p.descripcion);
                        setDropdownAbierto(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-amber-500/5 transition-colors flex flex-col gap-0.5 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-200">
                        {p.descripcion}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Código: {p.codigo} {p.oem ? `· OEM: ${p.oem}` : ""} · Stock: {p.stock}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {productoSeleccionado && (
              <div className="mt-2 px-3 py-2 bg-slate-950/60 rounded-xl text-xs text-slate-400 flex items-center gap-2 border border-[#334155]/40">
                <span>{t("pages.kardex.info.stock")}</span>
                <strong className={productoSeleccionado.stock <= 5 ? "text-rose-500 font-bold" : "text-emerald-500 font-bold"}>
                  {productoSeleccionado.stock}
                </strong>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t("forms.movement.quantity")} <span className="text-amber-500">*</span></label>
            <input name="cantidad" type="number" min="1" value={form.cantidad} onChange={handleChange} className="input-field" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t("forms.movement.reason")}</label>
            <input name="motivo" value={form.motivo} onChange={handleChange} placeholder={t("forms.movement.reason_placeholder")} className="input-field" />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[#334155]/60 mt-2">
            <button type="button" onClick={handleCerrar} className="btn-secondary py-2.5 px-5 text-sm rounded-xl">{t("forms.product.cancel")}</button>
            <button type="submit" className={`${isEntrada ? "btn-success" : "btn-danger"} py-2.5 px-5 text-sm rounded-xl`}>
              {t("forms.movement.register")} {isEntrada ? t("pages.dashboard.entry") : t("pages.dashboard.exit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
