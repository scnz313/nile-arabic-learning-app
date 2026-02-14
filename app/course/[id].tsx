import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { storageService } from "@/lib/storage";
import { syncService } from "@/lib/sync-service";
import { type MoodleActivity } from "@/lib/moodle-api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const MOD_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  page: { icon: "description", color: "#0C6478", label: "Page" },
  book: { icon: "menu-book", color: "#7C3AED", label: "Book" },
  videotime: { icon: "play-circle-filled", color: "#DC2626", label: "Video" },
  hvp: { icon: "extension", color: "#EA580C", label: "Interactive" },
  h5pactivity: { icon: "extension", color: "#EA580C", label: "Interactive" },
  quiz: { icon: "quiz", color: "#059669", label: "Quiz" },
  assign: { icon: "assignment", color: "#2563EB", label: "Assignment" },
  url: { icon: "link", color: "#6366F1", label: "Link" },
  forum: { icon: "forum", color: "#0891B2", label: "Forum" },
  attendance: { icon: "event-available", color: "#65A30D", label: "Attendance" },
  resource: { icon: "attach-file", color: "#9333EA", label: "Resource" },
  feedback: { icon: "rate-review", color: "#D97706", label: "Feedback" },
};

type ListItem =
  | { type: "header"; name: string; activityCount: number; key: string }
  | { type: "activity"; activity: MoodleActivity; isCompleted: boolean; key: string };

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = parseInt(id || "0", 10);
  const router = useRouter();
  const colors = useColors();

  const [courseName, setCourseName] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [totalActivities, setTotalActivities] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadCourseData();
    }, [courseId])
  );

  const loadCourseData = async () => {
    try {
      setIsLoading(true);
      const courses = await storageService.getCourses();
      const course = courses.find((c) => c.id === courseId);
      if (course) {
        // Clean up course name for display
        const match = (course.fullname || "").match(/Arabic Language.*?Level\s*\d+/i);
        setCourseName(match ? match[0] : course.fullname.replace(/^[A-Za-z]+-[A-Za-z0-9]+-\d+\s*-\s*/, "").replace(/\s*Onsite.*$/, "").trim() || course.fullname);
      }

      const data = await storageService.getCourseData(courseId);
      const completed = await storageService.getCompletedActivities(courseId);
      const completedSet = new Set(completed);

      if (data) {
        setTotalActivities(data.totalActivities);
        setCompletedCount(completed.length);

        const allItems: ListItem[] = [];

        if (data.intro && data.intro.activities.length > 0) {
          allItems.push({ type: "header", name: "Introduction", activityCount: data.intro.activities.length, key: "h-intro" });
          for (const act of data.intro.activities) {
            allItems.push({ type: "activity", activity: act, isCompleted: completedSet.has(act.id), key: `a-${act.id}` });
          }
        }

        for (let i = 0; i < data.sections.length; i++) {
          const section = data.sections[i];
          allItems.push({ type: "header", name: section.name, activityCount: section.activities.length, key: `h-${i}` });
          for (const act of section.activities) {
            allItems.push({ type: "activity", activity: act, isCompleted: completedSet.has(act.id), key: `a-${act.id}` });
          }
        }

        setItems(allItems);
      }
    } catch (err) {
      console.error("Load course data error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsSyncing(true);
      await syncService.syncSingleCourse(courseId);
      await loadCourseData();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleActivityPress = (activity: MoodleActivity) => {
    router.push(
      `/lesson/${activity.id}?courseId=${courseId}&modType=${activity.modType}&url=${encodeURIComponent(activity.url)}&name=${encodeURIComponent(activity.name)}` as any
    );
  };

  const progress = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <View style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sectionName, { color: colors.foreground }]} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{item.activityCount}</Text>
          </View>
        </View>
      );
    }

    const modInfo = MOD_ICONS[item.activity.modType] || { icon: "insert-drive-file", color: "#6B7280", label: item.activity.modType };

    return (
      <TouchableOpacity
        onPress={() => handleActivityPress(item.activity)}
        activeOpacity={0.6}
        style={[styles.activityRow, { borderColor: colors.border }]}
      >
        <View style={[styles.activityIcon, { backgroundColor: modInfo.color + "12" }]}>
          <MaterialIcons name={modInfo.icon as any} size={20} color={modInfo.color} />
        </View>
        <View style={styles.activityInfo}>
          <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={2}>
            {item.activity.name}
          </Text>
          <Text style={[styles.activityType, { color: modInfo.color }]}>{modInfo.label}</Text>
        </View>
        {item.isCompleted ? (
          <MaterialIcons name="check-circle" size={20} color={colors.success} />
        ) : (
          <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.topBarTitle}>
            <Text style={[styles.topBarText, { color: colors.foreground }]} numberOfLines={1}>{courseName || "Course"}</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} disabled={isSyncing} activeOpacity={0.6} style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
            {isSyncing ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="sync" size={22} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View style={[styles.progressSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.muted }]}>Progress</Text>
            <Text style={[styles.progressValue, { color: colors.foreground }]}>{completedCount}/{totalActivities} ({progress}%)</Text>
          </View>
          <View style={[styles.progressBarOuter, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarInner, { width: `${progress}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading course content...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  topBarTitle: { flex: 1 },
  topBarText: { fontSize: 17, fontWeight: "600" },
  progressSummary: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 0.5 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 13 },
  progressValue: { fontSize: 13, fontWeight: "600" },
  progressBarOuter: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressBarInner: { height: "100%", borderRadius: 3 },
  list: { paddingBottom: 32 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, marginTop: 8, borderBottomWidth: 0.5 },
  sectionHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionName: { fontSize: 14, fontWeight: "700", flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: "600" },
  activityRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  activityIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, fontWeight: "500", lineHeight: 19, marginBottom: 2 },
  activityType: { fontSize: 11, fontWeight: "500" },
  loadingText: { marginTop: 12, fontSize: 14 },
});
