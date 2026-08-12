import { postAction } from "./api";
import { calculatePricing } from "../utils/pricing";
import { writeLog } from "../utils/logger";

// ─────────────────────────────────────────────────────────────
// FORMATTERS (Data Translation Layer)
// ─────────────────────────────────────────────────────────────

export function formatProductos(data) {
  return data.map(p => {
    const pCompra = Number(p.pCompra) || 0;
    const margGanancia = Number(p.margGanancia) || 0;
    const { pVenta, utilidad } = calculatePricing(pCompra, margGanancia);
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
}

export function formatMovements(data) {
  return data.map(m => ({
    ...m,
    id: Number(m.id),
    productoId: Number(m.productoId),
    cantidad: Number(m.cantidad),
    stockAnterior: Number(m.stockAnterior),
    stockNuevo: Number(m.stockNuevo)
  })).sort((a, b) => b.id - a.id);
}

export function formatTransfers(data) {
  return data.map(t => {
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
}

export function formatSales(data) {
  return data.map(v => {
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
}

// ─────────────────────────────────────────────────────────────
// PRODUCT CRUD
// ─────────────────────────────────────────────────────────────

export async function saveProduct(producto, currentProducts, userActive) {
  const isEdit = !!producto.id;
  const { pCompra, margGanancia } = producto;
  const { pVenta, utilidad } = calculatePricing(pCompra, margGanancia);

  let finalProduct;
  if (isEdit) {
    finalProduct = { ...producto, pVenta, utilidad };
    await postAction("Productos", "edit", finalProduct);
  } else {
    const nuevoId = currentProducts.length > 0 ? Math.max(...currentProducts.map((p) => p.id)) + 1 : 1;
    finalProduct = { ...producto, id: nuevoId, pVenta, utilidad };
    await postAction("Productos", "create", finalProduct);
  }

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: isEdit ? "Editar Producto" : "Agregar Producto",
    modulo: "Productos",
    detalles: `ID: ${finalProduct.id}, Código: ${finalProduct.codigo}, Desc: ${finalProduct.descripcion}, Stock: ${finalProduct.stock}`
  });

  return finalProduct;
}

export async function deleteProductApi(id, product, userActive) {
  await postAction("Productos", "delete", { id });
  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: "Eliminar Producto",
    modulo: "Productos",
    detalles: `ID: ${id}, Código: ${product?.codigo || ''}, Desc: ${product?.descripcion || ''}`
  });
}

// ─────────────────────────────────────────────────────────────
// SUPPLIER CRUD
// ─────────────────────────────────────────────────────────────

export async function saveSupplier(supplier, currentSuppliers, userActive) {
  const isEdit = !!supplier.id;
  let finalSupplier;

  if (isEdit) {
    finalSupplier = { ...supplier };
    await postAction("Proveedores", "edit", finalSupplier);
  } else {
    const nuevoId = currentSuppliers.length > 0 ? Math.max(...currentSuppliers.map((s) => s.id)) + 1 : 1;
    finalSupplier = { ...supplier, id: nuevoId };
    await postAction("Proveedores", "create", finalSupplier);
  }

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: isEdit ? "Editar Proveedor" : "Agregar Proveedor",
    modulo: "Proveedores",
    detalles: `ID: ${finalSupplier.id}, Nombre: ${finalSupplier.nombre}`
  });

  return finalSupplier;
}

export async function deleteSupplierApi(id, supplier, userActive) {
  await postAction("Proveedores", "delete", { id });
  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: "Eliminar Proveedor",
    modulo: "Proveedores",
    detalles: `ID: ${id}, Nombre: ${supplier?.nombre || ''}`
  });
}

// ─────────────────────────────────────────────────────────────
// BRAND CRUD
// ─────────────────────────────────────────────────────────────

export async function saveBrand(brand, currentBrands, userActive) {
  const isEdit = !!brand.id;
  let finalBrand;

  if (isEdit) {
    finalBrand = { ...brand };
    await postAction("Marcas", "edit", finalBrand);
  } else {
    const nuevoId = currentBrands.length > 0 ? Math.max(...currentBrands.map((m) => m.id)) + 1 : 1;
    finalBrand = { ...brand, id: nuevoId };
    await postAction("Marcas", "create", finalBrand);
  }

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: isEdit ? "Editar Marca" : "Agregar Marca",
    modulo: "Marcas",
    detalles: `ID: ${finalBrand.id}, Nombre: ${finalBrand.nombre}`
  });

  return finalBrand;
}

export async function deleteBrandApi(id, brand, userActive) {
  await postAction("Marcas", "delete", { id });
  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: "Eliminar Marca",
    modulo: "Marcas",
    detalles: `ID: ${id}, Nombre: ${brand?.nombre || ''}`
  });
}

// ─────────────────────────────────────────────────────────────
// CATEGORY CRUD
// ─────────────────────────────────────────────────────────────

export async function saveCategory(category, currentCategories, userActive) {
  const isEdit = !!category.id;
  let finalCategory;

  if (isEdit) {
    finalCategory = { ...category };
    await postAction("Categorias", "edit", finalCategory);
  } else {
    const nuevoId = currentCategories.length > 0 ? Math.max(...currentCategories.map((c) => c.id)) + 1 : 1;
    finalCategory = { ...category, id: nuevoId };
    await postAction("Categorias", "create", finalCategory);
  }

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: isEdit ? "Editar Categoría" : "Agregar Categoría",
    modulo: "Categorías",
    detalles: `ID: ${finalCategory.id}, Nombre: ${finalCategory.nombre}`
  });

  return finalCategory;
}

export async function deleteCategoryApi(id, category, userActive) {
  await postAction("Categorias", "delete", { id });
  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: "Eliminar Categoría",
    modulo: "Categorías",
    detalles: `ID: ${id}, Nombre: ${category?.nombre || ''}`
  });
}

// ─────────────────────────────────────────────────────────────
// MOVEMENT CRUD
// ─────────────────────────────────────────────────────────────

export async function createMovement({ productoId, tipo, cantidad, motivo }, currentProducts, currentMovements, userActive) {
  const producto = currentProducts.find((p) => p.id === productoId);
  if (!producto) {
    throw new Error("product_not_found");
  }
  if (tipo === "salida" && producto.stock < cantidad) {
    throw new Error(`insufficient_stock|${producto.stock}|${cantidad}`);
  }

  const stockAnterior = producto.stock;
  const stockNuevo = tipo === "entrada" ? stockAnterior + cantidad : stockAnterior - cantidad;
  const nuevoId = currentMovements.length > 0 ? Math.max(...currentMovements.map((m) => m.id)) + 1 : 1;
  const today = new Date().toISOString();
  const nuevoMov = {
    id: nuevoId, productoId, tipo, cantidad,
    fecha: today,
    motivo: motivo || (tipo === "entrada" ? "Ingreso" : "Egreso"),
    stockAnterior, stockNuevo,
  };

  await postAction("Movimientos", "create", nuevoMov);
  await postAction("Productos", "edit", { id: productoId, stock: stockNuevo });

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: `Movimiento de ${tipo === "entrada" ? "Entrada" : "Salida"}`,
    modulo: "Movimientos",
    detalles: `Producto ID: ${productoId}, Desc: ${producto.descripcion}, Cantidad: ${cantidad}, Motivo: ${nuevoMov.motivo}`
  });

  return { nuevoMov, stockNuevo, productoDesc: producto.descripcion };
}

// ─────────────────────────────────────────────────────────────
// TRANSFER CRUD
// ─────────────────────────────────────────────────────────────

export async function createTransfer({ tiendaVecina, items, notas }, currentProducts, currentMovements, currentTransfers, userActive) {
  const today = new Date().toISOString();

  // Validaciones
  for (const item of items) {
    const producto = currentProducts.find((p) => p.id === item.productoId);
    if (!producto) throw new Error("product_not_found");
    if (producto.stock < item.cantidad) {
      throw new Error(`insufficient_stock|${producto.descripcion}|${producto.stock}|${item.cantidad}`);
    }
  }

  const itemsEnriquecidos = items.map((item) => {
    const p = currentProducts.find((x) => x.id === item.productoId);
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
  const nuevoId = currentTransfers.length > 0 ? Math.max(...currentTransfers.map((t) => t.id)) + 1 : 1;

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
    productoId: itemsEnriquecidos[0].productoId,
  };

  const nuevosMovimientos = [];
  let baseMovId = currentMovements.length > 0 ? Math.max(...currentMovements.map((m) => m.id)) + 1 : 1;

  const productosActualizados = currentProducts.map((p) => {
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

  // Sync
  for (const mov of nuevosMovimientos) {
    await postAction("Movimientos", "create", mov);
  }
  for (const item of itemsEnriquecidos) {
    const prod = productosActualizados.find((p) => p.id === item.productoId);
    if (prod) {
      await postAction("Productos", "edit", { id: prod.id, stock: prod.stock });
    }
  }

  const resumenItems = itemsEnriquecidos
    .map((i) => {
      const p = productosActualizados.find((x) => x.id === i.productoId);
      return `${p ? p.descripcion : i.productoId} (x${i.cantidad})`;
    })
    .join(" | ");

  await postAction("Traslados", "create", {
    ...nuevoTraslado,
    items: JSON.stringify(nuevoTraslado.items),
    itemsResumen: resumenItems
  });

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: "Crear Traslado / Préstamo",
    modulo: "Traslados",
    detalles: `ID Traslado: ${nuevoTraslado.id}, Tienda Vecina: ${tiendaVecina}, Total: S/. ${totalGeneral}`
  });

  return { nuevoTraslado, nuevosMovimientos, productosActualizados, totalGeneral, cantidadItems: itemsEnriquecidos.length };
}

export async function resolveTransfer(id, resolucion, currentTransfers, currentProducts, currentMovements, userActive) {
  const traslado = currentTransfers.find((t) => t.id === id);
  if (!traslado) throw new Error("transfer_not_found");
  const today = new Date().toISOString();

  const itemsParaResolver = traslado.items && traslado.items.length > 0
    ? traslado.items
    : [{ productoId: traslado.productoId, cantidad: traslado.cantidad, precioVenta: 0, total: traslado.total }];

  let baseMovId = currentMovements.length > 0 ? Math.max(...currentMovements.map((m) => m.id)) + 1 : 1;
  const nuevosMovimientos = [];
  let productosActualizados = [...currentProducts];

  if (resolucion === "devuelto") {
    productosActualizados = currentProducts.map((p) => {
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

  // Sync
  for (const mov of nuevosMovimientos) {
    await postAction("Movimientos", "create", mov);
  }

  if (resolucion === "devuelto") {
    for (const item of itemsParaResolver) {
      const prod = productosActualizados.find((p) => p.id === item.productoId);
      if (prod) {
        await postAction("Productos", "edit", { id: prod.id, stock: prod.stock });
      }
    }
  }

  await postAction("Traslados", "edit", { id, estado: resolucion, fechaResolucion: today.split("T")[0] });

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: `Resolver Traslado - ${resolucion}`,
    modulo: "Traslados",
    detalles: `ID Traslado: ${id}, Tienda: ${traslado.tiendaVecina}`
  });

  return { nuevosMovimientos, productosActualizados, tiendaVecina: traslado.tiendaVecina, fechaResolucion: today.split("T")[0] };
}

// ─────────────────────────────────────────────────────────────
// SALES CRUD
// ─────────────────────────────────────────────────────────────

export async function createSale(venta, currentProducts, currentMovements, currentSales, userActive) {
  if (!venta.items || venta.items.length === 0) throw new Error("empty_cart");
  const today = new Date().toISOString();

  // Validar stock
  for (const item of venta.items) {
    const producto = currentProducts.find((p) => p.id === item.productoId);
    if (!producto) throw new Error("product_not_found");
    if (producto.stock < item.cantidad) {
      throw new Error(`insufficient_stock|${producto.descripcion}|${producto.stock}|${item.cantidad}`);
    }
  }

  const nuevoId = currentSales.length > 0 ? Math.max(...currentSales.map((v) => v.id)) + 1 : 1;
  const nuevaVenta = {
    ...venta,
    id: nuevoId,
    fecha: today
  };

  const nuevosMovimientos = [];
  let baseMovId = currentMovements.length > 0 ? Math.max(...currentMovements.map((m) => m.id)) + 1 : 1;

  const productosActuales = [...currentProducts];
  const productosActualizados = productosActuales.map((p) => {
    const item = venta.items.find((i) => i.productoId === p.id);
    if (!item) return p;
    const stockAnterior = p.stock;
    const stockNuevo = stockAnterior - item.cantidad;

    let updatedProd = { ...p, stock: stockNuevo };
    if (item.nuevoMargen !== undefined && item.nuevoMargen !== p.margGanancia) {
      const margGanancia = item.nuevoMargen;
      const pCompra = p.pCompra;
      const { pVenta, utilidad } = calculatePricing(pCompra, margGanancia);
      updatedProd.margGanancia = margGanancia;
      updatedProd.pVenta = pVenta;
      updatedProd.utilidad = utilidad;
    }

    nuevosMovimientos.push({
      id: baseMovId++,
      productoId: p.id,
      tipo: "salida",
      cantidad: item.cantidad,
      fecha: today,
      motivo: `Venta - Boleta: ${venta.boleta}`,
      stockAnterior,
      stockNuevo,
    });
    return updatedProd;
  });

  // Exclude 'vendedor' — column does not exist in DB; kept only in local state for receipts
  const ventaParaDB = { ...nuevaVenta };
  delete ventaParaDB.vendedor;

  // Ejecutar venta, movimientos y actualización de stock en una sola transacción SQL atómica en backend
  await postAction("Ventas", "procesarVenta", {
    venta: {
      ...ventaParaDB,
      items: JSON.stringify(nuevaVenta.items)
    },
    movimientos: nuevosMovimientos
  });

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: "Registrar Venta",
    modulo: "Ventas",
    detalles: `ID Venta: ${nuevaVenta.id}, Boleta: ${venta.boleta}, Cliente: ${venta.cliente}, Total: S/. ${venta.totalVenta}`
  });

  return { nuevaVenta, nuevosMovimientos, productosActualizados };
}

export async function deleteSaleApi(id, sale, currentProducts, userActive) {
  try {
    await postAction("Ventas", "delete", { id });
  } catch (e) {
    console.warn("Could not delete sale from backend/sheets", e);
  }

  writeLog({
    usuario: userActive?.nombre || "Sistema",
    accion: "Eliminar Venta (Prueba)",
    modulo: "Ventas",
    detalles: `ID Venta: ${id}, Boleta: ${sale?.boleta || ''}`
  });
}

