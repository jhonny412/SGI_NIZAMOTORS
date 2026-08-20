import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVentasPdf, generateMovimientosPdf, generateKardexPdf } from '../reportPdf';

const mockDoc = {
  internal: {
    getNumberOfPages: vi.fn().mockReturnValue(2),
  },
  setPage: vi.fn(),
  addImage: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  save: vi.fn(),
  output: vi.fn().mockReturnValue('data:application/pdf;base64,mockpdfdata'),
};

const mockAutoTable = vi.fn();

vi.mock('jspdf', () => {
  class MockJsPDF {
    constructor() {
      Object.assign(this, mockDoc);
    }
  }
  return {
    default: MockJsPDF,
    jsPDF: MockJsPDF
  };
});

vi.mock('jspdf-autotable', () => ({
  default: (...args) => mockAutoTable(...args),
}));

describe('PDF Generation Utilities (reportPdf)', () => {
  const dummyFormatFecha = (f) => f || '2026-03-01';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates Ventas PDF in preview mode returning datauristring', async () => {
    const ventas = [
      {
        id: 1,
        boleta: 'B001',
        fecha: '2026-03-01',
        cliente: 'Cliente A',
        metodoPago: 'Efectivo',
        cantidadTotal: 3,
        totalVenta: 150,
        utilidad: 50,
      },
    ];

    const result = await generateVentasPdf({
      ventas,
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-02',
      formatFecha: dummyFormatFecha,
      usuario: 'Admin',
      preview: true,
    });

    expect(result).toContain('data:application/pdf');
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it('generates Ventas PDF and saves it to file', async () => {
    const ventas = [];
    const result = await generateVentasPdf({
      ventas,
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-02',
      formatFecha: dummyFormatFecha,
      usuario: 'Admin',
      preview: false,
    });

    expect(result).toBeNull();
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('generates Movimientos PDF for entrada and salida', async () => {
    const movimientos = [
      { id: 1, fecha: '2026-03-01', productoId: 10, cantidad: 5, motivo: 'Compra', stockAnterior: 0, stockNuevo: 5 },
    ];
    const productos = [{ id: 10, descripcion: 'Batería 12V', codigo: 'BAT-01' }];

    const result = await generateMovimientosPdf({
      movimientos,
      productos,
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-02',
      formatFecha: dummyFormatFecha,
      tipo: 'entrada',
      title: 'Reporte de Ingresos',
      usuario: 'Admin',
      preview: true,
    });

    expect(result).toContain('data:application/pdf');
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it('generates Kardex PDF properly', async () => {
    const movimientos = [
      { id: 1, tipo: 'entrada', fecha: '2026-03-01', productoId: 10, cantidad: 5, motivo: 'Compra', stockAnterior: 0, stockNuevo: 5 },
      { id: 2, tipo: 'salida', fecha: '2026-03-02', productoId: 10, cantidad: 2, motivo: 'Venta', stockAnterior: 5, stockNuevo: 3 },
    ];
    const productos = [{ id: 10, descripcion: 'Batería 12V', codigo: 'BAT-01' }];

    const result = await generateKardexPdf({
      movimientos,
      productos,
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-02',
      formatFecha: dummyFormatFecha,
      usuario: 'Admin',
      preview: true,
    });

    expect(result).toContain('data:application/pdf');
    expect(mockAutoTable).toHaveBeenCalled();
  });
});
