// thin wrapper around the browser's localStorage.
// all keys are prefixed with "cemento-table:" so they do not clash with
// other apps that might be running on the same domain.
//
// both functions silently catch errors because some browsers block localStorage
// in private mode (Safari throws on every call). failing gracefully is better
// than crashing the whole table.
//
// used by useEditableTable to persist committed rows and column visibility.

const KEY_PREFIX = "cemento-table:";

// load a value from localStorage. returns fallback if the key does not exist
// or if the stored JSON cannot be parsed.
export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    // null means the key was never set — return the fallback.
    return raw == null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn("[storage] could not read", key, error);
    return fallback;
  }
}

// save a value to localStorage as JSON.
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn("[storage] could not write", key, error);
  }
}
