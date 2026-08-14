import { postAction } from "./api";
import { calculatePricing } from "../utils/pricing";
import { writeLog } from "../utils/logger";
import { getLocalDateTimeString } from "../utils/dateFilter";

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

export async function saveProduct(producto, currentProducts, userActive, customAccion = null) {
  const isEdit = !!producto.id;
  const { pCompra, margGanancia } = producto;
  const { pVenta, utilidad } = calculatePricing(pCompra, margGanancia);
  const accionLog = customAccion || (isEdit ? "Editar Producto" : "Agregar Producto");

  let finalProduct;
  try {
    if (isEdit) {
      finalProduct = { ...producto, pVenta, utilidad };
      const res = await postAction("Productos", "edit", finalProduct);
      if (res && res.id) finalProduct = formatProductos([res])[0];
    } else {
      const { id: _id, ...productData } = producto;
      const productPayload = { ...productData, pVenta, utilidad };
      const res = await postAction("Productos", "create", productPayload);
      if (res && res.id) {
        finalProduct = formatProductos([res])[0];
      } else {
        const fallbackId = currentProducts.length > 0 ? Math.max(...currentProducts.map((p) => p.id)) + 1 : 1;
        finalProduct = { ...productPayload, id: Number(res?.id || fallbackId) };
      }
    }

    const imgInfo = finalProduct.imagenUrl ? ", Imagen: Vinculada" : "";

    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: accionLog,
      modulo: "Productos",
      detalles: `ID: ${finalProduct.id}, Código: ${finalProduct.codigo}, Desc: ${finalProduct.descripcion}, Stock: ${finalProduct.stock}${imgInfo}`,
      estado: "success"
    });

    return finalProduct;
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: `Error al ${accionLog}`,
      modulo: "Productos",
      detalles: `ID: ${producto.id || 'Nuevo'}, Código: ${producto.codigo || 'S/C'}, Error: ${err.message}`,
      estado: "error"
    });
    throw err;
  }
}

export async function deleteProductApi(id, product, userActive) {
  try {
    await postAction("Productos", "delete", { id });
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Eliminar Producto",
      modulo: "Productos",
      detalles: `ID: ${id}, Código: ${product?.codigo || ''}, Desc: ${product?.descripcion || ''}`,
      estado: "success"
    });
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Error al Eliminar Producto",
      modulo: "Productos",
      detalles: `ID: ${id}, Error: ${err.message}`,
      estado: "error"
    });
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// SUPPLIER CRUD
// ─────────────────────────────────────────────────────────────

export async function saveSupplier(supplier, currentSuppliers, userActive) {
  const isEdit = !!supplier.id;
  let finalSupplier;

  try {
    if (isEdit) {
      finalSupplier = { ...supplier };
      await postAction("Proveedores", "edit", finalSupplier);
    } else {
      const { id: _id, ...supplierData } = supplier;
      const res = await postAction("Proveedores", "create", supplierData);
      const createdId = Number(res?.id);
      const fallbackId = currentSuppliers.length > 0 ? Math.max(...currentSuppliers.map((s) => s.id)) + 1 : 1;
      finalSupplier = { ...supplierData, id: createdId || fallbackId };
    }

    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: isEdit ? "Editar Proveedor" : "Agregar Proveedor",
      modulo: "Proveedores",
      detalles: `ID: ${finalSupplier.id}, Nombre: ${finalSupplier.nombre}`,
      estado: "success"
    });

    return finalSupplier;
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: `Error al ${isEdit ? "Editar" : "Agregar"} Proveedor`,
      modulo: "Proveedores",
      detalles: `ID: ${supplier.id || 'Nuevo'}, Error: ${err.message}`,
      estado: "error"
    });
    throw err;
  }
}

export async function deleteSupplierApi(id, supplier, userActive) {
  try {
    await postAction("Proveedores", "delete", { id });
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Eliminar Proveedor",
      modulo: "Proveedores",
      detalles: `ID: ${id}, Nombre: ${supplier?.nombre || ''}`,
      estado: "success"
    });
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Error al Eliminar Proveedor",
      modulo: "Proveedores",
      detalles: `ID: ${id}, Error: ${err.message}`,
      estado: "error"
    });
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// BRAND CRUD
// ─────────────────────────────────────────────────────────────

export async function saveBrand(brand, currentBrands, userActive) {
  const isEdit = !!brand.id;
  let finalBrand;

  try {
    if (isEdit) {
      finalBrand = { ...brand };
      await postAction("Marcas", "edit", finalBrand);
    } else {
      const { id: _id, ...brandData } = brand;
      const res = await postAction("Marcas", "create", brandData);
      const createdId = Number(res?.id);
      const fallbackId = currentBrands.length > 0 ? Math.max(...currentBrands.map((m) => m.id)) + 1 : 1;
      finalBrand = { ...brandData, id: createdId || fallbackId };
    }

    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: isEdit ? "Editar Marca" : "Agregar Marca",
      modulo: "Marcas",
      detalles: `ID: ${finalBrand.id}, Nombre: ${finalBrand.nombre}`,
      estado: "success"
    });

    return finalBrand;
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: `Error al ${isEdit ? "Editar" : "Agregar"} Marca`,
      modulo: "Marcas",
      detalles: `ID: ${brand.id || 'Nuevo'}, Error: ${err.message}`,
      estado: "error"
    });
    throw err;
  }
}

export async function deleteBrandApi(id, brand, userActive) {
  try {
    await postAction("Marcas", "delete", { id });
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Eliminar Marca",
      modulo: "Marcas",
      detalles: `ID: ${id}, Nombre: ${brand?.nombre || ''}`,
      estado: "success"
    });
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Error al Eliminar Marca",
      modulo: "Marcas",
      detalles: `ID: ${id}, Error: ${err.message}`,
      estado: "error"
    });
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// CATEGORY CRUD
// ─────────────────────────────────────────────────────────────

export async function saveCategory(category, currentCategories, userActive) {
  const isEdit = !!category.id;
  let finalCategory;

  try {
    if (isEdit) {
      finalCategory = { ...category };
      await postAction("Categorias", "edit", finalCategory);
    } else {
      const { id: _id, ...catData } = category;
      const res = await postAction("Categorias", "create", catData);
      const createdId = Number(res?.id);
      const fallbackId = currentCategories.length > 0 ? Math.max(...currentCategories.map((c) => c.id)) + 1 : 1;
      finalCategory = { ...catData, id: createdId || fallbackId };
    }

    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: isEdit ? "Editar Categoría" : "Agregar Categoría",
      modulo: "Categorías",
      detalles: `ID: ${finalCategory.id}, Nombre: ${finalCategory.nombre}`,
      estado: "success"
    });

    return finalCategory;
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: `Error al ${isEdit ? "Editar" : "Agregar"} Categoría`,
      modulo: "Categorías",
      detalles: `ID: ${category.id || 'Nuevo'}, Error: ${err.message}`,
      estado: "error"
    });
    throw err;
  }
}

export async function deleteCategoryApi(id, category, userActive) {
  try {
    await postAction("Categorias", "delete", { id });
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Eliminar Categoría",
      modulo: "Categorías",
      detalles: `ID: ${id}, Nombre: ${category?.nombre || ''}`,
      estado: "success"
    });
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Error al Eliminar Categoría",
      modulo: "Categorías",
      detalles: `ID: ${id}, Error: ${err.message}`,
      estado: "error"
    });
    throw err;
  }
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
  const today = getLocalDateTimeString();
  const nuevoMov = {
    productoId, tipo, cantidad,
    fecha: today,
    motivo: motivo || (tipo === "entrada" ? "Ingreso" : "Egreso"),
    stockAnterior, stockNuevo,
  };

  const resMov = await postAction("Movimientos", "create", nuevoMov);
  const createdId = Number(resMov?.id);
  const fallbackId = currentMovements.length > 0 ? Math.max(...currentMovements.map((m) => m.id)) + 1 : 1;
  const finalMov = { ...nuevoMov, id: createdId || fallbackId };
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
  const today = getLocalDateTimeString();

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
  const today = getLocalDateTimeString();

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
  const today = getLocalDateTimeString();

  // Validar stock
  for (const item of venta.items) {
    const producto = currentProducts.find((p) => p.id === item.productoId);
    if (!producto) throw new Error("product_not_found");
    if (producto.stock < item.cantidad) {
      throw new Error(`insufficient_stock|${producto.descripcion}|${producto.stock}|${item.cantidad}`);
    }
  }

  const nuevoId = currentSales.length > 0 ? Math.max(...currentSales.map((v) => v.id)) + 1 : 1;
  const vendedorNombre = userActive?.nombre || venta.vendedor || "Sistema";
  const nuevaVenta = {
    ...venta,
    id: nuevoId,
    fecha: today,
    vendedor: vendedorNombre
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

  try {
    // Ejecutar venta, movimientos y actualización de stock en una sola transacción SQL atómica en backend
    await postAction("Ventas", "procesarVenta", {
      venta: {
        ...nuevaVenta,
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
  } catch (err) {
    writeLog({
      usuario: userActive?.nombre || "Sistema",
      accion: "Error Registrar Venta",
      modulo: "Ventas",
      detalles: `Error: ${err.message}. Boleta: ${venta.boleta}, Cliente: ${venta.cliente}, Total: S/. ${venta.totalVenta}`,
      estado: "error"
    });
    throw err;
  }

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

