import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { flashcardService, type Flashcard } from "@/lib/flashcard-service";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function FlashcardsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  const [showingAnswer, setShowingAnswer] = useState(false);

  useEffect(() => {
    loadFlashcards();
  }, []);

  const loadFlashcards = async () => {
    const cards = await flashcardService.getDueFlashcards();
    setFlashcards(cards);
    setLoading(false);
  };

  const flipCard = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setIsFlipped(!isFlipped);
    setShowingAnswer(!showingAnswer);
  };

  const handleResponse = async (quality: number) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        quality >= 3
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    }

    const currentCard = flashcards[currentIndex];
    await flashcardService.updateFlashcardProgress(currentCard.id, quality);

    // Move to next card
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowingAnswer(false);
      flipAnim.setValue(0);
    } else {
      // Finished all cards
      await loadFlashcards();
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowingAnswer(false);
      flipAnim.setValue(0);
    }
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading flashcards...</Text>
      </ScreenContainer>
    );
  }

  if (flashcards.length === 0) {
    return (
      <ScreenContainer>
        <View className="p-6">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-11 h-11 rounded-full bg-surface items-center justify-center mb-6"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>

          <View className="flex-1 items-center justify-center">
            <MaterialIcons name="check-circle" size={64} color={colors.success} />
            <Text className="text-2xl font-bold text-foreground mt-6 text-center">
              All Caught Up!
            </Text>
            <Text className="text-base text-muted mt-3 text-center">
              No flashcards due for review right now.
              {"\n"}Come back later to practice more.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="bg-primary px-8 py-4 rounded-full mt-8"
            >
              <Text className="text-white font-semibold text-base">Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <ScreenContainer>
      <View className="flex-1 p-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-11 h-11 rounded-full bg-surface items-center justify-center"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-foreground">
              {currentIndex + 1} / {flashcards.length}
            </Text>
          </View>

          <View className="w-11" />
        </View>

        {/* Progress Bar */}
        <View className="h-2 bg-border rounded-full mb-8 overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          />
        </View>

        {/* Flashcard */}
        <View className="flex-1 items-center justify-center">
          <TouchableOpacity
            onPress={flipCard}
            activeOpacity={0.9}
            className="w-full"
            style={{ perspective: "1000px" } as any}
          >
            <Animated.View
              className="bg-surface rounded-3xl p-8 shadow-lg border border-border min-h-[400px] items-center justify-center"
              style={{
                transform: [{ rotateY: showingAnswer ? backInterpolate : frontInterpolate }],
                backfaceVisibility: "hidden",
              }}
            >
              <View className="items-center">
                <Text className="text-sm font-semibold text-primary mb-4 uppercase tracking-wide">
                  {showingAnswer ? "Answer" : "Question"}
                </Text>
                <Text
                  className="text-2xl font-bold text-foreground text-center"
                  style={{
                    writingDirection: showingAnswer ? "rtl" : "ltr",
                    textAlign: "center",
                    lineHeight: 40,
                  }}
                >
                  {showingAnswer ? currentCard.back : currentCard.front}
                </Text>
              </View>

              {!showingAnswer && (
                <View className="absolute bottom-8">
                  <Text className="text-sm text-muted">Tap to reveal answer</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Response Buttons */}
        {showingAnswer && (
          <View className="gap-3 mt-6">
            <Text className="text-center text-sm font-semibold text-muted mb-2">
              How well did you know this?
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => handleResponse(1)}
                activeOpacity={0.7}
                className="flex-1 bg-error/10 border-2 border-error/30 rounded-2xl py-4 items-center"
              >
                <MaterialIcons name="close" size={24} color={colors.error} />
                <Text className="text-sm font-semibold text-error mt-1">Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleResponse(3)}
                activeOpacity={0.7}
                className="flex-1 bg-warning/10 border-2 border-warning/30 rounded-2xl py-4 items-center"
              >
                <MaterialIcons name="remove" size={24} color={colors.warning} />
                <Text className="text-sm font-semibold text-warning mt-1">Hard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleResponse(4)}
                activeOpacity={0.7}
                className="flex-1 bg-success/10 border-2 border-success/30 rounded-2xl py-4 items-center"
              >
                <MaterialIcons name="check" size={24} color={colors.success} />
                <Text className="text-sm font-semibold text-success mt-1">Good</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleResponse(5)}
                activeOpacity={0.7}
                className="flex-1 bg-primary/10 border-2 border-primary/30 rounded-2xl py-4 items-center"
              >
                <MaterialIcons name="done-all" size={24} color={colors.primary} />
                <Text className="text-sm font-semibold text-primary mt-1">Easy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
