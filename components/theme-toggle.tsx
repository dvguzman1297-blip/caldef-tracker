"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "!h-9 !w-9 !p-0" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button className={`btn btn-ghost ${className}`} aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      <Sun className="hidden size-4 dark:block dark:animate-[item-in_.25s_ease-out]" />
      <Moon className="size-4 animate-[item-in_.25s_ease-out] dark:hidden" />
    </button>
  );
}