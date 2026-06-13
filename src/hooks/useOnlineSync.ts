/**
 * Online/offline detection + reconciliation hook.
 *
 * While offline, mutating operations are queued in IndexedDB.  When the
 * browser fires the "online" event, the queue is flushed to Supabase in
 * FIFO order.  Failed syncs are left in the queue for the next attempt.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  enqueuePendingOp,
  getPendingOps,
  removePendingOp,
  pendingOpCount,
} from '../lib/storage/indexeddb';
import type { PendingOp } from '../lib/storage/indexeddb';
import {
  upsertRecord,
  deleteRecord,
} from '../lib/storage/supabase';

export interface UseOnlineSyncReturn {
  /** Whether the browser currently reports online. */
  isOnline: boolean;
  /** Number of pending offline operations. */
  pendingCount: number;
  /** Enqueue a mutation (called by repository when offline). */
  enqueue: (op: PendingOp) => Promise<void>;
}

export function useOnlineSync(): UseOnlineSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const flushingRef = useRef(false);

  // ---- Listen to online/offline events ----
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Refresh count on mount
    pendingOpCount().then(setPendingCount);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ---- Flush pending ops when we come back online ----
  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;

    async function flush() {
      if (flushingRef.current) return;
      flushingRef.current = true;

      const ops = await getPendingOps();
      for (const op of ops) {
        if (cancelled) break;
        try {
          if (op.type === 'upsert') {
            await upsertRecord(op.record);
          } else if (op.type === 'delete') {
            await deleteRecord(op.id);
          }
          await removePendingOp(op.id);
        } catch {
          // Leave in queue — will retry next time we come online
          break;
        }
      }

      flushingRef.current = false;
      if (!cancelled) {
        setPendingCount(await pendingOpCount());
      }
    }

    flush();
    return () => { cancelled = true; };
  }, [isOnline]);

  // ---- Enqueue mutation ----
  const enqueue = useCallback(async (op: PendingOp) => {
    await enqueuePendingOp(op);
    setPendingCount(await pendingOpCount());
  }, []);

  return { isOnline, pendingCount, enqueue };
}
