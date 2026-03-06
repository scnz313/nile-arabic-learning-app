import { beforeEach, describe, expect, it, vi } from "vitest";

const { moodleAPIMock, storageServiceMock } = vi.hoisted(() => ({
  moodleAPIMock: {
    getUserCourses: vi.fn(),
    getCourseFull: vi.fn(),
    getActivityContent: vi.fn(),
  },
  storageServiceMock: {
    saveCourses: vi.fn(),
    saveCourseData: vi.fn(),
    getCourseData: vi.fn(),
    cacheActivityContent: vi.fn(),
    setLastSyncTime: vi.fn(),
  },
}));

vi.mock("../moodle-api", () => ({
  moodleAPI: moodleAPIMock,
}));

vi.mock("../storage", () => ({
  storageService: storageServiceMock,
}));

import { syncService } from "../sync-service";

describe("syncService quiz caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("caches discovered course quizzes during sync", async () => {
    const courseData = {
      courseId: 101,
      tabs: ["Lessons"],
      intro: { name: "Intro", activities: [] },
      sections: [
        {
          name: "Assessments",
          activities: [
            { id: "6001", name: "Midterm Quiz", modType: "quiz", url: "https://example.com/mod/quiz/view.php?id=6001" },
            { id: "6002", name: "Final Quiz", modType: "quiz", url: "https://example.com/mod/quiz/view.php?id=6002" },
          ],
        },
      ],
      totalSections: 1,
      totalActivities: 2,
    };

    moodleAPIMock.getUserCourses.mockResolvedValue([
      { id: 101, shortname: "Arabic Level 1", fullname: "Arabic Level 1" },
    ]);
    moodleAPIMock.getCourseFull.mockResolvedValue(courseData);
    moodleAPIMock.getActivityContent.mockResolvedValue({
      type: "quiz",
      title: "Quiz",
      description: "Cached quiz",
      attemptsHtml: "<div>Attempts open</div>",
    });

    storageServiceMock.saveCourses.mockResolvedValue({ added: 0, total: 1 });
    storageServiceMock.saveCourseData.mockResolvedValue({ newSections: 0, newActivities: 0 });
    storageServiceMock.getCourseData.mockResolvedValue(courseData);
    storageServiceMock.cacheActivityContent.mockResolvedValue(undefined);
    storageServiceMock.setLastSyncTime.mockResolvedValue(undefined);

    const result = await syncService.syncAllCourses();

    expect(result.errors).toEqual([]);
    expect(moodleAPIMock.getActivityContent).toHaveBeenCalledTimes(2);
    expect(moodleAPIMock.getActivityContent).toHaveBeenCalledWith(
      "https://example.com/mod/quiz/view.php?id=6001",
      "quiz",
    );
    expect(moodleAPIMock.getActivityContent).toHaveBeenCalledWith(
      "https://example.com/mod/quiz/view.php?id=6002",
      "quiz",
    );
    expect(storageServiceMock.cacheActivityContent).toHaveBeenCalledTimes(2);
  });
});
