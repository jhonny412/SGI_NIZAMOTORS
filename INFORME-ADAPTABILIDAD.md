# Informe de adaptabilidad (responsive) — SGI NIZA MOTORS

**Fecha:** 13/11/2026
**Alcance:** toda la aplicación (login, 16 rutas, modales y menú lateral)
**Anchos verificados:** 320 px (móvil pequeño), 390 px (móvil), 768 px (tablet), 1366 px (PC)

---

## 1. Método

Auditoría automatizada con Chrome headless (Puppeteer) sobre la aplicación en ejecución con la base de datos real:

1. Inicio de sesión con perfil **Admin** (14 rutas) y **Super Admin** (Auditoría y Configuración).
2. Para cada ruta y cada ancho se midió:
   - `scrollWidth − clientWidth` del documento (desbordamiento horizontal global).
   - Elementos visibles que sobresalen del viewport (excluyendo contenedores con scroll propio y el menú lateral).
   - Tamaño de los objetivos táctiles (`button`, `a`, `select`).
3. Se repitió el análisis en los **modales** (movimiento, escáner QR, venta, producto, etiqueta QR, préstamo, filtros de reportes y detalle de venta).
4. Capturas de pantalla en cada combinación para revisión visual.

**Volumen:** 62 comprobaciones página/ancho + 9 comprobaciones de modales + revisión visual de capturas.

---

## 2. Resultado general

| Aspecto | Resultado |
|---|---|
| Desbordamiento horizontal global (todas las rutas y anchos) | **0 px** |
| Modales que exceden el ancho del viewport | **0** |
| Modales con contenido más alto que la pantalla | Se resuelven con scroll interno (`max-h` + `overflow-y-auto`) |
| Errores JavaScript durante la navegación | **Ninguno** |
| Build de producción | Correcto |
| Pruebas automatizadas | 202/202 correctas |

---

## 3. Problemas encontrados y corregidos

| # | Problema | Impacto | Corrección |
|---|---|---|---|
| 1 | El menú lateral iniciaba **abierto** en móvil y tapaba el contenido (drawer con fondo oscuro) | Alto: primera impresión en el teléfono | `UIContext`: el panel inicia cerrado si `innerWidth < 1024` y se cierra al pasar de escritorio a móvil |
| 2 | Los títulos `<h1>` de 7 páginas eran **invisibles en tema claro** (`.page-title` usaba `text-slate-100`, blanco sobre blanco) | Alto: páginas sin título en PC y móvil | `.page-title` ahora es `text-slate-900 dark:text-slate-100` |
| 3 | Encabezado de **Reportes** desbordaba 104 px en móvil (3 botones en fila sin wrap) | Medio | Contenedor con `flex-wrap`, botones `flex-1` en móvil |
| 4 | Botonera del **modal de préstamo** desbordaba 75 px en móvil | Medio | Pie del modal apilado y botones a ancho completo en móvil |
| 5 | **Detalle de venta**: la tabla de ítems se recortaba (`overflow-hidden`, sin scroll) y los 3 botones del pie desbordaban | Alto: no se veían precios ni acciones | Tabla con `overflow-x-auto`; pie apilado en móvil |
| 6 | Encabezado de **Productos** desbordaba 47 px a 320 px (Exportar + Nuevo) | Bajo (pantallas pequeñas) | Contenedor con wrap y botones flexibles |
| 7 | Botones de acción de las tablas (editar/eliminar/QR/imagen) medían **28×28 px** | Medio: difíciles de pulsar con el dedo | `p-2.5 sm:p-1.5` → ~36–40 px en móvil, compactos en escritorio |

Archivos modificados: `src/context/UIContext.jsx`, `src/index.css`, `src/pages/ReportePage.jsx`, `src/pages/Productos.jsx`, `src/pages/Marcas.jsx`, `src/pages/Proveedores.jsx`, `src/pages/Categorias.jsx`, `src/pages/Creditos.jsx`, `src/components/TrasladoFormModal.jsx`, `src/components/VentaDetalleModal.jsx`.

---

## 4. Comportamiento por tipo de pantalla

### Móvil (≤ 639 px)
- Menú lateral como **drawer** cerrado por defecto; se abre con el botón superior y se cierra al tocar fuera o navegar.
- Encabezados y botoneras se apilan; los botones principales ocupan el ancho disponible.
- Formularios a una columna; modales al 92 % de ancho con scroll interno.
- Escáner QR / código de barras con cámara y carga de imagen cabe completo (358 × 582 px).
- Tablas densas: se desplazan horizontalmente dentro de su tarjeta (patrón estándar de panel administrativo).

### Tablet (768 px)
- Menú cerrado (drawer) y contenido a ancho completo.
- KPIs en 2 columnas, filtros en 2 columnas, tablas con casi todas sus columnas visibles.
- Modales centrados de 512–736 px, sin scroll vertical salvo formularios largos.

### PC (≥ 1024 px)
- Menú lateral expandido (o riel de iconos) y contenido con `lg:ml-64`.
- Tablas completas, gráficos y dashboard en varias columnas.

---

## 5. Observaciones no bloqueantes (recomendaciones)

1. **Tablas anchas en teléfono**: Productos (12 columnas), Ventas (9), Movimientos (8) y Auditoría requieren deslizar horizontalmente. No rompe el layout, pero para una experiencia 100 % táctil convendría una vista de tarjetas en móvil o fijar la columna de acciones.
2. **Nombres largos**: en el dashboard móvil los nombres de productos del ranking se truncan (`12V TOYOTA P…`); el tooltip solo funciona con ratón.
3. **Super Admin**: su menú solo muestra Auditoría y Configuración (el Dashboard aparece como página por defecto pero no está en el menú). Es un tema de navegación, no de responsive.
4. **iOS**: no se configuró `viewport-fit=cover` ni `env(safe-area-inset-*)`; en iPhone con notch el contenido podría quedar junto al área segura.
5. **Landscape de teléfono** (p. ej. 844×390): no se probó de forma específica; los breakpoints son por ancho, por lo que se comporta como tablet/móvil según corresponda.

---

## 6. Conclusión

La aplicación **sí es adaptable** a móvil, tablet y PC: las 16 rutas y los 9 modales analizados caben en el viewport sin desbordamientos, el menú se comporta como drawer en móvil, los formularios se apilan correctamente y los objetivos táctiles principales son utilizables.

La única salvedad es el **desplazamiento horizontal de las tablas de datos** en teléfonos, que es funcional pero mejorable con una vista de tarjetas o columnas fijas.
