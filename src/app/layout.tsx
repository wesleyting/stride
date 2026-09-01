import type { Metadata } from "next";
import { PracticeTimerProvider } from "@/components/stride/practice-timer";
import { getSiteUrl, siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: siteConfig.title,
    template: "%s | Stride",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  category: "music",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Stride guitar practice tracker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-stone-100 text-stone-950">
        <PracticeTimerProvider>{children}</PracticeTimerProvider>
      </body>
    </html>
  );
}
