import { useState, useEffect } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import {
  progressService,
  type ProgressStats,
  type StudySession,
} from "@/lib/progress-service";
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
      <ScreenContainer>
        <View style={s.centered}>
          <Text style={[s.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const totalCourses = Object.keys(stats.coursesProgress).length;
  const avgStudyTime =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, ss) => sum + ss.duration, 0) / sessions.length)
      : 0;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Progress</Text>
          <Text style={[s.headerSub, { color: colors.muted }]}>
            Your learning at a glance
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <StatCard
            icon="school"
            value={stats.totalLessonsCompleted}
            label="Lessons"
            colors={colors}
          />
          <StatCard
            icon="local-fire-department"
            value={stats.currentStreak}
            label="Streak"
            colors={colors}
          />
          <StatCard
            icon="schedule"
            value={Math.round(stats.totalStudyTime)}
            label="Minutes"
            colors={colors}
          />
          <StatCard
            icon="menu-book"
            value={totalCourses}
            label="Courses"
            colors={colors}
          />
        </View>

        {/* Milestones */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.muted }]}>MILESTONES</Text>
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MilestoneRow
              icon="emoji-events"
              label="Longest streak"
              value={`${stats.longestStreak} days`}
              colors={colors}
            />
            {avgStudyTime > 0 && (
              <MilestoneRow
                icon="trending-up"
                label="Avg. study time"
                value={`${avgStudyTime} min/day`}
                colors={colors}
                isLast
              />
            )}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.muted }]}>RECENT ACTIVITY</Text>
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {sessions.length === 0 ? (
              <View style={s.emptyRow}>
                <Text style={[s.emptyText, { color: colors.muted }]}>No recent activity</Text>
              </View>
            ) : (
              sessions.slice(0, 5).map((session, index) => (
                <View
                  key={index}
                  style={[
                    s.activityRow,
                    index < Math.min(sessions.length, 5) - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View>
                    <Text style={[s.activityDate, { color: colors.foreground }]}>
                      {new Date(session.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <Text style={[s.activitySub, { color: colors.muted }]}>
                      {session.activitiesCompleted}{" "}
                      {session.activitiesCompleted === 1 ? "lesson" : "lessons"}
                    </Text>
                  </View>
                  <View style={s.activityRight}>
                    <Text style={[s.activityValue, { color: colors.foreground }]}>
                      {session.duration}
                    </Text>
                    <Text style={[s.activityUnit, { color: colors.muted }]}>min</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Course Progress */}
        {totalCourses > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.muted }]}>COURSES</Text>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {Object.values(stats.coursesProgress)
                .slice(0, 5)
                .map((course, index, arr) => {
                  const pct = course.totalActivities > 0
                    ? Math.round((course.completedActivities.length / course.totalActivities) * 100)
                    : 0;
                  return (
                    <View
                      key={course.courseId}
                      style={[
                        s.courseRow,
                        index < arr.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <View style={s.courseRowTop}>
                        <Text
                          style={[s.courseLabel, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          Course {course.courseId}
                        </Text>
                        <Text style={[s.coursePct, { color: colors.accent }]}>{pct}%</Text>
                      </View>
                      <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
                        <View
                          style={[
                            s.progressFill,
                            { backgroundColor: colors.accent, width: `${pct}%` },
                          ]}
                        />
                      </View>
                      <Text style={[s.courseSub, { color: colors.muted }]}>
                        {course.completedActivities.length} of {course.totalActivities}
                      </Text>
                    </View>
                  );
                })}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard({
  icon,
  value,
  label,
  colors,
}: {
  icon: string;
  value: number;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <MaterialIcons name={icon as any} size={18} color={colors.muted} />
      <Text style={[s.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function MilestoneRow({
  icon,
  label,
  value,
  colors,
  isLast = false,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        s.milestoneRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[s.milestoneIcon, { backgroundColor: colors.accent + "14" }]}>
        <MaterialIcons name={icon as any} size={16} color={colors.accent} />
      </View>
      <Text style={[s.milestoneLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[s.milestoneValue, { color: colors.muted }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 13 },
  scroll: { paddingBottom: 40 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.6 },
  headerSub: { fontSize: 13, marginTop: 4 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 4,
  },
  statValue: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginTop: 4 },
  statLabel: { fontSize: 12 },

  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },

  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  milestoneIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  milestoneLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  milestoneValue: { fontSize: 13 },

  emptyRow: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 13 },

  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityDate: { fontSize: 14, fontWeight: "500" },
  activitySub: { fontSize: 12, marginTop: 2 },
  activityRight: { alignItems: "flex-end" },
  activityValue: { fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  activityUnit: { fontSize: 11 },

  courseRow: { paddingHorizontal: 14, paddingVertical: 12 },
  courseRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  courseLabel: { fontSize: 14, fontWeight: "500", flex: 1 },
  coursePct: { fontSize: 13, fontWeight: "600" },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", borderRadius: 2 },
  courseSub: { fontSize: 11 },
});
