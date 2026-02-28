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
      // Fetch current courses from website
      const courses = await moodleAPI.getUserCourses();
      
      // Archive-aware save: appends new courses, marks hidden ones, never deletes
      const { added } = await storageService.saveCourses(courses);
      result.newCourses = added;

      // Sync each visible course's full content
      for (const course of courses) {
        try {
          const fullData = await moodleAPI.getCourseFull(course.id);
          
          // Archive-aware merge: appends new sections/activities, marks hidden ones, never deletes
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
    let courseData;
    try {
      courseData = await storageService.getCourseData(courseId);
    } catch (err) {
      console.error("Error loading course data for deep sync:", err);
      return 0;
    }
    if (!courseData?.sections) return 0;

    let cached = 0;
    const allActivities = courseData.sections.flatMap((s) => s.activities || []);
    const total = allActivities.length;

    for (let i = 0; i < allActivities.length; i++) {
      const activity = allActivities[i];
      if (!activity?.url || activity.hidden) continue;

      try {
        const existing = await storageService.getCachedActivityContent(activity.id);
        if (!existing) {
          const content = await moodleAPI.getActivityContent(activity.url, activity.modType);
          await storageService.cacheActivityContent(activity.id, content);
          cached++;
        }
      } catch {
        // Individual activity failures are non-critical — skip and continue
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
