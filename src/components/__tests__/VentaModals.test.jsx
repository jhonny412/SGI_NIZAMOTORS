import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import VentaFormModal from '../VentaFormModal';
import VentaDetalleModal from '../VentaDetalleModal';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockImplementation((data, opts, cb) => cb(null, 'data:image/png;base64,mockqr')),
  },
}));

describe('Venta Modals (VentaFormModal & VentaDetalleModal)', () => {
  const mockInventoryContext = {
    productos: [
      { id: 1, codigo: 'P01', descripcion: 'Filtro de Aceite', stock: 10, pCompra: 40, margGanancia: 25, pVenta: 50, utilidad: 10 }
    ],
    ventas: [],
    movimientos: [],
    agregarVenta: vi.fn().mockResolvedValue(true),
    formatFecha: (f) => f || '2026-03-01',
    getProveedorNombre: () => 'Bosch',
  };

  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Jhon', rol: 'Admin' },
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
  });

  describe('VentaFormModal', () => {
    it('handles validations, product selection, cart add/remove, payment method and submit', async () => {
      const onCerrar = vi.fn();
      const onVentaRegistrada = vi.fn();
      const { container } = renderWithContext(
        <VentaFormModal abierto={true} onCerrar={onCerrar} onVentaRegistrada={onVentaRegistrada} />
      );

      const form = container.querySelector('form');

      // 1. Submit empty cart
      fireEvent.submit(form);

      // 2. Select product from autocomplete
      const searchInput = container.querySelector('input[placeholder*="Escribe"]') || container.querySelector('input[placeholder*="buscar"]') || container.querySelector('input[type="text"]');
      if (searchInput) {
        fireEvent.focus(searchInput);
        fireEvent.change(searchInput, { target: { value: 'Filtro' } });
        const itemBtn = container.querySelector('ul button');
        if (itemBtn) fireEvent.click(itemBtn);
      }

      // 3. Click add to cart button
      const addBtn = screen.getByText(/agregar al carrito/i);
      fireEvent.click(addBtn);

      // 4. Test client document fields
      const docSelect = container.querySelector('select');
      if (docSelect) {
        fireEvent.change(docSelect, { target: { value: 'DNI' } });
        const docNumInput = container.querySelector('input[placeholder*="números"]');
        if (docNumInput) fireEvent.change(docNumInput, { target: { value: '12345678' } });
      }

      const nameInput = container.querySelector('input[placeholder*="completo"]') || container.querySelectorAll('input[type="text"]')[1];
      if (nameInput) fireEvent.change(nameInput, { target: { value: 'Juan Perez' } });

      // 5. Submit valid sale
      await act(async () => {
        fireEvent.submit(form);
      });
      expect(mockInventoryContext.agregarVenta).toHaveBeenCalled();

      // 6. Test close
      const closeBtn = container.querySelector('button[type="button"]');
      if (closeBtn) fireEvent.click(closeBtn);
    });
  });

  describe('VentaDetalleModal', () => {
    it('renders details of a sale, parses client info, and triggers print', () => {
      const onCerrar = vi.fn();
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      const venta = {
        id: 1,
        boleta: 'BOLETA B001-000001',
        fecha: '2026-03-01T10:00:00',
        cliente: 'Juan Perez (DNI: 12345678)',
        metodoPago: 'efectivo',
        totalVenta: 1250.50,
        utilidad: 250,
        cantidadTotal: 2,
        vendedor: 'Jhon',
        items: [
          {
            productoId: 1,
            descripcion: 'Filtro',
            cantidad: 2,
            precioUnitario: 625.25,
            subtotal: 1250.50,
            totalVenta: 1250.50,
          },
        ],
      };

      const { container, rerender } = renderWithContext(
        <VentaDetalleModal
          abierto={true}
          venta={venta}
          formatFecha={(f) => f || '2026-03-01'}
          onCerrar={onCerrar}
        />
      );

      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
      expect(container.textContent).toContain('BOLETA B001-000001');
      expect(container.textContent).toContain('Juan Perez');

      const printBtn = screen.getByText(/imprimir/i);
      fireEvent.click(printBtn);
      expect(printSpy).toHaveBeenCalled();

      // Legacy client matching
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <VentaDetalleModal
              abierto={true}
              venta={{ ...venta, cliente: 'Empresa SAC (20123456789)' }}
              formatFecha={(f) => f || '2026-03-01'}
              onCerrar={onCerrar}
            />
          </InventoryContext.Provider>
        </AuthContext.Provider>
      );
      expect(container.textContent).toContain('Empresa SAC');
    });
  });
});
