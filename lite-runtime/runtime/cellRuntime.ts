import { runCellJs } from './run/runCellJs';
import { injectCellStyles, injectSharedStyles } from './mount/styles';
import type { CellConfig, PublicConfig } from './cellConfig';
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

function createCellSlot(cell: CellConfig): CellSlot {
  const mounted = mountCell(cell);
  const lifecycle = createLifecycle();
  runCellJs(
    cell.js || '',
    { overlay: mounted.overlay, panel: mounted.panel },
    lifecycle,
  );

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
  const cell = config.cells.find((item) => item.cell_id === id);
  if (!cell) return;

  if (currentId && currentId !== id) closeAll();
  injectSharedStyles(config.shared_css);
  if (cell.css) injectCellStyles(cell.cell_id, cell.css);

  let slot = slots.get(id);
  if (!slot) {
    slot = createCellSlot(cell);
    slots.set(id, slot);
  }

  setOverlayOpen(slot.mounted.overlay, true);
  currentId = id;
  lockBody(true);
  slot.lifecycle.open();
}

