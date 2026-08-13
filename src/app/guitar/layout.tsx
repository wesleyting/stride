import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guitar — Stride",
};

export default function GuitarLayout({ children }: LayoutProps<"/guitar">) {
  return children;
}
