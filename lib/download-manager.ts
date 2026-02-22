import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const DOWNLOADS_KEY = "nile_downloads";
const DOWNLOAD_DIR = `${FileSystem.documentDirectory}offline/`;

export interface DownloadedLesson {
  activityId: string;
  courseId: number;
  activityName: string;
  courseName: string;
  content: any; // ActivityContent
  downloadedAt: number;
  size: number; // bytes
  mediaFiles: string[]; // local file paths
}

export interface DownloadProgress {
  activityId: string;
  progress: number; // 0-100
  status: "downloading" | "completed" | "failed";
  error?: string;
}

class DownloadManager {
  private downloadQueue: Map<string, DownloadProgress> = new Map();
  private listeners: Set<(progress: Map<string, DownloadProgress>) => void> = new Set();

  constructor() {
    this.ensureDownloadDir();
  }

  private async ensureDownloadDir() {
    if (Platform.OS === "web") return; // Skip on web
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
  }

  subscribeToProgress(callback: (progress: Map<string, DownloadProgress>) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback(new Map(this.downloadQueue)));
  }

  async getDownloadedLessons(): Promise<DownloadedLesson[]> {
    try {
      const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading downloaded lessons:", error);
      return [];
    }
  }

  async isDownloaded(activityId: string): Promise<boolean> {
    const downloads = await this.getDownloadedLessons();
    return downloads.some((d) => d.activityId === activityId);
  }

  async getDownloadedLesson(activityId: string): Promise<DownloadedLesson | null> {
    const downloads = await this.getDownloadedLessons();
    return downloads.find((d) => d.activityId === activityId) || null;
  }

  async downloadLesson(
    activityId: string,
    courseId: number,
    activityName: string,
    courseName: string,
    content: any
  ): Promise<void> {
    if (Platform.OS === "web") {
      throw new Error("Downloads are not supported on web");
    }
    // Set initial progress
    this.downloadQueue.set(activityId, {
      activityId,
      progress: 0,
      status: "downloading",
    });
    this.notifyListeners();

    try {
      await this.ensureDownloadDir();

      // Extract media URLs from content
      const mediaUrls: string[] = [];
      if (content.images) mediaUrls.push(...content.images);
      if (content.audioSources) mediaUrls.push(...content.audioSources);
      if (content.videoUrl) mediaUrls.push(content.videoUrl);

      const localMediaFiles: string[] = [];
      const totalFiles = mediaUrls.length;

      // Download media files
      for (let i = 0; i < mediaUrls.length; i++) {
        const url = mediaUrls[i];
        const fileName = `${activityId}_${i}_${url.split("/").pop()}`;
        const localPath = `${DOWNLOAD_DIR}${fileName}`;

        try {
          const downloadResult = await FileSystem.downloadAsync(url, localPath);
          if (downloadResult.status === 200) {
            localMediaFiles.push(localPath);
          }
        } catch (err) {
          console.warn(`Failed to download media: ${url}`, err);
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        this.downloadQueue.set(activityId, {
          activityId,
          progress,
          status: "downloading",
        });
        this.notifyListeners();
      }

      // Calculate total size
      let totalSize = 0;
      for (const filePath of localMediaFiles) {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && "size" in fileInfo) {
          totalSize += fileInfo.size;
        }
      }

      // Save download record
      const downloads = await this.getDownloadedLessons();
      const newDownload: DownloadedLesson = {
        activityId,
        courseId,
        activityName,
        courseName,
        content,
        downloadedAt: Date.now(),
        size: totalSize,
        mediaFiles: localMediaFiles,
      };

      downloads.push(newDownload);
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));

      // Mark as completed
      this.downloadQueue.set(activityId, {
        activityId,
        progress: 100,
        status: "completed",
      });
      this.notifyListeners();

      // Remove from queue after a delay
      setTimeout(() => {
        this.downloadQueue.delete(activityId);
        this.notifyListeners();
      }, 2000);
    } catch (error: any) {
      console.error("Download error:", error);
      this.downloadQueue.set(activityId, {
        activityId,
        progress: 0,
        status: "failed",
        error: error.message || "Download failed",
      });
      this.notifyListeners();
    }
  }

  async deleteDownload(activityId: string): Promise<void> {
    try {
      const downloads = await this.getDownloadedLessons();
      const download = downloads.find((d) => d.activityId === activityId);

      if (download) {
        // Delete media files
        for (const filePath of download.mediaFiles) {
          try {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          } catch (err) {
            console.warn(`Failed to delete file: ${filePath}`, err);
          }
        }

        // Remove from storage
        const filtered = downloads.filter((d) => d.activityId !== activityId);
        await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error("Error deleting download:", error);
      throw error;
    }
  }

  async getTotalDownloadSize(): Promise<number> {
    const downloads = await this.getDownloadedLessons();
    return downloads.reduce((sum, d) => sum + d.size, 0);
  }

  async clearAllDownloads(): Promise<void> {
    try {
      const downloads = await this.getDownloadedLessons();
      
      // Delete all media files
      for (const download of downloads) {
        for (const filePath of download.mediaFiles) {
          try {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          } catch (err) {
            console.warn(`Failed to delete file: ${filePath}`, err);
          }
        }
      }

      // Clear storage
      await AsyncStorage.removeItem(DOWNLOADS_KEY);
    } catch (error) {
      console.error("Error clearing downloads:", error);
      throw error;
    }
  }
}

export const downloadManager = new DownloadManager();
