import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blackbird — Stride",
};

export default function BlackbirdLayout({
  children,
}: LayoutProps<"/guitar/blackbird">) {
  return children;
}
