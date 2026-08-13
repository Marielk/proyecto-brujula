import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "./contracts";

const STORAGE_ROOT = path.resolve(process.cwd(), "..", ".brujula", "platform-storage");
const writeLocks = new Map<string, Promise<void>>();

export const fileStorageProvider: StorageProvider = {
  async get<T>(key: string) {
    try {
      const raw = await readFile(filePathForKey(key), "utf-8");
      return JSON.parse(raw) as T;
    } catch (error) {
      if (isMissingFile(error)) {
        return null;
      }
      throw error;
    }
  },
  async set<T>(key: string, value: T) {
    const previous = writeLocks.get(key) || Promise.resolve();
    const next = previous.catch(() => undefined).then(() => writeJsonFile(key, value));
    writeLocks.set(key, next);
    try {
      await next;
    } finally {
      if (writeLocks.get(key) === next) {
        writeLocks.delete(key);
      }
    }
  },
  async remove(key: string) {
    await writeLocks.get(key)?.catch(() => undefined);
    await rm(filePathForKey(key), { force: true });
  }
};

async function writeJsonFile<T>(key: string, value: T) {
  await mkdir(STORAGE_ROOT, { recursive: true });
  const target = filePathForKey(key);
  const temp = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await writeFile(temp, JSON.stringify(value), "utf-8");
  await rm(target, { force: true });
  await rename(temp, target);
}

function filePathForKey(key: string) {
  return path.join(STORAGE_ROOT, `${Buffer.from(key, "utf-8").toString("base64url")}.json`);
}

function isMissingFile(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
