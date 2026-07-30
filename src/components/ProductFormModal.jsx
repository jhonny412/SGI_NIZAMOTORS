import { useState, useEffect } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

function InputField({ label, name, value, onChange, type = "text", required, placeholder, min, max, step, colSpan }) {
  return (
    <div className={colSpan || ""}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {label} {required && <span className="text-amber-500">*</span>}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="input-field"
      />
    </div>
  );
}

export default function ProductFormModal({ producto, abierto, onCerrar }) {
  const { agregarProducto, editarProducto, proveedores, marcas, categorias } = useInventory();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    oem: "", codigo: "", descripcion: "", categoria: "", marca: "", stock: 0,
    pCompra: 0, margGanancia: 0, proveedorId: "", imagenUrl: "", imagenUrl2: "", imagenUrl3: "",
  });

  useEffect(() => {
    if (producto) {
      setForm({
        oem: producto.oem, codigo: producto.codigo,
        descripcion: producto.descripcion, categoria: producto.categoria || "", marca: producto.marca || "", stock: producto.stock,
        pCompra: producto.pCompra, margGanancia: producto.margGanancia,
        proveedorId: producto.proveedorId, imagenUrl: producto.imagenUrl || "", imagenUrl2: producto.imagenUrl2 || "", imagenUrl3: producto.imagenUrl3 || "",
      });
    } else {
      setForm({ oem: "", codigo: "", descripcion: "", categoria: "", marca: "", stock: 0, pCompra: 0, margGanancia: 0, proveedorId: "", imagenUrl: "", imagenUrl2: "", imagenUrl3: "" });
    }
  }, [producto, abierto]);

  const isDirty = () => {
    const initial = producto || {
      oem: "", codigo: "", descripcion: "", categoria: "", marca: "", stock: 0,
      pCompra: 0, margGanancia: 0, proveedorId: "", imagenUrl: "", imagenUrl2: "", imagenUrl3: ""
    };
    return Object.keys(initial).some(key => {
      if (["id", "pVenta", "utilidad", "proveedorNombre"].includes(key)) return false;
      const valForm = form[key] === undefined || form[key] === null ? "" : form[key].toString();
      const valInitial = initial[key] === undefined || initial[key] === null ? "" : initial[key].toString();
      return valForm !== valInitial;
    });
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

  const pVenta = (form.pCompra > 0 && form.margGanancia < 100)
    ? parseFloat((form.pCompra / (1 - form.margGanancia / 100)).toFixed(2))
    : 0;
  const utilidad = pVenta > 0 ? parseFloat((pVenta - form.pCompra).toFixed(2)) : 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["pCompra", "margGanancia", "stock"].includes(name)
        ? parseFloat(value) || 0
        : name.startsWith("imagenUrl") ? value : value.toUpperCase(),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.descripcion || !form.codigo || !form.proveedorId) {
      Swal.fire({ icon: "warning", title: t("forms.product.required_fields"), text: t("forms.product.required_message") });
      return;
    }
    const data = { ...form, proveedorId: parseInt(form.proveedorId) };
    if (producto) {
      editarProducto({ ...data, id: producto.id });
    } else {
      agregarProducto(data);
    }
    onCerrar();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div className="modal-content max-w-2xl w-full mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
        {/* Redesigned Modal Header */}
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155] sticky top-0 z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                Módulo de Productos
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">inventory_2</span>
              {producto ? t("forms.product.edit_title") : t("forms.product.new_title")}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {producto ? t("forms.product.edit_subtitle") : t("forms.product.new_subtitle")}
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

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField label={t("forms.product.oem")} name="oem" value={form.oem} onChange={handleChange} placeholder={t("forms.product.oem_placeholder")} />
          <InputField label={t("forms.product.code")} name="codigo" value={form.codigo} onChange={handleChange} required placeholder={t("forms.product.code_placeholder")} />
          
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              {t("forms.product.description")} <span className="text-amber-500">*</span>
            </label>
            <input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              required
              placeholder={t("forms.product.description_placeholder")}
              className="input-field"
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="URL Imagen 1" name="imagenUrl" value={form.imagenUrl || ""} onChange={handleChange} placeholder="https://..." />
            <InputField label="URL Imagen 2" name="imagenUrl2" value={form.imagenUrl2 || ""} onChange={handleChange} placeholder="https://..." />
            <InputField label="URL Imagen 3" name="imagenUrl3" value={form.imagenUrl3 || ""} onChange={handleChange} placeholder="https://..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Categoría
            </label>
            <select
              name="categoria"
              value={form.categoria || ""}
              onChange={handleChange}
              className="select-field"
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Marca
            </label>
            <select
              name="marca"
              value={form.marca || ""}
              onChange={handleChange}
              className="select-field"
            >
              <option value="">Seleccionar marca...</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.nombre}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <InputField label={t("forms.product.stock")} name="stock" value={form.stock} onChange={handleChange} type="number" min="0" />
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              {t("forms.product.supplier")} <span className="text-amber-500">*</span>
            </label>
            <select
              name="proveedorId"
              value={form.proveedorId}
              onChange={handleChange}
              required
              className="select-field"
            >
              <option value="">{t("forms.product.supplier_placeholder")}</option>
              {proveedores.map((prov) => (
                <option key={prov.id} value={prov.id}>{prov.nombre}</option>
              ))}
            </select>
          </div>

  <InputField label={t("forms.product.purchase_price")} name="pCompra" value={form.pCompra} onChange={handleChange} type="number" min="0" step="0.01" placeholder="0.00" />
  <InputField label={t("forms.product.margin")} name="margGanancia" value={form.margGanancia} onChange={handleChange} type="number" min="0" max="99.99" step="0.01" placeholder="0" />
          
          {/* Sale and Profit Cards */}
          <div className="md:col-span-2 col-span-1">
            <div className="rounded-2xl border border-[#334155] bg-slate-950/20 p-4 grid grid-cols-2 gap-4 shadow-inner">
              <div className="bg-slate-900 rounded-xl p-4 border border-[#334155]/60 shadow-sm transition-all hover:scale-[1.02]">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t("forms.product.sale_price")}</span>
                <p className="text-2xl font-extrabold text-amber-550 mt-1">S/. {pVenta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-slate-900 rounded-xl p-4 border border-[#334155]/60 shadow-sm transition-all hover:scale-[1.02]">
                <span className="text-[10px] font-black text-emerald-450 uppercase tracking-widest">{t("forms.product.profit")}</span>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">S/. {utilidad.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 col-span-1 flex gap-3 justify-end pt-4 border-t border-[#334155]/60 mt-2">
            <button type="button" onClick={handleCerrar} className="btn-secondary py-2.5 px-5 text-sm rounded-xl">
              {t("forms.product.cancel")}
            </button>
            <button type="submit" className="btn-primary py-2.5 px-5 text-sm rounded-xl">
              {producto ? t("forms.product.save") : t("forms.product.add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
