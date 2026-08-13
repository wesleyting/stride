import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log practice — Blackbird — Stride",
};

export default function LogPracticeLayout({
  children,
}: LayoutProps<"/guitar/blackbird/log">) {
  return children;
}
