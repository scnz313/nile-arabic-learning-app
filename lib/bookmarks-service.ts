import AsyncStorage from "@react-native-async-storage/async-storage";

const BOOKMARKS_KEY = "nile_bookmarks";

export interface Bookmark {
  courseId: number;
  activityId: number;
  activityName: string;
  courseName: string;
  timestamp: number;
}

class BookmarksService {
  async getBookmarks(): Promise<Bookmark[]> {
    try {
      const data = await AsyncStorage.getItem(BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      return [];
    }
  }

  async addBookmark(bookmark: Omit<Bookmark, "timestamp">): Promise<void> {
    try {
      const bookmarks = await this.getBookmarks();
      const exists = bookmarks.some(
        (b) => b.courseId === bookmark.courseId && b.activityId === bookmark.activityId
      );
      
      if (!exists) {
        bookmarks.unshift({ ...bookmark, timestamp: Date.now() });
        await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      }
    } catch (error) {
      console.error("Error adding bookmark:", error);
    }
  }

  async removeBookmark(courseId: number, activityId: number): Promise<void> {
    try {
      const bookmarks = await this.getBookmarks();
      const filtered = bookmarks.filter(
        (b) => !(b.courseId === courseId && b.activityId === activityId)
      );
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error removing bookmark:", error);
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
