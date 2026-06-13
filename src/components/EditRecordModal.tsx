import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownEditor from './MarkdownEditor';
import PasswordGeneratorModal from './PasswordGeneratorModal';

interface EditRecordModalProps {
  title: string;
  secret: string;
  tags?: string[];
  onSave: (title: string, secret: string, tags: string[]) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

export default function EditRecordModal({
  title: initialTitle,
  secret: initialSecret,
  tags: initialTags = [],
  onSave,
  onCancel,
  mode,
}: EditRecordModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle);
  const [secret, setSecret] = useState(initialSecret);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError(t('editRecordModal.errorTitleRequired'));
      return;
    }
    if (!secret.trim()) {
      setError(t('editRecordModal.errorSecretRequired'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(title.trim(), secret, tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editRecordModal.errorFailedSave'));
    } finally {
      setSaving(false);
    }
  };

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase();
      if (trimmed && !tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed]);
      }
      setTagInput('');
    },
    [tags],
  );

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleGeneratedPassword = (password: string) => {
    setSecret((prev) => prev + (prev ? '\n' : '') + password);
    setShowGenerator(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {mode === 'create' ? t('editRecordModal.newRecord') : t('editRecordModal.editRecord')}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="mb-4">
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('editRecordModal.titleLabel')}
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder={t('editRecordModal.titlePlaceholder')}
              disabled={saving}
              autoFocus
            />
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('editRecordModal.tagsLabel')} <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">{t('editRecordModal.tagsHint')}</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 min-h-[40px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-200"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder={tags.length === 0 ? t('editRecordModal.tagsPlaceholder') : ''}
                className="flex-1 min-w-[80px] border-none bg-transparent outline-none text-gray-900 dark:text-white text-sm p-0"
                disabled={saving}
              />
            </div>
          </div>

          {/* Secret with generator button */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="edit-secret" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('editRecordModal.secretLabel')} <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">{t('editRecordModal.markdownHint')}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowGenerator(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {t('editRecordModal.generatePassword')}
              </button>
            </div>
            <MarkdownEditor
              id="edit-secret"
              value={secret}
              onChange={setSecret}
              placeholder={t('editRecordModal.secretPlaceholder')}
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
              {t('editRecordModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? t('editRecordModal.saving') : mode === 'create' ? t('editRecordModal.create') : t('editRecordModal.save')}
            </button>
          </div>
        </form>
      </div>

      {showGenerator && (
        <PasswordGeneratorModal
          onSelect={handleGeneratedPassword}
          onCancel={() => setShowGenerator(false)}
        />
      )}
    </div>
  );
}
