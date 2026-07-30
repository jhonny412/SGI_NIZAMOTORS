import { createContext, useState, useCallback, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import i18next from "i18next";
import { writeLog } from "../utils/logger";
import { fetchSheet } from "../services/api";
import { calculatePricing } from "../utils/pricing";
import * as invService from "../services/inventoryService";
import { useAuth } from "./useAuth";
import { DEFAULT_USUARIOS, formatUsuario } from "./AuthContext";


export const InventoryContext = createContext();

export function InventoryProvider({ children }) {
  const { usuarioActivo, setUsuarios } = useAuth();
  
  const [productos, setProductos] = useState(() => {

    const saved = localStorage.getItem("sgi-productos");
    return saved ? invService.formatProductos(JSON.parse(saved)) : [];
  });
  const [proveedores, setProveedores] = useState(() => {
    const saved = localStorage.getItem("sgi-proveedores");
    return saved ? JSON.parse(saved) : [];
  });
  const [marcas, setMarcas] = useState(() => {
    const saved = localStorage.getItem("sgi-marcas");
    return saved ? JSON.parse(saved) : [];
  });
  const [movimientos, setMovimientos] = useState(() => {
    const saved = localStorage.getItem("sgi-movimientos");
    return saved ? JSON.parse(saved) : [];
  });
  const [traslados, setTraslados] = useState(() => {
    const saved = localStorage.getItem("sgi-traslados");
    return saved ? JSON.parse(saved) : [];
  });
  const [categorias, setCategorias] = useState(() => {
    const saved = localStorage.getItem("sgi-categorias");
    return saved ? JSON.parse(saved) : [];
  });
  const [ventas, setVentas] = useState(() => {
    const saved = localStorage.getItem("sgi-ventas");
    return saved ? JSON.parse(saved) : [];
  });


  const [cargando, setCargando] = useState(() => !localStorage.getItem("sgi-productos"));

  // Sincronización Inicial de datos
  useEffect(() => {
    const fetchDatos = async () => {
      if (productos.length === 0) setCargando(true);
      try {
        const [dProd, dProv, dMarcas, dMov, dCat, dTras, dVentas, dUsuarios] = await Promise.all([
          fetchSheet("Productos"), fetchSheet("Proveedores"), fetchSheet("Marcas"),
          fetchSheet("Movimientos"), fetchSheet("Categorias"), fetchSheet("Traslados"),
          fetchSheet("Ventas"), fetchSheet("Usuarios")
        ]);

        const fProd = invService.formatProductos(dProd);
        const fProv = dProv.map(p => ({ ...p, id: Number(p.id) }));
        const fMarcas = dMarcas.map(m => ({ ...m, id: Number(m.id) }));
        const fMov = invService.formatMovements(dMov);
        const fCat = dCat.map(c => ({ ...c, id: Number(c.id) }));
        const fTras = invService.formatTransfers(dTras);
        const fVentas = invService.formatSales(dVentas);
        // Credenciales oficiales desde la hoja Usuarios (solo Admin / SuperAdmin)
        const fUsuarios = (Array.isArray(dUsuarios) ? dUsuarios : [])
          .map(formatUsuario)
          .filter((u) => {
            const rol = u.rol.toLowerCase();
            return u.id && u.nombre && u.pin && (rol === "admin" || rol === "superadmin");
          });
        const usuariosFinal = fUsuarios.length ? fUsuarios : DEFAULT_USUARIOS;

        setProductos(fProd);
        setProveedores(fProv);
        setMarcas(fMarcas);
        setMovimientos(fMov);
        setCategorias(fCat);
        setTraslados(fTras);
        setVentas(fVentas);
        setUsuarios(usuariosFinal);

        localStorage.setItem("sgi-productos", JSON.stringify(fProd));
        localStorage.setItem("sgi-proveedores", JSON.stringify(fProv));
        localStorage.setItem("sgi-marcas", JSON.stringify(fMarcas));
        localStorage.setItem("sgi-movimientos", JSON.stringify(fMov));
        localStorage.setItem("sgi-categorias", JSON.stringify(fCat));
        localStorage.setItem("sgi-traslados", JSON.stringify(fTras));
        localStorage.setItem("sgi-ventas", JSON.stringify(fVentas));
        localStorage.setItem("sgi-usuarios", JSON.stringify(usuariosFinal));
      } catch (error) {
        console.error("Error al obtener de Google Sheets", error);
        // Si la API falla y no hay perfiles en memoria, usar semillas locales
        setUsuarios((prev) => {
          if (prev.length > 0) return prev;
          localStorage.setItem("sgi-usuarios", JSON.stringify(DEFAULT_USUARIOS));
          return DEFAULT_USUARIOS;
        });
      } finally {
        setCargando(false);
      }
    };
    fetchDatos();
  }, []);

  // Persistencia de estados específicos
  useEffect(() => { localStorage.setItem("sgi-traslados", JSON.stringify(traslados)); }, [traslados]);
  useEffect(() => { localStorage.setItem("sgi-categorias", JSON.stringify(categorias)); }, [categorias]);
  useEffect(() => { localStorage.setItem("sgi-ventas", JSON.stringify(ventas)); }, [ventas]);

  const getProveedorNombre = useCallback(id => proveedores.find(p => p.id === id)?.nombre || "Sin proveedor", [proveedores]);
  const productosConProveedor = useMemo(() => productos.map(p => ({ ...p, proveedorNombre: getProveedorNombre(p.proveedorId) })), [productos, getProveedorNombre]);


  // PRODUCTOS CRUD
  const agregarProducto = async (prod) => {
    try {
      const nuevo = await invService.saveProduct(prod, productos, usuarioActivo);
      setProductos(prev => [...prev, nuevo]);
      Swal.fire({ icon: "success", title: i18next.t("alerts.product_added"), timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo guardar el producto." });
    }
  };

  const editarProducto = async (prod, silencioso = false) => {
    try {
      const editado = await invService.saveProduct(prod, productos, usuarioActivo);
      setProductos(prev => prev.map(p => p.id === prod.id ? editado : p));
      if (!silencioso) Swal.fire({ icon: "success", title: i18next.t("alerts.product_updated"), timer: 1500, showConfirmButton: false });
    } catch (err) {
      if (!silencioso) Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo actualizar el producto." });
    }
  };

  const eliminarProducto = (id) => {
    Swal.fire({
      title: i18next.t("alerts.delete_product_title"), text: i18next.t("alerts.delete_warning_text"), icon: "warning",
      showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: i18next.t("alerts.confirm_delete")
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          await invService.deleteProductApi(id, productos.find(p => p.id === id), usuarioActivo);
          setProductos(prev => prev.filter(p => p.id !== id));
          setMovimientos(prev => prev.filter(m => m.productoId !== id));
          Swal.fire({ icon: "success", title: i18next.t("alerts.deleted"), timer: 1500, showConfirmButton: false });
        } catch {
          Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo eliminar el producto." });
        }
      }
    });
  };

  // PROVEEDORES CRUD
  const agregarProveedor = async (prov) => {
    try {
      const nuevo = await invService.saveSupplier(prov, proveedores, usuarioActivo);
      setProveedores(prev => [...prev, nuevo]);
      Swal.fire({ icon: "success", title: i18next.t("alerts.supplier_added"), timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo guardar el proveedor." });
    }
  };

  const editarProveedor = async (prov) => {
    try {
      const editado = await invService.saveSupplier(prov, proveedores, usuarioActivo);
      setProveedores(prev => prev.map(p => p.id === prov.id ? editado : p));
      Swal.fire({ icon: "success", title: i18next.t("alerts.supplier_updated"), timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo actualizar el proveedor." });
    }
  };

  const eliminarProveedor = (id) => {
    if (productos.some(p => p.proveedorId === id)) {
      return Swal.fire({ icon: "error", title: i18next.t("alerts.cannot_delete"), text: i18next.t("alerts.supplier_in_use") });
    }
    Swal.fire({
      title: i18next.t("alerts.delete_supplier_title"), text: i18next.t("alerts.delete_warning_text"), icon: "warning",
      showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: i18next.t("alerts.confirm_delete")
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          await invService.deleteSupplierApi(id, proveedores.find(p => p.id === id), usuarioActivo);
          setProveedores(prev => prev.filter(p => p.id !== id));
          Swal.fire({ icon: "success", title: i18next.t("alerts.deleted"), timer: 1500, showConfirmButton: false });
        } catch {
          Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo eliminar el proveedor." });
        }
      }
    });
  };

  // MARCAS CRUD
  const agregarMarca = async (marca) => {
    try {
      const nuevo = await invService.saveBrand(marca, marcas, usuarioActivo);
      setMarcas(prev => [...prev, nuevo]);
      Swal.fire({ icon: "success", title: i18next.t("alerts.brand_added"), timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo guardar la marca." });
    }
  };

  const editarMarca = async (marca) => {
    try {
      const editada = await invService.saveBrand(marca, marcas, usuarioActivo);
      setMarcas(prev => prev.map(m => m.id === marca.id ? editada : m));
      Swal.fire({ icon: "success", title: i18next.t("alerts.brand_updated"), timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo actualizar la marca." });
    }
  };

  const eliminarMarca = (id) => {
    const nombre = marcas.find(m => m.id === id)?.nombre;
    if (productos.some(p => p.marca === nombre)) {
      return Swal.fire({ icon: "error", title: i18next.t("alerts.cannot_delete"), text: i18next.t("alerts.brand_in_use") });
    }
    Swal.fire({
      title: i18next.t("alerts.delete_brand_title"), text: i18next.t("alerts.delete_warning_text"), icon: "warning",
      showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: i18next.t("alerts.confirm_delete")
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          await invService.deleteBrandApi(id, marcas.find(m => m.id === id), usuarioActivo);
          setMarcas(prev => prev.filter(m => m.id !== id));
          Swal.fire({ icon: "success", title: i18next.t("alerts.deleted"), timer: 1500, showConfirmButton: false });
        } catch {
          Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo eliminar la marca." });
        }
      }
    });
  };

  // CATEGORIAS CRUD
  const agregarCategoria = async (cat) => {
    try {
      const nuevo = await invService.saveCategory(cat, categorias, usuarioActivo);
      setCategorias(prev => [...prev, nuevo]);
      Swal.fire({ icon: "success", title: "Categoría agregada", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo guardar la categoría." });
    }
  };

  const editarCategoria = async (cat) => {
    try {
      const editada = await invService.saveCategory(cat, categorias, usuarioActivo);
      setCategorias(prev => prev.map(c => c.id === cat.id ? editada : c));
      Swal.fire({ icon: "success", title: "Categoría actualizada", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo actualizar la categoría." });
    }
  };

  const eliminarCategoria = (id) => {
    const nombre = categorias.find(c => c.id === id)?.nombre;
    if (productos.some(p => p.categoria === nombre)) {
      return Swal.fire({ icon: "error", title: i18next.t("alerts.cannot_delete"), text: "Hay productos asociados a esta categoría" });
    }
    Swal.fire({
      title: "¿Eliminar categoría?", text: i18next.t("alerts.delete_warning_text"), icon: "warning",
      showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: i18next.t("alerts.confirm_delete")
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          await invService.deleteCategoryApi(id, categorias.find(c => c.id === id), usuarioActivo);
          setCategorias(prev => prev.filter(c => c.id !== id));
          Swal.fire({ icon: "success", title: i18next.t("alerts.deleted"), timer: 1500, showConfirmButton: false });
        } catch {
          Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo eliminar la categoría." });
        }
      }
    });
  };

  // MOVIMIENTOS
  const registrarMovimiento = async (params) => {
    try {
      const res = await invService.createMovement(params, productos, movimientos, usuarioActivo);
      setMovimientos(prev => [res.nuevoMov, ...prev]);
      setProductos(prev => prev.map(p => p.id === params.productoId ? { ...p, stock: res.stockNuevo } : p));
      Swal.fire({
        icon: "success", title: params.tipo === "entrada" ? i18next.t("alerts.entry_registered") : i18next.t("alerts.exit_registered"),
        text: i18next.t("alerts.new_stock_text", { desc: res.productoDesc, stock: res.stockNuevo }), timer: 2000, showConfirmButton: false
      });
      return true;
    } catch (err) {
      const errMsg = err.message.startsWith("insufficient_stock") ? i18next.t("forms.movement.insufficient_stock") : "No se pudo registrar el movimiento.";
      Swal.fire({ icon: "error", title: "Error", text: errMsg });
      return false;
    }
  };

  const getKardex = (productoId) => movimientos.filter(m => m.productoId === productoId).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const tiendasVecinas = ["CANDAO", "NUÑEZ", "QUIJADA"];

  // TRASLADOS CRUD
  const agregarTraslado = async (params) => {
    try {
      const res = await invService.createTransfer(params, productos, movimientos, traslados, usuarioActivo);
      setTraslados(prev => [res.nuevoTraslado, ...prev]);
      setMovimientos(prev => [...res.nuevosMovimientos.reverse(), ...prev]);
      setProductos(res.productosActualizados);
      Swal.fire({
        icon: "success", title: "Préstamo registrado",
        text: `${res.cantidadItems} repuesto(s) prestado(s) a ${params.tiendaVecina} — S/. ${res.totalGeneral.toFixed(2)}`,
        timer: 2500, showConfirmButton: false
      });
      return true;
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message.includes("insufficient_stock") ? err.message.split("|")[1] + " — Stock insuficiente." : "Error al registrar préstamo." });
      return false;
    }
  };

  const resolverTraslado = async (id, resolucion) => {
    try {
      const res = await invService.resolveTransfer(id, resolucion, traslados, productos, movimientos, usuarioActivo);
      if (resolucion === "devuelto") setProductos(res.productosActualizados);
      setMovimientos(prev => [...res.nuevosMovimientos.map(m => ({ ...m })), ...prev]);
      setTraslados(prev => prev.map(t => t.id === id ? { ...t, estado: resolucion, fechaResolucion: res.fechaResolucion } : t));
      Swal.fire({
        icon: "success", title: resolucion === "devuelto" ? "Repuesto(s) devuelto(s)" : "Préstamo pagado",
        text: `El traslado ha sido marcado como ${resolucion}`, timer: 2000, showConfirmButton: false
      });
      return true;
    } catch {
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo registrar la resolución del préstamo." });
      return false;
    }
  };

  // AGREGAR VENTA
  const agregarVenta = async (venta) => {
    try {
      const res = await invService.createSale(venta, productos, movimientos, ventas, usuarioActivo);
      // Actualización optimista: primero actualiza el estado local (igual que el original)
      setVentas(prev => [res.nuevaVenta, ...prev]);
      setMovimientos(prev => [...res.nuevosMovimientos.reverse(), ...prev]);
      setProductos(res.productosActualizados);
      Swal.fire({
        icon: "success", title: "Venta registrada",
        text: `Boleta: ${venta.boleta} registrada exitosamente — S/. ${venta.totalVenta.toFixed(2)}`,
        timer: 2500, showConfirmButton: false
      });
      return true;
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message.includes("insufficient_stock") ? "Stock insuficiente para realizar la venta." : "Error al registrar la venta." });
      return false;
    }
  };

  // Stats y Helpers de Dashboard
  const totalProductos = productos.length;
  const valorInventario = useMemo(() => productos.reduce((sum, p) => sum + p.pCompra * p.stock, 0), [productos]);
  const valorVentaInventario = useMemo(() => productos.reduce((sum, p) => sum + p.pVenta * p.stock, 0), [productos]);
  const stockBajo = useMemo(() => productos.filter(p => p.stock > 0 && p.stock <= 5), [productos]);
  const stockAgotado = useMemo(() => productos.filter(p => p.stock === 0), [productos]);
  const totalMovimientos = movimientos.length;
  const ultimosMovimientos = useMemo(() => [...movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 8), [movimientos]);

  const formatFecha = useCallback((fechaStr) => {
    if (!fechaStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const [yyyy, mm, dd] = fechaStr.split("-");
      return `${dd}/${mm}/${yyyy} 00:00:00`;
    }
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(fechaStr)) return fechaStr;
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }, []);

  const value = {
    productos: productosConProveedor, proveedores, movimientos,
    agregarProducto, editarProducto, eliminarProducto,
    agregarProveedor, editarProveedor, eliminarProveedor, marcas, agregarMarca, editarMarca, eliminarMarca,
    registrarMovimiento, getKardex, getProveedorNombre, totalProductos, valorInventario, valorVentaInventario,
    stockBajo, stockAgotado, totalMovimientos, ultimosMovimientos, cargando, traslados, tiendasVecinas,
    agregarTraslado, resolverTraslado, categorias, agregarCategoria, editarCategoria, eliminarCategoria,
    formatFecha, ventas, agregarVenta
  };


  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  );
}