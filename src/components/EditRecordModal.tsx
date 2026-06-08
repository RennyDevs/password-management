import { useState } from 'react';
import MarkdownEditor from './MarkdownEditor';

interface EditRecordModalProps {
  title: string;
  secret: string;
  onSave: (title: string, secret: string) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

export default function EditRecordModal({
  title: initialTitle,
  secret: initialSecret,
  onSave,
  onCancel,
  mode,
}: EditRecordModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [secret, setSecret] = useState(initialSecret);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!secret.trim()) {
      setError('Secret is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(title.trim(), secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {mode === 'create' ? 'New Record' : 'Edit Record'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. Email Account"
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(Markdown supported)</span>
            </label>
            <MarkdownEditor
              id="edit-secret"
              value={secret}
              onChange={setSecret}
              placeholder="Enter the secret content to encrypt (Markdown supported)"
              rows={6}
              disabled={saving}
              minHeight="250px"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
