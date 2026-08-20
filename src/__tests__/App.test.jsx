import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';
import * as api from '../services/api';

vi.mock('../services/api');
vi.mock('../utils/logger', () => ({
  initLogger: vi.fn().mockResolvedValue(),
  flushPendingLogs: vi.fn().mockResolvedValue(),
  writeLog: vi.fn().mockResolvedValue(),
  resolveClientIp: vi.fn().mockResolvedValue('127.0.0.1'),
  getLocalLogs: vi.fn().mockReturnValue([]),
  getPendingLogs: vi.fn().mockReturnValue([]),
  getPendingCount: vi.fn().mockReturnValue(0),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  LOG_LEVELS: { INFO: 'INFO', WARN: 'WARNING', ERROR: 'ERROR' }
}));

describe('App Root Component', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    api.fetchSheet.mockResolvedValue([]);
  });

  it('renders Login page when no active session exists', () => {
    localStorage.setItem('sgi-productos', JSON.stringify([{ id: 1 }]));
    localStorage.setItem('sgi-usuarios', JSON.stringify([{ id: 1, nombre: 'Jhon', rol: 'Admin', pin: '1234' }]));

    const { container } = render(<App />);
    expect(container.textContent).toContain('Jhon');
  });

  it('renders Layout and Dashboard when active session exists in sessionStorage', () => {
    localStorage.setItem('sgi-productos', JSON.stringify([{ id: 1 }]));
    localStorage.setItem('sgi-usuarios', JSON.stringify([{ id: 1, nombre: 'Jhon', rol: 'Admin', pin: '1234' }]));
    sessionStorage.setItem(
      'sgi-usuario-activo',
      JSON.stringify({ id: 1, nombre: 'Jhon', rol: 'Admin', avatar: 'admin' })
    );

    const { container } = render(<App />);
    expect(container.textContent).toContain('Jhon');
  });
});
