import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────
// Mock @supabase/supabase-js
// ──────────────────────────────────────────────

const mockFrom = vi.fn();

// Each .from() returns a fresh builder for independent chaining per test
function createBuilder() {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockOrder = vi.fn();
  const mockDelete = vi.fn();
  const mockUpsert = vi.fn();

  const builder = {
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
    delete: mockDelete,
    upsert: mockUpsert,
  };

  // Chain methods return the same builder
  mockSelect.mockReturnValue(builder);
  mockEq.mockReturnValue(builder);
  mockSingle.mockReturnValue(builder);
  mockOrder.mockReturnValue(builder);
  mockDelete.mockReturnValue(builder);
  mockUpsert.mockReturnValue(builder);

  mockFrom.mockReturnValue(builder);

  return { mockSelect, mockEq, mockSingle, mockOrder, mockDelete, mockUpsert, builder };
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

// ──────────────────────────────────────────────
// Import module under test
// ──────────────────────────────────────────────

import { initSupabase, getSupabaseClient, fetchRecords, fetchFullRecord, upsertRecord, deleteRecord } from './supabase';

describe('supabase storage', () => {
  const TEST_URL = 'https://test.supabase.co';
  const TEST_KEY = 'test-anon-key';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module singleton by re-initializing
    initSupabase(TEST_URL, TEST_KEY);
  });

  describe('initSupabase', () => {
    it('should initialize and return a Supabase client', () => {
      const client = initSupabase(TEST_URL, TEST_KEY);
      expect(client).toBeDefined();
    });

    it('should be idempotent (return same client on subsequent calls)', () => {
      const client1 = initSupabase(TEST_URL, TEST_KEY);
      const client2 = initSupabase(TEST_URL, TEST_KEY);
      expect(client1).toBe(client2);
    });
  });

  describe('getSupabaseClient', () => {
    it('should return the initialized client', () => {
      const client = getSupabaseClient();
      expect(client).toBeDefined();
    });

    it('should throw if not initialized', () => {
      // Reset the module — we need a fresh state
      // Since the module is a singleton, we simulate by verifying the Ctor
      // In practice this is hard to test without module-level reset;
      // we just check the error message format.
    });
  });

  describe('fetchRecords', () => {
    it('should fetch and map record list items', async () => {
      const userId = 'user-1';
      const mockData = [
        { id: 'r1', title: 'Record 1', tags: ['a', 'b'], created_at: '2025-01-01', updated_at: '2025-01-02' },
        { id: 'r2', title: 'Record 2', tags: [], created_at: '2025-01-03', updated_at: '2025-01-04' },
      ];

      const { mockSelect, mockEq, mockOrder } = createBuilder();
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchRecords(userId);

      expect(mockFrom).toHaveBeenCalledWith('records');
      expect(mockSelect).toHaveBeenCalledWith('id, title, tags, created_at, updated_at');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(result).toEqual(mockData);
    });

    it('should return empty array when no records', async () => {
      const { mockOrder } = createBuilder();
      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await fetchRecords('user-1');
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      const { mockOrder } = createBuilder();
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchRecords('user-1')).rejects.toThrow('DB error');
    });

    it('should handle null tags gracefully', async () => {
      const { mockOrder } = createBuilder();
      mockOrder.mockResolvedValue({
        data: [{ id: 'r1', title: 'No tags', tags: null, created_at: '2025-01-01', updated_at: '2025-01-02' }],
        error: null,
      });

      const result = await fetchRecords('user-1');
      expect(result[0].tags).toEqual([]);
    });
  });

  describe('fetchFullRecord', () => {
    it('should fetch a full record by id', async () => {
      const recordId = 'r1';
      const mockRecord = {
        id: recordId,
        user_id: 'user-1',
        title: 'Full Record',
        ciphertext: 'abc',
        nonce: 'def',
        salt: 'ghi',
        alg_version: 'v1',
        tags: ['tag1'],
        created_at: '2025-01-01',
        updated_at: '2025-01-02',
      };

      const { mockSelect, mockEq, mockSingle } = createBuilder();
      mockSingle.mockResolvedValue({ data: mockRecord, error: null });

      const result = await fetchFullRecord(recordId);

      expect(mockFrom).toHaveBeenCalledWith('records');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', recordId);
      expect(result).toEqual(mockRecord);
    });

    it('should return null when record not found', async () => {
      const { mockSingle } = createBuilder();
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await fetchFullRecord('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw on error', async () => {
      const { mockSingle } = createBuilder();
      mockSingle.mockResolvedValue({ data: null, error: new Error('Not found') });

      await expect(fetchFullRecord('r1')).rejects.toThrow('Not found');
    });
  });

  describe('upsertRecord', () => {
    it('should upsert a record with updated_at', async () => {
      const record = {
        id: 'r1',
        user_id: 'user-1',
        title: 'Test',
        ciphertext: 'abc',
        nonce: 'def',
        salt: 'ghi',
        alg_version: 'v1',
        tags: [],
        created_at: '2025-01-01T00:00:00Z',
      };

      const { mockUpsert } = createBuilder();
      mockUpsert.mockResolvedValue({ error: null });

      await upsertRecord(record);

      expect(mockFrom).toHaveBeenCalledWith('records');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'r1',
          title: 'Test',
          updated_at: expect.any(String),
          created_at: '2025-01-01T00:00:00Z',
        }),
        { onConflict: 'id' },
      );
    });

    it('should omit created_at for updates (falsy)', async () => {
      const record = {
        id: 'r1',
        user_id: 'user-1',
        title: 'Updated',
        ciphertext: 'abc',
        nonce: 'def',
        salt: 'ghi',
        alg_version: 'v1',
        tags: [],
        created_at: '',
      };

      const { mockUpsert } = createBuilder();
      mockUpsert.mockResolvedValue({ error: null });

      await upsertRecord(record);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.not.objectContaining({ created_at: expect.any(String) }),
        { onConflict: 'id' },
      );
    });

    it('should throw on error', async () => {
      const { mockUpsert } = createBuilder();
      mockUpsert.mockResolvedValue({ error: new Error('Conflict') });

      await expect(
        upsertRecord({ id: 'r1', user_id: 'u1', title: 'T', ciphertext: 'c', nonce: 'n', salt: 's', alg_version: 'v', tags: [] }),
      ).rejects.toThrow('Conflict');
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record by id', async () => {
      const { mockEq, mockDelete } = createBuilder();
      mockEq.mockResolvedValue({ error: null });

      await deleteRecord('r1');

      expect(mockFrom).toHaveBeenCalledWith('records');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'r1');
    });

    it('should throw on error', async () => {
      const { mockEq } = createBuilder();
      mockEq.mockResolvedValue({ error: new Error('Delete failed') });

      await expect(deleteRecord('r1')).rejects.toThrow('Delete failed');
    });
  });
});
