import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────
// Mock sodiumWrapper — hoisted to avoid TDZ with vi.mock
// ──────────────────────────────────────────────

const {
  mockGenSalt,
  mockGenNonce,
  mockToBase64,
  mockFromBase64,
  mockEncryptXChaCha20,
  mockDecryptXChaCha20,
  mockToUint8Array,
  mockFromUint8Array,
  mockEnsureSodiumReady,
} = vi.hoisted(() => ({
  mockGenSalt: vi.fn(),
  mockGenNonce: vi.fn(),
  mockToBase64: vi.fn(),
  mockFromBase64: vi.fn(),
  mockEncryptXChaCha20: vi.fn(),
  mockDecryptXChaCha20: vi.fn(),
  mockToUint8Array: vi.fn(),
  mockFromUint8Array: vi.fn(),
  mockEnsureSodiumReady: vi.fn(),
}));

vi.mock('./sodiumWrapper', () => ({
  ensureSodiumReady: mockEnsureSodiumReady,
  genSalt: mockGenSalt,
  genNonce: mockGenNonce,
  toBase64: mockToBase64,
  fromBase64: mockFromBase64,
  encryptXChaCha20: mockEncryptXChaCha20,
  decryptXChaCha20: mockDecryptXChaCha20,
  toUint8Array: mockToUint8Array,
  fromUint8Array: mockFromUint8Array,
}));

// ──────────────────────────────────────────────
// Mock argon2
// ──────────────────────────────────────────────

const { mockDeriveKeyArgon2 } = vi.hoisted(() => ({
  mockDeriveKeyArgon2: vi.fn(),
}));
vi.mock('./argon2', () => ({
  deriveKeyArgon2: mockDeriveKeyArgon2,
}));

// ──────────────────────────────────────────────
// Import module under test
// ──────────────────────────────────────────────

import { deriveKey, encryptPlaintext, decryptPayload } from './index';

describe('crypto/index', () => {
  const password = 'master-password';
  const plaintext = 'my-secret-password-123!';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deriveKey', () => {
    it('should delegate to deriveKeyArgon2', async () => {
      const salt = new Uint8Array([1, 2, 3]);
      const expectedKey = new Uint8Array(32).fill(0x42);
      mockDeriveKeyArgon2.mockResolvedValue(expectedKey);

      const result = await deriveKey(password, salt);

      expect(result).toBe(expectedKey);
      expect(mockDeriveKeyArgon2).toHaveBeenCalledWith(password, salt);
    });
  });

  describe('encryptPlaintext', () => {
    it('should encrypt plaintext and return base64 fields', async () => {
      const salt = new Uint8Array(16).fill(0xAB);
      const nonce = new Uint8Array(24).fill(0xCD);
      const key = new Uint8Array(32).fill(0x42);
      const ptBytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
      const ciphertext = new Uint8Array([1, 2, 3, 4, 5]);

      mockEnsureSodiumReady.mockResolvedValue(undefined);
      mockGenSalt.mockReturnValue(salt);
      mockDeriveKeyArgon2.mockResolvedValue(key);
      mockGenNonce.mockReturnValue(nonce);
      mockToUint8Array.mockReturnValue(ptBytes);
      mockEncryptXChaCha20.mockReturnValue({ ciphertext, nonce });
      mockToBase64
        .mockReturnValueOnce('base64-ciphertext')
        .mockReturnValueOnce('base64-nonce')
        .mockReturnValueOnce('base64-salt');

      const result = await encryptPlaintext(password, plaintext);

      expect(result).toEqual({
        ciphertextBase64: 'base64-ciphertext',
        nonceBase64: 'base64-nonce',
        saltBase64: 'base64-salt',
        alg_version: 'v1-sodium-xchacha20-poly1305-argon2id',
      });

      expect(mockEnsureSodiumReady).toHaveBeenCalled();
      expect(mockGenSalt).toHaveBeenCalledWith(16);
      expect(mockDeriveKeyArgon2).toHaveBeenCalledWith(password, salt);
      expect(mockGenNonce).toHaveBeenCalledWith(24);
      expect(mockToUint8Array).toHaveBeenCalledWith(plaintext);
      expect(mockEncryptXChaCha20).toHaveBeenCalledWith(key, ptBytes, nonce);
    });

    it('should produce deterministic shape for different inputs', async () => {
      mockEnsureSodiumReady.mockResolvedValue(undefined);
      mockGenSalt.mockReturnValue(new Uint8Array(16).fill(0xAB));
      mockGenNonce.mockReturnValue(new Uint8Array(24).fill(0xCD));
      mockDeriveKeyArgon2.mockResolvedValue(new Uint8Array(32).fill(0x42));
      mockToUint8Array.mockReturnValue(new Uint8Array([1, 2, 3]));
      mockEncryptXChaCha20.mockReturnValue({
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array(24).fill(0xCD),
      });
      mockToBase64.mockReturnValue('dGVzdA==');

      const result = await encryptPlaintext('pass1', 'data1');
      expect(result).toHaveProperty('ciphertextBase64');
      expect(result).toHaveProperty('nonceBase64');
      expect(result).toHaveProperty('saltBase64');
      expect(result).toHaveProperty('alg_version');
      expect(result.alg_version).toBe('v1-sodium-xchacha20-poly1305-argon2id');
    });
  });

  describe('decryptPayload', () => {
    it('should decrypt ciphertext and return plaintext', async () => {
      const salt = new Uint8Array(16).fill(0xAB);
      const nonce = new Uint8Array(24).fill(0xCD);
      const key = new Uint8Array(32).fill(0x42);
      const ciphertext = new Uint8Array([1, 2, 3, 4, 5]);
      const ptBytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"

      mockEnsureSodiumReady.mockResolvedValue(undefined);
      mockFromBase64
        .mockReturnValueOnce(salt)
        .mockReturnValueOnce(nonce)
        .mockReturnValueOnce(ciphertext);
      mockDeriveKeyArgon2.mockResolvedValue(key);
      mockDecryptXChaCha20.mockReturnValue(ptBytes);
      mockFromUint8Array.mockReturnValue('hello');

      const result = await decryptPayload(
        password,
        'base64-ciphertext',
        'base64-nonce',
        'base64-salt',
      );

      expect(result).toBe('hello');
      expect(mockEnsureSodiumReady).toHaveBeenCalled();
      expect(mockFromBase64).toHaveBeenCalledTimes(3);
      expect(mockDeriveKeyArgon2).toHaveBeenCalledWith(password, salt);
      expect(mockDecryptXChaCha20).toHaveBeenCalledWith(key, ciphertext, nonce);
    });

    it('should throw on wrong password (decryption failure)', async () => {
      const salt = new Uint8Array(16).fill(0xAB);
      const nonce = new Uint8Array(24).fill(0xCD);

      mockEnsureSodiumReady.mockResolvedValue(undefined);
      mockFromBase64
        .mockReturnValueOnce(salt)
        .mockReturnValueOnce(nonce)
        .mockReturnValueOnce(new Uint8Array([1, 2, 3]));
      mockDeriveKeyArgon2.mockResolvedValue(new Uint8Array(32).fill(0x42));
      mockDecryptXChaCha20.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      await expect(
        decryptPayload('wrong-password', 'ct', 'n', 's'),
      ).rejects.toThrow();
    });
  });

  describe('round-trip', () => {
    it('should encrypt and decrypt successfully (mocked)', async () => {
      // Simulate full round-trip with deterministic mocks
      const inputText = 'my-super-secret-42!';
      const salt = new Uint8Array(16).fill(0xAB);
      const nonce = new Uint8Array(24).fill(0xCD);
      const key = new Uint8Array(32).fill(0x42);
      const ptBytes = new TextEncoder().encode(inputText);
      const ciphertext = new Uint8Array([0x01, 0x02, 0x03]);

      // Encrypt setup
      mockEnsureSodiumReady.mockResolvedValue(undefined);
      mockGenSalt.mockReturnValue(salt);
      mockDeriveKeyArgon2.mockResolvedValue(key);
      mockGenNonce.mockReturnValue(nonce);
      mockToUint8Array.mockReturnValue(ptBytes);
      mockEncryptXChaCha20.mockReturnValue({ ciphertext, nonce });
      mockToBase64
        .mockReturnValueOnce('ct-base64')
        .mockReturnValueOnce('nonce-base64')
        .mockReturnValueOnce('salt-base64');

      const encrypted = await encryptPlaintext('password', inputText);

      // Decrypt setup
      mockFromBase64
        .mockReturnValueOnce(salt)
        .mockReturnValueOnce(nonce)
        .mockReturnValueOnce(ciphertext);
      mockDecryptXChaCha20.mockReturnValue(ptBytes);
      mockFromUint8Array.mockReturnValue(inputText);

      const decrypted = await decryptPayload(
        'password',
        encrypted.ciphertextBase64,
        encrypted.nonceBase64,
        encrypted.saltBase64,
      );

      expect(decrypted).toBe(inputText);
    });
  });
});
