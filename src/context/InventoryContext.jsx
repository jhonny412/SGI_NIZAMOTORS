import { createContext, useState, useCallback, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import i18next from "i18next";
import { writeLog } from "../utils/logger";

const API_URL = "https://script.google.com/macros/s/AKfycbyD8ODjThfNHRBP3bwHn6U6KgO3ECgDUUYPxavY4ZCi82HldN129AxwTg_gYDosHbVr/exec";

export const InventoryContext = createContext();

export function InventoryProvider({ children }) {
  const [productos, setProductos] = useState(() => {
    const saved = localStorage.getItem("sgi-productos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map(p => {
          const pCompra = Number(p.pCompra) || 0;
          const margGanancia = Number(p.margGanancia) || 0;
          const pVenta = (pCompra > 0 && margGanancia < 100)
            ? parseFloat((pCompra / (1 - margGanancia / 100)).toFixed(2))
            : 0;
          const utilidad = pVenta > 0 ? parseFloat((pVenta - pCompra).toFixed(2)) : 0;
          return { ...p, pVenta, utilidad };
        });
      } catch {
        return [];
      }
    }
    return [];
  });
  const [proveedores, setProveedores] = useState(() => {
    try {
      const saved = localStorage.getItem("sgi-proveedores");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing sgi-proveedores:", e);
      return [];
    }
  });
  const [marcas, setMarcas] = useState(() => {
    try {
      const saved = localStorage.getItem("sgi-marcas");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing sgi-marcas:", e);
      return [];
    }
  });
  const [movimientos, setMovimientos] = useState(() => {
    try {
      const saved = localStorage.getItem("sgi-movimientos");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing sgi-movimientos:", e);
      return [];
    }
  });
  const [traslados, setTraslados] = useState(() => {
    try {
      const saved = localStorage.getItem("sgi-traslados");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing sgi-traslados:", e);
      return [];
    }
  });
  const [categorias, setCategorias] = useState(() => {
    try {
      const saved = localStorage.getItem("sgi-categorias");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing sgi-categorias:", e);
      return [];
    }
  });
  const [ventas, setVentas] = useState(() => {
    try {
      const saved = localStorage.getItem("sgi-ventas");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing sgi-ventas:", e);
      return [];
    }
  });

  const [paginaActiva, setPaginaActiva] = useState("dashboard");
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [tema, setTema] = useState(() => localStorage.getItem("sgi-theme") || "dark");

  const [usuarios, setUsuarios] = useState(() => {
    try {
      const saved = localStorage.getItem("sgi-usuarios");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [usuarioActivo, setUsuarioActivo] = useState(() => {
    try {
      const saved = localStorage.getItem("sgi-usuario-activo");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Si tenemos datos en caché, no mostramos el estado de carga inicial
  const [cargando, setCargando] = useState(() => {
    const hasCache = localStorage.getItem("sgi-productos");
    return !hasCache;
  });

  // Obtener datos desde Google Sheets
  useEffect(() => {
    const fetchDatos = async () => {
      // Solo activamos cargando si no hay nada en caché para no bloquear la UI
      if (productos.length === 0) setCargando(true);

      try {
        const [resProd, resProv, resMarcas, resMov, resCat, resTras, resVentas, resUsuarios] = await Promise.all([
          fetch(`${API_URL}?sheet=Productos`),
          fetch(`${API_URL}?sheet=Proveedores`),
          fetch(`${API_URL}?sheet=Marcas`),
          fetch(`${API_URL}?sheet=Movimientos`),
          fetch(`${API_URL}?sheet=Categorias`),
          fetch(`${API_URL}?sheet=Traslados`),
          fetch(`${API_URL}?sheet=Ventas`),
          fetch(`${API_URL}?sheet=Usuarios`)
        ]);

        const [resultProd, resultProv, resultMarcas, resultMov, resultCat, resultTras, resultVentas, resultUsuarios] = await Promise.all([
          resProd.json(),
          resProv.json(),
          resMarcas.json(),
          resMov.json(),
          resCat.json(),
          resTras.json(),
          resVentas.json(),
          resUsuarios.json()
        ]);

        if (resultProd.status === "success") {
          const formatData = resultProd.data.map(p => {
            const pCompra = Number(p.pCompra) || 0;
            const margGanancia = Number(p.margGanancia) || 0;
            const pVenta = (pCompra > 0 && margGanancia < 100)
              ? parseFloat((pCompra / (1 - margGanancia / 100)).toFixed(2))
              : 0;
            const utilidad = pVenta > 0 ? parseFloat((pVenta - pCompra).toFixed(2)) : 0;
            return {
              ...p,
              id: Number(p.id),
              stock: Number(p.stock),
              pCompra,
              margGanancia,
              pVenta,
              utilidad,
              proveedorId: Number(p.proveedorId),
              imagenUrl: p.imagenUrl || "",
              imagenUrl2: p.imagenUrl2 || "",
              imagenUrl3: p.imagenUrl3 || ""
            };
          });
          setProductos(formatData);
          localStorage.setItem("sgi-productos", JSON.stringify(formatData));
        }

        if (resultProv.status === "success") {
          const formatProv = resultProv.data.map(p => ({
            ...p,
            id: Number(p.id)
          }));
          setProveedores(formatProv);
          localStorage.setItem("sgi-proveedores", JSON.stringify(formatProv));
        }

        if (resultMarcas.status === "success") {
          const formatMarcas = resultMarcas.data.map(m => ({
            ...m,
            id: Number(m.id)
          }));
          setMarcas(formatMarcas);
          localStorage.setItem("sgi-marcas", JSON.stringify(formatMarcas));
        }

        if (resultMov.status === "success") {
          const formatMov = resultMov.data.map(m => ({
            ...m,
            id: Number(m.id),
            productoId: Number(m.productoId),
            cantidad: Number(m.cantidad),
            stockAnterior: Number(m.stockAnterior),
            stockNuevo: Number(m.stockNuevo)
          }));
          const sortedMov = formatMov.sort((a, b) => b.id - a.id);
          setMovimientos(sortedMov);
          localStorage.setItem("sgi-movimientos", JSON.stringify(sortedMov));
        }

        if (resultCat.status === "success") {
          const formatCat = resultCat.data.map(c => ({
            ...c,
            id: Number(c.id)
          }));
          setCategorias(formatCat);
          localStorage.setItem("sgi-categorias", JSON.stringify(formatCat));
        }

        if (resultTras.status === "success") {
          const formatTras = resultTras.data.map(t => {
            let parsedItems = [];
            if (t.items) {
              try {
                parsedItems = JSON.parse(t.items);
              } catch (e) {
                console.warn("Error parsing items for traslado", t.id, e);
              }
            }
            return {
              ...t,
              id: Number(t.id),
              total: Number(t.total) || 0,
              cantidad: Number(t.cantidad) || 0,
              productoId: Number(t.productoId) || 0,
              items: parsedItems
            };
          });
          setTraslados(formatTras);
          localStorage.setItem("sgi-traslados", JSON.stringify(formatTras));
        }

        if (resultVentas.status === "success") {
          const formatVentas = resultVentas.data.map(v => {
            let parsedItems = [];
            if (v.items) {
              try {
                parsedItems = JSON.parse(v.items);
              } catch (e) {
                console.warn("Error parsing items for venta", v.id, e);
              }
            }
            return {
              ...v,
              id: Number(v.id),
              totalVenta: Number(v.totalVenta) || 0,
              utilidad: Number(v.utilidad) || 0,
              cantidadTotal: Number(v.cantidadTotal) || 0,
              items: parsedItems
            };
          });
          setVentas(formatVentas);
          localStorage.setItem("sgi-ventas", JSON.stringify(formatVentas));
        }

        // Cargar usuarios desde Google Sheets o usar semillas locales
        if (resultUsuarios && resultUsuarios.status === "success" && Array.isArray(resultUsuarios.data) && resultUsuarios.data.length > 0) {
          const formatUsuarios = resultUsuarios.data.map(u => ({
            ...u,
            id: Number(u.id)
          }));
          setUsuarios(formatUsuarios);
          localStorage.setItem("sgi-usuarios", JSON.stringify(formatUsuarios));
        } else {
          const defaultUsuarios = [
            { id: 1, nombre: "Administrador", pin: "1234", rol: "Admin" },
            { id: 2, nombre: "Vendedor", pin: "5678", rol: "Vendedor" }
          ];
          setUsuarios(defaultUsuarios);
          localStorage.setItem("sgi-usuarios", JSON.stringify(defaultUsuarios));
        }
      } catch (error) {
        console.error("Error al obtener de Google Sheets", error);
        // Fallback local de seguridad para usuarios
        if (usuarios.length === 0) {
          const defaultUsuarios = [
            { id: 1, nombre: "Administrador", pin: "1234", rol: "Admin" },
            { id: 2, nombre: "Vendedor", pin: "5678", rol: "Vendedor" }
          ];
          setUsuarios(defaultUsuarios);
        }
      } finally {
        setCargando(false);
      }
    };
    fetchDatos();
  }, []);

  useEffect(() => {
    // Navegación instantánea
  }, [paginaActiva]);

  useEffect(() => {
    const isDark = tema === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("sgi-theme", tema);
  }, [tema]);

  useEffect(() => {
    localStorage.setItem("sgi-traslados", JSON.stringify(traslados));
  }, [traslados]);

  useEffect(() => {
    localStorage.setItem("sgi-categorias", JSON.stringify(categorias));
  }, [categorias]);

  useEffect(() => {
    localStorage.setItem("sgi-ventas", JSON.stringify(ventas));
  }, [ventas]);

  function toggleTema() {
    setTema((actual) => (actual === "dark" ? "light" : "dark"));
  }

  async function login(id, pin) {
    const user = usuarios.find((u) => u.id === Number(id));
    if (user && String(user.pin) === String(pin)) {
      setUsuarioActivo(user);
      localStorage.setItem("sgi-usuario-activo", JSON.stringify(user));
      writeLog({
        usuario: user.nombre,
        accion: "Inicio de sesión",
        modulo: "Seguridad",
        detalles: `Usuario inició sesión con rol ${user.rol}`,
        estado: "success"
      });
      return true;
    } else {
      Swal.fire({
        icon: "error",
        title: "PIN incorrecto",
        text: "El PIN ingresado no coincide con el perfil seleccionado.",
        confirmButtonColor: "#f59e0b"
      });
      return false;
    }
  }

  function logout() {
    if (usuarioActivo) {
      writeLog({
        usuario: usuarioActivo.nombre,
        accion: "Cierre de sesión",
        modulo: "Seguridad",
        detalles: "Sesión terminada por el usuario"
      });
    }
    setUsuarioActivo(null);
    localStorage.removeItem("sgi-usuario-activo");
  }

  const getProveedorNombre = useCallback(
    (proveedorId) => {
      const prov = proveedores.find((p) => p.id === proveedorId);
      return prov ? prov.nombre : "Sin proveedor";
    },
    [proveedores]
  );

  const productosConProveedor = useMemo(() => {
    return productos.map((p) => ({
      ...p,
      proveedorNombre: getProveedorNombre(p.proveedorId),
    }));
  }, [productos, getProveedorNombre]);

  // PRODUCTOS CRUD
  async function agregarProducto(producto) {
    const { pCompra, margGanancia } = producto;
    const pVenta = (pCompra > 0 && margGanancia < 100)
      ? parseFloat((pCompra / (1 - margGanancia / 100)).toFixed(2))
      : 0;
    const utilidad = pVenta > 0 ? parseFloat((pVenta - pCompra).toFixed(2)) : 0;
    const nuevoId =
      productos.length > 0 ? Math.max(...productos.map((p) => p.id)) + 1 : 1;
    const nuevo = { ...producto, id: nuevoId, pVenta, utilidad };

    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ ...nuevo, sheet: "Productos" })
      });
      setProductos((prev) => [...prev, nuevo]);
      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: "Agregar Producto",
        modulo: "Productos",
        detalles: `ID: ${nuevo.id}, Código: ${nuevo.codigo}, Desc: ${nuevo.descripcion}, Stock: ${nuevo.stock}`
      });
      Swal.fire({
        icon: "success",
        title: i18next.t("alerts.product_added"),
        text: i18next.t("alerts.product_added_text"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("No se pudo guardar en Google Sheets", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Agregar Producto", modulo: "Productos", detalles: `Fallo: ${err.message}`, estado: "error" });
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo guardar el producto. Verifica tu conexión a internet e inténtalo de nuevo." });
    }
  }

  async function editarProducto(producto, silencioso = false) {
    const { pCompra, margGanancia } = producto;
    const pVenta = (pCompra > 0 && margGanancia < 100)
      ? parseFloat((pCompra / (1 - margGanancia / 100)).toFixed(2))
      : 0;
    const utilidad = pVenta > 0 ? parseFloat((pVenta - pCompra).toFixed(2)) : 0;
    const actualizado = { ...producto, pVenta, utilidad };

    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ ...actualizado, sheet: "Productos", action: "edit" })
      });
      setProductos((prev) => prev.map((p) => (p.id === producto.id ? actualizado : p)));
      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: "Editar Producto",
        modulo: "Productos",
        detalles: `ID: ${producto.id}, Código: ${producto.codigo}, Desc: ${producto.descripcion}, Stock: ${producto.stock}`
      });
      if (!silencioso) {
        Swal.fire({ icon: "success", title: i18next.t("alerts.product_updated"), text: i18next.t("alerts.product_updated_text"), timer: 1500, showConfirmButton: false });
      }
    } catch (err) {
      console.error("Error al editar en Sheets", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Editar Producto", modulo: "Productos", detalles: `Fallo: ${err.message}`, estado: "error" });
      if (!silencioso) {
        Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo actualizar el producto. Verifica tu conexión a internet e inténtalo de nuevo." });
      }
    }
  }

  function eliminarProducto(id) {
    Swal.fire({
      title: i18next.t("alerts.delete_product_title"),
      text: i18next.t("alerts.delete_warning_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: i18next.t("alerts.confirm_delete"),
      cancelButtonText: i18next.t("forms.product.cancel"),
    }).then(async (result) => {
      if (result.isConfirmed) {
        const prod = productos.find(p => p.id === id);
        try {
          await fetch(API_URL, { method: "POST", body: JSON.stringify({ id, sheet: "Productos", action: "delete" }) });
          setProductos((prev) => prev.filter((p) => p.id !== id));
          setMovimientos((prev) => prev.filter((m) => m.productoId !== id));
          writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Eliminar Producto", modulo: "Productos", detalles: `ID: ${id}, Código: ${prod?.codigo || ''}, Desc: ${prod?.descripcion || ''}` });
          Swal.fire({ icon: "success", title: i18next.t("alerts.deleted"), text: i18next.t("alerts.product_deleted_text"), timer: 1500, showConfirmButton: false });
        } catch (err) {
          console.error("Error al eliminar en Sheets", err);
          writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Eliminar Producto", modulo: "Productos", detalles: `Fallo: ${err.message}`, estado: "error" });
          Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo eliminar el producto. Verifica tu conexión a internet e inténtalo de nuevo." });
        }
      }
    });
  }

  // PROVEEDORES CRUD
  async function agregarProveedor(proveedor) {
    const nuevoId = proveedores.length > 0 ? Math.max(...proveedores.map((p) => p.id)) + 1 : 1;
    const nuevo = { ...proveedor, id: nuevoId };
    try {
      await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...nuevo, sheet: "Proveedores" }) });
      setProveedores((prev) => [...prev, nuevo]);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Agregar Proveedor", modulo: "Proveedores", detalles: `ID: ${nuevo.id}, Nombre: ${nuevo.nombre}` });
      Swal.fire({ icon: "success", title: i18next.t("alerts.supplier_added"), timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("No se pudo guardar proveedor en Sheets", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Agregar Proveedor", modulo: "Proveedores", detalles: `Fallo: ${err.message}`, estado: "error" });
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo guardar el proveedor. Verifica tu conexión e inténtalo de nuevo." });
    }
  }

  async function editarProveedor(proveedor) {
    try {
      await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...proveedor, sheet: "Proveedores", action: "edit" }) });
      setProveedores((prev) => prev.map((p) => (p.id === proveedor.id ? proveedor : p)));
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Editar Proveedor", modulo: "Proveedores", detalles: `ID: ${proveedor.id}, Nombre: ${proveedor.nombre}` });
      Swal.fire({ icon: "success", title: i18next.t("alerts.supplier_updated"), timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error al editar proveedor", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Editar Proveedor", modulo: "Proveedores", detalles: `Fallo: ${err.message}`, estado: "error" });
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo actualizar el proveedor. Verifica tu conexión e inténtalo de nuevo." });
    }
  }

  function eliminarProveedor(id) {
    const enUso = productos.some((p) => p.proveedorId === id);
    if (enUso) {
      Swal.fire({ icon: "error", title: i18next.t("alerts.cannot_delete"), text: i18next.t("alerts.supplier_in_use") });
      return;
    }
    Swal.fire({
      title: i18next.t("alerts.delete_supplier_title"),
      text: i18next.t("alerts.delete_warning_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: i18next.t("alerts.confirm_delete"),
      cancelButtonText: i18next.t("forms.product.cancel"),
    }).then(async (result) => {
      if (result.isConfirmed) {
        const prov = proveedores.find((p) => p.id === id);
        try {
          await fetch(API_URL, { method: "POST", body: JSON.stringify({ id, sheet: "Proveedores", action: "delete" }) });
          setProveedores((prev) => prev.filter((p) => p.id !== id));
          writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Eliminar Proveedor", modulo: "Proveedores", detalles: `ID: ${id}, Nombre: ${prov?.nombre || ''}` });
          Swal.fire({ icon: "success", title: i18next.t("alerts.deleted"), timer: 1500, showConfirmButton: false });
        } catch (err) {
          console.error("Error al eliminar proveedor", err);
          writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Eliminar Proveedor", modulo: "Proveedores", detalles: `Fallo: ${err.message}`, estado: "error" });
          Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo eliminar el proveedor. Verifica tu conexión e inténtalo de nuevo." });
        }
      }
    });
  }

  // MARCAS CRUD
  async function agregarMarca(marca) {
    const nuevoId = marcas.length > 0 ? Math.max(...marcas.map((m) => m.id)) + 1 : 1;
    const nuevo = { ...marca, id: nuevoId };
    try {
      await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...nuevo, sheet: "Marcas" }) });
      setMarcas((prev) => [...prev, nuevo]);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Agregar Marca", modulo: "Marcas", detalles: `ID: ${nuevo.id}, Nombre: ${nuevo.nombre}` });
      Swal.fire({ icon: "success", title: i18next.t("alerts.brand_added"), timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("No se pudo guardar marca en Sheets", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Agregar Marca", modulo: "Marcas", detalles: `Fallo: ${err.message}`, estado: "error" });
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo guardar la marca. Verifica tu conexión e inténtalo de nuevo." });
    }
  }

  async function editarMarca(marca) {
    try {
      await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...marca, sheet: "Marcas", action: "edit" }) });
      setMarcas((prev) => prev.map((m) => (m.id === marca.id ? marca : m)));
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Editar Marca", modulo: "Marcas", detalles: `ID: ${marca.id}, Nombre: ${marca.nombre}` });
      Swal.fire({ icon: "success", title: i18next.t("alerts.brand_updated"), timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error al editar marca", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Editar Marca", modulo: "Marcas", detalles: `Fallo: ${err.message}`, estado: "error" });
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo actualizar la marca. Verifica tu conexión e inténtalo de nuevo." });
    }
  }

  function eliminarMarca(id) {
    const enUso = productos.some((p) => p.marca === marcas.find(m => m.id === id)?.nombre);
    if (enUso) {
      Swal.fire({ icon: "error", title: i18next.t("alerts.cannot_delete"), text: i18next.t("alerts.brand_in_use") });
      return;
    }
    Swal.fire({
      title: i18next.t("alerts.delete_brand_title"),
      text: i18next.t("alerts.delete_warning_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: i18next.t("alerts.confirm_delete"),
    }).then(async (result) => {
      if (result.isConfirmed) {
        const m = marcas.find(x => x.id === id);
        try {
          await fetch(API_URL, { method: "POST", body: JSON.stringify({ id, sheet: "Marcas", action: "delete" }) });
          setMarcas((prev) => prev.filter((m) => m.id !== id));
          writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Eliminar Marca", modulo: "Marcas", detalles: `ID: ${id}, Nombre: ${m?.nombre || ''}` });
          Swal.fire({ icon: "success", title: i18next.t("alerts.deleted"), timer: 1500, showConfirmButton: false });
        } catch (err) {
          console.error("Error al eliminar marca", err);
          writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Eliminar Marca", modulo: "Marcas", detalles: `Fallo: ${err.message}`, estado: "error" });
          Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo eliminar la marca. Verifica tu conexión e inténtalo de nuevo." });
        }
      }
    });
  }

  // CATEGORIAS CRUD
  async function agregarCategoria(categoria) {
    const nuevoId = categorias.length > 0 ? Math.max(...categorias.map((c) => c.id)) + 1 : 1;
    const nuevo = { ...categoria, id: nuevoId };
    try {
      await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...nuevo, sheet: "Categorias" }) });
      setCategorias((prev) => [...prev, nuevo]);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Agregar Categoría", modulo: "Categorías", detalles: `ID: ${nuevo.id}, Nombre: ${nuevo.nombre}` });
      Swal.fire({ icon: "success", title: "Categoría agregada", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("No se pudo guardar categoría en Sheets", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Agregar Categoría", modulo: "Categorías", detalles: `Fallo: ${err.message}`, estado: "error" });
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo guardar la categoría. Verifica tu conexión e inténtalo de nuevo." });
    }
  }

  async function editarCategoria(categoria) {
    try {
      await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...categoria, sheet: "Categorias", action: "edit" }) });
      setCategorias((prev) => prev.map((c) => (c.id === categoria.id ? categoria : c)));
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Editar Categoría", modulo: "Categorías", detalles: `ID: ${categoria.id}, Nombre: ${categoria.nombre}` });
      Swal.fire({ icon: "success", title: "Categoría actualizada", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error al editar categoría", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Editar Categoría", modulo: "Categorías", detalles: `Fallo: ${err.message}`, estado: "error" });
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo actualizar la categoría. Verifica tu conexión e inténtalo de nuevo." });
    }
  }

  function eliminarCategoria(id) {
    const cat = categorias.find((c) => c.id === id);
    const enUso = productos.some((p) => p.categoria === cat?.nombre);
    if (enUso) {
      Swal.fire({ icon: "error", title: i18next.t("alerts.cannot_delete"), text: "Hay productos asociados a esta categoría" });
      return;
    }
    Swal.fire({
      title: "¿Eliminar categoría?",
      text: i18next.t("alerts.delete_warning_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: i18next.t("alerts.confirm_delete"),
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch(API_URL, { method: "POST", body: JSON.stringify({ id, sheet: "Categorias", action: "delete" }) });
          setCategorias((prev) => prev.filter((c) => c.id !== id));
          writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Eliminar Categoría", modulo: "Categorías", detalles: `ID: ${id}, Nombre: ${cat?.nombre || ''}` });
          Swal.fire({ icon: "success", title: i18next.t("alerts.deleted"), timer: 1500, showConfirmButton: false });
        } catch (err) {
          console.error("Error al eliminar categoría", err);
          writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: "Eliminar Categoría", modulo: "Categorías", detalles: `Fallo: ${err.message}`, estado: "error" });
          Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo eliminar la categoría. Verifica tu conexión e inténtalo de nuevo." });
        }
      }
    });
  }

  // MOVIMIENTOS
  async function registrarMovimiento({ productoId, tipo, cantidad, motivo }) {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) {
      Swal.fire({ icon: "error", title: i18next.t("alerts.product_not_found") });
      return false;
    }
    if (tipo === "salida" && producto.stock < cantidad) {
      Swal.fire({
        icon: "error",
        title: i18next.t("forms.movement.insufficient_stock"),
        text: i18next.t("forms.movement.insufficient_message_detail", { stock: producto.stock, qty: cantidad }),
      });
      return false;
    }
    const stockAnterior = producto.stock;
    const stockNuevo = tipo === "entrada" ? stockAnterior + cantidad : stockAnterior - cantidad;
    const nuevoId = movimientos.length > 0 ? Math.max(...movimientos.map((m) => m.id)) + 1 : 1;
    const today = new Date().toISOString();
    const nuevoMov = {
      id: nuevoId, productoId, tipo, cantidad,
      fecha: today,
      motivo: motivo || (tipo === "entrada" ? "Ingreso" : "Egreso"),
      stockAnterior, stockNuevo,
    };

    try {
      await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...nuevoMov, sheet: "Movimientos" }) });
      await fetch(API_URL, { method: "POST", body: JSON.stringify({ id: productoId, stock: stockNuevo, sheet: "Productos", action: "edit" }) });
      setMovimientos((prev) => [nuevoMov, ...prev]);
      setProductos((prev) => prev.map((p) => p.id === productoId ? { ...p, stock: stockNuevo } : p));
      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: `Movimiento de ${tipo === "entrada" ? "Entrada" : "Salida"}`,
        modulo: "Movimientos",
        detalles: `Producto ID: ${productoId}, Desc: ${producto.descripcion}, Cantidad: ${cantidad}, Motivo: ${nuevoMov.motivo}`
      });
      Swal.fire({
        icon: "success",
        title: tipo === "entrada" ? i18next.t("alerts.entry_registered") : i18next.t("alerts.exit_registered"),
        text: i18next.t("alerts.new_stock_text", { desc: producto.descripcion, stock: stockNuevo }),
        timer: 2000,
        showConfirmButton: false,
      });
      return true;
    } catch (err) {
      console.error("Error al sincronizar movimiento con Sheets", err);
      writeLog({ usuario: usuarioActivo?.nombre || "Sistema", accion: `Movimiento de ${tipo === "entrada" ? "Entrada" : "Salida"}`, modulo: "Movimientos", detalles: `Fallo: ${err.message}`, estado: "error" });
      Swal.fire({ icon: "error", title: "Error de Conexión", text: "No se pudo registrar el movimiento. Verifica tu conexión a internet e inténtalo de nuevo." });
      return false;
    }
  }

  // Kardex: historial filtrado de un producto
  function getKardex(productoId) {
    return movimientos
      .filter((m) => m.productoId === productoId)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }

  // TIENDAS VECINAS PREDEFINIDAS
  const tiendasVecinas = [
    "CANDAO",
    "NUÑEZ",
    "QUIJADA"
  ];

  // TRASLADOS CRUD
  async function agregarTraslado({ tiendaVecina, items, notas }) {
    // items: [{ productoId, cantidad }]
    if (!tiendaVecina || !items || items.length === 0) return false;
    const today = new Date().toISOString();

    // 1. Validar stock suficiente para todos los ítems ANTES de modificar nada
    for (const item of items) {
      const producto = productos.find((p) => p.id === item.productoId);
      if (!producto) {
        Swal.fire({ icon: "error", title: i18next.t("alerts.product_not_found") });
        return false;
      }
      if (producto.stock < item.cantidad) {
        Swal.fire({
          icon: "error",
          title: i18next.t("forms.movement.insufficient_stock"),
          text: `"${producto.descripcion}" — ${i18next.t("forms.movement.insufficient_message_detail", {
            stock: producto.stock,
            qty: item.cantidad,
          })}`,
        });
        return false;
      }
    }

    // 2. Preparar lista enriquecida de ítems con precio de venta y stock anterior
    const productosActuales = [...productos]; // snapshot para cálculos
    const itemsEnriquecidos = items.map((item) => {
      const p = productosActuales.find((x) => x.id === item.productoId);
      return {
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioVenta: p.pVenta,
        total: parseFloat((p.pVenta * item.cantidad).toFixed(2)),
      };
    });
    const totalGeneral = parseFloat(
      itemsEnriquecidos.reduce((s, i) => s + i.total, 0).toFixed(2)
    );
    const cantidadTotal = itemsEnriquecidos.reduce((s, i) => s + i.cantidad, 0);

    const nuevoId = traslados.length > 0 ? Math.max(...traslados.map((t) => t.id)) + 1 : 1;

    const nuevoTraslado = {
      id: nuevoId,
      tiendaVecina,
      fechaPrestamo: today,
      total: totalGeneral,
      cantidad: cantidadTotal,
      estado: "pendiente",
      fechaResolucion: null,
      notas: notas || "",
      items: itemsEnriquecidos,
      // Legacy: primer productoId para compatibilidad con código anterior
      productoId: itemsEnriquecidos[0].productoId,
    };

    // 3. Construir movimientos de salida e inventario actualizado para cada ítem
    const nuevosMovimientos = [];
    let baseMovId = movimientos.length > 0 ? Math.max(...movimientos.map((m) => m.id)) + 1 : 1;

    const productosActualizados = productosActuales.map((p) => {
      const item = itemsEnriquecidos.find((i) => i.productoId === p.id);
      if (!item) return p;
      const stockAnterior = p.stock;
      const stockNuevo = stockAnterior - item.cantidad;
      nuevosMovimientos.push({
        id: baseMovId++,
        productoId: p.id,
        tipo: "salida",
        cantidad: item.cantidad,
        fecha: today,
        motivo: `Préstamo a ${tiendaVecina}`,
        stockAnterior,
        stockNuevo,
      });
      return { ...p, stock: stockNuevo };
    });

    try {
      // Sincronizar con Google Sheets primero
      // Sincronizar cada movimiento
      for (const mov of nuevosMovimientos) {
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...mov, sheet: "Movimientos" }) });
      }
      // Sincronizar stock de cada producto
      for (const item of itemsEnriquecidos) {
        const prod = productosActualizados.find((p) => p.id === item.productoId);
        if (prod) {
          await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ id: prod.id, stock: prod.stock, sheet: "Productos", action: "edit" }),
          });
        }
      }
      // Sincronizar cabecera del traslado (serializar items para Sheets)
      const resumenItems = itemsEnriquecidos
        .map((i) => {
          const p = productosActualizados.find((x) => x.id === i.productoId);
          return `${p ? p.descripcion : i.productoId} (x${i.cantidad})`;
        })
        .join(" | ");
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          ...nuevoTraslado,
          items: JSON.stringify(nuevoTraslado.items), // Serialize items list
          itemsResumen: resumenItems,
          sheet: "Traslados",
        }),
      });

      // Si todo fue exitoso, actualizar estado local
      setTraslados((prev) => [nuevoTraslado, ...prev]);
      setMovimientos((prev) => [...nuevosMovimientos.reverse(), ...prev]);
      setProductos(productosActualizados);

      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: "Crear Traslado / Préstamo",
        modulo: "Traslados",
        detalles: `ID Traslado: ${nuevoTraslado.id}, Tienda Vecina: ${tiendaVecina}, Total: S/. ${totalGeneral}`
      });

      Swal.fire({
        icon: "success",
        title: "Préstamo registrado",
        text: `${itemsEnriquecidos.length} repuesto(s) prestado(s) a ${tiendaVecina} — S/. ${totalGeneral.toFixed(2)}`,
        timer: 2500,
        showConfirmButton: false,
      });
      return true;
    } catch (err) {
      console.error("Error al sincronizar traslado con Sheets", err);
      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: "Crear Traslado / Préstamo",
        modulo: "Traslados",
        detalles: `Fallo al sincronizar: ${err.message}`,
        estado: "error"
      });
      Swal.fire({
        icon: "error",
        title: "Error de Conexión",
        text: "No se pudo conectar con el servidor para registrar el préstamo. Por favor, verifica tu conexión a internet e inténtalo de nuevo."
      });
      return false;
    }
  }

  async function resolverTraslado(id, resolucion) {
    const traslado = traslados.find((t) => t.id === id);
    if (!traslado) return false;
    const today = new Date().toISOString();

    // Soporte para estructura antigua (sin items) y nueva (con items[])
    const itemsParaResolver = traslado.items && traslado.items.length > 0
      ? traslado.items
      : [{ productoId: traslado.productoId, cantidad: traslado.cantidad, precioVenta: 0, total: traslado.total }];

    let baseMovId = movimientos.length > 0 ? Math.max(...movimientos.map((m) => m.id)) + 1 : 1;
    const nuevosMovimientos = [];
    let productosActualizados = [...productos];

    if (resolucion === "devuelto") {
      productosActualizados = productos.map((p) => {
        const item = itemsParaResolver.find((i) => i.productoId === p.id);
        if (!item) return p;
        const stockAnterior = p.stock;
        const stockNuevo = stockAnterior + item.cantidad;
        nuevosMovimientos.push({
          id: baseMovId++,
          productoId: p.id,
          tipo: "entrada",
          cantidad: item.cantidad,
          fecha: today,
          motivo: `Devolución de préstamo por ${traslado.tiendaVecina}`,
          stockAnterior,
          stockNuevo,
        });
        return { ...p, stock: stockNuevo };
      });
    } else if (resolucion === "pagado") {
      // Solo registrar un movimiento de nota por el total
      const nuevoMov = {
        id: baseMovId,
        productoId: itemsParaResolver[0].productoId,
        tipo: "entrada",
        cantidad: 0,
        fecha: today,
        motivo: `Pago en efectivo del préstamo por ${traslado.tiendaVecina} (S/. ${traslado.total.toFixed(2)})`,
        stockAnterior: 0,
        stockNuevo: 0,
      };
      nuevosMovimientos.push(nuevoMov);
    }

    try {
      // Sincronizar movimientos con Google Sheets
      for (const mov of nuevosMovimientos) {
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...mov, sheet: "Movimientos" }) });
      }

      // Sincronizar stock si fue devuelto
      if (resolucion === "devuelto") {
        for (const item of itemsParaResolver) {
          const prod = productosActualizados.find((p) => p.id === item.productoId);
          if (prod) {
            await fetch(API_URL, {
              method: "POST",
              body: JSON.stringify({ id: prod.id, stock: prod.stock, sheet: "Productos", action: "edit" }),
            });
          }
        }
      }

      // Sincronizar cabecera del traslado
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ id, estado: resolucion, fechaResolucion: today.split("T")[0], sheet: "Traslados", action: "edit" }),
      });

      // Si todo fue exitoso, actualizar estado local
      if (resolucion === "devuelto") {
        setProductos(productosActualizados);
      }
      setMovimientos((prev) => [...nuevosMovimientos.map(m => ({ ...m })), ...prev]);
      setTraslados((prev) =>
        prev.map((t) => (t.id === id ? { ...t, estado: resolucion, fechaResolucion: today.split("T")[0] } : t))
      );

      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: `Resolver Traslado - ${resolucion}`,
        modulo: "Traslados",
        detalles: `ID Traslado: ${id}, Tienda: ${traslado.tiendaVecina}`
      });

      Swal.fire({
        icon: "success",
        title: resolucion === "devuelto" ? "Repuesto(s) devuelto(s)" : "Préstamo pagado",
        text: `El traslado ha sido marcado como ${resolucion}`,
        timer: 2000,
        showConfirmButton: false,
      });
      return true;
    } catch (err) {
      console.error(err);
      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: `Resolver Traslado - ${resolucion}`,
        modulo: "Traslados",
        detalles: `Fallo al registrar resolución: ${err.message}`,
        estado: "error"
      });
      Swal.fire({
        icon: "error",
        title: "Error de Conexión",
        text: "No se pudo conectar con el servidor para registrar la resolución del préstamo. Revisa tu conexión a internet e inténtalo de nuevo."
      });
      return false;
    }
  }

  // AGREGAR VENTA
  async function agregarVenta(venta) {
    // venta: { boleta, fecha, cliente, metodoPago, totalVenta, utilidad, cantidadTotal, direccion, items }
    // items: [{ productoId, cantidad, precioUnitario, nuevoMargen }]
    if (!venta.items || venta.items.length === 0) return false;
    const today = new Date().toISOString();

    // 1. Validar stock suficiente para todos los ítems
    for (const item of venta.items) {
      const producto = productos.find((p) => p.id === item.productoId);
      if (!producto) {
        Swal.fire({ icon: "error", title: i18next.t("alerts.product_not_found") });
        return false;
      }
      if (producto.stock < item.cantidad) {
        Swal.fire({
          icon: "error",
          title: i18next.t("forms.movement.insufficient_stock"),
          text: `"${producto.descripcion}" — ${i18next.t("forms.movement.insufficient_message_detail", {
            stock: producto.stock,
            qty: item.cantidad,
          })}`,
        });
        return false;
      }
    }

    const nuevoId = ventas.length > 0 ? Math.max(...ventas.map((v) => v.id)) + 1 : 1;
    const nuevaVenta = {
      ...venta,
      id: nuevoId,
      fecha: today
    };

    // 2. Construir movimientos de salida e inventario actualizado para cada ítem
    const nuevosMovimientos = [];
    let baseMovId = movimientos.length > 0 ? Math.max(...movimientos.map((m) => m.id)) + 1 : 1;

    const productosActuales = [...productos];
    const productosActualizados = productosActuales.map((p) => {
      const item = venta.items.find((i) => i.productoId === p.id);
      if (!item) return p;
      const stockAnterior = p.stock;
      const stockNuevo = stockAnterior - item.cantidad;

      // Update margin if it has been customized during sale
      let updatedProd = { ...p, stock: stockNuevo };
      if (item.nuevoMargen !== undefined && item.nuevoMargen !== p.margGanancia) {
        const margGanancia = item.nuevoMargen;
        const pCompra = p.pCompra;
        const pVenta = (pCompra > 0 && margGanancia < 100)
          ? parseFloat((pCompra / (1 - margGanancia / 100)).toFixed(2))
          : 0;
        const utilidad = pVenta > 0 ? parseFloat((pVenta - pCompra).toFixed(2)) : 0;
        updatedProd.margGanancia = margGanancia;
        updatedProd.pVenta = pVenta;
        updatedProd.utilidad = utilidad;
      }

      nuevosMovimientos.push({
        id: baseMovId++,
        productoId: p.id,
        type: "salida", // wait, in GOOGLE_APPS_SCRIPT/mockData it is "tipo" instead of "type"
        tipo: "salida",
        cantidad: item.cantidad,
        fecha: today,
        motivo: `Venta - Boleta: ${venta.boleta}`,
        stockAnterior,
        stockNuevo,
      });
      return updatedProd;
    });

    // 3. Actualizar estado local (optimista)
    setVentas((prev) => [nuevaVenta, ...prev]);
    setMovimientos((prev) => [...nuevosMovimientos.reverse(), ...prev]);
    setProductos(productosActualizados);

    // 4. Sincronizar con Google Sheets de forma asíncrona
    try {
      // Sincronizar cabecera de la venta (serializar items para Sheets)
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          ...nuevaVenta,
          items: JSON.stringify(nuevaVenta.items), // Serialize items list
          sheet: "Ventas",
        }),
      });

      // Sincronizar cada movimiento
      for (const mov of nuevosMovimientos) {
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ ...mov, sheet: "Movimientos" }) });
      }

      // Sincronizar stock y precio/margen de cada producto
      for (const item of venta.items) {
        const prod = productosActualizados.find((p) => p.id === item.productoId);
        if (prod) {
          const originalProd = productosActuales.find((p) => p.id === item.productoId);
          const marginChanged = originalProd && item.nuevoMargen !== undefined && item.nuevoMargen !== originalProd.margGanancia;
          if (marginChanged) {
            await fetch(API_URL, {
              method: "POST",
              body: JSON.stringify({ ...prod, sheet: "Productos", action: "edit" }),
            });
          } else {
            await fetch(API_URL, {
              method: "POST",
              body: JSON.stringify({ id: prod.id, stock: prod.stock, sheet: "Productos", action: "edit" }),
            });
          }
        }
      }

      // Si todo fue exitoso, actualizar estado local y loguear
      setVentas((prev) => [nuevaVenta, ...prev]);
      setMovimientos((prev) => [...nuevosMovimientos.reverse(), ...prev]);
      setProductos(productosActualizados);

      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: "Registrar Venta",
        modulo: "Ventas",
        detalles: `ID Venta: ${nuevaVenta.id}, Boleta: ${venta.boleta}, Cliente: ${venta.cliente}, Total: S/. ${venta.totalVenta}`
      });

      Swal.fire({
        icon: "success",
        title: "Venta registrada",
        text: `Boleta: ${venta.boleta} registrada exitosamente — S/. ${venta.totalVenta.toFixed(2)}`,
        timer: 2500,
        showConfirmButton: false,
      });
      return true;
    } catch (err) {
      console.error("Error al sincronizar venta con Sheets", err);
      writeLog({
        usuario: usuarioActivo?.nombre || "Sistema",
        accion: "Registrar Venta",
        modulo: "Ventas",
        detalles: `Fallo al sincronizar venta: ${err.message}`,
        estado: "error"
      });
      Swal.fire({
        icon: "error",
        title: "Error de Conexión",
        text: "No se pudo conectar con el servidor para registrar la venta. Por favor, verifica tu conexión a internet e inténtalo de nuevo."
      });
      return false;
    }
  }

  // Stats para dashboard
  const totalProductos = productos.length;
  const valorInventario = productos.reduce(
    (sum, p) => sum + p.pCompra * p.stock,
    0
  );
  const valorVentaInventario = productos.reduce(
    (sum, p) => sum + p.pVenta * p.stock,
    0
  );
  const stockBajo = productos.filter((p) => p.stock > 0 && p.stock <= 5);
  const stockAgotado = productos.filter((p) => p.stock === 0);
  const totalMovimientos = movimientos.length;
  const ultimosMovimientos = [...movimientos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 8);

  const formatFecha = useCallback((fechaStr) => {
    if (!fechaStr) return "";
    // Si tiene formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const [yyyy, mm, dd] = fechaStr.split("-");
      return `${dd}/${mm}/${yyyy} 00:00:00`;
    }
    // Si ya viene formateado como dd/MM/yyyy HH:mm:ss, retornarlo
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(fechaStr)) {
      return fechaStr;
    }
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
    productos: productosConProveedor,
    proveedores,
    movimientos,
    paginaActiva,
    setPaginaActiva,
    sidebarAbierto,
    setSidebarAbierto,
    tema,
    toggleTema,
    agregarProducto,
    editarProducto,
    eliminarProducto,
    agregarProveedor,
    editarProveedor,
    eliminarProveedor,
    marcas,
    agregarMarca,
    editarMarca,
    eliminarMarca,
    registrarMovimiento,
    getKardex,
    getProveedorNombre,
    totalProductos,
    valorInventario,
    valorVentaInventario,
    stockBajo,
    stockAgotado,
    totalMovimientos,
    ultimosMovimientos,
    cargando,
    traslados,
    tiendasVecinas,
    agregarTraslado,
    resolverTraslado,
    categorias,
    agregarCategoria,
    editarCategoria,
    eliminarCategoria,
    formatFecha,
    ventas,
    agregarVenta,
    usuarios,
    usuarioActivo,
    login,
    logout,
  };

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  );
}



