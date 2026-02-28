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
  Linking,
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

type ThemeOption = "auto" | "light" | "dark";
type FontSizeOption = "small" | "medium" | "large";

interface SettingRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  destructive?: boolean;
  colors: ReturnType<typeof useColors>;
}

function SettingRow({
  icon,
  iconColor,
  label,
  subtitle,
  right,
  onPress,
  isLast = false,
  destructive = false,
  colors,
}: SettingRowProps) {
  const content = (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.rowIconContainer, { backgroundColor: (iconColor || colors.muted) + "14" }]}>
        <MaterialIcons
          name={icon as any}
          size={18}
          color={iconColor || colors.muted}
        />
      </View>
      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowLabel,
            { color: destructive ? colors.error : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right || (onPress ? (
        <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
      ) : null)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  colors: ReturnType<typeof useColors>;
}

function SegmentedControl({ options, selected, onSelect, colors }: SegmentedControlProps) {
  return (
    <View style={[styles.segmented, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
            style={[
              styles.segmentedItem,
              isActive && {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
                elevation: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentedText,
                {
                  color: isActive ? colors.foreground : colors.muted,
                  fontWeight: isActive ? "600" : "400",
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface ChipGroupProps {
  options: { label: string; value: number }[];
  selected: number;
  onSelect: (value: number) => void;
  colors: ReturnType<typeof useColors>;
}

function ChipGroup({ options, selected, onSelect, colors }: ChipGroupProps) {
  return (
    <View style={styles.chipGroup}>
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.foreground : "transparent",
                borderColor: isActive ? colors.foreground : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isActive ? colors.background : colors.muted,
                  fontWeight: isActive ? "600" : "400",
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
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

  const handleResetSettings = () => {
    confirmAction(
      "Reset Settings",
      "This will restore all settings to their defaults.",
      async () => {
        await settingsService.resetSettings();
        await loadSettings();
      }
    );
  };

  const themeOptions: { label: string; value: string }[] = [
    { label: "System", value: "auto" },
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
  ];

  const fontSizeOptions: { label: string; value: string }[] = [
    { label: "Small", value: "small" },
    { label: "Medium", value: "medium" },
    { label: "Large", value: "large" },
  ];

  const speedOptions: { label: string; value: number }[] = [
    { label: "0.5x", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1x", value: 1.0 },
    { label: "1.25x", value: 1.25 },
    { label: "1.5x", value: 1.5 },
    { label: "2x", value: 2.0 },
  ];

  const initials = user?.fullName?.charAt(0)?.toUpperCase() || "?";

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        </View>

        {/* Profile */}
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.foreground }]}>
                <Text style={[styles.avatarText, { color: colors.background }]}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>
                  {user?.fullName || "Student"}
                </Text>
                {user?.username ? (
                  <Text style={[styles.profileMeta, { color: colors.muted }]}>{user.username}</Text>
                ) : null}
              </View>
              <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>Learner</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Appearance</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[styles.rowIconContainer, { backgroundColor: colors.muted + "14" }]}>
                <MaterialIcons name="palette" size={18} color={colors.muted} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Theme</Text>
              </View>
            </View>
            <View style={styles.controlRow}>
              <SegmentedControl
                options={themeOptions}
                selected={settings.theme}
                onSelect={(v) => updateSetting("theme", v as ThemeOption)}
                colors={colors}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <View style={[styles.rowIconContainer, { backgroundColor: colors.muted + "14" }]}>
                <MaterialIcons name="format-size" size={18} color={colors.muted} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Font Size</Text>
              </View>
            </View>
            <View style={styles.controlRow}>
              <SegmentedControl
                options={fontSizeOptions}
                selected={appSettings?.fontSize || "medium"}
                onSelect={(v) => updateAppSetting("fontSize", v as FontSizeOption)}
                colors={colors}
              />
            </View>
          </View>
        </View>

        {/* Arabic */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Arabic</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="text-fields"
              iconColor={colors.primary}
              label="Show Diacritics"
              subtitle="Display tashkeel vowel marks on Arabic text"
              colors={colors}
              right={
                <Switch
                  value={appSettings?.showDiacritics ?? true}
                  onValueChange={(v) => updateAppSetting("showDiacritics", v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <View style={styles.row}>
              <View style={[styles.rowIconContainer, { backgroundColor: colors.primary + "14" }]}>
                <MaterialIcons name="speed" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Audio Speed</Text>
                <Text style={[styles.rowSubtitle, { color: colors.muted }]}>Playback speed for lesson audio</Text>
              </View>
            </View>
            <View style={[styles.controlRow, { paddingBottom: 14 }]}>
              <ChipGroup
                options={speedOptions}
                selected={appSettings?.audioPlaybackSpeed ?? 1.0}
                onSelect={(v) => updateAppSetting("audioPlaybackSpeed", v)}
                colors={colors}
              />
            </View>
          </View>
        </View>

        {/* Sync */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Sync</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="sync"
              iconColor={colors.primary}
              label="Auto-sync courses"
              subtitle="Sync when app opens"
              colors={colors}
              right={
                <Switch
                  value={settings.autoSync}
                  onValueChange={(v) => updateSetting("autoSync", v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <SettingRow
              icon="schedule"
              label="Last synced"
              subtitle={lastSync || "Never"}
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Notifications</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="notifications-none"
              iconColor={colors.warning}
              label="Push Notifications"
              subtitle="Get notified about new content"
              colors={colors}
              right={
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(v) => updateSetting("notificationsEnabled", v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <SettingRow
              icon="alarm"
              iconColor={colors.warning}
              label="Study Reminders"
              subtitle="Set daily study notifications"
              onPress={() => router.push("/reminders" as any)}
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Data & Storage</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="folder-open"
              label="Cache Management"
              subtitle="View and manage cached content"
              onPress={() => router.push("/cache-management" as any)}
              colors={colors}
            />
            <SettingRow
              icon="delete-outline"
              label="Clear All Cache"
              subtitle="Remove all cached course data"
              onPress={handleClearCache}
              destructive
              colors={colors}
            />
            <SettingRow
              icon="settings-backup-restore"
              label="Reset Settings"
              subtitle="Restore defaults"
              onPress={handleResetSettings}
              destructive
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="logout"
              label="Sign Out"
              onPress={handleLogout}
              destructive
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>Nile Arabic Learning</Text>
          <Text style={[styles.footerVersion, { color: colors.muted }]}>Version 1.0.0</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://nilecenter.online")}
            activeOpacity={0.6}
          >
            <Text style={[styles.footerLink, { color: colors.primary }]}>nilecenter.online</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 48,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  controlRow: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
    marginVertical: 4,
  },

  segmented: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 0,
    borderColor: "transparent",
  },
  segmentedText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },

  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: -0.1,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  profileMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  footer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
  },
  footerVersion: {
    fontSize: 11,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
});
