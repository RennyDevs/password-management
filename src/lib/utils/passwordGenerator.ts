/**
 * Secure password generator using crypto.getRandomValues.
 */

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
}

export const DEFAULT_LENGTH = 20;

/**
 * Generate a cryptographically secure password.
 */
export function generatePassword(options: PasswordGeneratorOptions): string {
  let charset = LOWERCASE;

  // Guarantee at least one character from each enabled set
  const guarantees: string[] = [];

  if (options.uppercase) {
    charset += UPPERCASE;
    guarantees.push(randomChar(UPPERCASE));
  }
  if (options.digits) {
    charset += DIGITS;
    guarantees.push(randomChar(DIGITS));
  }
  if (options.symbols) {
    charset += SYMBOLS;
    guarantees.push(randomChar(SYMBOLS));
  }

  // Fill remaining positions with random chars from full charset
  const remaining = options.length - guarantees.length;
  const remainingChars: string[] = [];
  for (let i = 0; i < remaining; i++) {
    remainingChars.push(randomChar(charset));
  }

  // Shuffle all characters together (Fisher-Yates)
  const allChars = [...guarantees, ...remainingChars];
  for (let i = allChars.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
  }

  return allChars.join('');
}

function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxRand = Math.pow(2, bytesNeeded * 8);
  const maxValid = maxRand - (maxRand % range);

  let rand: number;
  do {
    rand = cryptoRandomUint(bytesNeeded);
  } while (rand >= maxValid);

  return min + (rand % range);
}

function randomChar(charset: string): string {
  return charset[randomInt(0, charset.length - 1)];
}

function cryptoRandomUint(bytes: number): number {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);

  let value = 0;
  for (let i = 0; i < bytes; i++) {
    value = (value << 8) | buf[i];
  }
  return value;
}

/**
 * Estimate password strength in bits of entropy.
 */
export function estimateStrength(password: string): {
  score: number; // 0–4
  label: string; // 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  bits: number;
} {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32;
  const bits = password.length * Math.log2(pool || 26);

  let score: number;
  let label: string;
  if (bits < 40) {
    score = 0;
    label = 'weak';
  } else if (bits < 60) {
    score = 1;
    label = 'fair';
  } else if (bits < 80) {
    score = 2;
    label = 'good';
  } else if (bits < 100) {
    score = 3;
    label = 'strong';
  } else {
    score = 4;
    label = 'very-strong';
  }

  return { score, label, bits: Math.round(bits) };
}
