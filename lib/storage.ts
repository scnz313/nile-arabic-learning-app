import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MoodleCourse, CourseFullData } from "./moodle-api";

const KEYS = {
  COURSES: "@nile_courses",
  COURSE_DATA: "@nile_course_data_",
  ACTIVITY_CONTENT: "@nile_activity_",
  SETTINGS: "@nile_settings",
  LAST_SYNC: "@nile_last_sync",
  COMPLETED: "@nile_completed_",
};

export interface UserSettings {
  notificationsEnabled: boolean;
  autoSync: boolean;
  theme: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  notificationsEnabled: true,
  autoSync: true,
  theme: "auto",
};

class StorageService {
  // Courses list
  async saveCourses(courses: MoodleCourse[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
  }

  async getCourses(): Promise<MoodleCourse[]> {
    const data = await AsyncStorage.getItem(KEYS.COURSES);
    return data ? JSON.parse(data) : [];
  }

  // Full course data (sections + activities)
  async saveCourseData(courseId: number, data: CourseFullData): Promise<void> {
    await AsyncStorage.setItem(KEYS.COURSE_DATA + courseId, JSON.stringify(data));
  }

  async getCourseData(courseId: number): Promise<CourseFullData | null> {
    const data = await AsyncStorage.getItem(KEYS.COURSE_DATA + courseId);
    return data ? JSON.parse(data) : null;
  }

  // Completion tracking
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

  // Activity content cache
  async cacheActivityContent(activityId: string, content: any): Promise<void> {
    await AsyncStorage.setItem(KEYS.ACTIVITY_CONTENT + activityId, JSON.stringify(content));
  }

  async getCachedActivityContent(activityId: string): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.ACTIVITY_CONTENT + activityId);
    return data ? JSON.parse(data) : null;
  }

  // Settings
  async getUserSettings(): Promise<UserSettings> {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  }

  async setUserSettings(updates: Partial<UserSettings>): Promise<void> {
    const current = await this.getUserSettings();
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...updates }));
  }

  // Sync time
  async setLastSyncTime(time: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, String(time));
  }

  async getLastSyncTime(): Promise<number | null> {
    const data = await AsyncStorage.getItem(KEYS.LAST_SYNC);
    return data ? parseInt(data, 10) : null;
  }

  // Clear all
  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const nileKeys = keys.filter((k) => k.startsWith("@nile_"));
    await AsyncStorage.multiRemove(nileKeys);
  }
}

export const storageService = new StorageService();
