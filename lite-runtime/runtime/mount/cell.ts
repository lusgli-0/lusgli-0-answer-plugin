import type { CellConfig } from '../cellConfig';
import { createOverlayShell } from './overlay';

export interface MountedCell {
  overlay: HTMLElement;
  panel: HTMLElement | null;
  unmount: () => void;
}

export function mountCell(cell: CellConfig): MountedCell {
  const overlay = createOverlayShell(cell.cell_id);
  overlay.insertAdjacentHTML('beforeend', cell.html || '');

  return {
    overlay,
    panel: overlay.querySelector<HTMLElement>('[data-ans-panel]'),
    unmount() {
      overlay.remove();
    },
  };
}