import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { webViewCacheService, type CachedContent } from "@/lib/webview-cache-service";
import * as Haptics from "expo-haptics";

export default function CacheManagementScreen() {
  const colors = useColors();
  const router = useRouter();
  const [cachedItems, setCachedItems] = useState<CachedContent[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadCacheData();
  }, []);

  const loadCacheData = async () => {
    try {
      setIsLoading(true);
      const items = await webViewCacheService.getAllCached();
      const size = await webViewCacheService.getCacheSize();
      setCachedItems(items);
      setTotalSize(size);
    } catch (error) {
      console.error("Load cache data error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleClearItem = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear Cache Item",
      "Are you sure you want to remove this cached content?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await webViewCacheService.removeCachedContent(url);
            await loadCacheData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleClearAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear All Cache",
      `This will remove all ${cachedItems.length} cached items (${formatBytes(totalSize * 1024 * 1024)}). Are you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            await webViewCacheService.clearCache();
            await loadCacheData();
            setIsClearing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: CachedContent["type"]) => {
    switch (type) {
      case "video":
        return "play-circle-filled";
      case "pdf":
        return "picture-as-pdf";
      case "html":
        return "description";
      default:
        return "insert-drive-file";
    }
  };

  const getTypeColor = (type: CachedContent["type"]) => {
    switch (type) {
      case "video":
        return "#DC2626";
      case "pdf":
        return "#EF4444";
      case "html":
        return "#0C6478";
      default:
        return "#6B7280";
    }
  };

  const maxCacheSizeMB = 100;
  const usagePercent = Math.min((totalSize / maxCacheSizeMB) * 100, 100);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading cache data...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cache Management</Text>
        </View>

        {/* Storage Overview */}
        <View style={[styles.overviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.overviewHeader}>
            <MaterialIcons name="storage" size={24} color={colors.primary} />
            <Text style={[styles.overviewTitle, { color: colors.foreground }]}>Storage Usage</Text>
          </View>

          <View style={styles.sizeInfo}>
            <Text style={[styles.sizeText, { color: colors.foreground }]}>{formatBytes(totalSize * 1024 * 1024)}</Text>
            <Text style={[styles.sizeSubtext, { color: colors.muted }]}>of {maxCacheSizeMB} MB used</Text>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: usagePercent > 80 ? "#EF4444" : colors.primary,
                  width: `${usagePercent}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.percentText, { color: colors.muted }]}>{usagePercent.toFixed(1)}% full</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{cachedItems.length}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {cachedItems.filter((i) => i.type === "video").length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Videos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {cachedItems.filter((i) => i.type === "html").length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Pages</Text>
            </View>
          </View>
        </View>

        {/* Clear All Button */}
        {cachedItems.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            disabled={isClearing}
            style={[styles.clearAllButton, { backgroundColor: "#EF444410", borderColor: "#EF444430" }]}
            activeOpacity={0.7}
          >
            {isClearing ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <MaterialIcons name="delete-sweep" size={20} color="#EF4444" />
                <Text style={styles.clearAllText}>Clear All Cache</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Cached Items List */}
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>Cached Content</Text>
          <Text style={[styles.listSubtitle, { color: colors.muted }]}>
            {cachedItems.length === 0 ? "No cached items" : `${cachedItems.length} items`}
          </Text>
        </View>

        {cachedItems.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="cloud-off" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No cached content yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.muted }]}>
              Content will be cached automatically as you view lessons
            </Text>
          </View>
        ) : (
          cachedItems.map((item, index) => (
            <View
              key={index}
              style={[styles.cacheItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.itemIcon, { backgroundColor: getTypeColor(item.type) + "15" }]}>
                <MaterialIcons name={getTypeIcon(item.type) as any} size={24} color={getTypeColor(item.type)} />
              </View>

              <View style={styles.itemInfo}>
                <Text style={[styles.itemUrl, { color: colors.foreground }]} numberOfLines={1}>
                  {item.url.split("/").pop() || item.url}
                </Text>
                <View style={styles.itemMeta}>
                  <Text style={[styles.itemMetaText, { color: colors.muted }]}>{formatBytes(item.size)}</Text>
                  <Text style={[styles.itemMetaText, { color: colors.muted }]}>•</Text>
                  <Text style={[styles.itemMetaText, { color: colors.muted }]}>{formatDate(item.cachedAt)}</Text>
                  <Text style={[styles.itemMetaText, { color: colors.muted }]}>•</Text>
                  <Text style={[styles.itemMetaText, { color: colors.muted }]}>{item.type}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleClearItem(item.url)}
                style={styles.deleteButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete-outline" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sizeInfo: {
    alignItems: "center",
    marginBottom: 12,
  },
  sizeText: {
    fontSize: 32,
    fontWeight: "700",
  },
  sizeSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  percentText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#00000010",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  clearAllText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },
  listHeader: {
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  cacheItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemUrl: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: "row",
    gap: 6,
  },
  itemMetaText: {
    fontSize: 13,
  },
  deleteButton: {
    padding: 8,
  },
});
