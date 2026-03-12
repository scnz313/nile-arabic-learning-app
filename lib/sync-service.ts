import { moodleAPI, type CourseFullData } from "./moodle-api";
import { storageService } from "./storage";

export interface SyncResult {
  coursesUpdated: number;
  newCourses: number;
  newSections: number;
  newActivities: number;
  errors: string[];
}

class SyncService {
  private isSyncing = false;

  async syncAllCourses(): Promise<SyncResult> {
    if (this.isSyncing) return { coursesUpdated: 0, newCourses: 0, newSections: 0, newActivities: 0, errors: ["Sync already in progress"] };
    this.isSyncing = true;

    const result: SyncResult = { coursesUpdated: 0, newCourses: 0, newSections: 0, newActivities: 0, errors: [] };

    try {
      // Get enrolled courses (these have full content access)
      const enrolledCourses = await moodleAPI.getUserCourses();

      // Also discover all Arabic levels from catalog
      let catalogCourses: import("./moodle-api").MoodleCourse[] = [];
      try {
        const catalog = await moodleAPI.getCourseCatalog();
        for (const levelInfo of catalog.levels) {
          const latest = levelInfo.latestCourse;
          const isEnrolled = enrolledCourses.some(c => c.id === latest.id);
          if (!isEnrolled) {
            catalogCourses.push({
              id: latest.id,
              fullname: latest.fullname || `Arabic Level ${String(levelInfo.level).padStart(2, "0")}`,
              shortname: latest.shortname || latest.fullname?.split(" - ")[0] || "",
              url: latest.url,
            });
          }
        }
      } catch (catalogErr: any) {
        console.warn("Catalog fetch failed:", catalogErr.message);
      }

      // Merge: enrolled courses first, then catalog discoveries
      const allCourses = [...enrolledCourses, ...catalogCourses];

      const { added } = await storageService.saveCourses(allCourses);
      result.newCourses = added;

      // Sync full content for enrolled courses only (they have access)
      for (const course of enrolledCourses) {
        try {
          const fullData = await moodleAPI.getCourseFull(course.id);
          const { newSections, newActivities } = await storageService.saveCourseData(course.id, fullData);
          result.coursesUpdated++;
          result.newSections += newSections;
          result.newActivities += newActivities;
        } catch (err: any) {
          result.errors.push(`Failed to sync ${course.shortname}: ${err.message}`);
        }
      }

      await storageService.setLastSyncTime(Date.now());
    } catch (err: any) {
      result.errors.push(`Sync failed: ${err.message}`);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  async syncSingleCourse(courseId: number): Promise<CourseFullData | null> {
    try {
      const fullData = await moodleAPI.getCourseFull(courseId);
      await storageService.saveCourseData(courseId, fullData);
      return fullData;
    } catch (err: any) {
      console.error("Sync single course error:", err);
      return null;
    }
  }

  // Deep sync: fetch and cache ALL activity content for a course
  async deepSyncCourse(courseId: number, onProgress?: (current: number, total: number) => void): Promise<number> {
    const courseData = await storageService.getCourseData(courseId);
    if (!courseData) return 0;

    let cached = 0;
    const allActivities = courseData.sections.flatMap((s) => s.activities || []);
    const total = allActivities.length;

    for (let i = 0; i < allActivities.length; i++) {
      const activity = allActivities[i];
      if (!activity.url || activity.hidden) continue;

      try {
        // Check if already cached
        const existing = await storageService.getCachedActivityContent(activity.id);
        if (!existing) {
          const content = await moodleAPI.getActivityContent(activity.url, activity.modType);
          await storageService.cacheActivityContent(activity.id, content);
          cached++;
        }
      } catch (_) {
        // Skip failed activities
      }

      onProgress?.(i + 1, total);
    }

    return cached;
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
