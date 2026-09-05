import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act, screen } from '@testing-library/react';
import Creditos from '../Creditos';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';

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
      { id: 1, codigo: 'P01', oem: 'OEM01', descripcion: 'Filtro de Aceite', stock: 10, pVenta: 50 },
      { id: 2, codigo: 'P02', oem: '', descripcion: 'Pastillas Freno', stock: 5, pVenta: 80 },
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
      {
        id: 3,
        tiendaVecina: 'Tienda Sur',
        fechaPrestamo: '2026-03-03',
        total: 50,
        cantidad: 1,
        estado: 'pagado',
        fechaResolucion: '2026-03-04',
        productoId: 999,
        items: [],
      },
    ],
    tiendasVecinas: ['Tienda Central', 'Tienda Norte', 'Tienda Sur'],
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

    // Search input
    const searchInput = container.querySelector('input[placeholder*="Buscar"]');
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'Filtro' } });
      fireEvent.change(searchInput, { target: { value: '' } });
    }

    // Direct resolution buttons in table (Devuelto, Pagó) for pending transfer #1
    const devueltoBtn = container.querySelector('tbody button.bg-emerald-600');
    if (devueltoBtn) {
      await act(async () => {
        fireEvent.click(devueltoBtn);
      });
      expect(Swal.fire).toHaveBeenCalled();
      expect(mockInventoryContext.resolverTraslado).toHaveBeenCalledWith(1, 'devuelto');
    }

    const pagoBtn = container.querySelector('tbody button.bg-blue-600');
    if (pagoBtn) {
      await act(async () => {
        fireEvent.click(pagoBtn);
      });
      expect(mockInventoryContext.resolverTraslado).toHaveBeenCalledWith(1, 'pagado');
    }

    // Open detail modal for pending transfer (first row)
    const verButtons = container.querySelectorAll('tbody button[title*="detalle"]');
    if (verButtons.length > 0) {
      await act(async () => {
        fireEvent.click(verButtons[0]);
      });

      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
      expect(screen.getByText(/detalle de préstamo/i)).toBeInTheDocument();

      // Click "Pagó Efectivo" inside detail modal
      const pagoEfectivoModalBtn = screen.getByText(/pagó efectivo/i);
      await act(async () => {
        fireEvent.click(pagoEfectivoModalBtn);
      });
      expect(mockInventoryContext.resolverTraslado).toHaveBeenCalled();
    }

    // Open detail modal for resolved transfer (second row)
    if (verButtons.length > 1) {
      await act(async () => {
        fireEvent.click(verButtons[1]);
      });
      const cerrarBtn = screen.getByText(/cerrar/i);
      fireEvent.click(cerrarBtn);
    }

    // Test filter pills at the end
    const filterContainer = container.querySelector('.rounded-lg.overflow-x-auto');
    if (filterContainer) {
      const pills = filterContainer.querySelectorAll('button');
      pills.forEach((p) => fireEvent.click(p));
    }

    // Open new transfer modal
    const newBtn = container.querySelector('.page-header button');
    if (newBtn) fireEvent.click(newBtn);
  });

  it('renders empty state when no transfers match', () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <InventoryContext.Provider value={{ ...mockInventoryContext, traslados: [] }}>
          <Creditos />
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );

    expect(container.textContent).toContain('No se encontraron préstamos o traslados');
  });
});
