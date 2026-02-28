import AsyncStorage from "@react-native-async-storage/async-storage";

const BOOKMARKS_KEY = "nile_bookmarks";

export interface Bookmark {
  courseId: number;
  activityId: number;
  activityName: string;
  courseName: string;
  timestamp: number;
}

function safeParse<T>(data: string | null, fallback: T): T {
  if (!data) return fallback;
  try { return JSON.parse(data); } catch { return fallback; }
}

class BookmarksService {
  async getBookmarks(): Promise<Bookmark[]> {
    try {
      const data = await AsyncStorage.getItem(BOOKMARKS_KEY);
      return safeParse<Bookmark[]>(data, []);
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      return [];
    }
  }

  async addBookmark(bookmark: Omit<Bookmark, "timestamp">): Promise<boolean> {
    if (!bookmark.activityName || !bookmark.courseName) return false;
    try {
      const bookmarks = await this.getBookmarks();
      const exists = bookmarks.some(
        (b) => b.courseId === bookmark.courseId && b.activityId === bookmark.activityId
      );
      
      if (!exists) {
        bookmarks.unshift({ ...bookmark, timestamp: Date.now() });
        await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      }
      return true;
    } catch (error) {
      console.error("Error adding bookmark:", error);
      return false;
    }
  }

  async removeBookmark(courseId: number, activityId: number): Promise<boolean> {
    try {
      const bookmarks = await this.getBookmarks();
      const filtered = bookmarks.filter(
        (b) => !(b.courseId === courseId && b.activityId === activityId)
      );
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error("Error removing bookmark:", error);
      return false;
    }
  }

  async isBookmarked(courseId: number, activityId: number): Promise<boolean> {
    try {
      const bookmarks = await this.getBookmarks();
      return bookmarks.some(
        (b) => b.courseId === courseId && b.activityId === activityId
      );
    } catch (error) {
      console.error("Error checking bookmark:", error);
      return false;
    }
  }
}

export const bookmarksService = new BookmarksService();
