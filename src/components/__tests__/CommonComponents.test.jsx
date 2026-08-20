import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LanguageSwitcher from '../LanguageSwitcher';
import { Skeleton, SkeletonCard, SkeletonTable } from '../Skeleton';
import SortableTh from '../SortableTh';
import ImprimirConfirmModal from '../ImprimirConfirmModal';

describe('Common Components', () => {
  describe('LanguageSwitcher', () => {
    it('renders and toggles language on click', () => {
      render(<LanguageSwitcher />);
      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(btn).toBeInTheDocument();
    });
  });

  describe('Skeleton Components', () => {
    it('renders Skeleton, SkeletonCard, and SkeletonTable', () => {
      const { container } = render(
        <div>
          <Skeleton className="custom-class" />
          <SkeletonCard />
          <SkeletonTable rows={3} cols={3} />
        </div>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
      expect(container.querySelectorAll('tbody tr').length).toBe(3);
    });
  });

  describe('SortableTh', () => {
    it('renders header with sort interaction', () => {
      const onSort = vi.fn();
      render(
        <table>
          <thead>
            <tr>
              <SortableTh campo="nombre" orden={{ campo: 'nombre', dir: 'asc' }} onSort={onSort}>
                Nombre
              </SortableTh>
            </tr>
          </thead>
        </table>
      );

      const th = screen.getByText('Nombre');
      fireEvent.click(th);
      expect(onSort).toHaveBeenCalledWith('nombre');
    });
  });

  describe('ImprimirConfirmModal', () => {
    it('renders and responds to print / cancel events', () => {
      const onImprimir = vi.fn();
      const onOmitir = vi.fn();

      const { rerender } = render(
        <ImprimirConfirmModal abierto={false} boletaCode="B001" onImprimir={onImprimir} onOmitir={onOmitir} />
      );
      expect(screen.queryByText('¿Desea imprimir el comprobante?')).toBeNull();

      rerender(
        <ImprimirConfirmModal abierto={true} boletaCode="B001" onImprimir={onImprimir} onOmitir={onOmitir} />
      );
      expect(screen.getByText('¿Desea imprimir el comprobante?')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /sí, imprimir/i }));
      expect(onImprimir).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /no imprimir/i }));
      expect(onOmitir).toHaveBeenCalled();
    });
  });
});
