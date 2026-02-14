import AsyncStorage from "@react-native-async-storage/async-storage";

const MOODLE_BASE_URL = "https://nilecenter.online";
const MOODLE_WS_URL = `${MOODLE_BASE_URL}/webservice/rest/server.php`;
const MOODLE_LOGIN_URL = `${MOODLE_BASE_URL}/login/token.php`;
const TOKEN_KEY = "@nile_moodle_token";

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname: string;
  summary: string;
  progress: number | null;
  overviewfiles?: { fileurl: string; filename: string }[];
}

export interface MoodleSection {
  id: number;
  name: string;
  summary: string;
  visible: number;
  modules: MoodleModule[];
}

export interface MoodleModule {
  id: number;
  name: string;
  modname: string;
  url?: string;
  description?: string;
  visible: number;
  uservisible?: boolean;
  contents?: MoodleContent[];
}

export interface MoodleContent {
  type: string;
  filename: string;
  fileurl: string;
  filesize: number;
  mimetype?: string;
  timecreated?: number;
  timemodified?: number;
}

export interface MoodleSiteInfo {
  userid: number;
  username: string;
  fullname: string;
  sitename: string;
}

class MoodleAPI {
  private token: string | null = null;

  async init(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        this.token = stored;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async login(username: string, password: string): Promise<string> {
    const params = new URLSearchParams({
      username,
      password,
      service: "moodle_mobile_app",
    });

    const response = await fetch(`${MOODLE_LOGIN_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }
    if (!data.token) {
      throw new Error("Login failed: no token received");
    }

    this.token = data.token;
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    return data.token;
  }

  async logout(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  private async callWS<T>(wsfunction: string, params: Record<string, string | number> = {}): Promise<T> {
    if (!this.token) {
      throw new Error("Not authenticated");
    }

    const urlParams = new URLSearchParams({
      wstoken: this.token,
      wsfunction,
      moodlewsrestformat: "json",
    });

    for (const [key, value] of Object.entries(params)) {
      urlParams.append(key, String(value));
    }

    const response = await fetch(`${MOODLE_WS_URL}?${urlParams.toString()}`);
    const data = await response.json();

    if (data.exception) {
      throw new Error(data.message || data.exception);
    }

    return data as T;
  }

  async getSiteInfo(): Promise<MoodleSiteInfo> {
    return this.callWS<MoodleSiteInfo>("core_webservice_get_site_info");
  }

  async getUserCourses(userId?: number): Promise<MoodleCourse[]> {
    const params: Record<string, string | number> = {};
    if (userId) {
      params.userid = userId;
    }
    return this.callWS<MoodleCourse[]>("core_enrol_get_users_courses", params);
  }

  async getCourseContents(courseId: number): Promise<MoodleSection[]> {
    return this.callWS<MoodleSection[]>("core_course_get_contents", {
      courseid: courseId,
    });
  }

  getFileUrl(fileUrl: string): string {
    if (!this.token) return fileUrl;
    const separator = fileUrl.includes("?") ? "&" : "?";
    return `${fileUrl}${separator}token=${this.token}`;
  }
}

export const moodleAPI = new MoodleAPI();
