import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";

const CREDENTIALS_KEY = "@nile_credentials";

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  url?: string;
  hidden?: boolean;
  totalSections?: number;
  totalActivities?: number;
  completedActivities?: number;
}

export interface MoodleActivity {
  id: string;
  name: string;
  modType: string;
  url: string;
  icon?: string;
  hidden?: boolean;
  firstSeen?: number;
}

export interface MoodleSection {
  name: string;
  activities: MoodleActivity[];
  hidden?: boolean;
  firstSeen?: number;
}

export interface CourseFullData {
  courseId: number;
  tabs: string[];
  intro: MoodleSection;
  sections: MoodleSection[];
  totalSections: number;
  totalActivities: number;
  lastUpdated?: number;
}

export interface ActivityContent {
  type: string;
  title: string;
  html?: string;
  audioSources?: string[];
  images?: string[];
  iframes?: string[];
  chapters?: { name: string; url: string; content?: string }[];
  videoUrl?: string;
  iframeSrc?: string;
  vimeoUrl?: string;
  externalUrl?: string;
  downloadUrl?: string;
  description?: string;
  discussions?: { subject: string; author: string; date: string; content: string }[];
  status?: string;
  attemptsHtml?: string;
  attempts?: number;
  dueDate?: string;
}

class MoodleAPI {
  private username: string | null = null;
  private password: string | null = null;
  private fullName: string | null = null;

  private getProxyBaseUrl(): string {
    return getApiBaseUrl();
  }

  async init(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
      if (stored) {
        const creds = JSON.parse(stored);
        this.username = creds.username;
        this.password = creds.password;
        this.fullName = creds.fullName || null;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async login(username: string, password: string): Promise<{ fullName: string }> {
    const proxyUrl = `${this.getProxyBaseUrl()}/api/moodle/login`;
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Login failed");
    }

    this.username = username;
    this.password = password;
    this.fullName = data.user?.fullName || username;

    await AsyncStorage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({ username, password, fullName: this.fullName })
    );

    return { fullName: this.fullName || username };
  }

  async logout(): Promise<void> {
    this.username = null;
    this.password = null;
    this.fullName = null;
    await AsyncStorage.removeItem(CREDENTIALS_KEY);
  }

  isAuthenticated(): boolean {
    return this.username !== null && this.password !== null;
  }

  getFullName(): string {
    return this.fullName || this.username || "Student";
  }

  getUsername(): string {
    return this.username || "";
  }

  async getUserCourses(): Promise<MoodleCourse[]> {
    if (!this.username || !this.password) throw new Error("Not authenticated");

    const response = await fetch(`${this.getProxyBaseUrl()}/api/moodle/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return (data.courses || []).map((c: any) => ({
      id: c.id,
      shortname: c.shortname || c.fullname,
      fullname: c.fullname,
      url: c.url,
    }));
  }

  async getCourseFull(courseId: number): Promise<CourseFullData> {
    if (!this.username || !this.password) throw new Error("Not authenticated");

    const response = await fetch(`${this.getProxyBaseUrl()}/api/moodle/course-full`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: this.username, password: this.password, courseId }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  async getActivityContent(activityUrl: string, modType: string): Promise<ActivityContent> {
    if (!this.username || !this.password) throw new Error("Not authenticated");

    const response = await fetch(`${this.getProxyBaseUrl()}/api/moodle/activity-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
        activityUrl,
        modType,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  getProxyMediaUrl(url: string): string {
    if (!url) return "";
    const base = this.getProxyBaseUrl();
    return `${base}/api/moodle/proxy-media?url=${encodeURIComponent(url)}&username=${encodeURIComponent(this.username || "")}&password=${encodeURIComponent(this.password || "")}`;
  }
}

export const moodleAPI = new MoodleAPI();
