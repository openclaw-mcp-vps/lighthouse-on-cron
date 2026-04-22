import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono"
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lighthouse-on-cron.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Lighthouse on Cron | Weekly Core Web Vitals Reports",
  description:
    "Automated Sunday Lighthouse audits and regression alerts for your URLs. Stop running Lighthouse manually and get weekly Core Web Vitals reports by email.",
  openGraph: {
    title: "Lighthouse on Cron",
    description:
      "Weekly Lighthouse reports with perf, accessibility, SEO, and best-practices scores for every URL you care about.",
    type: "website",
    url: siteUrl
  },
  twitter: {
    card: "summary_large_image",
    title: "Lighthouse on Cron",
    description:
      "Automated weekly Core Web Vitals reports and regression alerts for indie founders and agencies."
  },
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} bg-[#0d1117] text-zinc-100 antialiased`}
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif"
        }}
      >
        {children}
      </body>
    </html>
  );
}
