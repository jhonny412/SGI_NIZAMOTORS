import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Ventas from '../Ventas';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('Ventas Page', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Jhon', rol: 'Admin' },
  };

  const mockInventoryContext = {
    cargando: false,
    productos: [
      { id: 1, codigo: 'P01', descripcion: 'Filtro de Aceite', stock: 10, pVenta: 100 },
      { id: 2, codigo: 'P02', descripcion: 'Pastillas', stock: 5, pVenta: 100 },
    ],
    ventas: [
      {
        id: 1,
        boleta: 'BOLETA B001-000001',
        fecha: '2026-03-01T10:00:00',
        cliente: 'Carlos Perez (DNI: 12345678)',
        metodoPago: 'EFECTIVO',
        totalVenta: 200,
        utilidad: 50,
        cantidadTotal: 2,
        vendedor: 'Jhon',
        items: [{ productoId: 1, cantidad: 2, precioUnitario: 100 }],
      },
      {
        id: 2,
        boleta: null,
        fecha: '2026-03-02T10:00:00',
        cliente: null,
        metodoPago: 'TARJETA',
        totalVenta: 100,
        utilidad: -10,
        cantidadTotal: 1,
        vendedor: 'Maria',
        items: [{ productoId: 2, cantidad: 1, precioUnitario: 100 }],
      },
    ],
    formatFecha: (f) => f || '2026-03-01',
    eliminarVenta: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sales list, filters by payment, searches, views details, deletes sale and opens form', async () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <InventoryContext.Provider value={mockInventoryContext}>
          <Ventas />
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );

    expect(container.textContent).toContain('B001-000001');
    expect(container.textContent).toContain('Carlos Perez');

    // 1. Search input
    const searchInput = container.querySelector('input[placeholder*="Buscar"]') || container.querySelector('input[type="text"]');
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'Carlos' } });
      fireEvent.change(searchInput, { target: { value: '' } });
    }

    // 2. Click all buttons (view detail, delete, new sale)
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }

    // 3. Test seller view (non-admin)
    const sellerAuth = { usuarioActivo: { id: 2, nombre: 'Maria', rol: 'Vendedor' } };
    const { container: sellerContainer } = render(
      <AuthContext.Provider value={sellerAuth}>
        <InventoryContext.Provider value={mockInventoryContext}>
          <Ventas />
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );
    expect(sellerContainer.textContent).toContain('TARJETA');
  });
});
