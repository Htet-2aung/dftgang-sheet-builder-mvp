import { useSyncExternalStore } from "react";

/**
 * Tiny versioned localStorage store. Used as the demo-mode data layer; the
 * repositories built on it can be swapped for Supabase-backed ones later.
 */
export interface Store<T> {
  get(): T;
  getServer(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  reset(): void;
}

export class StorageQuotaError extends Error {}

export function createStore<T>(opts: {
  key: string;
  version: number;
  fallback: () => T;
  validate: (raw: unknown) => raw is T;
  /** Optional transform applied before writing to localStorage (memory keeps the full value). */
  serialize?: (value: T) => unknown;
}): Store<T> {
  const storageKey = `filmforge.${opts.key}.v${opts.version}`;
  let cache: T | undefined;
  const serverValue = opts.fallback();
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (typeof window === "undefined") return serverValue;
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : undefined;
      cache = parsed !== undefined && opts.validate(parsed) ? parsed : opts.fallback();
    } catch {
      cache = opts.fallback();
    }
    return cache;
  };

  const write = (value: T) => {
    cache = value;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(opts.serialize ? opts.serialize(value) : value));
      } catch (e) {
        listeners.forEach((l) => l());
        throw new StorageQuotaError(e instanceof Error ? e.message : "Storage full");
      }
    }
    listeners.forEach((l) => l());
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === storageKey) {
        cache = undefined;
        listeners.forEach((l) => l());
      }
    });
  }

  return {
    get: read,
    getServer: () => serverValue,
    set(next) {
      const value = typeof next === "function" ? (next as (p: T) => T)(read()) : next;
      write(value);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
      cache = undefined;
      listeners.forEach((l) => l());
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

export const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
