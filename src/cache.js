// Tiny TTL cache: in memory, mirrored to sessionStorage when it is available.
// It exists to save GitHub API requests (the unauthenticated limit is low).

const PREFIX = "devtrack:v1:";

function defaultStorage() {
  try {
    const storage = globalThis.sessionStorage;
    storage.setItem("__devtrack_probe", "1");
    storage.removeItem("__devtrack_probe");
    return storage;
  } catch {
    return null;
  }
}

export function createCache({ ttlMs = 10 * 60 * 1000, storage = defaultStorage(), now = () => Date.now() } = {}) {
  const memory = new Map();

  function read(key) {
    const hit = memory.get(key);
    if (hit) return hit;
    if (!storage) return null;
    try {
      const raw = storage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  return {
    get(key) {
      const entry = read(key);
      if (!entry) return null;
      if (now() - entry.t > ttlMs) {
        memory.delete(key);
        try { storage?.removeItem(PREFIX + key); } catch { /* ignore */ }
        return null;
      }
      memory.set(key, entry);
      return entry.v;
    },
    set(key, value) {
      const entry = { t: now(), v: value };
      memory.set(key, entry);
      try { storage?.setItem(PREFIX + key, JSON.stringify(entry)); } catch { /* storage full or blocked */ }
    },
    clear() {
      memory.clear();
      if (!storage) return;
      try {
        for (let i = storage.length - 1; i >= 0; i -= 1) {
          const key = storage.key(i);
          if (key && key.startsWith(PREFIX)) storage.removeItem(key);
        }
      } catch { /* ignore */ }
    }
  };
}
