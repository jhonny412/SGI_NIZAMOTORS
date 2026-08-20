import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { UIProvider } from '../UIContext';
import { useUI } from '../useUI';

function TestUIConsumer() {
  const { paginaActiva, setPaginaActiva, sidebarAbierto, setSidebarAbierto, tema, toggleTema } = useUI();
  return (
    <div>
      <span data-testid="page">{paginaActiva}</span>
      <span data-testid="sidebar">{sidebarAbierto ? 'open' : 'closed'}</span>
      <span data-testid="theme">{tema}</span>
      <button data-testid="btn-page" onClick={() => setPaginaActiva('ventas')}>Change Page</button>
      <button data-testid="btn-sidebar" onClick={() => setSidebarAbierto(false)}>Toggle Sidebar</button>
      <button data-testid="btn-theme" onClick={toggleTema}>Toggle Theme</button>
    </div>
  );
}

describe('UIContext and useUI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('throws when useUI is outside provider', () => {
    const Component = () => {
      useUI();
      return null;
    };
    expect(() => render(<Component />)).toThrow('useUI must be used within a UIProvider');
  });

  it('handles state updates for active page, sidebar, and theme', () => {
    render(
      <UIProvider>
        <TestUIConsumer />
      </UIProvider>
    );

    expect(screen.getByTestId('page').textContent).toBe('dashboard');
    expect(screen.getByTestId('sidebar').textContent).toBe('open');

    act(() => {
      screen.getByTestId('btn-page').click();
    });
    expect(screen.getByTestId('page').textContent).toBe('ventas');

    act(() => {
      screen.getByTestId('btn-sidebar').click();
    });
    expect(screen.getByTestId('sidebar').textContent).toBe('closed');

    act(() => {
      screen.getByTestId('btn-theme').click();
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
});
