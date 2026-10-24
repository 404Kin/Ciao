import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, type = 'success') => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), type === 'error' ? 5000 : 2800);
    },
    [dismiss]
  );

  const api = useRef({
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    info: (m) => toast(m, 'info'),
  });
  api.current.success = (m) => toast(m, 'success');
  api.current.error = (m) => toast(m, 'error');
  api.current.info = (m) => toast(m, 'info');

  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  const color = { success: 'text-ok', error: 'text-danger', info: 'text-accent' };

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="fixed z-[100] left-1/2 -translate-x-1/2 top-4 flex flex-col gap-2 w-[min(92vw,380px)] pointer-events-none">
        {toasts.map((t) => {
          const I = Icon[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 card shadow-card px-4 py-3 text-sm animate-rise"
            >
              <I size={18} className={`${color[t.type]} mt-0.5 shrink-0`} />
              <span className="flex-1 break-words">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
