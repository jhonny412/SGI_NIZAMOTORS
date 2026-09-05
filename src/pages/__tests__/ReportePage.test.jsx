import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act, screen } from '@testing-library/react';
import React from 'react';
import ReportePage from '../ReportePage';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';
import { generateVentasPdf, generateMovimientosPdf, generateKardexPdf } from '../../utils/reportPdf';
import { exportVentasExcel } from '../../utils/exportVentasExcel';
import { exportMovimientosExcel } from '../../utils/exportMovimientosExcel';
import { getLocalDateTimeString } from '../../utils/dateFilter';

vi.mock('../../utils/reportPdf', () => ({
  generateVentasPdf: vi.fn().mockResolvedValue('blob:http://localhost/mock-pdf'),
  generateMovimientosPdf: vi.fn().mockResolvedValue('blob:http://localhost/mock-pdf'),
  generateKardexPdf: vi.fn().mockResolvedValue('blob:http://localhost/mock-pdf'),
}));

vi.mock('../../utils/exportVentasExcel', () => ({
  exportVentasExcel: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/exportMovimientosExcel', () => ({
  exportMovimientosExcel: vi.fn().mockResolvedValue(true),
}));

describe('ReportePage', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Jhon', rol: 'Admin' },
  };

  const todayLocal = getLocalDateTimeString().split(' ')[0] + ' 12:00:00';

  const mockInventoryContext = {
    cargando: false,
    ventas: [
      { id: 1, boleta: 'B001', fecha: todayLocal, totalVenta: 100, utilidad: 25, metodoPago: 'EFECTIVO', cliente: 'Juan Perez', items: [{ productoId: 1, cantidad: 1 }] },
    ],
    movimientos: [
      { id: 1, fecha: todayLocal, productoId: 1, tipo: 'entrada', cantidad: 5, motivo: 'Compra', stockAnterior: 5, stockNuevo: 10 },
      { id: 2, fecha: todayLocal, productoId: 1, tipo: 'salida', cantidad: 2, motivo: 'Venta', stockAnterior: 10, stockNuevo: 8 },
    ],
    productos: [{ id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 10, pCompra: 40, pVenta: 50 }],
    formatFecha: (f) => f || '2026-03-01',
    getKardex: vi.fn().mockReturnValue([
      { id: 1, fecha: todayLocal, tipo: 'entrada', cantidad: 5, motivo: 'Compra', saldo: 5 }
    ]),
  };

  const renderReport = (paginaActiva) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <UIContext.Provider value={{ paginaActiva }}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <ReportePage />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sales report (reporte-ventas), opens filter modal, applies presets, previews PDF and exports', async () => {
    const { container } = renderReport('reporte-ventas');
    expect(container.textContent).toContain('B001');

    // Open filter modal (button with "Filtros")
    const filterBtn = container.querySelector('.page-header .btn-secondary');
    if (filterBtn) fireEvent.click(filterBtn);

    // Fill customer filter input
    const clienteInput = container.querySelector('.modal-overlay input[placeholder*="cliente"]');
    if (clienteInput) {
      fireEvent.change(clienteInput, { target: { value: 'Juan' } });
    }

    // Apply filters
    const aplicarBtn = screen.getByText(/aplicar filtros/i);
    fireEvent.click(aplicarBtn);

    // Click Generar Reporte button
    const generateBtn = container.querySelector('.page-header .btn-primary');
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(generateVentasPdf).toHaveBeenCalledWith(expect.objectContaining({ preview: true }));

    // Inside Preview modal: trigger download
    const downloadPdfBtn = screen.getByText(/descargar pdf/i);
    await act(async () => {
      fireEvent.click(downloadPdfBtn);
    });
    expect(generateVentasPdf).toHaveBeenCalledTimes(2);

    // Export Excel
    const excelBtn = container.querySelector('.page-header .btn-success');
    await act(async () => {
      fireEvent.click(excelBtn);
    });
    expect(exportVentasExcel).toHaveBeenCalled();
  });

  it('renders income report (reporte-ingresos) and tests movements filter modal and preview', async () => {
    const { container } = renderReport('reporte-ingresos');
    expect(container.textContent).toContain('Filtro');

    // Open filter modal
    const filterBtn = container.querySelector('.page-header .btn-secondary');
    if (filterBtn) fireEvent.click(filterBtn);

    // Fill product filter and reason search
    const productInput = container.querySelector('.modal-overlay input[placeholder*="repuesto"]');
    if (productInput) fireEvent.change(productInput, { target: { value: 'Filtro' } });

    const reasonInput = container.querySelector('.modal-overlay input[placeholder*="motivo"]');
    if (reasonInput) fireEvent.change(reasonInput, { target: { value: 'Compra' } });

    const aplicarBtn = screen.getByText(/aplicar filtros/i);
    fireEvent.click(aplicarBtn);

    // Click Generar Reporte button
    const generateBtn = container.querySelector('.page-header .btn-primary');
    await act(async () => {
      fireEvent.click(generateBtn);
    });
    expect(generateMovimientosPdf).toHaveBeenCalledWith(expect.objectContaining({ preview: true }));

    // Export Excel
    const excelBtn = container.querySelector('.page-header .btn-success');
    await act(async () => {
      fireEvent.click(excelBtn);
    });
    expect(exportMovimientosExcel).toHaveBeenCalled();
  });

  it('renders exit movements report (reporte-salidas) and triggers exports', async () => {
    const { container } = renderReport('reporte-salidas');
    expect(container.textContent).toContain('Filtro');

    const generateBtn = container.querySelector('.page-header .btn-primary');
    await act(async () => {
      fireEvent.click(generateBtn);
    });
    expect(generateMovimientosPdf).toHaveBeenCalled();
  });

  it('renders kardex report (reporte-kardex), tests product selection, filter modal, and export', async () => {
    const { container } = renderReport('reporte-kardex');
    expect(container.textContent).toContain('Filtro');

    // Select product from select
    const select = container.querySelector('select');
    if (select && select.options.length > 1) {
      fireEvent.change(select, { target: { value: select.options[1].value } });
    }

    // Open filter modal in kardex
    const filterBtn = container.querySelector('.page-header .btn-secondary');
    if (filterBtn) fireEvent.click(filterBtn);

    const movSelect = container.querySelector('.modal-overlay select');
    if (movSelect) fireEvent.change(movSelect, { target: { value: 'entrada' } });

    const reasonInput = container.querySelector('.modal-overlay input[placeholder*="motivo"]');
    if (reasonInput) fireEvent.change(reasonInput, { target: { value: 'Compra' } });

    const aplicarBtn = screen.getByText(/aplicar filtros/i);
    fireEvent.click(aplicarBtn);

    // Generar reporte kardex
    const generateBtn = container.querySelector('.page-header .btn-primary');
    await act(async () => {
      fireEvent.click(generateBtn);
    });
    expect(generateKardexPdf).toHaveBeenCalled();
  });
});
