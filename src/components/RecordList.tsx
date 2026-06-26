import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RecordListItem } from '../types/record';
import RecordItem from './RecordItem';
import VirtualList from './VirtualList';
import { SkeletonList } from './ui/Skeleton';
import EmptyState from './ui/EmptyState';

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
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const focusItem = useCallback((recordId: string) => {
    const el = itemRefs.current.get(recordId);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'nearest' });
    }
  }, []);

  const getRecordIds = useCallback(() => records.map((r) => r.id), [records]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (records.length === 0) return;

      // Ignore keyboard events that originate inside a modal (dialog) —
      // e.g., the MasterPasswordModal that sits inside a RecordItem.
      if ((e.target as HTMLElement)?.closest('[role="dialog"]')) return;

      const ids = getRecordIds();
      const currentId = (e.target as HTMLElement)?.closest('[data-record-item]')?.getAttribute('data-record-item');
      const currentIndex = currentId ? ids.indexOf(currentId) : -1;

      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, records.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = currentIndex < 0 ? records.length - 1 : Math.max(currentIndex - 1, 0);
          break;
        case 'Enter':
        case ' ':
          if (currentId && currentIndex >= 0) {
            e.preventDefault();
            onEdit(currentId);
          }
          return;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = records.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex >= 0 && nextIndex < records.length) {
        focusItem(ids[nextIndex]);
      }
    },
    [records, getRecordIds, focusItem, onEdit],
  );

  const setItemRef = useCallback((recordId: string, el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(recordId, el);
    } else {
      itemRefs.current.delete(recordId);
    }
  }, []);

  const renderItem = useCallback(
    (record: RecordListItem, index: number) => (
      <div
        ref={(el) => setItemRef(record.id, el as HTMLElement | null)}
        data-record-item={record.id}
        role="option"
        tabIndex={index === 0 ? 0 : -1}
        className="rounded-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        <RecordItem
          record={record}
          onEdit={onEdit}
          onDelete={onDelete}
          onToast={onToast}
        />
      </div>
    ),
    [onEdit, onDelete, onToast, setItemRef],
  );

  if (loading) {
    return <SkeletonList rows={5} />;
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        }
        title={t('recordList.noRecords')}
        description={t('recordList.noRecordsText')}
      />
    );
  }

  // Use virtualisation for large lists; plain render for small ones (<50)
  if (records.length >= 50) {
    return (
      <div
        ref={listRef}
        role="listbox"
        aria-label={t('recordList.recordsList')}
        onKeyDown={handleKeyDown}
      >
        <VirtualList
          items={records}
          rowHeight={RECORD_ITEM_HEIGHT}
          overscan={5}
          renderItem={renderItem}
        />
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={t('recordList.recordsList')}
      onKeyDown={handleKeyDown}
      className="space-y-2"
    >
      {records.map((record, index) => renderItem(record, index))}
    </div>
  );
}
