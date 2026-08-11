-- ================================================================
-- SGI - DIAGNOSTICO DE DATOS HUERFANOS
-- ================================================================
-- Ejecutar con "Execute SQL Script" (Alt+X en DBeaver)
-- o seleccionar cada bloque y ejecutar con Ctrl+Enter
-- Este script NO modifica ningun dato, solo consulta.
-- ================================================================

-- RESUMEN COMPLETO (ejecutar este bloque)
SELECT 
  'Movimientos sin producto' AS verificacion,
  (SELECT COUNT(*) FROM movimientos m LEFT JOIN productos p ON m.productoId = p.id WHERE p.id IS NULL) AS cantidad
UNION ALL
SELECT 
  'Productos sin proveedor valido',
  (SELECT COUNT(*) FROM productos pr LEFT JOIN proveedores pv ON pr.proveedorId = pv.id WHERE pr.proveedorId IS NOT NULL AND pv.id IS NULL)
UNION ALL
SELECT 
  'Traslados sin producto valido',
  (SELECT COUNT(*) FROM traslados t LEFT JOIN productos p ON t.productoId = p.id WHERE t.productoId IS NOT NULL AND p.id IS NULL)
UNION ALL
SELECT 
  'Productos con marca inexistente',
  (SELECT COUNT(*) FROM productos pr LEFT JOIN marcas m ON pr.marca = m.nombre WHERE pr.marca IS NOT NULL AND pr.marca != '' AND m.id IS NULL)
UNION ALL
SELECT 
  'Productos con categoria inexistente',
  (SELECT COUNT(*) FROM productos pr LEFT JOIN categorias c ON pr.categoria = c.nombre WHERE pr.categoria IS NOT NULL AND pr.categoria != '' AND c.id IS NULL);
