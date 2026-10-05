import type { CellScope, LifecycleHook } from './hooks';

export function createCellScope(): CellScope {
  const controller = new AbortController();
  const cleanups: LifecycleHook[] = [];
  let disposed = false;

  function runCleanup(cleanup: LifecycleHook): void {
    try {
      cleanup();
    } catch (error) {
      console.error('[lite-runtime] cell cleanup failed', error);
    }
  }

  function onCleanup(handler: LifecycleHook): void {
    if (disposed) {
      runCleanup(handler);
      return;
    }
    cleanups.push(handler);
  }

  return {
    signal: controller.signal,
    setInterval(handler, timeout = 0) {
      if (disposed) return;
      const timer = window.setInterval(handler, timeout);
      onCleanup(() => window.clearInterval(timer));
    },
    setTimeout(handler, timeout = 0) {
      if (disposed) return;
      let cleanup: LifecycleHook;
      const timer = window.setTimeout(() => {
        const index = cleanups.indexOf(cleanup);
        if (index >= 0) cleanups.splice(index, 1);
        handler();
      }, timeout);
      cleanup = () => window.clearTimeout(timer);
      onCleanup(cleanup);
    },
    listen(target, type, listener, options) {
      if (disposed) return;
      target.addEventListener(type, listener, options);
      onCleanup(() => target.removeEventListener(type, listener, options));
    },
    onCleanup,
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      cleanups.splice(0).reverse().forEach(runCleanup);
    },
  };
}
