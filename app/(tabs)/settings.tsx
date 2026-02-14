import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuthContext } from "@/lib/auth-context";
import { storage, type UserSettings } from "@/lib/storage";
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout } = useAuthContext();

  const [settings, setSettings] = useState<UserSettings>({
    autoDownloadNewContent: false,
    wifiOnlyDownload: true,
    videoQuality: "auto",
    notificationsEnabled: true,
    theme: "auto",
    language: "en",
  });
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const userSettings = await storage.getUserSettings();
    setSettings(userSettings);
    const syncTime = await storage.getLastSyncTime();
    if (syncTime) setLastSync(new Date(syncTime).toLocaleString());
  };

  const updateSetting = async (key: keyof UserSettings, value: boolean | string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await storage.setUserSettings({ [key]: value });
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your cached data will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will remove all cached course data. You will need to sync again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await storage.clearAll();
            Alert.alert("Done", "Cache cleared successfully.");
          },
        },
      ]
    );
  };

  const renderSettingRow = (
    label: string,
    subtitle: string | undefined,
    right: React.ReactNode
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={styles.settingInfo}>
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
        {subtitle ? <Text className="text-xs text-muted mt-1">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );

  return (
    <ScreenContainer>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-foreground">Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.sectionContainer}>
          <Text className="text-xs font-bold text-muted uppercase mb-2 px-4">Profile</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text className="text-base font-bold text-foreground">
                  {user?.fullName || "Student"}
                </Text>
                <Text className="text-sm text-muted">{user?.email || ""}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sync Section */}
        <View style={styles.sectionContainer}>
          <Text className="text-xs font-bold text-muted uppercase mb-2 px-4">Sync</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {renderSettingRow(
              "Auto-download new content",
              "Download new lessons automatically",
              <Switch
                value={settings.autoDownloadNewContent}
                onValueChange={(v) => updateSetting("autoDownloadNewContent", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            )}
            {renderSettingRow(
              "Wi-Fi only downloads",
              "Only download content on Wi-Fi",
              <Switch
                value={settings.wifiOnlyDownload}
                onValueChange={(v) => updateSetting("wifiOnlyDownload", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            )}
            {renderSettingRow(
              "Last synced",
              lastSync || "Never",
              null
            )}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.sectionContainer}>
          <Text className="text-xs font-bold text-muted uppercase mb-2 px-4">Notifications</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {renderSettingRow(
              "Push notifications",
              "Get notified about new content",
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(v) => updateSetting("notificationsEnabled", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            )}
          </View>
        </View>

        {/* Data */}
        <View style={styles.sectionContainer}>
          <Text className="text-xs font-bold text-muted uppercase mb-2 px-4">Data</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={handleClearCache}
              activeOpacity={0.7}
              style={[styles.settingRow, { borderBottomColor: colors.border }]}
            >
              <Text className="text-sm font-semibold text-error">Clear Cache</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            style={[styles.logoutButton, { backgroundColor: colors.error + "12", borderColor: colors.error }]}
          >
            <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text className="text-xs text-muted text-center">Nile Arabic Learning v1.0.0</Text>
          <Text className="text-xs text-muted text-center mt-1">nilecenter.online</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  sectionContainer: { paddingHorizontal: 16, marginBottom: 20 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  profileRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  profileInfo: { flex: 1 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  settingInfo: { flex: 1, marginRight: 12 },
  logoutButton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1 },
  logoutText: { fontSize: 16, fontWeight: "700" },
  footer: { paddingVertical: 24, alignItems: "center" },
});
