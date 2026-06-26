import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../lib/utils/logger';
import RecordList from '../components/RecordList';
import EditRecordModal from '../components/EditRecordModal';
import MasterPasswordModal from '../components/MasterPasswordModal';
import ToastContainer from '../components/ui/Toast';
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
        logger.error('handlePasswordForSave failed', err);
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
          <div className="w-12 h-12 rounded-xl bg-slate-700/50 border border-slate-600/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-200 mb-1">
            {t('home.welcomeHeading')}
          </h2>
          <p className="text-sm text-slate-400">{t('home.welcomeText')}</p>
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
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">{t('home.myRecords')}</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {records.length} {records.length === 1 ? 'record' : 'records'} · {filteredRecords.length !== records.length && `${filteredRecords.length} shown`}
          </p>
        </div>
        <button onClick={handleNewRecord} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('home.newRecord')}
        </button>
      </div>

      {/* Search & Tag filters */}
      <div className="mb-6 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            className="vault-input pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">{t('home.filterByTags')}:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setFilterTags((prev) =>
                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                  )
                }
                className={`${
                  filterTags.includes(tag) ? 'tag-chip-active' : 'tag-chip hover:bg-cyan-500/15 hover:border-cyan-500/30'
                } cursor-pointer text-[11px]`}
              >
                {tag}
              </button>
            ))}
            {filterTags.length > 0 && (
              <button
                onClick={() => setFilterTags([])}
                className="px-2 py-0.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                {t('home.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Record count when filtered */}
      {(searchQuery || filterTags.length > 0) && filteredRecords.length > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          {t('home.showingResults', { count: filteredRecords.length, total: records.length })}
        </p>
      )}

      {/* Record list */}
      <RecordList
        records={filteredRecords}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToast={addToast}
      />

      {/* Modals */}
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

      <ToastContainer messages={toasts} onDismiss={dismissToast} />
    </div>
  );
}
