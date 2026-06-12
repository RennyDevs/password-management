import { ensureSodiumReady, genSalt, genNonce, toBase64, fromBase64, encryptXChaCha20, decryptXChaCha20, toUint8Array, fromUint8Array } from './sodiumWrapper';
import { deriveKeyArgon2 } from './argon2';
import { ALG_VERSION } from '../../types/crypto';

export async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  return deriveKeyArgon2(password, salt);
}

export interface EncryptResult {
  ciphertextBase64: string;
  nonceBase64: string;
  saltBase64: string;
  alg_version: string;
}

export async function encryptPlaintext(
  password: string,
  plaintext: string
): Promise<EncryptResult> {
  await ensureSodiumReady();

  const salt = genSalt(16);
  const key = await deriveKey(password, salt);
  const nonce = genNonce(24);
  const plaintextBytes = toUint8Array(plaintext);
  const { ciphertext } = encryptXChaCha20(key, plaintextBytes, nonce);

  return {
    ciphertextBase64: toBase64(ciphertext),
    nonceBase64: toBase64(nonce),
    saltBase64: toBase64(salt),
    alg_version: ALG_VERSION,
  };
}

export async function decryptPayload(
  password: string,
  ciphertextBase64: string,
  nonceBase64: string,
  saltBase64: string
): Promise<string> {
  await ensureSodiumReady();

  const salt = fromBase64(saltBase64);
  const key = await deriveKey(password, salt);
  const nonce = fromBase64(nonceBase64);
  const ciphertext = fromBase64(ciphertextBase64);

  const plaintextBytes = decryptXChaCha20(key, ciphertext, nonce);

  return fromUint8Array(plaintextBytes);
}
