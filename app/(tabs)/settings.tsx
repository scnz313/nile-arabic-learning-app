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
import { storageService, type UserSettings } from "@/lib/storage";
import { settingsService, type AppSettings } from "@/lib/settings-service";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm },
    ]);
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout } = useAuthContext();

  const [settings, setSettings] = useState<UserSettings>({
    notificationsEnabled: true,
    autoSync: true,
    theme: "auto",
  });
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const userSettings = await storageService.getUserSettings();
    setSettings(userSettings);
    const appSetts = await settingsService.getSettings();
    setAppSettings(appSetts);
    const syncTime = await storageService.getLastSyncTime();
    if (syncTime) setLastSync(new Date(syncTime).toLocaleString());
  };

  const updateSetting = async (key: keyof UserSettings, value: boolean | string) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await storageService.setUserSettings({ [key]: value });
  };

  const updateAppSetting = async (key: keyof AppSettings, value: any) => {
    await settingsService.updateSettings({ [key]: value });
    setAppSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleLogout = () => {
    confirmAction(
      "Sign Out",
      "Are you sure you want to sign out? Your cached data will be cleared.",
      async () => {
        await logout();
        router.replace("/login");
      }
    );
  };

  const handleClearCache = () => {
    confirmAction(
      "Clear Cache",
      "This will remove all cached course data. You will need to sync again.",
      async () => {
        await storageService.clearAll();
        setLastSync("");
      }
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>PROFILE</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>
                  {user?.fullName || "Student"}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.muted }]}>{user?.username || ""}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sync Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>SYNC</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabelText, { color: colors.foreground }]}>Auto-sync courses</Text>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>Sync courses when app opens</Text>
              </View>
              <Switch
                value={settings.autoSync}
                onValueChange={(v) => updateSetting("autoSync", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabelText, { color: colors.foreground }]}>Last synced</Text>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>{lastSync || "Never"}</Text>
              </View>
              <MaterialIcons name="sync" size={20} color={colors.muted} />
            </View>
          </View>
        </View>

        {/* Display Settings */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>DISPLAY</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabelText, { color: colors.foreground }]}>Font Size</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  {["small", "medium", "large"].map((size) => (
                    <TouchableOpacity
                      key={size}
                      onPress={() => updateAppSetting("fontSize", size)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: appSettings?.fontSize === size ? colors.primary : colors.border,
                        backgroundColor: appSettings?.fontSize === size ? colors.primary : "transparent",
                      }}
                    >
                      <Text style={{ color: appSettings?.fontSize === size ? "#FFFFFF" : colors.foreground, fontWeight: "600", textTransform: "capitalize" }}>{size}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabelText, { color: colors.foreground }]}>Show Diacritics</Text>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>Display Arabic vowel marks</Text>
              </View>
              <Switch
                value={appSettings?.showDiacritics ?? true}
                onValueChange={(v) => updateAppSetting("showDiacritics", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabelText, { color: colors.foreground }]}>Audio Playback Speed</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      onPress={() => updateAppSetting("audioPlaybackSpeed", speed)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: appSettings?.audioPlaybackSpeed === speed ? colors.primary : colors.border,
                        backgroundColor: appSettings?.audioPlaybackSpeed === speed ? colors.primary : "transparent",
                      }}
                    >
                      <Text style={{ color: appSettings?.audioPlaybackSpeed === speed ? "#FFFFFF" : colors.foreground, fontWeight: "600" }}>{speed}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>NOTIFICATIONS</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => router.push("/reminders" as any)}
              style={[styles.settingRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.settingInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="notifications-active" size={20} color={colors.primary} />
                  <Text style={[styles.settingLabelText, { color: colors.foreground }]}>Study Reminders</Text>
                </View>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>Set daily study notifications</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
            </TouchableOpacity>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabelText, { color: colors.foreground }]}>Push notifications</Text>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>Get notified about new content</Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(v) => updateSetting("notificationsEnabled", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>DATA</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={handleClearCache}
              activeOpacity={0.7}
              style={[styles.settingRow, { borderBottomWidth: 0 }]}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabelText, { color: colors.error }]}>Clear Cache</Text>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>Remove all cached course data</Text>
              </View>
              <MaterialIcons name="delete-outline" size={20} color={colors.error} />
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
            <MaterialIcons name="logout" size={18} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>Nile Arabic Learning v1.0.0</Text>
          <Text style={[styles.footerText, { color: colors.muted, marginTop: 4 }]}>nilecenter.online</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: "700" },
  scrollContent: { paddingBottom: 40 },
  sectionContainer: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", marginBottom: 8, paddingHorizontal: 4, letterSpacing: 0.5 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  profileRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700" },
  profileEmail: { fontSize: 14, marginTop: 2 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabelText: { fontSize: 14, fontWeight: "600" },
  settingSubtitle: { fontSize: 12, marginTop: 4 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, borderWidth: 1 },
  logoutText: { fontSize: 16, fontWeight: "700" },
  footer: { paddingVertical: 24, alignItems: "center" },
  footerText: { fontSize: 12, textAlign: "center" },
});
