import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { storage, type LessonData } from "@/lib/storage";
import { syncService } from "@/lib/sync-service";
import { moodleAPI } from "@/lib/moodle-api";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LessonViewScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const router = useRouter();
  const colors = useColors();

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadLesson();
  }, [id, courseId]);

  const loadLesson = async () => {
    if (!id || !courseId) return;
    try {
      setIsLoading(true);
      const cId = parseInt(courseId, 10);
      const lessonData = await storage.getLesson(cId, id);
      if (lessonData) {
        setLesson(lessonData);
        setIsCompleted(lessonData.isCompleted);
        // Update access time
        await syncService.updateLessonAccess(cId, id);
      }
    } catch (error) {
      console.error("Failed to load lesson:", error);
      Alert.alert("Error", "Failed to load lesson");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!lesson || !courseId) return;
    try {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await syncService.markLessonComplete(parseInt(courseId, 10), lesson.id);
      setIsCompleted(true);
    } catch (error) {
      Alert.alert("Error", "Failed to mark lesson as complete");
    }
  };

  const handleOpenResource = async (url: string) => {
    try {
      const fullUrl = moodleAPI.getFileUrl(url);
      if (Platform.OS === "web") {
        window.open(fullUrl, "_blank");
      } else {
        await WebBrowser.openBrowserAsync(fullUrl);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open resource");
    }
  };

  const handleOpenInBrowser = async () => {
    if (!lesson?.url) return;
    try {
      if (Platform.OS === "web") {
        window.open(lesson.url, "_blank");
      } else {
        await WebBrowser.openBrowserAsync(lesson.url);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open in browser");
    }
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

  const getResourceIcon = (type: string): string => {
    switch (type) {
      case "video": return "🎬";
      case "pdf": return "📄";
      case "image": return "🖼️";
      case "audio": return "🎵";
      default: return "📎";
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: true, title: "Loading..." }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!lesson) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: true, title: "Not Found" }} />
        <Text className="text-lg text-muted">Lesson not found</Text>
      </ScreenContainer>
    );
  }

  // Strip HTML tags from description
  const cleanDescription = lesson.description
    ? lesson.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim()
    : "";

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Lesson",
          headerBackTitle: "Course",
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Lesson Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={[styles.typeIcon, { backgroundColor: colors.primary + "15" }]}>
              <Text style={styles.typeIconText}>{getTypeIcon(lesson.contentType)}</Text>
            </View>
            {isCompleted && (
              <View style={[styles.completedBadge, { backgroundColor: colors.success + "15" }]}>
                <Text style={[styles.completedText, { color: colors.success }]}>Completed</Text>
              </View>
            )}
          </View>
          <Text className="text-xl font-bold text-foreground mt-3">{lesson.name}</Text>
          <View style={styles.metaRow}>
            <Text className="text-xs text-muted capitalize">{lesson.contentType}</Text>
            <Text className="text-xs text-muted mx-2">·</Text>
            <Text className="text-xs text-muted">{lesson.sectionName}</Text>
          </View>
        </View>

        {/* Description */}
        {cleanDescription ? (
          <View style={styles.section}>
            <Text className="text-sm font-bold text-foreground mb-2">Description</Text>
            <Text className="text-sm text-foreground leading-6">{cleanDescription}</Text>
          </View>
        ) : null}

        {/* Resources */}
        {lesson.resources && lesson.resources.length > 0 && (
          <View style={styles.section}>
            <Text className="text-sm font-bold text-foreground mb-3">
              Resources ({lesson.resources.length})
            </Text>
            {lesson.resources.map((resource) => (
              <TouchableOpacity
                key={resource.id}
                onPress={() => handleOpenResource(resource.url)}
                activeOpacity={0.7}
                style={[styles.resourceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.resourceIcon, { backgroundColor: colors.primary + "12" }]}>
                  <Text style={styles.resourceIconText}>{getResourceIcon(resource.type)}</Text>
                </View>
                <View style={styles.resourceInfo}>
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {resource.name}
                  </Text>
                  {resource.fileSize ? (
                    <Text className="text-xs text-muted mt-1">
                      {(resource.fileSize / 1024 / 1024).toFixed(1)} MB
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.openText, { color: colors.primary }]}>Open</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Open in Browser */}
        {lesson.url && (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={handleOpenInBrowser}
              activeOpacity={0.7}
              style={[styles.browserButton, { borderColor: colors.primary }]}
            >
              <Text style={[styles.browserButtonText, { color: colors.primary }]}>
                Open in Browser
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mark Complete Button */}
        <View style={styles.section}>
          {!isCompleted ? (
            <TouchableOpacity
              onPress={handleMarkComplete}
              activeOpacity={0.8}
              style={[styles.completeButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.completeButtonText}>Mark as Complete</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.completedButton, { backgroundColor: colors.success + "12", borderColor: colors.success }]}>
              <Text style={[styles.completedButtonText, { color: colors.success }]}>
                ✓ Lesson Completed
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  headerCard: { margin: 16, padding: 20, borderRadius: 16, borderWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  typeIconText: { fontSize: 22 },
  completedBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  completedText: { fontSize: 12, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  resourceIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  resourceIconText: { fontSize: 16 },
  resourceInfo: { flex: 1 },
  openText: { fontSize: 13, fontWeight: "600", marginLeft: 8 },
  browserButton: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  browserButtonText: { fontSize: 15, fontWeight: "600" },
  completeButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  completedButton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1 },
  completedButtonText: { fontSize: 16, fontWeight: "700" },
});
