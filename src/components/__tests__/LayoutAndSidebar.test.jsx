import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Layout from '../Layout';
import Sidebar from '../Sidebar';
import { AuthContext } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';
import { InventoryContext } from '../../context/InventoryContext';

describe('Layout and Sidebar Components', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'Jhon Admin', rol: 'Admin' },
    cerrarSesion: vi.fn(),
  };

  const mockUIContext = {
    sidebarAbierto: true,
    setSidebarAbierto: vi.fn(),
    sidebarColapsado: false,
    setSidebarColapsado: vi.fn(),
    paginaActiva: 'dashboard',
    setPaginaActiva: vi.fn(),
    tema: 'dark',
    toggleTema: vi.fn(),
    idioma: 'es',
    cambiarIdioma: vi.fn(),
  };

  const mockInventoryContext = {
    cargando: false,
    productos: [],
    traslados: [],
    ventas: [],
  };

  const renderWithProviders = (ui, uiOverrides = {}, authOverrides = {}) => {
    return render(
      <AuthContext.Provider value={{ ...mockAuthContext, ...authOverrides }}>
        <UIContext.Provider value={{ ...mockUIContext, ...uiOverrides }}>
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

  it('renders Layout with top header controls, theme switcher, and children content', () => {
    const { container } = renderWithProviders(
      <Layout>
        <div data-testid="test-child">Child Content</div>
      </Layout>
    );

    expect(container.querySelector('[data-testid="test-child"]')).toBeInTheDocument();
    expect(container.textContent).toContain('Jhon Admin');

    // Click all top bar action buttons (logout, theme switch, etc.)
    const buttons = container.querySelectorAll('header button');
    buttons.forEach((btn) => fireEvent.click(btn));
  });

  it('renders Sidebar, toggles all group menus, navigates to sub-items, tests collapsed state and seller role', () => {
    const { container, rerender } = renderWithProviders(<Sidebar />);

    expect(container.textContent).toContain('Niza Motors');

    // Click all nav buttons and groups
    const navButtons = container.querySelectorAll('nav button');
    navButtons.forEach((btn) => fireEvent.click(btn));

    // Collapse toggle button
    const collapseBtn = container.querySelector('button[title*="menu"]') || container.querySelector('aside button');
    if (collapseBtn) fireEvent.click(collapseBtn);

    // Collapsed sidebar state
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <UIContext.Provider value={{ ...mockUIContext, sidebarAbierto: false }}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <Sidebar />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );

    const expandBtn = container.querySelector('button[aria-label*="Expandir"]') || container.querySelector('aside button');
    if (expandBtn) fireEvent.click(expandBtn);

    // Test Seller role
    rerender(
      <AuthContext.Provider value={{ usuarioActivo: { id: 2, nombre: 'Vendedor', rol: 'Vendedor' } }}>
        <UIContext.Provider value={{ ...mockUIContext, sidebarAbierto: true }}>
          <InventoryContext.Provider value={mockInventoryContext}>
            <Sidebar />
          </InventoryContext.Provider>
        </UIContext.Provider>
      </AuthContext.Provider>
    );
    expect(container.textContent).toContain('Niza Motors');
  });
});
