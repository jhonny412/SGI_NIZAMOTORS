import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Creditos from '../Creditos';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('Creditos Page', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Admin', rol: 'Admin' },
  };

  const mockInventoryContext = {
    cargando: false,
    productos: [
      { id: 1, codigo: 'P01', descripcion: 'Filtro de Aceite', stock: 10, pVenta: 50 },
      { id: 2, codigo: 'P02', descripcion: 'Pastillas Freno', stock: 5, pVenta: 80 },
    ],
    traslados: [
      {
        id: 1,
        tiendaVecina: 'Tienda Central',
        fechaPrestamo: '2026-03-01',
        total: 100,
        cantidad: 2,
        estado: 'pendiente',
        notas: 'Urgente para cliente',
        items: [{ productoId: 1, cantidad: 2, precioVenta: 50, total: 100 }],
      },
      {
        id: 2,
        tiendaVecina: 'Tienda Norte',
        fechaPrestamo: '2026-03-02',
        total: 80,
        cantidad: 1,
        estado: 'devuelto',
        fechaResolucion: '2026-03-03',
        items: [{ productoId: 2, cantidad: 1, precioVenta: 80, total: 80 }],
      },
    ],
    tiendasVecinas: ['Tienda Central', 'Tienda Norte'],
    resolverTraslado: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders transfers, filters by state, searches, opens detail modal and resolves', async () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <InventoryContext.Provider value={mockInventoryContext}>
          <Creditos />
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );

    expect(container.textContent).toContain('Tienda Central');
    expect(container.textContent).toContain('Tienda Norte');

    // Filter tabs
    const filterTabs = container.querySelectorAll('.flex.bg-slate-100 button, .flex.bg-slate-950 button');
    filterTabs.forEach((tab) => fireEvent.click(tab));

    // Search input
    const searchInput = container.querySelector('input[placeholder*="Buscar"]');
    if (searchInput) fireEvent.change(searchInput, { target: { value: 'Filtro' } });

    // Open detail modal for first item (button with eye or view)
    const viewBtn = container.querySelector('button[title*="Ver detalle"]') || container.querySelector('tbody button');
    if (viewBtn) {
      await act(async () => {
        fireEvent.click(viewBtn);
      });

      // In modal: click "Devuelto" or "Pagó Efectivo"
      const modalActionBtns = container.querySelectorAll('.modal-overlay button');
      for (const mBtn of modalActionBtns) {
        await act(async () => {
          fireEvent.click(mBtn);
        });
      }
    }

    // Click direct action buttons (Devuelto, Pagó, Notas) in table
    const actionBtns = container.querySelectorAll('tbody button');
    for (const btn of actionBtns) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }

    // New transfer button
    const newBtn = container.querySelector('.page-header .btn-primary');
    if (newBtn) fireEvent.click(newBtn);
  });
});
