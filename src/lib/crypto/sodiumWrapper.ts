/**
 * Lazy-loaded libsodium wrapper.
 *
 * Uses dynamic import so the ~200 KB WASM blob doesn't block the initial
 * render.  The first call to `ensureSodiumReady()` triggers the download and
 * subsequent calls resolve immediately once loaded.
 */

// The module is typed as a namespace, but we only store it once loaded.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sodiumModule: any = null;
let loadingPromise: Promise<void> | null = null;

async function loadSodium(): Promise<void> {
  // Dynamic import — not included in the static bundle graph
  const sodium = await import('libsodium-wrappers');
  await sodium.ready;
  // After ready, crypto primitives are on .default (e.g. sodium.default.randombytes_buf)
  // while utilities like to_base64/from_base64 are direct named exports.
  // We store the default export for crypto ops and reference named exports directly.
  sodiumModule = sodium.default;
}

export async function ensureSodiumReady(): Promise<void> {
  if (sodiumModule) return;
  if (!loadingPromise) {
    loadingPromise = loadSodium();
  }
  return loadingPromise;
}

// ---------------------------------------------------------------------------
// Public API (delegates to the lazy-loaded module)
// ---------------------------------------------------------------------------

export function genSalt(bytes: number = 16): Uint8Array {
  if (!sodiumModule) throw new Error('Sodium not initialized. Call ensureSodiumReady() first.');
  return sodiumModule.randombytes_buf(bytes);
}

export function genNonce(bytes: number = 24): Uint8Array {
  if (!sodiumModule) throw new Error('Sodium not initialized. Call ensureSodiumReady() first.');
  return sodiumModule.randombytes_buf(bytes);
}

export function toBase64(buf: Uint8Array): string {
  if (!sodiumModule) throw new Error('Sodium not initialized. Call ensureSodiumReady() first.');
  return sodiumModule.to_base64(buf, sodiumModule.base64_variants.ORIGINAL);
}

export function fromBase64(str: string): Uint8Array {
  if (!sodiumModule) throw new Error('Sodium not initialized. Call ensureSodiumReady() first.');
  return sodiumModule.from_base64(str, sodiumModule.base64_variants.ORIGINAL);
}

export function encryptXChaCha20(
  key: Uint8Array,
  plaintext: Uint8Array,
  nonce?: Uint8Array
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  if (!sodiumModule) throw new Error('Sodium not initialized. Call ensureSodiumReady() first.');
  const n = nonce ?? genNonce(24);
  const ciphertext = sodiumModule.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    null,
    null,
    n,
    key
  );
  return { ciphertext, nonce: n };
}

export function decryptXChaCha20(
  key: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array
): Uint8Array {
  if (!sodiumModule) throw new Error('Sodium not initialized. Call ensureSodiumReady() first.');
  return sodiumModule.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    null,
    nonce,
    key
  );
}

export function toUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function fromUint8Array(buf: Uint8Array): string {
  return new TextDecoder().decode(buf);
}
