import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScanButton from '../ScanButton';
import Swal from 'sweetalert2';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

// El modal real usa la cámara; aquí solo interesa el flujo de datos.
vi.mock('../BarcodeScannerModal', () => ({
  default: ({ onDetected, onCerrar }) => (
    <div>
      <button type="button" onClick={() => onDetected('VT-A-254E')}>
        simular-escaneo
      </button>
      <button type="button" onClick={() => onCerrar()}>
        cerrar-escaneo
      </button>
    </div>
  ),
}));

async function abrirEscaner() {
  fireEvent.click(screen.getByRole('button', { name: 'Escanear QR / código de barras' }));
  return screen.findByText('simular-escaneo');
}

describe('ScanButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('entrega el código leído al consumidor y cierra el escáner', async () => {
    const onScan = vi.fn(() => true);
    render(<ScanButton onScan={onScan} />);

    await abrirEscaner();
    fireEvent.click(screen.getByText('simular-escaneo'));

    expect(onScan).toHaveBeenCalledWith('VT-A-254E');
    expect(screen.queryByText('simular-escaneo')).not.toBeInTheDocument();
  });

  it('avisa cuando el código no corresponde a ningún producto', async () => {
    const onScan = vi.fn(() => false);
    render(<ScanButton onScan={onScan} />);

    await abrirEscaner();
    fireEvent.click(screen.getByText('simular-escaneo'));

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'warning',
        title: 'Código no encontrado',
        text: expect.stringContaining('VT-A-254E'),
      })
    );
  });

  it('permite cerrar el escáner sin escanear', async () => {
    const onScan = vi.fn();
    render(<ScanButton onScan={onScan} />);

    await abrirEscaner();
    fireEvent.click(screen.getByText('cerrar-escaneo'));

    expect(onScan).not.toHaveBeenCalled();
    expect(screen.queryByText('cerrar-escaneo')).not.toBeInTheDocument();
  });
});
