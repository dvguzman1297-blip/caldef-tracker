"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type Toast = {
  id: number; message: string; tone: "success" | "error";
  action?: { label: string; onClick: () => void };
};
type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"]; duration?: number };

const Ctx = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(Ctx);

/** Bottom-of-screen toasts. The region is aria-live so screen readers announce each message. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((t: ToastInput) => {
    const id = ++seq.current;
    setToasts((list) => [...list.slice(-2), { id, message: t.message, tone: t.tone ?? "success", action: t.action }]);
    // Errors and undo prompts stay a little longer
    setTimeout(() => dismiss(id), t.duration ?? (t.action || t.tone === "error" ? 8000 : 4000));
  }, [dismiss]);
  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div role="status" aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md flex-col gap-2 md:bottom-6 md:left-6 md:right-auto md:mx-0">
        {toasts.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl ${
              t.tone === "error" ? "border-danger bg-surface text-fg" : "border-line-strong bg-surface-2 text-fg"}`}>
            <span className={`min-w-0 flex-1 ${t.tone === "error" ? "font-medium" : ""}`}>
              {t.tone === "error" && <span className="mr-1 text-danger">Error:</span>}{t.message}
            </span>
            {t.action && (
              <button className="shrink-0 rounded-md px-2 py-1 font-semibold text-accent-fg underline"
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>
            )}
            <button aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-line"
              onClick={() => dismiss(t.id)}><X className="size-4" aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
