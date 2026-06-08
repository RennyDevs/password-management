import { useState } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { RecordListItem } from '../types/record';
import { fetchFullRecord } from '../lib/storage/supabase';
import { decryptPayload } from '../lib/crypto';
import { copyToClipboard } from '../lib/utils/clipboard';
import MasterPasswordModal from './MasterPasswordModal';
import ConfirmModal from './ConfirmModal';

interface RecordItemProps {
  record: RecordListItem;
  onEdit: (recordId: string) => void;
  onDelete: (recordId: string) => void;
}

export default function RecordItem({ record, onEdit, onDelete }: RecordItemProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [decryptedSecret, setDecryptedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');

  const handleView = () => {
    setDecryptedSecret(null);
    setShowSecret(false);
    setError('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    try {
      const fullRecord = await fetchFullRecord(record.id);
      if (!fullRecord) {
        setError('Record not found');
        return false;
      }

      const plaintext = await decryptPayload(
        password,
        fullRecord.ciphertext,
        fullRecord.nonce,
        fullRecord.salt
      );

      setDecryptedSecret(plaintext);
      setShowPasswordModal(false);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopySecret = async () => {
    if (decryptedSecret) {
      await copyToClipboard(decryptedSecret);
    }
  };

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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Created: {format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}
              {record.updated_at !== record.created_at &&
                ` · Updated: ${format(new Date(record.updated_at), 'MMM d, yyyy HH:mm')}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleView}
              className="px-3 py-1.5 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              View
            </button>
            <button
              onClick={() => onEdit(record.id)}
              className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Decrypted secret display area */}
        {decryptedSecret !== null && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Decrypted Secret</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showSecret ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={handleCopySecret}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Copy
                </button>
                <button
                  onClick={() => { setDecryptedSecret(null); setShowSecret(false); }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear
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
          title={`Unlock: ${record.title}`}
          onSubmit={handlePasswordSubmit}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Record"
          message={`Are you sure you want to delete "${record.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          destructive
        />
      )}
    </>
  );
}
