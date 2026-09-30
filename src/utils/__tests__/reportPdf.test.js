import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVentasPdf, generateMovimientosPdf, generateKardexPdf, generateDashboardPdf, generateChartDataUrl } from '../reportPdf';

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

  it('generates Dashboard PDF properly with sales breakdown, top products and critical stock', async () => {
    const result = await generateDashboardPdf({
      usuario: 'Admin',
      totalProductos: 15,
      valorInventario: 4500,
      valorVentaInventario: 7200,
      periodoVentasLabel: 'Semana Actual',
      ventasResumen: {
        totalDinero: 1200,
        totalOperaciones: 5,
        ticketPromedio: 240,
        totalUnidades: 8,
      },
      ventasDesglose: [
        { label: 'LUN', dateFormatted: '23/03', totalDinero: 500, totalOperaciones: 2, totalUnidades: 3, pct: 41.7 },
        { label: 'MAR', dateFormatted: '24/03', totalDinero: 700, totalOperaciones: 3, totalUnidades: 5, pct: 58.3 },
      ],
      categoriaFiltro: 'Filtros',
      topProductos: [
        { descripcion: 'Filtro de Aceite', codigo: 'FIL-01', categoria: 'Filtros', marca: 'Bosch', cantidadVendida: 5, totalDinero: 250, stockActual: 10 },
      ],
      stockCritico: [
        { codigo: 'BUJ-01', descripcion: 'Bujía', marca: 'Denso', stock: 0 },
      ],
      preview: true,
    });

    expect(result).toContain('data:application/pdf');
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it('renders chart data URL for donut and bar charts when canvas 2D context is available', () => {
    // Mock getContext('2d') on HTMLCanvasElement prototype
    const mockCtx = {
      scale: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
    };

    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockchartpng');

    try {
      const tortaUrl = generateChartDataUrl({
        title: 'Distribución de Ventas',
        tipo: 'torta',
        data: [
          { label: 'Lunes', value: 100, color: '#f59e0b', valueFormatted: 'S/. 100.00' },
          { label: 'Martes', value: 200, color: '#10b981', valueFormatted: 'S/. 200.00' },
        ],
        centerLabel: 'S/. 300.00',
        centerSub: 'Total',
      });

      expect(tortaUrl).toBe('data:image/png;base64,mockchartpng');
      expect(mockCtx.arc).toHaveBeenCalled();

      const barrasUrl = generateChartDataUrl({
        title: 'Ventas por Semana',
        tipo: 'barras',
        data: [
          { label: 'Sem 1', value: 500, valueFormatted: 'S/. 500.00' },
        ],
      });

      expect(barrasUrl).toBe('data:image/png;base64,mockchartpng');
      expect(mockCtx.fillRect).toHaveBeenCalled();

      // Test empty state
      const emptyUrl = generateChartDataUrl({
        data: [],
      });
      expect(emptyUrl).toBe('data:image/png;base64,mockchartpng');
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    }
  });

  it('embeds chart images when customChartVentasImg and customChartTopProductosImg are passed', async () => {
    await generateDashboardPdf({
      usuario: 'Admin',
      chartVentasImg: 'data:image/png;base64,mockventaschart',
      ventasDesglose: [
        { label: 'LUN', dateFormatted: '23/03', totalDinero: 500, totalOperaciones: 2, totalUnidades: 3, pct: 100 },
      ],
      chartTopProductosImg: 'data:image/png;base64,mocktopchart',
      topProductos: [
        { descripcion: 'Filtro', codigo: 'F-1', categoria: 'Filtros', marca: 'Niza', cantidadVendida: 3, totalDinero: 90 },
      ],
      preview: true,
    });

    expect(mockDoc.addImage).toHaveBeenCalledWith(
      'data:image/png;base64,mockventaschart',
      'PNG',
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDoc.addImage).toHaveBeenCalledWith(
      'data:image/png;base64,mocktopchart',
      'PNG',
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
  });
});

