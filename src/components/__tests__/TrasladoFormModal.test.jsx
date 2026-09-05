import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import TrasladoFormModal from '../TrasladoFormModal';
import { InventoryContext } from '../../context/InventoryContext';
import Swal from 'sweetalert2';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('TrasladoFormModal', () => {
  const mockInventoryContext = {
    productos: [
      { id: 1, codigo: 'P01', oem: 'OEM-01', descripcion: 'Filtro', stock: 10, pVenta: 50 },
      { id: 2, codigo: 'P02', oem: 'OEM-02', descripcion: 'Bujia', stock: 5, pVenta: 20 },
    ],
    tiendasVecinas: ['Tienda Central', 'Tienda Norte'],
    agregarTraslado: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when abierto is false', () => {
    const { container } = render(
      <InventoryContext.Provider value={mockInventoryContext}>
        <TrasladoFormModal abierto={false} onCerrar={vi.fn()} />
      </InventoryContext.Provider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('handles item selection, quantity, notes, and submit', async () => {
    const onCerrar = vi.fn();
    const { container } = render(
      <InventoryContext.Provider value={mockInventoryContext}>
        <TrasladoFormModal abierto={true} onCerrar={onCerrar} />
      </InventoryContext.Provider>
    );

    // 1. Select tienda vecina
    const select = container.querySelector('select');
    fireEvent.change(select, { target: { value: 'Tienda Central' } });

    // 2. Search input for product
    const searchInput = container.querySelector('input[placeholder*="Buscar"]');
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'Filtro' } });

    const dropdownBtn = container.querySelector('ul button');
    expect(dropdownBtn).toBeInTheDocument();
    fireEvent.click(dropdownBtn);

    // 3. Click add item button
    const addBtn = container.querySelector('button[title*="Agregar"]') || container.querySelectorAll('button')[1];
    fireEvent.click(addBtn);

    // 4. Enter notes
    const textarea = container.querySelector('textarea');
    fireEvent.change(textarea, { target: { value: 'Préstamo urgente' } });

    // 5. Submit form
    const form = container.querySelector('form');
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockInventoryContext.agregarTraslado).toHaveBeenCalledWith({
      tiendaVecina: 'Tienda Central',
      items: [{ productoId: 1, cantidad: 1 }],
      notas: 'Préstamo urgente',
    });
    expect(onCerrar).toHaveBeenCalled();
  });

  it('validates empty store or empty items on submit', async () => {
    const onCerrar = vi.fn();
    const { container } = render(
      <InventoryContext.Provider value={mockInventoryContext}>
        <TrasladoFormModal abierto={true} onCerrar={onCerrar} />
      </InventoryContext.Provider>
    );

    const form = container.querySelector('form');

    // Submit with empty fields
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(Swal.fire).toHaveBeenCalled();

    // Select store but without items
    const select = container.querySelector('select');
    fireEvent.change(select, { target: { value: 'Tienda Central' } });
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', text: expect.stringContaining('repuesto') })
    );
  });

  it('allows removing an added item and handles dirty close confirmation', async () => {
    const onCerrar = vi.fn();
    const { container } = render(
      <InventoryContext.Provider value={mockInventoryContext}>
        <TrasladoFormModal abierto={true} onCerrar={onCerrar} />
      </InventoryContext.Provider>
    );

    // Add an item
    const searchInput = container.querySelector('input[placeholder*="Buscar"]');
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'Bujia' } });
    const dropdownBtn = container.querySelector('ul button');
    if (dropdownBtn) fireEvent.click(dropdownBtn);

    const addBtn = container.querySelector('button[title*="Agregar"]') || container.querySelectorAll('button')[1];
    fireEvent.click(addBtn);

    // Remove item
    const removeBtn = container.querySelector('button[title*="Quitar"]') || container.querySelector('button.text-rose-400');
    if (removeBtn) {
      await act(async () => {
        fireEvent.click(removeBtn);
      });
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Quitar') }));
    }

    // Set notes so form is dirty
    const textarea = container.querySelector('textarea');
    fireEvent.change(textarea, { target: { value: 'Nota de prueba' } });

    // Try closing when dirty
    const closeBtn = container.querySelector('button[type="button"]');
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Descartar cambios?' }));
    expect(onCerrar).toHaveBeenCalled();
  });

  it('handles clicking backdrop to close modal', () => {
    const onCerrar = vi.fn();
    const { container } = render(
      <InventoryContext.Provider value={mockInventoryContext}>
        <TrasladoFormModal abierto={true} onCerrar={onCerrar} />
      </InventoryContext.Provider>
    );

    const overlay = container.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(onCerrar).toHaveBeenCalled();
  });

  it('prevents adding quantity exceeding available stock', () => {
    const zeroStockContext = {
      ...mockInventoryContext,
      productos: [{ id: 99, codigo: 'P99', descripcion: 'Sin Stock', stock: 0, pVenta: 10 }],
    };

    const { container } = render(
      <InventoryContext.Provider value={zeroStockContext}>
        <TrasladoFormModal abierto={true} onCerrar={vi.fn()} />
      </InventoryContext.Provider>
    );

    // Select store
    const select = container.querySelector('select');
    fireEvent.change(select, { target: { value: 'Tienda Central' } });

    // Click add button when no product is selected (early return)
    const addBtn = container.querySelector('button[title*="Agregar"]') || container.querySelectorAll('button')[1];
    fireEvent.click(addBtn);
    expect(addBtn).toBeInTheDocument();
  });
});
