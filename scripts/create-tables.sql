-- ================================================================
-- SGI - Script DDL para crear tablas en Aiven MySQL
-- Ejecutar este script UNA VEZ antes de la migración de datos
-- ================================================================

-- Crear y usar la base de datos NIZA_MOTORS
CREATE DATABASE IF NOT EXISTS `NIZA_MOTORS` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `NIZA_MOTORS`;

-- Deshabilitar checks de FK durante la creación
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------
-- Tabla: proveedores
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `proveedores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `contacto` VARCHAR(255) NOT NULL DEFAULT '',
  `telefono` VARCHAR(100) NOT NULL DEFAULT '',
  `email` VARCHAR(255) NOT NULL DEFAULT '',
  `direccion` TEXT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- Tabla: marcas
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marcas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `descripcion` TEXT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- Tabla: categorias
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categorias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `descripcion` TEXT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- Tabla: usuarios
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL DEFAULT '',
  `pin` VARCHAR(50) NOT NULL DEFAULT '',
  `rol` VARCHAR(50) NOT NULL DEFAULT 'Vendedor',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- Tabla: productos
-- (Sin FK estricta a proveedores para máxima compatibilidad con datos de Sheets)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `productos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(100) NOT NULL DEFAULT '',
  `descripcion` VARCHAR(500) NOT NULL DEFAULT '',
  `marca` VARCHAR(255) DEFAULT NULL,
  `categoria` VARCHAR(255) DEFAULT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `pCompra` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `margGanancia` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `pVenta` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `utilidad` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `proveedorId` INT DEFAULT NULL,
  `oem` VARCHAR(500) NOT NULL DEFAULT '',
  `imagenUrl` TEXT NULL,
  `imagenUrl2` TEXT NULL,
  `imagenUrl3` TEXT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- Tabla: movimientos
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `movimientos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `productoId` INT NOT NULL DEFAULT 0,
  `tipo` VARCHAR(50) NOT NULL DEFAULT '',
  `cantidad` INT NOT NULL DEFAULT 0,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `motivo` VARCHAR(500) NOT NULL DEFAULT '',
  `stockAnterior` INT NOT NULL DEFAULT 0,
  `stockNuevo` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- Tabla: traslados
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `traslados` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tiendaVecina` VARCHAR(255) NOT NULL DEFAULT '',
  `fechaPrestamo` DATETIME DEFAULT NULL,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `cantidad` INT NOT NULL DEFAULT 0,
  `estado` VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  `fechaResolucion` DATE DEFAULT NULL,
  `notas` TEXT NULL,
  `productoId` INT DEFAULT NULL,
  `itemsResumen` TEXT NULL,
  `items` JSON DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- Tabla: ventas
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `boleta` VARCHAR(100) NOT NULL DEFAULT '',
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cliente` VARCHAR(255) NOT NULL DEFAULT '',
  `metodoPago` VARCHAR(100) NOT NULL DEFAULT '',
  `totalVenta` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `utilidad` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `cantidadTotal` INT NOT NULL DEFAULT 0,
  `direccion` VARCHAR(500) NOT NULL DEFAULT '',
  `items` JSON DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- Tabla: logs
-- (id = Date.now() generado por el cliente, no AUTO_INCREMENT)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `logs` (
  `id` BIGINT NOT NULL,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario` VARCHAR(255) NOT NULL DEFAULT '',
  `accion` VARCHAR(500) NOT NULL DEFAULT '',
  `modulo` VARCHAR(255) NOT NULL DEFAULT '',
  `detalles` TEXT NULL,
  `estado` VARCHAR(50) NOT NULL DEFAULT '',
  `ip` VARCHAR(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rehabilitar checks de FK
SET FOREIGN_KEY_CHECKS = 1;

-- Verificar las tablas creadas
SHOW TABLES;
