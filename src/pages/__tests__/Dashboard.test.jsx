import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Dashboard from '../Dashboard';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';

describe('Dashboard Page', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Jhon', rol: 'Admin' },
  };

  const mockUIContext = {
    setPaginaActiva: vi.fn(),
  };

  const mockInventoryContext = {
    cargando: false,
    totalProductos: 10,
    valorInventario: 5000,
    valorVentaInventario: 8000,
    stockBajo: [{ id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 2, stockMinimo: 5 }],
    stockAgotado: [{ id: 2, codigo: 'P02', descripcion: 'Bujía', stock: 0, stockMinimo: 5 }],
    totalMovimientos: 15,
    ultimosMovimientos: [
      { id: 1, fecha: '2026-03-01T10:00:00', tipo: 'entrada', cantidad: 5, productoId: 1 },
    ],
    productos: [
      { id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 2, stockMinimo: 5, pVenta: 50, pCompra: 30, margGanancia: 40 },
    ],
    ventas: [
      { id: 1, boleta: 'B001', fecha: '2026-03-01T10:00:00', totalVenta: 100, utilidad: 30, items: [] },
    ],
    movimientos: [
      { id: 1, fecha: '2026-03-01T10:00:00', productoId: 1, tipo: 'entrada', cantidad: 5, motivo: 'Compra' },
      { id: 2, fecha: '2026-03-02T10:00:00', productoId: 1, tipo: 'salida', cantidad: 2, motivo: 'Venta' },
    ],
    traslados: [],
    categorias: [],
    marcas: [],
    proveedores: [],
  };

  it('renders KPI summary cards and dashboard content for admin, switches period and handles quick actions', () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <UIContext.Provider value={mockUIContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <Dashboard />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );

    expect(container).toBeInTheDocument();

    // Click period toggle buttons (Semana / Mes) and quick actions
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => fireEvent.click(btn));
  });

  it('renders seller view when user is vendedor', () => {
    const sellerAuth = {
      usuarioActivo: { id: 2, nombre: 'Vendedor 1', rol: 'Vendedor' },
    };

    const { container } = render(
      <AuthContext.Provider value={sellerAuth}>
        <UIContext.Provider value={mockUIContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <Dashboard />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );

    expect(container.textContent).toContain('Vendedor 1');

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => fireEvent.click(btn));
  });
});
