export type CellLifecycleState = 'ready' | 'running' | 'idle';
export type CellLifecycleEvent = 'open' | 'close';

export function transitionLifecycle(
  state: CellLifecycleState,
  event: CellLifecycleEvent,
): CellLifecycleState {
  if (event === 'open') return state === 'running' ? state : 'running';
  return state === 'running' ? 'idle' : state;
}