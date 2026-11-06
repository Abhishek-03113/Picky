import type { AuthClient } from "../api/auth-client.ts";

/**
 * localStorage key remembering whether this browser was last signed in. The inline script in index.html reads
 * it before first paint and hides the prerendered (signed-out) homepage, so a signed-in visitor never sees
 * the marketing page flash before their library. It is only a hint: the session cookie stays the truth.
 */
export const SIGNED_IN_HINT_KEY = "picky-signed-in";

/** The slice of Storage the hint uses; writes may throw (private mode, blocked storage) and are ignored. */
export interface HintStorage {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Wraps `authClient` so every answer about the session also updates the hint.
 *
 * @example rememberSignedIn(createAuthClient(fetch, ""), window.localStorage)
 */
export function rememberSignedIn(authClient: AuthClient, storage: HintStorage): AuthClient {
  const remember = (signedIn: boolean) => {
    try {
      if (signedIn) storage.setItem(SIGNED_IN_HINT_KEY, "1");
      else storage.removeItem(SIGNED_IN_HINT_KEY);
    } catch {
      // Storage is unavailable: the page still works, it just cannot hide the prerendered homepage early.
    }
  };
  return {
    currentUser: async () => {
      const user = await authClient.currentUser();
      remember(user !== null);
      return user;
    },
    signIn: async (email, password) => {
      const user = await authClient.signIn(email, password);
      remember(true);
      return user;
    },
    signUp: async (email, password) => {
      const user = await authClient.signUp(email, password);
      remember(true);
      return user;
    },
    signOut: async () => {
      await authClient.signOut();
      remember(false);
    },
  };
}
