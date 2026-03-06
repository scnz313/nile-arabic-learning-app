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
      className="bg-surface rounded-[24px] p-5 mb-4 border border-border"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 6,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row flex-1 mr-3">
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: colors.primary + "16",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <MaterialIcons name="bookmark-added" size={22} color={colors.primary} />
          </View>
          <View className="flex-1">
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase" }}>
                Quick access
              </Text>
            </View>
          <Text className="text-lg font-semibold text-foreground mb-1" numberOfLines={2}>
            {item.activityName}
          </Text>
          <Text className="text-sm text-muted" numberOfLines={1}>
            {item.courseName}
          </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 10 }}>
              Saved {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveBookmark(item.courseId, item.activityId)}
          className="p-2"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MaterialIcons name="bookmark" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
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
        <View
          style={{
            borderRadius: 28,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 22,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-3xl font-bold text-foreground">Bookmarks</Text>
              <Text className="text-base text-muted mt-2">
                Jump back into saved lessons without searching again.
              </Text>
            </View>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: colors.primary + "16",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="bookmarks" size={24} color={colors.primary} />
            </View>
          </View>
          <View
            style={{
              marginTop: 18,
              alignSelf: "flex-start",
              borderRadius: 999,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
              {bookmarks.length} saved {bookmarks.length === 1 ? "lesson" : "lessons"}
            </Text>
          </View>
        </View>
      </View>

      {bookmarks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 32,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <MaterialIcons name="bookmark-border" size={42} color={colors.muted} />
          </View>
          <Text className="text-xl font-semibold text-foreground mt-4 text-center">
            No Bookmarks Yet
          </Text>
          <Text className="text-base text-muted mt-2 text-center">
            Save lessons from any course to build a quick study shelf here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => `${item.courseId}-${item.activityId}`}
          contentContainerStyle={{ padding: 24, paddingTop: 16, paddingBottom: 144 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}
