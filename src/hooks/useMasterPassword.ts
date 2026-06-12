import { useState, useCallback } from 'react';
import { encryptPlaintext } from '../lib/crypto';
import { generateId } from '../lib/utils/uid';
import type { Record } from '../types/record';

interface PendingSave {
  title: string;
  secret: string;
}

export interface MasterPasswordHandlers {
  /** Called when a record is ready to be persisted after successful encryption. */
  onRecordEncrypted: (record: Record, isUpdate: boolean) => Promise<void>;
}

/**
 * Hook that manages the master-password prompt lifecycle.
 *
 * It exposes a `promptForSave` to open the modal and
 * `handlePasswordForSave` that MasterPasswordModal.onSubmit can call.
 *
 * The `promptForEdit` flow is intentionally kept in the component because
 * the decryption + modal-open logic varies too much to abstract cleanly.
 */
export function useMasterPassword(handlers: MasterPasswordHandlers) {
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // ---- Openers ----

  const promptForSave = useCallback(
    (recordId: string | null, title: string, secret: string) => {
      setEditingRecordId(recordId);
      setPendingSave({ title, secret });
      setPasswordPromptOpen(true);
    },
    [],
  );

  // ---- Handler passed to MasterPasswordModal.onSubmit ----

  const handlePasswordForSave = useCallback(
    async (password: string): Promise<boolean> => {
      if (!pendingSave) return false;

      try {
        const encrypted = await encryptPlaintext(password, pendingSave.secret);

        const recordId = editingRecordId || generateId();
        const now = new Date().toISOString();
        const isUpdate = editingRecordId !== null;

        // `user_id` will be set by the caller; the hook doesn't own auth
        const record: Record = {
          id: recordId,
          user_id: '', // filled by caller in onRecordEncrypted
          title: pendingSave.title,
          ciphertext: encrypted.ciphertextBase64,
          nonce: encrypted.nonceBase64,
          salt: encrypted.saltBase64,
          alg_version: encrypted.alg_version,
          created_at: isUpdate ? '' : now,
          updated_at: now,
        };

        await handlers.onRecordEncrypted(record, isUpdate);

        setPasswordPromptOpen(false);
        setPendingSave(null);
        setEditingRecordId(null);
        return true;
      } catch {
        return false;
      }
    },
    [pendingSave, editingRecordId, handlers],
  );

  const cancelPrompt = useCallback(() => {
    setPasswordPromptOpen(false);
    setPendingSave(null);
    setEditingRecordId(null);
  }, []);

  return {
    passwordPromptOpen,
    pendingSave,
    editingRecordId,
    promptForSave,
    handlePasswordForSave,
    cancelPrompt,
  };
}
