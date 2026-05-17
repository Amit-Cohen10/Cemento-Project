/*
 * Tiny wrapper around localStorage so the rest of the table doesn't need to
 * deal with JSON parsing or browsers that block storage (Safari in private
 * mode throws on every setItem). All keys share a prefix so multiple apps
 * on the same origin don't collide.
 */

const KEY_PREFIX = "cemento-table:";

export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (error) {
    // Bad JSON or storage disabled. Falling back keeps the page usable.
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
