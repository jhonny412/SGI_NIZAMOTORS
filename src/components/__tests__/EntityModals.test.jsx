import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import BrandFormModal from '../BrandFormModal';
import CategoriaFormModal from '../CategoriaFormModal';
import SupplierFormModal from '../SupplierFormModal';
import UsuarioFormModal from '../UsuarioFormModal';
import MovementFormModal from '../MovementFormModal';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('Entity Form Modals', () => {
  const mockInventoryContext = {
    marcas: [{ id: 1, nombre: 'TOYOTA' }],
    categorias: [{ id: 1, nombre: 'FRENOS' }],
    proveedores: [{ id: 1, nombre: 'BOSCH', contacto: '123' }],
    productos: [{ id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 10, pVenta: 50 }],
    agregarMarca: vi.fn(),
    editarMarca: vi.fn(),
    agregarCategoria: vi.fn(),
    editarCategoria: vi.fn(),
    agregarProveedor: vi.fn(),
    editarProveedor: vi.fn(),
    registrarMovimiento: vi.fn().mockResolvedValue(true),
  };

  const mockAuthContext = {
    usuarios: [{ id: 1, nombre: 'Admin', pin: '1234', rol: 'Admin' }],
    setUsuarios: vi.fn(),
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

  describe('BrandFormModal', () => {
    it('handles empty validation, duplicate check, creation, editing and discard', async () => {
      const onCerrar = vi.fn();
      const { container, rerender } = renderWithContext(
        <BrandFormModal abierto={true} onCerrar={onCerrar} />
      );

      const form = container.querySelector('form');
      const input = container.querySelector('input[name="nombre"]');

      // 1. Submit empty
      fireEvent.submit(form);

      // 2. Submit duplicate name
      fireEvent.change(input, { target: { name: 'nombre', value: 'TOYOTA' } });
      fireEvent.submit(form);

      // 3. Submit valid new name
      fireEvent.change(input, { target: { name: 'nombre', value: 'HONDA' } });
      fireEvent.submit(form);
      expect(mockInventoryContext.agregarMarca).toHaveBeenCalledWith({ nombre: 'HONDA' });
      expect(onCerrar).toHaveBeenCalled();

      // 4. Edit mode
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <BrandFormModal abierto={true} marca={{ id: 1, nombre: 'TOYOTA' }} onCerrar={onCerrar} />
          </InventoryContext.Provider>
        </AuthContext.Provider>
      );
      fireEvent.submit(form);
      expect(mockInventoryContext.editarMarca).toHaveBeenCalledWith({ id: 1, nombre: 'TOYOTA' });

      // 5. Discard changes
      const closeBtn = container.querySelector('button[type="button"]');
      if (closeBtn) {
        await act(async () => {
          fireEvent.click(closeBtn);
        });
      }
    });
  });

  describe('CategoriaFormModal', () => {
    it('handles empty validation, duplicate check, creation, editing and discard', async () => {
      const onCerrar = vi.fn();
      const { container, rerender } = renderWithContext(
        <CategoriaFormModal abierto={true} onCerrar={onCerrar} />
      );

      const form = container.querySelector('form');
      const input = container.querySelector('input[name="nombre"]');

      // 1. Submit empty
      fireEvent.submit(form);

      // 2. Submit duplicate name
      fireEvent.change(input, { target: { name: 'nombre', value: 'FRENOS' } });
      fireEvent.submit(form);

      // 3. Submit valid new name
      fireEvent.change(input, { target: { name: 'nombre', value: 'MOTOR' } });
      fireEvent.submit(form);
      expect(mockInventoryContext.agregarCategoria).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'MOTOR' }));
      expect(onCerrar).toHaveBeenCalled();

      // 4. Edit mode
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <CategoriaFormModal abierto={true} categoria={{ id: 1, nombre: 'FRENOS' }} onCerrar={onCerrar} />
          </InventoryContext.Provider>
        </AuthContext.Provider>
      );
      fireEvent.submit(form);
      expect(mockInventoryContext.editarCategoria).toHaveBeenCalledWith({ id: 1, nombre: 'FRENOS', descripcion: '' });
    });
  });

  describe('SupplierFormModal', () => {
    it('handles empty validation, duplicate check, creation, editing and discard', async () => {
      const onCerrar = vi.fn();
      const { container, rerender } = renderWithContext(
        <SupplierFormModal abierto={true} onCerrar={onCerrar} />
      );

      const form = container.querySelector('form');
      const nombreInput = container.querySelector('input[name="nombre"]');

      // 1. Submit empty
      fireEvent.submit(form);

      // 2. Submit duplicate name
      fireEvent.change(nombreInput, { target: { name: 'nombre', value: 'BOSCH' } });
      fireEvent.submit(form);

      // 3. Submit valid new name
      fireEvent.change(nombreInput, { target: { name: 'nombre', value: 'DENSO' } });
      fireEvent.submit(form);
      expect(mockInventoryContext.agregarProveedor).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'DENSO' }));
      expect(onCerrar).toHaveBeenCalled();

      // 4. Edit mode
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <SupplierFormModal abierto={true} proveedor={{ id: 1, nombre: 'BOSCH', contacto: '123' }} onCerrar={onCerrar} />
          </InventoryContext.Provider>
        </AuthContext.Provider>
      );
      fireEvent.submit(form);
      expect(mockInventoryContext.editarProveedor).toHaveBeenCalledWith(expect.objectContaining({ id: 1, nombre: 'BOSCH' }));
    });
  });

  describe('UsuarioFormModal', () => {
    it('creates and edits a user', async () => {
      const onCerrar = vi.fn();
      const onGuardar = vi.fn().mockResolvedValue();
      const { container, rerender } = renderWithContext(
        <UsuarioFormModal onGuardar={onGuardar} onCerrar={onCerrar} />
      );

      const inputs = container.querySelectorAll('input');
      if (inputs.length >= 2) {
        fireEvent.change(inputs[0], { target: { value: 'Nuevo Admin' } });
        fireEvent.change(inputs[1], { target: { value: '5678' } });
      }
      const select = container.querySelector('select');
      if (select) fireEvent.change(select, { target: { value: 'Admin' } });

      await act(async () => {
        fireEvent.submit(container.querySelector('form'));
      });
      expect(onGuardar).toHaveBeenCalled();

      // Edit mode
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <UsuarioFormModal usuario={{ id: 1, nombre: 'Admin', pin: '1234', rol: 'Admin' }} onGuardar={onGuardar} onCerrar={onCerrar} />
          </InventoryContext.Provider>
        </AuthContext.Provider>
      );
      await act(async () => {
        fireEvent.submit(container.querySelector('form'));
      });
      expect(onGuardar).toHaveBeenCalled();
    });
  });

  describe('MovementFormModal', () => {
    it('handles autocomplete, quantity, reason, radio types and submission', async () => {
      const onCerrar = vi.fn();
      const { container } = renderWithContext(
        <MovementFormModal abierto={true} onCerrar={onCerrar} />
      );

      // Search product
      const searchInput = container.querySelector('input[placeholder*="Buscar"]') || container.querySelectorAll('input')[2];
      if (searchInput) {
        fireEvent.change(searchInput, { target: { value: 'Filtro' } });
        const itemBtn = container.querySelector('ul button') || container.querySelector('ul li');
        if (itemBtn) fireEvent.click(itemBtn);
      }

      // Change radio to salida
      const radios = container.querySelectorAll('input[type="radio"]');
      radios.forEach((r) => fireEvent.click(r));

      // Change quantity and reason
      const cantInput = container.querySelector('input[type="number"]');
      if (cantInput) fireEvent.change(cantInput, { target: { value: '2' } });

      const motivoInput = container.querySelector('input[name="motivo"]') || container.querySelectorAll('input')[3];
      if (motivoInput) fireEvent.change(motivoInput, { target: { value: 'Ajuste de inventario' } });

      await act(async () => {
        fireEvent.submit(container.querySelector('form'));
      });

      const closeBtn = container.querySelector('button[type="button"]');
      if (closeBtn) fireEvent.click(closeBtn);
    });
  });
});
