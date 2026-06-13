import { useTranslation } from 'react-i18next';
import type { RecordListItem } from '../types/record';
import RecordItem from './RecordItem';
import VirtualList from './VirtualList';

interface RecordListProps {
  records: RecordListItem[];
  loading: boolean;
  onEdit: (recordId: string) => void;
  onDelete: (recordId: string) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Estimated row height for a collapsed RecordItem (title + meta + buttons).
 * When a secret is decrypted inline the item expands beyond this height;
 * that's acceptable because it's a transient UI state and most rows stay
 * collapsed.
 */
const RECORD_ITEM_HEIGHT = 76;

export default function RecordList({ records, loading, onEdit, onDelete, onToast }: RecordListProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">{t('recordList.loading')}</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('recordList.noRecords')}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('recordList.noRecordsText')}
        </p>
      </div>
    );
  }

  // Use virtualisation for large lists; plain render for small ones (<50)
  if (records.length >= 50) {
    return (
      <div className="h-[70vh]">
        <VirtualList
          items={records}
          rowHeight={RECORD_ITEM_HEIGHT}
          overscan={5}
          renderItem={(record) => (
            <div className="px-0.5 py-1">
              <RecordItem
                record={record}
                onEdit={onEdit}
                onDelete={onDelete}
                onToast={onToast}
              />
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <RecordItem
          key={record.id}
          record={record}
          onEdit={onEdit}
          onDelete={onDelete}
          onToast={onToast}
        />
      ))}
    </div>
  );
}
