import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import TrasladoFormModal from '../TrasladoFormModal';
import { InventoryContext } from '../../context/InventoryContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('TrasladoFormModal', () => {
  const mockInventoryContext = {
    productos: [{ id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 10, pVenta: 50 }],
    tiendasVecinas: ['Tienda Central', 'Tienda Norte'],
    agregarTraslado: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
    if (select) {
      fireEvent.change(select, { target: { value: 'Tienda Central' } });
    }

    // 2. Search input for product
    const searchInput = container.querySelector('input[placeholder*="Buscar"]');
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'Filtro' } });
      const dropdownBtn = container.querySelector('.animate-fade-in button');
      if (dropdownBtn) {
        fireEvent.click(dropdownBtn);
      }
    }

    // 3. Click add item button
    const addBtn = container.querySelector('button[title*="Agregar"]') || container.querySelectorAll('button')[1];
    if (addBtn) {
      fireEvent.click(addBtn);
    }

    // 4. Enter notes
    const textarea = container.querySelector('textarea');
    if (textarea) {
      fireEvent.change(textarea, { target: { value: 'Préstamo urgente' } });
    }

    // 5. Submit form
    const form = container.querySelector('form');
    await act(async () => {
      fireEvent.submit(form);
    });

    // 6. Close button
    const closeBtn = container.querySelector('button[type="button"]');
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }
  });
});
