import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { RecordListItem } from '../types/record';
import { useDecryptRecord } from '../hooks/useDecryptRecord';
import { copyToClipboard } from '../lib/utils/clipboard';
import { offerCredentialForAutofill, parseSecret } from '../lib/credentials/navigatorCredentials';
import MasterPasswordModal from './MasterPasswordModal';
import ConfirmModal from './ConfirmModal';

interface RecordItemProps {
  record: RecordListItem;
  onEdit: (recordId: string) => void;
  onDelete: (recordId: string) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function RecordItem({ record, onEdit, onDelete, onToast }: RecordItemProps) {
  const { t } = useTranslation();
  const { decryptRecord, error } = useDecryptRecord();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [decryptedSecret, setDecryptedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const handleView = () => {
    setDecryptedSecret(null);
    setShowSecret(false);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    const result = await decryptRecord(record.id, password);
    if (!result.success) return false;

    setDecryptedSecret(result.plaintext);
    setShowPasswordModal(false);
    return true;
  };

  const handleCopySecret = async () => {
    if (decryptedSecret) {
      await copyToClipboard(decryptedSecret, 60000, (errMsg) => {
        onToast(
          t('recordItem.clipboardClearFailed', { error: errMsg }),
          'error',
        );
      });
    }
  };

  const handleAutofill = async () => {
    if (!decryptedSecret) return;

    await offerCredentialForAutofill(decryptedSecret, record.title);

    const parsed = parseSecret(decryptedSecret);
    if (parsed && parsed.username) {
      onToast(t('recordItem.autofillStored', { username: parsed.username }), 'success');
    } else {
      onToast(t('recordItem.autofillStoredGeneric'), 'success');
    }
  };

  // Auto-offer credential when the secret is first decrypted
  // (best-effort, silent — the browser may show its own prompt)
  const autofillAttemptedRef = useRef(false);
  if (decryptedSecret !== null && !autofillAttemptedRef.current) {
    autofillAttemptedRef.current = true;
    offerCredentialForAutofill(decryptedSecret, record.title).catch(() => {});
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(record.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {record.title}
            </h3>
            {(record.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {record.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('recordItem.created', { date: format(new Date(record.created_at), 'MMM d, yyyy HH:mm') })}
              {record.updated_at !== record.created_at &&
                ` · ${t('recordItem.updated', { date: format(new Date(record.updated_at), 'MMM d, yyyy HH:mm') })}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleView}
              className="px-3 py-1.5 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              {t('recordItem.view')}
            </button>
            <button
              onClick={() => onEdit(record.id)}
              className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
            >
              {t('recordItem.edit')}
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              {t('recordItem.delete')}
            </button>
          </div>
        </div>

        {/* Decrypted secret display area */}
        {decryptedSecret !== null && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('recordItem.decryptedSecret')}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  aria-label={showSecret ? t('recordItem.hide') : t('recordItem.show')}
                >
                  {showSecret ? t('recordItem.hide') : t('recordItem.show')}
                </button>
                <button
                  onClick={handleCopySecret}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  aria-label={t('recordItem.copy')}
                >
                  {t('recordItem.copy')}
                </button>
                <button
                  onClick={handleAutofill}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-0.5"
                  aria-label={t('recordItem.autofill')}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t('recordItem.autofill')}
                </button>
                <button
                  onClick={() => { setDecryptedSecret(null); setShowSecret(false); }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label={t('recordItem.clear')}
                >
                  {t('recordItem.clear')}
                </button>
              </div>
            </div>
            {showSecret ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {decryptedSecret}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-sm font-mono whitespace-pre-wrap break-all text-transparent dark:text-transparent select-none">
                {'•'.repeat(Math.min(decryptedSecret.length, 100))}
              </pre>
            )}
          </div>
        )}

        {error && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
      </div>

      {showPasswordModal && (
        <MasterPasswordModal
          title={t('recordItem.unlockTitle', { title: record.title })}
          onSubmit={handlePasswordSubmit}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title={t('recordItem.deleteConfirmTitle')}
          message={t('recordItem.deleteConfirmMessage', { title: record.title })}
          confirmLabel={t('recordItem.delete')}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          destructive
        />
      )}
    </>
  );
}
