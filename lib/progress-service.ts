import AsyncStorage from "@react-native-async-storage/async-storage";
import { reminderService } from "./reminder-service";

const PROGRESS_KEY = "nile_progress_stats";
const STUDY_SESSIONS_KEY = "nile_study_sessions";

export interface ProgressStats {
  totalLessonsCompleted: number;
  totalStudyTime: number; // in minutes
  currentStreak: number; // consecutive days
  longestStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
  coursesProgress: Record<number, CourseProgress>; // courseId -> progress
}

export interface CourseProgress {
  courseId: number;
  completedActivities: number[];
  totalActivities: number;
  lastAccessed: number;
}

export interface StudySession {
  date: string; // YYYY-MM-DD
  duration: number; // minutes
  activitiesCompleted: number;
}

class ProgressService {
  async getProgressStats(): Promise<ProgressStats> {
    try {
      const data = await AsyncStorage.getItem(PROGRESS_KEY);
      return data ? JSON.parse(data) : {
        totalLessonsCompleted: 0,
        totalStudyTime: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: "",
        coursesProgress: {},
      };
    } catch (error) {
      console.error("Error loading progress stats:", error);
      return {
        totalLessonsCompleted: 0,
        totalStudyTime: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: "",
        coursesProgress: {},
      };
    }
  }

  async updateCourseProgress(
    courseId: number,
    activityId: number,
    totalActivities: number
  ): Promise<void> {
    try {
      const stats = await this.getProgressStats();
      
      if (!stats.coursesProgress[courseId]) {
        stats.coursesProgress[courseId] = {
          courseId,
          completedActivities: [],
          totalActivities,
          lastAccessed: Date.now(),
        };
      }

      const courseProgress = stats.coursesProgress[courseId];
      
      if (!courseProgress.completedActivities.includes(activityId)) {
        courseProgress.completedActivities.push(activityId);
        stats.totalLessonsCompleted++;
      }
      
      courseProgress.lastAccessed = Date.now();
      courseProgress.totalActivities = totalActivities;

      // Update streak
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      
      if (stats.lastStudyDate === yesterday) {
        stats.currentStreak++;
      } else if (stats.lastStudyDate !== today) {
        stats.currentStreak = 1;
      }
      
      stats.lastStudyDate = today;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);

      // Update reminder service streak
      await reminderService.updateStreak();

      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error("Error updating course progress:", error);
    }
  }

  async logStudySession(duration: number, activitiesCompleted: number): Promise<void> {
    try {
      const stats = await this.getProgressStats();
      stats.totalStudyTime += duration;
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(stats));

      // Log session
      const sessionsData = await AsyncStorage.getItem(STUDY_SESSIONS_KEY);
      const sessions: StudySession[] = sessionsData ? JSON.parse(sessionsData) : [];
      const today = new Date().toISOString().split("T")[0];
      
      const todaySession = sessions.find((s) => s.date === today);
      if (todaySession) {
        todaySession.duration += duration;
        todaySession.activitiesCompleted += activitiesCompleted;
      } else {
        sessions.push({ date: today, duration, activitiesCompleted });
      }

      await AsyncStorage.setItem(STUDY_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Error logging study session:", error);
    }
  }

  async getStudySessions(days: number = 30): Promise<StudySession[]> {
    try {
      const data = await AsyncStorage.getItem(STUDY_SESSIONS_KEY);
      const sessions: StudySession[] = data ? JSON.parse(data) : [];
      const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
      return sessions.filter((s) => s.date >= cutoffDate).sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error("Error loading study sessions:", error);
      return [];
    }
  }

  async getCourseProgress(courseId: number): Promise<CourseProgress | null> {
    try {
      const stats = await this.getProgressStats();
      return stats.coursesProgress[courseId] || null;
    } catch (error) {
      console.error("Error getting course progress:", error);
      return null;
    }
  }
}

export const progressService = new ProgressService();
