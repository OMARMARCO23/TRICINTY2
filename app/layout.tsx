import type { Metadata } from "next";
import "./../styles/globals.css";
import Link from "next/link";
import { AppProvider } from "@/contexts/AppContext";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "TRICINTY - Smart Energy Tracker",
  description: "Track, predict and save on electricity with a privacy-first AI coach.",
  manifest: "/manifest.json",
  themeColor: "#2563eb"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-base-200" suppressHydrationWarning>
        <AppProvider>
          <main className="pb-20 p-4">{children}</main>
          <BottomNav />
        </AppProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(()=>{});
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
