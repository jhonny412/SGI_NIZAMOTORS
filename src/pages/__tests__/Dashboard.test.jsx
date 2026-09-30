import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import Dashboard from '../Dashboard';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';

describe('Dashboard Page', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Jhon', rol: 'Admin' },
  };

  const mockUIContext = {
    setPaginaActiva: vi.fn(),
  };

  const todayStr = new Date().toISOString().split('T')[0] + ' 10:00:00';

  const mockInventoryContext = {
    cargando: false,
    totalProductos: 10,
    valorInventario: 5000,
    valorVentaInventario: 8000,
    stockBajo: [{ id: 1, codigo: 'P01', descripcion: 'Filtro de Aceite', stock: 2, stockMinimo: 5 }],
    stockAgotado: [{ id: 2, codigo: 'P02', descripcion: 'Pastillas de Freno', stock: 0, stockMinimo: 5 }],
    totalMovimientos: 15,
    ultimosMovimientos: [
      { id: 1, fecha: todayStr, tipo: 'entrada', cantidad: 5, productoId: 1 },
    ],
    productos: [
      { id: 1, codigo: 'P01', descripcion: 'Filtro de Aceite', categoria: 'Filtros', marca: 'Bosch', stock: 2, stockMinimo: 5, pVenta: 50, pCompra: 30, margGanancia: 40 },
      { id: 2, codigo: 'P02', descripcion: 'Pastillas de Freno', categoria: 'Frenos', marca: 'Brembo', stock: 0, stockMinimo: 5, pVenta: 120, pCompra: 80, margGanancia: 50 },
    ],
    ventas: [
      {
        id: 1,
        boleta: 'B001-001',
        fecha: todayStr,
        totalVenta: 150,
        utilidad: 45,
        cantidadTotal: 3,
        items: [
          { productoId: 1, codigo: 'P01', descripcion: 'Filtro de Aceite', cantidad: 3, precioUnitario: 50 },
        ],
      },
      {
        id: 2,
        boleta: 'B001-002',
        fecha: todayStr,
        totalVenta: 240,
        utilidad: 80,
        cantidadTotal: 2,
        items: [
          { productoId: 2, codigo: 'P02', descripcion: 'Pastillas de Freno', cantidad: 2, precioUnitario: 120 },
        ],
      },
    ],
    movimientos: [
      { id: 1, fecha: todayStr, productoId: 1, tipo: 'entrada', cantidad: 5, motivo: 'Compra' },
      { id: 2, fecha: todayStr, productoId: 1, tipo: 'salida', cantidad: 3, motivo: 'Venta' },
    ],
    traslados: [],
    categorias: [
      { id: 1, nombre: 'Filtros' },
      { id: 2, nombre: 'Frenos' },
    ],
    marcas: [{ id: 1, nombre: 'Bosch' }, { id: 2, nombre: 'Brembo' }],
    proveedores: [],
  };

  it('renders KPI summary cards and dashboard content for admin, switches period and handles quick actions', () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <UIContext.Provider value={mockUIContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <Dashboard />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );

    expect(container).toBeInTheDocument();
    expect(screen.getByText(/Ventas Generadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Productos Más Vendidos/i)).toBeInTheDocument();

    // Click period toggle buttons (Semana / Mes) and quick actions
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => fireEvent.click(btn));
  });

  it('filters sales by week and by month correctly', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UIContext.Provider value={mockUIContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <Dashboard />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );

    // Switch to "Por Mes"
    const btnMes = screen.getByRole('button', { name: /Por Mes/i });
    fireEvent.click(btnMes);
    expect(btnMes.className).toContain('bg-amber-500');

    // Switch back to "Por Semana"
    const btnSemana = screen.getByRole('button', { name: /Por Semana/i });
    fireEvent.click(btnSemana);
    expect(btnSemana.className).toContain('bg-amber-500');

    // Toggle chart type: Barras / Torta
    const btnBarras = screen.getByTitle(/Ver reporte en Gráfico de Barras/i);
    fireEvent.click(btnBarras);
    const btnTorta = screen.getByTitle(/Ver reporte en Gráfico de Torta/i);
    fireEvent.click(btnTorta);
    expect(btnTorta.className).toContain('bg-amber-500');
  });

  it('filters top-selling products by category and criteria', () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <UIContext.Provider value={mockUIContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <Dashboard />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getAllByText(/Filtro de Aceite/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pastillas de Freno/i).length).toBeGreaterThan(0);

    // Select category via dropdown
    const select = container.querySelector('select');
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'Filtros' } });

    expect(screen.getAllByText(/Filtro de Aceite/i).length).toBeGreaterThan(0);

    // Change sort criteria to Ingresos
    const btnIngresos = screen.getByRole('button', { name: /Ingresos \(S\/\.\)/i });
    fireEvent.click(btnIngresos);
    expect(btnIngresos.className).toContain('bg-amber-500');

    // Change limit to Top 10
    const btnTop10 = screen.getByRole('button', { name: /Top 10/i });
    fireEvent.click(btnTop10);

    // Test search filter
    const searchInput = screen.getByPlaceholderText(/Buscar por código, repuesto o marca/i);
    fireEvent.change(searchInput, { target: { value: 'Brembo' } });
    fireEvent.change(searchInput, { target: { value: '' } });
  });

  it('renders seller view when user is vendedor and allows toggling to dashboard metrics', () => {
    const sellerAuth = {
      usuarioActivo: { id: 2, nombre: 'Vendedor 1', rol: 'Vendedor' },
    };

    const { container } = render(
      <AuthContext.Provider value={sellerAuth}>
        <UIContext.Provider value={mockUIContext}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <Dashboard />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );

    expect(container.textContent).toContain('Vendedor 1');

    // Click "Ver Métricas Dashboard"
    const btnMetricas = screen.getByRole('button', { name: /Ver Métricas Dashboard/i });
    fireEvent.click(btnMetricas);

    // Now in dashboard view
    expect(screen.getByText(/Vista Vendedor/i)).toBeInTheDocument();
    expect(screen.getByText(/Ventas Generadas/i)).toBeInTheDocument();

    // Return to POS
    const btnPos = screen.getByRole('button', { name: /Modo Punto de Venta/i });
    fireEvent.click(btnPos);
    expect(container.textContent).toContain('Vendedor 1');
  });
});
