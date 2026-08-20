import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSheet, postAction } from '../api';

describe('API Service (fetchSheet & postAction)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchSheet', () => {
    it('returns data array on successful HTTP GET response', async () => {
      const mockData = [{ id: 1, nombre: 'Freno' }];
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockData })
      });

      const data = await fetchSheet('Productos');
      expect(data).toEqual(mockData);
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('sheet=Productos'), expect.any(Object));
    });

    it('throws error when HTTP status is not ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(fetchSheet('Productos')).rejects.toThrow('HTTP error fetching sheet Productos: 500');
    });

    it('throws error when API result status is error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'error', message: 'Tabla no encontrada' })
      });

      await expect(fetchSheet('InvalidTable')).rejects.toThrow('API error fetching sheet InvalidTable: Tabla no encontrada');
    });
  });

  describe('postAction', () => {
    it('sends POST request with formatted body and returns data', async () => {
      const payload = { codigo: 'P01', descripcion: 'Pastillas' };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 'success', data: { id: 10, ...payload } })
      });

      const result = await postAction('Productos', 'create', payload);
      expect(result).toEqual({ id: 10, ...payload });

      const callArgs = globalThis.fetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toEqual({
        ...payload,
        sheet: 'Productos',
        action: 'create'
      });
    });

    it('throws error if response is not ok and contains error message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Código duplicado' })
      });

      await expect(postAction('Productos', 'create', {})).rejects.toThrow('Código duplicado');
    });

    it('throws error if response is ok but status is error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 'error', message: 'Fallo de negocio' })
      });

      await expect(postAction('Productos', 'create', {})).rejects.toThrow('Fallo de negocio');
    });

    it('handles non-json response text on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => 'Bad Gateway'
      });

      await expect(postAction('Productos', 'create', {})).rejects.toThrow('HTTP 502 en Productos/create');
    });
  });
});
