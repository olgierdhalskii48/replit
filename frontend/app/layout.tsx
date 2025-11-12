import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Montserrat } from "next/font/google";
import LayoutShell from "@/components/layout/layout-shell";
import dynamic from "next/dynamic";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PrawnikAI",
  description: "PrawnikAI - Twój prawny asystent AI",
  generator: "PrawnikAI",
  openGraph: {
    title: "PrawnikAI",
    description: "PrawnikAI - Twój prawny asystent AI",
    images: [
      {
        url: "/legal-gavel.png",
        width: 1024,
        height: 716,
        alt: "PrawnikAI – młotek sędziego na tle cyfrowym",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrawnikAI",
    description: "PrawnikAI - Twój prawny asystent AI",
    images: [
      {
        url: "/legal-gavel.png",
        alt: "PrawnikAI – młotek sędziego na tle cyfrowym",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const LegalConsentModal = dynamic(() => import("@/components/legal-consent-modal"), { ssr: false });
  return (
    <html lang="pl" className={montserrat.className} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/legal-gavel.png" type="image/png" />
        <title>PrawnikAI</title>
        {/* No-flash theme script: applies dark class before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              try {
                var ls = localStorage.getItem('theme');
                var mql = window.matchMedia('(prefers-color-scheme: dark)');
                var wantDark = ls ? ls === 'dark' : mql.matches;
                var root = document.documentElement;
                if (wantDark) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
              } catch (e) {}
            })();
          `}}
        />
      </head>
      <body>
        <LayoutShell>
          {children}
        </LayoutShell>
        <LegalConsentModal />
      </body>
    </html>
  );
}
