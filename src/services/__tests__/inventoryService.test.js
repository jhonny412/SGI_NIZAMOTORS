import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../api';
import {
  formatProductos,
  formatMovements,
  formatTransfers,
  formatSales,
  saveProduct,
  deleteProductApi,
  saveSupplier,
  deleteSupplierApi,
  saveBrand,
  deleteBrandApi,
  saveCategory,
  deleteCategoryApi,
  createMovement,
  createTransfer,
  resolveTransfer,
  createSale,
  deleteSaleApi
} from '../inventoryService';

vi.mock('../api');
vi.mock('../../utils/logger', () => ({
  writeLog: vi.fn(),
}));

describe('Inventory Service', () => {
  const user = { nombre: 'Test Admin', rol: 'admin' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Formatters', () => {
    it('formats products calculating pVenta and numbers correctly', () => {
      const raw = [{ id: '1', stock: '10', pCompra: '80', margGanancia: '20', proveedorId: '5' }];
      const formatted = formatProductos(raw);
      expect(formatted[0].id).toBe(1);
      expect(formatted[0].stock).toBe(10);
      expect(formatted[0].pVenta).toBe(100);
      expect(formatted[0].utilidad).toBe(20);
      expect(formatted[0].proveedorId).toBe(5);
    });

    it('formats movements and sorts descending by id', () => {
      const raw = [
        { id: '1', productoId: '10', cantidad: '5', stockAnterior: '0', stockNuevo: '5' },
        { id: '2', productoId: '10', cantidad: '2', stockAnterior: '5', stockNuevo: '7' }
      ];
      const formatted = formatMovements(raw);
      expect(formatted[0].id).toBe(2);
      expect(formatted[1].id).toBe(1);
    });

    it('formats transfers and safely parses items JSON', () => {
      const raw = [
        { id: '1', total: '100', cantidad: '2', items: JSON.stringify([{ productoId: 1, cantidad: 2 }]) },
        { id: '2', total: '50', items: 'invalid-json' }
      ];
      const formatted = formatTransfers(raw);
      expect(formatted[0].items.length).toBe(1);
      expect(formatted[1].items).toEqual([]);
    });

    it('formats sales and parses items JSON', () => {
      const raw = [
        { id: '1', totalVenta: '200', utilidad: '50', cantidadTotal: '4', items: JSON.stringify([{ id: 1 }]) },
        { id: '2', totalVenta: '100', items: '{invalid' }
      ];
      const formatted = formatSales(raw);
      expect(formatted[0].totalVenta).toBe(200);
      expect(formatted[1].items).toEqual([]);
    });
  });

  describe('Product CRUD', () => {
    it('creates a new product when id is missing', async () => {
      api.postAction.mockResolvedValueOnce({ id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 10 });
      const res = await saveProduct({ codigo: 'P01', pCompra: 80, margGanancia: 20, stock: 10 }, [], user);
      expect(res.id).toBe(1);
      expect(api.postAction).toHaveBeenCalledWith('Productos', 'create', expect.any(Object));
    });

    it('updates an existing product when id is present', async () => {
      api.postAction.mockResolvedValueOnce({ id: 5, codigo: 'P05', pCompra: 50, margGanancia: 50 });
      const res = await saveProduct({ id: 5, codigo: 'P05', pCompra: 50, margGanancia: 50 }, [{ id: 5 }], user);
      expect(res.id).toBe(5);
      expect(api.postAction).toHaveBeenCalledWith('Productos', 'edit', expect.any(Object));
    });

    it('deletes a product successfully and handles failure', async () => {
      api.postAction.mockResolvedValueOnce({});
      await expect(deleteProductApi(1, { codigo: 'P01' }, user)).resolves.not.toThrow();

      api.postAction.mockRejectedValueOnce(new Error('Delete error'));
      await expect(deleteProductApi(1, { codigo: 'P01' }, user)).rejects.toThrow('Delete error');
    });
  });

  describe('Supplier, Brand, Category CRUD', () => {
    it('creates and edits suppliers', async () => {
      api.postAction.mockResolvedValueOnce({ id: 10, nombre: 'Bosch' });
      const created = await saveSupplier({ nombre: 'Bosch' }, [], user);
      expect(created.id).toBe(10);

      api.postAction.mockResolvedValueOnce({});
      const updated = await saveSupplier({ id: 10, nombre: 'Bosch Peru' }, [{ id: 10 }], user);
      expect(updated.nombre).toBe('Bosch Peru');

      api.postAction.mockResolvedValueOnce({});
      await expect(deleteSupplierApi(10, { nombre: 'Bosch' }, user)).resolves.not.toThrow();
    });

    it('creates and edits brands', async () => {
      api.postAction.mockResolvedValueOnce({ id: 2, nombre: 'Toyota' });
      const brand = await saveBrand({ nombre: 'Toyota' }, [], user);
      expect(brand.id).toBe(2);

      api.postAction.mockResolvedValueOnce({});
      await saveBrand({ id: 2, nombre: 'Toyota Motor' }, [{ id: 2 }], user);
      expect(api.postAction).toHaveBeenCalledWith('Marcas', 'edit', expect.any(Object));

      api.postAction.mockResolvedValueOnce({});
      await expect(deleteBrandApi(2, { nombre: 'Toyota' }, user)).resolves.not.toThrow();
    });

    it('creates, edits and deletes categories', async () => {
      api.postAction.mockResolvedValueOnce({ id: 3, nombre: 'Frenos' });
      const cat = await saveCategory({ nombre: 'Frenos' }, [], user);
      expect(cat.id).toBe(3);

      api.postAction.mockResolvedValueOnce({});
      await saveCategory({ id: 3, nombre: 'Sistemas de Frenos' }, [{ id: 3 }], user);

      api.postAction.mockResolvedValueOnce({});
      await expect(deleteCategoryApi(3, { nombre: 'Frenos' }, user)).resolves.not.toThrow();
    });
  });

  describe('Movements', () => {
    it('creates an entry movement and updates stock', async () => {
      const products = [{ id: 1, stock: 10, descripcion: 'Batería' }];
      api.postAction.mockResolvedValueOnce({ id: 101 }).mockResolvedValueOnce({});

      const result = await createMovement({ productoId: 1, tipo: 'entrada', cantidad: 5 }, products, [], user);
      expect(result.stockNuevo).toBe(15);
    });

    it('throws when product not found or insufficient stock on exit', async () => {
      const products = [{ id: 1, stock: 2, descripcion: 'Batería' }];
      await expect(createMovement({ productoId: 99, tipo: 'entrada', cantidad: 1 }, products, [], user)).rejects.toThrow('product_not_found');
      await expect(createMovement({ productoId: 1, tipo: 'salida', cantidad: 10 }, products, [], user)).rejects.toThrow(/insufficient_stock/);
    });
  });

  describe('Transfers', () => {
    it('creates and resolves transfers', async () => {
      const products = [{ id: 1, stock: 10, pVenta: 100, descripcion: 'Batería' }];
      api.postAction.mockResolvedValue({});

      const result = await createTransfer(
        { tiendaVecina: 'Tienda 2', items: [{ productoId: 1, cantidad: 3 }] },
        products,
        [],
        [],
        user
      );
      expect(result.totalGeneral).toBe(300);

      const transfers = [{ id: 1, tiendaVecina: 'Tienda 2', total: 300, items: [{ productoId: 1, cantidad: 3 }] }];
      const resolved = await resolveTransfer(1, 'devuelto', transfers, products, [], user);
      expect(resolved.productosActualizados[0].stock).toBe(13);
    });

    it('handles paid resolution for transfers', async () => {
      const products = [{ id: 1, stock: 10, pVenta: 100, descripcion: 'Batería' }];
      const transfers = [{ id: 1, tiendaVecina: 'Tienda 2', total: 300, items: [{ productoId: 1, cantidad: 3 }] }];
      api.postAction.mockResolvedValue({});

      const resolved = await resolveTransfer(1, 'pagado', transfers, products, [], user);
      expect(resolved.tiendaVecina).toBe('Tienda 2');
    });
  });

  describe('Sales', () => {
    it('creates a sale with atomicity and margin adjustment', async () => {
      const products = [{ id: 1, stock: 5, pCompra: 80, margGanancia: 20, pVenta: 100, descripcion: 'Pastillas' }];
      api.postAction.mockResolvedValue({});

      const sale = {
        boleta: 'B001',
        cliente: 'Juan',
        totalVenta: 100,
        items: [{ productoId: 1, cantidad: 1, nuevoMargen: 30 }]
      };

      const result = await createSale(sale, products, [], [], user);
      expect(result.nuevaVenta.boleta).toBe('B001');
      expect(result.productosActualizados[0].stock).toBe(4);
      expect(result.productosActualizados[0].margGanancia).toBe(30);
    });

    it('handles empty cart and stock validation on sales', async () => {
      await expect(createSale({ items: [] }, [], [], [], user)).rejects.toThrow('empty_cart');
      const products = [{ id: 1, stock: 1, descripcion: 'Pastillas' }];
      await expect(createSale({ items: [{ productoId: 1, cantidad: 5 }] }, products, [], [], user)).rejects.toThrow(/insufficient_stock/);
    });

    it('deletes a sale without throwing unhandled exceptions', async () => {
      api.postAction.mockResolvedValueOnce({});
      await expect(deleteSaleApi(1, { boleta: 'B001' }, [], user)).resolves.not.toThrow();
    });
  });
});
