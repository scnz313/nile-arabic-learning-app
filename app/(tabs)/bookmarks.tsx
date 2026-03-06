import { useCallback, useState } from "react";
import { Alert, FlatList, Text, View, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { bookmarksService, type Bookmark } from "@/lib/bookmarks-service";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { storageService } from "@/lib/storage";

export default function BookmarksScreen() {
  const router = useRouter();
  const colors = useColors();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void loadBookmarks();
    }, []),
  );

  const loadBookmarks = async () => {
    const data = await bookmarksService.getBookmarks();
    setBookmarks(data);
    setLoading(false);
  };

  const handleRemoveBookmark = async (courseId: number, activityId: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await bookmarksService.removeBookmark(courseId, activityId);
    setBookmarks((prev) => prev.filter((b) => !(b.courseId === courseId && b.activityId === activityId)));
  };

  const handleOpenLesson = async (bookmark: Bookmark) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const activity =
      bookmark.activityUrl && bookmark.modType
        ? {
            id: String(bookmark.activityId),
            name: bookmark.activityName,
            url: bookmark.activityUrl,
            modType: bookmark.modType,
          }
        : await storageService.findActivity(bookmark.courseId, bookmark.activityId);

    if (!activity) {
      const message = "This lesson is no longer cached locally. Open the course and sync again to restore it.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Lesson unavailable", message);
      }
      return;
    }

    router.push(
      `/lesson/${activity.id}?courseId=${bookmark.courseId}&modType=${activity.modType}&url=${encodeURIComponent(activity.url)}&name=${encodeURIComponent(activity.name)}` as any,
    );
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity
      onPress={() => void handleOpenLesson(item)}
      activeOpacity={0.7}
      className="bg-surface rounded-2xl p-5 mb-4 shadow-sm border border-border"
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-semibold text-foreground mb-1" numberOfLines={2}>
            {item.activityName}
          </Text>
          <Text className="text-sm text-muted" numberOfLines={1}>
            {item.courseName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveBookmark(item.courseId, item.activityId)}
          className="p-2"
        >
          <MaterialIcons name="bookmark" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <Text className="text-xs text-muted mt-2">
        Saved {new Date(item.timestamp).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading bookmarks...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="p-6 pb-0">
        <Text className="text-3xl font-bold text-foreground">Bookmarks</Text>
        <Text className="text-base text-muted mt-2">
          {bookmarks.length} saved {bookmarks.length === 1 ? "lesson" : "lessons"}
        </Text>
      </View>

      {bookmarks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="bookmark-border" size={64} color={colors.muted} />
          <Text className="text-xl font-semibold text-foreground mt-4 text-center">
            No Bookmarks Yet
          </Text>
          <Text className="text-base text-muted mt-2 text-center">
            Bookmark lessons to easily access them later
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => `${item.courseId}-${item.activityId}`}
          contentContainerStyle={{ padding: 24, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}
