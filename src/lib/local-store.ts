import { useSyncExternalStore } from "react";

/**
 * Tiny browser-storage store. Data lives in this browser only (localStorage).
 * Server render and hydration always see `serverValue`, then the client
 * switches to the stored value — no hydration mismatch.
 */
export function createLocalStore<T>(key: string, opts: { serverValue: T; seed: () => T }) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  function read(): T {
    if (cache !== undefined) return cache;
    if (typeof window === "undefined") return opts.serverValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        cache = opts.seed();
        window.localStorage.setItem(key, JSON.stringify(cache));
      } else {
        cache = JSON.parse(raw) as T;
      }
    } catch {
      cache = opts.seed();
    }
    return cache;
  }

  function write(next: T) {
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      console.error(`Could not save ${key}`, error);
    }
    listeners.forEach((l) => l());
  }

  function update(fn: (prev: T) => T) {
    write(fn(read()));
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => opts.serverValue);
  }

  return { read, write, update, useValue };
}

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Hydration flag: false during SSR/hydration, true afterwards. */
const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
