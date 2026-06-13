/**
 * Lightweight virtual list component.
 *
 * Renders only the items that are visible in the viewport plus a configurable
 * buffer (overscan).  This keeps the DOM small when RecordList contains
 * hundreds or thousands of items — no external dependency.
 *
 * The items are laid out in a single-column list with a fixed, known
 * height per row.  A spacer div pads the scrollable area so the native
 * scrollbar behaves correctly.
 */

import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  /** Fixed row height in pixels (must be the same for every item). */
  rowHeight: number;
  /** Number of extra rows to render above and below the visible window. */
  overscan?: number;
  /** Render prop that receives the item and its original index. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Optional class for the outer container (must have overflow-y: auto). */
  className?: string;
  /** Optional class for the inner wrapper. */
  innerClassName?: string;
}

export default function VirtualList<T>({
  items,
  rowHeight,
  overscan = 5,
  renderItem,
  className = '',
  innerClassName = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const totalHeight = items.length * rowHeight;

  // Recalculate container height on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    setContainerHeight(el.clientHeight);

    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Which rows to render
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

  const visibleItems: ReactNode[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    visibleItems.push(
      <div
        key={(items[i] as Record<string, unknown>).id as string ?? i}
        style={{
          position: 'absolute',
          top: i * rowHeight,
          left: 0,
          right: 0,
          height: rowHeight,
        }}
      >
        {renderItem(items[i], i)}
      </div>,
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={{ position: 'relative' }}
    >
      <div
        className={innerClassName}
        style={{ position: 'relative', height: totalHeight, width: '100%' }}
      >
        {containerHeight > 0 && visibleItems}
      </div>
    </div>
  );
}
