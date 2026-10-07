"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutDashboard, ChefHat, CalendarDays, Columns3, UserRound, Shield, LogOut, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import { AddMealForm } from "./add-meal-form";

const links = [
  { href: "/", label: "Dashboard", short: "Dash", Icon: LayoutDashboard },
  { href: "/recipes", label: "Recipes", short: "Recipes", Icon: ChefHat },
  { href: "/history", label: "History", short: "History", Icon: CalendarDays },
  { href: "/lanes", label: "Meal Planning", short: "Meal Plan", Icon: Columns3 },
];

// Tiny haptic tick. Works on Android Chrome; iOS Safari ignores it.
const tick = () => { try { navigator.vibrate?.(10); } catch {} };

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [hideTop, setHideTop] = useState(false);
  const lastY = useRef(0);

  const primary = isAdmin
    ? [...links, { href: "/admin", label: "Admin", short: "Admin", Icon: Shield }]
    : links;
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 500, damping: 32 };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  // Close menus when navigating to another route
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false); setLogOpen(false); }, [path]);

  useEffect(() => {
    if (!open && !logOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setLogOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, logOpen]);

  // Hide the top bar when scrolling down, reveal on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 80) { setHideTop(false); lastY.current = y; return; }
      const dy = y - lastY.current;
      if (Math.abs(dy) < 8) return;
      setHideTop(dy > 0);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = (active: boolean) =>
    `flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
      active ? "bg-emerald-700 font-semibold text-white shadow-sm" : "hover:bg-black/5 dark:hover:bg-white/10"
    }`;

  const menuItem =
    "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10";

  const tab = ({ href, short, label, Icon }: (typeof links)[number]) => {
    const active = isActive(href);
    return (
      <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} onClick={tick}
        className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]">
        <span className="relative grid h-7 w-14 place-items-center">
          {active && (
            <motion.span layoutId="mobile-tab" transition={spring}
              className="absolute inset-0 rounded-full bg-emerald-700" />
          )}
          <motion.span className={`relative ${active ? "text-white" : ""}`}
            animate={{ scale: active ? 1.12 : 1 }} transition={spring}>
            <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </motion.span>
        </span>
        <span className={`max-w-full truncate px-1 ${active ? "font-semibold" : "opacity-75"}`}>{short}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop header (md and up) */}
      <div className="sticky top-0 z-10 hidden bg-app/90 px-4 py-3 backdrop-blur md:block">
      <header className="glass mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 shadow-sm">
        <Link href="/" className="flex shrink-0 items-center" aria-label="CalDef home">
          <Image src="/caldef-wordmark-dark.svg" alt="CalDef" width={110} height={28}
            className="h-7 w-auto" priority unoptimized />
        </Link>
        <nav aria-label="Main" className="flex flex-1 items-center gap-1 overflow-x-auto">
          {primary.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
              className={linkClass(isActive(href))}>
              <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/profile" aria-current={isActive("/profile") ? "page" : undefined}
            className={linkClass(isActive("/profile"))}>
            <UserRound className="size-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Profile</span>
          </Link>
          <ThemeToggle />
          <span className="mx-0.5 h-5 w-px bg-current opacity-20" aria-hidden="true" />
          <button
            className="btn btn-ghost !h-9 !w-9 !p-0 hover:!border-rose-500/50 hover:!bg-rose-500/10 hover:!text-rose-600 dark:hover:!text-rose-400"
            aria-label="Log out" title="Log out" onClick={signOut}>
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </header>
      </div>

      {/* Mobile top header: slides away on scroll down */}
      <div className={`sticky top-0 z-10 bg-app/90 px-3 py-3 backdrop-blur transition-transform duration-300 md:hidden ${
          hideTop && !open && !logOpen ? "-translate-y-full" : ""}`}>
      <header className="glass mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 shadow-sm">
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="CalDef home">
          <Image src="/caldef-wordmark-dark.svg" alt="CalDef" width={110} height={28}
            className="h-7 w-auto shrink-0" unoptimized />
          <span className="truncate text-xs font-medium leading-tight opacity-70">Calorie Deficit Tracking</span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle className="!h-11 !w-11 !p-0" />
          <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Account menu"
            aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen((o) => !o)}>
            <UserRound className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </header>
      </div>

      {/* Account menu (Admin lives here on mobile) */}
      {open && (
        <>
          <button aria-label="Close menu" tabIndex={-1} className="fixed inset-0 z-20 cursor-default md:hidden"
            onClick={() => setOpen(false)} />
          <div id="account-menu"
            className="glass fixed right-3 top-20 z-30 w-56 p-2 shadow-xl md:hidden !bg-white/95 dark:!bg-slate-900/95">
            <Link href="/profile" aria-current={isActive("/profile") ? "page" : undefined}
              className={`${menuItem} ${isActive("/profile") ? "font-semibold text-emerald-700 dark:text-emerald-300" : ""}`}>
              <UserRound className="size-4" strokeWidth={1.75} aria-hidden="true" />Profile
            </Link>
            {isAdmin && (
              <Link href="/admin" className={menuItem}>
                <Shield className="size-4" strokeWidth={1.75} aria-hidden="true" />Admin
              </Link>
            )}
            <button onClick={signOut} className={`${menuItem} text-rose-600 dark:text-rose-400`}>
              <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />Log out
            </button>
          </div>
        </>
      )}

      {/* Quick-log sheet */}
      {logOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Close quick log" tabIndex={-1} className="absolute inset-0 bg-black/50"
            onClick={() => setLogOpen(false)} />
          <motion.div role="dialog" aria-modal="true" aria-label="Quick log a meal"
            initial={{ y: "100%" }} animate={{ y: 0 }} transition={spring}
            className="glass absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto !rounded-b-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] !bg-white/95 dark:!bg-slate-900/95">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Quick log</h2>
              <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Close" onClick={() => setLogOpen(false)}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <AddMealForm onDone={() => setLogOpen(false)} />
          </motion.div>
        </div>
      )}

      {/* Mobile floating bottom bar: 2 tabs, center "+" button, 2 tabs */}
      <nav aria-label="Main"
        className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 flex items-center px-1 shadow-xl md:hidden !rounded-2xl">
        {links.slice(0, 2).map(tab)}
        <div className="flex flex-1 justify-center">
          <button aria-label="Quick log a meal" onClick={() => { tick(); setLogOpen(true); }}
            className="-mt-7 grid size-14 place-items-center rounded-full text-white shadow-lg shadow-emerald-900/40 transition-transform active:scale-95"
            style={{ background: "linear-gradient(135deg,#059669,#0d9488)" }}>
            <Plus className="size-7" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {links.slice(2).map(tab)}
      </nav>
    </>
  );
}