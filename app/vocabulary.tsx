import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { vocabularyService, type VocabularyWord } from "@/lib/vocabulary-service";
import { flashcardService } from "@/lib/flashcard-service";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function VocabularyScreen() {
  const router = useRouter();
  const colors = useColors();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [stats, setStats] = useState({ totalWords: 0, wordsWithFlashcards: 0, wordsByCourse: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    const allWords = await vocabularyService.getAllWords();
    setWords(allWords);
    const vocabularyStats = await vocabularyService.getStats();
    setStats(vocabularyStats);
    setLoading(false);
  };

  const handleCreateFlashcard = async (word: VocabularyWord) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await flashcardService.addFlashcard({
        courseId: word.courseId,
        front: word.word,
        back: word.translation || "",
        example: word.context,
      });

      await vocabularyService.markAsFlashcard(word.id);
      await loadVocabulary();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error creating flashcard:", error);
    }
  };

  const handleDelete = async (word: VocabularyWord) => {
    if (Platform.OS === "web") {
      if (!confirm(`Delete "${word.word}"?`)) return;
    } else {
      Alert.alert("Delete Word", `Are you sure you want to delete "${word.word}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await performDelete(word.id);
          },
        },
      ]);
      return;
    }
    await performDelete(word.id);
  };

  const performDelete = async (wordId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await vocabularyService.deleteWord(wordId);
    await loadVocabulary();
  };

  const renderWord = ({ item }: { item: VocabularyWord }) => (
    <View className="bg-surface rounded-2xl p-5 mb-4 shadow-sm border border-border">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "System" }}>
            {item.word}
          </Text>
          {item.translation && (
            <Text className="text-base text-muted mb-1">{item.translation}</Text>
          )}
          <Text className="text-sm text-muted" numberOfLines={1}>
            {item.activityName}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} className="p-2">
          <MaterialIcons name="delete-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {item.context && (
        <View className="bg-background rounded-lg p-3 mb-3">
          <Text className="text-sm text-muted italic">{item.context}</Text>
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted">
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        {item.hasFlashcard ? (
          <View className="flex-row items-center gap-1 px-3 py-1 rounded-full bg-success/10">
            <MaterialIcons name="check-circle" size={14} color={colors.success} />
            <Text className="text-xs font-medium text-success">Flashcard Created</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => handleCreateFlashcard(item)}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 px-3 py-2 rounded-full bg-primary"
          >
            <MaterialIcons name="add" size={16} color="#FFF" />
            <Text className="text-xs font-semibold text-white">Create Flashcard</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading vocabulary...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="p-6 pb-0">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-11 h-11 rounded-full bg-surface items-center justify-center mb-4"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-foreground">Vocabulary</Text>
          <View className="flex-row items-center gap-4 mt-3">
            <Text className="text-base text-muted">
              {stats.totalWords} {stats.totalWords === 1 ? "word" : "words"}
            </Text>
            {stats.wordsWithFlashcards > 0 && (
              <>
                <Text className="text-muted">•</Text>
                <Text className="text-base text-muted">
                  {stats.wordsWithFlashcards} with flashcards
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Words List */}
        {words.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <MaterialIcons name="translate" size={64} color={colors.muted} />
            <Text className="text-xl font-semibold text-foreground mt-4 text-center">
              No Vocabulary Yet
            </Text>
            <Text className="text-base text-muted mt-2 text-center">
              Arabic words from your lessons will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={words}
            renderItem={renderWord}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 24, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
