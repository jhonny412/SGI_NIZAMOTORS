import { useState, useEffect } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

export default function SupplierFormModal({ proveedor, abierto, onCerrar }) {
  const { agregarProveedor, editarProveedor, proveedores } = useInventory();
  const { t } = useTranslation();
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });

  useEffect(() => {
    if (proveedor) {
      setForm({ nombre: proveedor.nombre, telefono: proveedor.telefono, email: proveedor.email });
    } else {
      setForm({ nombre: "", telefono: "", email: "" });
    }
  }, [proveedor, abierto]);

  const isDirty = () => {
    const initial = proveedor || { nombre: "", telefono: "", email: "" };
    return (form.nombre || "") !== (initial.nombre || "") || (form.telefono || "") !== (initial.telefono || "") || (form.email || "") !== (initial.email || "");
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
    setForm((prev) => ({ ...prev, [name]: name === "email" ? value : value.toUpperCase() }));
  }

  function normalizarTexto(texto) {
    return texto.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre) {
      Swal.fire({ icon: "warning", title: t("forms.product.required_fields"), text: t("forms.supplier.required_message") });
      return;
    }

    const nombreNormalizado = normalizarTexto(form.nombre);

    const proveedorExistente = proveedores.find(
      (p) => normalizarTexto(p.nombre) === nombreNormalizado && p.id !== proveedor?.id
    );

    if (proveedorExistente) {
      Swal.fire({
        icon: "error",
        title: "Proveedor duplicado",
        text: `El proveedor "${form.nombre.trim()}" ya está registrado en el sistema.`,
      });
      return;
    }

    if (proveedor) {
      editarProveedor({ ...form, id: proveedor.id });
    } else {
      agregarProveedor(form);
    }
    onCerrar();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div className="modal-content max-w-md w-full mx-4 sm:mx-auto animate-scale-in">
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                Módulo de Proveedores
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">local_shipping</span>
              {proveedor ? t("forms.supplier.edit_title") : t("forms.supplier.new_title")}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {proveedor ? t("forms.product.edit_subtitle") : t("forms.product.new_subtitle")}
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
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              {t("forms.supplier.name")} <span className="text-rose-500">*</span>
            </label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder={t("forms.supplier.name_placeholder")}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t("forms.supplier.phone")}</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              placeholder={t("forms.supplier.phone_placeholder")}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t("forms.supplier.email")}</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t("forms.supplier.email_placeholder")}
              className="input-field"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-2">
            <button type="button" onClick={handleCerrar} className="btn-secondary py-2.5 px-5 text-sm rounded-xl">
              {t("forms.product.cancel")}
            </button>
            <button type="submit" className="btn-primary py-2.5 px-5 text-sm rounded-xl">
              {proveedor ? t("forms.product.save") : t("forms.product.add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
