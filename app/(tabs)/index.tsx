import {
  ScrollView,
  Text,
  View,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useAuthContext } from "@/lib/auth-context";
import { storageService } from "@/lib/storage";
import { syncService } from "@/lib/sync-service";
import type { MoodleCourse } from "@/lib/moodle-api";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function HomeScreen() {
  const { user } = useAuthContext();
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<MoodleCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const colors = useColors();

  const loadCourses = async () => {
    try {
      const cached = await storageService.getCourses();
      setCourses(cached);
      setFilteredCourses(cached);
      const lastSync = await storageService.getLastSyncTime();
      if (lastSync) {
        setLastSynced(new Date(lastSync).toLocaleString());
      }
    } catch (error) {
      console.error("Load courses error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredCourses(courses);
      return;
    }
    const lowercaseQuery = query.toLowerCase();
    const filtered = courses.filter(
      (course) =>
        course.fullname.toLowerCase().includes(lowercaseQuery) ||
        course.shortname?.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredCourses(filtered);
  };

  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setRefreshing(true);
    setSyncError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await syncService.syncAllCourses();
      if (result.errors.length > 0) {
        setSyncError(result.errors[0]);
      }
      await loadCourses();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      setSyncError(msg);
      console.error("Sync error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useFocusEffect(() => {
    loadCourses();
  });

  const handleCoursePress = (course: MoodleCourse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/course/${course.id}`);
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={s.centered}>
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleSync}
            tintColor={colors.muted}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.greeting, { color: colors.muted }]}>Welcome back</Text>
          <Text style={[s.name, { color: colors.foreground }]}>
            {user?.fullName || "Student"}
          </Text>
          {lastSynced && (
            <View style={s.syncRow}>
              <View style={[s.syncDot, { backgroundColor: colors.success }]} />
              <Text style={[s.syncText, { color: colors.muted }]}>
                Synced {lastSynced}
              </Text>
            </View>
          )}
          {syncError && (
            <TouchableOpacity
              onPress={() => setSyncError(null)}
              style={[s.errorBanner, { backgroundColor: colors.error + "10", borderColor: colors.error + "30" }]}
            >
              <Text style={[s.errorText, { color: colors.error }]} numberOfLines={2}>{syncError}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={s.searchContainer}>
          <View
            style={[
              s.searchBar,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons name="search" size={18} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search courses..."
              placeholderTextColor={colors.muted}
              style={[s.searchInput, { color: colors.foreground }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")} activeOpacity={0.6}>
                <MaterialIcons name="close" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={s.actionsContainer}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/flashcards");
            }}
            activeOpacity={0.7}
            style={[s.actionCard, { backgroundColor: colors.foreground }]}
          >
            <View style={s.actionLeft}>
              <View style={s.actionIcon}>
                <MaterialIcons name="style" size={18} color={colors.foreground} />
              </View>
              <View>
                <Text style={[s.actionTitle, { color: colors.background }]}>
                  Practice Flashcards
                </Text>
                <Text style={[s.actionSub, { color: colors.background + "80" }]}>
                  Review vocabulary
                </Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward" size={18} color={colors.background + "60"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/vocabulary");
            }}
            activeOpacity={0.7}
            style={[
              s.actionCardOutline,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <View style={s.actionLeft}>
              <View style={[s.actionIconMuted, { backgroundColor: colors.accent + "14" }]}>
                <MaterialIcons name="translate" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={[s.actionTitle, { color: colors.foreground }]}>
                  Vocabulary
                </Text>
                <Text style={[s.actionSub, { color: colors.muted }]}>
                  Browse word lists
                </Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Courses */}
        <View style={s.coursesContainer}>
          <View style={s.coursesHeader}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Courses</Text>
            <Pressable
              onPress={handleSync}
              style={({ pressed }) => [
                s.refreshBtn,
                { backgroundColor: pressed ? colors.border : "transparent" },
              ]}
            >
              <MaterialIcons name="refresh" size={18} color={colors.muted} />
            </Pressable>
          </View>

          {filteredCourses.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.emptyIcon, { backgroundColor: colors.accent + "10" }]}>
                <MaterialIcons name="school" size={28} color={colors.accent} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No courses yet</Text>
              <Text style={[s.emptySub, { color: colors.muted }]}>
                Pull down to sync your courses from Nile Center
              </Text>
              <TouchableOpacity
                onPress={handleSync}
                style={[s.emptyBtn, { backgroundColor: colors.foreground }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="sync" size={16} color={colors.background} />
                <Text style={[s.emptyBtnText, { color: colors.background }]}>Sync Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.coursesList}>
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onPress={() => handleCoursePress(course)}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

interface CourseCardProps {
  course: MoodleCourse;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function CourseCard({ course, onPress, colors }: CourseCardProps) {
  const levelMatch = course.fullname?.match(/Level\s+(\d+)/i);
  const levelNumber = levelMatch ? levelMatch[1] : null;
  const cleanName =
    course.fullname?.replace(/^.*?Level\s+\d+\s*[-–—]?\s*/i, "") ||
    course.fullname ||
    "Course";

  const totalActivities = course.totalActivities || 0;
  const completedCount = course.completedActivities || 0;
  const progressPercent =
    totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.courseCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={s.courseTop}>
        {levelNumber && (
          <View style={[s.levelBadge, { backgroundColor: colors.accent + "14" }]}>
            <Text style={[s.levelText, { color: colors.accent }]}>L{levelNumber}</Text>
          </View>
        )}
        <View style={s.courseInfo}>
          <Text style={[s.courseName, { color: colors.foreground }]} numberOfLines={2}>
            {cleanName}
          </Text>
          <Text style={[s.courseMeta, { color: colors.muted }]}>
            {course.totalSections || 0} sections · {totalActivities} activities
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={18} color={colors.muted + "80"} />
      </View>

      {totalActivities > 0 && (
        <View style={s.courseBottom}>
          <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                s.progressFill,
                { backgroundColor: colors.accent, width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text style={[s.progressLabel, { color: colors.muted }]}>
            {progressPercent}%
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  greeting: { fontSize: 13, fontWeight: "400", letterSpacing: 0.1, marginBottom: 4 },
  name: { fontSize: 26, fontWeight: "700", letterSpacing: -0.6 },
  syncRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  syncDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  syncText: { fontSize: 12 },
  errorBanner: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  errorText: { fontSize: 12 },

  searchContainer: { paddingHorizontal: 16, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  actionsContainer: { paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionCardOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconMuted: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontSize: 14, fontWeight: "600", letterSpacing: -0.1 },
  actionSub: { fontSize: 12, marginTop: 1 },

  coursesContainer: { paddingHorizontal: 16 },
  coursesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", letterSpacing: -0.1 },
  refreshBtn: { padding: 6, borderRadius: 6 },

  emptyCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "600", marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  emptyBtnText: { fontSize: 13, fontWeight: "600" },

  coursesList: { gap: 8 },
  courseCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  courseTop: { flexDirection: "row", alignItems: "center" },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  levelText: { fontSize: 13, fontWeight: "700" },
  courseInfo: { flex: 1, marginRight: 8 },
  courseName: { fontSize: 14, fontWeight: "600", letterSpacing: -0.1, marginBottom: 3 },
  courseMeta: { fontSize: 12 },

  courseBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: { fontSize: 11, fontWeight: "600", minWidth: 28, textAlign: "right" },
});
