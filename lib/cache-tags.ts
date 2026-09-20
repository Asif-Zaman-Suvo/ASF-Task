import { unstable_cache } from "next/cache";

export const CACHE_TAGS = {
  categories: "categories",
  assignees: "assignees",
} as const;

export function cachedQuery<T>(
  key: string,
  tags: string[],
  loader: () => Promise<T>,
): Promise<T> {
  return unstable_cache(loader, [key], { tags, revalidate: 300 })();
}
