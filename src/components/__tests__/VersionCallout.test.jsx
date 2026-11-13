import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VersionCallout, { VERSION_CALLOUT_STORAGE_KEY } from '../VersionCallout';
import Swal from 'sweetalert2';

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn().mockResolvedValue({}) },
}));

const renderConAncla = () =>
  render(
    <div>
      <span data-version-anchor>v1.2</span>
      <VersionCallout />
    </div>
  );

describe('VersionCallout (globo de novedades)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el globo durante los 5 días y lo descarta al cerrar', () => {
    vi.setSystemTime(new Date(2026, 10, 14, 10, 0, 0));
    renderConAncla();

    expect(screen.queryByText(/Nueva versión 1.2/)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByText(/Nueva versión 1.2/)).toBeInTheDocument();
    expect(screen.getByText(/Actualizada el 13\/11\/2026/)).toBeInTheDocument();

    fireEvent.click(document.querySelector('button[aria-label="Cerrar"]'));

    expect(screen.queryByText(/Nueva versión 1.2/)).toBeNull();
    expect(localStorage.getItem(VERSION_CALLOUT_STORAGE_KEY)).toBe('1');
  });

  it('no vuelve a aparecer si ya fue visto', () => {
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0, 0));
    localStorage.setItem(VERSION_CALLOUT_STORAGE_KEY, '1');

    renderConAncla();
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByText(/Nueva versión 1.2/)).toBeNull();
  });

  it('no aparece fuera de los 5 días', () => {
    vi.setSystemTime(new Date(2026, 10, 20, 10, 0, 0));
    renderConAncla();
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByText(/Nueva versión 1.2/)).toBeNull();
  });

  it('abre la alerta detallada al pulsar "Ver novedades"', () => {
    vi.setSystemTime(new Date(2026, 10, 14, 10, 0, 0));
    renderConAncla();
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    fireEvent.click(screen.getByText('Ver novedades'));

    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(Swal.fire.mock.calls[0][0].html).toContain('1.2');
    expect(screen.queryByText(/Nueva versión 1.2/)).toBeNull();
  });
});
