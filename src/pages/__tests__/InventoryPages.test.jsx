import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import Movimientos from '../Movimientos';
import Kardex from '../Kardex';
import Creditos from '../Creditos';
import Auditoria from '../Auditoria';
import GestionUsuarios from '../GestionUsuarios';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import * as api from '../../services/api';

vi.mock('../../services/api');
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('Inventory & Management Pages (Movimientos, Kardex, Creditos, Auditoria, GestionUsuarios)', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'SuperAdmin', rol: 'SuperAdmin' },
    usuarios: [
      { id: 1, nombre: 'SuperAdmin', rol: 'SuperAdmin', pin: '1234' },
      { id: 2, nombre: 'Vendedor 1', rol: 'Vendedor', pin: '5678' },
    ],
    setUsuarios: vi.fn(),
  };

  const mockInventoryContext = {
    cargando: false,
    productos: [
      { id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 10, pVenta: 50, pCompra: 30 },
    ],
    movimientos: [
      { id: 1, fecha: '2026-03-01T10:00:00', productoId: 1, tipo: 'entrada', cantidad: 5, motivo: 'Compra', stockAnterior: 5, stockNuevo: 10 },
      { id: 2, fecha: '2026-03-02T11:00:00', productoId: 1, tipo: 'salida', cantidad: 2, motivo: 'Venta', stockAnterior: 10, stockNuevo: 8 },
    ],
    traslados: [
      {
        id: 1,
        tiendaVecina: 'Tienda B',
        fechaPrestamo: '2026-03-01',
        total: 100,
        cantidad: 2,
        estado: 'pendiente',
        items: [{ productoId: 1, cantidad: 2 }],
      },
    ],
    tiendasVecinas: ['Tienda B'],
    formatFecha: (f) => f || '2026-03-01',
    resolverTraslado: vi.fn().mockResolvedValue(true),
    getKardex: vi.fn().mockReturnValue([
      { id: 1, fecha: '2026-03-01', tipo: 'entrada', cantidad: 5, saldo: 5, motivo: 'Compra' }
    ]),
  };

  const renderWithContext = (ui) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <InventoryContext.Provider value={mockInventoryContext}>
          {ui}
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchSheet.mockResolvedValue([
      { id: 1, fecha: '2026-03-01 10:00:00', usuario: 'Admin', accion: 'Test Log Action', modulo: 'Productos', estado: 'success' }
    ]);
  });

  it('renders Movimientos page, filters, sort and opens new movement modal', () => {
    const { container } = renderWithContext(<Movimientos />);
    expect(container.textContent).toContain('Filtro');

    const searchInput = container.querySelector('input[placeholder*="Buscar"]') || container.querySelector('input[type="text"]');
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'Compra' } });
    }

    const headers = container.querySelectorAll('th');
    headers.forEach((th) => fireEvent.click(th));

    const addBtn = container.querySelector('.page-header .btn-primary');
    if (addBtn) {
      fireEvent.click(addBtn);
    }
  });

  it('renders Kardex page with transaction details and product selection', () => {
    const { container } = renderWithContext(<Kardex />);
    expect(container.textContent).toContain('Filtro');

    const selects = container.querySelectorAll('select');
    selects.forEach((sel) => {
      if (sel.options.length > 1) {
        fireEvent.change(sel, { target: { value: sel.options[1].value } });
      }
    });
  });

  it('renders Creditos / Traslados page and handles resolving loan actions', async () => {
    const { container } = renderWithContext(<Creditos />);
    expect(container.textContent).toContain('Tienda B');

    // Click resolve action buttons
    const actionButtons = container.querySelectorAll('button');
    for (const btn of actionButtons) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }
  });

  it('renders Auditoria page with log entries and filters', async () => {
    const { container } = renderWithContext(<Auditoria />);
    await waitFor(() => {
      expect(container.textContent).toContain('Test Log Action');
    });

    const searchInput = container.querySelector('input[placeholder*="Buscar"]') || container.querySelector('input[type="text"]');
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'Test' } });
    }

    const refreshBtn = container.querySelector('button');
    if (refreshBtn) {
      await act(async () => {
        fireEvent.click(refreshBtn);
      });
    }
  });

  it('renders GestionUsuarios page and handles user management actions', async () => {
    const { container } = renderWithContext(<GestionUsuarios />);
    expect(container.textContent).toContain('SuperAdmin');
    expect(container.textContent).toContain('Vendedor 1');

    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }
  });
});
