import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, formatUsuario, DEFAULT_USUARIOS } from '../AuthContext';
import { useAuth } from '../useAuth';

vi.mock('../../utils/logger', () => ({
  writeLog: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(),
  },
}));

function TestConsumer() {
  const { usuarioActivo, usuarios, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user-active">{usuarioActivo ? usuarioActivo.nombre : 'none'}</div>
      <div data-testid="users-count">{usuarios.length}</div>
      <button onClick={() => login(1, '1234')} data-testid="btn-login-ok">Login OK</button>
      <button onClick={() => login(1, 'wrong-pin')} data-testid="btn-login-bad-pin">Login Bad PIN</button>
      <button onClick={() => login(999, '1234')} data-testid="btn-login-bad-user">Login Bad User</button>
      <button onClick={logout} data-testid="btn-logout">Logout</button>
    </div>
  );
}

describe('AuthContext and useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    const Component = () => {
      useAuth();
      return null;
    };
    expect(() => render(<Component />)).toThrow('useAuth must be used within an AuthProvider');
  });

  it('formats usuario properly with fallback avatar', () => {
    const formattedAdmin = formatUsuario({ id: 1, nombre: 'Admin User', rol: 'Admin' });
    expect(formattedAdmin.avatar).toBe('admin');

    const formattedSuper = formatUsuario({ id: 2, nombre: 'Super User', rol: 'SuperAdmin' });
    expect(formattedSuper.avatar).toBe('superadmin');

    const formattedVendedor = formatUsuario({ id: 3, nombre: 'Sales', rol: 'Vendedor' });
    expect(formattedVendedor.avatar).toBe('vendedor');
  });

  it('logs in successfully with valid PIN and stores session token', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-active').textContent).toBe('none');

    await act(async () => {
      screen.getByTestId('btn-login-ok').click();
    });

    expect(screen.getByTestId('user-active').textContent).toBe('Jhon');
    expect(sessionStorage.getItem('sgi-auth-token')).toBeTruthy();

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    expect(screen.getByTestId('user-active').textContent).toBe('none');
    expect(sessionStorage.getItem('sgi-auth-token')).toBeNull();
  });

  it('fails login with invalid PIN or invalid user ID', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('btn-login-bad-pin').click();
    });
    expect(screen.getByTestId('user-active').textContent).toBe('none');

    await act(async () => {
      screen.getByTestId('btn-login-bad-user').click();
    });
    expect(screen.getByTestId('user-active').textContent).toBe('none');
  });
});
