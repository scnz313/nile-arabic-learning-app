import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { progressService, type ProgressStats, type StudySession } from "@/lib/progress-service";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function ProgressScreen() {
  const colors = useColors();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, []),
  );

  const loadProgress = async () => {
    const progressStats = await progressService.getProgressStats();
    const studySessions = await progressService.getStudySessions(7);
    setStats(progressStats);
    setSessions(studySessions);
    setLoading(false);
  };

  if (loading || !stats) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading progress...</Text>
      </ScreenContainer>
    );
  }

  const totalCourses = Object.keys(stats.coursesProgress).length;
  const avgStudyTime = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length)
    : 0;

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 144 }}>
        <View className="p-6 gap-6">
          {/* Header */}
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 24,
            }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-3xl font-bold text-foreground">Your Progress</Text>
                <Text className="text-base text-muted mt-2">Track your learning journey</Text>
              </View>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "16",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="insights" size={26} color={colors.primary} />
              </View>
            </View>

            <View className="flex-row gap-3 mt-5">
              <HeroMetric colors={colors} label="Current streak" value={`${stats.currentStreak}d`} />
              <HeroMetric colors={colors} label="Study time" value={`${Math.round(stats.totalStudyTime)}m`} />
              <HeroMetric colors={colors} label="Courses" value={String(totalCourses)} />
            </View>
          </View>

          {/* Stats Cards */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-[24px] p-5 shadow-sm border border-border">
              <MaterialIcons name="school" size={32} color={colors.primary} />
              <Text className="text-3xl font-bold text-foreground mt-3">
                {stats.totalLessonsCompleted}
              </Text>
              <Text className="text-sm text-muted mt-1">Lessons Completed</Text>
            </View>

            <View className="flex-1 bg-surface rounded-[24px] p-5 shadow-sm border border-border">
              <MaterialIcons name="local-fire-department" size={32} color={colors.warning} />
              <Text className="text-3xl font-bold text-foreground mt-3">
                {stats.currentStreak}
              </Text>
              <Text className="text-sm text-muted mt-1">Day Streak</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-[24px] p-5 shadow-sm border border-border">
              <MaterialIcons name="access-time" size={32} color={colors.success} />
              <Text className="text-3xl font-bold text-foreground mt-3">
                {Math.round(stats.totalStudyTime)}
              </Text>
              <Text className="text-sm text-muted mt-1">Minutes Studied</Text>
            </View>

            <View className="flex-1 bg-surface rounded-[24px] p-5 shadow-sm border border-border">
              <MaterialIcons name="menu-book" size={32} color={colors.primary} />
              <Text className="text-3xl font-bold text-foreground mt-3">{totalCourses}</Text>
              <Text className="text-sm text-muted mt-1">Active Courses</Text>
            </View>
          </View>

          {/* Achievements */}
          <View className="bg-surface rounded-[24px] p-5 shadow-sm border border-border">
            <Text className="text-xl font-semibold text-foreground mb-4">Achievements</Text>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-warning/20 rounded-full items-center justify-center">
                  <MaterialIcons name="emoji-events" size={24} color={colors.warning} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Longest Streak
                  </Text>
                  <Text className="text-sm text-muted">{stats.longestStreak} days</Text>
                </View>
              </View>

              {avgStudyTime > 0 && (
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 bg-success/20 rounded-full items-center justify-center">
                    <MaterialIcons name="trending-up" size={24} color={colors.success} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      Avg. Study Time
                    </Text>
                    <Text className="text-sm text-muted">{avgStudyTime} min/day (last 7 days)</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Recent Activity */}
          <View className="bg-surface rounded-[24px] p-5 shadow-sm border border-border">
            <Text className="text-xl font-semibold text-foreground mb-4">Recent Activity</Text>
            {sessions.length === 0 ? (
              <Text className="text-muted text-center py-4">No recent activity</Text>
            ) : (
              <View className="gap-3">
                {sessions.slice(0, 5).map((session, index) => (
                  <View
                    key={index}
                    className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0"
                  >
                    <View>
                      <Text className="text-base font-medium text-foreground">
                        {new Date(session.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                      <Text className="text-sm text-muted mt-1">
                        {session.activitiesCompleted} {session.activitiesCompleted === 1 ? "lesson" : "lessons"}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-bold text-primary">{session.duration}</Text>
                      <Text className="text-xs text-muted">minutes</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Course Progress */}
          {totalCourses > 0 && (
            <View className="bg-surface rounded-[24px] p-5 shadow-sm border border-border">
              <Text className="text-xl font-semibold text-foreground mb-4">Course Progress</Text>
              <View className="gap-4">
                {Object.values(stats.coursesProgress).slice(0, 5).map((course) => {
                  const percentage = course.totalActivities > 0
                    ? Math.round((course.completedActivities.length / course.totalActivities) * 100)
                    : 0;
                  return (
                    <View key={course.courseId}>
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-base font-medium text-foreground">
                          Course {course.courseId}
                        </Text>
                        <Text className="text-sm font-semibold text-primary">{percentage}%</Text>
                      </View>
                      <View className="h-2 bg-border rounded-full overflow-hidden">
                        <View
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </View>
                      <Text className="text-xs text-muted mt-1">
                        {course.completedActivities.length} of {course.totalActivities} lessons
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function HeroMetric({
  colors,
  label,
  value,
}: {
  colors: ReturnType<typeof useColors>;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground, marginTop: 6 }}>
        {value}
      </Text>
    </View>
  );
}
