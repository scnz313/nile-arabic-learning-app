import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDERS_KEY = "nile_reminders";
const STREAK_KEY = "nile_study_streak";

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format (24-hour)
  days: number[]; // 0-6 (Sunday-Saturday)
  lastScheduled?: number;
}

export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
  totalDays: number;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class ReminderService {
  private defaultSettings: ReminderSettings = {
    enabled: false,
    time: "09:00",
    days: [1, 2, 3, 4, 5], // Monday-Friday
  };

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "web") {
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  }

  /**
   * Get reminder settings
   */
  async getSettings(): Promise<ReminderSettings> {
    try {
      const data = await AsyncStorage.getItem(REMINDERS_KEY);
      return data ? JSON.parse(data) : this.defaultSettings;
    } catch (error) {
      console.error("Error loading reminder settings:", error);
      return this.defaultSettings;
    }
  }

  /**
   * Update reminder settings
   */
  async updateSettings(settings: Partial<ReminderSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings, lastScheduled: Date.now() };
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));

    // Reschedule notifications
    if (updated.enabled) {
      await this.scheduleNotifications(updated);
    } else {
      await this.cancelAllNotifications();
    }
  }

  /**
   * Schedule daily notifications
   */
  private async scheduleNotifications(settings: ReminderSettings): Promise<void> {
    if (Platform.OS === "web") {
      return;
    }

    // Cancel existing notifications
    await this.cancelAllNotifications();

    // Parse time
    const [hours, minutes] = settings.time.split(":").map(Number);

    // Schedule for each selected day
    for (const day of settings.days) {
      const trigger: Notifications.CalendarTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: hours,
        minute: minutes,
        weekday: day + 1, // expo-notifications uses 1-7 (Sunday=1)
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to Study Arabic! 📚",
          body: "Keep your streak going! Practice your lessons today.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === "web") {
      return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get study streak
   */
  async getStreak(): Promise<StudyStreak> {
    try {
      const data = await AsyncStorage.getItem(STREAK_KEY);
      return data
        ? JSON.parse(data)
        : {
            currentStreak: 0,
            longestStreak: 0,
            lastStudyDate: "",
            totalDays: 0,
          };
    } catch (error) {
      console.error("Error loading streak:", error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: "",
        totalDays: 0,
      };
    }
  }

  /**
   * Update study streak (call when user completes a lesson)
   */
  async updateStreak(): Promise<StudyStreak> {
    const streak = await this.getStreak();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // If already studied today, no update needed
    if (streak.lastStudyDate === today) {
      return streak;
    }

    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (streak.lastStudyDate === yesterdayStr) {
      // Continue streak
      streak.currentStreak += 1;
    } else if (streak.lastStudyDate === "") {
      // First day
      streak.currentStreak = 1;
    } else {
      // Streak broken
      streak.currentStreak = 1;
    }

    // Update longest streak
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    // Update total days and last study date
    streak.totalDays += 1;
    streak.lastStudyDate = today;

    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(streak));
    return streak;
  }

  /**
   * Get motivational message based on streak
   */
  getMotivationalMessage(currentStreak: number): string {
    if (currentStreak === 0) {
      return "Start your learning journey today! 🌟";
    } else if (currentStreak === 1) {
      return "Great start! Keep it going! 💪";
    } else if (currentStreak < 7) {
      return `${currentStreak} days strong! You're building a habit! 🔥`;
    } else if (currentStreak < 30) {
      return `Amazing! ${currentStreak} day streak! You're on fire! 🔥🔥`;
    } else if (currentStreak < 100) {
      return `Incredible! ${currentStreak} days! You're a learning machine! 🚀`;
    } else {
      return `Legendary! ${currentStreak} day streak! Unstoppable! 👑`;
    }
  }

  /**
   * Send immediate test notification
   */
  async sendTestNotification(): Promise<void> {
    if (Platform.OS === "web") {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification 📚",
        body: "Your study reminders are working!",
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    });
  }
}

export const reminderService = new ReminderService();
