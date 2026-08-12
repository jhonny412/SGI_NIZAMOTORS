import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../Pagination';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: 'es' }
  })
}));

describe('Pagination Component', () => {
  it('renders null if totalPaginas is 0 or 1', () => {
    const { container: c1 } = render(<Pagination pagina={1} totalPaginas={1} setPagina={() => {}} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<Pagination pagina={1} totalPaginas={0} setPagina={() => {}} />);
    expect(c2.firstChild).toBeNull();
  });

  it('renders pagination controls and text correctly for totalPaginas > 1', () => {
    const { container } = render(<Pagination pagina={2} totalPaginas={5} setPagina={() => {}} />);

    expect(container.textContent).toContain('Página');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('de');
    expect(container.textContent).toContain('5');
  });

  it('disables previous/first buttons on page 1', () => {
    render(<Pagination pagina={1} totalPaginas={5} setPagina={() => {}} />);

    const firstBtn = screen.getByLabelText('Primera página');
    const prevBtn = screen.getByLabelText('Página anterior');

    expect(firstBtn).toBeDisabled();
    expect(prevBtn).toBeDisabled();
  });

  it('disables next/last buttons on last page', () => {
    render(<Pagination pagina={5} totalPaginas={5} setPagina={() => {}} />);

    const nextBtn = screen.getByLabelText('Página siguiente');
    const lastBtn = screen.getByLabelText('Última página');

    expect(nextBtn).toBeDisabled();
    expect(lastBtn).toBeDisabled();
  });

  it('calls setPagina with correct values on button clicks', () => {
    const setPaginaMock = vi.fn();
    render(<Pagination pagina={2} totalPaginas={5} setPagina={setPaginaMock} />);

    fireEvent.click(screen.getByLabelText('Página siguiente'));
    expect(setPaginaMock).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Primera página'));
    expect(setPaginaMock).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText('Última página'));
    expect(setPaginaMock).toHaveBeenCalledWith(5);
  });
});
