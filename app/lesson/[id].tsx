import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
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
import WebView from "react-native-webview";
import { VideoView, useVideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { TextInput } from "react-native";
import { bookmarksService } from "@/lib/bookmarks-service";
import { notesService, type Note } from "@/lib/notes-service";
import { progressService } from "@/lib/progress-service";
import { settingsService } from "@/lib/settings-service";
import { downloadManager } from "@/lib/download-manager";
import { vocabularyService, type VocabularyWord } from "@/lib/vocabulary-service";
import { prefetchService } from "@/lib/prefetch-service";
import { webViewCacheService } from "@/lib/webview-cache-service";
import { DownloadProgress } from "@/components/download-progress";

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

// ─── In-App Audio Player Component ───
function AudioPlayerCard({ src, colors, proxyMedia }: { src: string; colors: any; proxyMedia: (u: string) => string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const togglePlay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      if (!audioRef) {
        const audio = new Audio(proxyMedia(src));
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        setAudioRef(audio);
        audio.play();
        setIsPlaying(true);
      } else if (isPlaying) {
        audioRef.pause();
        setIsPlaying(false);
      } else {
        audioRef.play();
        setIsPlaying(true);
      }
    }
  }, [audioRef, isPlaying, src]);

  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = "";
      }
    };
  }, [audioRef]);

  return (
    <TouchableOpacity
      onPress={togglePlay}
      activeOpacity={0.7}
      style={[styles.audioCard, { backgroundColor: "#DC262608", borderColor: "#DC262625" }]}
    >
      <View style={[styles.audioIconCircle, { backgroundColor: "#DC2626" }]}>
        <MaterialIcons name="headset" size={18} color="#FFF" />
      </View>
      <View style={styles.audioInfo}>
        <Text style={[styles.audioTitle, { color: colors.foreground }]}>
          {isPlaying ? "Playing..." : "Audio Lesson"}
        </Text>
        <Text style={[styles.audioSubtitle, { color: colors.muted }]}>
          {isPlaying ? "Tap to pause" : "Tap to play"}
        </Text>
      </View>
      <View style={[styles.audioPlayBtn, { backgroundColor: isPlaying ? "#991B1B" : "#DC2626" }]}>
        <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={22} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
}

// ─── In-App Iframe Renderer (Google Slides, H5P, etc.) ───
function InAppIframe({ src, colors }: { src: string; colors: any }) {
  const { width } = useWindowDimensions();
  const iframeWidth = width - 32;
  const iframeHeight = Math.round(iframeWidth * 0.6);

  const label = src.includes("google.com/presentation")
    ? "Google Slides Presentation"
    : src.includes("youtube")
    ? "YouTube Video"
    : src.includes("h5p")
    ? "Interactive Activity"
    : "Embedded Content";

  const icon = src.includes("google.com/presentation")
    ? "slideshow"
    : src.includes("youtube")
    ? "smart-display"
    : "web";

  if (Platform.OS === "web") {
    return (
      <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
        <View style={styles.iframeHeader}>
          <MaterialIcons name={icon as any} size={18} color={colors.primary} />
          <Text style={[styles.iframeLabel, { color: colors.foreground }]}>{label}</Text>
        </View>
        <View style={{ width: iframeWidth, height: iframeHeight, overflow: "hidden", borderRadius: 8 }}>
          <iframe
            src={src}
            width={iframeWidth}
            height={iframeHeight}
            style={{ border: "none", borderRadius: 8 }}
            allowFullScreen
          />
        </View>
      </View>
    );
  }

  // Native: display in-app with WebView
  return (
    <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
      <View style={styles.iframeHeader}>
        <MaterialIcons name={icon as any} size={18} color={colors.primary} />
        <Text style={[styles.iframeLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <View style={{ width: iframeWidth, height: iframeHeight, overflow: "hidden", borderRadius: 8 }}>
        <WebView
          source={{ uri: src }}
          style={{ width: iframeWidth, height: iframeHeight }}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </View>
  );
}

// ─── HTML to Native Text Renderer ───
function HtmlContentRenderer({ html, colors }: { html: string; colors: any }) {
  const processHtml = (rawHtml: string) => {
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

    return textContent;
  };

  const textContent = processHtml(html);
  if (!textContent) return null;

  const parts = textContent.split("\n").filter(Boolean);

  return (
    <View style={[styles.htmlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {parts.map((part, j) => {
        const headingMatch = part.match(/^##(.+)##$/);
        if (headingMatch) {
          return (
            <Text key={j} style={[styles.htmlHeading, { color: colors.foreground }]}>
              {headingMatch[1].trim()}
            </Text>
          );
        }
        if (part.startsWith("• ")) {
          return (
            <View key={j} style={styles.htmlListItem}>
              <Text style={[styles.htmlBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.htmlListText, { color: colors.foreground }]}>{part.slice(2)}</Text>
            </View>
          );
        }
        if (part.startsWith(" | ")) {
          return (
            <View key={j} style={[styles.htmlTableRow, { borderColor: colors.border }]}>
              <Text style={[styles.htmlTableText, { color: colors.foreground }]}>{part.replace(/\s*\|\s*/g, "  •  ").trim()}</Text>
            </View>
          );
        }
        return (
          <Text key={j} style={[styles.htmlParagraph, { color: colors.foreground }]}>
            {part.trim()}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Main Lesson Screen ───
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
  const { width } = useWindowDimensions();

  const activityId = params.id || "";
  const courseId = parseInt(params.courseId || "0", 10);
  const modType = params.modType || "page";
  const activityUrl = decodeURIComponent(params.url || "");
  const activityName = decodeURIComponent(params.name || "Activity");

  const [content, setContent] = useState<ActivityContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyWord[]>([]);
  const [isExtractingVocab, setIsExtractingVocab] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);

  useEffect(() => {
    loadContent();
    checkCompletion();
    checkBookmark();
    loadNotes();
    checkDownload();
    loadVocabulary();
  }, [activityId]);

  const loadVocabulary = async () => {
    const words = await vocabularyService.getWordsForLesson(courseId, parseInt(activityId));
    setVocabularyWords(words);
  };

  const checkDownload = async () => {
    const downloaded = await downloadManager.isDownloaded(activityId);
    setIsDownloaded(downloaded);
  };

  const checkBookmark = async () => {
    const bookmarked = await bookmarksService.isBookmarked(courseId, parseInt(activityId));
    setIsBookmarked(bookmarked);
  };

  const loadNotes = async () => {
    const activityNotes = await notesService.getNotes(courseId, parseInt(activityId));
    setNotes(activityNotes);
  };

  const toggleBookmark = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isBookmarked) {
      await bookmarksService.removeBookmark(courseId, parseInt(activityId));
      setIsBookmarked(false);
    } else {
      await bookmarksService.addBookmark({
        courseId,
        activityId: parseInt(activityId),
        activityName,
        courseName: `Course ${courseId}`,
      });
      setIsBookmarked(true);
    }
  };

  const handleAddNote = async () => {
    if (newNote.trim()) {
      await notesService.addNote(courseId, parseInt(activityId), newNote.trim());
      setNewNote("");
      await loadNotes();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await notesService.deleteNote(noteId);
    await loadNotes();
  };

  const handleDownload = async () => {
    if (isDownloaded || isDownloading || !content) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsDownloading(true);
    try {
      await downloadManager.downloadLesson(
        activityId,
        courseId,
        activityName,
        `Course ${courseId}`,
        content
      );
      setIsDownloaded(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Download error:", error);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteDownload = async () => {
    if (!isDownloaded) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await downloadManager.deleteDownload(activityId);
      setIsDownloaded(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Delete download error:", error);
    }
  };

  const handleExtractVocabulary = async () => {
    if (!content || isExtractingVocab) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsExtractingVocab(true);
    try {
      const htmlContent = content.html || "";
      const extracted = await vocabularyService.extractAndSaveFromLesson(
        htmlContent,
        courseId,
        parseInt(activityId),
        activityName
      );
      
      await loadVocabulary();
      setShowVocabulary(true);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Vocabulary extraction error:", error);
    } finally {
      setIsExtractingVocab(false);
    }
  };

  const checkCompletion = async () => {
    const completed = await storageService.getCompletedActivities(courseId);
    setIsCompleted(completed.includes(activityId));
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Try cached content first
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
      await storageService.cacheActivityContent(activityId, data);
    } catch (err: any) {
      setError(err.message || "Failed to load content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    await storageService.markActivityComplete(courseId, activityId);
    await progressService.updateCourseProgress(courseId, parseInt(activityId), 100);
    setIsCompleted(true);
    
    // Prefetch next lesson in background
    prefetchService.prefetchNextLesson(courseId.toString(), activityId).catch(console.error);
  };

  const proxyMedia = (url: string) => moodleAPI.getProxyMediaUrl(url);
  const modInfo = MOD_ICONS[modType] || { icon: "insert-drive-file", color: "#6B7280", label: modType };

  // ─── Content Renderers ───

  const renderPageContent = () => {
    if (!content) return null;
    return (
      <View>
        {/* Audio Players */}
        {content.audioSources && content.audioSources.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Audio</Text>
            {content.audioSources.map((src, i) => (
              <AudioPlayerCard key={i} src={src} colors={colors} proxyMedia={proxyMedia} />
            ))}
          </View>
        )}

        {/* Images - Full Width */}
        {content.images && content.images.length > 0 && (
          <View style={styles.sectionBlock}>
            {content.images.map((img, i) => (
              <View key={i} style={styles.imageWrap}>
                <Image
                  source={{ uri: proxyMedia(img) }}
                  style={[styles.contentImage, { width: width - 32 }]}
                  contentFit="contain"
                  placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
                  transition={200}
                />
              </View>
            ))}
          </View>
        )}

        {/* Embedded Content (Google Slides, etc.) */}
        {content.iframes && content.iframes.length > 0 && (
          <View style={styles.sectionBlock}>
            {content.iframes.map((src, i) => (
              <InAppIframe key={i} src={src} colors={colors} />
            ))}
          </View>
        )}

        {/* Text Content */}
        {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}
      </View>
    );
  };

  const renderBookContent = () => {
    if (!content) return null;
    return (
      <View>
        {/* Chapter Navigation */}
        {content.chapters && content.chapters.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              Chapters ({content.chapters.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chapterScroll}>
              {content.chapters.map((ch, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelectedChapter(i)}
                  activeOpacity={0.7}
                  style={[
                    styles.chapterTab,
                    {
                      backgroundColor: selectedChapter === i ? colors.primary : colors.surface,
                      borderColor: selectedChapter === i ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chapterTabText,
                      { color: selectedChapter === i ? "#FFF" : colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {i + 1}. {ch.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Selected Chapter Content */}
            <View style={[styles.chapterContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.chapterTitle, { color: colors.primary }]}>
                {content.chapters[selectedChapter]?.name}
              </Text>
              {content.chapters[selectedChapter]?.content ? (
                <HtmlContentRenderer html={content.chapters[selectedChapter].content} colors={colors} />
              ) : null}
            </View>
          </View>
        )}

        {/* Main HTML content */}
        {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}
      </View>
    );
  };

  const renderVideoContent = () => {
    if (!content) return null;
    const videoUrl = content.videoUrl || content.iframeSrc || content.vimeoUrl;

    return (
      <View>
        {videoUrl ? (
          <View style={styles.sectionBlock}>
            {Platform.OS === "web" && (content.iframeSrc || content.vimeoUrl) ? (
              <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
                <View style={styles.iframeHeader}>
                  <MaterialIcons name="play-circle-filled" size={18} color="#DC2626" />
                  <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Video Lesson</Text>
                </View>
                <View style={{ width: width - 32, height: Math.round((width - 32) * 0.56), overflow: "hidden", borderRadius: 8 }}>
                  <iframe
                    src={content.iframeSrc || content.vimeoUrl || ""}
                    width={width - 32}
                    height={Math.round((width - 32) * 0.56)}
                    style={{ border: "none", borderRadius: 8 }}
                    allowFullScreen
                    allow="autoplay; fullscreen; picture-in-picture"
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.videoPlayerContainer, { borderColor: colors.border }]}>
                <VideoView
                  style={styles.videoPlayer}
                  player={useVideoPlayer(videoUrl, (player) => {
                    player.loop = false;
                  })}
                  allowsFullscreen
                  allowsPictureInPicture
                  contentFit="contain"
                />
                <View style={styles.videoInfo}>
                  <MaterialIcons name="play-circle-filled" size={18} color="#DC2626" />
                  <Text style={[styles.videoInfoText, { color: colors.foreground }]}>
                    {content.title || activityName}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : null}

        {/* Description */}
        {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}
      </View>
    );
  };

  const renderInteractiveContent = () => {
    if (!content) return null;
    const interactiveUrl = activityUrl;

    return (
      <View>
        {Platform.OS === "web" ? (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="extension" size={18} color="#EA580C" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Interactive Activity</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.75), overflow: "hidden", borderRadius: 8 }}>
              <iframe
                src={interactiveUrl}
                width={width - 32}
                height={Math.round((width - 32) * 0.75)}
                style={{ border: "none", borderRadius: 8 }}
                allowFullScreen
              />
            </View>
          </View>
        ) : (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="extension" size={18} color="#EA580C" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Interactive Activity</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.75), overflow: "hidden", borderRadius: 8 }}>
              <WebView
                source={{ uri: interactiveUrl }}
                style={{ width: width - 32, height: Math.round((width - 32) * 0.75) }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          </View>
        )}

        {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}
      </View>
    );
  };

  const renderQuizContent = () => {
    if (!content) return null;

    return (
      <View>
        {/* Quiz Info Card */}
        <View style={[styles.quizCard, { backgroundColor: "#05966908", borderColor: "#05966925" }]}>
          <View style={[styles.quizIconBg, { backgroundColor: "#05966915" }]}>
            <MaterialIcons name="quiz" size={48} color="#059669" />
          </View>
          <Text style={[styles.videoTitle, { color: colors.foreground }]}>
            {content.title || activityName}
          </Text>
          {content.description ? (
            <Text style={[styles.quizDesc, { color: colors.muted }]}>{content.description}</Text>
          ) : null}
          {content.attempts !== undefined && (
            <View style={[styles.quizMeta, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="history" size={16} color={colors.primary} />
              <Text style={[styles.quizMetaText, { color: colors.foreground }]}>
                {content.attempts} attempt(s)
              </Text>
            </View>
          )}
        </View>

        {/* Take Quiz In-App */}
        {Platform.OS === "web" ? (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="quiz" size={18} color="#059669" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Quiz</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.8), overflow: "hidden", borderRadius: 8 }}>
              <iframe
                src={activityUrl}
                width={width - 32}
                height={Math.round((width - 32) * 0.8)}
                style={{ border: "none", borderRadius: 8 }}
                allowFullScreen
              />
            </View>
          </View>
        ) : (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="quiz" size={18} color="#059669" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Quiz</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.8), overflow: "hidden", borderRadius: 8 }}>
              <WebView
                source={{ uri: activityUrl }}
                style={{ width: width - 32, height: Math.round((width - 32) * 0.8) }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderAssignmentContent = () => {
    if (!content) return null;

    return (
      <View>
        {/* Assignment Instructions */}
        {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}

        {/* Status */}
        {content.status ? (
          <View style={[styles.statusCard, { backgroundColor: "#2563EB08", borderColor: "#2563EB25" }]}>
            <MaterialIcons name="assignment" size={20} color="#2563EB" />
            <Text style={[styles.statusText, { color: colors.foreground }]}>{content.status}</Text>
          </View>
        ) : null}

        {/* Due Date */}
        {content.dueDate ? (
          <View style={[styles.statusCard, { backgroundColor: "#D9770608", borderColor: "#D9770625" }]}>
            <MaterialIcons name="event" size={20} color="#D97706" />
            <Text style={[styles.statusText, { color: colors.foreground }]}>Due: {content.dueDate}</Text>
          </View>
        ) : null}

        {/* Submit In-App */}
        {Platform.OS === "web" ? (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="assignment" size={18} color="#2563EB" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Assignment Submission</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.7), overflow: "hidden", borderRadius: 8 }}>
              <iframe
                src={activityUrl}
                width={width - 32}
                height={Math.round((width - 32) * 0.7)}
                style={{ border: "none", borderRadius: 8 }}
                allowFullScreen
              />
            </View>
          </View>
        ) : (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="assignment" size={18} color="#2563EB" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Assignment Submission</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.7), overflow: "hidden", borderRadius: 8 }}>
              <WebView
                source={{ uri: activityUrl }}
                style={{ width: width - 32, height: Math.round((width - 32) * 0.7) }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderUrlContent = () => {
    if (!content) return null;
    const linkUrl = content.externalUrl || activityUrl;

    return (
      <View>
        {Platform.OS === "web" ? (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="link" size={18} color="#6366F1" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>External Resource</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.7), overflow: "hidden", borderRadius: 8 }}>
              <iframe
                src={linkUrl}
                width={width - 32}
                height={Math.round((width - 32) * 0.7)}
                style={{ border: "none", borderRadius: 8 }}
                allowFullScreen
              />
            </View>
          </View>
        ) : (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="link" size={18} color="#6366F1" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>External Resource</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.7), overflow: "hidden", borderRadius: 8 }}>
              <WebView
                source={{ uri: linkUrl }}
                style={{ width: width - 32, height: Math.round((width - 32) * 0.7) }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderForumContent = () => {
    if (!content) return null;

    return (
      <View>
        {content.discussions && content.discussions.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              Discussions ({content.discussions.length})
            </Text>
            {content.discussions.map((d, i) => (
              <View key={i} style={[styles.forumPost, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.forumSubject, { color: colors.foreground }]}>{d.subject}</Text>
                <View style={styles.forumMeta}>
                  <MaterialIcons name="person" size={14} color={colors.primary} />
                  <Text style={[styles.forumAuthor, { color: colors.primary }]}>{d.author}</Text>
                  <Text style={[styles.forumDate, { color: colors.muted }]}>{d.date}</Text>
                </View>
                {d.content ? (
                  <Text style={[styles.forumBody, { color: colors.foreground }]}>{d.content}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="forum" size={40} color={colors.muted} />
            <Text style={[styles.emptyLabel, { color: colors.muted }]}>No discussions yet</Text>
          </View>
        )}

        {/* Embed forum in-app */}
        {Platform.OS === "web" ? (
          <View style={[styles.iframeContainer, { borderColor: colors.border, marginTop: 12 }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="forum" size={18} color="#0891B2" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Forum</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.6), overflow: "hidden", borderRadius: 8 }}>
              <iframe
                src={activityUrl}
                width={width - 32}
                height={Math.round((width - 32) * 0.6)}
                style={{ border: "none", borderRadius: 8 }}
                allowFullScreen
              />
            </View>
          </View>
        ) : (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={styles.iframeHeader}>
              <MaterialIcons name="forum" size={18} color="#0891B2" />
              <Text style={[styles.iframeLabel, { color: colors.foreground }]}>Forum</Text>
            </View>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.6), overflow: "hidden", borderRadius: 8 }}>
              <WebView
                source={{ uri: activityUrl }}
                style={{ width: width - 32, height: Math.round((width - 32) * 0.6) }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderGenericContent = () => {
    if (!content) return null;

    return (
      <View>
        {content.html ? <HtmlContentRenderer html={content.html} colors={colors} /> : null}

        {/* Embed in-app */}
        {Platform.OS === "web" ? (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.6), overflow: "hidden", borderRadius: 8 }}>
              <iframe
                src={activityUrl}
                width={width - 32}
                height={Math.round((width - 32) * 0.6)}
                style={{ border: "none", borderRadius: 8 }}
                allowFullScreen
              />
            </View>
          </View>
        ) : (
          <View style={[styles.iframeContainer, { borderColor: colors.border }]}>
            <View style={{ width: width - 32, height: Math.round((width - 32) * 0.6), overflow: "hidden", borderRadius: 8 }}>
              <WebView
                source={{ uri: activityUrl }}
                style={{ width: width - 32, height: Math.round((width - 32) * 0.6) }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (!content) return null;

    switch (content.type) {
      case "page": return renderPageContent();
      case "book": return renderBookContent();
      case "video": return renderVideoContent();
      case "interactive": return renderInteractiveContent();
      case "quiz": return renderQuizContent();
      case "assignment": return renderAssignmentContent();
      case "url": return renderUrlContent();
      case "forum": return renderForumContent();
      default: return renderGenericContent();
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.7}
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.topBarTitle}>
            <Text style={[styles.topBarText, { color: colors.foreground }]} numberOfLines={1}>
              {activityName}
            </Text>
            <View style={styles.topBarMeta}>
              <View style={[styles.typeBadge, { backgroundColor: modInfo.color + "15" }]}>
                <MaterialIcons name={modInfo.icon as any} size={12} color={modInfo.color} />
                <Text style={[styles.typeBadgeText, { color: modInfo.color }]}>{modInfo.label}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={toggleBookmark}
              activeOpacity={0.7}
              style={[styles.iconBtn, { backgroundColor: colors.surface }]}
            >
              <MaterialIcons name={isBookmarked ? "bookmark" : "bookmark-border"} size={24} color={isBookmarked ? colors.primary : colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={isDownloaded ? handleDeleteDownload : handleDownload}
              activeOpacity={0.7}
              disabled={isDownloading}
              style={[styles.iconBtn, { backgroundColor: isDownloaded ? colors.success + "15" : colors.surface }]}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons
                  name={isDownloaded ? "cloud-done" : "cloud-download"}
                  size={24}
                  color={isDownloaded ? colors.success : colors.foreground}
                />
              )}
            </TouchableOpacity>
          </View>
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
            <TouchableOpacity
              onPress={loadContent}
              activeOpacity={0.7}
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            >
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
                <Text style={[styles.titleText, { color: colors.foreground }]}>
                  {content?.title || activityName}
                </Text>
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
                <TouchableOpacity
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    handleMarkComplete();
                  }}
                  activeOpacity={0.7}
                  style={[styles.completeBtn, { backgroundColor: colors.success }]}
                >
                  <MaterialIcons name="check" size={20} color="#FFF" />
                  <Text style={styles.completeBtnText}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Vocabulary Extraction */}
            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity
                onPress={handleExtractVocabulary}
                disabled={isExtractingVocab}
                activeOpacity={0.7}
                style={[styles.vocabBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
              >
                {isExtractingVocab ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="translate" size={20} color={colors.primary} />
                )}
                <Text style={[styles.vocabBtnText, { color: colors.primary }]}>
                  {vocabularyWords.length > 0 ? `View Vocabulary (${vocabularyWords.length})` : "Extract Vocabulary"}
                </Text>
              </TouchableOpacity>

              {vocabularyWords.length > 0 && showVocabulary && (
                <View style={[styles.vocabList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.vocabListHeader}>
                    <Text style={[styles.vocabListTitle, { color: colors.foreground }]}>Arabic Words</Text>
                    <TouchableOpacity onPress={() => setShowVocabulary(false)}>
                      <MaterialIcons name="close" size={20} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                  {vocabularyWords.slice(0, 10).map((word) => (
                    <View key={word.id} style={[styles.vocabWordCard, { borderColor: colors.border }]}>
                      <Text style={[styles.vocabWord, { color: colors.foreground }]}>{word.word}</Text>
                      {word.hasFlashcard && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MaterialIcons name="check-circle" size={14} color={colors.success} />
                          <Text style={[styles.vocabStatus, { color: colors.success }]}>Flashcard</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {vocabularyWords.length > 10 && (
                    <TouchableOpacity
                      onPress={() => router.push("/vocabulary" as any)}
                      style={styles.viewAllBtn}
                    >
                      <Text style={[styles.viewAllText, { color: colors.primary }]}>
                        View All {vocabularyWords.length} Words →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Notes Section */}
            <View style={[styles.notesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setShowNotes(!showNotes)}
                activeOpacity={0.7}
                style={styles.notesHeader}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="notes" size={20} color={colors.primary} />
                  <Text style={[styles.notesTitle, { color: colors.foreground }]}>Notes ({notes.length})</Text>
                </View>
                <MaterialIcons name={showNotes ? "expand-less" : "expand-more"} size={24} color={colors.muted} />
              </TouchableOpacity>

              {showNotes && (
                <View style={styles.notesContent}>
                  {/* Add Note Input */}
                  <View style={styles.addNoteContainer}>
                    <TextInput
                      value={newNote}
                      onChangeText={setNewNote}
                      placeholder="Add a note..."
                      placeholderTextColor={colors.muted}
                      multiline
                      style={[styles.noteInput, { color: colors.foreground, borderColor: colors.border }]}
                    />
                    <TouchableOpacity
                      onPress={handleAddNote}
                      disabled={!newNote.trim()}
                      activeOpacity={0.7}
                      style={[styles.addNoteBtn, { backgroundColor: newNote.trim() ? colors.primary : colors.border }]}
                    >
                      <MaterialIcons name="add" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Notes List */}
                  {notes.length === 0 ? (
                    <Text style={[styles.emptyNotes, { color: colors.muted }]}>No notes yet</Text>
                  ) : (
                    <View style={styles.notesList}>
                      {notes.map((note) => (
                        <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <Text style={[styles.noteContent, { color: colors.foreground }]}>{note.content}</Text>
                          <View style={styles.noteFooter}>
                            <Text style={[styles.noteDate, { color: colors.muted }]}>
                              {new Date(note.timestamp).toLocaleDateString()}
                            </Text>
                            <TouchableOpacity onPress={() => handleDeleteNote(note.id)} activeOpacity={0.7}>
                              <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  topBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 0.5, 
    gap: 12,
  },
  iconBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: "center", 
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topBarTitle: { flex: 1 },
  topBarText: { fontSize: 17, fontWeight: "700" },
  topBarMeta: { flexDirection: "row", marginTop: 4 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: "600" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { marginTop: 12, fontSize: 14, textAlign: "center" },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#FFF", fontWeight: "600" },

  // Title card
  titleCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 20, 
    borderRadius: 20, 
    borderWidth: 0.5, 
    marginBottom: 20, 
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  titleIconCircle: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  titleInfo: { flex: 1 },
  titleText: { fontSize: 19, fontWeight: "800", writingDirection: "rtl", lineHeight: 26 },

  // Section blocks
  sectionBlock: { marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  // Audio card
  audioCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12 },
  audioIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  audioInfo: { flex: 1 },
  audioTitle: { fontSize: 14, fontWeight: "600" },
  audioSubtitle: { fontSize: 12, marginTop: 2 },
  audioPlayBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  // Images
  imageWrap: { marginBottom: 16, borderRadius: 12, overflow: "hidden", alignItems: "center", backgroundColor: "#F3F4F6" },
  contentImage: { minHeight: 200, maxHeight: 800, borderRadius: 12 },

  // Iframe container
  iframeContainer: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  iframeHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  iframeLabel: { fontSize: 14, fontWeight: "600" },
  iframePlaceholder: { alignItems: "center", padding: 32, gap: 12 },
  iframeOpenBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  iframeOpenBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  // Video card
  videoCard: { alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 12 },
  videoIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  videoTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  videoSubtitle: { fontSize: 13, textAlign: "center" },

  // Interactive card
  interactiveCard: { alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 12 },

  // In-app action button (replaces "Open in Browser")
  inAppBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  inAppBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },

  // Video player (in-app)
  videoPlayerContainer: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  videoPlayer: { width: "100%", height: 240 },
  videoInfo: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#F9FAFB" },
  videoInfoText: { fontSize: 14, fontWeight: "500", flex: 1 },

  // Quiz
  quizCard: { alignItems: "center", padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 10 },
  quizIconBg: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  quizDesc: { fontSize: 13, textAlign: "center", paddingHorizontal: 16 },
  quizMeta: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  quizMetaText: { fontSize: 13 },

  // URL card
  urlCard: { alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 12 },

  // Status card
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  statusText: { flex: 1, fontSize: 13 },

  // Forum
  forumPost: { padding: 16, borderRadius: 12, borderWidth: 0.5, marginBottom: 12 },
  forumSubject: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  forumMeta: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "center" },
  forumAuthor: { fontSize: 12, fontWeight: "500" },
  forumDate: { fontSize: 12 },
  forumBody: { fontSize: 14, lineHeight: 20 },
  emptyState: { alignItems: "center", padding: 32, gap: 8 },
  emptyLabel: { fontSize: 14 },

  // Chapters
  chapterScroll: { marginBottom: 12 },
  chapterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chapterTabText: { fontSize: 13, fontWeight: "500" },
  chapterContent: { padding: 16, borderRadius: 14, borderWidth: 0.5 },
  chapterTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, writingDirection: "rtl", textAlign: "right" },

  // HTML content
  htmlCard: { 
    padding: 20, 
    borderRadius: 16, 
    borderWidth: 0.5, 
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  htmlHeading: { fontSize: 20, fontWeight: "800", marginTop: 16, marginBottom: 12, writingDirection: "rtl", textAlign: "right", lineHeight: 28 },
  htmlParagraph: { fontSize: 16, lineHeight: 28, marginBottom: 12, writingDirection: "rtl", textAlign: "right" },
  htmlListItem: { flexDirection: "row", gap: 8, marginBottom: 4, paddingRight: 4 },
  htmlBullet: { fontSize: 16, fontWeight: "700", lineHeight: 26 },
  htmlListText: { flex: 1, fontSize: 15, lineHeight: 26, writingDirection: "rtl", textAlign: "right" },
  htmlTableRow: { paddingVertical: 6, borderBottomWidth: 0.5 },
  htmlTableText: { fontSize: 14, lineHeight: 22 },

  // Completion
  completeSection: { marginTop: 16 },
  completedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  completedLabel: { fontSize: 15, fontWeight: "600" },
  completeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  completeBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },

  // Notes
  notesSection: { marginTop: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  notesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  notesTitle: { fontSize: 16, fontWeight: "600" },
  notesContent: { paddingHorizontal: 16, paddingBottom: 16 },
  addNoteContainer: { flexDirection: "row", gap: 8, marginBottom: 12 },
  noteInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: "top" },
  addNoteBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyNotes: { textAlign: "center", padding: 20, fontSize: 14 },
  notesList: { gap: 8 },
  noteCard: { padding: 12, borderRadius: 10, borderWidth: 1 },
  noteContent: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  noteFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  noteDate: { fontSize: 12 },

  // Vocabulary
  vocabBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  vocabBtnText: { fontSize: 15, fontWeight: "600" },
  vocabList: { marginTop: 12, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  vocabListHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1 },
  vocabListTitle: { fontSize: 14, fontWeight: "600" },
  vocabWordCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 0.5 },
  vocabWord: { fontSize: 18, fontWeight: "600", fontFamily: "System" },
  vocabStatus: { fontSize: 12, fontWeight: "500" },
  viewAllBtn: { padding: 12, alignItems: "center" },
  viewAllText: { fontSize: 14, fontWeight: "600" },
});
