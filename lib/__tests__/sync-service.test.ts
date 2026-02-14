import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      getAllKeys: vi.fn(() => Promise.resolve(Object.keys(store))),
      multiRemove: vi.fn((keys: string[]) => {
        keys.forEach((k) => delete store[k]);
        return Promise.resolve();
      }),
    },
  };
});

// Mock expo-web-browser
vi.mock("expo-web-browser", () => ({
  openBrowserAsync: vi.fn(),
}));

// Mock expo-haptics
vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium" },
  NotificationFeedbackType: { Success: "Success", Error: "Error", Warning: "Warning" },
}));

describe("Storage Service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("should export CourseData and LessonData types", async () => {
    const { storage } = await import("../storage");
    expect(storage).toBeDefined();
    expect(typeof storage.setCourses).toBe("function");
    expect(typeof storage.getCourses).toBe("function");
    expect(typeof storage.setCourseContents).toBe("function");
    expect(typeof storage.getCourseContents).toBe("function");
    expect(typeof storage.getUserSettings).toBe("function");
    expect(typeof storage.setUserSettings).toBe("function");
    expect(typeof storage.setLastSyncTime).toBe("function");
    expect(typeof storage.getLastSyncTime).toBe("function");
    expect(typeof storage.clearAll).toBe("function");
  });

  it("should store and retrieve courses", async () => {
    const { storage } = await import("../storage");
    const courses = [
      {
        id: 1,
        moodleCourseId: 100,
        shortName: "AR101",
        fullName: "Arabic 101",
        displayName: "Arabic 101",
        summary: "Intro to Arabic",
        progress: 50,
        totalLessons: 10,
        completedLessons: 5,
        updatedAt: Date.now(),
      },
    ];
    await storage.setCourses(courses);
    const retrieved = await storage.getCourses();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].moodleCourseId).toBe(100);
    expect(retrieved[0].displayName).toBe("Arabic 101");
  });

  it("should return default settings when none stored", async () => {
    const { storage } = await import("../storage");
    const settings = await storage.getUserSettings();
    expect(settings.autoDownloadNewContent).toBe(false);
    expect(settings.wifiOnlyDownload).toBe(true);
    expect(settings.notificationsEnabled).toBe(true);
    expect(settings.theme).toBe("auto");
  });
});

describe("Moodle API", () => {
  it("should export moodleAPI singleton", async () => {
    const { moodleAPI } = await import("../moodle-api");
    expect(moodleAPI).toBeDefined();
    expect(typeof moodleAPI.login).toBe("function");
    expect(typeof moodleAPI.logout).toBe("function");
    expect(typeof moodleAPI.isAuthenticated).toBe("function");
    expect(typeof moodleAPI.getUserCourses).toBe("function");
    expect(typeof moodleAPI.getCourseContents).toBe("function");
    expect(typeof moodleAPI.getFileUrl).toBe("function");
  });

  it("should not be authenticated initially", async () => {
    const { moodleAPI } = await import("../moodle-api");
    expect(moodleAPI.isAuthenticated()).toBe(false);
  });

  it("should generate correct file URL with token", async () => {
    const { moodleAPI } = await import("../moodle-api");
    // Without token, should return original URL
    const url = moodleAPI.getFileUrl("https://nilecenter.online/file.pdf");
    expect(url).toBe("https://nilecenter.online/file.pdf");
  });
});

describe("Sync Service", () => {
  it("should export syncService singleton", async () => {
    const { syncService } = await import("../sync-service");
    expect(syncService).toBeDefined();
    expect(typeof syncService.syncAll).toBe("function");
    expect(typeof syncService.syncCourse).toBe("function");
    expect(typeof syncService.getCourseLessons).toBe("function");
    expect(typeof syncService.getCourseLessonsBySection).toBe("function");
    expect(typeof syncService.markLessonComplete).toBe("function");
    expect(typeof syncService.isSyncInProgress).toBe("function");
  });

  it("should not be syncing initially", async () => {
    const { syncService } = await import("../sync-service");
    expect(syncService.isSyncInProgress()).toBe(false);
  });
});
