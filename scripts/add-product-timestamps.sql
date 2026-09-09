-- ================================================================
-- Migración: fechas de registro y modificación en productos
-- ================================================================
-- Es idempotente: puede ejecutarse más de una vez sin recrear columnas.
-- Los registros existentes reciben como fecha inicial el momento en que se
-- ejecuta esta migración, ya que no existe una fuente histórica anterior.

SET @add_fecha_registro = IF(
  EXISTS(
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND COLUMN_NAME = 'fechaRegistro'
  ),
  'SELECT 1',
  'ALTER TABLE `productos` ADD COLUMN `fechaRegistro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `activo`'
);

PREPARE add_fecha_registro_stmt FROM @add_fecha_registro;
EXECUTE add_fecha_registro_stmt;
DEALLOCATE PREPARE add_fecha_registro_stmt;

SET @add_fecha_modificacion = IF(
  EXISTS(
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND COLUMN_NAME = 'fechaModificacion'
  ),
  'SELECT 1',
  'ALTER TABLE `productos` ADD COLUMN `fechaModificacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `fechaRegistro`'
);

PREPARE add_fecha_modificacion_stmt FROM @add_fecha_modificacion;
EXECUTE add_fecha_modificacion_stmt;
DEALLOCATE PREPARE add_fecha_modificacion_stmt;
