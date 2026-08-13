/**
 * Token storage abstraction.
 *
 * Uses @react-native-async-storage/async-storage when the package is installed,
 * otherwise falls back to an in-memory store that lasts the app session.
 *
 * To enable persistent storage across restarts:
 *   npm install @react-native-async-storage/async-storage
 * then uncomment the AsyncStorage block below.
 */

// ─── Persistent path (uncomment when AsyncStorage is installed) ───────────────
// import AsyncStorage from '@react-native-async-storage/async-storage';
// export const tokenStorage = {
//   get: (key: string) => AsyncStorage.getItem(key),
//   set: (key: string, value: string) => AsyncStorage.setItem(key, value),
//   remove: (key: string) => AsyncStorage.removeItem(key),
// };

// ─── In-memory fallback ───────────────────────────────────────────────────────
// State persists in the database (coins, unlocks). Losing the token only means
// the user must log in again after an app restart.
const store: Record<string, string> = {};

export const tokenStorage = {
  get: (_key: string): Promise<string | null> =>
    Promise.resolve(store[_key] ?? null),
  set: (_key: string, value: string): Promise<void> => {
    store[_key] = value;
    return Promise.resolve();
  },
  remove: (_key: string): Promise<void> => {
    delete store[_key];
    return Promise.resolve();
  },
};
