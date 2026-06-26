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
      onToast(t('recordItem.copy'), 'success');
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

  const hasTags = (record.tags?.length ?? 0) > 0;

  return (
    <>
      <div className="vault-card-hover p-4 group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-slate-100 truncate text-sm leading-tight">
                  {record.title}
                </h3>
                {hasTags && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {record.tags.map((tag) => (
                      <span
                        key={tag}
                        className="tag-chip text-[10px] leading-none"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-10">
              {t('recordItem.created', { date: format(new Date(record.created_at), 'MMM d, yyyy HH:mm') })}
              {record.updated_at !== record.created_at &&
                ` · ${t('recordItem.updated', { date: format(new Date(record.updated_at), 'MMM d, yyyy HH:mm') })}`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleView}
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
              title={t('recordItem.view')}
              aria-label={t('recordItem.view')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => onEdit(record.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
              title={t('recordItem.edit')}
              aria-label={t('recordItem.edit')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title={t('recordItem.delete')}
              aria-label={t('recordItem.delete')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Decrypted secret display area */}
        {decryptedSecret !== null && (
          <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-600/30 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t('recordItem.decryptedSecret')}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="px-2 py-1 rounded text-xs text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                  aria-label={showSecret ? t('recordItem.hide') : t('recordItem.show')}
                >
                  {showSecret ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleCopySecret}
                  className="px-2 py-1 rounded text-xs text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                  aria-label={t('recordItem.copy')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                </button>
                {decryptedSecret.includes('password') === false && (
                  <button
                    onClick={handleAutofill}
                    className="px-2 py-1 rounded text-xs text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    aria-label={t('recordItem.autofill')}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => { setDecryptedSecret(null); setShowSecret(false); autofillAttemptedRef.current = false; }}
                  className="px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 transition-all"
                  aria-label={t('recordItem.clear')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {showSecret ? (
              <div className="prose prose-sm max-w-none prose-invert prose-headings:text-slate-100 prose-a:text-cyan-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-slate-700 prose-code:text-slate-200 prose-code:text-xs prose-strong:text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {decryptedSecret}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-sm font-mono whitespace-pre-wrap break-all text-slate-600 select-none">
                {'•'.repeat(Math.min(decryptedSecret.length, 80))}
              </pre>
            )}
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-400">{error}</div>
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
