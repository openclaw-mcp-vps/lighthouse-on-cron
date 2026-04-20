import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lighthouse on Cron | Weekly Core Web Vitals Reports",
  description:
    "Automate weekly Lighthouse audits for your URLs. Get Sunday email reports with performance, accessibility, SEO, and best-practices scores plus regression alerts.",
  metadataBase: new URL("https://lighthouseoncron.com"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Lighthouse on Cron",
    description:
      "Weekly Lighthouse scores and regression alerts for your sites. Stop manual runs and catch performance drops before rankings slip.",
    url: "https://lighthouseoncron.com",
    siteName: "Lighthouse on Cron",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Lighthouse on Cron",
    description:
      "Weekly Lighthouse reports for your URLs. Performance, accessibility, SEO, and best-practices, delivered every Sunday."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
