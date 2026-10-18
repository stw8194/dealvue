import type { Reservation, ReservationReview } from "@/type/reservation";
import type { LocalCoupon } from "./coupons";
import type { AccessoryId, BackdropId, Outfit, RoulettePlay } from "./engagement/playground/data";

export type PointEntry = { id: string; reason: string; amount: number; createdAt: string };

/** Everything that holds value on this device: bookings, coupons, points and what points bought. */
export interface LedgerState {
  reservations: Reservation[];
  reviews: ReservationReview[];
  coupons: LocalCoupon[];
  pointHistory: PointEntry[];
  attendance: string[];
  missionClaims: string[];
  roulettePlay: RoulettePlay | null;
  ownedOutfits: Outfit[];
  ownedAccessories: AccessoryId[];
  ownedBackdrops: BackdropId[];
}

type Slice = Partial<LedgerState>;
type CacheAdapter = { read: () => Slice; write: (slice: Slice) => void };
type Apply = (state: LedgerState) => LedgerState | null;

const DB_NAME = "dealvue-ledger";
const STORE = "ledger";
const KEY = "main";
const adapters: CacheAdapter[] = [];
const pending: { id: number; apply: Apply }[] = [];
let nextPendingId = 0;
let lastCommitted: LedgerState | null = null;
// Before anything is stored, the ledger starts from the saved screen state as it was before any
// optimistic change; seeding from the screen afterwards would apply those changes twice.
let seed: LedgerState | null = null;
function baseline() {
  seed ??= cacheSnapshot();
  return lastCommitted ?? seed;
}
let dbPromise: Promise<IDBDatabase | null> | null = null;
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("dealvue-ledger");

export class LedgerConflictError extends Error {
  constructor(message = "다른 화면에서 내용이 바뀌었어요. 다시 시도해 주세요.") { super(message); }
}

/** Stores expose their slice so the ledger can seed itself and push committed state back. */
export function registerLedgerCache(adapter: CacheAdapter) {
  adapters.push(adapter);
}

function emptyLedger(): LedgerState {
  return { reservations: [], reviews: [], coupons: [], pointHistory: [], attendance: [], missionClaims: [], roulettePlay: null, ownedOutfits: ["basic"], ownedAccessories: [], ownedBackdrops: ["lavender"] };
}

export function cacheSnapshot(): LedgerState {
  return adapters.reduce<LedgerState>((state, adapter) => ({ ...state, ...adapter.read() }), emptyLedger());
}

function writeCaches(state: LedgerState) {
  adapters.forEach(adapter => adapter.write(state));
}

// Optimistic changes not yet committed are replayed on top of the committed state.
function rebaseCaches(committed: LedgerState) {
  writeCaches(pending.reduce((state, change) => change.apply(state) ?? state, committed));
}

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise(resolve => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/**
 * Runs `mutate` against the latest stored ledger inside one IndexedDB readwrite transaction.
 * Overlapping readwrite transactions on the same store are serialised across tabs, so the
 * read-check-write is atomic and every field of one change is saved together or not at all.
 */
export async function commitLedger<T>(mutate: (state: LedgerState) => { next: LedgerState; result: T }): Promise<T> {
  const db = await openDb();
  if (!db) {
    // Without IndexedDB (e.g. some private modes) changes stay in this tab's memory only.
    const { next, result } = mutate(baseline());
    lastCommitted = next;
    rebaseCaches(next);
    return result;
  }
  return new Promise<T>((resolve, reject) => {
    let outcome: { next: LedgerState; result: T } | null = null;
    let failure: unknown = null;
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const read = store.get(KEY);
    read.onsuccess = () => {
      try {
        outcome = mutate({ ...emptyLedger(), ...((read.result as LedgerState | undefined) ?? baseline()) });
        store.put(outcome.next, KEY);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      lastCommitted = outcome!.next;
      rebaseCaches(outcome!.next);
      channel?.postMessage("changed");
      resolve(outcome!.result);
    };
    tx.onabort = () => reject(failure ?? tx.error ?? new Error("저장하지 못했어요. 다시 시도해 주세요."));
  });
}

/**
 * For actions the UI needs to answer immediately (e.g. buying an outfit): the change is shown
 * at once, then re-validated against the stored ledger. A change that no longer applies there
 * (spent elsewhere, already claimed) is dropped and the screen returns to the stored state.
 */
export function applyOptimistic(apply: Apply): boolean {
  const current = pending.reduce((state, change) => change.apply(state) ?? state, baseline());
  const next = apply(current);
  if (!next) return false;
  const id = nextPendingId++;
  pending.push({ id, apply });
  writeCaches(next);
  void commitLedger(state => {
    const applied = apply(state);
    if (!applied) throw new LedgerConflictError();
    return { next: applied, result: true };
  }).catch(() => undefined).finally(() => {
    const index = pending.findIndex(change => change.id === id);
    if (index >= 0) pending.splice(index, 1);
    void syncFromLedger();
  });
  return true;
}

/** Loads the stored ledger into the stores, e.g. on start-up or after another tab changed it. */
export async function syncFromLedger() {
  const db = await openDb();
  if (!db) return;
  const stored = await new Promise<LedgerState | undefined>(resolve => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result as LedgerState | undefined);
    request.onerror = () => resolve(undefined);
  });
  if (!stored) { baseline(); return; }
  lastCommitted = { ...emptyLedger(), ...stored };
  rebaseCaches(lastCommitted);
}

export function resetLedger() {
  return commitLedger(() => ({ next: emptyLedger(), result: undefined }));
}

if (typeof window !== "undefined") {
  channel?.addEventListener("message", () => { void syncFromLedger(); });
  queueMicrotask(() => { void syncFromLedger(); });
}
