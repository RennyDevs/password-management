import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import RecordList from '../components/RecordList';
import EditRecordModal from '../components/EditRecordModal';
import MasterPasswordModal from '../components/MasterPasswordModal';
import Toast from '../components/Toast';
import { encryptPlaintext } from '../lib/crypto';
import { useUser } from '../lib/auth/UserContext';
import { generateId } from '../lib/utils/uid';
import { useRecords } from '../hooks/useRecords';
import { useDecryptRecord } from '../hooks/useDecryptRecord';
import { useToast } from '../hooks/useToast';
import type { Record } from '../types/record';

export default function Home() {
  const { t } = useTranslation();
  const user = useUser();
  const { records, loading, persistRecord, deleteRecord: deleteRecordById } = useRecords();
  const { decryptRecord } = useDecryptRecord();
  const { toasts, addToast, dismissToast } = useToast();

  // ---- Edit modal state ----

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSecret, setEditSecret] = useState('');

  // ---- Master-password prompt state ----

  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordPurpose, setPasswordPurpose] = useState<'save' | 'edit'>('save');

  // Pending-save payload (only set when purpose === 'save')
  const [pendingSave, setPendingSave] = useState<{ title: string; secret: string } | null>(null);

  // ---- Record CRUD ----

  // Open empty creation form
  const handleNewRecord = useCallback(() => {
    setEditingRecordId(null);
    setEditTitle('');
    setEditSecret('');
    setEditModalOpen(true);
  }, []);

  // Request decryption for an edit
  const handleEdit = useCallback((recordId: string) => {
    setEditingRecordId(recordId);
    setPendingSave(null);
    setPasswordPurpose('edit');
    setEditModalOpen(false); // will open after decrypt
    setPasswordPromptOpen(true);
  }, []);

  // Save from modal → open master-password prompt
  const handleSaveRecord = useCallback(async (title: string, secret: string): Promise<void> => {
    setPendingSave({ title, secret });
    setEditModalOpen(false);
    setPasswordPurpose('save');
    setPasswordPromptOpen(true);
  }, []);

  // ---- Master-password handlers ----

  const handlePasswordForSave = useCallback(
    async (password: string): Promise<boolean> => {
      if (!pendingSave || !user) {
        throw new Error(t('home.unexpectedError'));
      }

      try {
        const encrypted = await encryptPlaintext(password, pendingSave.secret);

        const recordId = editingRecordId || generateId();
        const now = new Date().toISOString();
        const isUpdate = editingRecordId !== null;

        const record: Record = {
          id: recordId,
          user_id: user.id,
          title: pendingSave.title,
          ciphertext: encrypted.ciphertextBase64,
          nonce: encrypted.nonceBase64,
          salt: encrypted.saltBase64,
          alg_version: encrypted.alg_version,
          created_at: now,
          updated_at: now,
        };

        await persistRecord(record, isUpdate);
        addToast(
          isUpdate ? t('home.recordUpdated') : t('home.recordCreated'),
          'success',
        );

        setPasswordPromptOpen(false);
        setPendingSave(null);
        setEditingRecordId(null);
        return true;
      } catch (err) {
        // Network / Supabase errors are technical, not password-related
        console.error('handlePasswordForSave failed:', err);
        addToast(t('home.failedSaveRecord'), 'error');
        throw new Error(t('home.failedSaveRecord'));
      }
    },
    [pendingSave, user, editingRecordId, persistRecord, addToast, t],
  );

  const handlePasswordForEdit = useCallback(
    async (password: string): Promise<boolean> => {
      if (!editingRecordId) {
        throw new Error(t('home.unexpectedError'));
      }

      const result = await decryptRecord(editingRecordId, password);
      // decryptRecord returns { success: false } only when the password is wrong
      // (decryption failed because the derived key didn't match)
      if (!result.success) return false;

      setEditTitle(result.record.title);
      setEditSecret(result.plaintext);
      setEditModalOpen(true);
      setPasswordPromptOpen(false);
      return true;
    },
    [editingRecordId, decryptRecord],
  );

  const handleDelete = useCallback(
    async (recordId: string) => {
      try {
        await deleteRecordById(recordId);
        addToast(t('home.recordDeleted'), 'success');
      } catch {
        addToast(t('home.failedDeleteRecord'), 'error');
      }
    },
    [deleteRecordById, addToast, t],
  );

  // ---- Render ----

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('home.welcomeHeading')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">{t('home.welcomeText')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('home.myRecords')}
        </h2>
        <button
          onClick={handleNewRecord}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('home.newRecord')}
        </button>
      </div>

      <RecordList
        records={records}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToast={addToast}
      />

      {editModalOpen && (
        <EditRecordModal
          title={editTitle}
          secret={editSecret}
          onSave={handleSaveRecord}
          onCancel={() => {
            setEditModalOpen(false);
            setEditingRecordId(null);
          }}
          mode={editingRecordId ? 'edit' : 'create'}
        />
      )}

      {passwordPromptOpen && (
        <MasterPasswordModal
          title={
            passwordPurpose === 'save'
              ? t('home.confirmMasterPasswordSave')
              : t('home.enterMasterPasswordEdit')
          }
          onSubmit={
            passwordPurpose === 'save'
              ? handlePasswordForSave
              : handlePasswordForEdit
          }
          onCancel={() => {
            setPasswordPromptOpen(false);
            setPendingSave(null);
            setEditingRecordId(null);
          }}
        />
      )}

      <Toast messages={toasts} onDismiss={dismissToast} />
    </div>
  );
}
