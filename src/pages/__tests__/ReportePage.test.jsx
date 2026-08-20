import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import ReportePage from '../ReportePage';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';

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

  const mockInventoryContext = {
    cargando: false,
    ventas: [
      { id: 1, boleta: 'B001', fecha: '2026-03-01T10:00:00', totalVenta: 100, utilidad: 25, metodoPago: 'EFECTIVO', items: [{ productoId: 1, cantidad: 1 }] },
    ],
    movimientos: [
      { id: 1, fecha: '2026-03-01T10:00:00', productoId: 1, tipo: 'entrada', cantidad: 5, motivo: 'Compra', stockAnterior: 5, stockNuevo: 10 },
      { id: 2, fecha: '2026-03-02T10:00:00', productoId: 1, tipo: 'salida', cantidad: 2, motivo: 'Venta', stockAnterior: 10, stockNuevo: 8 },
    ],
    productos: [{ id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 10, pCompra: 40, pVenta: 50 }],
    formatFecha: (f) => f || '2026-03-01',
    getKardex: vi.fn().mockReturnValue([
      { id: 1, fecha: '2026-03-01', tipo: 'entrada', cantidad: 5, motivo: 'Compra', saldo: 5 }
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

  it('renders sales report (reporte-ventas), opens filter modal, applies presets and exports', async () => {
    const { container } = renderReport('reporte-ventas');
    expect(container.textContent).toContain('B001');

    // Click filter button
    const filterBtn = container.querySelector('button[title*="Filtro"]') || container.querySelector('.btn-secondary') || container.querySelectorAll('button')[0];
    if (filterBtn) {
      fireEvent.click(filterBtn);
      // In modal: click presets and apply
      const modalBtns = container.querySelectorAll('.modal-overlay button');
      modalBtns.forEach((btn) => fireEvent.click(btn));
    }

    // Click PDF & Excel export buttons
    const exportBtns = container.querySelectorAll('.page-header button');
    for (const btn of exportBtns) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }
  });

  it('renders income report (reporte-ingresos) and triggers exports', async () => {
    const { container } = renderReport('reporte-ingresos');
    expect(container.textContent).toContain('Filtro');

    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }
  });

  it('renders exit movements report (reporte-salidas) and triggers exports', async () => {
    const { container } = renderReport('reporte-salidas');
    expect(container.textContent).toContain('Filtro');

    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }
  });

  it('renders kardex report (reporte-kardex) and triggers product selection and export', async () => {
    const { container } = renderReport('reporte-kardex');
    expect(container.textContent).toContain('Filtro');

    const selects = container.querySelectorAll('select');
    selects.forEach((sel) => {
      if (sel.options.length > 1) {
        fireEvent.change(sel, { target: { value: sel.options[1].value } });
      }
    });

    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }
  });
});
