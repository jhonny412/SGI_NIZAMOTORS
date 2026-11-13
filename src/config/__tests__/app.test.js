import { describe, it, expect } from 'vitest';
import {
  APP_RELEASE_DATE,
  VERSION_NOTICE_DAYS,
  parseFechaLocal,
  debeMostrarAvisoVersion,
  formatearFechaAviso,
} from '../app';

describe('aviso de actualización de versión', () => {
  const release = '2026-11-13';

  it('usa la fecha y duración configuradas', () => {
    expect(APP_RELEASE_DATE).toBe('2026-11-13');
    expect(VERSION_NOTICE_DAYS).toBe(5);
  });

  it('se muestra el mismo día de la publicación', () => {
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 13, 0, 0), release)).toBe(true);
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 13, 23, 59), release)).toBe(true);
  });

  it('se mantiene hasta el quinto día inclusive', () => {
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 14, 12, 0), release)).toBe(true);
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 17, 23, 59), release)).toBe(true);
  });

  it('desaparece al comenzar el sexto día', () => {
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 18, 0, 0), release)).toBe(false);
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 25, 12, 0), release)).toBe(false);
  });

  it('no se muestra antes de la fecha de publicación', () => {
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 12, 23, 59), release)).toBe(false);
  });

  it('permite configurar otra duración', () => {
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 13, 12, 0), release, 1)).toBe(true);
    expect(debeMostrarAvisoVersion(new Date(2026, 10, 14, 0, 0), release, 1)).toBe(false);
  });

  it('formatea la fecha como DD/MM/AAAA', () => {
    expect(formatearFechaAviso('2026-11-13')).toBe('13/11/2026');
    expect(formatearFechaAviso('2026-01-05')).toBe('05/01/2026');
    expect(formatearFechaAviso('')).toBe('');
  });

  it('rechaza fechas inválidas', () => {
    expect(parseFechaLocal('2026-02-31')).toBeNull();
    expect(parseFechaLocal('13/11/2026')).toBeNull();
    expect(debeMostrarAvisoVersion(new Date(), 'fecha-invalida')).toBe(false);
  });
});
