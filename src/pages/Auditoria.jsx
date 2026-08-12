import { useState, useEffect, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { SkeletonTable } from "../components/Skeleton";
import { fetchSheet } from "../services/api";
import Pagination from "../components/Pagination";
import SortableTh from "../components/SortableTh";
import { matchSearch } from "../utils/search";

export default function Auditoria() {
  const { formatFecha } = useInventory();
  
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: "fecha", dir: "desc" });
  
  const itemsPorPagina = 10;

  // Cargar logs directamente de la red al montar
  const cargarLogs = async () => {
    setCargando(true);
    try {
      const data = await fetchSheet("Logs");
      // Mapear y ordenar por fecha descendente (más nuevos primero) por defecto
      const fLogs = data.map(log => ({
        ...log,
        id: Number(log.id) || Date.now(),
        fecha: log.fecha || new Date().toISOString()
      }));
      setLogs(fLogs);
    } catch (error) {
      console.error("Error al cargar auditoría desde Sheets:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, []);

  // Obtener lista única de usuarios que tienen registros para el selector
  const usuariosUnicos = useMemo(() => {
    const users = new Set(logs.map(l => l.usuario).filter(Boolean));
    return Array.from(users).sort();
  }, [logs]);

  // Filtrar logs según búsqueda y filtros de estado/usuario
  const filtrados = useMemo(() => {
    let data = logs.filter(log => {
      const matchBusqueda = matchSearch([log.accion, log.modulo, log.detalles || "", log.ip || ""], busqueda);
      const matchEstado = filtroEstado === "todos" || log.estado === filtroEstado;
      const matchUser = !filtroUsuario || log.usuario === filtroUsuario;
      return matchBusqueda && matchEstado && matchUser;
    });

    // Ordenar
    data.sort((a, b) => {
      let va = a[orden.campo];
      let vb = b[orden.campo];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      
      if (va < vb) return orden.dir === "asc" ? -1 : 1;
      if (va > vb) return orden.dir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [logs, busqueda, filtroEstado, filtroUsuario, orden]);

  const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
  const itemsPagina = useMemo(() => {
    return filtrados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);
  }, [filtrados, pagina]);

  function toggleSort(campo) {
    setOrden((prev) => ({
      campo,
      dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc"
    }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#334155]/60 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-amber-500 mb-1">
            <span className="material-symbols-outlined text-lg">security</span>
            <span className="text-[10px] font-black tracking-widest uppercase">AUDITORÍA CENTRAL</span>
          </div>
          <h2 className="text-3xl font-black text-slate-100 tracking-tight">Logs del Sistema</h2>
          <p className="text-slate-400 font-medium text-xs sm:text-sm mt-1">
            Historial consolidado de acciones de auditoría en todos los dispositivos conectados.
          </p>
        </div>
        <button 
          onClick={cargarLogs}
          className="btn-secondary self-start sm:self-center flex items-center gap-1.5"
          disabled={cargando}
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[#1c253b] p-5 rounded-xl border border-[#334155] shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Buscador</label>
            <input
              type="text"
              placeholder="Buscar por acción, detalles, IP..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              className="input-field"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Filtrar por Usuario</label>
            <select
              value={filtroUsuario}
              onChange={(e) => { setFiltroUsuario(e.target.value); setPagina(1); }}
              className="select-field w-full"
            >
              <option value="">Todos los usuarios</option>
              {usuariosUnicos.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Filtrar por Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
              className="select-field w-full"
            >
              <option value="todos">Todos los logs</option>
              <option value="success">Exitoso (Success)</option>
              <option value="error">Fallo (Error)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 justify-end">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Registros Totales</div>
            <div className="bg-[#0b1326] border border-[#334155] px-4 py-2.5 rounded-xl font-mono text-sm text-slate-200 font-bold">
              {filtrados.length} log(s)
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="bg-[#1c253b] rounded-xl border border-[#334155] overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="p-6"><SkeletonTable rows={itemsPorPagina} cols={6} /></div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-[#334155]">
                    <SortableTh campo="fecha" orden={orden} onSort={toggleSort}>Fecha / Hora</SortableTh>
                    <SortableTh campo="usuario" orden={orden} onSort={toggleSort}>Usuario</SortableTh>
                    <SortableTh campo="modulo" orden={orden} onSort={toggleSort}>Módulo</SortableTh>
                    <SortableTh campo="accion" orden={orden} onSort={toggleSort}>Acción</SortableTh>
                    <SortableTh campo="ip" orden={orden} onSort={toggleSort}>Equipo / IP</SortableTh>
                    <SortableTh campo="estado" align="center" orden={orden} onSort={toggleSort}>Estado</SortableTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/20">
                  {itemsPagina.map((log) => {
                    const isSuccess = log.estado === "success";
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-mono text-xs text-slate-200">{formatFecha(log.fecha).split(" ")[0]}</div>
                          <div className="text-[9px] text-slate-500 font-medium mt-0.5">{formatFecha(log.fecha).split(" ")[1] || ""}</div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-xs text-slate-350">
                          {log.usuario}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="bg-slate-900/60 border border-[#334155] px-2 py-0.5 rounded text-[10px] text-slate-400 font-semibold uppercase">
                            {log.modulo}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-200 max-w-sm">
                          <div className="font-bold">{log.accion}</div>
                          {log.detalles && (
                            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5" title={log.detalles}>
                              {log.detalles}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                          {log.ip || "desconocida"}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={isSuccess ? "badge-success" : "badge-danger"}>
                            {isSuccess ? "Éxito" : "Error"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {itemsPagina.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 font-medium italic">
                        No se encontraron registros de auditoría que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="p-4 bg-slate-950/20 border-t border-[#334155]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-slate-400 font-medium">
                    Mostrando <strong>{itemsPagina.length}</strong> de <strong>{filtrados.length}</strong> registros
                  </p>
                  <Pagination pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
