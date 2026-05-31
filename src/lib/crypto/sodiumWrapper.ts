import sodium from 'libsodium-wrappers';

let ready = false;

export async function ensureSodiumReady(): Promise<void> {
  if (!ready) {
    await sodium.ready;
    ready = true;
  }
}

export function genSalt(bytes: number = 16): Uint8Array {
  return sodium.randombytes_buf(bytes);
}

export function genNonce(bytes: number = 24): Uint8Array {
  return sodium.randombytes_buf(bytes);
}

export function toBase64(buf: Uint8Array): string {
  return sodium.to_base64(buf, sodium.base64_variants.ORIGINAL);
}

export function fromBase64(str: string): Uint8Array {
  return sodium.from_base64(str, sodium.base64_variants.ORIGINAL);
}

export function encryptXChaCha20(
  key: Uint8Array,
  plaintext: Uint8Array,
  nonce?: Uint8Array
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  const n = nonce ?? genNonce(24);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
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
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
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
