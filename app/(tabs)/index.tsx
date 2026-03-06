import { ScrollView, Text, View, RefreshControl, Pressable, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useAuthContext } from "@/lib/auth-context";
import { storageService } from "@/lib/storage";
import { syncService } from "@/lib/sync-service";
import type { MoodleCourse } from "@/lib/moodle-api";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function HomeScreen() {
  const { user } = useAuthContext();
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const colors = useColors();

  const loadCourses = useCallback(async () => {
    try {
      const cached = await storageService.getVisibleCoursesWithStats();
      setCourses(cached);
      const lastSync = await storageService.getLastSyncTime();
      setLastSynced(lastSync ? new Date(lastSync).toLocaleString() : null);
    } catch (error) {
      console.error("Load courses error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return courses;
    }

    return courses.filter((course) =>
      course.fullname.toLowerCase().includes(normalizedQuery) ||
      course.shortname?.toLowerCase().includes(normalizedQuery)
    );
  }, [courses, searchQuery]);

  const courseSummary = useMemo(() => {
    const totalCourses = courses.length;
    const totalActivities = courses.reduce((sum, course) => sum + (course.totalActivities || 0), 0);
    const completedActivities = courses.reduce((sum, course) => sum + (course.completedActivities || 0), 0);

    return {
      totalCourses,
      totalActivities,
      completedActivities,
    };
  }, [courses]);

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
    void loadCourses();
  }, [loadCourses]);

  useFocusEffect(
    useCallback(() => {
      void loadCourses();
    }, [loadCourses]),
  );

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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 144 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleSync} tintColor={colors.primary} />
        }
      >
        {/* Header Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 22,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.14,
              shadowRadius: 28,
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 6 }}>Welcome back</Text>
                <Text style={{ fontSize: 30, fontWeight: "800", color: colors.foreground }} numberOfLines={2}>
                  {user?.fullName || "Student"}
                </Text>
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 }}>
                  Continue your Arabic lessons with a cleaner, faster study flow.
                </Text>
              </View>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: colors.primary + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <SummaryChip
                label="Courses"
                value={String(courseSummary.totalCourses)}
                color={colors.primary}
                icon="menu-book"
              />
              <SummaryChip
                label="Completed"
                value={`${courseSummary.completedActivities}/${courseSummary.totalActivities || 0}`}
                color={colors.success}
                icon="check-circle"
              />
              <SummaryChip
                label="Sync"
                value={lastSynced ? "Updated" : "Pending"}
                color={lastSynced ? colors.success : colors.warning}
                icon={lastSynced ? "cloud-done" : "cloud-sync"}
              />
            </View>

            {lastSynced && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 16,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
                <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 8, flex: 1 }}>
                  Last synced: {lastSynced}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20, gap: 12 }}>
          {/* Search Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <MaterialIcons name="search" size={20} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search courses..."
              placeholderTextColor={colors.muted}
              style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.foreground }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                <MaterialIcons name="close" size={20} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Flashcards Button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/flashcards");
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.primary,
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 18,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.16,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="style" size={22} color="#FFF" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFF" }}>Practice Flashcards</Text>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Review vocabulary</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* My Courses Section */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>My Courses</Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                {courseSummary.totalCourses} active levels ready to study
              </Text>
            </View>
            <Pressable
              onPress={handleSync}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                width: 42,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {/* Course Cards */}
          {filteredCourses.length === 0 ? (
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
                {searchQuery.trim() ? "No matching courses" : "No courses yet"}
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, textAlign: "center" }}>
                {searchQuery.trim()
                  ? "Try a different search term or clear the filter."
                  : "Pull down to sync your courses from Nile Center"}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
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

function SummaryChip({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 999,
        backgroundColor: color + "12",
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: color + "20",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <View>
        <Text style={{ fontSize: 11, color, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#E6EDF3" }}>{value}</Text>
      </View>
    </View>
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
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: pressed ? 0.16 : 0.1,
        shadowRadius: 20,
        elevation: 6,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Level Badge */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
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
          <Text style={{ fontSize: 19, fontWeight: "800", color: colors.foreground, marginBottom: 10 }}>
            {cleanName}
          </Text>
          
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <InfoPill colors={colors} icon="view-module" label={`${course.totalSections || 0} sections`} />
            <InfoPill colors={colors} icon="fact-check" label={`${totalActivities} activities`} />
          </View>

          {/* Progress Bar */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>Progress</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.success }}>
                {completedCount}/{totalActivities} · {progressPercent}%
              </Text>
            </View>
            <View
              style={{
                height: 10,
                backgroundColor: colors.background,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  backgroundColor: colors.success,
                  borderRadius: 999,
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

function InfoPill({
  colors,
  icon,
  label,
}: {
  colors: ReturnType<typeof useColors>;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <MaterialIcons name={icon} size={14} color={colors.muted} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>{label}</Text>
    </View>
  );
}
