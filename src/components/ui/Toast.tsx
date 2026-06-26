import { useEffect, useCallback, useRef } from 'react';
import type { ToastMessage } from './types';

interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleDismiss = useCallback(() => {
    onDismiss(message.id);
  }, [message.id, onDismiss]);

  useEffect(() => {
    // Auto-dismiss after 5s
    timerRef.current = setTimeout(handleDismiss, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleDismiss]);

  const typeStyles = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    error: 'border-red-500/40 bg-red-500/10 text-red-200',
    info: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  };

  const icons = {
    success: (
      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-lg shadow-black/20 backdrop-blur-sm animate-slide-in-right ${typeStyles[message.type]}`}
    >
      {icons[message.type]}
      <p className="text-sm flex-1 min-w-0">{message.text}</p>
      <button
        onClick={handleDismiss}
        className="p-0.5 text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function ToastContainer({ messages, onDismiss }: ToastContainerProps) {
  if (messages.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {messages.map((msg) => (
        <div key={msg.id} className="pointer-events-auto">
          <ToastItem message={msg} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
