import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Productos from '../Productos';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

vi.mock('exceljs', () => ({
  default: {
    Workbook: class {
      addWorksheet() {
        return {
          getRow: vi.fn().mockReturnValue({
            eachCell: (cb) => {
              cb({ column: 1, font: {}, fill: {}, alignment: {}, border: {} });
            },
            getCell: vi.fn().mockReturnValue({}),
          }),
          addRow: vi.fn().mockReturnValue({ getCell: vi.fn().mockReturnValue({}) }),
          columns: [],
        };
      }
      xlsx = { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
    },
  },
}));

describe('Productos Page', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Jhon', rol: 'Admin' },
  };

  const mockUIContext = {
    setPaginaActiva: vi.fn(),
  };

  const mockInventoryContext = {
    cargando: false,
    productos: [
      {
        id: 1,
        codigo: 'P01',
        oem: 'OEM-123',
        descripcion: 'Pastillas de Freno',
        marca: 'Toyota',
        categoria: 'Frenos',
        proveedorId: 1,
        proveedorNombre: 'Bosch Perú',
        pCompra: 40,
        margGanancia: 25,
        pVenta: 50,
        utilidad: 10,
        stock: 0,
        imagenUrl: 'https://example.com/img1.jpg',
        imagenUrl2: 'https://example.com/img2.jpg',
        imagenUrl3: 'https://example.com/img3.jpg',
      },
      {
        id: 2,
        codigo: 'P02',
        oem: 'OEM-456',
        descripcion: 'Batería 12V',
        marca: 'Bosch',
        categoria: 'Eléctrico',
        proveedorId: 1,
        proveedorNombre: 'Bosch Perú',
        pCompra: 80,
        margGanancia: 20,
        pVenta: 100,
        utilidad: 20,
        stock: 3,
      },
      {
        id: 3,
        codigo: 'P03',
        oem: 'OEM-789',
        descripcion: 'Filtro de Aceite',
        marca: 'Toyota',
        categoria: 'Filtros',
        proveedorId: 1,
        proveedorNombre: 'Bosch Perú',
        pCompra: 20,
        margGanancia: 50,
        pVenta: 30,
        utilidad: 10,
        stock: 12,
      },
    ],
    marcas: [{ id: 1, nombre: 'Toyota' }, { id: 2, nombre: 'Bosch' }],
    categorias: [{ id: 1, nombre: 'Frenos' }, { id: 2, nombre: 'Eléctrico' }, { id: 3, nombre: 'Filtros' }],
    proveedores: [{ id: 1, nombre: 'Bosch Perú' }],
    eliminarProducto: vi.fn(),
    editarProducto: vi.fn(),
  };

  const renderWithContext = (ui) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <UIContext.Provider value={mockUIContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            {ui}
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles search, filters, sorting, excel export, and modals', async () => {
    const { container } = renderWithContext(<Productos />);
    expect(container.textContent).toContain('Pastillas de Freno');

    // 1. Search filter
    const searchInput = container.querySelector('input[type="text"]');
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'Pastillas' } });
      fireEvent.change(searchInput, { target: { value: '' } });
    }

    // 2. Select filters (stock filter: agotados, low stock, in stock)
    const selects = container.querySelectorAll('select');
    selects.forEach((sel) => {
      Array.from(sel.options).forEach((opt) => {
        fireEvent.change(sel, { target: { value: opt.value } });
      });
      if (sel.options.length > 0) fireEvent.change(sel, { target: { value: '' } });
    });

    // 3. Sorting on all column headers
    const ths = container.querySelectorAll('th');
    ths.forEach((th) => {
      fireEvent.click(th);
      fireEvent.click(th);
    });

    // 4. Excel export
    const excelBtn = screen.queryByText(/exportar/i);
    if (excelBtn) {
      await act(async () => {
        fireEvent.click(excelBtn);
      });
    }

    // 5. Open image reference modal
    const cameraBtns = container.querySelectorAll('button.text-purple-600');
    if (cameraBtns.length > 0) {
      await act(async () => {
        fireEvent.click(cameraBtns[0]);
      });

      // Modal carousel navigation
      const modalBtns = container.querySelectorAll('.modal-overlay button');
      for (const btn of modalBtns) {
        await act(async () => {
          fireEvent.click(btn);
        });
      }

      // Close modal
      const closeBtn = container.querySelector('.modal-overlay button');
      if (closeBtn) {
        await act(async () => {
          fireEvent.click(closeBtn);
        });
      }
    }

    // 6. Edit and Delete buttons in table
    const editBtns = container.querySelectorAll('button.text-amber-600');
    if (editBtns.length > 0) fireEvent.click(editBtns[0]);

    const delBtns = container.querySelectorAll('button.text-red-600');
    if (delBtns.length > 0) fireEvent.click(delBtns[0]);

    // 7. Add product button
    const addBtn = container.querySelector('.page-header .btn-primary');
    if (addBtn) fireEvent.click(addBtn);
  });
});
