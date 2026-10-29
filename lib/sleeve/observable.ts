import type { Observable } from './types.ts';

/** An Observable whose owner can set the value. */
export type Subject<T> = Observable<T> & { set(value: T): void };

export function createSubject<T>(initial: T): Subject<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();
  return {
    get: () => value,
    set(next) {
      value = next;
      for (const listener of [...listeners]) listener(next);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** An Observable that never changes. */
export function constant<T>(value: T): Observable<T> {
  return { get: () => value, subscribe: () => () => {} };
}
