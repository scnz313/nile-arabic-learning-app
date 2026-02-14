import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  USER_INFO: "@nile_user_info",
  COURSES: "@nile_courses",
  COURSE_CONTENTS: "@nile_course_contents_",
  SETTINGS: "@nile_settings",
  LAST_SYNC: "@nile_last_sync",
  NOTIFICATIONS: "@nile_notifications",
};

export interface UserInfo {
  userId: number;
  username: string;
  fullName: string;
  email: string;
}

export interface CourseData {
  id: number;
  moodleCourseId: number;
  shortName: string;
  fullName: string;
  displayName: string;
  summary: string;
  thumbnailUrl?: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  updatedAt: number;
}

export interface LessonData {
  id: string;
  moodleModuleId: number;
  courseId: number;
  sectionId: number;
  sectionName: string;
  name: string;
  moduleName: string;
  description?: string;
  contentType: string;
  url?: string;
  isCompleted: boolean;
  lastAccessedAt?: number;
  completedAt?: number;
  resources: ResourceData[];
}

export interface ResourceData {
  id: string;
  lessonId: string;
  name: string;
  type: string;
  url: string;
  fileSize?: number;
  mimeType?: string;
  isDownloaded: boolean;
}

export interface UserSettings {
  autoDownloadNewContent: boolean;
  wifiOnlyDownload: boolean;
  videoQuality: string;
  notificationsEnabled: boolean;
  theme: string;
  language: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  autoDownloadNewContent: false,
  wifiOnlyDownload: true,
  videoQuality: "auto",
  notificationsEnabled: true,
  theme: "auto",
  language: "en",
};

class StorageService {
  async setUserInfo(info: UserInfo): Promise<void> {
    await AsyncStorage.setItem(KEYS.USER_INFO, JSON.stringify(info));
  }

  async getUserInfo(): Promise<UserInfo | null> {
    const data = await AsyncStorage.getItem(KEYS.USER_INFO);
    return data ? JSON.parse(data) : null;
  }

  async setCourses(courses: CourseData[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
  }

  async getCourses(): Promise<CourseData[]> {
    const data = await AsyncStorage.getItem(KEYS.COURSES);
    return data ? JSON.parse(data) : [];
  }

  async getCourse(moodleCourseId: number): Promise<CourseData | null> {
    const courses = await this.getCourses();
    return courses.find((c) => c.moodleCourseId === moodleCourseId) || null;
  }

  async updateCourse(moodleCourseId: number, updates: Partial<CourseData>): Promise<void> {
    const courses = await this.getCourses();
    const index = courses.findIndex((c) => c.moodleCourseId === moodleCourseId);
    if (index !== -1) {
      courses[index] = { ...courses[index], ...updates };
      await this.setCourses(courses);
    }
  }

  async setCourseContents(courseId: number, lessons: LessonData[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.COURSE_CONTENTS + courseId, JSON.stringify(lessons));
  }

  async getCourseContents(courseId: number): Promise<LessonData[]> {
    const data = await AsyncStorage.getItem(KEYS.COURSE_CONTENTS + courseId);
    return data ? JSON.parse(data) : [];
  }

  async getLesson(courseId: number, lessonId: string): Promise<LessonData | null> {
    const lessons = await this.getCourseContents(courseId);
    return lessons.find((l) => l.id === lessonId) || null;
  }

  async updateLesson(courseId: number, lessonId: string, updates: Partial<LessonData>): Promise<void> {
    const lessons = await this.getCourseContents(courseId);
    const index = lessons.findIndex((l) => l.id === lessonId);
    if (index !== -1) {
      lessons[index] = { ...lessons[index], ...updates };
      await this.setCourseContents(courseId, lessons);
    }
  }

  async markLessonComplete(courseId: number, lessonId: string): Promise<void> {
    await this.updateLesson(courseId, lessonId, {
      isCompleted: true,
      completedAt: Date.now(),
    });
    const lessons = await this.getCourseContents(courseId);
    const total = lessons.length;
    const completed = lessons.filter((l) => l.isCompleted).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    await this.updateCourse(courseId, { totalLessons: total, completedLessons: completed, progress });
  }

  async getUserSettings(): Promise<UserSettings> {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  }

  async setUserSettings(updates: Partial<UserSettings>): Promise<void> {
    const current = await this.getUserSettings();
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...updates }));
  }

  async setLastSyncTime(time: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, String(time));
  }

  async getLastSyncTime(): Promise<number | null> {
    const data = await AsyncStorage.getItem(KEYS.LAST_SYNC);
    return data ? parseInt(data, 10) : null;
  }

  async addNotification(notification: AppNotification): Promise<void> {
    const notifications = await this.getNotifications();
    notifications.unshift(notification);
    if (notifications.length > 50) notifications.pop();
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }

  async getNotifications(): Promise<AppNotification[]> {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  }

  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const nileKeys = keys.filter((k) => k.startsWith("@nile_"));
    await AsyncStorage.multiRemove(nileKeys);
  }
}

export const storage = new StorageService();
