import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import type { AuthClient } from "../api/auth-client.ts";
import { currentUserQuery } from "../api/auth-queries.ts";
import { afterSignInPath, type SignInSearch } from "./sign-in-search.ts";

export const SIGN_IN_PATH = "/login";
export const EXTENSION_PATH = "/extension";
export const PRIVACY_PATH = "/privacy";

/**
 * Pages anyone may open. "/" is the library when signed in and the homepage when signed out, so a
 * shared Picky link explains the product before it asks for an account.
 */
/** A shared cart link (/c/<slug>) is for people without an account, so it is public too. */
const SHARED_CART_PREFIX = "/c/";
const PUBLIC_PATHS: ReadonlySet<string> = new Set(["/", SIGN_IN_PATH, EXTENSION_PATH, PRIVACY_PATH]);

interface GuardContext {
  queryClient: QueryClient;
  authClient: AuthClient;
}

/**
 * Whether a visitor is signed in, from the cached current user (fetched once per session).
 *
 * @example if (await isSignedIn(context)) await loadLibrary()
 */
export async function isSignedIn(context: GuardContext): Promise<boolean> {
  return (await context.queryClient.ensureQueryData(currentUserQuery(context.authClient))) !== null;
}

/**
 * Root `beforeLoad`: the library and comparisons are per account, so every page but the public ones
 * needs a signed-in user. Throws a redirect to /login that remembers where the visitor was going.
 *
 * @example beforeLoad: ({ context, location }) => requireSignedIn(context, location)
 */
export async function requireSignedIn(
  context: GuardContext,
  location: { pathname: string; href: string },
): Promise<void> {
  if (PUBLIC_PATHS.has(location.pathname) || location.pathname.startsWith(SHARED_CART_PREFIX)) return;
  if (!(await isSignedIn(context))) throw redirect({ to: SIGN_IN_PATH, search: { redirect: location.href } });
}

/**
 * /login's `beforeLoad`: someone already signed in has nothing to do there, so they go on to the target.
 *
 * @example beforeLoad: ({ context, search }) => skipSignInWhenSignedIn(context, search)
 */
export async function skipSignInWhenSignedIn(context: GuardContext, search: SignInSearch): Promise<void> {
  if (await isSignedIn(context)) throw redirect({ href: afterSignInPath(search) });
}
