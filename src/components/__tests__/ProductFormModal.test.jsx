import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import ProductFormModal from '../ProductFormModal';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('ProductFormModal', () => {
  const mockInventoryContext = {
    marcas: [{ id: 1, nombre: 'TOYOTA' }],
    categorias: [{ id: 1, nombre: 'FRENOS' }],
    proveedores: [{ id: 1, nombre: 'BOSCH' }],
    productos: [{ id: 1, codigo: 'P01', descripcion: 'Filtro', stock: 10, pCompra: 50, margGanancia: 20 }],
    agregarProducto: vi.fn(),
    editarProducto: vi.fn(),
  };

  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Admin', rol: 'Admin' },
  };

  const renderModal = (props) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <InventoryContext.Provider value={mockInventoryContext}>
          <ProductFormModal {...props} />
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open and handles form submission for new product with image operations', () => {
    const onCerrar = vi.fn();
    const { container } = renderModal({ abierto: true, onCerrar });

    const codigoInput = container.querySelector('input[name="codigo"]');
    const descInput = container.querySelector('input[name="descripcion"]');
    const pCompraInput = container.querySelector('input[name="pCompra"]');
    const margInput = container.querySelector('input[name="margGanancia"]');
    const oemInput = container.querySelector('input[name="oem"]');
    const proveedorSelect = container.querySelector('select[name="proveedorId"]');
    const marcaSelect = container.querySelector('select[name="marca"]');
    const catSelect = container.querySelector('select[name="categoria"]');

    fireEvent.change(codigoInput, { target: { name: 'codigo', value: 'NEW-01' } });
    fireEvent.change(descInput, { target: { name: 'descripcion', value: 'Batería 12V' } });
    fireEvent.change(pCompraInput, { target: { name: 'pCompra', value: '100' } });
    if (margInput) fireEvent.change(margInput, { target: { name: 'margGanancia', value: '25' } });
    if (oemInput) fireEvent.change(oemInput, { target: { name: 'oem', value: 'OEM-999' } });
    if (proveedorSelect) fireEvent.change(proveedorSelect, { target: { name: 'proveedorId', value: '1' } });
    if (marcaSelect) fireEvent.change(marcaSelect, { target: { name: 'marca', value: 'TOYOTA' } });
    if (catSelect) fireEvent.change(catSelect, { target: { name: 'categoria', value: 'FRENOS' } });

    // Test ImagePicker drag/drop and paste
    const imageDropZones = container.querySelectorAll('.border-dashed');
    imageDropZones.forEach((zone) => {
      fireEvent.dragOver(zone);
      fireEvent.dragLeave(zone);
      fireEvent.paste(zone, {
        clipboardData: {
          getData: (type) => (type === 'text' ? 'https://example.com/direct-url.jpg' : ''),
          items: [],
        },
      });
      fireEvent.paste(zone, {
        clipboardData: {
          getData: (type) => (type === 'text/html' ? '<img src="https://example.com/html-image.jpg" />' : ''),
          items: [],
        },
      });
    });

    // Test file input change
    const fileInputs = container.querySelectorAll('input[type="file"]');
    fileInputs.forEach((fileInput) => {
      const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    fireEvent.submit(container.querySelector('form'));

    expect(mockInventoryContext.agregarProducto).toHaveBeenCalled();
    expect(onCerrar).toHaveBeenCalled();
  });

  it('loads existing product data in edit mode, clears image and submits edit', () => {
    const onCerrar = vi.fn();
    const existing = {
      id: 1,
      codigo: 'P01',
      descripcion: 'Filtro',
      stock: 10,
      pCompra: 50,
      margGanancia: 20,
      marcaId: 1,
      categoriaId: 1,
      proveedorId: 1,
      imagenUrl: 'https://example.com/img1.jpg',
      imagenUrl2: 'https://example.com/img2.jpg',
    };

    const { container } = renderModal({ abierto: true, producto: existing, onCerrar });

    // Click clear image button
    const clearImgBtns = container.querySelectorAll('button[title*="Eliminar imagen"]');
    clearImgBtns.forEach((btn) => fireEvent.click(btn));

    fireEvent.submit(container.querySelector('form'));

    expect(mockInventoryContext.editarProducto).toHaveBeenCalled();
    expect(onCerrar).toHaveBeenCalled();
  });

  it('handles discard changes when clicking close button', async () => {
    const onCerrar = vi.fn();
    const { container } = renderModal({ abierto: true, onCerrar });

    const descInput = container.querySelector('input[name="descripcion"]');
    fireEvent.change(descInput, { target: { name: 'descripcion', value: 'Draft modification' } });

    const closeBtn = container.querySelector('button[type="button"]');
    if (closeBtn) {
      await act(async () => {
        fireEvent.click(closeBtn);
      });
      expect(onCerrar).toHaveBeenCalled();
    }
  });
});
