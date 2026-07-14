import { useState, useEffect, useRef, useMemo } from "react";
import { useInventory } from "../context/useInventory";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

export default function VentaFormModal({ abierto, onCerrar, onVentaRegistrada }) {
  const { productos, movimientos, ventas, agregarVenta } = useInventory();
  const { t } = useTranslation();

  // Datos del Cliente y Facturación
  const [tipoDocumento, setTipoDocumento] = useState("OTROS");
  const [nroDocumento, setNroDocumento] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");

  // Carrito de ventas (multi-ítem)
  const [items, setItems] = useState([]); // [{ productoId, cantidad, precioUnitario }]

  // Buscador predictivo de productos
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [productoSel, setProductoSel] = useState(null); // Producto cargado actualmente en los selectores
  const [cantidadSel, setCantidadSel] = useState(1);
  const [precioSel, setPrecioSel] = useState(0);
  const [margenSel, setMargenSel] = useState(0);

  const containerRef = useRef(null);

  // Reset del modal al abrirse
  useEffect(() => {
    if (abierto) {
      setTipoDocumento("OTROS");
      setNroDocumento("");
      setClienteNombre("");
      setClienteDireccion("");
      setMetodoPago("EFECTIVO");
      setItems([]);
      setSearchTerm("");
      setDropdownAbierto(false);
      setProductoSel(null);
      setCantidadSel(1);
      setPrecioSel(0);
      setMargenSel(0);
    }
  }, [abierto]);

  // Cerrar el dropdown predictivo si se hace clic fuera del buscador
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setDropdownAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calcular el stock disponible en base al stock real y lo ya cargado en el carrito
  const stockDisponible = (productoId) => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return 0;
    const yaCargado = items.find((i) => i.productoId === productoId)?.cantidad || 0;
    return prod.stock - yaCargado;
  };

  // Filtrado predictivo de productos
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const disp = stockDisponible(p.id);
      if (disp <= 0) return false; // Solo buscar productos con stock disponible
      
      const q = searchTerm.toLowerCase();
      if (!q) return true; // Mostrar todos si el campo está vacío
 
      const desc = p.descripcion ? String(p.descripcion).toLowerCase() : "";
      const cod = p.codigo ? String(p.codigo).toLowerCase() : "";
      const oem = p.oem ? String(p.oem).toLowerCase() : "";

      return (
        desc.includes(q) ||
        cod.includes(q) ||
        oem.includes(q)
      );
    });
  }, [productos, searchTerm, items]);

  // Auto-calcular correlativo de boleta
  const nextTicketNum = () => {
    const saleMovements = movimientos.filter(
      (m) => m.tipo === "salida" && typeof m.motivo === "string" && m.motivo.includes("BOLETA")
    );
    const ticketNumbers = saleMovements.map((m) => {
      const match = m.motivo.match(/BOLETA B001-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    const ticketVentas = (ventas || []).map((v) => {
      const match = v.boleta ? v.boleta.match(/BOLETA B001-(\d+)/) : null;
      return match ? parseInt(match[1]) : 0;
    });

    const maxTicket = Math.max(0, ...ticketNumbers, ...ticketVentas);
    return maxTicket + 1;
  };

  const isDirty = () => {
    return !!nroDocumento || !!clienteNombre || !!clienteDireccion || items.length > 0 || !!searchTerm;
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

  // Seleccionar producto desde el dropdown predictivo
  function handleSelectProducto(prod) {
    setProductoSel(prod);
    setSearchTerm(`[${prod.codigo}] ${prod.descripcion}`);
    setPrecioSel(prod.pVenta);
    setMargenSel(prod.margGanancia || 0);
    
    const disponible = stockDisponible(prod.id);
    setCantidadSel(Math.min(1, disponible));
    setDropdownAbierto(false);
  }

  // Manejar cambio de margen y recalcular precio
  function handleMargenChange(val) {
    setMargenSel(val);
    const numMargen = parseFloat(val) || 0;
    if (productoSel) {
      const pCompra = Number(productoSel.pCompra) || 0;
      const newPrecio = (pCompra > 0 && numMargen < 100)
        ? parseFloat((pCompra / (1 - numMargen / 100)).toFixed(2))
        : 0;
      setPrecioSel(newPrecio);
    }
  }

  

  // Agregar producto seleccionado al carrito
  function handleAgregarItem() {
    if (!productoSel) return;
    const pid = productoSel.id;
    const disp = stockDisponible(pid);

    if (cantidadSel <= 0) return;
    if (cantidadSel > disp) {
      Swal.fire({
        icon: "warning",
        title: "Stock Insuficiente",
        text: `Solo quedan ${disp} unidades disponibles de este producto.`
      });
      return;
    }

    setItems((prev) => {
      const index = prev.findIndex((i) => i.productoId === pid);
      const parsedPrecio = parseFloat(precioSel) || 0;
      const parsedMargen = parseFloat(margenSel) || 0;
      if (index > -1) {
        // Actualizar item existente
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          cantidad: updated[index].cantidad + cantidadSel,
          precioUnitario: parsedPrecio, // usar precio seleccionado
          nuevoMargen: parsedMargen
        };
        return updated;
      }
      // Agregar nuevo item
      return [...prev, { productoId: pid, cantidad: cantidadSel, precioUnitario: parsedPrecio, nuevoMargen: parsedMargen }];
    });

    // Limpiar selector
    setProductoSel(null);
    setSearchTerm("");
    setCantidadSel(1);
    setPrecioSel(0);
    setMargenSel(0);
  }

  // Quitar producto del carrito
  function handleQuitarItem(productoId) {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  }

  // Totales
  const totalGeneral = items.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);

  // Registro de Boleta
  async function handleSubmit(e) {
    e.preventDefault();

    // Validar carrito vacío
    if (items.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Carrito vacío",
        text: t("sale.empty_cart")
      });
      return;
    }

    // Validaciones de Cliente
    if (tipoDocumento === "DNI" && (!/^\d{8}$/.test(nroDocumento))) {
      Swal.fire({ icon: "error", title: "Documento Inválido", text: t("sale.invalid_dni") });
      return;
    }
    if (tipoDocumento === "RUC" && (!/^\d{11}$/.test(nroDocumento))) {
      Swal.fire({ icon: "error", title: "Documento Inválido", text: t("sale.invalid_ruc") });
      return;
    }
    if ((tipoDocumento === "DNI" || tipoDocumento === "RUC") && !clienteNombre.trim()) {
      Swal.fire({ icon: "error", title: "Datos Faltantes", text: "Debe ingresar el Nombre o Razón Social del cliente." });
      return;
    }

    // Nombre por defecto si es Sin Documento
    const finalCliente = clienteNombre.trim() ? clienteNombre.trim().toUpperCase() : "CLIENTE VARIOS";
    const finalDoc = nroDocumento.trim() ? ` (${tipoDocumento}: ${nroDocumento.trim()})` : "";
    const finalDir = clienteDireccion.trim() ? clienteDireccion.trim().toUpperCase() : "";

    const ticketCorrelativo = String(nextTicketNum()).padStart(6, "0");
    const boletaCode = `BOLETA B001-${ticketCorrelativo}`;

    // Calcular cantidadTotal y utilidadCalculada
    let cantidadCalculada = 0;
    let utilidadCalculada = 0;
    const saleItems = items.map(item => {
      const prod = productos.find(p => p.id === item.productoId);
      const pCompra = prod ? Number(prod.pCompra) || 0 : 0;
      const cant = Number(item.cantidad) || 0;
      const pUnit = Number(item.precioUnitario) || 0;
      cantidadCalculada += cant;
      utilidadCalculada += (pUnit - pCompra) * cant;
      return {
        productoId: item.productoId,
        cantidad: cant,
        precioUnitario: pUnit,
        nuevoMargen: item.nuevoMargen
      };
    });
    utilidadCalculada = parseFloat(utilidadCalculada.toFixed(2));

    const nuevaVenta = {
      boleta: boletaCode,
      fecha: new Date().toISOString(),
      cliente: `${finalCliente}${finalDoc}`,
      metodoPago: metodoPago,
      totalVenta: totalGeneral,
      utilidad: utilidadCalculada,
      cantidadTotal: cantidadCalculada,
      direccion: finalDir,
      items: saleItems
    };

    const ok = await agregarVenta(nuevaVenta);

    if (ok) {
      if (onVentaRegistrada) {
        onVentaRegistrada(boletaCode);
      } else {
        onCerrar();
      }
    }
  }
  return (
    <div className="modal-overlay z-50" onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div className="modal-content max-w-3xl w-full animate-slide-up border-[#334155]">
        {/* Header */}
        <div className="flex items-start justify-between bg-slate-950 px-6 py-5 rounded-t-2xl relative overflow-hidden border-b border-[#334155]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                MÓDULO DE FACTURACIÓN
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">receipt_long</span>
              {t("sale.title")}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {t("sale.subtitle")}
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

        <form onSubmit={handleSubmit}>
          <div className="card-body space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Sección 1: Datos del Cliente */}
            <div className="bg-slate-950/20 p-4 rounded-2xl border border-[#334155]/40 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                {t("sale.client")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Tipo Documento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    {t("sale.doc_type")}
                  </label>
                  <select
                    value={tipoDocumento}
                    onChange={(e) => {
                      setTipoDocumento(e.target.value);
                      setNroDocumento("");
                      if (e.target.value === "OTROS") setClienteNombre("");
                    }}
                    className="select-field w-full text-xs"
                  >
                    <option value="OTROS">SIN DOC / OTROS</option>
                    <option value="DNI">DNI (PERSONA)</option>
                    <option value="RUC">RUC (EMPRESA)</option>
                  </select>
                </div>

                {/* Nro Documento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    {t("sale.doc_num")}
                  </label>
                  <input
                    type="text"
                    value={nroDocumento}
                    onChange={(e) => setNroDocumento(e.target.value.replace(/\D/g, ""))}
                    placeholder="Solo números"
                    className="input-field text-xs"
                    disabled={tipoDocumento === "OTROS"}
                    maxLength={tipoDocumento === "RUC" ? 11 : 8}
                  />
                </div>

                {/* Método de Pago */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    {t("sale.payment_method")}
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="select-field w-full text-xs"
                  >
                    <option value="EFECTIVO">{t("sale.cash")}</option>
                    <option value="TARJETA">{t("sale.card")}</option>
                    <option value="YAPE_PLIN">{t("sale.yape_plin")}</option>
                    <option value="TRANSFERENCIA">{t("sale.transfer")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre / Razón Social */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    {t("sale.client_placeholder")}
                  </label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombres completos o Razón social"
                    className="input-field text-xs"
                    required={tipoDocumento !== "OTROS"}
                  />
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    {t("sale.client_address")}
                  </label>
                  <input
                    type="text"
                    value={clienteDireccion}
                    onChange={(e) => setClienteDireccion(e.target.value)}
                    placeholder="Calle, Av, Distrito (Opcional)"
                    className="input-field text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Búsqueda y Adición de Productos */}
            <div className="border-t border-[#334155]/60 pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                Selección de Repuestos
              </h4>

              {/* Autocomplete Combobox */}
              <div className="bg-slate-950/20 rounded-2xl p-4 border border-[#334155]/40">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end">
                  
                  {/* Campo de búsqueda predictivo */}
                  <div className="relative" ref={containerRef}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      {t("sale.product")}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t("sale.product_placeholder")}
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setDropdownAbierto(true);
                          if (productoSel) setProductoSel(null);
                        }}
                        onFocus={() => setDropdownAbierto(true)}
                        className="input-field pl-9 w-full text-xs py-2.5"
                      />
                      <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-sm">search</span>
                    </div>

                    {/* Menú predictivo flotante */}
                    {dropdownAbierto && productosFiltrados.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-slate-900 border border-[#334155] rounded-xl shadow-xl divide-y divide-[#334155]/40">
                        {productosFiltrados.map((p) => {
                          const disponible = stockDisponible(p.id);
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectProducto(p)}
                                className="w-full text-left px-4 py-3 hover:bg-amber-500/5 transition-colors flex flex-col gap-0.5 cursor-pointer"
                              >
                                <span className="text-xs font-bold text-slate-200">
                                  {p.descripcion}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Código: {p.codigo} {p.oem ? `· OEM: ${p.oem}` : ""} · Stock: {disponible}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Stock Informativo si hay selección */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Disp.
                    </label>
                    <input
                      type="text"
                      className="input-field w-16 text-center text-xs font-bold"
                      value={productoSel ? stockDisponible(productoSel.id) : 0}
                      disabled
                    />
                  </div>

                  {/* Cantidad */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Cant.
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={productoSel ? stockDisponible(productoSel.id) : 1}
                      value={cantidadSel}
                      onChange={(e) => setCantidadSel(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-field w-20 text-xs py-2.5"
                      disabled={!productoSel}
                    />
                  </div>

                  {/* Margen % */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Margen %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="99.99"
                      value={margenSel}
                      onChange={(e) => handleMargenChange(e.target.value)}
                      className="input-field w-20 text-xs py-2.5"
                      disabled={!productoSel}
                    />
                  </div>

                  {/* Precio Unitario */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      P. Venta
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioSel}
                      className="input-field w-24 text-xs py-2.5 bg-slate-900 text-slate-450 cursor-not-allowed font-semibold"
                      readOnly
                    />
                  </div>
                </div>

                {/* Subtotal del Item en Selección */}
                {productoSel && (
                  <div className="mt-3 flex justify-between items-center text-xs font-medium text-slate-500 border-t border-[#334155]/30 pt-3">
                    <span>Precio Lista: <strong className="text-slate-300">S/. {productoSel.pVenta.toFixed(2)}</strong></span>
                    <span>Subtotal Item: <strong className="text-amber-500 font-extrabold text-sm">S/. {(precioSel * cantidadSel).toFixed(2)}</strong></span>
                    <button
                      type="button"
                      onClick={handleAgregarItem}
                      className="btn-primary py-1.5 px-3.5 text-xs rounded-lg cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      {t("sale.add_item")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Listado del Carrito de Compras */}
            {items.length > 0 && (
              <div className="border border-[#334155]/40 rounded-xl overflow-hidden bg-slate-900/20">
                <table className="min-w-full">
                  <thead className="bg-slate-950/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Repuesto
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Cant.
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Margen
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        P. Unit.
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Importe
                      </th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-950/20 divide-y divide-[#334155]/30">
                    {items.map((item) => {
                      const prod = productos.find((p) => p.id === item.productoId);
                      if (!prod) return null;
                      const sub = item.precioUnitario * item.cantidad;
                      return (
                        <tr key={item.productoId} className="hover:bg-amber-500/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-slate-200 leading-tight">
                              {prod.descripcion}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {prod.codigo} {prod.oem ? `· OEM: ${prod.oem}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 min-w-[1.8rem] rounded-lg bg-amber-950/40 text-amber-500 font-extrabold text-[11px] border border-amber-550/20">
                              {item.cantidad}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                            {item.nuevoMargen !== undefined ? Number(item.nuevoMargen).toFixed(2) : (prod.margGanancia || 0).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                            S/. {item.precioUnitario.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-black text-slate-200">
                            S/. {sub.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleQuitarItem(item.productoId)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                              title={t("sale.remove")}
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Carrito Vacío */}
            {items.length === 0 && (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-[#334155]/40 rounded-2xl bg-slate-950/20">
                <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">shopping_cart</span>
                <p className="text-xs font-semibold text-slate-400">
                  {t("sale.no_items")}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Usa el buscador predictivo para localizar y agregar repuestos
                </p>
              </div>
            )}
          </div>

          {/* Desglose de Impuestos y Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4.5 border-t border-[#334155]/60 bg-slate-950/30 rounded-b-2xl">
            {/* Totales */}
            <div className="flex text-xs font-semibold text-slate-400 items-center">
              <div className="text-sm">
                <span>{t("sale.total")}: </span>
                <strong className="text-amber-500 font-black text-base font-mono">
                  S/. {totalGeneral.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 justify-end self-end sm:self-auto">
              <button
                type="button"
                onClick={handleCerrar}
                className="btn-secondary py-2 px-5 text-sm rounded-xl"
              >
                {t("forms.product.cancel")}
              </button>
              <button
                type="submit"
                disabled={items.length === 0}
                className="btn-primary py-2 px-5 text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                {t("sale.register")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
