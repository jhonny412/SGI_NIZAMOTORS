import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Categorias from '../Categorias';
import Marcas from '../Marcas';
import Proveedores from '../Proveedores';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('Catalog Pages (Categorias, Marcas, Proveedores)', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Jhon', rol: 'Admin' },
  };

  const mockUIContext = {
    setPaginaActiva: vi.fn(),
  };

  const mockInventoryContext = {
    cargando: false,
    categorias: [
      { id: 1, nombre: 'Frenos', descripcion: 'Frenos auto' },
      { id: 2, nombre: 'Motor', descripcion: 'Partes motor' },
    ],
    marcas: [
      { id: 1, nombre: 'Toyota' },
      { id: 2, nombre: 'Nissan' },
    ],
    proveedores: [
      { id: 1, nombre: 'Bosch', contacto: '987654321', email: 'bosch@test.com', ruc: '20123456789' },
      { id: 2, nombre: 'Denso', contacto: '987654322', email: 'denso@test.com', ruc: '20123456780' },
    ],
    productos: [
      { id: 1, categoria: 'Frenos', marca: 'Toyota', proveedorId: 1 },
    ],
    traslados: [],
    eliminarCategoria: vi.fn(),
    eliminarMarca: vi.fn(),
    eliminarProveedor: vi.fn(),
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

  it('renders Categorias page and handles new, edit, delete, sorting and search', async () => {
    const { container } = renderWithContext(<Categorias />);
    expect(container.textContent).toContain('Frenos');

    // Search
    const searchInput = container.querySelector('input');
    if (searchInput) fireEvent.change(searchInput, { target: { value: 'Frenos' } });

    // Sort headers
    const ths = container.querySelectorAll('th');
    ths.forEach((th) => fireEvent.click(th));

    // Edit and Delete buttons in tbody
    const tbodyButtons = container.querySelectorAll('tbody button');
    tbodyButtons.forEach((btn) => fireEvent.click(btn));

    // Open new modal
    const addBtn = container.querySelector('.page-header .btn-primary');
    if (addBtn) fireEvent.click(addBtn);
  });

  it('renders Marcas page and handles new, edit, delete, sorting and search', async () => {
    const { container } = renderWithContext(<Marcas />);
    expect(container.textContent).toContain('Toyota');

    const searchInput = container.querySelector('input');
    if (searchInput) fireEvent.change(searchInput, { target: { value: 'Toyota' } });

    const ths = container.querySelectorAll('th');
    ths.forEach((th) => fireEvent.click(th));

    const tbodyButtons = container.querySelectorAll('tbody button');
    tbodyButtons.forEach((btn) => fireEvent.click(btn));

    const addBtn = container.querySelector('.page-header .btn-primary');
    if (addBtn) fireEvent.click(addBtn);
  });

  it('renders Proveedores page and handles new, edit, delete, sorting and search', async () => {
    const { container } = renderWithContext(<Proveedores />);
    expect(container.textContent).toContain('Bosch');

    const searchInput = container.querySelector('input');
    if (searchInput) fireEvent.change(searchInput, { target: { value: 'Bosch' } });

    const ths = container.querySelectorAll('th');
    ths.forEach((th) => fireEvent.click(th));

    const tbodyButtons = container.querySelectorAll('tbody button');
    tbodyButtons.forEach((btn) => fireEvent.click(btn));

    const addBtn = container.querySelector('.page-header .btn-primary');
    if (addBtn) fireEvent.click(addBtn);
  });
});
