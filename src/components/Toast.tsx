export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function Toast({ messages, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-sm animate-slide-in ${
            msg.type === 'success'
              ? 'bg-green-600'
              : msg.type === 'error'
              ? 'bg-red-600'
              : 'bg-blue-600'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{msg.text}</span>
            <button
              onClick={() => onDismiss(msg.id)}
              className="text-white/80 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
