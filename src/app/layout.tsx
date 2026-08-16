import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stride",
  description: "Pick up where you left off.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-stone-100 text-stone-950">{children}</body>
    </html>
  );
}
