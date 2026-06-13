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
  const [editTags, setEditTags] = useState<string[]>([]);

  // ---- Filter state ----

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // ---- Master-password prompt state ----

  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordPurpose, setPasswordPurpose] = useState<'save' | 'edit'>('save');

  // Pending-save payload (only set when purpose === 'save')
  const [pendingSave, setPendingSave] = useState<{ title: string; secret: string; tags: string[] } | null>(null);

  // ---- Record CRUD ----

  // Open empty creation form
  const handleNewRecord = useCallback(() => {
    setEditingRecordId(null);
    setEditTitle('');
    setEditSecret('');
    setEditTags([]);
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
  const handleSaveRecord = useCallback(async (title: string, secret: string, tags: string[]): Promise<void> => {
    setPendingSave({ title, secret, tags });
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
          tags: pendingSave.tags ?? [],
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
      setEditTags(result.record.tags ?? []);
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

  // Derived: all unique tags from records
  const allTags = [...new Set(records.flatMap((r) => r.tags ?? []))].sort();

  // Derived: filtered records
  const filteredRecords = records.filter((r) => {
    // Title search (case-insensitive)
    const query = searchQuery.trim().toLowerCase();
    if (query && !r.title.toLowerCase().includes(query)) return false;
    // Tag filter (AND: record must have all selected tags)
    if (filterTags.length > 0 && !filterTags.every((t) => (r.tags ?? []).includes(t))) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
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

      {/* Search & Tag filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">{t('home.filterByTags')}:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setFilterTags((prev) =>
                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                  )
                }
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterTags.includes(tag)
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
            {filterTags.length > 0 && (
              <button
                onClick={() => setFilterTags([])}
                className="px-2 py-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
              >
                {t('home.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Result count when filtered */}
      {(searchQuery || filterTags.length > 0) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t('home.showingResults', { count: filteredRecords.length, total: records.length })}
        </p>
      )}

      <RecordList
        records={filteredRecords}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToast={addToast}
      />

      {editModalOpen && (
        <EditRecordModal
          title={editTitle}
          secret={editSecret}
          tags={editTags}
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
