import { vi } from 'vitest';

// ──────────────────────────────────────────────
// In-memory mock for IndexedDB operations
// ──────────────────────────────────────────────

export function createMockIndexedDB() {
  const records = new Map<string, any>();
  const pendingOps: any[] = [];

  return {
    // Record cache mocks
    cacheRecords: vi.fn(async (recs: any[]) => {
      for (const r of recs) {
        records.set(r.id, r);
      }
    }),
    getRecord: vi.fn(async (id: string) => records.get(id)),
    upsertRecordCache: vi.fn(async (record: any) => {
      records.set(record.id, record);
    }),
    deleteRecordCache: vi.fn(async (id: string) => {
      records.delete(id);
    }),
    clearAllRecords: vi.fn(async () => {
      records.clear();
    }),
    getAllCachedRecords: vi.fn(async () => Array.from(records.values())),
    getCachedRecordList: vi.fn(async () =>
      Array.from(records.values()).map((r) => ({
        id: r.id,
        title: r.title,
        tags: r.tags ?? [],
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    ),

    // Pending ops mocks
    enqueuePendingOp: vi.fn(async (op: any) => {
      pendingOps.push({ ...op, id: pendingOps.length + 1 });
    }),
    getPendingOps: vi.fn(async () => [...pendingOps]),
    removePendingOp: vi.fn(async (id: number) => {
      const idx = pendingOps.findIndex((op) => op.id === id);
      if (idx >= 0) pendingOps.splice(idx, 1);
    }),
    clearPendingOps: vi.fn(async () => {
      pendingOps.length = 0;
    }),
    pendingOpCount: vi.fn(async () => pendingOps.length),
  };
}

// ──────────────────────────────────────────────
// Default mock instance
// ──────────────────────────────────────────────

export const mockIndexedDB = createMockIndexedDB();

export const defaultMockIndexedDB = { ...mockIndexedDB };
