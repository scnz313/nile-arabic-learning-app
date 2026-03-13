import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

const getCourseFull = vi.fn();
const getActivityContent = vi.fn();

vi.mock("../moodle-api", () => ({
  moodleAPI: {
    getCourseFull,
    getActivityContent,
  },
}));

const cacheContent = vi.fn(async () => undefined);

vi.mock("../webview-cache-service", () => ({
  webViewCacheService: {
    cacheContent,
  },
}));

describe("prefetchService", () => {
  beforeEach(async () => {
    storage.clear();
    getCourseFull.mockReset();
    getActivityContent.mockReset();
    cacheContent.mockClear();

    const { prefetchService } = await import("../prefetch-service");
    await prefetchService.clearPrefetchQueue();
  });

  it("prefetches the next lesson using its URL and mod type", async () => {
    getCourseFull.mockResolvedValue({
      sections: [
        {
          activities: [
            { id: "100", name: "Current", modType: "page", url: "https://example.com/current" },
            { id: "101", name: "Next", modType: "book", url: "https://example.com/next" },
          ],
        },
      ],
    });
    getActivityContent.mockResolvedValue({
      type: "book",
      title: "Next",
      images: [],
    });

    const { prefetchService } = await import("../prefetch-service");
    await prefetchService.prefetchNextLesson("42", "100");

    for (let attempt = 0; attempt < 50 && getActivityContent.mock.calls.length === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(getActivityContent).toHaveBeenCalledWith("https://example.com/next", "book");
  });
});
