import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportMovimientosExcel } from '../exportMovimientosExcel';
import { exportVentasExcel } from '../exportVentasExcel';

vi.mock('exceljs', () => {
  return {
    default: {
      Workbook: class {
        constructor() {
          this.worksheets = [];
        }
        addWorksheet(name) {
          const mockCell = {
            font: {},
            fill: {},
            alignment: {},
            border: {},
            numFmt: '',
            value: 'test',
          };
          const mockRow = {
            height: 0,
            eachCell: vi.fn((cb) => {
              cb(mockCell, 1);
            }),
            getCell: vi.fn().mockReturnValue(mockCell),
          };
          const ws = {
            name,
            _columns: [],
            get columns() {
              return this._columns;
            },
            set columns(cols) {
              this._columns = (cols || []).map((col) => ({
                ...col,
                eachCell: vi.fn((opts, cb) => {
                  const callback = typeof opts === 'function' ? opts : cb;
                  if (callback) callback(mockCell);
                }),
              }));
            },
            getRow: vi.fn().mockReturnValue(mockRow),
            addRow: vi.fn().mockReturnValue(mockRow),
            eachRow: vi.fn((cb) => {
              cb(mockRow, 1);
              cb(mockRow, 2);
            }),
            views: [],
          };
          this.worksheets.push(ws);
          return ws;
        }
        xlsx = {
          writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        };
      },
    },
  };
});

vi.mock('file-saver', () => ({
  default: {
    saveAs: vi.fn(),
  },
  saveAs: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('Excel Export Utilities', () => {
  const dummyT = (key) => key;
  const dummyFormatFecha = (f) => f || '2026-03-01';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportMovimientosExcel', () => {
    it('exports movements correctly for entry/exit types', async () => {
      const datos = [
        {
          id: 1,
          fecha: '2026-03-01',
          productoId: 10,
          cantidad: 5,
          motivo: 'Compra',
          stockAnterior: 10,
          stockNuevo: 15,
        },
      ];
      const productos = [{ id: 10, descripcion: 'Filtro de Aceite', codigo: 'FIL-01' }];

      const result = await exportMovimientosExcel({
        datos,
        productos,
        formatFecha: dummyFormatFecha,
        t: dummyT,
        tipo: 'entrada',
        nombreArchivo: 'test-movimientos',
      });

      expect(result).toBe(true);
    });

    it('exports kardex type movements correctly', async () => {
      const datos = [
        {
          id: 2,
          fecha: '2026-03-02',
          productoId: 10,
          tipo: 'salida',
          cantidad: 2,
          motivo: 'Venta',
          stockAnterior: 15,
          stockNuevo: 13,
        },
      ];
      const productos = [{ id: 10, descripcion: 'Filtro de Aceite', codigo: 'FIL-01' }];

      const result = await exportMovimientosExcel({
        datos,
        productos,
        formatFecha: dummyFormatFecha,
        t: dummyT,
        tipo: 'kardex',
      });

      expect(result).toBe(true);
    });
  });

  describe('exportVentasExcel', () => {
    it('exports sales correctly', async () => {
      const datos = [
        {
          id: 1,
          boleta: 'B001-001',
          fecha: '2026-03-01',
          cliente: 'Juan Perez',
          metodoPago: 'efectivo',
          items: [{ productoId: 1, cantidad: 2 }],
          cantidadTotal: 2,
          totalVenta: 100,
          utilidad: 30,
          vendedor: 'Vendedor 1',
        },
      ];

      const result = await exportVentasExcel({
        datos,
        formatFecha: dummyFormatFecha,
        t: dummyT,
        nombreArchivo: 'test-ventas',
      });

      expect(result).toBe(true);
    });
  });
});
