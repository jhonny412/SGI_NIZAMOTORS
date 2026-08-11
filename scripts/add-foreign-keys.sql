-- ================================================================
-- SGI - AGREGAR FOREIGN KEYS E ÍNDICES
-- ================================================================
-- REQUISITOS PREVIOS:
--   1. Hacer un backup completo de la BD
--   2. Ejecutar diagnostico-huerfanos.sql y verificar 0 huérfanos
--   3. Si hay huérfanos, corregirlos antes de ejecutar este script
-- ================================================================
-- SEGURIDAD:
--   • Este script NO elimina ni modifica datos existentes
--   • Solo agrega restricciones estructurales (CONSTRAINT)
--   • Si falla alguna restricción, se revierte automáticamente
-- ================================================================

USE `NIZA_MOTORS`;

-- Deshabilitar checks de FK temporalmente para crear en cualquier orden
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------
-- ÍNDICES para mejorar rendimiento de consultas y reportes
-- ----------------------------------------------------------------

-- Índice en movimientos.productoId (usado en Kardex, Reportes)
ALTER TABLE `movimientos`
  ADD INDEX `idx_movimientos_productoId` (`productoId`);

-- Índice en movimientos.fecha (usado en filtros de fecha)
ALTER TABLE `movimientos`
  ADD INDEX `idx_movimientos_fecha` (`fecha`);

-- Índice en movimientos.tipo (usado en filtros entrada/salida)
ALTER TABLE `movimientos`
  ADD INDEX `idx_movimientos_tipo` (`tipo`);

-- Índice en productos.proveedorId
ALTER TABLE `productos`
  ADD INDEX `idx_productos_proveedorId` (`proveedorId`);

-- Índice en productos.codigo (búsquedas por código)
ALTER TABLE `productos`
  ADD INDEX `idx_productos_codigo` (`codigo`);

-- Índice en traslados.productoId
ALTER TABLE `traslados`
  ADD INDEX `idx_traslados_productoId` (`productoId`);

-- Índice en traslados.estado (filtros pendiente/resuelto)
ALTER TABLE `traslados`
  ADD INDEX `idx_traslados_estado` (`estado`);

-- Índice en ventas.fecha (reportes por rango de fechas)
ALTER TABLE `ventas`
  ADD INDEX `idx_ventas_fecha` (`fecha`);

-- Índice en ventas.metodoPago (filtros de reporte)
ALTER TABLE `ventas`
  ADD INDEX `idx_ventas_metodoPago` (`metodoPago`);

-- Índice en logs.fecha (consultas de auditoría)
ALTER TABLE `logs`
  ADD INDEX `idx_logs_fecha` (`fecha`);

-- Índice en logs.modulo (filtros de auditoría)
ALTER TABLE `logs`
  ADD INDEX `idx_logs_modulo` (`modulo`);


-- ----------------------------------------------------------------
-- FOREIGN KEYS
-- Todas usan ON DELETE RESTRICT (protección máxima contra borrado)
-- y ON UPDATE CASCADE (si se cambia un ID padre, se propaga)
-- ----------------------------------------------------------------

-- FK: movimientos.productoId → productos.id
-- Impide eliminar un producto que tenga movimientos registrados
ALTER TABLE `movimientos`
  ADD CONSTRAINT `fk_movimientos_producto`
  FOREIGN KEY (`productoId`) REFERENCES `productos`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- FK: productos.proveedorId → proveedores.id
-- Impide eliminar un proveedor que tenga productos asociados
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_productos_proveedor`
  FOREIGN KEY (`proveedorId`) REFERENCES `proveedores`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- FK: traslados.productoId → productos.id
-- Impide eliminar un producto que tenga traslados/préstamos
ALTER TABLE `traslados`
  ADD CONSTRAINT `fk_traslados_producto`
  FOREIGN KEY (`productoId`) REFERENCES `productos`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;


-- ----------------------------------------------------------------
-- NOTA sobre marca y categoría:
-- Actualmente productos.marca y productos.categoria son VARCHAR
-- que almacenan el NOMBRE (texto), no un ID numérico.
-- Para agregar FK a marcas/categorías se necesitaría migrar
-- estos campos a INT (marcaId, categoriaId). Esto se puede
-- hacer en una fase posterior si lo deseas.
-- ----------------------------------------------------------------

-- Rehabilitar checks de FK
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------
-- VERIFICACIÓN: Mostrar las restricciones creadas
-- ----------------------------------------------------------------
SELECT 
  TABLE_NAME,
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'NIZA_MOTORS'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;
