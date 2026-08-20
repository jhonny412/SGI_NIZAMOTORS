import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { InventoryProvider } from '../InventoryContext';
import { useInventory } from '../useInventory';
import { AuthContext } from '../AuthContext';
import * as invService from '../../services/inventoryService';

vi.mock('../../services/api', () => ({
  fetchSheet: vi.fn().mockImplementation((sheet) => {
    if (sheet === 'Productos') {
      return Promise.resolve([
        { id: '1', codigo: 'P01', descripcion: 'Filtro', stock: '10', pCompra: '40', pVenta: '50', margGanancia: '25', proveedorId: '1', marca: 'Toyota', categoria: 'Frenos' },
      ]);
    }
    if (sheet === 'Proveedores') return Promise.resolve([{ id: '1', nombre: 'Bosch' }]);
    if (sheet === 'Marcas') return Promise.resolve([{ id: '1', nombre: 'Toyota' }]);
    if (sheet === 'Categorias') return Promise.resolve([{ id: '1', nombre: 'Frenos' }]);
    if (sheet === 'Movimientos') return Promise.resolve([{ id: '1', productoId: '1', tipo: 'entrada', cantidad: '5', motivo: 'Compra', fecha: '2026-03-01T10:00:00' }]);
    if (sheet === 'Traslados') return Promise.resolve([{ id: '1', tiendaVecina: 'Tienda A', estado: 'pendiente', items: '[{"productoId":1,"cantidad":2}]' }]);
    if (sheet === 'Ventas') return Promise.resolve([{ id: '1', boleta: 'B001', cliente: 'Cliente A', totalVenta: '100', items: '[{"productoId":1,"cantidad":1}]' }]);
    if (sheet === 'Usuarios') return Promise.resolve([{ id: '1', nombre: 'Admin User', pin: '1234', rol: 'Admin' }]);
    return Promise.resolve([]);
  }),
}));

vi.mock('../../services/inventoryService', () => ({
  formatProductos: vi.fn().mockImplementation((prods) =>
    prods.map((p) => ({ ...p, id: Number(p.id), stock: Number(p.stock), pCompra: Number(p.pCompra), pVenta: Number(p.pVenta), margGanancia: Number(p.margGanancia), proveedorId: Number(p.proveedorId) }))
  ),
  formatMovements: vi.fn().mockImplementation((m) => m.map((x) => ({ ...x, id: Number(x.id), productoId: Number(x.productoId), cantidad: Number(x.cantidad) }))),
  formatTransfers: vi.fn().mockImplementation((t) => t.map((x) => ({ ...x, id: Number(x.id), items: JSON.parse(x.items || '[]') }))),
  formatSales: vi.fn().mockImplementation((s) => s.map((x) => ({ ...x, id: Number(x.id), items: JSON.parse(x.items || '[]') }))),
  saveProduct: vi.fn().mockResolvedValue(true),
  deleteProductApi: vi.fn().mockResolvedValue(true),
  saveSupplier: vi.fn().mockResolvedValue(true),
  deleteSupplierApi: vi.fn().mockResolvedValue(true),
  saveBrand: vi.fn().mockResolvedValue(true),
  deleteBrandApi: vi.fn().mockResolvedValue(true),
  saveCategory: vi.fn().mockResolvedValue(true),
  deleteCategoryApi: vi.fn().mockResolvedValue(true),
  saveMovement: vi.fn().mockResolvedValue(true),
  saveTransfer: vi.fn().mockResolvedValue(true),
  resolveTransferApi: vi.fn().mockResolvedValue(true),
  saveSale: vi.fn().mockResolvedValue(true),
  deleteSaleApi: vi.fn().mockResolvedValue(true),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('InventoryContext Integration', () => {
  const mockUser = { id: 1, nombre: 'Admin User', rol: 'Admin' };
  const mockSetUsuarios = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <AuthContext.Provider value={{ usuarioActivo: mockUser, setUsuarios: mockSetUsuarios, usuarios: [mockUser] }}>
      <InventoryProvider>{children}</InventoryProvider>
    </AuthContext.Provider>
  );

  it('loads initial data and computes supplier names', async () => {
    const { result } = renderHook(() => useInventory(), { wrapper });
    await waitFor(() => expect(result.current.productos.length).toBe(1));

    expect(result.current.productos[0]?.proveedorNombre).toBe('Bosch');
    expect(result.current.getProveedorNombre(1)).toBe('Bosch');
    expect(result.current.tiendasVecinas).toContain('CANDAO');
  });

  it('executes full suite of CRUD mutations, calculations and date formatting', async () => {
    const { result } = renderHook(() => useInventory(), { wrapper });
    await waitFor(() => expect(result.current.productos.length).toBe(1));

    // 1. Products CRUD
    await act(async () => {
      await result.current.agregarProducto({ codigo: 'P02', descripcion: 'Pastilla', pCompra: 20, margGanancia: 50, stock: 5 });
    });
    expect(invService.saveProduct).toHaveBeenCalled();

    await act(async () => {
      await result.current.editarProducto({ id: 1, codigo: 'P01', descripcion: 'Filtro Modificado', pCompra: 40, margGanancia: 25, stock: 10 });
    });

    await act(async () => {
      result.current.eliminarProducto(1);
    });

    // 2. Suppliers CRUD
    await act(async () => {
      await result.current.agregarProveedor({ nombre: 'Nuevo Prov' });
      await result.current.editarProveedor({ id: 1, nombre: 'Bosch Perú' });
      result.current.eliminarProveedor(1);
    });

    // 3. Brands CRUD
    await act(async () => {
      await result.current.agregarMarca({ nombre: 'Nissan' });
      await result.current.editarMarca({ id: 1, nombre: 'Toyota Global' });
      result.current.eliminarMarca(1);
    });

    // 4. Categories CRUD
    await act(async () => {
      await result.current.agregarCategoria({ nombre: 'Motor' });
      await result.current.editarCategoria({ id: 1, nombre: 'Frenos ABS' });
      result.current.eliminarCategoria(1);
    });

    // 5. Movements & Kardex
    await act(async () => {
      await result.current.registrarMovimiento({ productoId: 1, tipo: 'salida', cantidad: 2, motivo: 'Ajuste' });
    });
    const kardex = result.current.getKardex(1);
    expect(Array.isArray(kardex)).toBe(true);

    // 6. Transfers
    await act(async () => {
      await result.current.agregarTraslado({ tiendaVecina: 'Tienda B', items: [{ productoId: 1, cantidad: 1 }] });
      await result.current.resolverTraslado(1, 'devuelto');
    });

    // 7. Sales & Sale Deletion
    await act(async () => {
      await result.current.agregarVenta({ cliente: 'Cliente B', items: [{ productoId: 1, cantidad: 1 }] });
      result.current.eliminarVenta(1);
    });

    // 8. Date Formatter Branches
    expect(result.current.formatFecha('2026-03-01')).toBe('01/03/2026 00:00:00');
    expect(result.current.formatFecha('2026-03-01 14:30:00')).toBe('01/03/2026 14:30:00');
    expect(result.current.formatFecha('invalid-date')).toBe('invalid-date');
    expect(result.current.formatFecha(null)).toBe('');
  });
});
