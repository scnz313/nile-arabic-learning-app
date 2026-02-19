import AsyncStorage from "@react-native-async-storage/async-storage";

const FLASHCARDS_KEY = "nile_flashcards";
const FLASHCARD_PROGRESS_KEY = "nile_flashcard_progress";

export interface Flashcard {
  id: string;
  courseId: number;
  front: string; // Arabic word/phrase
  back: string; // Translation/meaning
  example?: string; // Example sentence
  audio?: string; // Audio URL
  createdAt: number;
}

export interface FlashcardProgress {
  flashcardId: string;
  lastReviewed: number;
  nextReview: number; // Spaced repetition
  easeFactor: number; // 2.5 default
  interval: number; // days
  repetitions: number;
  correct: number;
  incorrect: number;
}

class FlashcardService {
  async getFlashcards(courseId?: number): Promise<Flashcard[]> {
    try {
      const data = await AsyncStorage.getItem(FLASHCARDS_KEY);
      const allCards: Flashcard[] = data ? JSON.parse(data) : [];
      return courseId ? allCards.filter((c) => c.courseId === courseId) : allCards;
    } catch (error) {
      console.error("Error loading flashcards:", error);
      return [];
    }
  }

  async addFlashcard(card: Omit<Flashcard, "id" | "createdAt">): Promise<void> {
    try {
      const allCards = await this.getFlashcards();
      const newCard: Flashcard = {
        ...card,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };
      allCards.push(newCard);
      await AsyncStorage.setItem(FLASHCARDS_KEY, JSON.stringify(allCards));
    } catch (error) {
      console.error("Error adding flashcard:", error);
    }
  }

  async deleteFlashcard(id: string): Promise<void> {
    try {
      const allCards = await this.getFlashcards();
      const filtered = allCards.filter((c) => c.id !== id);
      await AsyncStorage.setItem(FLASHCARDS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error deleting flashcard:", error);
    }
  }

  async getFlashcardProgress(flashcardId: string): Promise<FlashcardProgress | null> {
    try {
      const data = await AsyncStorage.getItem(FLASHCARD_PROGRESS_KEY);
      const allProgress: FlashcardProgress[] = data ? JSON.parse(data) : [];
      return allProgress.find((p) => p.flashcardId === flashcardId) || null;
    } catch (error) {
      console.error("Error loading flashcard progress:", error);
      return null;
    }
  }

  async updateFlashcardProgress(flashcardId: string, isCorrect: boolean): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(FLASHCARD_PROGRESS_KEY);
      const allProgress: FlashcardProgress[] = data ? JSON.parse(data) : [];
      
      let progress = allProgress.find((p) => p.flashcardId === flashcardId);
      
      if (!progress) {
        progress = {
          flashcardId,
          lastReviewed: Date.now(),
          nextReview: Date.now(),
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          correct: 0,
          incorrect: 0,
        };
        allProgress.push(progress);
      }

      // Update stats
      if (isCorrect) {
        progress.correct++;
        progress.repetitions++;
        
        // SM-2 algorithm for spaced repetition
        if (progress.repetitions === 1) {
          progress.interval = 1;
        } else if (progress.repetitions === 2) {
          progress.interval = 6;
        } else {
          progress.interval = Math.round(progress.interval * progress.easeFactor);
        }
        
        progress.easeFactor = Math.max(1.3, progress.easeFactor + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)));
      } else {
        progress.incorrect++;
        progress.repetitions = 0;
        progress.interval = 1;
        progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.2);
      }

      progress.lastReviewed = Date.now();
      progress.nextReview = Date.now() + progress.interval * 86400000; // days to ms

      await AsyncStorage.setItem(FLASHCARD_PROGRESS_KEY, JSON.stringify(allProgress));
    } catch (error) {
      console.error("Error updating flashcard progress:", error);
    }
  }

  async getDueFlashcards(courseId?: number): Promise<Flashcard[]> {
    try {
      const allCards = await this.getFlashcards(courseId);
      const data = await AsyncStorage.getItem(FLASHCARD_PROGRESS_KEY);
      const allProgress: FlashcardProgress[] = data ? JSON.parse(data) : [];
      
      const now = Date.now();
      const dueCards = allCards.filter((card) => {
        const progress = allProgress.find((p) => p.flashcardId === card.id);
        return !progress || progress.nextReview <= now;
      });

      return dueCards;
    } catch (error) {
      console.error("Error getting due flashcards:", error);
      return [];
    }
  }
}

export const flashcardService = new FlashcardService();
