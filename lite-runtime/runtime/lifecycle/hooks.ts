import type { CellLifecycleState } from './stateMachine';

export type LifecycleHook = () => void;

export interface CellHost {
  overlay: HTMLElement;
  panel: HTMLElement | null;
}

export interface CellLifecycleHooks {
  onOpen: (handler: LifecycleHook) => void;
  onClose: (handler: LifecycleHook) => void;
}

export interface CellLifecycle extends CellLifecycleHooks {
  readonly state: CellLifecycleState;
  open: () => void;
  close: () => void;
}