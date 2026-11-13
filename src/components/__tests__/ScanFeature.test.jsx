import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import MovementFormModal from '../MovementFormModal';
import ScanButton from '../ScanButton';
import { InventoryContext } from '../../context/InventoryContext';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

const productos = [
  { id: 7, codigo: 'VT-A-254E', oem: '101211-5240', descripcion: 'Alternador Toyota', stock: 4, pVenta: 100 },
  { id: 8, codigo: 'VT-AG-102E', oem: 'AVEO 6PK', descripcion: 'Alternador Aveo', stock: 0, pVenta: 90 },
];

const contexto = {
  productos,
  registrarMovimiento: vi.fn(() => true),
};

function renderModal() {
  return render(
    <InventoryContext.Provider value={contexto}>
      <MovementFormModal abierto={true} onCerrar={vi.fn()} />
    </InventoryContext.Provider>
  );
}

function buscarInput(container) {
  return container.querySelector('input[placeholder="Seleccionar producto..."]');
}

describe('Búsqueda de productos por QR / código de barras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selecciona el producto cuando el lector envía el código y Enter', () => {
    const { container } = renderModal();
    const input = buscarInput(container);

    fireEvent.change(input, { target: { value: 'VT-A-254E' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveValue('Alternador Toyota');
  });

  it('resuelve códigos contenidos en un QR con formato de URL', () => {
    const { container } = renderModal();
    const input = buscarInput(container);

    fireEvent.change(input, { target: { value: 'https://sgi.niza.pe/producto?codigo=VT-A-254E' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveValue('Alternador Toyota');
  });

  it('no selecciona nada cuando el código no existe', () => {
    const { container } = renderModal();
    const input = buscarInput(container);

    fireEvent.change(input, { target: { value: 'CODIGO-INEXISTENTE' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveValue('CODIGO-INEXISTENTE');
  });

  it('bloquea el escaneo de un producto sin stock al registrar una salida', () => {
    const { container } = renderModal();
    const input = buscarInput(container);

    const salida = container.querySelector('input[type="radio"][value="salida"]');
    fireEvent.click(salida);

    fireEvent.change(input, { target: { value: 'VT-AG-102E' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveValue('VT-AG-102E');
  });

  it('expone el botón de escaneo con una etiqueta accesible', () => {
    render(<ScanButton onScan={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Escanear QR / código de barras' })
    ).toBeInTheDocument();
  });

  it('abre el escáner y muestra un aviso cuando la cámara no está disponible', async () => {
    render(<ScanButton onScan={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear QR / código de barras' }));

    expect(await screen.findByRole('dialog', { name: 'Escanear código' })).toBeInTheDocument();
    expect(
      await screen.findByText(/conexión segura|permisos del navegador|cámara disponible/i)
    ).toBeInTheDocument();
  });

  it('permite leer un código desde una imagen guardada', async () => {
    const { container } = render(<ScanButton onScan={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear QR / código de barras' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Escanear código' });
    expect(dialogo).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cargar imagen/i })).toBeInTheDocument();

    const archivo = container.ownerDocument.querySelector('input[type="file"]');
    expect(archivo).not.toBeNull();
    expect(archivo.getAttribute('accept')).toBe('image/*');
  });

  it('avisa cuando el archivo cargado no es una imagen', async () => {
    const { container } = render(<ScanButton onScan={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear QR / código de barras' }));
    await screen.findByRole('dialog', { name: 'Escanear código' });

    const archivo = container.ownerDocument.querySelector('input[type="file"]');
    const noImagen = new File(['contenido'], 'notas.txt', { type: 'text/plain' });
    fireEvent.change(archivo, { target: { files: [noImagen] } });

    expect(await screen.findByText(/no es una imagen/i)).toBeInTheDocument();
  });
});
