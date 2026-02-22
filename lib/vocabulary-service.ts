import AsyncStorage from "@react-native-async-storage/async-storage";

const VOCABULARY_KEY = "nile_vocabulary";

export interface VocabularyWord {
  id: string;
  word: string;
  translation?: string;
  courseId: number;
  activityId: number;
  activityName: string;
  context?: string;
  createdAt: number;
  hasFlashcard: boolean;
}

class VocabularyService {
  /**
   * Extract Arabic words from HTML content
   */
  extractArabicWords(html: string): string[] {
    // Remove HTML tags
    const textContent = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Arabic Unicode range: \u0600-\u06FF (Arabic), \u0750-\u077F (Arabic Supplement)
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]+/g;
    const matches = textContent.match(arabicRegex) || [];

    // Filter out single characters and duplicates
    const words = matches
      .filter((word) => word.length > 1)
      .map((word) => word.trim())
      .filter(Boolean);

    // Remove duplicates
    return Array.from(new Set(words));
  }

  /**
   * Get all vocabulary words
   */
  async getAllWords(): Promise<VocabularyWord[]> {
    try {
      const data = await AsyncStorage.getItem(VOCABULARY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading vocabulary:", error);
      return [];
    }
  }

  /**
   * Get vocabulary words for a specific lesson
   */
  async getWordsForLesson(courseId: number, activityId: number): Promise<VocabularyWord[]> {
    const allWords = await this.getAllWords();
    return allWords.filter((w) => w.courseId === courseId && w.activityId === activityId);
  }

  /**
   * Add a vocabulary word
   */
  async addWord(
    word: string,
    courseId: number,
    activityId: number,
    activityName: string,
    context?: string,
    translation?: string
  ): Promise<VocabularyWord> {
    const allWords = await this.getAllWords();

    // Check if word already exists for this lesson
    const existing = allWords.find(
      (w) => w.word === word && w.courseId === courseId && w.activityId === activityId
    );

    if (existing) {
      return existing;
    }

    const newWord: VocabularyWord = {
      id: `${Date.now()}_${Math.random()}`,
      word,
      translation,
      courseId,
      activityId,
      activityName,
      context,
      createdAt: Date.now(),
      hasFlashcard: false,
    };

    allWords.push(newWord);
    await AsyncStorage.setItem(VOCABULARY_KEY, JSON.stringify(allWords));

    return newWord;
  }

  /**
   * Mark word as having a flashcard
   */
  async markAsFlashcard(wordId: string): Promise<void> {
    const allWords = await this.getAllWords();
    const word = allWords.find((w) => w.id === wordId);

    if (word) {
      word.hasFlashcard = true;
      await AsyncStorage.setItem(VOCABULARY_KEY, JSON.stringify(allWords));
    }
  }

  /**
   * Delete a vocabulary word
   */
  async deleteWord(wordId: string): Promise<void> {
    const allWords = await this.getAllWords();
    const filtered = allWords.filter((w) => w.id !== wordId);
    await AsyncStorage.setItem(VOCABULARY_KEY, JSON.stringify(filtered));
  }

  /**
   * Get vocabulary statistics
   */
  async getStats(): Promise<{
    totalWords: number;
    wordsWithFlashcards: number;
    wordsByCourse: Record<number, number>;
  }> {
    const allWords = await this.getAllWords();

    const wordsByCourse: Record<number, number> = {};
    allWords.forEach((word) => {
      wordsByCourse[word.courseId] = (wordsByCourse[word.courseId] || 0) + 1;
    });

    return {
      totalWords: allWords.length,
      wordsWithFlashcards: allWords.filter((w) => w.hasFlashcard).length,
      wordsByCourse,
    };
  }

  /**
   * Auto-extract and save vocabulary from lesson content
   */
  async extractAndSaveFromLesson(
    html: string,
    courseId: number,
    activityId: number,
    activityName: string
  ): Promise<VocabularyWord[]> {
    const words = this.extractArabicWords(html);
    const savedWords: VocabularyWord[] = [];

    for (const word of words) {
      try {
        const saved = await this.addWord(word, courseId, activityId, activityName);
        savedWords.push(saved);
      } catch (error) {
        console.error(`Error saving word "${word}":`, error);
      }
    }

    return savedWords;
  }
}

export const vocabularyService = new VocabularyService();
