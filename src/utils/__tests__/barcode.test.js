import { describe, it, expect } from 'vitest';
import {
  normalizeCode,
  looseCode,
  extractScanCandidates,
  findProductByScan,
  getScanSearchTerm,
} from '../barcode';

const productos = [
  { id: 1, codigo: 'VT-A-254E', oem: '101211-5240', descripcion: 'Alternador Toyota Corolla' },
  { id: 2, codigo: 'VT-AG-102E', oem: 'AVEO 6PK', descripcion: 'Alternador Chevrolet Aveo' },
  { id: 3, codigo: 'AL-166-XL', oem: '', descripcion: 'Alternador universal' },
];

describe('barcode utils', () => {
  describe('normalizeCode', () => {
    it('converts to uppercase, trims and removes accents', () => {
      expect(normalizeCode('  vt-a-254e ')).toBe('VT-A-254E');
      expect(normalizeCode('Código')).toBe('CODIGO');
    });

    it('handles null/undefined values', () => {
      expect(normalizeCode(null)).toBe('');
      expect(normalizeCode(undefined)).toBe('');
    });
  });

  describe('looseCode', () => {
    it('removes separators and symbols', () => {
      expect(looseCode('VT-A-254E')).toBe('VTA254E');
      expect(looseCode('101211 5240')).toBe('1012115240');
    });
  });

  describe('extractScanCandidates', () => {
    it('returns the raw text first', () => {
      expect(extractScanCandidates('VT-A-254E')[0]).toBe('VT-A-254E');
    });

    it('extracts the code from a URL query string', () => {
      const candidates = extractScanCandidates('https://sgi.niza.pe/producto?codigo=VT-A-254E');
      expect(candidates).toContain('VT-A-254E');
    });

    it('extracts the last URL path segment', () => {
      const candidates = extractScanCandidates('https://sgi.niza.pe/productos/VT-AG-102E');
      expect(candidates).toContain('VT-AG-102E');
    });

    it('extracts the code from a JSON payload', () => {
      const candidates = extractScanCandidates('{"codigo":"AL-166-XL","stock":3}');
      expect(candidates).toContain('AL-166-XL');
    });

    it('extracts the code after an internal prefix', () => {
      expect(extractScanCandidates('SGI:VT-A-254E')).toContain('VT-A-254E');
      expect(extractScanCandidates('NIZA MOTORS|AL-166-XL')).toContain('AL-166-XL');
    });

    it('returns an empty list for empty input', () => {
      expect(extractScanCandidates('')).toEqual([]);
      expect(extractScanCandidates(null)).toEqual([]);
    });
  });

  describe('findProductByScan', () => {
    it('finds a product by its internal code', () => {
      expect(findProductByScan(productos, 'VT-A-254E')).toMatchObject({ id: 1 });
    });

    it('is case insensitive and ignores surrounding spaces', () => {
      expect(findProductByScan(productos, '  vt-a-254e  ')).toMatchObject({ id: 1 });
    });

    it('finds a product by OEM number', () => {
      expect(findProductByScan(productos, '101211-5240')).toMatchObject({ id: 1 });
    });

    it('finds a product by id', () => {
      expect(findProductByScan(productos, '3')).toMatchObject({ id: 3 });
    });

    it('tolerates missing separators in the scanned code', () => {
      expect(findProductByScan(productos, 'VTA254E')).toMatchObject({ id: 1 });
    });

    it('resolves codes wrapped in a URL or JSON payload', () => {
      expect(findProductByScan(productos, 'https://sgi.niza.pe/p?codigo=VT-AG-102E')).toMatchObject({ id: 2 });
      expect(findProductByScan(productos, '{"codigo":"AL-166-XL"}')).toMatchObject({ id: 3 });
    });

    it('returns null when nothing matches', () => {
      expect(findProductByScan(productos, 'NO-EXISTE-123')).toBeNull();
      expect(findProductByScan(productos, '')).toBeNull();
      expect(findProductByScan([], 'VT-A-254E')).toBeNull();
    });
  });

  describe('getScanSearchTerm', () => {
    it('prefers the internal code, then OEM, then id', () => {
      expect(getScanSearchTerm(productos[0])).toBe('VT-A-254E');
      expect(getScanSearchTerm({ id: 9, codigo: '', oem: 'OEM-9' })).toBe('OEM-9');
      expect(getScanSearchTerm({ id: 9 })).toBe('9');
      expect(getScanSearchTerm(null)).toBe('');
    });
  });
});
