interface CellRuntimeHandlers {
  openCell: (cellId: string) => void;
  closeAll: () => void;
}

let eventsBound = false;
let removeListeners: (() => void) | undefined;

export function bindCellEvents(handlers: CellRuntimeHandlers): () => void {
  if (eventsBound || typeof document === 'undefined') {
    return removeListeners || (() => {});
  }
  eventsBound = true;

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest('[data-ans-cell]');
    if (trigger) {
      const cellId = trigger.getAttribute('data-ans-cell');
      if (cellId) {
        event.preventDefault();
        handlers.openCell(cellId);
      }
      return;
    }

    if (target.closest('.ans-ov-backdrop')) {
      event.preventDefault();
      handlers.closeAll();
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') handlers.closeAll();
  };

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  removeListeners = () => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeydown);
    eventsBound = false;
    removeListeners = undefined;
  };
  return removeListeners;
}