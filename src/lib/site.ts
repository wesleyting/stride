export const siteConfig = {
  name: "Stride",
  title: "Stride",
  description: "Track guitar practice, keep useful notes, and pick up each song exactly where you left off.",
};

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return new URL(configured);

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return new URL(`https://${vercelUrl}`);

  return new URL("http://localhost:3000");
}
