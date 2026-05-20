const KEY_PREFIX = "cemento-table:";

export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);

    return raw == null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn("[storage] could not read", key, error);
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn("[storage] could not write", key, error);
  }
}
