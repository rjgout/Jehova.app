"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";

interface PendingConfirmation {
  message: string;
  resolve: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);
  pendingRef.current = pending;

  const close = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    current.resolve(confirmed);
    setPending(null);
  }, []);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, resolve });
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => close(false)}>
          <div
            className="card w-full max-w-sm !p-5 shadow-xl animate-pop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {t("common.confirm")}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{pending.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary !px-3 !py-2" onClick={() => close(false)}>
                {t("common.cancel")}
              </button>
              <button className="btn-primary !px-3 !py-2" onClick={() => close(true)}>
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (message: string) => Promise<boolean> {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm moet binnen ConfirmProvider worden gebruikt");
  return context.confirm;
}
