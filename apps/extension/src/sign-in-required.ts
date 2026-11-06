/** Shown to shoppers as is, so it is written for them. */
export const SIGN_IN_REQUIRED_MESSAGE = "Sign in to Picky to save products and compare them";

/**
 * The Picky API answered 401: nobody is signed in to the web app in this browser. Seeing details never
 * needs this; saving and comparing do. The extension holds no credentials of its own: it sends the web
 * app's session cookie, so signing in there is all it takes.
 */
export class SignInRequiredError extends Error {
  override readonly name = "SignInRequiredError";
  constructor() {
    super(SIGN_IN_REQUIRED_MESSAGE);
  }
}

const UNAUTHORIZED = 401;

/**
 * True when a Picky API response means "sign in first".
 *
 * @example if (needsSignIn(response)) throw new SignInRequiredError()
 */
export function needsSignIn(response: Response): boolean {
  return response.status === UNAUTHORIZED;
}
