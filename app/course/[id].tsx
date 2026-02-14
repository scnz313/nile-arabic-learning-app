import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { storage, type CourseData, type LessonData } from "@/lib/storage";
import { syncService } from "@/lib/sync-service";
import * as Haptics from "expo-haptics";

interface SectionData {
  title: string;
  data: LessonData[];
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (id) loadCourseData();
  }, [id]);

  const loadCourseData = async () => {
    if (!id) return;
    try {
      const courseId = parseInt(id, 10);
      const courseData = await storage.getCourse(courseId);
      if (courseData) setCourse(courseData);

      const lessonsBySection = await syncService.getCourseLessonsBySection(courseId);
      const sectionData: SectionData[] = [];
      for (const [title, lessons] of lessonsBySection) {
        if (lessons.length > 0) {
          sectionData.push({ title, data: lessons });
        }
      }
      setSections(sectionData);
    } catch (error) {
      console.error("Failed to load course:", error);
      Alert.alert("Error", "Failed to load course data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setIsRefreshing(true);
    try {
      await syncService.syncCourse(parseInt(id, 10));
      await loadCourseData();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Sync Failed", "Could not refresh course content.");
    } finally {
      setIsRefreshing(false);
    }
  }, [id]);

  const handleLessonPress = (lesson: LessonData) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/lesson/${lesson.id}?courseId=${id}` as any);
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "video": return "🎬";
      case "pdf": return "📄";
      case "text": return "📝";
      case "url": return "🔗";
      case "assignment": return "✍️";
      case "quiz": return "📋";
      case "forum": return "💬";
      case "book": return "📖";
      case "image": return "🖼️";
      case "audio": return "🎵";
      default: return "📚";
    }
  };

  const renderLesson = ({ item }: { item: LessonData }) => (
    <TouchableOpacity
      onPress={() => handleLessonPress(item)}
      activeOpacity={0.7}
      style={[styles.lessonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.lessonIcon, { backgroundColor: colors.primary + "12" }]}>
        <Text style={styles.lessonIconText}>{getTypeIcon(item.contentType)}</Text>
      </View>
      <View style={styles.lessonInfo}>
        <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-xs text-muted mt-1 capitalize">{item.contentType}</Text>
      </View>
      {item.isCompleted ? (
        <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      ) : (
        <View style={[styles.emptyCircle, { borderColor: colors.border }]} />
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
      <Text className="text-sm font-bold text-foreground flex-1" numberOfLines={1}>
        {section.title}
      </Text>
      <Text className="text-xs text-muted">{section.data.length} items</Text>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: true, title: "Loading..." }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const totalLessons = sections.reduce((sum, s) => sum + s.data.length, 0);
  const completedLessons = sections.reduce(
    (sum, s) => sum + s.data.filter((l) => l.isCompleted).length,
    0
  );
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          title: course?.displayName || "Course",
          headerBackTitle: "Home",
        }}
      />

      {/* Course Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text className="text-2xl font-bold text-foreground">{totalLessons}</Text>
            <Text className="text-xs text-muted">Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text className="text-2xl font-bold text-success">{completedLessons}</Text>
            <Text className="text-xs text-muted">Done</Text>
          </View>
          <View style={styles.statItem}>
            <Text className="text-2xl font-bold text-primary">{progress}%</Text>
            <Text className="text-xs text-muted">Progress</Text>
          </View>
        </View>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View
            style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` }]}
          />
        </View>
      </View>

      {/* Lessons */}
      {sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={styles.emptyIcon}>📚</Text>
          <Text className="text-lg font-bold text-foreground mb-2">No lessons yet</Text>
          <Text className="text-sm text-muted text-center">
            Pull down to sync lessons from the server
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderLesson}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  statItem: { alignItems: "center" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  lessonIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  lessonIconText: { fontSize: 18 },
  lessonInfo: { flex: 1 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  checkMark: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  emptyCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, marginLeft: 8 },
  listContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
});
