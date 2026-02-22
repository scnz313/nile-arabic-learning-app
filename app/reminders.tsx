import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Switch, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { reminderService, type ReminderSettings, type StudyStreak } from "@/lib/reminder-service";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMES = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

export default function RemindersScreen() {
  const router = useRouter();
  const colors = useColors();
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    time: "09:00",
    days: [1, 2, 3, 4, 5],
  });
  const [streak, setStreak] = useState<StudyStreak>({
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: "",
    totalDays: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadStreak();
  }, []);

  const loadSettings = async () => {
    const current = await reminderService.getSettings();
    setSettings(current);
    setLoading(false);
  };

  const loadStreak = async () => {
    const currentStreak = await reminderService.getStreak();
    setStreak(currentStreak);
  };

  const handleToggleEnabled = async (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (value) {
      // Request permissions
      const granted = await reminderService.requestPermissions();
      if (!granted) {
        alert("Please enable notifications in your device settings to use reminders.");
        return;
      }
    }

    const updated = { ...settings, enabled: value };
    setSettings(updated);
    await reminderService.updateSettings(updated);
  };

  const handleToggleDay = async (day: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const days = settings.days.includes(day)
      ? settings.days.filter((d) => d !== day)
      : [...settings.days, day].sort((a, b) => a - b);

    if (days.length === 0) {
      alert("Please select at least one day.");
      return;
    }

    const updated = { ...settings, days };
    setSettings(updated);
    await reminderService.updateSettings(updated);
  };

  const handleChangeTime = async (time: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const updated = { ...settings, time };
    setSettings(updated);
    await reminderService.updateSettings(updated);
  };

  const handleTestNotification = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    await reminderService.sendTestNotification();
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="p-6">
          {/* Header */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-11 h-11 rounded-full bg-surface items-center justify-center mb-4"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-foreground mb-2">Study Reminders</Text>
          <Text className="text-base text-muted mb-6">
            Stay consistent with daily notifications
          </Text>

          {/* Study Streak Card */}
          <View className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 mb-6 shadow-lg">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-white/80 text-sm font-medium mb-1">Current Streak</Text>
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-white text-5xl font-bold">{streak.currentStreak}</Text>
                  <Text className="text-white/90 text-xl font-semibold">days</Text>
                </View>
              </View>
              <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center">
                <Text className="text-4xl">🔥</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4 pt-4 border-t border-white/20">
              <View className="flex-1">
                <Text className="text-white/70 text-xs font-medium mb-1">Longest</Text>
                <Text className="text-white text-lg font-bold">{streak.longestStreak} days</Text>
              </View>
              <View className="w-px h-8 bg-white/20" />
              <View className="flex-1">
                <Text className="text-white/70 text-xs font-medium mb-1">Total</Text>
                <Text className="text-white text-lg font-bold">{streak.totalDays} days</Text>
              </View>
            </View>

            <Text className="text-white/90 text-sm mt-4 text-center italic">
              {reminderService.getMotivationalMessage(streak.currentStreak)}
            </Text>
          </View>

          {/* Enable Reminders */}
          <View className="bg-surface rounded-2xl p-5 mb-4 shadow-sm border border-border">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-lg font-semibold text-foreground mb-1">Daily Reminders</Text>
                <Text className="text-sm text-muted">Get notified to study every day</Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={handleToggleEnabled}
                trackColor={{ false: colors.border, true: colors.primary + "80" }}
                thumbColor={settings.enabled ? colors.primary : colors.muted}
              />
            </View>
          </View>

          {settings.enabled && (
            <>
              {/* Time Selection */}
              <View className="bg-surface rounded-2xl p-5 mb-4 shadow-sm border border-border">
                <Text className="text-lg font-semibold text-foreground mb-3">Reminder Time</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {TIMES.map((time) => (
                      <TouchableOpacity
                        key={time}
                        onPress={() => handleChangeTime(time)}
                        activeOpacity={0.7}
                        className={`px-4 py-3 rounded-xl border ${
                          settings.time === time
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            settings.time === time ? "text-white" : "text-foreground"
                          }`}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Days Selection */}
              <View className="bg-surface rounded-2xl p-5 mb-4 shadow-sm border border-border">
                <Text className="text-lg font-semibold text-foreground mb-3">Reminder Days</Text>
                <View className="flex-row justify-between gap-2">
                  {DAYS.map((day, index) => {
                    const isSelected = settings.days.includes(index);
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleToggleDay(index)}
                        activeOpacity={0.7}
                        className={`flex-1 aspect-square rounded-xl items-center justify-center border ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        }`}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            isSelected ? "text-white" : "text-muted"
                          }`}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Test Notification */}
              {Platform.OS !== "web" && (
                <TouchableOpacity
                  onPress={handleTestNotification}
                  activeOpacity={0.7}
                  className="bg-primary/10 border border-primary rounded-2xl p-4 mb-4 flex-row items-center justify-center gap-2"
                >
                  <MaterialIcons name="notifications-active" size={20} color={colors.primary} />
                  <Text className="text-primary text-base font-semibold">Send Test Notification</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
