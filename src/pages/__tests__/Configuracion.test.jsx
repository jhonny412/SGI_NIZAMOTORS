import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Configuracion, {
  DEFAULT_CONFIG,
  DIRECCION_FISCAL_REAL,
  EMPRESA_NOMBRE_REAL,
  EMPRESA_RUC_REAL,
} from '../Configuracion';
import { AuthContext } from '../../context/AuthContext';
import * as api from '../../services/api';

vi.mock('../../services/api');
vi.mock('../../utils/logger', () => ({
  writeLog: vi.fn().mockResolvedValue(true),
}));
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('Configuracion Page (Super Admin)', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 2, nombre: 'Super Administrador', rol: 'SuperAdmin' },
    usuarios: [],
    setUsuarios: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    api.fetchSheet.mockResolvedValue([{ id: 1, descripcion: 'Test Prod' }]);
  });

  it('renders correctly with tabs and allows switching between tabs', () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Configuracion />
      </AuthContext.Provider>
    );

    expect(container.textContent).toContain('Configuración del Sistema');
    expect(container.textContent).toContain('PERFIL SUPER ADMIN');

    // Click on "Inventario & Ventas" tab
    const inventarioTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Inventario & Ventas')
    );
    expect(inventarioTab).toBeDefined();
    fireEvent.click(inventarioTab);
    expect(container.textContent).toContain('Reglas de Inventario');

    // Click on "Seguridad & Sesiones" tab
    const seguridadTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Seguridad & Sesiones')
    );
    fireEvent.click(seguridadTab);
    expect(container.textContent).toContain('Políticas de Seguridad');

    // Click on "Conexión & Base de Datos" tab
    const apiTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Conexión & Base de Datos')
    );
    fireEvent.click(apiTab);
    expect(container.textContent).toContain('MySQL');

    // Click on "Mantenimiento & Sistema" tab
    const respaldoTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Mantenimiento & Sistema')
    );
    fireEvent.click(respaldoTab);
    expect(container.textContent).toContain('Copias de Seguridad');
  });

  it('allows changing inputs and saving settings to localStorage', async () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Configuracion />
      </AuthContext.Provider>
    );

    // Edit company name
    const companyInput = container.querySelector('input[placeholder*="NIZA MOTORS"]');
    expect(companyInput).toBeDefined();
    fireEvent.change(companyInput, { target: { value: 'NIZA MOTORS PERU SAC' } });

    // Click "Guardar Cambios"
    const saveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Guardar Cambios')
    );
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    const saved = JSON.parse(localStorage.getItem('sgi-app-config'));
    expect(saved.empresaNombre).toBe('NIZA MOTORS PERU SAC');
  });

  it('muestra los valores actuales configurados en todos los campos por defecto', () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Configuracion />
      </AuthContext.Provider>
    );

    // Los valores por defecto deben reflejar la configuración vigente del sistema.
    expect(DEFAULT_CONFIG).toEqual({
      empresaNombre: EMPRESA_NOMBRE_REAL,
      empresaRuc: EMPRESA_RUC_REAL,
      empresaDireccion: DIRECCION_FISCAL_REAL,
      empresaTelefono: '+51 987 654 321',
      empresaEmail: 'ventas@nizamotors.pe',
      monedaSimbolo: 'S/.',
      tasaIgv: 18,
      stockMinimoAlerta: 5,
      prefijoBoleta: 'B001',
      prefijoFactura: 'F001',
      permitirVentaSinStock: false,
      bloquearPrecioMenorCosto: true,
      autoMayusculas: true,
      pinMinimoDigitos: 4,
      tiempoSesionMinutos: 60,
      auditoriaDetallada: true,
      notificacionesSonoras: true,
    });

    // Pestaña Empresa & Facturación: todos los campos muestran esos valores.
    const valores = Array.from(container.querySelectorAll('input, select')).map(
      (campo) => campo.value
    );
    expect(valores).toEqual(
      expect.arrayContaining([
        EMPRESA_NOMBRE_REAL,
        EMPRESA_RUC_REAL,
        DIRECCION_FISCAL_REAL,
        '+51 987 654 321',
        'ventas@nizamotors.pe',
        'S/.',
        '18',
      ])
    );
  });

  it('muestra en cada pestaña los valores guardados por el usuario', () => {
    const personalizada = {
      empresaNombre: 'TALLER NIZA MOTORS',
      empresaRuc: '20123456789',
      empresaDireccion: 'AV. LOS OLIVOS 456',
      empresaTelefono: '+51 955 123 456',
      empresaEmail: 'taller@nizamotors.pe',
      monedaSimbolo: '$',
      tasaIgv: 10,
      stockMinimoAlerta: 8,
      prefijoBoleta: 'B777',
      prefijoFactura: 'F777',
      permitirVentaSinStock: true,
      bloquearPrecioMenorCosto: false,
      autoMayusculas: false,
      pinMinimoDigitos: 6,
      tiempoSesionMinutos: 15,
      auditoriaDetallada: false,
      notificacionesSonoras: false,
    };
    localStorage.setItem('sgi-app-config', JSON.stringify(personalizada));

    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Configuracion />
      </AuthContext.Provider>
    );

    const valores = () =>
      Array.from(container.querySelectorAll('input, select')).map((campo) => campo.value);
    const irAPestana = (etiqueta) => {
      const tab = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes(etiqueta)
      );
      fireEvent.click(tab);
    };

    expect(valores()).toEqual(
      expect.arrayContaining([
        'TALLER NIZA MOTORS',
        '20123456789',
        'AV. LOS OLIVOS 456',
        '+51 955 123 456',
        'taller@nizamotors.pe',
        '$',
        '10',
      ])
    );

    irAPestana('Inventario & Ventas');
    expect(valores()).toEqual(expect.arrayContaining(['8', 'B777', 'F777']));
    expect(
      Array.from(container.querySelectorAll('[role="switch"]')).map((s) => s.getAttribute('aria-checked'))
    ).toEqual(['true', 'false', 'false']);

    irAPestana('Seguridad & Sesiones');
    expect(valores()).toEqual(expect.arrayContaining(['6', '15']));
    expect(
      Array.from(container.querySelectorAll('[role="switch"]')).map((s) => s.getAttribute('aria-checked'))
    ).toEqual(['false', 'false']);
  });

  it('reemplaza los datos de relleno guardados por los datos fiscales reales', () => {
    localStorage.setItem(
      'sgi-app-config',
      JSON.stringify({
        empresaNombre: 'NIZA MOTORS S.A.C.',
        empresaRuc: '20609876543',
        empresaDireccion: 'Av. Principal 123 - Chiclayo, Perú',
        empresaTelefono: '+51 955 123 456',
      })
    );

    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Configuracion />
      </AuthContext.Provider>
    );

    const valores = Array.from(container.querySelectorAll('input, select')).map(
      (campo) => campo.value
    );
    expect(valores).toEqual(
      expect.arrayContaining([EMPRESA_NOMBRE_REAL, EMPRESA_RUC_REAL, DIRECCION_FISCAL_REAL])
    );

    const saved = JSON.parse(localStorage.getItem('sgi-app-config'));
    expect(saved.empresaNombre).toBe(EMPRESA_NOMBRE_REAL);
    expect(saved.empresaRuc).toBe(EMPRESA_RUC_REAL);
    expect(saved.empresaDireccion).toBe(DIRECCION_FISCAL_REAL);
    // Los datos personales del usuario se conservan.
    expect(saved.empresaTelefono).toBe('+51 955 123 456');
  });

  it('handles connection test and cache cleanup on API tab', async () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Configuracion />
      </AuthContext.Provider>
    );

    // Switch to API tab
    const apiTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Conexión & Base de Datos')
    );
    fireEvent.click(apiTab);

    // Click test connection
    const pingBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Probar Latencia')
    );
    await act(async () => {
      fireEvent.click(pingBtn);
    });
    expect(api.fetchSheet).toHaveBeenCalledWith('Productos');

    // Click clear cache
    const clearBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Limpiar Caché')
    );
    await act(async () => {
      fireEvent.click(clearBtn);
    });
  });

  it('handles backup export on maintenance tab', () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Configuracion />
      </AuthContext.Provider>
    );

    // Switch to maintenance tab
    const respaldoTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Mantenimiento & Sistema')
    );
    fireEvent.click(respaldoTab);

    // Mock URL.createObjectURL and click export JSON
    const createObjectUrlMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectUrlMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Exportar JSON')
    );
    fireEvent.click(exportBtn);
    expect(createObjectUrlMock).toHaveBeenCalled();
  });

  it('handles reset to defaults', async () => {
    localStorage.setItem('sgi-app-config', JSON.stringify({ empresaNombre: 'Custom Name' }));

    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Configuracion />
      </AuthContext.Provider>
    );

    const resetBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Restablecer')
    );
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    const restored = JSON.parse(localStorage.getItem('sgi-app-config'));
    expect(restored.empresaNombre).toBe(DEFAULT_CONFIG.empresaNombre);
  });
});
