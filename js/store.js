// localStorage amb prefix i sense excepcions: si el navegador el bloqueja,
// l'entorn continua funcionant (available = false).

export const PREFIX = 'karel-web:';

export function createStore(storage) {
  let available = false;
  if (storage) {
    try {
      storage.setItem(`${PREFIX}prova`, '1');
      storage.removeItem(`${PREFIX}prova`);
      available = true;
    } catch {
      available = false;
    }
  }

  return {
    get available() {
      return available;
    },
    get(key, fallback) {
      if (!available) return fallback;
      try {
        const raw = storage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      if (!available) return;
      try {
        storage.setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        available = false;
      }
    },
    remove(key) {
      if (!available) return;
      try {
        storage.removeItem(PREFIX + key);
      } catch {
        available = false;
      }
    },
    clearAll() {
      if (!available) return;
      try {
        const keys = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k?.startsWith(PREFIX)) keys.push(k);
        }
        keys.forEach(k => storage.removeItem(k));
      } catch {
        available = false;
      }
    },
  };
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
