import { permanentRedirect } from "next/navigation";

export default async function LegacyActivityPage({ params }: PageProps<"/[activitySlug]">) {
  await params;
  permanentRedirect("/");
}
