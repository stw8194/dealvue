import { useSyncExternalStore } from 'react';
import { createJSONStorage } from 'zustand/middleware';

// Legacy unowned device data stays with the guest. Never award it to the next login.
let scope = 'guest';
let switching = false;
const listeners = new Set<() => void>();
export const accountScope = () => scope;
export const scopedStorageKey = (name: string) => scope === 'guest' ? name : `${name}:user:${scope}`;
export const accountStorage = <T>() => createJSONStorage<T>(() => ({
  getItem: (name: string) => localStorage.getItem(scopedStorageKey(name)),
  setItem: (name: string, value: string) => { if (!switching) localStorage.setItem(scopedStorageKey(name), value); },
  removeItem: (name: string) => localStorage.removeItem(scopedStorageKey(name)),
}));
export function onAccountScopeChange(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** Current storage owner; components keyed by it start over with the next account's data. */
export const useAccountScope = () => useSyncExternalStore(onAccountScopeChange, accountScope);
export function changeAccountScope(userId?: string) {
  const next = userId || 'guest';
  if (scope === next) return;
  scope = next;
  switching = true;
  try { listeners.forEach(listener => listener()); } finally { switching = false; }
}
// localStorage hydration is synchronous. Suppress writes while resetting so that the
// previous account cannot overwrite the next account's saved data during the reset.
export function registerAccountStore<T>(store: {
  getInitialState: () => T;
  setState: (state: T, replace: true) => void;
  persist: { rehydrate: () => void | Promise<void> };
}) {
  onAccountScopeChange(() => {
    store.setState(store.getInitialState(), true);
    void store.persist.rehydrate();
  });
  // A lazy-loaded store starts with the current scope automatically.
}
