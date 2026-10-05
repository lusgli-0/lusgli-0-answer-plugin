/**
 * runtime 会把 api.onOpen 和 api.onClose 提供给 cell 脚本
 */
import type { CellHost, CellLifecycle, CellScope, LifecycleHook } from './hooks';
import { createCellScope } from './scope';
import { transitionLifecycle } from './stateMachine';
import type { CellLifecycleEvent, CellLifecycleState } from './stateMachine';

export function createLifecycle(host: CellHost): CellLifecycle {
  let state: CellLifecycleState = 'ready';
  let openHook: ((scope: CellScope, host: CellHost) => void) | undefined;
  let closeHook: LifecycleHook | undefined;
  let scope: CellScope | undefined;

  function dispatch(event: CellLifecycleEvent): void {
    const nextState = transitionLifecycle(state, event);
    if (nextState === state) return;

    state = nextState;
    if (event === 'open') {
      scope = createCellScope();
      try {
        openHook?.(scope, host);
      } catch (error) {
        console.error('[lite-runtime] cell onOpen failed', error);
      }
      return;
    }

    try {
      closeHook?.();
    } finally {
      scope?.dispose();
      scope = undefined;
    }
  }

  return {
    get state() {
      return state;
    },
    onOpen(handler) {
      openHook = handler;
    },
    onClose(handler) {
      closeHook = handler;
    },
    open() {
      dispatch('open');
    },
    close() {
      dispatch('close');
    },
  };
}