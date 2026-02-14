import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthContext } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { moodleAPI } from "@/lib/moodle-api";
import { storage, type CourseData } from "@/lib/storage";
import { syncService } from "@/lib/sync-service";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const colors = useColors();

  const [courses, setCourses] = useState<CourseData[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCachedCourses();
    }
  }, [isAuthenticated]);

  const loadCachedCourses = async () => {
    try {
      const cached = await storage.getCourses();
      if (cached.length > 0) {
        setCourses(cached);
        setIsLoadingCourses(false);
      }
      // Also load last sync time
      const syncTime = await storage.getLastSyncTime();
      if (syncTime) {
        setLastSync(new Date(syncTime).toLocaleString());
      }
      // Then sync fresh data
      await syncCourses();
    } catch (error) {
      console.error("Failed to load cached courses:", error);
      setIsLoadingCourses(false);
    }
  };

  const syncCourses = async () => {
    try {
      const moodleCourses = await moodleAPI.getUserCourses();

      const courseData: CourseData[] = moodleCourses.map((course, index) => ({
        id: index + 1,
        moodleCourseId: course.id,
        shortName: course.shortname,
        fullName: course.fullname,
        displayName: course.displayname || course.fullname,
        summary: course.summary,
        thumbnailUrl: course.overviewfiles?.[0]?.fileurl,
        progress: course.progress || 0,
        totalLessons: 0,
        completedLessons: 0,
        updatedAt: Date.now(),
      }));

      await storage.setCourses(courseData);
      setCourses(courseData);

      // Sync course contents
      const syncResult = await syncService.syncAll();

      // Reload to get updated progress
      const updated = await storage.getCourses();
      setCourses(updated);

      const syncTime = Date.now();
      await storage.setLastSyncTime(syncTime);
      setLastSync(new Date(syncTime).toLocaleString());

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (syncResult.lessonsAdded > 0 && !isLoadingCourses) {
        Alert.alert("New Content", `${syncResult.lessonsAdded} new item(s) added to your courses.`);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      if (courses.length === 0) {
        Alert.alert("Sync Failed", "Could not load courses. Please check your connection and try again.");
      }
    } finally {
      setIsLoadingCourses(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    syncCourses();
  }, []);

  const handleCoursePress = (course: CourseData) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/course/${course.moodleCourseId}` as any);
  };

  const renderCourseCard = ({ item }: { item: CourseData }) => (
    <TouchableOpacity
      onPress={() => handleCoursePress(item)}
      activeOpacity={0.7}
      style={[styles.courseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Course Icon */}
      <View style={[styles.courseIcon, { backgroundColor: colors.primary + "15" }]}>
        <Text style={styles.courseIconText}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Course Info */}
      <View style={styles.courseInfo}>
        <Text
          className="text-base font-bold text-foreground"
          numberOfLines={2}
        >
          {item.displayName}
        </Text>
        <Text className="text-xs text-muted mt-1">
          {item.totalLessons > 0
            ? `${item.completedLessons}/${item.totalLessons} lessons`
            : "Tap to load lessons"}
        </Text>

        {/* Progress Bar */}
        {item.totalLessons > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${item.progress}%` },
                ]}
              />
            </View>
            <Text className="text-xs font-semibold text-primary ml-2">
              {item.progress}%
            </Text>
          </View>
        )}
      </View>

      {/* Chevron */}
      <Text className="text-muted text-lg ml-2">{"\u203A"}</Text>
    </TouchableOpacity>
  );

  if (authLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-sm text-muted">Welcome back,</Text>
        <Text className="text-2xl font-bold text-foreground">
          {user?.fullName || "Student"}
        </Text>
      </View>

      {/* Last Sync */}
      {lastSync ? (
        <View className="px-6 pb-2">
          <Text className="text-xs text-muted">Last synced: {lastSync}</Text>
        </View>
      ) : null}

      {/* Courses List */}
      {isLoadingCourses && courses.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-muted mt-4">Loading your courses...</Text>
        </View>
      ) : courses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={styles.emptyIcon}>📚</Text>
          <Text className="text-lg font-bold text-foreground mb-2 text-center">
            No courses found
          </Text>
          <Text className="text-sm text-muted text-center mb-6">
            Pull down to refresh or check your enrollment on nilecenter.online
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            activeOpacity={0.8}
            className="px-6 py-3 rounded-xl"
            style={{ backgroundColor: colors.primary }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => String(item.moodleCourseId)}
          renderItem={renderCourseCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <Text className="text-lg font-bold text-foreground mb-3">
              My Courses
            </Text>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  courseIconText: { fontSize: 20, fontWeight: "700", color: "#0D6E8A" },
  courseInfo: { flex: 1 },
  progressContainer: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  listContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
