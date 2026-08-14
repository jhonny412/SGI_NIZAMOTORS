import { useState, useEffect, useRef } from "react";
import { useInventory } from "../context/useInventory";
import { useAuth } from "../context/useAuth";
import logoDark from "../assets/logo.png";
import loginBg from "../assets/login-bg.jpg";

function UserAvatar({ avatarType, rol, name, className = "" }) {
  const r = rol?.toLowerCase() || "";
  const isSuper = r === "superadmin";
  const isAdmin = r === "admin" || isSuper;
  const isVendedor = r === "vendedor";

  if (isSuper) {
    return (
      <div className={`rounded-2xl bg-gradient-to-tr from-rose-600 via-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-rose-500/20 ring-2 ring-amber-400/40 relative ${className}`}>
        <span className="material-symbols-outlined text-3xl">workspace_premium</span>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className={`rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40 relative ${className}`}>
        <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/30 relative ${className}`}>
      <span className="material-symbols-outlined text-3xl">storefront</span>
    </div>
  );
}

export default function Login() {
  const { cargando } = useInventory();
  const { usuarios, login } = useAuth();

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [pin, setPin] = useState("");
  const pinInputRef = useRef(null);

  const ejecutarLogin = async (pinCompletado) => {
    if (!usuarioSeleccionado) return;

    const exito = await login(usuarioSeleccionado.id, pinCompletado);
    if (!exito) {
      setPin("");
    }
  };

  const handlePinInput = (num) => {
    if (pin.length < 4) {
      const nuevoPin = pin + num;
      setPin(nuevoPin);

      if (nuevoPin.length === 4) {
        ejecutarLogin(nuevoPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    setPin("");
  }, [usuarioSeleccionado]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!usuarioSeleccionado) return;

      if (e.key >= "0" && e.key <= "9") {
        handlePinInput(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        setUsuarioSeleccionado(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [usuarioSeleccionado, pin]);

  const [timeoutSuperado, setTimeoutSuperado] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (usuarios.length === 0) {
        setTimeoutSuperado(true);
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [usuarios]);

  if ((cargando || usuarios.length === 0) && !timeoutSuperado) {
    return (
      <div className="min-h-screen bg-[#0b1326] flex flex-col items-center justify-center text-slate-200 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={loginBg} alt="Background" className="w-full h-full object-cover opacity-20 filter saturate-[0.8]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1326] via-[#0b1326]/85 to-[#0b1326]/70" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
          <span className="material-symbols-outlined text-amber-500 text-3xl absolute animate-pulse">supervised_user_circle</span>
          <p className="mt-6 text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-slate-400 animate-pulse text-center px-4">
            Obteniendo perfiles de acceso...
          </p>
        </div>
      </div>
    );
  }

  const getRoleBadge = (rol) => {
    const r = rol?.toLowerCase() || "";
    if (r === "superadmin") {
      return { text: "SUPER ADMIN", style: "bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30" };
    }
    if (r === "admin") {
      return { text: "ADMINISTRADOR", style: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30" };
    }
    return { text: "VENDEDOR", style: "bg-purple-500/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30" };
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b1326] text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={loginBg}
          alt="Niza Motors"
          className="w-full h-full object-cover opacity-20 dark:opacity-40 filter saturate-[0.9] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 via-slate-100/90 to-slate-100/70 dark:from-[#0b1326] dark:via-[#0b1326]/80 dark:to-[#0b1326]/60 backdrop-blur-[2px]" />
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphism Modal Card */}
      <div className={`w-full ${usuarioSeleccionado ? "max-w-sm sm:max-w-md p-5 sm:p-6" : "max-w-xl p-6 sm:p-8"} bg-white/95 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-700/60 rounded-3xl shadow-2xl relative z-10 text-center transition-all duration-300`}>
        {/* Header with Logo */}
        <div className={`${usuarioSeleccionado ? "mb-4" : "mb-5"} flex flex-col items-center`}>
          <div className={`${usuarioSeleccionado ? "w-32 sm:w-40" : "w-40 sm:w-48"} h-auto mb-2 relative flex items-center justify-center transition-all duration-300`}>
            <img
              src={logoDark}
              alt="NIZA MOTORS"
              className="w-full h-auto object-contain filter drop-shadow-[0_4px_20px_rgba(245,158,11,0.4)] transition-transform duration-300 hover:scale-105"
            />
          </div>
          <p className="text-[9.5px] font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-500/90">
            SISTEMA DE GESTIÓN DE INVENTARIO
          </p>
        </div>

        {/* Vista 1: Selección de Usuario */}
        {!usuarioSeleccionado ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700/60 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-[11px] font-black tracking-widest text-slate-700 dark:text-slate-300 uppercase">
                SELECCIONE SU PERFIL DE ACCESO
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 justify-center">
              {usuarios.map((u) => {
                const badge = getRoleBadge(u.rol);
                return (
                  <button
                    key={u.id}
                    onClick={() => setUsuarioSeleccionado(u)}
                    className="group flex flex-col items-center p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-amber-500 hover:bg-amber-500/5 dark:hover:bg-slate-950/90 transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-amber-500/10 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-lg pointer-events-none group-hover:bg-amber-500/15 transition-all" />

                    <UserAvatar
                      avatarType={u.avatar}
                      rol={u.rol}
                      name={u.nombre}
                      className="w-12 h-12 mb-2.5 transition-transform duration-300 group-hover:scale-110"
                    />

                    <span className="font-black text-slate-900 dark:text-slate-100 transition-colors text-xs sm:text-sm truncate max-w-full mb-1.5">
                      {u.nombre}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${badge.style}`}>
                      {badge.text}
                    </span>
                  </button>
                );
              })}
              {usuarios.length === 0 && (
                <div className="col-span-full py-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
                  No se encontraron perfiles de acceso. Recarga la página o verifica la conexión.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Vista 2: Teclado de PIN */
          <div className="max-w-xs sm:max-w-sm mx-auto animate-fade-in">
            {/* Botón de Atrás */}
            <button
              onClick={() => setUsuarioSeleccionado(null)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors mb-4 cursor-pointer bg-slate-100 dark:bg-slate-950/40 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              Volver a perfiles
            </button>

            {/* Perfil del Usuario Activo */}
            <div className="flex flex-col items-center mb-4">
              <UserAvatar
                avatarType={usuarioSeleccionado.avatar}
                rol={usuarioSeleccionado.rol}
                name={usuarioSeleccionado.nombre}
                className="w-12 h-12 mb-2"
              />
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">{usuarioSeleccionado.nombre}</h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 mt-0.5">
                INGRESA PIN DE 4 DÍGITOS
              </p>
            </div>

            {/* Visualizador de PIN (Círculos de estado) */}
            <div className="flex justify-center gap-3 mb-5">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                    index < pin.length
                      ? "bg-amber-500 border-amber-500 scale-110 shadow-md shadow-amber-500/40"
                      : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950/60"
                  }`}
                />
              ))}
            </div>

            {/* Input oculto para recibir foco del teclado físico */}
            <input
              ref={pinInputRef}
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                if (val.length <= 4) {
                  setPin(val);
                  if (val.length === 4) ejecutarLogin(val);
                }
              }}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              autoComplete="off"
            />

            {/* Teclado Numérico Visual */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinInput(num)}
                  className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-500/10 text-lg font-black active:scale-95 transition-all duration-150 text-slate-900 dark:text-slate-100 cursor-pointer shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPin("")}
                className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/40 hover:border-red-500/30 hover:bg-red-500/10 text-[10px] font-black text-red-500 dark:text-red-400 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center"
              >
                BORRAR
              </button>
              <button
                onClick={() => handlePinInput("0")}
                className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-500/10 text-lg font-black active:scale-95 transition-all duration-150 text-slate-900 dark:text-slate-100 cursor-pointer shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/40 hover:border-amber-500/30 hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">backspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
