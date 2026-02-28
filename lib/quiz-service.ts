import AsyncStorage from "@react-native-async-storage/async-storage";

const QUIZ_HISTORY_KEY = "nile_quiz_history";

export type QuestionType = "multiple_choice" | "true_false" | "fill_blank";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  explanation?: string;
  courseId: number;
  activityId?: number;
}

export interface QuizResult {
  id: string;
  courseId: number;
  activityId?: number;
  questions: QuizQuestion[];
  answers: Record<string, string>; // questionId -> userAnswer
  score: number; // 0-100
  totalQuestions: number;
  correctAnswers: number;
  completedAt: number;
  duration: number; // seconds
}

class QuizService {
  /**
   * Generate quiz questions from course content
   */
  async generateQuiz(
    courseId: number,
    activityId?: number,
    questionCount: number = 10
  ): Promise<QuizQuestion[]> {
    // For now, generate sample questions
    // In a real app, you'd parse course content or use an API
    const questions: QuizQuestion[] = [];

    // Generate multiple choice questions
    for (let i = 0; i < Math.floor(questionCount * 0.6); i++) {
      questions.push({
        id: `mc_${Date.now()}_${i}`,
        type: "multiple_choice",
        question: `What is the meaning of this Arabic word? (Sample ${i + 1})`,
        options: [
          "Option A",
          "Option B",
          "Option C",
          "Option D",
        ],
        correctAnswer: "Option A",
        explanation: "This is a sample explanation for the correct answer.",
        courseId,
        activityId,
      });
    }

    // Generate true/false questions
    for (let i = 0; i < Math.floor(questionCount * 0.2); i++) {
      questions.push({
        id: `tf_${Date.now()}_${i}`,
        type: "true_false",
        question: `Is this statement about Arabic grammar correct? (Sample ${i + 1})`,
        options: ["True", "False"],
        correctAnswer: Math.random() > 0.5 ? "True" : "False",
        explanation: "This is a sample explanation.",
        courseId,
        activityId,
      });
    }

    // Generate fill-in-the-blank questions
    for (let i = 0; i < Math.floor(questionCount * 0.2); i++) {
      questions.push({
        id: `fb_${Date.now()}_${i}`,
        type: "fill_blank",
        question: `Complete the sentence: "The Arabic word for 'book' is _____ (Sample ${i + 1})"`,
        correctAnswer: "كتاب",
        explanation: "The correct answer is كتاب (kitab).",
        courseId,
        activityId,
      });
    }

    // Shuffle questions
    return questions.sort(() => Math.random() - 0.5).slice(0, questionCount);
  }

  /**
   * Check if an answer is correct
   */
  checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
    return userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  }

  /**
   * Calculate quiz score
   */
  calculateScore(questions: QuizQuestion[], answers: Record<string, string>): {
    score: number;
    correctAnswers: number;
  } {
    let correctAnswers = 0;

    questions.forEach((q) => {
      if (this.checkAnswer(q, answers[q.id] || "")) {
        correctAnswers++;
      }
    });

    const score = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
    return { score, correctAnswers };
  }

  /**
   * Save quiz result
   */
  async saveQuizResult(result: QuizResult): Promise<void> {
    try {
      const history = await this.getQuizHistory();
      history.unshift(result);

      // Keep only last 50 results
      if (history.length > 50) {
        history.splice(50);
      }

      await AsyncStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Error saving quiz result:", error);
    }
  }

  /**
   * Get quiz history
   */
  async getQuizHistory(): Promise<QuizResult[]> {
    try {
      const data = await AsyncStorage.getItem(QUIZ_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading quiz history:", error);
      return [];
    }
  }

  /**
   * Get quiz statistics
   */
  async getQuizStats(): Promise<{
    totalQuizzes: number;
    averageScore: number;
    bestScore: number;
    totalQuestions: number;
    correctAnswers: number;
  }> {
    const history = await this.getQuizHistory();

    if (history.length === 0) {
      return {
        totalQuizzes: 0,
        averageScore: 0,
        bestScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
      };
    }

    const totalScore = history.reduce((sum, r) => sum + r.score, 0);
    const bestScore = Math.max(...history.map((r) => r.score));
    const totalQuestions = history.reduce((sum, r) => sum + r.totalQuestions, 0);
    const correctAnswers = history.reduce((sum, r) => sum + r.correctAnswers, 0);

    return {
      totalQuizzes: history.length,
      averageScore: Math.round(totalScore / history.length),
      bestScore,
      totalQuestions,
      correctAnswers,
    };
  }

  /**
   * Delete quiz result
   */
  async deleteQuizResult(resultId: string): Promise<void> {
    try {
      const history = await this.getQuizHistory();
      const filtered = history.filter((r) => r.id !== resultId);
      await AsyncStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error deleting quiz result:", error);
    }
  }

  /**
   * Clear all quiz history
   */
  async clearQuizHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUIZ_HISTORY_KEY);
    } catch (error) {
      console.error("Error clearing quiz history:", error);
    }
  }
}

export const quizService = new QuizService();
