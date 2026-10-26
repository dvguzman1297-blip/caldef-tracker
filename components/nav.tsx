"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard, ChefHat, CalendarDays, Columns3, UserRound, Shield, Menu, Plus, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AccountMenu, menuItemClass } from "./account-menu";
import { AddMealForm } from "./add-meal-form";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

const DESKTOP = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/recipes", label: "Recipes", Icon: ChefHat },
  { href: "/history", label: "History", Icon: CalendarDays },
  { href: "/lanes", label: "Meal Planning", Icon: Columns3 },
];

// Mobile bottom bar: two tabs, the centre "Log" button, two tabs. Meal Planning lives in the More menu.
const TABS_LEFT = [
  { href: "/", label: "Dashboard", short: "Home", Icon: LayoutDashboard },
  { href: "/recipes", label: "Recipes", short: "Recipes", Icon: ChefHat },
];
const TABS_RIGHT = [
  { href: "/history", label: "History", short: "History", Icon: CalendarDays },
  { href: "/profile", label: "Profile", short: "Profile", Icon: UserRound },
];

// Tiny haptic tick. Works on Android Chrome; iOS Safari ignores it.
const tick = () => { try { navigator.vibrate?.(10); } catch {} };

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const logDialog = useRef<HTMLDialogElement>(null);
  const [logMounted, setLogMounted] = useState(false);

  const desktop = isAdmin ? [...DESKTOP, { href: "/admin", label: "Admin", Icon: Shield }] : DESKTOP;
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 500, damping: 32 };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const openLog = () => {
    tick();
    // The dashboard already has the log form inline: jump to it rather than opening a duplicate sheet
    const inline = path === "/" ? document.getElementById("describe-meal") : null;
    if (inline) { inline.scrollIntoView({ behavior: "smooth", block: "center" }); (inline as HTMLInputElement).focus({ preventScroll: true }); return; }
    setLogMounted(true); logDialog.current?.showModal();
  };
  const closeLog = () => logDialog.current?.close();

  const linkClass = (active: boolean) =>
    `flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
      active ? "bg-accent-soft font-semibold text-accent-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg"}`;

  const tab = ({ href, short, label, Icon }: (typeof TABS_LEFT)[number]) => {
    const active = isActive(href);
    return (
      <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} onClick={tick}
        className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs focus-visible:outline-offset-[-3px]">
        <span className="relative grid h-7 w-14 place-items-center">
          {active && (
            <motion.span layoutId="mobile-tab" transition={spring} className="absolute inset-0 rounded-full bg-accent-soft" />
          )}
          <motion.span className={`relative ${active ? "text-accent-fg" : "text-fg-muted"}`}
            animate={{ scale: active ? 1.12 : 1 }} transition={spring}>
            <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </motion.span>
        </span>
        <span className={`max-w-full truncate px-1 ${active ? "font-semibold text-fg" : "text-fg-muted"}`}>{short}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop header (md and up): solid, blurred backdrop so scrolling content never shows through */}
      <div className="sticky top-0 z-10 hidden bg-app/90 py-3 backdrop-blur md:block">
        {/* Same frame as <main> (max-w-page + gutters), so the bar and the page content share edges */}
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-8">
        <header className="glass flex items-center gap-4 px-4 py-2.5 shadow-sm">
          <Link href="/" className="flex shrink-0 items-center" aria-label="CalDef home">
            <Wordmark className="h-9 w-auto text-fg" />
          </Link>
          <nav aria-label="Main" className="flex flex-1 items-center gap-1 overflow-x-auto">
            {desktop.map(({ href, label, Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={linkClass(isActive(href))}>
                <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" /><span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="!h-11 !w-11 !p-0" />
            <AccountMenu label="Profile menu" onSignOut={signOut}
              trigger={<><UserRound className="size-4" strokeWidth={1.75} aria-hidden="true" /><span className="text-sm">Profile</span></>}>
              <Link href="/profile" className={`${menuItemClass} ${isActive("/profile") ? "font-semibold text-accent-fg" : ""}`}
                aria-current={isActive("/profile") ? "page" : undefined}>
                <UserRound className="size-4" strokeWidth={1.75} aria-hidden="true" />Your profile
              </Link>
            </AccountMenu>
          </div>
        </header>
        </div>
      </div>

      {/* Mobile top header: fixed to the viewport (like the bottom bar) so overscroll and the browser toolbar never move it.
          The spacer reserves the same height in the page flow. */}
      <div aria-hidden="true" className="h-[calc(4.25rem+env(safe-area-inset-top))] md:hidden" />
      <div className="fixed inset-x-0 top-0 z-10 flex h-[calc(4.25rem+env(safe-area-inset-top))] items-end bg-app px-3 pb-2 md:hidden">
        <header className="glass mx-auto flex w-full max-w-page items-center gap-2 px-3 py-1 shadow-sm">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="CalDef home">
            <Wordmark className="h-8 w-auto shrink-0 text-fg" />
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ThemeToggle className="!h-10 !w-10 !p-0" />
            <AccountMenu label="More menu" onSignOut={signOut} trigger={<Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />}>
              <Link href="/lanes" className={`${menuItemClass} ${isActive("/lanes") ? "font-semibold text-accent-fg" : ""}`}
                aria-current={isActive("/lanes") ? "page" : undefined}>
                <Columns3 className="size-4" strokeWidth={1.75} aria-hidden="true" />Meal Planning
              </Link>
              {isAdmin && (
                <Link href="/admin" className={menuItemClass}>
                  <Shield className="size-4" strokeWidth={1.75} aria-hidden="true" />Admin
                </Link>
              )}
            </AccountMenu>
          </div>
        </header>
      </div>

      {/* Quick-log bottom sheet (native dialog: focus trap, Esc, inert background) */}
      <dialog ref={logDialog} className="sheet-bottom md:hidden" aria-label="Quick log a meal"
        onClose={() => setLogMounted(false)} onClick={(e) => { if (e.target === logDialog.current) closeLog(); }}>
        <div className="glass max-h-[88vh] overflow-y-auto !rounded-b-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Quick log</h2>
            <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Close quick log" onClick={closeLog}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {logMounted && <AddMealForm onDone={closeLog} />}
        </div>
      </dialog>

      {/* Mobile bottom tab bar: Dashboard, Recipes, Log (+), History, Profile */}
      <nav aria-label="Main"
        className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 flex items-center px-1 shadow-xl md:hidden !rounded-2xl">
        {TABS_LEFT.map(tab)}
        <div className="flex flex-1 flex-col items-center">
          <button aria-label="Log a meal" onClick={openLog}
            className="-mt-7 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-lg shadow-black/30 transition-transform active:scale-95">
            <Plus className="size-7" strokeWidth={2} aria-hidden="true" />
          </button>
          <span className="pb-1 text-xs font-semibold text-fg">Log</span>
        </div>
        {TABS_RIGHT.map(tab)}
      </nav>
    </>
  );
}
