import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductQrModal from '../ProductQrModal';

const { guardarPdf } = vi.hoisted(() => ({ guardarPdf: vi.fn() }));

vi.mock('qrcode', () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('jsbarcode', () => ({
  default: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    addImage() {}
    save(nombre) {
      guardarPdf(nombre);
    }
  },
}));

const producto = {
  id: 2,
  codigo: 'VT-A-254E',
  descripcion: 'Alternador Toyota Corolla',
  marca: 'Toyota',
};

const contextoFalso = {
  fillStyle: '',
  font: '',
  textAlign: '',
  textBaseline: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: (texto) => ({ width: String(texto).length * 8 }),
};

describe('ProductQrModal (etiqueta con un solo tipo de código)', () => {
  let clickSpy;
  let descargas;

  beforeEach(() => {
    descargas = [];
    guardarPdf.mockClear();

    HTMLCanvasElement.prototype.getContext = vi.fn(() => contextoFalso);
    HTMLCanvasElement.prototype.toDataURL = vi.fn((tipo) =>
      tipo === 'image/jpeg' ? 'data:image/jpeg;base64,QUJD' : 'data:image/png;base64,QUJD'
    );

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      descargas.push({ href: this.href, download: this.download });
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('pregunta el tipo de código antes de mostrar la etiqueta', () => {
    const { container } = render(<ProductQrModal producto={producto} onCerrar={vi.fn()} />);

    expect(screen.getByText('¿Qué código debe llevar la etiqueta?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Código QR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Código de barras/i })).toBeInTheDocument();
    // Todavía no se genera ni muestra ninguna etiqueta
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: /Guardar JPG/i })).toBeNull();
  });

  it('muestra solo el QR y permite guardarlo en JPG', async () => {
    const { container } = render(<ProductQrModal producto={producto} onCerrar={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Código QR/i }));

    await waitFor(() => {
      expect(container.querySelector('img')).toBeInTheDocument();
    });
    expect(container.querySelector('img').getAttribute('alt')).toContain('QR');
    expect(screen.queryByText(/Código de barras/i)).toBeNull();

    const boton = screen.getByRole('button', { name: /Guardar JPG/i });
    await waitFor(() => expect(boton).toBeEnabled());
    fireEvent.click(boton);

    await waitFor(() => expect(descargas.length).toBe(1));
    expect(descargas[0].download).toBe('Etiqueta-QR-VT-A-254E.jpg');
  });

  it('muestra solo el código de barras y permite guardarlo en PDF', async () => {
    const { container } = render(<ProductQrModal producto={producto} onCerrar={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Código de barras/i }));

    await waitFor(() => {
      expect(container.querySelector('img')).toBeInTheDocument();
    });
    expect(container.querySelector('img').getAttribute('alt')).toContain('BARRAS');

    const boton = screen.getByRole('button', { name: /Guardar PDF/i });
    await waitFor(() => expect(boton).toBeEnabled());
    fireEvent.click(boton);

    await waitFor(() => expect(guardarPdf).toHaveBeenCalledWith('Etiqueta-BARRAS-VT-A-254E.pdf'));
  });

  it('permite cambiar el tipo de código elegido', async () => {
    render(<ProductQrModal producto={producto} onCerrar={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Código QR/i }));
    await screen.findByRole('button', { name: /Guardar JPG/i });

    fireEvent.click(screen.getByRole('button', { name: /Cambiar tipo/i }));

    expect(screen.getByText('¿Qué código debe llevar la etiqueta?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Guardar JPG/i })).toBeNull();
  });
});
