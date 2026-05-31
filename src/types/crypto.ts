export interface EncryptedPayload {
  ciphertext: string; // base64
  nonce: string;      // base64
  salt: string;       // base64
  alg_version: string;
}

export interface CryptoParams {
  timeCost: number;
  memory: number;      // KB
  parallelism: number;
  saltBytes: number;
  nonceBytes: number;
}

export const DEFAULT_CRYPTO_PARAMS: CryptoParams = {
  timeCost: 3,
  memory: 65536,
  parallelism: 1,
  saltBytes: 16,
  nonceBytes: 24,
};

export const ALG_VERSION = 'v1-sodium-xchacha20-poly1305-argon2id';
