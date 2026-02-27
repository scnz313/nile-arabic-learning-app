import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MoodleCourse, CourseFullData, ActivityContent, MoodleSection } from "./moodle-api";

const KEYS = {
  COURSES: "@nile_courses",
  COURSE_DATA: "@nile_course_data_",
  ACTIVITY_CONTENT: "@nile_activity_",
  SETTINGS: "@nile_settings",
  LAST_SYNC: "@nile_last_sync",
  COMPLETED: "@nile_completed_",
  ARCHIVE_LOG: "@nile_archive_log",
};

export interface UserSettings {
  notificationsEnabled: boolean;
  autoSync: boolean;
  theme: string;
}

export interface ArchiveLogEntry {
  timestamp: number;
  courseId: number;
  action: "new_course" | "new_section" | "new_activity" | "content_updated" | "content_hidden";
  details: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  notificationsEnabled: true,
  autoSync: true,
  theme: "auto",
};

class StorageService {
  // ─── COURSES (append-only: new courses are added, old ones never removed) ───

  async saveCourses(newCourses: MoodleCourse[]): Promise<{ added: number; total: number }> {
    const existing = await this.getCourses();
    const existingIds = new Set(existing.map((c) => c.id));
    let added = 0;

    for (const course of newCourses) {
      if (!existingIds.has(course.id)) {
        existing.push(course);
        existingIds.add(course.id);
        added++;
        await this.addArchiveLog(course.id, "new_course", `New course: ${course.fullname}`);
      } else {
        // Update name if changed, but never remove
        const idx = existing.findIndex((c) => c.id === course.id);
        if (idx >= 0) {
          existing[idx].fullname = course.fullname;
          existing[idx].shortname = course.shortname;
          existing[idx].url = course.url;
          // Mark as currently visible
          existing[idx].hidden = false;
        }
      }
    }

    // Mark courses not in newCourses as hidden (teacher removed visibility)
    // but NEVER delete them
    const newIds = new Set(newCourses.map((c) => c.id));
    for (const course of existing) {
      if (!newIds.has(course.id) && !course.hidden) {
        course.hidden = true;
        await this.addArchiveLog(course.id, "content_hidden", `Course hidden by teacher: ${course.fullname}`);
      }
    }

    await AsyncStorage.setItem(KEYS.COURSES, JSON.stringify(existing));
    return { added, total: existing.length };
  }

  async getCourses(): Promise<(MoodleCourse & { hidden?: boolean })[]> {
    const data = await AsyncStorage.getItem(KEYS.COURSES);
    return data ? JSON.parse(data) : [];
  }

  async updateCourseMeta(courseId: number, meta: Partial<MoodleCourse>): Promise<void> {
    const courses = await this.getCourses();
    const idx = courses.findIndex((c) => c.id === courseId);
    if (idx >= 0) {
      Object.assign(courses[idx], meta);
      await AsyncStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    }
  }

  // ─── COURSE DATA (merge: new sections/activities appended, old ones preserved) ───

  async saveCourseData(courseId: number, newData: CourseFullData): Promise<{ newSections: number; newActivities: number }> {
    const existing = await this.getCourseData(courseId);
    let newSections = 0;
    let newActivities = 0;

    if (!existing) {
      // First time — save everything
      const enriched: CourseFullData = {
        ...newData,
        sections: newData.sections.map((s) => ({
          ...s,
          activities: s.activities.map((a) => ({ ...a, hidden: false, firstSeen: Date.now() })),
          hidden: false,
          firstSeen: Date.now(),
        })),
        lastUpdated: Date.now(),
      };
      await AsyncStorage.setItem(KEYS.COURSE_DATA + courseId, JSON.stringify(enriched));
      newSections = newData.totalSections;
      newActivities = newData.totalActivities;
      return { newSections, newActivities };
    }

    // Merge: keep all old sections/activities, add new ones
    const existingSectionMap = new Map<string, any>();
    for (const section of existing.sections) {
      existingSectionMap.set(section.name, section);
    }

    const mergedSections: any[] = [...existing.sections];

    for (const newSection of newData.sections) {
      const existingSection = existingSectionMap.get(newSection.name);

      if (!existingSection) {
        // Brand new section — add it
        mergedSections.push({
          ...newSection,
          activities: newSection.activities.map((a) => ({ ...a, hidden: false, firstSeen: Date.now() })),
          hidden: false,
          firstSeen: Date.now(),
        });
        newSections++;
        newActivities += newSection.activities.length;
        await this.addArchiveLog(courseId, "new_section", `New section: ${newSection.name}`);
      } else {
        // Existing section — merge activities
        const existingActivityIds = new Set(existingSection.activities.map((a: any) => a.id));
        existingSection.hidden = false; // Mark as visible again

        for (const activity of newSection.activities) {
          if (!existingActivityIds.has(activity.id)) {
            existingSection.activities.push({ ...activity, hidden: false, firstSeen: Date.now() });
            newActivities++;
            await this.addArchiveLog(courseId, "new_activity", `New activity: ${activity.name} in ${newSection.name}`);
          } else {
            // Update existing activity but never remove
            const idx = existingSection.activities.findIndex((a: any) => a.id === activity.id);
            if (idx >= 0) {
              existingSection.activities[idx].name = activity.name;
              existingSection.activities[idx].url = activity.url;
              existingSection.activities[idx].hidden = false;
            }
          }
        }

        // Mark activities not in new data as hidden
        const newActivityIds = new Set(newSection.activities.map((a) => a.id));
        for (const activity of existingSection.activities) {
          if (!newActivityIds.has(activity.id) && !activity.hidden) {
            activity.hidden = true;
            await this.addArchiveLog(courseId, "content_hidden", `Activity hidden: ${activity.name}`);
          }
        }
      }
    }

    // Mark sections not in new data as hidden
    const newSectionNames = new Set(newData.sections.map((s) => s.name));
    for (const section of mergedSections) {
      if (!newSectionNames.has(section.name) && !section.hidden) {
        section.hidden = true;
        await this.addArchiveLog(courseId, "content_hidden", `Section hidden: ${section.name}`);
      }
    }

    const totalActivities = mergedSections.reduce((sum, s) => sum + (s.activities?.length || 0), 0);

    const merged: CourseFullData = {
      ...existing,
      tabs: newData.tabs,
      intro: newData.intro || existing.intro,
      sections: mergedSections,
      totalSections: mergedSections.length,
      totalActivities,
      lastUpdated: Date.now(),
    };

    await AsyncStorage.setItem(KEYS.COURSE_DATA + courseId, JSON.stringify(merged));
    return { newSections, newActivities };
  }

  async getCourseData(courseId: number): Promise<(CourseFullData & { lastUpdated?: number }) | null> {
    const data = await AsyncStorage.getItem(KEYS.COURSE_DATA + courseId);
    return data ? JSON.parse(data) : null;
  }

  // ─── ACTIVITY CONTENT CACHE (always update, never delete) ───

  async cacheActivityContent(activityId: string, content: ActivityContent): Promise<void> {
    // Store with timestamp so we know when it was last fetched
    const entry = {
      ...content,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(KEYS.ACTIVITY_CONTENT + activityId, JSON.stringify(entry));
  }

  async getCachedActivityContent(activityId: string): Promise<(ActivityContent & { cachedAt?: number }) | null> {
    const data = await AsyncStorage.getItem(KEYS.ACTIVITY_CONTENT + activityId);
    return data ? JSON.parse(data) : null;
  }

  // ─── COMPLETION TRACKING ───

  async markActivityComplete(courseId: number, activityId: string): Promise<void> {
    const completed = await this.getCompletedActivities(courseId);
    if (!completed.includes(activityId)) {
      completed.push(activityId);
      await AsyncStorage.setItem(KEYS.COMPLETED + courseId, JSON.stringify(completed));
    }
  }

  async getCompletedActivities(courseId: number): Promise<string[]> {
    const data = await AsyncStorage.getItem(KEYS.COMPLETED + courseId);
    return data ? JSON.parse(data) : [];
  }

  async getCompletionCount(courseId: number): Promise<{ completed: number; total: number }> {
    const courseData = await this.getCourseData(courseId);
    const completed = await this.getCompletedActivities(courseId);
    const total = courseData?.totalActivities || 0;
    return { completed: completed.length, total };
  }

  // ─── ARCHIVE LOG ───

  async addArchiveLog(courseId: number, action: ArchiveLogEntry["action"], details: string): Promise<void> {
    const logs = await this.getArchiveLog();
    logs.push({ timestamp: Date.now(), courseId, action, details });
    // Keep last 500 log entries
    const trimmed = logs.slice(-500);
    await AsyncStorage.setItem(KEYS.ARCHIVE_LOG, JSON.stringify(trimmed));
  }

  async getArchiveLog(): Promise<ArchiveLogEntry[]> {
    const data = await AsyncStorage.getItem(KEYS.ARCHIVE_LOG);
    return data ? JSON.parse(data) : [];
  }

  async getRecentChanges(limit: number = 20): Promise<ArchiveLogEntry[]> {
    const logs = await this.getArchiveLog();
    return logs.slice(-limit).reverse();
  }

  // ─── SETTINGS ───

  async getUserSettings(): Promise<UserSettings> {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  }

  async setUserSettings(updates: Partial<UserSettings>): Promise<void> {
    const current = await this.getUserSettings();
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...updates }));
  }

  // ─── SYNC TIME ───

  async setLastSyncTime(time: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, String(time));
  }

  async getLastSyncTime(): Promise<number | null> {
    const data = await AsyncStorage.getItem(KEYS.LAST_SYNC);
    return data ? parseInt(data, 10) : null;
  }

  // ─── CLEAR (only clears cache, not archived content) ───

  async clearCache(): Promise<void> {
    // Only clear activity content cache, NOT courses or course data
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(KEYS.ACTIVITY_CONTENT));
    await AsyncStorage.multiRemove(cacheKeys);
  }

  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const nileKeys = keys.filter((k) => k.startsWith("@nile_"));
    await AsyncStorage.multiRemove(nileKeys);
  }

  // ─── STORAGE STATS ───

  async getStorageStats(): Promise<{
    totalCourses: number;
    totalSections: number;
    totalActivities: number;
    cachedContents: number;
    archiveEntries: number;
    hiddenItems: number;
  }> {
    const courses = await this.getCourses();
    let totalSections = 0;
    let totalActivities = 0;
    let hiddenItems = 0;

    for (const course of courses) {
      if (course.hidden) hiddenItems++;
      const data = await this.getCourseData(course.id);
      if (data) {
        totalSections += data.sections?.length || 0;
        for (const section of data.sections || []) {
          totalActivities += section.activities?.length || 0;
          if ((section as any).hidden) hiddenItems++;
          for (const act of section.activities || []) {
            if ((act as any).hidden) hiddenItems++;
          }
        }
      }
    }

    const keys = await AsyncStorage.getAllKeys();
    const cachedContents = keys.filter((k) => k.startsWith(KEYS.ACTIVITY_CONTENT)).length;
    const archiveEntries = (await this.getArchiveLog()).length;

    return { totalCourses: courses.length, totalSections, totalActivities, cachedContents, archiveEntries, hiddenItems };
  }
}

export const storageService = new StorageService();
