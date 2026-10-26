"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { menuItemClass } from "@/components/account-menu";

// Chromium (Android, desktop Chrome/Edge) offers a native install prompt through this event; it fires once, early,
// so it's captured at module load and kept until the user asks for it.
type InstallEvent = Event & { prompt: () => Promise<void> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallEvent; notify(); });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });
}

export type InstallState = "installed" | "prompt" | "ios" | "mac-safari" | "none";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** What "install" means on this device: a native prompt, manual Safari steps, or nothing we can offer. */
function snapshot(): InstallState {
  if (isStandalone()) return "installed";
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, with a touch screen
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua)) return "mac-safari";
  return "none";
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useInstallState = (): InstallState => useSyncExternalStore(subscribe, snapshot, () => "none");

/** Registers the service worker (offline page only). Production only, so dev reloads never serve stale files. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => { /* install still works without it */ });
  }, []);
  return null;
}

/** Menu entry: installs the app where the browser allows it, otherwise shows the Safari steps. Hidden when not applicable. */
export function InstallAppItem() {
  const state = useInstallState();
  const dialog = useRef<HTMLDialogElement>(null);
  if (state === "installed" || state === "none") return null;

  const label = state === "prompt" ? "Install app" : state === "ios" ? "Add to Home Screen" : "Add to Dock";
  async function onClick() {
    if (state === "prompt" && deferred) {
      const ev = deferred;
      deferred = null; // the event can only be used once
      notify();
      await ev.prompt();
    } else dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" className={menuItemClass} onClick={onClick}>
        <Download className="size-4" strokeWidth={1.75} aria-hidden="true" />{label}
      </button>
      <dialog ref={dialog} className="sheet" aria-label={label} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
        <div className="glass p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{label}</h2>
            <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Close" onClick={() => dialog.current?.close()}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mb-3 text-sm text-muted">
            Install CalDef so it opens like an app, with its own icon and no browser bars. Long-press the icon for quick
            actions: log a meal, log weight, or check your fast.
          </p>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2" aria-hidden="true"><Share className="size-4" /></span>
              <span>{state === "ios"
                ? <>Tap the <b>Share</b> button in Safari&apos;s toolbar. (It has to be Safari: other iOS browsers can&apos;t install apps.)</>
                : <>Click <b>Share</b> in Safari&apos;s toolbar, or open the <b>File</b> menu.</>}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2" aria-hidden="true"><SquarePlus className="size-4" /></span>
              <span>Choose <b>{state === "ios" ? "Add to Home Screen" : "Add to Dock"}</b>, then tap <b>Add</b>.</span>
            </li>
          </ol>
        </div>
      </dialog>
    </>
  );
}
