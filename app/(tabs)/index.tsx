import { ScrollView, Text, View, RefreshControl, Pressable, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
    const filtered = courses.filter((course) =>
      course.fullname.toLowerCase().includes(lowercaseQuery) ||
      course.shortname?.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredCourses(filtered);
  };

  const handleSync = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
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

  useFocusEffect(
    useCallback(() => {
      loadCourses();
    }, [])
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleSync} tintColor={colors.primary} />
        }
      >
        {/* Header Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}>
          <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 2, letterSpacing: 0.3 }}>Welcome back</Text>
          <Text style={{ fontSize: 30, fontWeight: "800", color: colors.foreground, letterSpacing: -0.5 }}>
            {user?.fullName || "Student"}
          </Text>
          {lastSynced && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, backgroundColor: colors.success + "10", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" }}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.success, marginLeft: 6, fontWeight: "600" }}>
                Synced {lastSynced}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20, gap: 12 }}>
          {/* Search Bar */}
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
            <MaterialIcons name="search" size={20} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search courses..."
              placeholderTextColor={colors.muted}
              style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.foreground }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")} activeOpacity={0.7}>
                <MaterialIcons name="close" size={20} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions Row */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/flashcards");
              }}
              activeOpacity={0.7}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
                gap: 12,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="style" size={22} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>Flashcards</Text>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>Practice vocab</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/vocabulary" as any);
              }}
              activeOpacity={0.7}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
                gap: 12,
                borderWidth: 1.5,
                borderColor: colors.border,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#8B5CF6" + "15", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="translate" size={22} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>Vocabulary</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>Word bank</Text>
              </View>
            </TouchableOpacity>
          </View>
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
                {user ? "No courses yet" : "Sign in to get started"}
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, textAlign: "center", lineHeight: 22 }}>
                {user 
                  ? "Pull down to sync your courses from Nile Center" 
                  : "Sign in with your Nile Center credentials to access your Arabic courses"}
              </Text>
              {!user && (
                <TouchableOpacity
                  onPress={() => router.push("/login")}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingHorizontal: 32,
                    paddingVertical: 14,
                    marginTop: 20,
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>Sign In</Text>
                </TouchableOpacity>
              )}
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

interface CourseCardProps {
  course: MoodleCourse;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function CourseCard({ course, onPress, colors }: CourseCardProps) {
  const levelMatch = course.fullname?.match(/Level\s+(\d+)/i);
  const levelNumber = levelMatch ? levelMatch[1] : "?";
  
  const cleanName = course.fullname
    ?.replace(/^[A-Za-z]+-[A-Za-z0-9]+-\d+\s*-\s*/, "")
    .replace(/\s*Onsite.*$/, "")
    .replace(/\s*\([^)]*\)$/, "")
    .trim() || course.fullname || "Course";
  
  const totalActivities = course.totalActivities || 0;
  const completedCount = course.completedActivities || 0;
  const progressPercent = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  const levelColors = [
    "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899",
  ];
  const levelColor = levelColors[(parseInt(levelNumber) - 1) % levelColors.length] || levelColors[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: pressed ? 0.1 : 0.06,
        shadowRadius: 16,
        elevation: 4,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {/* Color accent bar at top */}
      <View style={{ height: 4, backgroundColor: levelColor }} />
      
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Level Badge */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: levelColor + "15",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Text style={{ fontSize: 10, color: levelColor, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" }}>Level</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: levelColor }}>{levelNumber}</Text>
          </View>

          {/* Course Info */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground, marginBottom: 6, lineHeight: 22 }}>
              {cleanName}
            </Text>
            
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="folder-open" size={14} color={colors.muted} />
                <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 4, fontWeight: "500" }}>
                  {course.totalSections || 0} sections
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="library-books" size={14} color={colors.muted} />
                <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 4, fontWeight: "500" }}>
                  {totalActivities} lessons
                </Text>
              </View>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={22} color={colors.muted} style={{ marginLeft: 4, marginTop: 4 }} />
        </View>

        {/* Progress Bar */}
        {totalActivities > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "500" }}>Progress</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: progressPercent > 0 ? colors.success : colors.muted }}>
                {progressPercent}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${Math.max(progressPercent, 2)}%`, backgroundColor: colors.success, borderRadius: 3 }} />
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}
