import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { downloadManager, type DownloadedLesson, type DownloadProgress } from "@/lib/download-manager";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function DownloadsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [downloads, setDownloads] = useState<DownloadedLesson[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDownloads();

    // Subscribe to download progress
    const unsubscribe = downloadManager.subscribeToProgress((progress) => {
      setDownloadProgress(progress);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadDownloads = async () => {
    const downloaded = await downloadManager.getDownloadedLessons();
    setDownloads(downloaded);
    const size = await downloadManager.getTotalDownloadSize();
    setTotalSize(size);
    setLoading(false);
  };

  const handleDelete = async (activityId: string, activityName: string) => {
    if (Platform.OS === "web") {
      if (!confirm(`Delete "${activityName}"?`)) return;
    } else {
      Alert.alert(
        "Delete Download",
        `Are you sure you want to delete "${activityName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await performDelete(activityId);
            },
          },
        ]
      );
      return;
    }
    await performDelete(activityId);
  };

  const performDelete = async (activityId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await downloadManager.deleteDownload(activityId);
    await loadDownloads();
  };

  const handleClearAll = async () => {
    if (Platform.OS === "web") {
      if (!confirm("Delete all downloads?")) return;
    } else {
      Alert.alert(
        "Clear All Downloads",
        "Are you sure you want to delete all downloaded lessons?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete All",
            style: "destructive",
            onPress: async () => {
              await performClearAll();
            },
          },
        ]
      );
      return;
    }
    await performClearAll();
  };

  const performClearAll = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await downloadManager.clearAllDownloads();
    await loadDownloads();
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderDownloadItem = ({ item }: { item: DownloadedLesson }) => {
    const progress = downloadProgress.get(item.activityId);

    return (
      <View className="bg-surface rounded-2xl p-5 mb-4 shadow-sm border border-border">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-foreground mb-1" numberOfLines={2}>
              {item.activityName}
            </Text>
            <Text className="text-sm text-muted" numberOfLines={1}>
              {item.courseName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.activityId, item.activityName)}
            className="p-2"
          >
            <MaterialIcons name="delete-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="storage" size={16} color={colors.muted} />
              <Text className="text-xs text-muted">{formatSize(item.size)}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="image" size={16} color={colors.muted} />
              <Text className="text-xs text-muted">{item.mediaFiles.length} files</Text>
            </View>
          </View>
          <Text className="text-xs text-muted">
            {new Date(item.downloadedAt).toLocaleDateString()}
          </Text>
        </View>

        {progress && progress.status === "downloading" && (
          <View className="mt-3">
            <View className="h-2 bg-border rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress.progress}%` }}
              />
            </View>
            <Text className="text-xs text-muted mt-1">Downloading... {progress.progress}%</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading downloads...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="p-6 pb-0">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="w-11 h-11 rounded-full bg-surface items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>

            {downloads.length > 0 && (
              <TouchableOpacity
                onPress={handleClearAll}
                activeOpacity={0.7}
                className="px-4 py-2 rounded-full bg-error/10"
              >
                <Text className="text-sm font-semibold text-error">Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-3xl font-bold text-foreground">Offline Downloads</Text>
          <View className="flex-row items-center gap-4 mt-3">
            <Text className="text-base text-muted">
              {downloads.length} {downloads.length === 1 ? "lesson" : "lessons"}
            </Text>
            {totalSize > 0 && (
              <>
                <Text className="text-muted">•</Text>
                <Text className="text-base text-muted">{formatSize(totalSize)} total</Text>
              </>
            )}
          </View>
        </View>

        {/* Downloads List */}
        {downloads.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <MaterialIcons name="cloud-download" size={64} color={colors.muted} />
            <Text className="text-xl font-semibold text-foreground mt-4 text-center">
              No Downloads Yet
            </Text>
            <Text className="text-base text-muted mt-2 text-center">
              Download lessons to access them offline
            </Text>
          </View>
        ) : (
          <FlatList
            data={downloads}
            renderItem={renderDownloadItem}
            keyExtractor={(item) => item.activityId}
            contentContainerStyle={{ padding: 24, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
