import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";

export interface DownloadProgressProps {
  progress: number; // 0-1
  totalSize?: number; // in bytes
  downloadedSize?: number; // in bytes
  isLoading: boolean;
  onCancel?: () => void;
}

export function DownloadProgress({
  progress,
  totalSize,
  downloadedSize,
  isLoading,
  onCancel,
}: DownloadProgressProps) {
  const colors = useColors();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const percentComplete = Math.round(progress * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="cloud-download" size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isLoading ? "Downloading..." : "Download Complete"}
          </Text>
          {totalSize && downloadedSize ? (
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {formatBytes(downloadedSize)} / {formatBytes(totalSize)}
            </Text>
          ) : null}
        </View>
        {onCancel && isLoading ? (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton} activeOpacity={0.7}>
            <MaterialIcons name="close" size={20} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${percentComplete}%` },
              ]}
            />
          </View>
          <Text style={[styles.percentText, { color: colors.muted }]}>{percentComplete}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  cancelButton: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  percentText: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
});
