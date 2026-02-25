import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { Platform } from "react-native";
import { webViewCacheService } from "./webview-cache-service";
import { moodleAPI } from "./moodle-api";
import { storageService } from "./storage";

const SYNC_STATUS_KEY = "background_sync_status";
const LAST_SYNC_KEY = "last_background_sync";
const SYNC_SETTINGS_KEY = "background_sync_settings";

export interface SyncSettings {
  enabled: boolean;
  wifiOnly: boolean;
  autoRefreshInterval: number; // in hours
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number;
  itemsSynced: number;
  errors: string[];
}

class BackgroundSyncService {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  /**
   * Initialize background sync service
   */
  async init() {
    const settings = await this.getSyncSettings();
    if (settings.enabled) {
      await this.startAutoSync();
    }
  }

  /**
   * Get sync settings
   */
  async getSyncSettings(): Promise<SyncSettings> {
    try {
      const data = await AsyncStorage.getItem(SYNC_SETTINGS_KEY);
      return data
        ? JSON.parse(data)
        : {
            enabled: true,
            wifiOnly: true,
            autoRefreshInterval: 24, // Default: sync every 24 hours
          };
    } catch (error) {
      return {
        enabled: true,
        wifiOnly: true,
        autoRefreshInterval: 24,
      };
    }
  }

  /**
   * Update sync settings
   */
  async updateSyncSettings(settings: Partial<SyncSettings>): Promise<void> {
    try {
      const current = await this.getSyncSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(updated));

      // Restart auto sync if enabled changed
      if (settings.enabled !== undefined) {
        if (settings.enabled) {
          await this.startAutoSync();
        } else {
          this.stopAutoSync();
        }
      }
    } catch (error) {
      console.error("Update sync settings error:", error);
    }
  }

  /**
   * Check if device is on WiFi
   */
  async isOnWiFi(): Promise<boolean> {
    if (Platform.OS === "web") return true;

    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.type === Network.NetworkStateType.WIFI;
    } catch (error) {
      console.error("Check WiFi error:", error);
      return false;
    }
  }

  /**
   * Perform background sync
   */
  async performSync(): Promise<SyncStatus> {
    if (this.isSyncing) {
      return {
        isSyncing: true,
        lastSyncTime: Date.now(),
        itemsSynced: 0,
        errors: ["Sync already in progress"],
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let itemsSynced = 0;

    try {
      const settings = await this.getSyncSettings();

      // Check WiFi requirement
      if (settings.wifiOnly) {
        const onWiFi = await this.isOnWiFi();
        if (!onWiFi) {
          errors.push("WiFi required for sync");
          return {
            isSyncing: false,
            lastSyncTime: Date.now(),
            itemsSynced: 0,
            errors,
          };
        }
      }

      // Get all cached items
      const cachedItems = await webViewCacheService.getAllCached();

      // Refresh each cached item
      for (const item of cachedItems) {
        try {
          // Re-download and cache the content
          await webViewCacheService.cacheContent(item.url, item.type);
          itemsSynced++;
        } catch (error: any) {
          errors.push(`Failed to sync ${item.url}: ${error.message}`);
        }
      }

      // Update last sync time
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

      const status: SyncStatus = {
        isSyncing: false,
        lastSyncTime: Date.now(),
        itemsSynced,
        errors,
      };

      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
      return status;
    } catch (error: any) {
      errors.push(`Sync error: ${error.message}`);
      return {
        isSyncing: false,
        lastSyncTime: Date.now(),
        itemsSynced,
        errors,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get last sync status
   */
  async getLastSyncStatus(): Promise<SyncStatus | null> {
    try {
      const data = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return data ? parseInt(data, 10) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Start automatic sync
   */
  async startAutoSync(): Promise<void> {
    this.stopAutoSync(); // Clear any existing interval

    const settings = await this.getSyncSettings();
    if (!settings.enabled) return;

    // Convert hours to milliseconds
    const intervalMs = settings.autoRefreshInterval * 60 * 60 * 1000;

    // Perform initial sync
    this.performSync().catch(console.error);

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.performSync().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Check if sync is needed
   */
  async isSyncNeeded(): Promise<boolean> {
    const settings = await this.getSyncSettings();
    if (!settings.enabled) return false;

    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const hoursSinceLastSync = (Date.now() - lastSync) / (1000 * 60 * 60);
    return hoursSinceLastSync >= settings.autoRefreshInterval;
  }

  /**
   * Format last sync time for display
   */
  async getLastSyncTimeFormatted(): Promise<string> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return "Never";

    const now = Date.now();
    const diffMs = now - lastSync;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return new Date(lastSync).toLocaleDateString();
  }
}

export const backgroundSyncService = new BackgroundSyncService();
