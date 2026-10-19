import { createOverlayShell } from './overlay';

export interface MountedCell {
  overlay: HTMLElement;
  panel: HTMLElement | null;
  unmount: () => void;
}

export function mountCell(cellId: string, html: string): MountedCell {
  const overlay = createOverlayShell(cellId);
  overlay.insertAdjacentHTML('beforeend', html);

  return {
    overlay,
    panel: overlay.querySelector<HTMLElement>('[data-ans-panel]'),
    unmount() {
      overlay.remove();
    },
  };
}