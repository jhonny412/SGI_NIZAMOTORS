import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Login from '../Login';
import { AuthContext } from '../../context/AuthContext';
import { InventoryContext } from '../../context/InventoryContext';

describe('Login Page', () => {
  const mockAuthContext = {
    usuarios: [
      { id: 1, nombre: 'Jhon', rol: 'Admin', avatar: 'admin' },
      { id: 2, nombre: 'SuperAdmin', rol: 'SuperAdmin', avatar: 'superadmin' },
      { id: 3, nombre: 'Vendedor 1', rol: 'Vendedor', avatar: 'vendedor' },
    ],
    login: vi.fn().mockResolvedValue(true),
  };

  const mockInventoryContext = {
    cargando: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user selection and enters PIN using on-screen numeric keypad and keyboard events', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <InventoryContext.Provider value={mockInventoryContext}>
          <Login />
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Jhon')).toBeInTheDocument();
    expect(screen.getByText('SuperAdmin')).toBeInTheDocument();
    expect(screen.getByText('Vendedor 1')).toBeInTheDocument();

    // Select user
    fireEvent.click(screen.getByText('Jhon'));

    // Keypad clicks
    const num1 = screen.getByRole('button', { name: '1' });
    const num2 = screen.getByRole('button', { name: '2' });
    const num3 = screen.getByRole('button', { name: '3' });
    const num4 = screen.getByRole('button', { name: '4' });

    fireEvent.click(num1);
    fireEvent.click(num2);
    fireEvent.click(num3);
    fireEvent.click(num4);

    expect(mockAuthContext.login).toHaveBeenCalledWith(1, '1234');

    // Test physical keyboard inputs
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  it('handles PIN backspace and clear', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <InventoryContext.Provider value={mockInventoryContext}>
          <Login />
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByText('Vendedor 1'));

    const num1 = screen.getByRole('button', { name: '1' });
    fireEvent.click(num1);

    const backspaceBtn = screen.getByRole('button', { name: 'backspace' });
    fireEvent.click(backspaceBtn);

    const cancelUserBtn = screen.getByRole('button', { name: /volver a perfiles/i });
    fireEvent.click(cancelUserBtn);

    expect(screen.getByText(/perfil de acceso/i)).toBeInTheDocument();
  });

  it('renders loading state when users is empty', () => {
    const { container } = render(
      <AuthContext.Provider value={{ usuarios: [], login: vi.fn() }}>
        <InventoryContext.Provider value={{ cargando: true }}>
          <Login />
        </InventoryContext.Provider>
      </AuthContext.Provider>
    );

    expect(container.textContent).toContain('Obteniendo perfiles');
  });
});
