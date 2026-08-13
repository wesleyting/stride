import type { Metadata } from "next";
import { PracticeProvider } from "@/components/stride/practice-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stride",
  description: "Pick up where you left off.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <PracticeProvider>{children}</PracticeProvider>
      </body>
    </html>
  );
}
