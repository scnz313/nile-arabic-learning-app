import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { moodleAPI, type ActivityContent } from "@/lib/moodle-api";
import { storageService } from "@/lib/storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";

const MOD_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  page: { icon: "description", color: "#0C6478", label: "Page" },
  book: { icon: "menu-book", color: "#7C3AED", label: "Book" },
  videotime: { icon: "play-circle-filled", color: "#DC2626", label: "Video" },
  hvp: { icon: "extension", color: "#EA580C", label: "Interactive" },
  h5pactivity: { icon: "extension", color: "#EA580C", label: "Interactive" },
  quiz: { icon: "quiz", color: "#059669", label: "Quiz" },
  assign: { icon: "assignment", color: "#2563EB", label: "Assignment" },
  url: { icon: "link", color: "#6366F1", label: "Link" },
  forum: { icon: "forum", color: "#0891B2", label: "Forum" },
  attendance: { icon: "event-available", color: "#65A30D", label: "Attendance" },
  resource: { icon: "attach-file", color: "#9333EA", label: "Resource" },
  feedback: { icon: "rate-review", color: "#D97706", label: "Feedback" },
};

// HTML to structured text renderer — only renders text content
// Images, audio, and iframes are rendered separately by the parent component
function HtmlContentRenderer({ html, colors }: { html: string; colors: any }) {
  // Process HTML to extract only text content (images/audio/iframes handled by parent)
  const processHtml = (rawHtml: string) => {
    const elements: Array<{
      type: "text" | "heading" | "list-item";
      content: string;
    }> = [];

    // Convert HTML to text for text content — strip media elements
    let textContent = rawHtml
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
      .replace(/<audio[^>]*>.*?<\/audio>/gi, "")
      .replace(/<img[^>]*>/gi, "")
      .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, "\n##$2##\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/li>/gi, "")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<td[^>]*>/gi, " | ")
      .replace(/<th[^>]*>/gi, " | ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (textContent) {
      elements.push({ type: "text", content: textContent });
    }

    return elements;
  };

  const elements = processHtml(html);

  if (elements.length === 0) return null;

  return (
    <View style={[contentStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {elements.map((el, i) => {
        if (el.type === "text") {
          const parts = el.content.split("\n").filter(Boolean);
          return (
            <View key={`text-${i}`}>
              {parts.map((part, j) => {
                const headingMatch = part.match(/^##(.+)##$/);
                if (headingMatch) {
                  return (
                    <Text key={j} style={[contentStyles.heading, { color: colors.foreground }]}>
                      {headingMatch[1].trim()}
                    </Text>
                  );
                }
                if (part.startsWith("• ")) {
                  return (
                    <View key={j} style={contentStyles.listItem}>
                      <Text style={[contentStyles.bullet, { color: colors.primary }]}>•</Text>
                      <Text style={[contentStyles.listText, { color: colors.foreground }]}>{part.slice(2)}</Text>
                    </View>
                  );
                }
                if (part.startsWith(" | ")) {
                  return (
                    <View key={j} style={[contentStyles.tableRow, { borderColor: colors.border }]}>
                      <Text style={[contentStyles.tableText, { color: colors.foreground }]}>{part.replace(/\s*\|\s*/g, "  •  ").trim()}</Text>
                    </View>
                  );
                }
                return (
                  <Text key={j} style={[contentStyles.paragraph, { color: colors.foreground }]}>
                    {part.trim()}
                  </Text>
                );
              })}
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

export default function LessonScreen() {
  const params = useLocalSearchParams<{
    id: string;
    courseId: string;
    modType: string;
    url: string;
    name: string;
  }>();
  const router = useRouter();
  const colors = useColors();

  const activityId = params.id || "";
  const courseId = parseInt(params.courseId || "0", 10);
  const modType = params.modType || "page";
  const activityUrl = decodeURIComponent(params.url || "");
  const activityName = decodeURIComponent(params.name || "Activity");

  const [content, setContent] = useState<ActivityContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadContent();
    checkCompletion();
  }, [activityId]);

  const checkCompletion = async () => {
    const completed = await storageService.getCompletedActivities(courseId);
    setIsCompleted(completed.includes(activityId));
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      // Try cached content first for offline support
      const cached = await storageService.getCachedActivityContent(activityId);
      if (cached) {
        setContent(cached);
        setIsLoading(false);
        // Refresh in background
        try {
          const fresh = await moodleAPI.getActivityContent(activityUrl, modType);
          setContent(fresh);
          await storageService.cacheActivityContent(activityId, fresh);
        } catch (_) { /* use cached */ }
        return;
      }
      
      const data = await moodleAPI.getActivityContent(activityUrl, modType);
      setContent(data);
      // Cache for offline use
      await storageService.cacheActivityContent(activityId, data);
    } catch (err: any) {
      setError(err.message || "Failed to load content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    await storageService.markActivityComplete(courseId, activityId);
    setIsCompleted(true);
  };

  const handleOpenInBrowser = () => {
    if (activityUrl) Linking.openURL(activityUrl);
  };

  const proxyMedia = (url: string) => moodleAPI.getProxyMediaUrl(url);

  const modInfo = MOD_ICONS[modType] || { icon: "insert-drive-file", color: "#6B7280", label: modType };

  const renderContent = () => {
    if (!content) return null;

    switch (content.type) {
      case "page":
        return (
          <View>
            {/* Audio section */}
            {content.audioSources && content.audioSources.length > 0 && (
              <View style={styles.sectionBlock}>
                {content.audioSources.map((src, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => Linking.openURL(proxyMedia(src))}
                    activeOpacity={0.7}
                    style={[styles.mediaCard, { backgroundColor: "#DC2626" + "08", borderColor: "#DC2626" + "25" }]}
                  >
                    <View style={[styles.mediaIconCircle, { backgroundColor: "#DC2626" }]}>
                      <MaterialIcons name="headset" size={18} color="#FFF" />
                    </View>
                    <View style={styles.mediaInfo}>
                      <Text style={[styles.mediaTitle, { color: colors.foreground }]}>Audio Lesson</Text>
                      <Text style={[styles.mediaSubtitle, { color: colors.muted }]}>Tap to listen</Text>
                    </View>
                    <View style={[styles.playCircle, { backgroundColor: "#DC2626" }]}>
                      <MaterialIcons name="play-arrow" size={20} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Images */}
            {content.images && content.images.length > 0 && (
              <View style={styles.sectionBlock}>
                {content.images.map((img, i) => (
                  <View key={i} style={styles.imageContainer}>
                    <Image
                      source={{ uri: proxyMedia(img) }}
                      style={styles.contentImage}
                      contentFit="contain"
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Iframes (Google Slides, etc.) */}
            {content.iframes && content.iframes.length > 0 && (
              <View style={styles.sectionBlock}>
                {content.iframes.map((src, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => Linking.openURL(src)}
                    activeOpacity={0.7}
                    style={[styles.embedCard, { borderColor: colors.primary + "30" }]}
                  >
                    <View style={[styles.embedPreview, { backgroundColor: colors.primary + "08" }]}>
                      <MaterialIcons
                        name={src.includes("google.com/presentation") ? "slideshow" : src.includes("youtube") ? "smart-display" : "web"}
                        size={48}
                        color={colors.primary}
                      />
                      <Text style={[styles.embedLabel, { color: colors.foreground }]}>
                        {src.includes("google.com/presentation") ? "Presentation (Google Slides)" :
                         src.includes("youtube") ? "Video (YouTube)" :
                         "Embedded Content"}
                      </Text>
                      <View style={[styles.embedBtn, { backgroundColor: colors.primary }]}>
                        <MaterialIcons name="open-in-new" size={16} color="#FFF" />
                        <Text style={styles.embedBtnText}>Open</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* HTML Text Content */}
            {content.html ? (
              <HtmlContentRenderer html={content.html} colors={colors} />
            ) : null}
          </View>
        );

      case "book":
        return (
          <View>
            {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}
            {content.chapters && content.chapters.length > 0 && (
              <View style={[styles.chaptersCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.chaptersTitle, { color: colors.foreground }]}>
                  <MaterialIcons name="list" size={18} color={colors.primary} /> Chapters
                </Text>
                {content.chapters.map((ch, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => Linking.openURL(ch.url)}
                    activeOpacity={0.6}
                    style={[styles.chapterRow, { borderColor: colors.border }]}
                  >
                    <View style={[styles.chapterNum, { backgroundColor: colors.primary + "15" }]}>
                      <Text style={[styles.chapterNumText, { color: colors.primary }]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.chapterName, { color: colors.foreground }]} numberOfLines={2}>{ch.name}</Text>
                    <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );

      case "video":
        return (
          <View style={[styles.centeredCard, { backgroundColor: "#DC2626" + "08", borderColor: "#DC2626" + "25" }]}>
            <View style={[styles.videoIconBg, { backgroundColor: "#DC2626" + "15" }]}>
              <MaterialIcons name="play-circle-filled" size={64} color="#DC2626" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{content.title || activityName}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Video Lesson</Text>
            <TouchableOpacity
              onPress={() => {
                const url = content.videoUrl || content.iframeSrc || content.vimeoUrl || activityUrl;
                if (url) Linking.openURL(url);
              }}
              activeOpacity={0.7}
              style={[styles.actionBtn, { backgroundColor: "#DC2626" }]}
            >
              <MaterialIcons name="play-arrow" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Watch Video</Text>
            </TouchableOpacity>
          </View>
        );

      case "interactive":
        return (
          <View style={[styles.centeredCard, { backgroundColor: "#EA580C" + "08", borderColor: "#EA580C" + "25" }]}>
            <View style={[styles.videoIconBg, { backgroundColor: "#EA580C" + "15" }]}>
              <MaterialIcons name="extension" size={56} color="#EA580C" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{content.title || activityName}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Interactive H5P Activity</Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              Complete this interactive exercise to practice what you've learned
            </Text>
            <TouchableOpacity onPress={handleOpenInBrowser} activeOpacity={0.7} style={[styles.actionBtn, { backgroundColor: "#EA580C" }]}>
              <MaterialIcons name="open-in-new" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Open Activity</Text>
            </TouchableOpacity>
          </View>
        );

      case "quiz":
        return (
          <View style={[styles.centeredCard, { backgroundColor: "#059669" + "08", borderColor: "#059669" + "25" }]}>
            <View style={[styles.videoIconBg, { backgroundColor: "#059669" + "15" }]}>
              <MaterialIcons name="quiz" size={56} color="#059669" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{content.title || activityName}</Text>
            {content.description ? <Text style={[styles.cardDesc, { color: colors.muted }]}>{content.description}</Text> : null}
            <TouchableOpacity onPress={handleOpenInBrowser} activeOpacity={0.7} style={[styles.actionBtn, { backgroundColor: "#059669" }]}>
              <MaterialIcons name="open-in-new" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Take Quiz</Text>
            </TouchableOpacity>
          </View>
        );

      case "assignment":
        return (
          <View>
            {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}
            {content.status ? (
              <View style={[styles.statusCard, { backgroundColor: "#2563EB" + "08", borderColor: "#2563EB" + "25" }]}>
                <MaterialIcons name="assignment" size={20} color="#2563EB" />
                <Text style={[styles.statusText, { color: colors.foreground }]}>{content.status}</Text>
              </View>
            ) : null}
            <TouchableOpacity onPress={handleOpenInBrowser} activeOpacity={0.7} style={[styles.fullBtn, { backgroundColor: "#2563EB" }]}>
              <MaterialIcons name="open-in-new" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Submit Assignment</Text>
            </TouchableOpacity>
          </View>
        );

      case "url":
        return (
          <View style={[styles.centeredCard, { backgroundColor: "#6366F1" + "08", borderColor: "#6366F1" + "25" }]}>
            <View style={[styles.videoIconBg, { backgroundColor: "#6366F1" + "15" }]}>
              <MaterialIcons name="link" size={56} color="#6366F1" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{content.title || activityName}</Text>
            <TouchableOpacity
              onPress={() => { if (content.externalUrl) Linking.openURL(content.externalUrl); }}
              activeOpacity={0.7}
              style={[styles.actionBtn, { backgroundColor: "#6366F1" }]}
            >
              <MaterialIcons name="open-in-new" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Open Link</Text>
            </TouchableOpacity>
          </View>
        );

      case "forum":
        return (
          <View>
            {content.discussions && content.discussions.length > 0 ? (
              content.discussions.map((d, i) => (
                <View key={i} style={[styles.forumPost, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.forumSubject, { color: colors.foreground }]}>{d.subject}</Text>
                  <View style={styles.forumMeta}>
                    <MaterialIcons name="person" size={14} color={colors.primary} />
                    <Text style={[styles.forumAuthor, { color: colors.primary }]}>{d.author}</Text>
                    <Text style={[styles.forumDate, { color: colors.muted }]}>{d.date}</Text>
                  </View>
                  {d.content ? <Text style={[styles.forumBody, { color: colors.foreground }]}>{d.content}</Text> : null}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="forum" size={40} color={colors.muted} />
                <Text style={[styles.emptyLabel, { color: colors.muted }]}>No discussions yet</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleOpenInBrowser} activeOpacity={0.7} style={[styles.fullBtn, { backgroundColor: "#0891B2" }]}>
              <MaterialIcons name="open-in-new" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>View Forum</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <View>
            {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}
            <TouchableOpacity onPress={handleOpenInBrowser} activeOpacity={0.7} style={[styles.fullBtn, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="open-in-new" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Open in Browser</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.topBarTitle}>
            <Text style={[styles.topBarText, { color: colors.foreground }]} numberOfLines={1}>{activityName}</Text>
            <View style={styles.topBarMeta}>
              <View style={[styles.typeBadge, { backgroundColor: modInfo.color + "15" }]}>
                <MaterialIcons name={modInfo.icon as any} size={12} color={modInfo.color} />
                <Text style={[styles.typeBadgeText, { color: modInfo.color }]}>{modInfo.label}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleOpenInBrowser} activeOpacity={0.6} style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="open-in-new" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading content...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={loadContent} activeOpacity={0.7} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Title card */}
            <View style={[styles.titleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.titleIconCircle, { backgroundColor: modInfo.color + "15" }]}>
                <MaterialIcons name={modInfo.icon as any} size={24} color={modInfo.color} />
              </View>
              <View style={styles.titleInfo}>
                <Text style={[styles.titleText, { color: colors.foreground }]}>{content?.title || activityName}</Text>
                {content?.type === "page" && (
                  <Text style={[styles.lastModified, { color: colors.muted }]}>
                    Last modified: {new Date().toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>

            {/* Main content */}
            {renderContent()}

            {/* Completion button */}
            <View style={styles.completeSection}>
              {isCompleted ? (
                <View style={[styles.completedBanner, { backgroundColor: colors.success + "10", borderColor: colors.success + "25" }]}>
                  <MaterialIcons name="check-circle" size={22} color={colors.success} />
                  <Text style={[styles.completedLabel, { color: colors.success }]}>Completed</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleMarkComplete} activeOpacity={0.7} style={[styles.completeBtn, { backgroundColor: colors.success }]}>
                  <MaterialIcons name="check" size={20} color="#FFF" />
                  <Text style={styles.completeBtnText}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}

const contentStyles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12, borderWidth: 0.5, marginBottom: 16 },
  heading: { fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 8, writingDirection: "rtl", textAlign: "right" },
  paragraph: { fontSize: 15, lineHeight: 26, marginBottom: 8, writingDirection: "rtl", textAlign: "right" },
  listItem: { flexDirection: "row", gap: 8, marginBottom: 4, paddingRight: 4 },
  bullet: { fontSize: 16, fontWeight: "700", lineHeight: 26 },
  listText: { flex: 1, fontSize: 15, lineHeight: 26, writingDirection: "rtl", textAlign: "right" },
  tableRow: { paddingVertical: 6, borderBottomWidth: 0.5 },
  tableText: { fontSize: 14, lineHeight: 22 },
  imageWrap: { marginVertical: 12, borderRadius: 12, overflow: "hidden", alignItems: "center" },
  image: { height: 250, borderRadius: 12 },
  iframeCard: { marginVertical: 12, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  iframePreview: { alignItems: "center", padding: 24, gap: 12 },
  iframeLabel: { fontSize: 14, fontWeight: "600" },
  openBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  openBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  audioCard: { marginVertical: 8, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  audioInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  audioLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  topBarTitle: { flex: 1 },
  topBarText: { fontSize: 16, fontWeight: "600" },
  topBarMeta: { flexDirection: "row", marginTop: 4 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: "600" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { marginTop: 12, fontSize: 14, textAlign: "center" },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#FFF", fontWeight: "600" },
  titleCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 0.5, marginBottom: 16, gap: 14 },
  titleIconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  titleInfo: { flex: 1 },
  titleText: { fontSize: 17, fontWeight: "700", writingDirection: "rtl" },
  lastModified: { fontSize: 12, marginTop: 4 },
  sectionBlock: { marginBottom: 8 },
  mediaCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12 },
  mediaIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  mediaInfo: { flex: 1 },
  mediaTitle: { fontSize: 14, fontWeight: "600" },
  mediaSubtitle: { fontSize: 12, marginTop: 2 },
  playCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  imageContainer: { marginBottom: 12, borderRadius: 12, overflow: "hidden", alignItems: "center" },
  contentImage: { width: "100%", height: 600, borderRadius: 12 },
  embedCard: { marginBottom: 12, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  embedPreview: { alignItems: "center", padding: 28, gap: 12 },
  embedLabel: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  embedBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  embedBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  centeredCard: { alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 12 },
  videoIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  cardSubtitle: { fontSize: 13, textAlign: "center" },
  cardDesc: { fontSize: 13, textAlign: "center", paddingHorizontal: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  actionBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  statusText: { flex: 1, fontSize: 13 },
  fullBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
  chaptersCard: { padding: 16, borderRadius: 14, borderWidth: 0.5, marginBottom: 16 },
  chaptersTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  chapterRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  chapterNum: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  chapterNumText: { fontSize: 13, fontWeight: "700" },
  chapterName: { flex: 1, fontSize: 14, lineHeight: 20 },
  forumPost: { padding: 16, borderRadius: 12, borderWidth: 0.5, marginBottom: 12 },
  forumSubject: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  forumMeta: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "center" },
  forumAuthor: { fontSize: 12, fontWeight: "500" },
  forumDate: { fontSize: 12 },
  forumBody: { fontSize: 14, lineHeight: 20 },
  emptyState: { alignItems: "center", padding: 32, gap: 8 },
  emptyLabel: { fontSize: 14 },
  completeSection: { marginTop: 16 },
  completedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  completedLabel: { fontSize: 15, fontWeight: "600" },
  completeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  completeBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
});
