import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────
// Mock dependencies — hoisted to avoid TDZ
// ──────────────────────────────────────────────

const {
  mockFetchRecords,
  mockFetchFullRecord,
  mockUpsertRecord,
  mockDeleteRecord,
  mockUpsertRecordCache,
  mockDeleteRecordCache,
  mockGetCachedRecordList,
  mockGetRecord,
  mockEnqueuePendingOp,
} = vi.hoisted(() => ({
  mockFetchRecords: vi.fn(),
  mockFetchFullRecord: vi.fn(),
  mockUpsertRecord: vi.fn(),
  mockDeleteRecord: vi.fn(),
  mockUpsertRecordCache: vi.fn(),
  mockDeleteRecordCache: vi.fn(),
  mockGetCachedRecordList: vi.fn(),
  mockGetRecord: vi.fn(),
  mockEnqueuePendingOp: vi.fn(),
}));

vi.mock('../../lib/storage/supabase', () => ({
  fetchRecords: mockFetchRecords,
  fetchFullRecord: mockFetchFullRecord,
  upsertRecord: mockUpsertRecord,
  deleteRecord: mockDeleteRecord,
}));

vi.mock('../../lib/storage/indexeddb', () => ({
  upsertRecordCache: mockUpsertRecordCache,
  deleteRecordCache: mockDeleteRecordCache,
  getCachedRecordList: mockGetCachedRecordList,
  getRecord: mockGetRecord,
  enqueuePendingOp: mockEnqueuePendingOp,
}));

// ──────────────────────────────────────────────
// Import module under test
// ──────────────────────────────────────────────

import {
  getUserRecordList,
  getUserFullRecord,
  saveRecord,
  removeRecord,
} from '../../lib/storage/repository';

describe('Repository (storage integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate online by default
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  describe('getUserRecordList', () => {
    it('should fetch records from Supabase when online', async () => {
      const mockData = [{ id: 'r1', title: 'Record 1', tags: [], created_at: '', updated_at: '' }];
      mockFetchRecords.mockResolvedValue(mockData);

      const result = await getUserRecordList('user-1');

      expect(result).toEqual(mockData);
      expect(mockFetchRecords).toHaveBeenCalledWith('user-1');
      expect(mockGetCachedRecordList).not.toHaveBeenCalled();
    });

    it('should fall back to IndexedDB cache when Supabase fails', async () => {
      mockFetchRecords.mockRejectedValue(new Error('Network error'));
      const cachedData = [{ id: 'r1', title: 'Cached Record', tags: [], created_at: '', updated_at: '' }];
      mockGetCachedRecordList.mockResolvedValue(cachedData);

      const result = await getUserRecordList('user-1');

      expect(result).toEqual(cachedData);
      expect(mockGetCachedRecordList).toHaveBeenCalled();
    });
  });

  describe('getUserFullRecord', () => {
    it('should fetch full record from Supabase when online', async () => {
      const mockRecord = { id: 'r1', user_id: 'u1', title: 'Full', ciphertext: 'c', nonce: 'n', salt: 's', alg_version: 'v', tags: [], created_at: '', updated_at: '' };
      mockFetchFullRecord.mockResolvedValue(mockRecord);

      const result = await getUserFullRecord('r1');

      expect(result).toEqual(mockRecord);
      expect(mockFetchFullRecord).toHaveBeenCalledWith('r1');
    });

    it('should fall back to IndexedDB cache when Supabase fails', async () => {
      mockFetchFullRecord.mockRejectedValue(new Error('Not found'));
      const cachedRecord = { id: 'r1', user_id: 'u1', title: 'Cached', ciphertext: 'c', nonce: 'n', salt: 's', alg_version: 'v', tags: [], created_at: '', updated_at: '' };
      mockGetRecord.mockResolvedValue(cachedRecord);

      const result = await getUserFullRecord('r1');

      expect(result).toEqual(cachedRecord);
      expect(mockGetRecord).toHaveBeenCalledWith('r1');
    });

    it('should return null when both sources fail', async () => {
      mockFetchFullRecord.mockRejectedValue(new Error('Error'));
      mockGetRecord.mockResolvedValue(undefined);

      const result = await getUserFullRecord('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('saveRecord', () => {
    const recordData = {
      id: 'r1',
      user_id: 'u1',
      title: 'Test',
      ciphertext: 'c',
      nonce: 'n',
      salt: 's',
      alg_version: 'v1',
      tags: ['tag1'],
    };

    it('should write through to Supabase and cache when online', async () => {
      mockUpsertRecord.mockResolvedValue(undefined);

      await saveRecord(recordData);

      // Should update cache first (optimistic)
      expect(mockUpsertRecordCache).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1', title: 'Test' }),
      );
      // Then Supabase
      expect(mockUpsertRecord).toHaveBeenCalled();
    });

    it('should queue in IndexedDB when Supabase fails', async () => {
      mockUpsertRecord.mockRejectedValue(new Error('Server error'));

      await expect(saveRecord(recordData)).rejects.toThrow('Saved locally');

      // Should have queued the operation
      expect(mockEnqueuePendingOp).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'upsert' }),
      );
    });

    it('should queue operation when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      await saveRecord(recordData);

      // Should still update cache
      expect(mockUpsertRecordCache).toHaveBeenCalled();
      // Should queue for later sync
      expect(mockEnqueuePendingOp).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'upsert' }),
      );
      // Should NOT try Supabase
      expect(mockUpsertRecord).not.toHaveBeenCalled();
    });

    it('should set defaults for missing optional fields', async () => {
      mockUpsertRecord.mockResolvedValue(undefined);

      const minimalRecord = {
        id: 'r2',
        user_id: 'u1',
        title: 'Minimal',
        ciphertext: 'c',
        nonce: 'n',
        salt: 's',
        alg_version: 'v1',
      };

      await saveRecord(minimalRecord as any);

      expect(mockUpsertRecordCache).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'r2',
          tags: [],
          created_at: expect.any(String),
          updated_at: expect.any(String),
        }),
      );
    });
  });

  describe('removeRecord', () => {
    it('should remove from cache and Supabase when online', async () => {
      mockDeleteRecord.mockResolvedValue(undefined);

      await removeRecord('r1');

      expect(mockDeleteRecordCache).toHaveBeenCalledWith('r1');
      expect(mockDeleteRecord).toHaveBeenCalledWith('r1');
    });

    it('should queue delete operation when Supabase fails', async () => {
      mockDeleteRecord.mockRejectedValue(new Error('Server error'));

      await expect(removeRecord('r1')).rejects.toThrow('Deleted locally');

      expect(mockEnqueuePendingOp).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'delete', id: 'r1' }),
      );
    });

    it('should queue delete when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      await removeRecord('r1');

      expect(mockDeleteRecordCache).toHaveBeenCalledWith('r1');
      expect(mockEnqueuePendingOp).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'delete' }),
      );
      expect(mockDeleteRecord).not.toHaveBeenCalled();
    });
  });
});
