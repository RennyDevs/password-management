/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// ──────────────────────────────────────────────
// Cleanup after each test
// ──────────────────────────────────────────────
afterEach(() => {
  cleanup();
});

// ──────────────────────────────────────────────
// Mock `import.meta.env`
// ──────────────────────────────────────────────
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_REAUTHENTICATE_BEFORE_PASSWORD_CHANGE: 'false',
      PROD: false,
      DEV: true,
      MODE: 'test',
    },
  },
});

// ──────────────────────────────────────────────
// Mock `navigator.onLine`
// ──────────────────────────────────────────────
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
});

// ──────────────────────────────────────────────
// Mock `navigator.language` for i18n
// ──────────────────────────────────────────────
Object.defineProperty(navigator, 'language', {
  value: 'en',
  writable: true,
  configurable: true,
});

// ──────────────────────────────────────────────
// Fake `crypto.subtle` for PBKDF2 fallback in tests
// ──────────────────────────────────────────────
if (!globalThis.crypto) {
  (globalThis as any).crypto = {};
}

if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, 'subtle', {
    value: {
      importKey: vi.fn(),
      deriveBits: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
}

// ──────────────────────────────────────────────
// Mock `window.matchMedia` (used by some UI libraries)
// ──────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ──────────────────────────────────────────────
// Suppress specific console warnings in tests
// ──────────────────────────────────────────────
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const suppressed = [
    'ReactDOMTestUtils.act is deprecated',
    '`React` is not defined',
  ];
  if (suppressed.some((s) => typeof args[0] === 'string' && args[0].includes(s))) {
    return;
  }
  originalWarn.call(console, ...args);
};

// ──────────────────────────────────────────────
// Mock `ResizeObserver` (used by some libs)
// ──────────────────────────────────────────────
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ──────────────────────────────────────────────
// Mock i18n instance — return key as fallback, interpolate simple values
// ──────────────────────────────────────────────
const mockI18n = {
  language: 'en',
  languages: ['en'],
  changeLanguage: vi.fn(),
  t: (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    let result = key;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{{${k}}}`, String(v));
    }
    return result;
  },
  use: vi.fn().mockReturnThis(),
  init: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  getFixedT: vi.fn(() => (key: string) => key),
  isInitialized: true,
  options: {},
};
vi.mock('@/lib/i18n/i18n', () => ({
  default: mockI18n,
}));

// ──────────────────────────────────────────────
// Mock react-i18next — return key as fallback
// ──────────────────────────────────────────────
vi.mock('react-i18next', () => {
  const mockT = (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    let result = key;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{{${k}}}`, String(v));
    }
    return result;
  };
  return {
    useTranslation: () => ({
      t: mockT,
      i18n: { language: 'en', changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() },
      ready: true,
    }),
    initReactI18next: { type: '3rdParty', init: vi.fn() },
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});
