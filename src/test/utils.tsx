import { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import UserContext from '../lib/auth/UserContext';

// ──────────────────────────────────────────────
// Mock user factory
// ──────────────────────────────────────────────
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  } as User;
}

// ──────────────────────────────────────────────
// Mock record factory
// ──────────────────────────────────────────────
export function createMockRecord(overrides: Partial<import('../types/record').Record> = {}): import('../types/record').Record {
  return {
    id: 'record-1',
    user_id: 'test-user-id',
    title: 'Test Record',
    ciphertext: 'base64ciphertext',
    nonce: 'base64nonce',
    salt: 'base64salt',
    alg_version: 'v1-sodium-xchacha20-poly1305-argon2id',
    tags: ['test'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockRecordListItem(overrides: Partial<import('../types/record').RecordListItem> = {}): import('../types/record').RecordListItem {
  return {
    id: 'record-1',
    title: 'Test Record',
    tags: ['test'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ──────────────────────────────────────────────
// Custom render with providers
// ──────────────────────────────────────────────

interface CustomRenderOptions extends Omit<RenderOptions, 'queries'> {
  user?: User | null;
}

function AllTheProviders({ children, user }: { children: React.ReactNode; user?: User | null }) {
  return (
    <UserContext.Provider value={user ?? null}>
      {children}
    </UserContext.Provider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { user, ...renderOptions }: CustomRenderOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AllTheProviders user={user}>{children}</AllTheProviders>;
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

export * from '@testing-library/react';
