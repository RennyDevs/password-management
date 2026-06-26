import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownEditor from './MarkdownEditor';
import PasswordGeneratorModal from './PasswordGeneratorModal';
import { useFocusTrap } from '../hooks/useFocusTrap';

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

  const focusTrapRef = useFocusTrap(true);
  const titleId = 'edit-record-modal-title';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" role="presentation">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg vault-card p-6 max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/50">
          <h2 id={titleId} className="text-base font-semibold text-slate-100">
            {mode === 'create' ? t('editRecordModal.newRecord') : t('editRecordModal.editRecord')}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            aria-label="Close"
            disabled={saving}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="mb-4">
            <label htmlFor="edit-title" className="block text-sm font-medium text-slate-300 mb-1.5">
              {t('editRecordModal.titleLabel')}
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="vault-input"
              placeholder={t('editRecordModal.titlePlaceholder')}
              disabled={saving}
              autoFocus
            />
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {t('editRecordModal.tagsLabel')} <span className="text-xs text-slate-500 font-normal">{t('editRecordModal.tagsHint')}</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 vault-input min-h-[42px] cursor-text" onClick={() => document.getElementById('tag-input')?.focus()}>
              {tags.map((tag) => (
                <span key={tag} className="tag-chip text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-cyan-300/60 hover:text-cyan-200 ml-0.5"
                    aria-label={`Remove tag ${tag}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                id="tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder={tags.length === 0 ? t('editRecordModal.tagsPlaceholder') : ''}
                className="flex-1 min-w-[80px] border-none bg-transparent outline-none text-slate-100 text-sm p-0 placeholder-slate-500"
                disabled={saving}
              />
            </div>
          </div>

          {/* Secret with generator button */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="edit-secret" className="text-sm font-medium text-slate-300">
                {t('editRecordModal.secretLabel')} <span className="text-xs text-slate-500 font-normal">{t('editRecordModal.markdownHint')}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowGenerator(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
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
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary text-xs"
              disabled={saving}
            >
              {t('editRecordModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('editRecordModal.saving')}
                </>
              ) : mode === 'create' ? t('editRecordModal.create') : t('editRecordModal.save')}
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
