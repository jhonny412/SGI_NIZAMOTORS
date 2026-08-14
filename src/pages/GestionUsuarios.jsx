import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { postAction } from "../services/api";
import { writeLog } from "../utils/logger";
import { formatUsuario } from "../context/AuthContext";
import UsuarioFormModal from "../components/UsuarioFormModal";
import Swal from "sweetalert2";

export default function GestionUsuarios() {
  const { usuarios, setUsuarios, usuarioActivo } = useAuth();

  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Abrir modal para crear
  const handleNuevo = () => {
    setUsuarioEditar(null);
    setMostrarModal(true);
  };

  // Abrir modal para editar
  const handleEditar = (user) => {
    setUsuarioEditar(user);
    setMostrarModal(true);
  };

  // Guardar (crear o editar)
  const handleGuardar = async (datos) => {
    setGuardando(true);
    try {
      const isEdit = !!datos.id;

      if (isEdit) {
        // Editar usuario existente
        await postAction("Usuarios", "edit", {
          id: datos.id,
          nombre: datos.nombre,
          pin: datos.pin,
          rol: datos.rol
        });

        // Actualizar estado local
        setUsuarios((prev) => {
          const updated = prev.map((u) =>
            u.id === datos.id
              ? formatUsuario({ ...u, nombre: datos.nombre, pin: datos.pin, rol: datos.rol })
              : u
          );
          localStorage.setItem("sgi-usuarios", JSON.stringify(updated));
          return updated;
        });

        writeLog({
          usuario: usuarioActivo?.nombre || "Sistema",
          accion: "Editar Usuario",
          modulo: "Usuarios",
          detalles: `ID: ${datos.id}, Nombre: ${datos.nombre}, Rol: ${datos.rol}`
        });

        Swal.fire({
          icon: "success",
          title: "Usuario actualizado",
          text: `${datos.nombre} (${datos.rol}) ha sido actualizado exitosamente.`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        // Crear nuevo usuario
        const nuevoId = usuarios.length > 0 ? Math.max(...usuarios.map((u) => u.id)) + 1 : 1;

        const result = await postAction("Usuarios", "create", {
          id: nuevoId,
          nombre: datos.nombre,
          pin: datos.pin,
          rol: datos.rol
        });

        const nuevoUsuario = formatUsuario({
          id: result?.id || nuevoId,
          nombre: datos.nombre,
          pin: datos.pin,
          rol: datos.rol
        });

        setUsuarios((prev) => {
          const updated = [...prev, nuevoUsuario];
          localStorage.setItem("sgi-usuarios", JSON.stringify(updated));
          return updated;
        });

        writeLog({
          usuario: usuarioActivo?.nombre || "Sistema",
          accion: "Crear Usuario",
          modulo: "Usuarios",
          detalles: `ID: ${nuevoUsuario.id}, Nombre: ${datos.nombre}, Rol: ${datos.rol}`
        });

        Swal.fire({
          icon: "success",
          title: "Usuario creado",
          text: `${datos.nombre} (${datos.rol}) ha sido registrado exitosamente.`,
          timer: 2000,
          showConfirmButton: false
        });
      }

      setMostrarModal(false);
      setUsuarioEditar(null);
    } catch (err) {
      console.error("Error al guardar usuario:", err);
      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: `Error al ${usuarioEditar ? "Editar" : "Crear"} Usuario`,
        modulo: "Usuarios",
        detalles: `Nombre: ${datos.nombre}, Error: ${err.message}`,
        estado: "error"
      });
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `No se pudo guardar el usuario: ${err.message}`
      });
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar usuario
  const handleEliminar = (user) => {
    // No permitir eliminar al usuario activo
    if (user.id === usuarioActivo?.id) {
      Swal.fire({
        icon: "warning",
        title: "Acción no permitida",
        text: "No puedes eliminar tu propio perfil de usuario."
      });
      return;
    }

    Swal.fire({
      title: "¿Eliminar usuario?",
      html: `Se eliminará el perfil de <strong>${user.nombre}</strong> (${user.rol}).<br>Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await postAction("Usuarios", "delete", { id: user.id });

          setUsuarios((prev) => {
            const updated = prev.filter((u) => u.id !== user.id);
            localStorage.setItem("sgi-usuarios", JSON.stringify(updated));
            return updated;
          });

          writeLog({
            usuario: usuarioActivo?.nombre || "Sistema",
            accion: "Eliminar Usuario",
            modulo: "Usuarios",
            detalles: `ID: ${user.id}, Nombre: ${user.nombre}, Rol: ${user.rol}`
          });

          Swal.fire({
            icon: "success",
            title: "Eliminado",
            text: `${user.nombre} ha sido eliminado del sistema.`,
            timer: 2000,
            showConfirmButton: false
          });
        } catch (err) {
          console.error("Error al eliminar usuario:", err);
          writeLog({
            usuario: usuarioActivo?.nombre || "Sistema",
            accion: "Error al Eliminar Usuario",
            modulo: "Usuarios",
            detalles: `ID: ${user.id}, Error: ${err.message}`,
            estado: "error"
          });
          Swal.fire({
            icon: "error",
            title: "Error",
            text: `No se pudo eliminar el usuario: ${err.message}`
          });
        }
      }
    });
  };

  // Rol badge color
  const getRolBadge = (rol) => {
    const r = rol?.toLowerCase();
    if (r === "superadmin") return "bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30";
    if (r === "admin") return "bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30";
    return "bg-purple-500/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#334155]/60 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-500 mb-1">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            <span className="text-[10px] font-black tracking-widest uppercase">ADMINISTRACIÓN</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Gestión de Usuarios</h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm mt-1">
            Administra los perfiles de acceso y roles del sistema.
          </p>
        </div>
        <button
          onClick={handleNuevo}
          className="btn-primary self-start sm:self-center flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>Agregar Usuario</span>
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-500">
            <span className="material-symbols-outlined text-2xl">group</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Usuarios</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{usuarios.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-500">
            <span className="material-symbols-outlined text-2xl">shield_person</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Administradores</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-500">
              {usuarios.filter((u) => u.rol.toLowerCase() === "admin" || u.rol.toLowerCase() === "superadmin").length}
            </p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-500">
            <span className="material-symbols-outlined text-2xl">badge</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vendedores</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {usuarios.filter((u) => u.rol.toLowerCase() === "vendedor").length}
            </p>
          </div>
        </div>
      </div>

      {/* User table */}
      <div className="bg-white dark:bg-[#1c253b] rounded-xl border border-slate-200 dark:border-[#334155] overflow-hidden shadow-xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-[#334155]">
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuario</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Rol</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]/20">
              {usuarios.map((user) => {
                const esMismo = user.id === usuarioActivo?.id;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold">{user.id}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                          user.rol.toLowerCase() === "admin" || user.rol.toLowerCase() === "superadmin"
                            ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950"
                            : "bg-gradient-to-tr from-purple-600 to-indigo-500 text-slate-100"
                        }`}>
                          {user.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{user.nombre}</p>
                          {esMismo && (
                            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                              (Sesión activa)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRolBadge(user.rol)}`}>
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditar(user)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:border-amber-500/40 transition-all cursor-pointer"
                          title="Editar usuario"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleEliminar(user)}
                          disabled={esMismo}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            esMismo
                              ? "border-slate-200 dark:border-[#334155]/30 bg-slate-100 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                              : "border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:border-red-500/40"
                          }`}
                          title={esMismo ? "No puedes eliminar tu propio perfil" : "Eliminar usuario"}
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {mostrarModal && (
        <UsuarioFormModal
          usuario={usuarioEditar}
          onGuardar={handleGuardar}
          onCerrar={() => {
            setMostrarModal(false);
            setUsuarioEditar(null);
          }}
        />
      )}
    </div>
  );
}
