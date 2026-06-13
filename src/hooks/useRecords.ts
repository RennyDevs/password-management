import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../lib/auth/UserContext';
import {
  getUserRecordList,
  getUserFullRecord,
  saveRecord,
  removeRecord,
} from '../lib/storage/repository';
import type { RecordListItem, Record } from '../types/record';

interface UseRecordsReturn {
  records: RecordListItem[];
  loading: boolean;
  loadRecords: (force?: boolean) => Promise<void>;
  /** Persist a new or updated record (already encrypted). */
  persistRecord: (record: Record) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  getFullRecord: (recordId: string) => Promise<Record | null>;
}

/**
 * Hook that owns the record-list state: fetching, CRUD, visibility-change
 * reload, and race-condition guards.
 */
export function useRecords(): UseRecordsReturn {
  const user = useUser();
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const loadRecords = useCallback(
    async (force = false) => {
      if (!user) return;
      if (loadingRef.current) return;
      if (!force && loadedRef.current && userIdRef.current === user.id) return;

      userIdRef.current = user.id;
      loadingRef.current = true;
      setLoading(true);
      try {
        const data = await getUserRecordList(user.id);
        setRecords(data);
        loadedRef.current = true;
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [user],
  );

  // Initial load + reload on tab-visibility change
  useEffect(() => {
    loadRecords();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadRecords(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadRecords]);

  // ---- CRUD operations ----

  const persistRecord = useCallback(
    async (record: Record) => {
      await saveRecord(record);
      await loadRecords(true);
    },
    [loadRecords],
  );

  const deleteRecordById = useCallback(
    async (recordId: string) => {
      await removeRecord(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    },
    [],
  );

  const getFullRecord = useCallback(
    async (recordId: string): Promise<Record | null> => {
      return getUserFullRecord(recordId);
    },
    [],
  );

  return {
    records,
    loading,
    loadRecords,
    persistRecord,
    deleteRecord: deleteRecordById,
    getFullRecord,
  };
}
