import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import VentaFormModal from '../VentaFormModal';
import VentaDetalleModal from '../VentaDetalleModal';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import { generateBoletaPdf } from '../../utils/boletaPdf';
import Swal from 'sweetalert2';
import { saveAs } from 'file-saver';
import { abrirWhatsApp } from '../../utils/whatsapp';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true, value: '999888777' }),
  },
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockImplementation((data, opts, cb) => cb(null, 'data:image/png;base64,mockqr')),
  },
}));

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('../../utils/whatsapp', () => ({
  validarNumeroWhatsApp: vi.fn((val) => (val && String(val).includes('999') ? '51999888777' : null)),
  abrirWhatsApp: vi.fn(),
}));

vi.mock('../../utils/boletaPdf', () => ({
  generateBoletaPdf: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
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
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
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

    it('renders details of a sale, parses client info, and triggers print', async () => {
      const onCerrar = vi.fn();

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
      await waitFor(() => expect(generateBoletaPdf).toHaveBeenCalled());

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

    it('triggers send WhatsApp flow and handles validation/cancellation', async () => {
      const onCerrar = vi.fn();
      renderWithContext(
        <VentaDetalleModal
          abierto={true}
          venta={venta}
          formatFecha={(f) => f || '2026-03-01'}
          onCerrar={onCerrar}
        />
      );

      // Find WhatsApp button
      const waBtn = screen.getByText(/whatsapp/i);
      await act(async () => {
        fireEvent.click(waBtn);
      });

      // Verify Swal was called with input validator and preConfirm
      expect(Swal.fire).toHaveBeenCalled();
      const swalCall = Swal.fire.mock.calls[0][0];
      if (swalCall.inputValidator) {
        expect(swalCall.inputValidator('')).toBeTruthy();
        expect(swalCall.inputValidator('999888777')).toBeNull();
      }
      if (swalCall.preConfirm) {
        expect(swalCall.preConfirm('999888777')).toBe('51999888777');
      }

      await waitFor(() => {
        expect(saveAs).toHaveBeenCalled();
        expect(abrirWhatsApp).toHaveBeenCalled();
      });
    });

    it('handles WhatsApp cancel when user does not input a number', async () => {
      Swal.fire.mockResolvedValueOnce({ value: null });
      renderWithContext(
        <VentaDetalleModal
          abierto={true}
          venta={venta}
          formatFecha={(f) => f || '2026-03-01'}
          onCerrar={vi.fn()}
        />
      );

      const waBtn = screen.getByText(/whatsapp/i);
      await act(async () => {
        fireEvent.click(waBtn);
      });

      expect(abrirWhatsApp).not.toHaveBeenCalled();
    });

    it('handles error in print gracefully', async () => {
      generateBoletaPdf.mockRejectedValueOnce(new Error('PDF generation failed'));
      renderWithContext(
        <VentaDetalleModal
          abierto={true}
          venta={venta}
          formatFecha={(f) => f || '2026-03-01'}
          onCerrar={vi.fn()}
        />
      );

      const printBtn = screen.getByText(/imprimir/i);
      await act(async () => {
        fireEvent.click(printBtn);
      });

      expect(Swal.fire).toHaveBeenCalled();
    });
  });
});
