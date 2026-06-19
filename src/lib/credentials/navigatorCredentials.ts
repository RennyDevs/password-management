/**
 * Thin wrapper around the Credential Management API
 * (`navigator.credentials`) for autofill integration.
 *
 * The Credential Management API is only available in secure contexts
 * (HTTPS or localhost). All functions gracefully degrade in insecure
 * contexts or unsupported browsers.
 */

/**
 * Check whether `navigator.credentials` is available.
 */
function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'credentials' in navigator;
}

/**
 * Parse a decrypted secret into a username+password pair.
 *
 * Heuristics:
 * 1. If the secret contains a line with `username` / `user` / `email`
 *    label followed by a value, extract both fields.
 * 2. If a single line looks like `username:password` (colon or equals),
 *    split it.
 * 3. Otherwise return the raw secret as the password.
 *
 * Returns `null` when the secret is empty.
 */
export function parseSecret(
  secret: string,
): { username: string; password: string } | null {
  if (!secret || !secret.trim()) return null;

  const lines = secret.split('\n').map((l) => l.trim()).filter(Boolean);

  let username = '';
  let password = '';

  // Heuristic 1: labelled lines
  const userLabels = /^(username|user|email|login)\s*[:=]\s*(.+)/i;
  const passLabels = /^(password|pass|secret|pw)\s*[:=]\s*(.+)/i;

  for (const line of lines) {
    const userMatch = line.match(userLabels);
    if (userMatch && !username) {
      username = userMatch[2].trim();
      continue;
    }
    const passMatch = line.match(passLabels);
    if (passMatch && !password) {
      password = passMatch[2].trim();
      continue;
    }
    // If we haven't found a password yet, grab the first non-username line
    if (!password && !userMatch) {
      password = line;
    }
  }

  // Heuristic 2: single-line `user:pass` or `user=pass`
  if (!username && !password && lines.length === 1) {
    const sep = lines[0].match(/^(.+?)[:=](.+)$/);
    if (sep) {
      username = sep[1].trim();
      password = sep[2].trim();
    } else {
      password = lines[0];
    }
  }

  if (!username && !password) return null;
  return { username: username || '', password: password || '' };
}

/**
 * Store a PasswordCredential so the browser offers to save / autofill it.
 *
 * This is a hint — the browser may ignore it (e.g. when the user declined
 * the credential prompt, when the feature is disabled, or when the credential
 * is already stored).
 */
export async function storeCredential(credential: PasswordCredential): Promise<void> {
  if (!isSupported()) return;
  try {
    await navigator.credentials.store(credential);
  } catch {
    // Browsers may throw if the user dismissed the save-password prompt;
    // silently ignore.
  }
}

/**
 * Create a `PasswordCredential` from a username / password pair and the
 * current origin.
 *
 * Returns `null` when the Credential Management API is unavailable.
 */
export function createPasswordCredential(
  username: string,
  password: string,
  name?: string,
): PasswordCredential | null {
  if (!isSupported()) return null;
  try {
    // `PasswordCredential` constructor is available on Chromium-based browsers.
    return new PasswordCredential({
      id: username,
      password,
      name: name ?? '',
    });
  } catch {
    return null;
  }
}

/**
 * Silently request stored credentials for the current origin.
 *
 * Returns the first matching credential (mediation: 'silent'), or `null`
 * if nothing is stored or the API is unavailable.
 */
export async function getSilentCredential(): Promise<PasswordCredential | null> {
  if (!isSupported()) return null;
  try {
    const cred = await navigator.credentials.get({
      password: true,
      mediation: 'silent',
    });
    return cred as PasswordCredential | null;
  } catch {
    return null;
  }
}

/**
 * Try to fill the username / password fields of a form with a stored
 * credential (silent mediation).  Returns `true` when a credential was
 * found and the callbacks were invoked.
 */
export async function tryAutofill(
  onFill: (username: string, password: string) => void,
): Promise<boolean> {
  const cred = await getSilentCredential();
  if (cred && 'password' in cred) {
    onFill(cred.id, cred.password as string);
    return true;
  }
  return false;
}

/**
 * Store a decrypted record's parsed secret as a browser credential for
 * autofill on the current origin.
 *
 * This should be called *after* the user successfully decrypts a record
 * and opts to autofill it (e.g. by clicking an "Autofill" button) or
 * automatically when viewing a decrypted secret.
 */
export async function offerCredentialForAutofill(
  secret: string,
  title?: string,
): Promise<void> {
  const parsed = parseSecret(secret);
  if (!parsed) return;

  const cred = createPasswordCredential(
    parsed.username,
    parsed.password,
    title,
  );
  if (cred) {
    await storeCredential(cred);
  }
}
