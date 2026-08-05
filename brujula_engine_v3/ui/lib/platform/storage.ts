import type { StorageProvider } from "./contracts";

type BrújulaStorageGlobal = typeof globalThis & {
  __brujulaMemoryStorage?: Map<string, unknown>;
};

const memory = ((globalThis as BrújulaStorageGlobal).__brujulaMemoryStorage ||= new Map<string, unknown>());

export const memoryStorageProvider: StorageProvider = {
  async get<T>(key: string) {
    return (memory.get(key) as T | undefined) ?? null;
  },
  async set<T>(key: string, value: T) {
    memory.set(key, value);
  },
  async remove(key: string) {
    memory.delete(key);
  }
};
