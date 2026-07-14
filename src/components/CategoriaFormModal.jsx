import { useState, useEffect } from "react";
import { useInventory } from "../context/useInventory";
import Swal from "sweetalert2";

export default function CategoriaFormModal({ categoria, abierto, onCerrar }) {
  const { agregarCategoria, editarCategoria, categorias } = useInventory();
  const [form, setForm] = useState({ nombre: "", descripcion: "" });

  useEffect(() => {
    if (categoria) {
      setForm({ nombre: categoria.nombre || "", descripcion: categoria.descripcion || "" });
    } else {
      setForm({ nombre: "", descripcion: "" });
    }
  }, [categoria, abierto]);

  const isDirty = () => {
    const initial = categoria || { nombre: "", descripcion: "" };
    return (form.nombre || "") !== (initial.nombre || "") || (form.descripcion || "") !== (initial.descripcion || "");
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

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "nombre" ? value.toUpperCase() : value,
    }));
  }

  function normalizarTexto(texto) {
    return texto.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      Swal.fire({ icon: "warning", title: "Campo requerido", text: "El nombre de la categoría es obligatorio." });
      return;
    }

    const nombreNormalizado = normalizarTexto(form.nombre);

    const categoriaExistente = categorias.find(
      (c) => normalizarTexto(c.nombre) === nombreNormalizado && c.id !== categoria?.id
    );

    if (categoriaExistente) {
      Swal.fire({
        icon: "error",
        title: "Categoría duplicada",
        text: `La categoría "${form.nombre.trim()}" ya está registrada en el sistema.`,
      });
      return;
    }

    if (categoria) {
      editarCategoria({ ...form, id: categoria.id });
    } else {
      agregarCategoria(form);
    }
    onCerrar();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div className="modal-content max-w-md animate-scale-in">
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                Módulo de Categorías
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">category</span>
              {categoria ? "Editar Categoría" : "Nueva Categoría"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {categoria ? "Modifica los datos de la categoría" : "Registra una nueva categoría de producto"}
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
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder="Ej: FILTROS, FRENOS, SUSPENSIÓN..."
              className="input-field font-semibold tracking-wide"
              autoFocus
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Se guardará en mayúsculas automáticamente.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Descripción <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={3}
              placeholder="Breve descripción de los productos que incluye esta categoría..."
              className="input-field py-2 resize-none text-sm"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-2">
            <button type="button" onClick={handleCerrar} className="btn-secondary py-2.5 px-5 text-sm rounded-xl">
              Cancelar
            </button>
            <button type="submit" className="btn-primary py-2.5 px-5 text-sm rounded-xl">
              {categoria ? "Guardar Cambios" : "Agregar Categoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
