import { ScrollView, Text, View, RefreshControl, Pressable, ActivityIndicator } from "react-native";
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
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function HomeScreen() {
  const { user } = useAuthContext();
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const colors = useColors();

  const loadCourses = async () => {
    try {
      const cached = await storageService.getCourses();
      setCourses(cached);
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

  const handleSync = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await syncService.syncAllCourses();
      await loadCourses();
    } catch (error) {
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
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleSync} tintColor={colors.primary} />
        }
      >
        {/* Header Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
          <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>Welcome back</Text>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground }}>
            {user?.fullName || "Student"}
          </Text>
          {lastSynced && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
              <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 6 }}>
                Last synced: {lastSynced}
              </Text>
            </View>
          )}
        </View>

        {/* My Courses Section */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>My Courses</Text>
            <Pressable
              onPress={handleSync}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: colors.surface,
              })}
            >
              <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {/* Course Cards */}
          {courses.length === 0 ? (
            <View style={{ 
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 32,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <IconSymbol name="book.fill" size={48} color={colors.muted} />
              <Text style={{ fontSize: 18, fontWeight: "600", color: colors.foreground, marginTop: 16 }}>
                No courses yet
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, textAlign: "center" }}>
                Pull down to sync your courses from Nile Center
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {courses.map((course) => (
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
  // Extract level number from course name
  const levelMatch = course.fullname?.match(/Level\s+(\d+)/i);
  const levelNumber = levelMatch ? levelMatch[1] : "?";
  
  // Clean course name
  const cleanName = course.fullname?.replace(/^.*?Level\s+\d+\s*[-–—]?\s*/i, "") || course.fullname || "Course";
  
  // Calculate progress
  const totalActivities = course.totalActivities || 0;
  const completedCount = course.completedActivities || 0;
  const progressPercent = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  // Color based on level
  const levelColors = [
    { bg: "#EF4444", text: "#FFFFFF" }, // Red
    { bg: "#F59E0B", text: "#FFFFFF" }, // Orange
    { bg: "#10B981", text: "#FFFFFF" }, // Green
    { bg: "#3B82F6", text: "#FFFFFF" }, // Blue
    { bg: "#8B5CF6", text: "#FFFFFF" }, // Purple
    { bg: "#EC4899", text: "#FFFFFF" }, // Pink
  ];
  const colorIndex = (parseInt(levelNumber) - 1) % levelColors.length;
  const levelColor = levelColors[colorIndex] || levelColors[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: pressed ? 0.08 : 0.06,
        shadowRadius: 12,
        elevation: 4,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Level Badge */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: levelColor.bg,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
          }}
        >
          <Text style={{ fontSize: 12, color: levelColor.text, opacity: 0.8, fontWeight: "600" }}>Level</Text>
          <Text style={{ fontSize: 24, fontWeight: "700", color: levelColor.text }}>{levelNumber}</Text>
        </View>

        {/* Course Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 6 }}>
            {cleanName}
          </Text>
          
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <IconSymbol name="book.fill" size={14} color={colors.muted} />
            <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 6 }}>
              {course.totalSections || 0} sections
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginHorizontal: 8 }}>•</Text>
            <IconSymbol name="doc.fill" size={14} color={colors.muted} />
            <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 6 }}>
              {totalActivities} activities
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>Progress</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.success }}>
                {completedCount}/{totalActivities} ({progressPercent}%)
              </Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: colors.surface,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  backgroundColor: colors.success,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        </View>

        {/* Chevron */}
        <IconSymbol name="chevron.right" size={20} color={colors.muted} style={{ marginLeft: 8 }} />
      </View>
    </Pressable>
  );
}
