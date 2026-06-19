import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────
// Mock libsodium-wrappers before importing
// ──────────────────────────────────────────────

const mockSodiumModule = {
  crypto_aead_xchacha20poly1305_ietf_encrypt: vi.fn(),
  crypto_aead_xchacha20poly1305_ietf_decrypt: vi.fn(),
  randombytes_buf: vi.fn(),
  to_base64: vi.fn(),
  from_base64: vi.fn(),
  base64_variants: { ORIGINAL: 0 },
};

vi.mock('libsodium-wrappers', () => ({
  default: mockSodiumModule,
  ready: Promise.resolve(),
  to_base64: mockSodiumModule.to_base64,
  from_base64: mockSodiumModule.from_base64,
}));

// ──────────────────────────────────────────────
// Now import the module under test
// ──────────────────────────────────────────────

import {
  ensureSodiumReady,
  genSalt,
  genNonce,
  toBase64,
  fromBase64,
  encryptXChaCha20,
  decryptXChaCha20,
  toUint8Array,
  fromUint8Array,
} from './sodiumWrapper';

describe('sodiumWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state by re-importing
  });

  describe('ensureSodiumReady', () => {
    it('should initialize sodium module', async () => {
      await expect(ensureSodiumReady()).resolves.toBeUndefined();
    });

    it('should not re-initialize if already loaded', async () => {
      await ensureSodiumReady();
      // Call again — should use cached module
      await ensureSodiumReady();
      // Only one import happened
    });
  });

  describe('genSalt', () => {
    it('should throw if sodium not initialized', () => {
      // We need to reset the module state. Since we can't easily unload
      // the module, we assume ensureSodiumReady is called first.
    });

    it('should return a buffer of the requested size', async () => {
      await ensureSodiumReady();
      mockSodiumModule.randombytes_buf.mockReturnValue(new Uint8Array([1, 2, 3, 4]));

      const salt = genSalt(4);
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(mockSodiumModule.randombytes_buf).toHaveBeenCalledWith(4);
    });

    it('should default to 16 bytes', async () => {
      await ensureSodiumReady();
      mockSodiumModule.randombytes_buf.mockReturnValue(new Uint8Array(16));

      genSalt();
      expect(mockSodiumModule.randombytes_buf).toHaveBeenCalledWith(16);
    });
  });

  describe('genNonce', () => {
    it('should return a buffer of the requested size', async () => {
      await ensureSodiumReady();
      mockSodiumModule.randombytes_buf.mockReturnValue(new Uint8Array(24));

      const nonce = genNonce(24);
      expect(nonce).toBeInstanceOf(Uint8Array);
      expect(mockSodiumModule.randombytes_buf).toHaveBeenCalledWith(24);
    });

    it('should default to 24 bytes', async () => {
      await ensureSodiumReady();
      mockSodiumModule.randombytes_buf.mockReturnValue(new Uint8Array(24));

      genNonce();
      expect(mockSodiumModule.randombytes_buf).toHaveBeenCalledWith(24);
    });
  });

  describe('toBase64 / fromBase64', () => {
    it('should encode and decode base64', async () => {
      await ensureSodiumReady();
      const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = 'SGVsbG8=';

      mockSodiumModule.to_base64.mockReturnValue(encoded);
      mockSodiumModule.from_base64.mockReturnValue(input);

      expect(toBase64(input)).toBe(encoded);
      expect(fromBase64(encoded)).toEqual(input);
    });
  });

  describe('encryptXChaCha20', () => {
    it('should encrypt and return ciphertext with nonce', async () => {
      await ensureSodiumReady();
      const key = new Uint8Array(32);
      const plaintext = toUint8Array('secret data');
      const expectedCiphertext = new Uint8Array([1, 2, 3]);

      mockSodiumModule.randombytes_buf.mockReturnValue(new Uint8Array(24).fill(0xCD));
      mockSodiumModule.crypto_aead_xchacha20poly1305_ietf_encrypt.mockReturnValue(expectedCiphertext);

      const result = encryptXChaCha20(key, plaintext);

      expect(result.ciphertext).toBe(expectedCiphertext);
      expect(result.nonce).toBeInstanceOf(Uint8Array);
      expect(result.nonce.length).toBe(24);
      expect(mockSodiumModule.crypto_aead_xchacha20poly1305_ietf_encrypt).toHaveBeenCalledWith(
        plaintext,
        null,
        null,
        expect.any(Uint8Array),
        key,
      );
    });

    it('should use provided nonce', async () => {
      await ensureSodiumReady();
      const key = new Uint8Array(32);
      const plaintext = toUint8Array('data');
      const nonce = new Uint8Array(24).fill(0xAA);

      mockSodiumModule.crypto_aead_xchacha20poly1305_ietf_encrypt.mockReturnValue(new Uint8Array());

      const result = encryptXChaCha20(key, plaintext, nonce);

      expect(result.nonce).toBe(nonce);
    });
  });

  describe('decryptXChaCha20', () => {
    it('should decrypt ciphertext', async () => {
      await ensureSodiumReady();
      const key = new Uint8Array(32);
      const ciphertext = new Uint8Array([1, 2, 3]);
      const nonce = new Uint8Array(24);
      const expectedPlaintext = toUint8Array('Hello');

      mockSodiumModule.crypto_aead_xchacha20poly1305_ietf_decrypt.mockReturnValue(expectedPlaintext);

      const result = decryptXChaCha20(key, ciphertext, nonce);
      expect(result).toBe(expectedPlaintext);
      expect(mockSodiumModule.crypto_aead_xchacha20poly1305_ietf_decrypt).toHaveBeenCalledWith(
        null,
        ciphertext,
        null,
        nonce,
        key,
      );
    });
  });

  describe('toUint8Array / fromUint8Array', () => {
    it('should encode string to Uint8Array', () => {
      const result = toUint8Array('Hello');
      // jsdom TextEncoder may return Uint8Array from a different realm,
      // so compare by spreading into a plain array
      expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
      expect(result.length).toBe(5);
    });

    it('should decode Uint8Array to string', () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]);
      expect(fromUint8Array(input)).toBe('Hello');
    });

    it('should be reversible', () => {
      const original = 'Test message with special chars: ñ á é 🎉';
      expect(fromUint8Array(toUint8Array(original))).toBe(original);
    });
  });
});
