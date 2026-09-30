"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ChefHat, CalendarDays, Columns3, UserRound, Shield, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", label: "Dashboard", short: "Dash", Icon: LayoutDashboard },
  { href: "/recipes", label: "Recipes", short: "Recipes", Icon: ChefHat },
  { href: "/history", label: "History", short: "History", Icon: CalendarDays },
  { href: "/lanes", label: "Meal Planning", short: "Meal Plan", Icon: Columns3 },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const primary = isAdmin
    ? [...links, { href: "/admin", label: "Admin", short: "Admin", Icon: Shield }]
    : links;
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = (active: boolean) =>
    `flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
      active ? "bg-emerald-700 font-semibold text-white shadow-sm" : "hover:bg-black/5 dark:hover:bg-white/10"
    }`;

  const menuItem =
    "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10";

  return (
    <>
      

      {/* Desktop header (md and up) */}
      <header className="glass sticky top-3 z-10 mx-auto mt-3 hidden max-w-5xl items-center gap-3 px-4 py-2.5 md:flex">
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

      {/* Mobile top header */}
      <header className="glass sticky top-3 z-10 mx-auto mt-3 flex max-w-5xl items-center gap-2 px-3 py-2 md:hidden">
  <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="CalDef home">
    <Image src="/caldef-wordmark-dark.svg" alt="CalDef" width={110} height={28}
      className="h-7 w-auto shrink-0" unoptimized />
    <span className="truncate text-sm font-medium leading-tight opacity-70">
      Calorie Deficit Tracking
    </span>
  </Link>
  <div className="ml-auto flex shrink-0 items-center gap-1">
    <ThemeToggle className="!h-11 !w-11 !p-0" />
    <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Account menu"
      aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen((o) => !o)}>
      <UserRound className="size-5" strokeWidth={1.75} aria-hidden="true" />
    </button>
  </div>
</header>

      {/* Account menu (outside the header so fixed positioning works) */}
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
            <button onClick={signOut} className={`${menuItem} text-rose-600 dark:text-rose-400`}>
              <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />Log out
            </button>
          </div>
        </>
      )}

      {/* Mobile bottom tab bar */}
      <nav aria-label="Main"
        className="glass fixed inset-x-0 bottom-0 z-20 flex pb-[env(safe-area-inset-bottom)] md:hidden !rounded-none !border-x-0 !border-b-0">
        {primary.map(({ href, short, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined}
              className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]">
              <span className={`grid h-7 w-14 place-items-center rounded-full transition-colors ${
                active ? "bg-emerald-700 text-white" : ""}`}>
                <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className={`max-w-full truncate px-1 ${active ? "font-semibold" : "opacity-75"}`}>{short}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}