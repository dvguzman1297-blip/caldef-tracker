import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { MotionProvider } from "@/components/motion-provider";
import { RegisterServiceWorker } from "@/components/pwa-install";
import "./globals.css";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CalDef Tracker",
  description: "High-protein recipes and macro tracking for a calorie deficit",
  icons: { icon: "/caldef-wordmark-dark.svg", apple: "/icons/180" },
  appleWebApp: { capable: true, title: "CalDef", statusBarStyle: "black-translucent" },
};

// Colours the browser/OS title bar of the installed app to match the page background in each theme
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
    { media: "(prefers-color-scheme: light)", color: "#eaf0f6" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={font.className}>
        <a href="#main" className="skip-link">Skip to main content</a>
        <RegisterServiceWorker />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}