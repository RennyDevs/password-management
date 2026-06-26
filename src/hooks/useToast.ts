import { useState, useCallback } from 'react';
import type { ToastMessage } from '../components/ui/types';

let counter = 0;
function nextId(): string {
  counter += 1;
  return `toast-${counter}`;
}

/**
 * Self-contained hook for ephemeral toast messages.
 * Each toast auto-dismisses after 4 seconds.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (text: string, type: ToastMessage['type'] = 'info') => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
