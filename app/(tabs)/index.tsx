import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthContext } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { moodleAPI, type MoodleCourse } from "@/lib/moodle-api";
import { storageService } from "@/lib/storage";
import { syncService } from "@/lib/sync-service";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  page: { icon: "description", color: "#0C6478" },
  book: { icon: "menu-book", color: "#7C3AED" },
  videotime: { icon: "play-circle-filled", color: "#DC2626" },
  hvp: { icon: "extension", color: "#EA580C" },
  h5pactivity: { icon: "extension", color: "#EA580C" },
  quiz: { icon: "quiz", color: "#059669" },
  assign: { icon: "assignment", color: "#2563EB" },
  url: { icon: "link", color: "#6366F1" },
  forum: { icon: "forum", color: "#0891B2" },
  attendance: { icon: "event-available", color: "#65A30D" },
  resource: { icon: "attach-file", color: "#9333EA" },
  feedback: { icon: "rate-review", color: "#D97706" },
};

interface CourseWithStats extends MoodleCourse {
  totalActivities: number;
  completedActivities: number;
  totalSections: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const colors = useColors();

  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadCourses();
    }, [isAuthenticated])
  );

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const stored = await storageService.getCourses();
      if (stored.length > 0) {
        const withStats = await addStatsToCoursesArray(stored);
        setCourses(withStats);
      }
      const syncTime = await storageService.getLastSyncTime();
      if (syncTime) {
        const d = new Date(syncTime);
        setLastSync(d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      console.error("Load courses error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addStatsToCoursesArray = async (courseList: MoodleCourse[]): Promise<CourseWithStats[]> => {
    const result: CourseWithStats[] = [];
    for (const c of courseList) {
      const data = await storageService.getCourseData(c.id);
      const completion = await storageService.getCompletionCount(c.id);
      result.push({
        ...c,
        totalActivities: data?.totalActivities || 0,
        completedActivities: completion.completed,
        totalSections: data?.totalSections || 0,
      });
    }
    return result;
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const result = await syncService.syncAllCourses();
      const stored = await storageService.getCourses();
      const withStats = await addStatsToCoursesArray(stored);
      setCourses(withStats);
      const syncTime = await storageService.getLastSyncTime();
      if (syncTime) {
        const d = new Date(syncTime);
        setLastSync(d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const getProgressPercent = (c: CourseWithStats) => {
    if (c.totalActivities === 0) return 0;
    return Math.round((c.completedActivities / c.totalActivities) * 100);
  };

  const getCleanCourseName = (fullname: string) => {
    // Extract just "Arabic Language (MSA) Level XX"
    const match = (fullname || "").match(/Arabic Language.*?Level\s*\d+/i);
    if (match) return match[0];
    // Fallback: remove code prefix like "Arb-L04-1416 - "
    return (fullname || "").replace(/^[A-Za-z]+-[A-Za-z0-9]+-\d+\s*-\s*/, "").replace(/\s*Onsite.*$/, "").trim() || fullname || "Course";
  };

  const renderCourseCard = ({ item }: { item: CourseWithStats }) => {
    const progress = getProgressPercent(item);
    const levelMatch = (item.fullname || "").match(/Level\s*(\d+)/i);
    const levelNum = levelMatch ? levelMatch[1] : "";
    const courseColors = [
      { bg: "#0C6478", light: "#E0F2F7" },
      { bg: "#7C3AED", light: "#EDE9FE" },
      { bg: "#DC2626", light: "#FEE2E2" },
      { bg: "#059669", light: "#D1FAE5" },
    ];
    const colorSet = courseColors[(item.id % courseColors.length)];
    const cleanName = getCleanCourseName(item.fullname);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/course/${item.id}`)}
        activeOpacity={0.7}
        style={[styles.courseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.courseCardInner}>
          {/* Level badge */}
          <View style={[styles.levelBadge, { backgroundColor: colorSet.bg }]}>
            <Text style={styles.levelBadgeText}>{levelNum || "📚"}</Text>
            {levelNum ? <Text style={styles.levelBadgeLabel}>Level</Text> : null}
          </View>

          {/* Course info */}
          <View style={styles.courseInfo}>
            <Text style={[styles.courseName, { color: colors.foreground }]} numberOfLines={2}>
              {cleanName}
            </Text>
            <View style={styles.courseStats}>
              <View style={styles.statItem}>
                <MaterialIcons name="folder" size={14} color={colors.muted} />
                <Text style={[styles.statText, { color: colors.muted }]}>
                  {item.totalSections} sections
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="library-books" size={14} color={colors.muted} />
                <Text style={[styles.statText, { color: colors.muted }]}>
                  {item.totalActivities} activities
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%`, backgroundColor: colorSet.bg },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.muted }]}>
                {item.completedActivities}/{item.totalActivities}
              </Text>
            </View>
          </View>

          {/* Arrow */}
          <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  if (authLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>Welcome back</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user?.fullName || "Student"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.6}
            style={[styles.syncButton, { backgroundColor: colors.primary + "12" }]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="sync" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Sync status */}
        {lastSync ? (
          <View style={[styles.syncStatus, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="check-circle" size={14} color={colors.success} />
            <Text style={[styles.syncStatusText, { color: colors.muted }]}>
              Last synced: {lastSync}
            </Text>
          </View>
        ) : null}

        {/* Content */}
        {isLoading && courses.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading courses...</Text>
          </View>
        ) : courses.length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons name="school" size={64} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Courses Yet</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Tap the sync button to fetch your courses from Nile Center Online.
            </Text>
            <TouchableOpacity
              onPress={handleSync}
              activeOpacity={0.7}
              style={[styles.syncNowButton, { backgroundColor: colors.primary }]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.syncNowText}>Sync Now</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCourseCard}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={isSyncing}
                onRefresh={handleSync}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                My Courses
              </Text>
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  userName: { fontSize: 22, fontWeight: "700" },
  syncButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    gap: 6,
  },
  syncStatusText: { fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  list: { padding: 20 },
  courseCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  courseCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: { fontSize: 22, fontWeight: "800", color: "#FFF" },
  levelBadgeLabel: { fontSize: 9, fontWeight: "600", color: "#FFF", opacity: 0.8, marginTop: -2 },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 15, fontWeight: "600", lineHeight: 20, marginBottom: 6 },
  courseStats: { flexDirection: "row", gap: 12, marginBottom: 8 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12 },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 11, fontWeight: "500" },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  syncNowButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  syncNowText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
