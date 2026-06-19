import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────
// Use fake-indexeddb for in-memory IndexedDB
// ──────────────────────────────────────────────
import 'fake-indexeddb/auto';

import type { Record } from '../../types/record';

import {
  cacheRecords,
  getRecord,
  upsertRecordCache,
  deleteRecordCache,
  clearAllRecords,
  getAllCachedRecords,
  getCachedRecordList,
  enqueuePendingOp,
  getPendingOps,
  removePendingOp,
  clearPendingOps,
  pendingOpCount,
  resetDb,
} from './indexeddb';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function createRecord(overrides: Partial<Record> = {}): Record {
  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: 'test-user',
    title: 'Test Record',
    ciphertext: 'base64-cipher',
    nonce: 'base64-nonce',
    salt: 'base64-salt',
    alg_version: 'v1-sodium-xchacha20-poly1305-argon2id',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('IndexedDB storage', () => {
  // Clean IndexedDB between tests
  beforeEach(async () => {
    // Close the cached connection so next call opens a fresh one
    resetDb();
  });

  // Also clear data after each test
  afterEach(async () => {
    try {
      await clearAllRecords();
      await clearPendingOps();
    } catch {
      // Ignore errors if DB not yet initialized
    }
    resetDb();
  });

  describe('Record cache operations', () => {
    it('should cache multiple records and retrieve them', async () => {
      const rec1 = createRecord({ id: 'r1', title: 'Record 1' });
      const rec2 = createRecord({ id: 'r2', title: 'Record 2' });

      await cacheRecords([rec1, rec2]);

      const all = await getAllCachedRecords();
      expect(all).toHaveLength(2);
      expect(all.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    });

    it('should get a single record by id', async () => {
      const rec = createRecord({ id: 'unique-id', title: 'Unique Record' });
      await cacheRecords([rec]);

      const found = await getRecord('unique-id');
      expect(found).toBeDefined();
      expect(found!.title).toBe('Unique Record');
    });

    it('should return undefined for non-existent record', async () => {
      const found = await getRecord('non-existent');
      expect(found).toBeUndefined();
    });

    it('should upsert a single record', async () => {
      const rec = createRecord({ id: 'upsert-1', title: 'Original' });
      await upsertRecordCache(rec);

      const updated = { ...rec, title: 'Updated' };
      await upsertRecordCache(updated);

      const found = await getRecord('upsert-1');
      expect(found!.title).toBe('Updated');
    });

    it('should delete a record from cache', async () => {
      const rec = createRecord({ id: 'delete-me' });
      await upsertRecordCache(rec);

      await deleteRecordCache('delete-me');

      const found = await getRecord('delete-me');
      expect(found).toBeUndefined();
    });

    it('should clear all records', async () => {
      await cacheRecords([createRecord({ id: 'r1' }), createRecord({ id: 'r2' })]);
      await clearAllRecords();

      const all = await getAllCachedRecords();
      expect(all).toHaveLength(0);
    });

    it('should return a record list (without ciphertext fields)', async () => {
      const rec = createRecord({ id: 'list-test', title: 'List Item', tags: ['tag1'] });
      await upsertRecordCache(rec);

      const list = await getCachedRecordList();
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual({
        id: 'list-test',
        title: 'List Item',
        tags: ['tag1'],
        created_at: rec.created_at,
        updated_at: rec.updated_at,
      });
      // Should NOT include cipher fields
      expect(list[0]).not.toHaveProperty('ciphertext');
      expect(list[0]).not.toHaveProperty('nonce');
    });

    it('should handle empty cache gracefully', async () => {
      const all = await getAllCachedRecords();
      expect(all).toEqual([]);

      const list = await getCachedRecordList();
      expect(list).toEqual([]);
    });
  });

  describe('Pending operations queue', () => {
    it('should enqueue and retrieve pending ops', async () => {
      const op = { type: 'upsert' as const, record: createRecord({ id: 'pending-1' }) };
      await enqueuePendingOp(op);

      const ops = await getPendingOps();
      expect(ops).toHaveLength(1);
      expect(ops[0].type).toBe('upsert');
      if (ops[0].type === 'upsert') {
        expect(ops[0].record.id).toBe('pending-1');
      }
    });

    it('should remove a pending op by id', async () => {
      await enqueuePendingOp({ type: 'upsert', record: createRecord({ id: 'r1' }) });
      await enqueuePendingOp({ type: 'delete', id: 'r2' });

      const ops = await getPendingOps();
      expect(ops).toHaveLength(2);

      await removePendingOp(ops[0].id);

      const remaining = await getPendingOps();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].type).toBe('delete');
    });

    it('should clear all pending ops', async () => {
      await enqueuePendingOp({ type: 'upsert', record: createRecord() });
      await enqueuePendingOp({ type: 'delete', id: 'r1' });
      await clearPendingOps();

      const ops = await getPendingOps();
      expect(ops).toHaveLength(0);
    });

    it('should count pending ops', async () => {
      expect(await pendingOpCount()).toBe(0);

      await enqueuePendingOp({ type: 'upsert', record: createRecord() });
      expect(await pendingOpCount()).toBe(1);

      await enqueuePendingOp({ type: 'delete', id: 'r2' });
      expect(await pendingOpCount()).toBe(2);
    });

    it('should handle multiple op types correctly', async () => {
      const op1 = { type: 'upsert' as const, record: createRecord({ id: 'a' }) };
      const op2 = { type: 'delete' as const, id: 'b' };

      await enqueuePendingOp(op1);
      await enqueuePendingOp(op2);

      const ops = await getPendingOps();
      expect(ops).toHaveLength(2);
      expect(ops[0].type).toBe('upsert');
      if (ops[0].type === 'upsert') {
        expect(ops[0].record.id).toBe('a');
      }
      expect(ops[1].type).toBe('delete');
      expect(ops[1].id).toBe('b');
    });
  });
});
