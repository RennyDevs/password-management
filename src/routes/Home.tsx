import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import RecordList from '../components/RecordList';
import EditRecordModal from '../components/EditRecordModal';
import MasterPasswordModal from '../components/MasterPasswordModal';
import Toast, { type ToastMessage } from '../components/Toast';
import { fetchRecords, fetchFullRecord, deleteRecord, upsertRecord } from '../lib/storage/supabase';
import { upsertRecordCache, deleteRecordCache } from '../lib/storage/indexeddb';
import { encryptPlaintext, decryptPayload } from '../lib/crypto';
import { generateId } from '../lib/utils/uid';
import type { RecordListItem, Record } from '../types/record';
import { useUser } from '../App';

let toastCounter = 0;
function nextToastId(): string {
  return `toast-${++toastCounter}`;
}

export default function Home() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const user = useUser();
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSecret, setEditSecret] = useState('');

  // Password prompt for encrypt on save
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ title: string; secret: string } | null>(null);

  const addToastRef = useRef((text: string, type: ToastMessage['type'] = 'info') => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  });

  const loadRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchRecords(user.id);
      setRecords(data);
    } catch (err) {
      addToastRef.current(tRef.current('home.failedLoadRecords'), 'error');
      console.error('Load records error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // New record
  const handleNewRecord = () => {
    setEditingRecordId(null);
    setEditTitle('');
    setEditSecret('');
    setEditModalOpen(true);
  };

  // Edit record
  const handleEdit = async (recordId: string) => {
    // Open password prompt first to decrypt
    setEditingRecordId(recordId);
    setPendingSave(null);
    setPasswordPromptOpen(true);
  };

  const handlePasswordForEdit = async (password: string): Promise<boolean> => {
    if (!editingRecordId) return false;
    try {
      const fullRecord = await fetchFullRecord(editingRecordId);
      if (!fullRecord) {
        addToast(t('home.recordNotFound'), 'error');
        return false;
      }

      const plaintext = await decryptPayload(
        password,
        fullRecord.ciphertext,
        fullRecord.nonce,
        fullRecord.salt
      );

      setEditTitle(fullRecord.title);
      setEditSecret(plaintext);
      setEditModalOpen(true);
      setPasswordPromptOpen(false);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveRecord = async (title: string, secret: string) => {
    setPendingSave({ title, secret });
    setEditModalOpen(false);
    setPasswordPromptOpen(true);
  };

  const handlePasswordForSave = async (password: string): Promise<boolean> => {
    if (!pendingSave) return false;
    if (!user) {
      addToast(t('home.mustBeLoggedIn'), 'error');
      return false;
    }

    try {
      const encrypted = await encryptPlaintext(password, pendingSave.secret);

      const recordId = editingRecordId || generateId();
      const now = new Date().toISOString();

      const record: Record = {
        id: recordId,
        user_id: user.id,
        title: pendingSave.title,
        ciphertext: encrypted.ciphertextBase64,
        nonce: encrypted.nonceBase64,
        salt: encrypted.saltBase64,
        alg_version: encrypted.alg_version,
        created_at: editingRecordId ? undefined as unknown as string : now,
        updated_at: now,
      };

      await upsertRecord(record);
      await upsertRecordCache(record);

      addToast(
        editingRecordId ? t('home.recordUpdated') : t('home.recordCreated'),
        'success'
      );

      setPasswordPromptOpen(false);
      setPendingSave(null);
      setEditingRecordId(null);
      await loadRecords();
      return true;
    } catch (err) {
      addToast(t('home.failedSaveRecord'), 'error');
      console.error('Save error:', err);
      return false;
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      await deleteRecord(recordId);
      await deleteRecordCache(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      addToast(t('home.recordDeleted'), 'success');
    } catch (err) {
      addToast(t('home.failedDeleteRecord'), 'error');
      console.error('Delete error:', err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('home.welcomeHeading')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('home.welcomeText')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('home.myRecords')}</h2>
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
      />

      {/* Edit/Create modal */}
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

      {/* Password prompt for encrypt/decrypt */}
      {passwordPromptOpen && (
        <MasterPasswordModal
          title={pendingSave ? t('home.confirmMasterPasswordSave') : t('home.enterMasterPasswordEdit')}
          onSubmit={pendingSave ? handlePasswordForSave : handlePasswordForEdit}
          onCancel={() => {
            setPasswordPromptOpen(false);
            setPendingSave(null);
            setEditingRecordId(null);
          }}
        />
      )}

      <Toast messages={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
