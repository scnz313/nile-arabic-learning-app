import { moodleAPI, type CourseFullData } from "./moodle-api";
import { storageService } from "./storage";

export interface SyncResult {
  coursesUpdated: number;
  newActivities: number;
  errors: string[];
}

class SyncService {
  private isSyncing = false;

  async syncAllCourses(): Promise<SyncResult> {
    if (this.isSyncing) return { coursesUpdated: 0, newActivities: 0, errors: ["Sync already in progress"] };
    this.isSyncing = true;

    const result: SyncResult = { coursesUpdated: 0, newActivities: 0, errors: [] };

    try {
      const courses = await moodleAPI.getUserCourses();
      await storageService.saveCourses(courses);

      for (const course of courses) {
        try {
          const fullData = await moodleAPI.getCourseFull(course.id);
          await storageService.saveCourseData(course.id, fullData);
          result.coursesUpdated++;
          result.newActivities += fullData.totalActivities;
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

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
