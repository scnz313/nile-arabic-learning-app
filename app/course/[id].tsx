import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { storageService } from "@/lib/storage";
import { syncService } from "@/lib/sync-service";
import { type MoodleActivity } from "@/lib/moodle-api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { prefetchService } from "@/lib/prefetch-service";

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
  | { type: "activity"; activity: MoodleActivity; isCompleted: boolean; isPrefetched: boolean; key: string };

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

  const loadCourseData = useCallback(async () => {
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
            const isPrefetched = await prefetchService.isPrefetched(courseId.toString(), act.id);
            allItems.push({ type: "activity", activity: act, isCompleted: completedSet.has(act.id), isPrefetched, key: `a-${act.id}` });
          }
        }

        for (let i = 0; i < data.sections.length; i++) {
          const section = data.sections[i];
          allItems.push({ type: "header", name: section.name, activityCount: section.activities.length, key: `h-${i}` });
          for (const act of section.activities) {
            const isPrefetched = await prefetchService.isPrefetched(courseId.toString(), act.id);
            allItems.push({ type: "activity", activity: act, isCompleted: completedSet.has(act.id), isPrefetched, key: `a-${act.id}` });
          }
        }

        setItems(allItems);
      }
    } catch (err) {
      console.error("Load course data error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useFocusEffect(
    useCallback(() => {
      void loadCourseData();
    }, [loadCourseData])
  );

  const handleRefresh = async () => {
    try {
      setIsSyncing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await syncService.syncSingleCourse(courseId);
      await loadCourseData();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleActivityPress = (activity: MoodleActivity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(
      `/lesson/${activity.id}?courseId=${courseId}&modType=${activity.modType}&url=${encodeURIComponent(activity.url)}&name=${encodeURIComponent(activity.name)}` as any
    );
  };

  const progress = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
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
        activeOpacity={0.7}
        style={[styles.activityCard, { backgroundColor: colors.surface }]}
      >
        <View style={[styles.activityIcon, { backgroundColor: modInfo.color + "15" }]}>
          <MaterialIcons name={modInfo.icon as any} size={24} color={modInfo.color} />
        </View>
        <View style={styles.activityInfo}>
          <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={2}>
            {item.activity.name}
          </Text>
          <View style={styles.activityMeta}>
            <Text style={[styles.activityType, { color: modInfo.color }]}>{modInfo.label}</Text>
            {item.isPrefetched && (
              <View style={[styles.prefetchBadge, { backgroundColor: colors.primary + "15" }]}>
                <MaterialIcons name="cloud-done" size={14} color={colors.primary} />
                <Text style={[styles.prefetchText, { color: colors.primary }]}>Ready</Text>
              </View>
            )}
          </View>
        </View>
        {item.isCompleted ? (
          <View style={[styles.completedBadge, { backgroundColor: colors.success + "15" }]}>
            <MaterialIcons name="check-circle" size={22} color={colors.success} />
          </View>
        ) : (
          <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <View style={styles.container}>
        {/* Top bar */}
        <View style={[styles.topBar, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }} 
            activeOpacity={0.7} 
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.topBarTitle}>
            <Text style={[styles.topBarEyebrow, { color: colors.muted }]}>Course overview</Text>
            <Text style={[styles.topBarText, { color: colors.foreground }]} numberOfLines={1}>{courseName || "Course"}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleRefresh} 
            disabled={isSyncing} 
            activeOpacity={0.7} 
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          >
            {isSyncing ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="sync" size={24} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        {/* Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.progressHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>Your Progress</Text>
              <Text style={[styles.progressSubheading, { color: colors.muted }]}>
                Stay on top of lessons, quizzes, and downloadable activities.
              </Text>
            </View>
            <View style={[styles.progressPercentageBadge, { backgroundColor: colors.primary + "14" }]}>
              <Text style={[styles.progressPercentage, { color: colors.primary }]}>{progress}%</Text>
            </View>
          </View>
          <View style={[styles.progressBarOuter, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarInner, { width: `${progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.progressFooter}>
            <Text style={[styles.progressSubtext, { color: colors.muted }]}>
              {completedCount} of {totalActivities} activities completed
            </Text>
            <View style={[styles.progressStatPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="fact-check" size={14} color={colors.success} />
              <Text style={[styles.progressStatText, { color: colors.foreground }]}>
                {totalActivities - completedCount} left
              </Text>
            </View>
          </View>
        </View>

        {/* Quiz Button */}
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push(`/quiz/${courseId}` as any);
          }}
          activeOpacity={0.7}
          style={[styles.quizButton, { backgroundColor: colors.success + "10", borderColor: colors.success + "60" }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                backgroundColor: colors.success + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="quiz" size={24} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quizButtonTitle, { color: colors.success }]}>Take a Quiz</Text>
              <Text style={[styles.quizButtonSubtext, { color: colors.muted }]}>Practice, revise, and track your understanding</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.success} />
          </View>
        </TouchableOpacity>

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
  topBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    gap: 12,
  },
  iconBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: "center", 
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topBarTitle: { flex: 1 },
  topBarEyebrow: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.5 },
  topBarText: { fontSize: 18, fontWeight: "700" },
  progressCard: { 
    marginHorizontal: 20, 
    marginTop: 8,
    marginBottom: 16,
    padding: 20, 
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: { fontSize: 16, fontWeight: "700" },
  progressSubheading: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  progressPercentageBadge: {
    minWidth: 74,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 12,
  },
  progressPercentage: { fontSize: 24, fontWeight: "800" },
  progressBarOuter: { 
    height: 8, 
    borderRadius: 4, 
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarInner: { height: "100%", borderRadius: 4 },
  progressSubtext: { fontSize: 13, fontWeight: "500" },
  progressFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 10 },
  progressStatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressStatText: { fontSize: 12, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  sectionHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionName: { fontSize: 15, fontWeight: "700", flex: 1 },
  countBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 13, fontWeight: "700" },
  activityCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 16, 
    marginBottom: 12,
    borderRadius: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    alignItems: "center", 
    justifyContent: "center",
  },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 15, fontWeight: "600", lineHeight: 20, marginBottom: 4 },
  activityMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  activityType: { fontSize: 12, fontWeight: "600" },
  prefetchBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 4 },
  prefetchText: { fontSize: 11, fontWeight: "600" },
  completedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  quizButton: { marginHorizontal: 20, marginBottom: 16, padding: 18, borderRadius: 20, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 5 },
  quizButtonTitle: { fontSize: 17, fontWeight: "700" },
  quizButtonSubtext: { fontSize: 13, marginTop: 2 },
});
