import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  writeLog,
  flushPendingLogs,
  resolveClientIp,
  getLocalLogs,
  getPendingLogs,
  getPendingCount,
  getClientIp,
  initLogger,
  LOG_LEVELS
} from '../logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('exports LOG_LEVELS constants', () => {
    expect(LOG_LEVELS.INFO).toBe('INFO');
    expect(LOG_LEVELS.WARN).toBe('WARNING');
    expect(LOG_LEVELS.ERROR).toBe('ERROR');
  });

  it('resolves client IP from api.ipify.org or cache', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ip: '192.168.1.100' }),
    });

    const ip = await resolveClientIp();
    expect(ip).toBe('192.168.1.100');
    expect(getClientIp()).toBe('192.168.1.100');
  });

  it('handles IP resolution failure gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const ip = await resolveClientIp();
    expect(typeof ip).toBe('string');
  });

  it('writes log to local storage and attempts sending to API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: 'success' })),
    });

    await writeLog({
      usuario: 'Admin',
      accion: 'Test Action',
      modulo: 'Test Module',
      detalles: { foo: 'bar' },
      estado: 'success'
    });

    const localLogs = getLocalLogs();
    expect(localLogs.length).toBeGreaterThan(0);
    expect(localLogs[0].usuario).toBe('Admin');
    expect(localLogs[0].accion).toBe('Test Action');
    expect(localLogs[0].detalles).toContain('foo');
  });

  it('queues log when remote write fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    await writeLog({
      usuario: 'TestUser',
      accion: 'Offline Action',
      modulo: 'Offline Module',
      detalles: 'some details',
      estado: 'error'
    });

    const pending = getPendingLogs();
    expect(pending.length).toBeGreaterThan(0);
    expect(getPendingCount()).toBeGreaterThan(0);
  });

  it('flushes pending logs when connection is restored', async () => {
    localStorage.setItem('sgi-pending-logs', JSON.stringify([
      { sheet: 'Logs', action: 'create', id: 123, accion: 'Pending 1' }
    ]));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: 'success' }))
    });

    await flushPendingLogs();
    expect(getPendingCount()).toBe(0);
  });

  it('handles partial failure during flushPendingLogs', async () => {
    localStorage.setItem('sgi-pending-logs', JSON.stringify([
      { sheet: 'Logs', action: 'create', id: 123, accion: 'Pending 1' }
    ]));

    global.fetch = vi.fn().mockRejectedValue(new Error('Still offline'));

    await flushPendingLogs();
    expect(getPendingCount()).toBe(1);
  });

  it('initializes logger properly with initLogger', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ip: '10.0.0.1' }),
      text: () => Promise.resolve(JSON.stringify({ status: 'success' }))
    });

    await expect(initLogger()).resolves.not.toThrow();
  });
});
