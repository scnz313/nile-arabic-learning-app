import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

vi.mock("expo-linking", () => ({
  canOpenURL: vi.fn(),
  openURL: vi.fn(),
  createURL: vi.fn(),
}));

const originalWindow = global.window;

describe("getApiBaseUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("maps localhost:8081 to the API server on port 3000", async () => {
    global.window = {
      location: {
        protocol: "http:",
        hostname: "localhost",
        port: "8081",
      },
    } as Window & typeof globalThis;

    const { getApiBaseUrl } = await import("../oauth");

    expect(getApiBaseUrl()).toBe("http://localhost:3000");
  });
});
