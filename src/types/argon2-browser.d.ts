declare module 'argon2-browser/dist/argon2-bundled.min.js' {
  export interface Argon2HashOptions {
    pass: string | Uint8Array;
    salt: Uint8Array;
    time?: number;
    mem?: number;
    parallelism?: number;
    type?: number;
    hashLen?: number;
  }

  export interface Argon2HashResult {
    hash: Uint8Array;
    hashHex: string;
    encoded: string;
  }

  export const ArgonType: {
    Argon2d: number;
    Argon2i: number;
    Argon2id: number;
  };

  export function hash(options: Argon2HashOptions): Promise<Argon2HashResult>;
}
