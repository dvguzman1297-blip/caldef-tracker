import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/toast";
import { TimezoneSync } from "@/components/timezone-sync";
import { getIsAdmin } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await getIsAdmin();
  return (
    <ToastProvider>
      <TimezoneSync />
      <Nav isAdmin={isAdmin} />
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl outline-none p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-16">{children}</main>
    </ToastProvider>
  );
}
