import { describe, it, expect } from 'vitest';
import { ROUTES } from '../routes';

describe('Route Registry Configuration (ROUTES)', () => {
  it('defines all required application routes', () => {
    const requiredRoutes = [
      'dashboard',
      'ventas',
      'creditos',
      'productos',
      'categorias',
      'marcas',
      'movimientos',
      'kardex',
      'proveedores',
      'auditoria',
      'reporte-ventas',
      'reporte-ingresos',
      'reporte-salidas',
      'reporte-kardex',
      'usuarios',
    ];

    requiredRoutes.forEach((routeKey) => {
      expect(ROUTES[routeKey]).toBeDefined();
      expect(ROUTES[routeKey].id).toBe(routeKey);
      expect(Array.isArray(ROUTES[routeKey].roles)).toBe(true);
      expect(ROUTES[routeKey].roles.length).toBeGreaterThan(0);
      expect(ROUTES[routeKey].labelKey).toBeDefined();
    });
  });

  it('restricts auditoria only to superadmin', () => {
    expect(ROUTES.auditoria.roles).toEqual(['superadmin']);
  });

  it('allows admin and vendedor on commercial routes', () => {
    expect(ROUTES.ventas.roles).toContain('admin');
    expect(ROUTES.ventas.roles).toContain('vendedor');
    expect(ROUTES.creditos.roles).toContain('admin');
    expect(ROUTES.creditos.roles).toContain('vendedor');
  });
});
