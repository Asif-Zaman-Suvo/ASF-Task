import { expect, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

vi.mock("@/lib/cache-tags", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cache-tags")>();
  return {
    ...actual,
    cachedQuery: <T,>(_key: string, _tags: string[], loader: () => Promise<T>) => loader(),
    revalidateWorkload: vi.fn(),
  };
});

