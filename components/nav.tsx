"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ChefHat, CalendarDays, Columns3, UserRound, Shield, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";

const links = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/recipes", label: "Recipes", Icon: ChefHat },
  { href: "/history", label: "History", Icon: CalendarDays },
  { href: "/lanes", label: "Meal Planning", Icon: Columns3 },
  { href: "/profile", label: "Profile", Icon: UserRound },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const all = isAdmin ? [...links, { href: "/admin", label: "Admin", Icon: Shield }] : links;
  return (
    <header className="glass sticky top-3 z-10 mx-auto mt-3 flex max-w-5xl items-center gap-2 px-3 py-2">
      <Link href="/" className="mr-2 flex shrink-0 items-center gap-2 font-bold" aria-label="CalDef home">
        <Image src="/caldef-wordmark-dark.svg" alt="" width={28} height={28}
        className="size-7" unoptimized />
          <span>CalDef</span>
      </Link>      
      <nav className="flex flex-1 gap-1 overflow-x-auto">
        {all.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-emerald-600/15 font-semibold text-emerald-700 dark:text-emerald-300" : "hover:bg-black/5 dark:hover:bg-white/10"}`}>
              <Icon className="size-4" /><span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <ThemeToggle />
      <button className="btn btn-ghost" aria-label="Log out" onClick={async () => {
        await createClient().auth.signOut(); router.replace("/login"); router.refresh();
      }}><LogOut className="size-4" /></button>
    </header>
  );
}
