import { redirect } from "next/navigation";

export default async function ProjectFavoritesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}?tab=favorites`);
}
