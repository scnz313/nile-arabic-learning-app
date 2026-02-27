import { useState, useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { progressService, type ProgressStats, type StudySession } from "@/lib/progress-service";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function ProgressScreen() {
  const colors = useColors();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

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
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="p-6 gap-6">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Your Progress</Text>
            <Text className="text-base text-muted mt-2">Track your learning journey</Text>
          </View>

          {/* Stats Cards */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-2xl p-5 shadow-sm">
              <MaterialIcons name="school" size={32} color={colors.primary} />
              <Text className="text-3xl font-bold text-foreground mt-3">
                {stats.totalLessonsCompleted}
              </Text>
              <Text className="text-sm text-muted mt-1">Lessons Completed</Text>
            </View>

            <View className="flex-1 bg-surface rounded-2xl p-5 shadow-sm">
              <MaterialIcons name="local-fire-department" size={32} color={colors.warning} />
              <Text className="text-3xl font-bold text-foreground mt-3">
                {stats.currentStreak}
              </Text>
              <Text className="text-sm text-muted mt-1">Day Streak</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-2xl p-5 shadow-sm">
              <MaterialIcons name="access-time" size={32} color={colors.success} />
              <Text className="text-3xl font-bold text-foreground mt-3">
                {Math.round(stats.totalStudyTime)}
              </Text>
              <Text className="text-sm text-muted mt-1">Minutes Studied</Text>
            </View>

            <View className="flex-1 bg-surface rounded-2xl p-5 shadow-sm">
              <MaterialIcons name="menu-book" size={32} color={colors.primary} />
              <Text className="text-3xl font-bold text-foreground mt-3">{totalCourses}</Text>
              <Text className="text-sm text-muted mt-1">Active Courses</Text>
            </View>
          </View>

          {/* Achievements */}
          <View className="bg-surface rounded-2xl p-5 shadow-sm">
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
          <View className="bg-surface rounded-2xl p-5 shadow-sm">
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
            <View className="bg-surface rounded-2xl p-5 shadow-sm">
              <Text className="text-xl font-semibold text-foreground mb-4">Course Progress</Text>
              <View className="gap-4">
                {Object.values(stats.coursesProgress).slice(0, 5).map((course) => {
                  const percentage = Math.round(
                    (course.completedActivities.length / course.totalActivities) * 100
                  );
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
