import type { FlowArtifact } from "@product-os/shared";

export function slugifyArtifactTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildArtifactHandleMap(artifacts: FlowArtifact[]): Record<string, string> {
  const counts = new Map<string, number>();
  const map: Record<string, string> = {};

  const sorted = [...artifacts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const artifact of sorted) {
    const baseHandle =
      slugifyArtifactTitle(artifact.title) || `artifact-${artifact.id.slice(0, 8)}`;
    const count = (counts.get(baseHandle) ?? 0) + 1;
    counts.set(baseHandle, count);
    map[artifact.id] = count === 1 ? baseHandle : `${baseHandle}-${count}`;
  }

  return map;
}

