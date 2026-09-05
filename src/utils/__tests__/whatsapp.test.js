import { describe, it, expect, vi } from 'vitest';
import { normalizarNumeroWhatsApp, validarNumeroWhatsApp, abrirWhatsApp } from '../whatsapp';

describe('whatsapp utility', () => {
  describe('normalizarNumeroWhatsApp', () => {
    it('normalizes formatted phone numbers by removing non-digits and leading zeros', () => {
      expect(normalizarNumeroWhatsApp('+51 999 888 777')).toBe('51999888777');
      expect(normalizarNumeroWhatsApp('0051999888777')).toBe('51999888777');
      expect(normalizarNumeroWhatsApp('0999888777')).toBe('999888777');
      expect(normalizarNumeroWhatsApp('999-888-777')).toBe('999888777');
    });

    it('handles null, undefined and empty values safely', () => {
      expect(normalizarNumeroWhatsApp(null)).toBe('');
      expect(normalizarNumeroWhatsApp(undefined)).toBe('');
      expect(normalizarNumeroWhatsApp('')).toBe('');
    });
  });

  describe('validarNumeroWhatsApp', () => {
    it('validates and accepts 51 + 9 digits', () => {
      expect(validarNumeroWhatsApp('51987654321')).toBe('51987654321');
      expect(validarNumeroWhatsApp('+51 987 654 321')).toBe('51987654321');
    });

    it('prepends 51 for 9-digit Peruvian cellphone numbers', () => {
      expect(validarNumeroWhatsApp('987654321')).toBe('51987654321');
      expect(validarNumeroWhatsApp('0987654321')).toBe('51987654321');
    });

    it('returns null for invalid numbers', () => {
      expect(validarNumeroWhatsApp('12345')).toBeNull();
      expect(validarNumeroWhatsApp('abcdef')).toBeNull();
      expect(validarNumeroWhatsApp(null)).toBeNull();
      expect(validarNumeroWhatsApp('123456789012345')).toBeNull();
    });
  });

  describe('abrirWhatsApp', () => {
    it('opens window with encoded message URL', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
      abrirWhatsApp('51999888777', 'Hola, aquí está su boleta');

      expect(openSpy).toHaveBeenCalledWith(
        'https://wa.me/51999888777?text=Hola%2C%20aqu%C3%AD%20est%C3%A1%20su%20boleta',
        '_blank',
        'noopener,noreferrer'
      );
      openSpy.mockRestore();
    });
  });
});
