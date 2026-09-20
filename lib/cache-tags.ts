import { unstable_cache, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  categories: "categories",
  assignees: "assignees",
  workload: "assignee-workload",
} as const;

export function cachedQuery<T>(
  key: string,
  tags: string[],
  loader: () => Promise<T>,
): Promise<T> {
  return unstable_cache(loader, [key], { tags, revalidate: 300 })();
}

export function revalidateWorkload() {
  revalidateTag(CACHE_TAGS.workload, "max");
}
