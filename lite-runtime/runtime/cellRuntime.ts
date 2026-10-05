import { loadCellModule, runCellJs } from './run/runCellJs';
import { injectCellStyles, injectSharedStyles } from './mount/styles';
import type { PublicConfig } from './cellConfig';
import { createLifecycle } from './lifecycle';
import type { CellLifecycle } from './lifecycle';
import { mountCell } from './mount/cell';
import { lockBody, setOverlayOpen } from './mount/overlay';
import { bindCellEvents } from './events';

interface CellSlot {
  mounted: ReturnType<typeof mountCell>;
  lifecycle: CellLifecycle;
}

const slots = new Map<string, CellSlot>();
let currentId: string | null = null;
let latest: PublicConfig | null = null;
let removeCellEvents: (() => void) | undefined;

function createCellSlot(cellId: string, html: string): CellSlot {
  const mounted = mountCell(cellId, html);
  const lifecycle = createLifecycle({
    overlay: mounted.overlay,
    panel: mounted.panel,
  });

  return {
    mounted,
    lifecycle,
  };
}

export function setPublicConfig(config: PublicConfig): void {
  latest = config;
  injectSharedStyles(config.shared_css);
}

export function closeAll(): void {
  const slot = currentId ? slots.get(currentId) : undefined;
  if (slot) {
    setOverlayOpen(slot.mounted.overlay, false);
    slot.lifecycle.close();
  }
  currentId = null;
  lockBody(false);
}

export function startCellRuntime(): void {
  if (removeCellEvents) return;
  removeCellEvents = bindCellEvents({ openCell, closeAll });
}

export function unloadCellRuntime(): void {}

export function openCell(cellId: string): void {
  const id = String(cellId || '').trim();
  const config = latest;
  if (!config) return;
  if (!config.cells.some((item) => item.cell_id === id)) return;
  if (currentId === id && !slots.has(id)) return;

  if (currentId && currentId !== id) closeAll();
  injectSharedStyles(config.shared_css);

  const existingSlot = slots.get(id);
  if (existingSlot) {
    setOverlayOpen(existingSlot.mounted.overlay, true);
    currentId = id;
    lockBody(true);
    existingSlot.lifecycle.open();
    return;
  }

  currentId = id;
  void loadCellModule(id)
    .then((cellModule) => {
      if (currentId !== id) return;

      const slot = createCellSlot(id, cellModule.html);
      slots.set(id, slot);
      if (cellModule.css) injectCellStyles(id, cellModule.css);
      runCellJs(cellModule, { overlay: slot.mounted.overlay, panel: slot.mounted.panel }, slot.lifecycle);
      setOverlayOpen(slot.mounted.overlay, true);
      lockBody(true);
      slot.lifecycle.open();
    })
    .catch((error: unknown) => {
      console.error(`[lite-runtime] failed to load cell "${id}"`, error);
      if (currentId === id) {
        currentId = null;
        lockBody(false);
      }
    });
}
