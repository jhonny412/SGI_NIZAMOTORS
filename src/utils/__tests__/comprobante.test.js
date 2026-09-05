import { describe, it, expect } from 'vitest';
import { numeroALetras, parseClienteInfo } from '../comprobante';

describe('comprobante utility', () => {
  describe('numeroALetras', () => {
    it('handles falsy / invalid values safely', () => {
      expect(numeroALetras(null)).toBe('');
      expect(numeroALetras(undefined)).toBe('');
      expect(numeroALetras(NaN)).toBe('');
    });

    it('converts zero and simple decimals', () => {
      expect(numeroALetras(0)).toBe('SON: CERO Y 00/100 SOLES.');
      expect(numeroALetras(0.5)).toBe('SON: CERO Y 50/100 SOLES.');
    });

    it('converts units and teens', () => {
      expect(numeroALetras(1)).toBe('SON: UN Y 00/100 SOLES.');
      expect(numeroALetras(5)).toBe('SON: CINCO Y 00/100 SOLES.');
      expect(numeroALetras(10)).toBe('SON: DIEZ Y 00/100 SOLES.');
      expect(numeroALetras(11)).toBe('SON: ONCE Y 00/100 SOLES.');
      expect(numeroALetras(12)).toBe('SON: DOCE Y 00/100 SOLES.');
      expect(numeroALetras(13)).toBe('SON: TRECE Y 00/100 SOLES.');
      expect(numeroALetras(14)).toBe('SON: CATORCE Y 00/100 SOLES.');
      expect(numeroALetras(15)).toBe('SON: QUINCE Y 00/100 SOLES.');
      expect(numeroALetras(16)).toBe('SON: DIECISEIS Y 00/100 SOLES.');
    });

    it('converts twenties and composite tens', () => {
      expect(numeroALetras(20)).toBe('SON: VEINTE Y 00/100 SOLES.');
      expect(numeroALetras(25)).toBe('SON: VEINTICINCO Y 00/100 SOLES.');
      expect(numeroALetras(30)).toBe('SON: TREINTA Y 00/100 SOLES.');
      expect(numeroALetras(37)).toBe('SON: TREINTA Y SIETE Y 00/100 SOLES.');
      expect(numeroALetras(42)).toBe('SON: CUARENTA Y DOS Y 00/100 SOLES.');
      expect(numeroALetras(58)).toBe('SON: CINCUENTA Y OCHO Y 00/100 SOLES.');
      expect(numeroALetras(64)).toBe('SON: SESENTA Y CUATRO Y 00/100 SOLES.');
      expect(numeroALetras(79)).toBe('SON: SETENTA Y NUEVE Y 00/100 SOLES.');
      expect(numeroALetras(83)).toBe('SON: OCHENTA Y TRES Y 00/100 SOLES.');
      expect(numeroALetras(91)).toBe('SON: NOVENTA Y UN Y 00/100 SOLES.');
    });

    it('converts hundreds correctly', () => {
      expect(numeroALetras(100)).toBe('SON: CIEN Y 00/100 SOLES.');
      expect(numeroALetras(105)).toBe('SON: CIENTO CINCO Y 00/100 SOLES.');
      expect(numeroALetras(200)).toBe('SON: DOSCIENTOS Y 00/100 SOLES.');
      expect(numeroALetras(345)).toBe('SON: TRESCIENTOS CUARENTA Y CINCO Y 00/100 SOLES.');
      expect(numeroALetras(400)).toBe('SON: CUATROCIENTOS Y 00/100 SOLES.');
      expect(numeroALetras(500)).toBe('SON: QUINIENTOS Y 00/100 SOLES.');
      expect(numeroALetras(600)).toBe('SON: SEISCIENTOS Y 00/100 SOLES.');
      expect(numeroALetras(700)).toBe('SON: SETECIENTOS Y 00/100 SOLES.');
      expect(numeroALetras(800)).toBe('SON: OCHOCIENTOS Y 00/100 SOLES.');
      expect(numeroALetras(900)).toBe('SON: NOVECIENTOS Y 00/100 SOLES.');
    });

    it('converts thousands and millions', () => {
      expect(numeroALetras(1000)).toBe('SON: UN MIL Y 00/100 SOLES.');
      expect(numeroALetras(2500)).toBe('SON: DOS MIL QUINIENTOS Y 00/100 SOLES.');
      expect(numeroALetras(1000000)).toBe('SON: UN MILLON Y 00/100 SOLES.');
      expect(numeroALetras(2500000)).toBe('SON: DOS MILLONES QUINIENTOS MIL Y 00/100 SOLES.');
    });
  });

  describe('parseClienteInfo', () => {
    it('handles empty or null values', () => {
      expect(parseClienteInfo('')).toEqual({
        nombre: 'CLIENTE VARIOS',
        docTipo: 'OTROS',
        docNro: '-',
      });
      expect(parseClienteInfo(null)).toEqual({
        nombre: 'CLIENTE VARIOS',
        docTipo: 'OTROS',
        docNro: '-',
      });
    });

    it('parses structured format (DNI, RUC, OTROS)', () => {
      expect(parseClienteInfo('Juan Perez (DNI: 71234567)')).toEqual({
        nombre: 'Juan Perez',
        docTipo: 'DNI',
        docNro: '71234567',
      });
      expect(parseClienteInfo('Empresa SAC (RUC: 20603671717)')).toEqual({
        nombre: 'Empresa SAC',
        docTipo: 'RUC',
        docNro: '20603671717',
      });
      expect(parseClienteInfo('Turista (OTROS: 998877)')).toEqual({
        nombre: 'Turista',
        docTipo: 'OTROS',
        docNro: '998877',
      });
    });

    it('parses legacy format without explicit doc type label', () => {
      expect(parseClienteInfo('Carlos Lopez (45678901)')).toEqual({
        nombre: 'Carlos Lopez',
        docTipo: 'DNI',
        docNro: '45678901',
      });
      expect(parseClienteInfo('Distribuidora SRL (20123456789)')).toEqual({
        nombre: 'Distribuidora SRL',
        docTipo: 'RUC',
        docNro: '20123456789',
      });
    });

    it('handles plain string without parens', () => {
      expect(parseClienteInfo('Cliente Sin Documento')).toEqual({
        nombre: 'Cliente Sin Documento',
        docTipo: 'OTROS',
        docNro: '-',
      });
    });
  });
});
