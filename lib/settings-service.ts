import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "nile_settings";

export interface AppSettings {
  fontSize: "small" | "medium" | "large";
  showDiacritics: boolean;
  audioPlaybackSpeed: number; // 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
  darkMode: boolean;
  studyReminders: boolean;
  reminderTime?: string; // HH:MM format
}

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: "medium",
  showDiacritics: true,
  audioPlaybackSpeed: 1.0,
  darkMode: false,
  studyReminders: false,
};

function safeParse<T>(data: string | null, fallback: T): T {
  if (!data) return fallback;
  try { return JSON.parse(data); } catch { return fallback; }
}

class SettingsService {
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      return { ...DEFAULT_SETTINGS, ...safeParse(data, {}) };
    } catch (error) {
      console.error("Error loading settings:", error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  }

  async resetSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error("Error resetting settings:", error);
    }
  }
}

export const settingsService = new SettingsService();
