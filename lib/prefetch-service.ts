import { moodleAPI } from "./moodle-api";
import { webViewCacheService } from "./webview-cache-service";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFETCH_QUEUE_KEY = "prefetch_queue";
const PREFETCH_STATUS_KEY = "prefetch_status";

export interface PrefetchItem {
  courseId: string;
  activityId: string;
  activityName: string;
  priority: number; // Higher = more important
  addedAt: number;
}

export interface PrefetchStatus {
  [key: string]: {
    status: "pending" | "downloading" | "completed" | "failed";
    progress: number;
    completedAt?: number;
  };
}

class PrefetchService {
  private isProcessing = false;
  private currentDownload: string | null = null;

  /**
   * Add lesson to prefetch queue
   */
  async addToPrefetchQueue(
    courseId: string,
    activityId: string,
    activityName: string,
    priority: number = 1
  ): Promise<void> {
    try {
      const queue = await this.getPrefetchQueue();
      const key = `${courseId}_${activityId}`;

      // Check if already in queue
      if (queue.some((item) => `${item.courseId}_${item.activityId}` === key)) {
        return;
      }

      // Add to queue
      queue.push({
        courseId,
        activityId,
        activityName,
        priority,
        addedAt: Date.now(),
      });

      // Sort by priority (higher first)
      queue.sort((a, b) => b.priority - a.priority);

      await AsyncStorage.setItem(PREFETCH_QUEUE_KEY, JSON.stringify(queue));

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    } catch (error) {
      console.error("Add to prefetch queue error:", error);
    }
  }

  /**
   * Prefetch next lesson automatically
   */
  async prefetchNextLesson(courseId: string, currentActivityId: string): Promise<void> {
    try {
      // Get course data
      const courseData = await moodleAPI.getCourseFull(parseInt(courseId));
      const activities = courseData.sections.flatMap((section: any) => section.activities || []);
      
      // Find current activity index
      const currentIndex = activities.findIndex((a: any) => a.id === currentActivityId);
      
      if (currentIndex >= 0 && currentIndex < activities.length - 1) {
        // Prefetch next activity
        const nextActivity = activities[currentIndex + 1];
        await this.addToPrefetchQueue(
          courseId,
          nextActivity.id,
          nextActivity.name,
          10 // High priority for next lesson
        );
      }
    } catch (error) {
      console.error("Prefetch next lesson error:", error);
    }
  }

  /**
   * Get prefetch status for a lesson
   */
  async getPrefetchStatus(courseId: string, activityId: string): Promise<PrefetchStatus[string] | null> {
    try {
      const status = await this.getAllPrefetchStatus();
      const key = `${courseId}_${activityId}`;
      return status[key] || null;
    } catch (error) {
      console.error("Get prefetch status error:", error);
      return null;
    }
  }

  /**
   * Check if lesson is prefetched
   */
  async isPrefetched(courseId: string, activityId: string): Promise<boolean> {
    const status = await this.getPrefetchStatus(courseId, activityId);
    return status?.status === "completed";
  }

  /**
   * Clear prefetch queue
   */
  async clearPrefetchQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFETCH_QUEUE_KEY);
      await AsyncStorage.removeItem(PREFETCH_STATUS_KEY);
      this.isProcessing = false;
      this.currentDownload = null;
    } catch (error) {
      console.error("Clear prefetch queue error:", error);
    }
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getPrefetchQueue();
    return queue.length;
  }

  // Private methods

  private async getPrefetchQueue(): Promise<PrefetchItem[]> {
    try {
      const data = await AsyncStorage.getItem(PREFETCH_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  private async getAllPrefetchStatus(): Promise<PrefetchStatus> {
    try {
      const data = await AsyncStorage.getItem(PREFETCH_STATUS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      return {};
    }
  }

  private async updatePrefetchStatus(
    courseId: string,
    activityId: string,
    status: PrefetchStatus[string]
  ): Promise<void> {
    try {
      const allStatus = await this.getAllPrefetchStatus();
      const key = `${courseId}_${activityId}`;
      allStatus[key] = status;
      await AsyncStorage.setItem(PREFETCH_STATUS_KEY, JSON.stringify(allStatus));
    } catch (error) {
      console.error("Update prefetch status error:", error);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const queue = await this.getPrefetchQueue();
        if (queue.length === 0) break;

        const item = queue[0];
        const key = `${item.courseId}_${item.activityId}`;

        // Update status to downloading
        await this.updatePrefetchStatus(item.courseId, item.activityId, {
          status: "downloading",
          progress: 0,
        });

        this.currentDownload = key;

        try {
          // Fetch lesson content
          const content = await moodleAPI.getActivityContent(item.courseId, item.activityId);

          // Cache videos and media
          if (content.videoUrl) {
            await webViewCacheService.cacheContent(content.videoUrl, "video");
          }

          if (content.images && content.images.length > 0) {
            for (const imageUrl of content.images) {
              await webViewCacheService.cacheContent(imageUrl, "other");
            }
          }

          // Mark as completed
          await this.updatePrefetchStatus(item.courseId, item.activityId, {
            status: "completed",
            progress: 1,
            completedAt: Date.now(),
          });
        } catch (error) {
          console.error(`Prefetch failed for ${key}:`, error);
          await this.updatePrefetchStatus(item.courseId, item.activityId, {
            status: "failed",
            progress: 0,
          });
        }

        // Remove from queue
        queue.shift();
        await AsyncStorage.setItem(PREFETCH_QUEUE_KEY, JSON.stringify(queue));
        this.currentDownload = null;
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const prefetchService = new PrefetchService();
