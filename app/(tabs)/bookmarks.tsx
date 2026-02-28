import { useState, useEffect } from "react";
import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { bookmarksService, type Bookmark } from "@/lib/bookmarks-service";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function BookmarksScreen() {
  const router = useRouter();
  const colors = useColors();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

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
    setBookmarks((prev) =>
      prev.filter((b) => !(b.courseId === courseId && b.activityId === activityId))
    );
  };

  const handleOpenLesson = (courseId: number, activityId: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/lesson/${activityId}?courseId=${courseId}`);
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity
      onPress={() => handleOpenLesson(item.courseId, item.activityId)}
      activeOpacity={0.7}
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={s.cardContent}>
        <View style={s.cardLeft}>
          <Text style={[s.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.activityName}
          </Text>
          <Text style={[s.cardSub, { color: colors.muted }]} numberOfLines={1}>
            {item.courseName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveBookmark(item.courseId, item.activityId)}
          style={s.bookmarkBtn}
          activeOpacity={0.6}
        >
          <MaterialIcons name="bookmark" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>
      <Text style={[s.cardDate, { color: colors.muted }]}>
        {new Date(item.timestamp).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={s.centered}>
          <Text style={[s.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Bookmarks</Text>
        <Text style={[s.headerCount, { color: colors.muted }]}>
          {bookmarks.length} {bookmarks.length === 1 ? "item" : "items"}
        </Text>
      </View>

      {bookmarks.length === 0 ? (
        <View style={s.emptyContainer}>
          <MaterialIcons name="bookmark-outline" size={40} color={colors.muted + "50"} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>No bookmarks</Text>
          <Text style={[s.emptySub, { color: colors.muted }]}>
            Save lessons to access them quickly
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => `${item.courseId}-${item.activityId}`}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 13 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.6 },
  headerCount: { fontSize: 13, marginTop: 4 },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },

  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 8,
  },
  cardContent: { flexDirection: "row", alignItems: "flex-start" },
  cardLeft: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 14, fontWeight: "600", letterSpacing: -0.1, lineHeight: 20 },
  cardSub: { fontSize: 12, marginTop: 3 },
  bookmarkBtn: { padding: 4 },
  cardDate: { fontSize: 11, marginTop: 8 },
});
