import { useState, useEffect } from "react";

export default function UsuarioFormModal({ usuario, onGuardar, onCerrar }) {
  const esEdicion = !!usuario;

  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [rol, setRol] = useState("Vendedor");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre || "");
      setPin(usuario.pinOriginal || usuario.pin || "");
      setRol(usuario.rol || "Vendedor");
    } else {
      setNombre("");
      setPin("");
      setRol("Vendedor");
    }
  }, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre.trim()) return;
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return;

    setGuardando(true);
    try {
      await onGuardar({
        ...(usuario ? { id: usuario.id } : {}),
        nombre: nombre.trim(),
        pin,
        rol
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay z-50" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-content max-w-md w-full mx-4 sm:mx-auto animate-slide-up border-[#334155]">
        {/* Header */}
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-widest bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-700/60 shadow-xs">
                {esEdicion ? "EDITAR USUARIO" : "NUEVO USUARIO"}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-cyan-400">group_add</span>
              {esEdicion ? "Editar Usuario" : "Agregar Usuario"}
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-1">
              {esEdicion ? "Modifica los datos del usuario seleccionado" : "Registra un nuevo perfil de acceso al sistema"}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="relative z-10 text-slate-400 hover:text-white transition-all p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nombre del usuario <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Carlos Pérez"
              className="input-field"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          {/* PIN */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              PIN de acceso (4 dígitos) <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                if (val.length <= 4) setPin(val);
              }}
              placeholder="Ej: 1234"
              className="input-field font-mono tracking-[0.5em] text-center text-lg font-bold"
              required
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]{4}"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              El usuario usará este PIN para iniciar sesión.
            </p>
          </div>

          {/* Rol */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Rol del usuario <span className="text-amber-500">*</span>
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="select-field w-full"
            >
              <option value="Vendedor">Vendedor</option>
              <option value="Admin">Admin</option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {rol === "Admin"
                ? "Acceso completo a todos los módulos del sistema."
                : "Acceso restringido al módulo Comercial (Ventas y Créditos)."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]/60">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={guardando || !nombre.trim() || pin.length !== 4}
            >
              {guardando ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Guardando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">{esEdicion ? "save" : "person_add"}</span>
                  {esEdicion ? "Guardar Cambios" : "Crear Usuario"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
