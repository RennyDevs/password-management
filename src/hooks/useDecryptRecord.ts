import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchFullRecord } from '../lib/storage/supabase';
import { decryptPayload } from '../lib/crypto';
import type { Record } from '../types/record';

interface UseDecryptRecordResult {
  /** Attempt to decrypt a full record with the given master password. */
  decryptRecord: (
    recordId: string,
    password: string,
  ) => Promise<{ success: true; plaintext: string; record: Record } | { success: false }>;
  /** Clear any stored error. */
  clearError: () => void;
  error: string;
}

/**
 * Shared hook that encapsulates the common "fetch full record + decrypt"
 * flow used by both Home's edit handler and RecordItem's view handler.
 *
 * Rate-limiting / attempt-counting is handled externally by MasterPasswordModal.
 */
export function useDecryptRecord(): UseDecryptRecordResult {
  const { t } = useTranslation();
  const [error, setError] = useState('');

  const clearError = useCallback(() => setError(''), []);

  const decryptRecord = useCallback(
    async (
      recordId: string,
      password: string,
    ): Promise<{ success: true; plaintext: string; record: Record } | { success: false }> => {
      try {
        const fullRecord = await fetchFullRecord(recordId);
        if (!fullRecord) {
          setError(t('decryptRecord.recordNotFound'));
          return { success: false };
        }

        const plaintext = await decryptPayload(
          password,
          fullRecord.ciphertext,
          fullRecord.nonce,
          fullRecord.salt,
        );

        setError('');
        return { success: true, plaintext, record: fullRecord };
      } catch {
        // Signal failure so MasterPasswordModal can count the attempt.
        // Don't override error here — let the modal show its own message.
        return { success: false };
      }
    },
    [t],
  );

  return { decryptRecord, clearError, error };
}
