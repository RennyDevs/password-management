import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────
// Mock argon2-browser
// ──────────────────────────────────────────────

const mockHash = vi.fn();
const mockArgon2Module = {
  ArgonType: {
    Argon2d: 0,
    Argon2i: 1,
    Argon2id: 2,
  },
  hash: mockHash,
  default: {
    ArgonType: {
      Argon2d: 0,
      Argon2i: 1,
      Argon2id: 2,
    },
    hash: mockHash,
  },
};

vi.mock('argon2-browser/dist/argon2-bundled.min.js', () => mockArgon2Module);

// ──────────────────────────────────────────────
// import under test
// ──────────────────────────────────────────────
import { deriveKeyArgon2 } from './argon2';

describe('deriveKeyArgon2', () => {
  const password = 'test-password';
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should derive a key using Argon2id', async () => {
    const expectedHash = new Uint8Array(32).fill(0x42);
    mockHash.mockResolvedValue({ hash: expectedHash, hashHex: '42'.repeat(32), encoded: 'mock' });

    const result = await deriveKeyArgon2(password, salt);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
    expect(mockHash).toHaveBeenCalledWith({
      pass: password,
      salt: expect.any(Uint8Array),
      time: 3,
      mem: 65536,
      parallelism: 1,
      type: 2, // Argon2id
      hashLen: 32,
    });
  });

  it('should produce a deterministic output for same inputs', async () => {
    const expectedHash = new Uint8Array(32).fill(0xAB);
    mockHash.mockResolvedValue({ hash: expectedHash, hashHex: 'ab'.repeat(32), encoded: 'mock' });

    const result1 = await deriveKeyArgon2(password, salt);
    const result2 = await deriveKeyArgon2(password, salt);

    expect(result1).toEqual(result2);
  });

  it('should produce different outputs for different passwords', async () => {
    const hash1 = new Uint8Array(32).fill(0x01);
    const hash2 = new Uint8Array(32).fill(0x02);

    mockHash
      .mockResolvedValueOnce({ hash: hash1, hashHex: '01'.repeat(32), encoded: 'mock' })
      .mockResolvedValueOnce({ hash: hash2, hashHex: '02'.repeat(32), encoded: 'mock' });

    const result1 = await deriveKeyArgon2('password1', salt);
    const result2 = await deriveKeyArgon2('password2', salt);

    expect(result1).not.toEqual(result2);
  });

  it('should fall back to PBKDF2 when Argon2 fails', async () => {
    // Suppress the expected fallback warning log
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockHash.mockRejectedValue(new Error('Argon2 unavailable'));

    // Mock crypto.subtle for PBKDF2 fallback
    const mockImportKey = vi.fn().mockResolvedValue('key-material');
    const mockDeriveBits = vi.fn().mockResolvedValue(new Uint8Array(32).fill(0xFF));

    const originalSubtle = globalThis.crypto.subtle;
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: {
        importKey: mockImportKey,
        deriveBits: mockDeriveBits,
      },
      writable: true,
      configurable: true,
    });

    const result = await deriveKeyArgon2(password, salt);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
    expect(mockImportKey).toHaveBeenCalled();
    expect(mockDeriveBits).toHaveBeenCalled();

    // Restore
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: originalSubtle,
      writable: true,
      configurable: true,
    });

    warnSpy.mockRestore();
  });

  it('should handle empty password gracefully', async () => {
    const expectedHash = new Uint8Array(32).fill(0x00);
    mockHash.mockResolvedValue({ hash: expectedHash, hashHex: '00'.repeat(32), encoded: 'mock' });

    const result = await deriveKeyArgon2('', salt);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });

  it('should handle different salt sizes', async () => {
    const expectedHash = new Uint8Array(32).fill(0x42);
    mockHash.mockResolvedValue({ hash: expectedHash, hashHex: '42'.repeat(32), encoded: 'mock' });

    const shortSalt = new Uint8Array([1, 2, 3]);
    const longSalt = new Uint8Array(64).fill(0xAB);

    await deriveKeyArgon2(password, shortSalt);
    expect(mockHash).toHaveBeenCalledWith(
      expect.objectContaining({ salt: shortSalt }),
    );

    await deriveKeyArgon2(password, longSalt);
    expect(mockHash).toHaveBeenCalledWith(
      expect.objectContaining({ salt: longSalt }),
    );
  });
});
