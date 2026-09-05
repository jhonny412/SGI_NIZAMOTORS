import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateBoletaPdf } from '../boletaPdf';

const mockDoc = {
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  setLineDash: vi.fn(),
  line: vi.fn(),
  addImage: vi.fn(),
  splitTextToSize: vi.fn((text) => (Array.isArray(text) ? text : [String(text)])),
  output: vi.fn().mockReturnValue(new Blob(['mock-pdf-bytes'], { type: 'application/pdf' })),
};

vi.mock('jspdf', () => {
  class MockJsPDF {
    constructor(opts) {
      this.opts = opts;
      Object.assign(this, mockDoc);
    }
  }
  return {
    default: MockJsPDF,
    jsPDF: MockJsPDF,
  };
});

describe('boletaPdf utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a boleta ticket PDF Blob with standard options and items', async () => {
    const venta = {
      id: 12,
      boleta: 'BOLETA B001-000012',
      fecha: '2026-03-01T10:00:00Z',
      cliente: 'Empresa Test (RUC: 20603671717)',
      direccion: 'Av. Las Gardenias 123',
      metodoPago: 'efectivo',
      totalVenta: 180.5,
      items: [
        {
          producto: { descripcion: 'Filtro de Aceite' },
          cantidad: 2,
          precioUnitario: 40.25,
          totalVenta: 80.5,
        },
        {
          producto: null,
          cantidad: 1,
          precioUnitario: 100,
          totalVenta: 100,
        },
      ],
    };

    const formatFecha = vi.fn((_d) => `01/03/2026`);
    const blob = await generateBoletaPdf(venta, {
      qrUrl: 'data:image/png;base64,qrdata',
      formatFecha,
      vendedorNombre: 'Juan Cajero',
    });

    expect(blob).toBeDefined();
    expect(mockDoc.output).toHaveBeenCalledWith('blob');
    expect(mockDoc.text).toHaveBeenCalled();
    expect(mockDoc.addImage).toHaveBeenCalledTimes(4); // 2 passes (measure + final): 2 logos + 2 QRs
  });

  it('generates a ticket PDF for standard note without boleta code or custom options', async () => {
    const venta = {
      id: 99,
      fecha: '2026-03-02',
      cliente: 'Venta Mostrador',
      totalVenta: 50,
      items: [],
    };

    const blob = await generateBoletaPdf(venta);
    expect(blob).toBeDefined();
    expect(mockDoc.text).toHaveBeenCalled();
  });

  it('handles image insertion errors gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockDoc.addImage.mockImplementationOnce(() => {
      throw new Error('Image error');
    });

    const venta = {
      id: 1,
      boleta: 'B001-000001',
      totalVenta: 10,
      items: [],
    };

    const blob = await generateBoletaPdf(venta, { qrUrl: 'invalid-qr' });
    expect(blob).toBeDefined();
    warnSpy.mockRestore();
  });
});
