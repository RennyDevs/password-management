import { vi } from 'vitest';

// ──────────────────────────────────────────────
// Mock libsodium wrapper
// ──────────────────────────────────────────────

export function createMockSodiumWrapper() {
  // Helper: convert string to Uint8Array
  const encode = (s: string) => new TextEncoder().encode(s);
  const decode = (b: Uint8Array) => new TextDecoder().decode(b);

  return {
    ensureSodiumReady: vi.fn(async () => {}),
    genSalt: vi.fn((bytes = 16) => new Uint8Array(bytes).fill(0xAB)),
    genNonce: vi.fn((bytes = 24) => new Uint8Array(bytes).fill(0xCD)),
    toBase64: vi.fn((buf: Uint8Array) => btoa(String.fromCharCode(...buf))),
    fromBase64: vi.fn((str: string) => {
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }),
    encryptXChaCha20: vi.fn((key: Uint8Array, plaintext: Uint8Array, nonce?: Uint8Array) => ({
      key,
      ciphertext: plaintext, // passthrough for tests
      nonce: nonce ?? new Uint8Array(24).fill(0xCD),
    })),
    decryptXChaCha20: vi.fn((key: Uint8Array, ciphertext: Uint8Array, _nonce: Uint8Array) => {
      // Simulate decryption failure for wrong keys
      if (key.length === 0) throw new Error('Decryption failed');
      return ciphertext;
    }),
    toUint8Array: vi.fn((str: string) => encode(str)),
    fromUint8Array: vi.fn((buf: Uint8Array) => decode(buf)),
  };
}

// ──────────────────────────────────────────────
// Mock Argon2 / key derivation
// ──────────────────────────────────────────────

export function createMockArgon2() {
  return {
    deriveKeyArgon2: vi.fn(async (password: string, salt: Uint8Array) => {
      // Return a deterministic key based on password + salt
      const encoder = new TextEncoder();
      const combined = encoder.encode(password + '::' + Array.from(salt).join(','));
      const hash = new Uint8Array(32);
      for (let i = 0; i < Math.min(combined.length, 32); i++) {
        hash[i] = combined[i];
      }
      return hash;
    }),
  };
}

// ──────────────────────────────────────────────
// Mock crypto/index.ts (high-level API)
// ──────────────────────────────────────────────

export function createMockCrypto() {
  const mockSalt = new Uint8Array(16).fill(0xAB);
  const mockNonce = new Uint8Array(24).fill(0xCD);

  return {
    deriveKey: vi.fn(async (password: string) => {
      const encoder = new TextEncoder();
      const combined = encoder.encode(password + '::salt');
      const hash = new Uint8Array(32);
      for (let i = 0; i < Math.min(combined.length, 32); i++) {
        hash[i] = combined[i];
      }
      return hash;
    }),
    encryptPlaintext: vi.fn(async (password: string, plaintext: string) => {
      const encoder = new TextEncoder();
      const ptBytes = encoder.encode(plaintext);
      return {
        password,
        ciphertextBase64: btoa(String.fromCharCode(...ptBytes)),
        nonceBase64: btoa(String.fromCharCode(...mockNonce)),
        saltBase64: btoa(String.fromCharCode(...mockSalt)),
        alg_version: 'v1-sodium-xchacha20-poly1305-argon2id',
      };
    }),
    decryptPayload: vi.fn(
      async (
        password: string,
        ciphertextBase64: string,
        _nonceBase64: string,
        _saltBase64: string,
      ) => {
        if (password === 'wrong-password') {
          throw new Error('Decryption failed');
        }
        const binary = atob(ciphertextBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      },
    ),
  };
}

// ──────────────────────────────────────────────
// Default mock instances for direct import
// ──────────────────────────────────────────────

export const mockSodium = createMockSodiumWrapper();
export const mockArgon2 = createMockArgon2();
export const mockCrypto = createMockCrypto();
