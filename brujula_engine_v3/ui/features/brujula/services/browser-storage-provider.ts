import type { StorageProvider } from "../../../lib/platform/contracts";

export const browserStorageProvider: StorageProvider = {
  async get<T>(key: string) {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      window.localStorage.removeItem(key);
      return null;
    }
  },
  async set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  }
};
