import { createContext, useState } from "react";
import Swal from "sweetalert2";
import { writeLog } from "../utils/logger";
import { hashPin, generateSessionToken } from "../utils/security";

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
      const filtrados = parsed
        .map(formatUsuario)
        .filter((u) => {
          const rol = u.rol.toLowerCase();
          return u.id && u.nombre && (rol === "admin" || rol === "superadmin" || rol === "vendedor");
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

  const login = async (id, pinIngresado) => {
    const user = usuarios.find((u) => u.id === Number(id));
    if (!user) {
      Swal.fire({ icon: "error", title: "Perfil no encontrado", text: "El perfil de usuario seleccionado no existe.", confirmButtonColor: "#f59e0b" });
      return false;
    }

    const hashedInput = hashPin(pinIngresado);
    const pinValido = String(user.pin) === String(pinIngresado) || String(user.pin) === hashedInput;

    if (pinValido) {
      // Guardar el usuario con su PIN hasheado
      const userConHash = { ...user, pin: hashedInput };
      setUsuarioActivo(userConHash);
      sessionStorage.setItem("sgi-usuario-activo", JSON.stringify(userConHash));

      // Generar token de sesión y almacenar para encabezados Bearer
      const token = generateSessionToken(userConHash);
      sessionStorage.setItem("sgi-auth-token", token);

      await writeLog({ usuario: user.nombre, accion: "Inicio de sesión seguro", modulo: "Seguridad", detalles: `Rol ${user.rol}`, estado: "success" });
      return true;
    }

    await writeLog({
      usuario: user ? user.nombre : `ID: ${id}`,
      accion: "Intento fallido de inicio de sesión",
      modulo: "Seguridad",
      detalles: user ? "PIN ingresado incorrecto" : "Perfil de usuario no encontrado",
      estado: "error"
    });

    Swal.fire({ icon: "error", title: "PIN incorrecto", text: "El PIN ingresado no coincide con el perfil.", confirmButtonColor: "#f59e0b" });
    return false;
  };

  const logout = () => {
    if (usuarioActivo) writeLog({ usuario: usuarioActivo.nombre, accion: "Cierre de sesión", modulo: "Seguridad" });
    setUsuarioActivo(null);
    sessionStorage.removeItem("sgi-usuario-activo");
    sessionStorage.removeItem("sgi-auth-token");
  };

  return (
    <AuthContext.Provider value={{ usuarios, setUsuarios, usuarioActivo, setUsuarioActivo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
