"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, CircleAlert, Info, X } from "lucide-react";

type ToastOptions = {
  id?: string;
  duration?: number;
  tone?: "success" | "error" | "info";
};

type ToastMessage = {
  id: string;
  message: string;
  tone: NonNullable<ToastOptions["tone"]>;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<string, number>());
  const pathname = usePathname();

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = options?.id ?? crypto.randomUUID();
    const previousTimer = timers.current.get(id);
    if (previousTimer) window.clearTimeout(previousTimer);

    setToasts((current) => [
      ...current.filter((toast) => toast.id !== id),
      { id, message, tone: options?.tone ?? "success" },
    ].slice(-3));

    timers.current.set(id, window.setTimeout(() => dismiss(id), options?.duration ?? 3200));
  }, [dismiss]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const notice = url.searchParams.get("notice");
    if (!notice) return;

    const messages: Record<string, string> = {
      "song-created": "Song added.",
      "song-deleted": "Song deleted.",
    };
    if (messages[notice]) {
      queueMicrotask(() => showToast(messages[notice], { id: `navigation-${notice}` }));
    }
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [pathname, showToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed right-3 bottom-20 z-[200] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col items-end gap-2 md:right-5 md:bottom-5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${toast.tone === "error" ? "border-red-800 bg-red-950" : "border-stone-700 bg-stone-950"}`}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/12">
              {toast.tone === "error" ? <CircleAlert className="size-3.5" aria-hidden="true" /> : toast.tone === "info" ? <Info className="size-3.5" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss message"
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-stone-400 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
