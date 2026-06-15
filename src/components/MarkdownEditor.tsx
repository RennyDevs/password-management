import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  minHeight?: string;
}

export default function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  rows = 10,
  disabled = false,
  minHeight = '300px',
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('markdownEditor.defaultPlaceholder');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'split'>('split');

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-2.5 py-1 text-xs rounded ${
            activeTab === 'edit'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {t('markdownEditor.edit')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-2.5 py-1 text-xs rounded ${
            activeTab === 'preview'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {t('markdownEditor.preview')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('split')}
          className={`px-2.5 py-1 text-xs rounded ${
            activeTab === 'split'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {t('markdownEditor.split')}
        </button>
        <div className="flex-1" />
        <span className="text-xs text-gray-400 dark:text-gray-500">{t('markdownEditor.markdown')}</span>
      </div>

      {/* Editor area */}
      <div
        className="flex"
        style={{ minHeight }}
      >
        {/* Edit panel */}
        {(activeTab === 'edit' || activeTab === 'split') && (
          <div className={`${activeTab === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-600' : 'w-full'}`}>
            <textarea
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={resolvedPlaceholder}
              rows={rows}
              disabled={disabled}
              className="w-full h-full min-h-[inherit] px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm resize-none outline-none border-0 focus:ring-0"
              style={{ minHeight }}
            />
          </div>
        )}

        {/* Preview panel */}
        {(activeTab === 'preview' || activeTab === 'split') && (
          <div
            role="region"
            aria-label={t('markdownEditor.preview')}
            className={`${
              activeTab === 'split' ? 'w-1/2' : 'w-full'
            } px-3 py-2 overflow-auto prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:text-sm prose-pre:bg-gray-100 dark:prose-pre:bg-gray-700`}
            style={{ minHeight }}
          >
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">{t('markdownEditor.nothingToPreview')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
