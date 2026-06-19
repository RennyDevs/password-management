import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────
// Mock Supabase client factory
// ──────────────────────────────────────────────

export interface MockSupabaseOptions {
  records?: Record<string, unknown>[];
  user?: { id: string; email: string } | null;
  shouldFail?: boolean;
}

export function createMockSupabaseClient(
  _options: MockSupabaseOptions = {},
): SupabaseClient {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockUpsert = vi.fn().mockReturnThis();

  // Builder pattern: each method returns the builder
  const builder: Record<string, any> = {
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
    delete: mockDelete,
    upsert: mockUpsert,
  };
  builder.from = vi.fn().mockReturnValue(builder);

  // Default mock implementations
  mockSelect.mockImplementation(() => builder);
  mockEq.mockImplementation(() => builder);
  mockSingle.mockImplementation(() => builder);
  mockOrder.mockImplementation(() => builder);
  mockDelete.mockImplementation(() => builder);

  // ── Auth mock ──
  const mockSignUp = vi.fn();
  const mockSignInWithPassword = vi.fn();
  const mockSignOut = vi.fn();
  const mockGetUser = vi.fn();
  const mockUpdateUser = vi.fn();
  const mockOnAuthStateChange = vi.fn();

  return {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: vi.fn().mockReturnValue(builder),
  } as unknown as SupabaseClient;
}

// ──────────────────────────────────────────────
// Default mock for the supabase module
// ──────────────────────────────────────────────

export const mockSupabaseClient = createMockSupabaseClient();

export const defaultMockSupabase = {
  initSupabase: vi.fn().mockReturnValue(mockSupabaseClient),
  getSupabaseClient: vi.fn().mockReturnValue(mockSupabaseClient),
  fetchRecords: vi.fn(),
  fetchFullRecord: vi.fn(),
  upsertRecord: vi.fn(),
  deleteRecord: vi.fn(),
};

// ──────────────────────────────────────────────
// Hook to reset all mocks between tests
// ──────────────────────────────────────────────

export function resetSupabaseMocks() {
  vi.clearAllMocks();
  defaultMockSupabase.fetchRecords.mockReset();
  defaultMockSupabase.fetchFullRecord.mockReset();
  defaultMockSupabase.upsertRecord.mockReset();
  defaultMockSupabase.deleteRecord.mockReset();
}
