/**
 * Demo-mode repositories (localStorage). Swap these for Supabase-backed
 * implementations with the same function signatures in production.
 */
import { createStore, isArray, isObject, StorageQuotaError, useStore } from "@/lib/storage";
import { newId } from "@/lib/currency";
import { getSampleArtworks } from "@/data/sampleArtwork";
import { makeSeedOrders } from "@/data/demoOrders";
import type { ArtworkItem, CartItem, GangSheetProject, Order, OrderStatus } from "@/types";

const isProject = (v: unknown): v is GangSheetProject =>
  isObject(v) && typeof v.id === "string" && typeof v.sheetLengthInches === "number" && isArray(v.placements);

// ---------- Artwork library ----------
export const artworkStore = createStore<ArtworkItem[]>({
  key: "artworks",
  version: 1,
  fallback: () => [],
  validate: (v): v is ArtworkItem[] => isArray(v) && v.every((a) => isObject(a) && typeof a.id === "string"),
  serialize: (items) => items.map((a) => (a.persisted ? a : { ...a, dataUrl: undefined })),
});

/** All artwork available to the editor, sample artwork included. */
export function useArtworkMap(): Record<string, ArtworkItem> {
  const uploaded = useStore(artworkStore);
  return getArtworkMap(uploaded);
}
let mapCache: { src: ArtworkItem[]; map: Record<string, ArtworkItem> } | null = null;
export function getArtworkMap(uploaded = artworkStore.get()) {
  if (mapCache?.src === uploaded) return mapCache.map;
  const map: Record<string, ArtworkItem> = {};
  for (const a of getSampleArtworks()) map[a.id] = a;
  for (const a of uploaded) map[a.id] = a;
  mapCache = { src: uploaded, map };
  return map;
}

/** Saves artwork; if the browser quota is hit, the image stays usable until reload but only metadata persists. Returns false in that case. */
export function saveArtwork(item: ArtworkItem): boolean {
  const prev = artworkStore.get();
  try {
    artworkStore.set([...prev, item]);
    return true;
  } catch (e) {
    if (!(e instanceof StorageQuotaError)) throw e;
    try {
      artworkStore.set([...prev, { ...item, persisted: false }]);
    } catch {
      /* metadata could not be stored either; still usable in memory */
    }
    return false;
  }
}

export function removeArtwork(id: string) {
  artworkStore.set((prev) => prev.filter((a) => a.id !== id));
}

// ---------- Current editor project ----------
export interface SavedProjectState {
  project: GangSheetProject;
  editingCartItemId?: string;
  savedAt: string;
}
export const projectStore = createStore<SavedProjectState | null>({
  key: "project",
  version: 1,
  fallback: () => null,
  validate: (v): v is SavedProjectState | null => v === null || (isObject(v) && isProject(v.project)),
});

// ---------- Cart ----------
export const cartStore = createStore<CartItem[]>({
  key: "cart",
  version: 1,
  fallback: () => [],
  validate: (v): v is CartItem[] => isArray(v) && v.every((i) => isObject(i) && isProject(i.project)),
});
export const useCart = () => useStore(cartStore);

export function upsertCartItem(item: CartItem) {
  cartStore.set((prev) => (prev.some((p) => p.id === item.id) ? prev.map((p) => (p.id === item.id ? item : p)) : [...prev, item]));
}
export function removeCartItem(id: string) {
  cartStore.set((prev) => prev.filter((p) => p.id !== id));
}
export function setCartQuantity(id: string, quantity: number) {
  cartStore.set((prev) => prev.map((p) => (p.id === id ? { ...p, quantity } : p)));
}

// ---------- Orders ----------
interface OrdersState {
  seeded: boolean;
  orders: Order[];
}
export const orderStore = createStore<OrdersState>({
  key: "orders",
  version: 1,
  fallback: () => ({ seeded: false, orders: [] }),
  validate: (v): v is OrdersState => isObject(v) && isArray(v.orders),
});

export function useOrders(): Order[] {
  return useStore(orderStore).orders;
}

export function ensureSeedOrders() {
  const s = orderStore.get();
  if (!s.seeded) orderStore.set({ seeded: true, orders: [...s.orders, ...makeSeedOrders()] });
}

export function createOrder(order: Omit<Order, "id" | "orderNumber">): Order {
  const id = newId("ord_");
  const orderNumber = `FF-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
  const full: Order = { ...order, id, orderNumber };
  orderStore.set((s) => ({ ...s, orders: [full, ...s.orders] }));
  // Verify the write actually persisted before reporting success.
  const saved = orderStore.get().orders.find((o) => o.id === id);
  if (!saved) throw new Error("Order could not be saved.");
  return saved;
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  orderStore.set((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === id ? { ...o, status, statusHistory: [...o.statusHistory, { status, at: new Date().toISOString() }] } : o,
    ),
  }));
}

export function resetDemoData() {
  artworkStore.reset();
  projectStore.reset();
  cartStore.reset();
  orderStore.reset();
  if (typeof window !== "undefined") window.localStorage.removeItem("filmforge.walkthrough.dismissed");
}
