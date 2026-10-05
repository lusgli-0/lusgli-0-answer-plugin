import type { CellLifecycleState } from './stateMachine';

export type LifecycleHook = () => void;

export interface CellHost {
  overlay: HTMLElement;
  panel: HTMLElement | null;
}

export interface CellScope {
  signal: AbortSignal;
  setInterval(handler: () => void, timeout?: number): void;
  setTimeout(handler: () => void, timeout?: number): void;
  listen(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  onCleanup(handler: LifecycleHook): void;
  dispose(): void;
}

export interface CellLifecycleHooks {
  onOpen: (handler: (scope: CellScope, host: CellHost) => void) => void;
  onClose: (handler: LifecycleHook) => void;
}

export interface CellLifecycle extends CellLifecycleHooks {
  readonly state: CellLifecycleState;
  open: () => void;
  close: () => void;
}