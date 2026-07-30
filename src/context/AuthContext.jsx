import { createContext, useState } from "react";
import Swal from "sweetalert2";
import { writeLog } from "../utils/logger";

export const AuthContext = createContext();

/** Perfiles locales de respaldo (solo Jhon y Super Admin) si Sheets no responde. */
export const DEFAULT_USUARIOS = [
  { id: 1, nombre: "Jhon", pin: "1234", rol: "Admin", avatar: "admin" },
  { id: 2, nombre: "Super Administrador", pin: "9999", rol: "SuperAdmin", avatar: "superadmin" }
];

/** Normaliza un registro de Sheets/caché al formato de autenticación. */
export function formatUsuario(u) {
  const rol = String(u.rol || "").trim() || "Admin";
  const rolLower = rol.toLowerCase();
  let avatar = u.avatar;
  if (!avatar) {
    if (rolLower === "superadmin") avatar = "superadmin";
    else if (rolLower === "admin") avatar = "admin";
    else avatar = "vendedor";
  }
  return {
    id: Number(u.id),
    nombre: String(u.nombre || "").trim(),
    pin: String(u.pin ?? ""),
    rol,
    avatar
  };
}

function loadUsuariosFromStorage() {
  try {
    const saved = localStorage.getItem("sgi-usuarios");
    const parsed = saved ? JSON.parse(saved) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Solo Admin / SuperAdmin (ya no se usa el perfil Vendedor)
      const filtrados = parsed
        .map(formatUsuario)
        .filter((u) => {
          const rol = u.rol.toLowerCase();
          return u.id && u.nombre && (rol === "admin" || rol === "superadmin");
        });
      if (filtrados.length > 0) return filtrados;
    }
  } catch {
    // ignore corrupt cache
  }
  return DEFAULT_USUARIOS;
}

export function AuthProvider({ children }) {
  const [usuarios, setUsuarios] = useState(loadUsuariosFromStorage);
  const [usuarioActivo, setUsuarioActivo] = useState(() => {
    const saved = sessionStorage.getItem("sgi-usuario-activo");
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (id, pin) => {
    const user = usuarios.find((u) => u.id === Number(id));
    if (user && String(user.pin) === String(pin)) {
      setUsuarioActivo(user);
      sessionStorage.setItem("sgi-usuario-activo", JSON.stringify(user));
      writeLog({ usuario: user.nombre, accion: "Inicio de sesión", modulo: "Seguridad", detalles: `Rol ${user.rol}` });
      return true;
    }
    Swal.fire({ icon: "error", title: "PIN incorrecto", text: "El PIN ingresado no coincide con el perfil.", confirmButtonColor: "#f59e0b" });
    return false;
  };

  const logout = () => {
    if (usuarioActivo) writeLog({ usuario: usuarioActivo.nombre, accion: "Cierre de sesión", modulo: "Seguridad" });
    setUsuarioActivo(null);
    sessionStorage.removeItem("sgi-usuario-activo");
  };

  return (
    <AuthContext.Provider value={{ usuarios, setUsuarios, usuarioActivo, setUsuarioActivo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
