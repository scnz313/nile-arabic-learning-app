import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const CACHE_KEY_PREFIX = "webview_cache_";
const CACHE_METADATA_KEY = "webview_cache_metadata";
const MAX_CACHE_SIZE_MB = 100; // Maximum cache size in MB
const CACHE_EXPIRY_DAYS = 7; // Cache expiry in days

export interface CachedContent {
  url: string;
  localPath?: string;
  cachedAt: number;
  size: number;
  type: "html" | "video" | "pdf" | "other";
}

export interface CacheMetadata {
  [url: string]: CachedContent;
}

class WebViewCacheService {
  private getCacheDir() {
    return `${FileSystem.documentDirectory}webview_cache/`;
  }

  async init() {
    if (Platform.OS === "web") return;
    
    // Create cache directory if it doesn't exist
    const cacheDir = this.getCacheDir();
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }
  }

  /**
   * Cache content from a URL
   */
  async cacheContent(url: string, type: CachedContent["type"] = "other"): Promise<string | null> {
    if (Platform.OS === "web") return url;

    try {
      await this.init();
      
      // Generate filename from URL
      const filename = this.urlToFilename(url);
      const cacheDir = this.getCacheDir();
      const localPath = `${cacheDir}${filename}`;

      // Check if already cached
      const cached = await this.getCachedContent(url);
      if (cached?.localPath) {
        const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
        if (fileInfo.exists) {
          return cached.localPath;
        }
      }

      // Download and cache
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const size = (fileInfo.exists && !fileInfo.isDirectory) ? (fileInfo as any).size || 0 : 0;

        // Save metadata
        await this.saveCacheMetadata(url, {
          url,
          localPath,
          cachedAt: Date.now(),
          size,
          type,
        });

        // Clean up old cache if needed
        await this.cleanupCache();

        return localPath;
      }

      return null;
    } catch (error) {
      console.error("Cache content error:", error);
      return null;
    }
  }

  /**
   * Get cached content for a URL
   */
  async getCachedContent(url: string): Promise<CachedContent | null> {
    try {
      const metadata = await this.getCacheMetadata();
      const cached = metadata[url];

      if (!cached) return null;

      // Check if cache is expired
      const ageInDays = (Date.now() - cached.cachedAt) / (1000 * 60 * 60 * 24);
      if (ageInDays > CACHE_EXPIRY_DAYS) {
        await this.removeCachedContent(url);
        return null;
      }

      return cached;
    } catch (error) {
      console.error("Get cached content error:", error);
      return null;
    }
  }

  /**
   * Check if content is cached
   */
  async isCached(url: string): Promise<boolean> {
    const cached = await this.getCachedContent(url);
    return cached !== null;
  }

  /**
   * Remove cached content
   */
  async removeCachedContent(url: string): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      const metadata = await this.getCacheMetadata();
      const cached = metadata[url];

      if (cached?.localPath) {
        await FileSystem.deleteAsync(cached.localPath, { idempotent: true });
      }

      delete metadata[url];
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error("Remove cached content error:", error);
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      const cacheDir = this.getCacheDir();
      await FileSystem.deleteAsync(cacheDir, { idempotent: true });
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
      await this.init();
    } catch (error) {
      console.error("Clear cache error:", error);
    }
  }

  /**
   * Get total cache size in MB
   */
  async getCacheSize(): Promise<number> {
    if (Platform.OS === "web") return 0;

    try {
      const metadata = await this.getCacheMetadata();
      const totalBytes = Object.values(metadata).reduce((sum, item) => sum + item.size, 0);
      return totalBytes / (1024 * 1024); // Convert to MB
    } catch (error) {
      console.error("Get cache size error:", error);
      return 0;
    }
  }

  /**
   * Get all cached items
   */
  async getAllCached(): Promise<CachedContent[]> {
    try {
      const metadata = await this.getCacheMetadata();
      return Object.values(metadata);
    } catch (error) {
      console.error("Get all cached error:", error);
      return [];
    }
  }

  // Private helper methods

  private async getCacheMetadata(): Promise<CacheMetadata> {
    try {
      const data = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      return {};
    }
  }

  private async saveCacheMetadata(url: string, content: CachedContent): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();
      metadata[url] = content;
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error("Save cache metadata error:", error);
    }
  }

  private async cleanupCache(): Promise<void> {
    try {
      const cacheSize = await this.getCacheSize();
      
      if (cacheSize > MAX_CACHE_SIZE_MB) {
        // Remove oldest items until under limit
        const metadata = await this.getCacheMetadata();
        const items = Object.values(metadata).sort((a, b) => a.cachedAt - b.cachedAt);

        for (const item of items) {
          await this.removeCachedContent(item.url);
          const newSize = await this.getCacheSize();
          if (newSize < MAX_CACHE_SIZE_MB * 0.8) break; // Keep 80% of max
        }
      }
    } catch (error) {
      console.error("Cleanup cache error:", error);
    }
  }

  private urlToFilename(url: string): string {
    // Create a safe filename from URL
    const hash = url.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const extension = url.split(".").pop()?.split("?")[0] || "html";
    return `${Math.abs(hash)}.${extension}`;
  }
}

export const webViewCacheService = new WebViewCacheService();
