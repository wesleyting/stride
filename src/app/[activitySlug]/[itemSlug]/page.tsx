import { permanentRedirect } from "next/navigation";

export default async function LegacyItemPage({ params }: PageProps<"/[activitySlug]/[itemSlug]">) {
  const { itemSlug } = await params;
  permanentRedirect(`/songs/${itemSlug}`);
}
