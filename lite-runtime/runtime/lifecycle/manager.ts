/**
 * runtime 会把 api.onOpen 和 api.onClose 提供给 cell 脚本
 */
import type { CellLifecycle, LifecycleHook } from './hooks';
import { transitionLifecycle } from './stateMachine';
import type { CellLifecycleEvent, CellLifecycleState } from './stateMachine';

export function createLifecycle(): CellLifecycle {
  let state: CellLifecycleState = 'ready';
  let openHook: LifecycleHook | undefined;
  let closeHook: LifecycleHook | undefined;

  function dispatch(event: CellLifecycleEvent): void {
    const nextState = transitionLifecycle(state, event);
    if (nextState === state) return;

    state = nextState;
    const hook = event === 'open' ? openHook : closeHook;
    hook?.();
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