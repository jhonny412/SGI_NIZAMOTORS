import { useState, useEffect, useRef } from "react";
import { useInventory } from "../context/useInventory";
import { useAuth } from "../context/useAuth";

function UserAvatar({ avatarType, rol, name, className }) {
  const isSuper = rol?.toLowerCase() === "superadmin";
  const isAdmin = rol?.toLowerCase() === "admin" || rol?.toLowerCase() === "superadmin";
  
  if (avatarType === "admin" || isAdmin) {
    return (
      <div className={`rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg ${className}`}>
        {isSuper ? (
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
        ) : (
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        )}
      </div>
    );
  }
  
  return (
    <div className={`rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-slate-100 flex items-center justify-center shadow-lg ${className}`}>
      <span className="font-black text-xl">{name ? name.charAt(0).toUpperCase() : "U"}</span>
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
      
      // Intentar login automáticamente al completar los 4 dígitos
      if (nuevoPin.length === 4) {
        ejecutarLogin(nuevoPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    setPin("");
  }, [usuarioSeleccionado]);

  // Manejar entrada de teclado físico
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
    }, 6000); // 6 segundos de gracia para Sheets
    return () => clearTimeout(timer);
  }, [usuarios]);

  if ((cargando || usuarios.length === 0) && !timeoutSuperado) {
    return (
      <div className="min-h-screen bg-[#0b1326] flex flex-col items-center justify-center text-slate-200">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="material-symbols-outlined text-amber-500 text-3xl absolute animate-pulse">supervised_user_circle</span>
        </div>
        <p className="mt-6 text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse text-center px-4">
          Obteniendo perfiles de acceso...
        </p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#0b1326] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Elementos Decorativos de Fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-[#334155]/60 rounded-3xl p-8 md:p-12 shadow-2xl relative z-10 text-center">
        {/* Encabezado */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 shadow-inner">
            <span className="material-symbols-outlined text-3xl">inventory_2</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Niza Motors
          </p>
          <h1 className="text-2xl font-black text-slate-150 tracking-tight uppercase mt-1">
            Sistema de Gestión de Inventario
          </h1>
        </div>

        {/* Vista 1: Selección de Usuario */}
        {!usuarioSeleccionado ? (
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase mb-8">
              Seleccione su perfil de acceso
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-center">
              {usuarios.map((u) => {
                return (
                  <button
                    key={u.id}
                    onClick={() => setUsuarioSeleccionado(u)}
                    className="group flex flex-col items-center p-5 rounded-2xl bg-slate-950/40 border border-[#334155]/40 hover:border-amber-500/50 hover:bg-slate-950/80 transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                  >
                    <UserAvatar 
                      avatarType={u.avatar} 
                      rol={u.rol} 
                      name={u.nombre} 
                      className="w-16 h-16 mb-4 transition-transform duration-300 group-hover:scale-105" 
                    />
                    <span className="font-bold text-slate-300 group-hover:text-slate-100 transition-colors text-sm truncate max-w-full">
                      {u.nombre}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1">
                      {u.rol}
                    </span>
                  </button>
                );
              })}
              {usuarios.length === 0 && (
                <div className="col-span-full py-8 text-slate-400 text-sm">
                  No se encontraron perfiles de acceso. Recarga la página o verifica la conexión.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Vista 2: Teclado de PIN */
          <div className="max-w-md mx-auto animate-fade-in">
            {/* Botón de Atrás */}
            <button
              onClick={() => setUsuarioSeleccionado(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors mb-6 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Volver a usuarios
            </button>

            {/* Perfil del Usuario Activo */}
            <div className="flex flex-col items-center mb-6">
              <UserAvatar 
                avatarType={usuarioSeleccionado.avatar} 
                rol={usuarioSeleccionado.rol} 
                name={usuarioSeleccionado.nombre} 
                className="w-14 h-14 mb-3" 
              />
              <h3 className="font-black text-slate-200 text-base">{usuarioSeleccionado.nombre}</h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
                Ingresa PIN para autorizar
              </p>
            </div>

            {/* Visualizador de PIN (Círculos de estado) */}
            <div className="flex justify-center gap-4 mb-8">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                    index < pin.length
                      ? "bg-amber-500 border-amber-500 scale-110 shadow-lg shadow-amber-500/30"
                      : "border-slate-600 bg-transparent"
                  }`}
                />
              ))}
            </div>

            {/* Input oculto para recibir foco del teclado físico en móvil/escritorio */}
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
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinInput(num)}
                  className="w-16 h-16 rounded-2xl bg-slate-950/30 border border-[#334155]/30 hover:border-amber-500/40 hover:bg-slate-950/80 text-xl font-bold active:scale-95 transition-all duration-150 text-slate-250 cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPin("")}
                className="w-16 h-16 rounded-2xl bg-slate-950/10 border border-transparent hover:border-red-500/20 hover:bg-red-500/5 text-xs font-bold text-red-400 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center"
              >
                CERRAR
              </button>
              <button
                onClick={() => handlePinInput("0")}
                className="w-16 h-16 rounded-2xl bg-slate-950/30 border border-[#334155]/30 hover:border-amber-500/40 hover:bg-slate-950/80 text-xl font-bold active:scale-95 transition-all duration-150 text-slate-250 cursor-pointer"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="w-16 h-16 rounded-2xl bg-slate-950/10 border border-transparent hover:border-amber-500/20 hover:bg-amber-500/5 text-slate-400 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-xl">backspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
