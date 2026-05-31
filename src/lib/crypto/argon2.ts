// @ts-ignore - use bundled dist file with embedded wasm
import * as argon2 from 'argon2-browser/dist/argon2-bundled.min.js';

const ARGON2_PARAMS = {
  timeCost: 3,
  memory: 65536, // 64 MB
  parallelism: 1,
  type: argon2.ArgonType.Argon2id,
  hashLength: 32,
};

export async function deriveKeyArgon2(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  try {
    const result = await argon2.hash({
      pass: password,
      salt: new Uint8Array(salt),
      time: ARGON2_PARAMS.timeCost,
      mem: ARGON2_PARAMS.memory,
      parallelism: ARGON2_PARAMS.parallelism,
      type: ARGON2_PARAMS.type,
      hashLen: ARGON2_PARAMS.hashLength,
    });
    return new Uint8Array(result.hash);
  } catch (err) {
    console.error('Argon2 failed, falling back to PBKDF2:', err);
    return deriveKeyPbkdf2(password, salt);
  }
}

async function deriveKeyPbkdf2(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );
  const keyBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return new Uint8Array(keyBits);
}
