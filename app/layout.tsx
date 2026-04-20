import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"]
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lighthouse-on-cron.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Lighthouse on Cron | Weekly Core Web Vitals Reports",
  description:
    "Automated Sunday Lighthouse reports for every URL you care about. Catch regressions early and ship faster with confidence.",
  keywords: [
    "lighthouse automation",
    "core web vitals",
    "seo monitoring",
    "performance regression alerts",
    "weekly website audit"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Lighthouse on Cron — weekly Core Web Vitals reports",
    description:
      "Paste URLs, get weekly Lighthouse scores and regression alerts by email. Built for indie founders and SEO agencies.",
    url: "/",
    siteName: "Lighthouse on Cron",
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Lighthouse on Cron",
    description:
      "Sunday Lighthouse reports for all your URLs. Performance, accessibility, SEO, and best-practices in one email."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
