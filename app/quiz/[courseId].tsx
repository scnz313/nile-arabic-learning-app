import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { quizService, type QuizQuestion, type QuizResult } from "@/lib/quiz-service";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function QuizScreen() {
  const router = useRouter();
  const colors = useColors();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    const quiz = await quizService.generateQuiz(parseInt(courseId), undefined, 10);
    setQuestions(quiz);
    setLoading(false);
  };

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setAnswers({ ...answers, [currentQuestion.id]: answer });
  };

  const handleNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinish = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const { score, correctAnswers } = quizService.calculateScore(questions, answers);
    const duration = Math.floor((Date.now() - startTime) / 1000);

    const quizResult: QuizResult = {
      id: Date.now().toString(),
      courseId: parseInt(courseId),
      questions,
      answers,
      score,
      totalQuestions: questions.length,
      correctAnswers,
      completedAt: Date.now(),
      duration,
    };

    await quizService.saveQuizResult(quizResult);
    setResult(quizResult);
    setShowResults(true);
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case "multiple_choice":
        return (
          <View className="gap-3">
            {currentQuestion.options?.map((option, index) => {
              const isSelected = answers[currentQuestion.id] === option;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleAnswer(option)}
                  activeOpacity={0.7}
                  className={`p-4 rounded-xl border-2 ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-base font-medium ${
                      isSelected ? "text-white" : "text-foreground"
                    }`}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case "true_false":
        return (
          <View className="flex-row gap-3">
            {["True", "False"].map((option) => {
              const isSelected = answers[currentQuestion.id] === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => handleAnswer(option)}
                  activeOpacity={0.7}
                  className={`flex-1 p-6 rounded-xl border-2 items-center ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <MaterialIcons
                    name={option === "True" ? "check-circle" : "cancel"}
                    size={32}
                    color={isSelected ? "#FFF" : colors.muted}
                  />
                  <Text
                    className={`text-lg font-bold mt-2 ${
                      isSelected ? "text-white" : "text-foreground"
                    }`}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case "fill_blank":
        return (
          <View>
            <TextInput
              value={answers[currentQuestion.id] || ""}
              onChangeText={(text) => handleAnswer(text)}
              placeholder="Type your answer..."
              placeholderTextColor={colors.muted}
              className="bg-surface border-2 border-border rounded-xl p-4 text-base text-foreground"
              style={{ fontFamily: "System" }}
              multiline
            />
          </View>
        );

      default:
        return null;
    }
  };

  const renderResults = () => {
    if (!result) return null;

    const percentage = result.score;
    const emoji = percentage >= 90 ? "🎉" : percentage >= 70 ? "👏" : percentage >= 50 ? "👍" : "💪";

    return (
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="p-6">
          {/* Score Card */}
          <View className="bg-primary rounded-3xl p-8 items-center mb-6 shadow-lg">
            <Text className="text-6xl mb-4">{emoji}</Text>
            <Text className="text-white/80 text-base font-medium mb-2">Your Score</Text>
            <Text className="text-white text-7xl font-bold mb-2">{percentage}%</Text>
            <Text className="text-white/90 text-lg font-semibold">
              {result.correctAnswers} / {result.totalQuestions} Correct
            </Text>
          </View>

          {/* Stats */}
          <View className="bg-surface rounded-2xl p-5 mb-6 shadow-sm border border-border">
            <Text className="text-lg font-bold text-foreground mb-4">Quiz Stats</Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-muted">Duration</Text>
                <Text className="text-foreground font-semibold">
                  {Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, "0")}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted">Accuracy</Text>
                <Text className="text-foreground font-semibold">{percentage}%</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => {
                setShowResults(false);
                setCurrentIndex(0);
                setAnswers({});
                loadQuiz();
              }}
              activeOpacity={0.7}
              className="bg-primary rounded-xl p-4 items-center"
            >
              <Text className="text-white text-base font-semibold">Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="bg-surface border border-border rounded-xl p-4 items-center"
            >
              <Text className="text-foreground text-base font-semibold">Back to Course</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Loading quiz...</Text>
      </ScreenContainer>
    );
  }

  if (showResults) {
    return <ScreenContainer>{renderResults()}</ScreenContainer>;
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
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-base font-semibold text-muted">
              Question {currentIndex + 1} / {questions.length}
            </Text>
          </View>

          {/* Progress Bar */}
          <View className="h-2 bg-surface rounded-full overflow-hidden mb-6">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        {/* Question */}
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="p-6 pt-0">
            <View className="bg-surface rounded-2xl p-6 mb-6 shadow-sm border border-border">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="px-3 py-1 rounded-full bg-primary/10">
                  <Text className="text-xs font-bold text-primary uppercase">
                    {currentQuestion.type.replace("_", " ")}
                  </Text>
                </View>
              </View>
              <Text className="text-xl font-bold text-foreground leading-relaxed">
                {currentQuestion.question}
              </Text>
            </View>

            {renderQuestion()}
          </View>
        </ScrollView>

        {/* Navigation */}
        <View className="p-6 pt-0 flex-row gap-3">
          {currentIndex > 0 && (
            <TouchableOpacity
              onPress={handlePrevious}
              activeOpacity={0.7}
              className="flex-1 bg-surface border border-border rounded-xl p-4 items-center"
            >
              <Text className="text-foreground text-base font-semibold">Previous</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={!answers[currentQuestion.id]}
            activeOpacity={0.7}
            className={`flex-1 rounded-xl p-4 items-center ${
              answers[currentQuestion.id]
                ? "bg-primary"
                : "bg-border"
            }`}
          >
            <Text className="text-white text-base font-semibold">
              {currentIndex === questions.length - 1 ? "Finish" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
