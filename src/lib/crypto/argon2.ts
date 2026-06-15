interface Argon2HashOptions {
  pass: string | Uint8Array;
  salt: Uint8Array;
  time?: number;
  mem?: number;
  parallelism?: number;
  type?: number;
  hashLen?: number;
}

interface Argon2HashResult {
  hash: Uint8Array;
  hashHex: string;
  encoded: string;
}

interface Argon2Module {
  ArgonType: {
    Argon2d: number;
    Argon2i: number;
    Argon2id: number;
  };
  hash(options: Argon2HashOptions): Promise<Argon2HashResult>;
}

let argon2Module: Argon2Module | null = null;

const ARGON2_PARAMS = {
  timeCost: 3,
  memory: 65536, // 64 MB
  parallelism: 1,
  hashLength: 32,
};

async function ensureArgon2(): Promise<Argon2Module> {
  if (argon2Module) return argon2Module;
  const module = await import('argon2-browser/dist/argon2-bundled.min.js');
  argon2Module = module as unknown as Argon2Module;
  return argon2Module;
}

export async function deriveKeyArgon2(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  try {
    const argon2 = await ensureArgon2();
    const result = await argon2.hash({
      pass: password,
      salt: new Uint8Array(salt),
      time: ARGON2_PARAMS.timeCost,
      mem: ARGON2_PARAMS.memory,
      parallelism: ARGON2_PARAMS.parallelism,
      type: argon2.ArgonType.Argon2id,
      hashLen: ARGON2_PARAMS.hashLength,
    });
    return new Uint8Array(result.hash);
  } catch (err) {
    console.warn('Argon2 failed, falling back to PBKDF2:', err);
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
