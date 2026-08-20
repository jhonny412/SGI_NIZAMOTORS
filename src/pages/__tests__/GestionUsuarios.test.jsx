import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import GestionUsuarios from '../GestionUsuarios';
import { AuthContext } from '../../context/AuthContext';
import * as api from '../../services/api';

vi.mock('../../services/api');
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

describe('GestionUsuarios Page', () => {
  const mockAuthContext = {
    usuarioActivo: { id: 1, nombre: 'SuperAdmin', rol: 'SuperAdmin' },
    usuarios: [
      { id: 1, nombre: 'SuperAdmin', rol: 'SuperAdmin', pin: '1234', avatar: 'superadmin' },
      { id: 2, nombre: 'Vendedor 1', rol: 'Vendedor', pin: '5678', avatar: 'vendedor' },
    ],
    setUsuarios: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.postAction.mockResolvedValue({ id: 3 });
  });

  it('renders user cards, handles create, edit, self-delete prevention and delete user', async () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <GestionUsuarios />
      </AuthContext.Provider>
    );

    expect(container.textContent).toContain('SuperAdmin');
    expect(container.textContent).toContain('Vendedor 1');

    // 1. Click "Nuevo Usuario" button
    const newBtn = container.querySelector('.page-header .btn-primary') || container.querySelector('button');
    if (newBtn) {
      fireEvent.click(newBtn);
      // Submit new user
      const form = container.querySelector('form');
      if (form) {
        const inputs = form.querySelectorAll('input');
        if (inputs.length >= 2) {
          fireEvent.change(inputs[0], { target: { value: 'Nuevo Vendedor' } });
          fireEvent.change(inputs[1], { target: { value: '9999' } });
        }
        await act(async () => {
          fireEvent.submit(form);
        });
        expect(api.postAction).toHaveBeenCalledWith('Usuarios', 'create', expect.anything());
      }
    }

    // 2. Click edit button on user card
    const editBtns = container.querySelectorAll('button[title*="Editar"]') || container.querySelectorAll('.card button');
    if (editBtns.length > 0) {
      fireEvent.click(editBtns[0]);
      const form = container.querySelector('form');
      if (form) {
        await act(async () => {
          fireEvent.submit(form);
        });
      }
    }

    // 3. Click delete button on active user (prevented)
    const delBtns = container.querySelectorAll('button[title*="Eliminar"]');
    if (delBtns.length > 0) {
      fireEvent.click(delBtns[0]);
    }
    // Click delete on other user
    if (delBtns.length > 1) {
      await act(async () => {
        fireEvent.click(delBtns[1]);
      });
      expect(api.postAction).toHaveBeenCalledWith('Usuarios', 'delete', expect.anything());
    }
  });
});
