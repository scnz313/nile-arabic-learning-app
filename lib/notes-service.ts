import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTES_KEY = "nile_notes";

export interface Note {
  id: string;
  courseId: number;
  activityId: number;
  content: string;
  timestamp: number;
}

class NotesService {
  async getNotes(courseId: number, activityId: number): Promise<Note[]> {
    try {
      const data = await AsyncStorage.getItem(NOTES_KEY);
      const allNotes: Note[] = data ? JSON.parse(data) : [];
      return allNotes.filter(
        (note) => note.courseId === courseId && note.activityId === activityId
      );
    } catch (error) {
      console.error("Error loading notes:", error);
      return [];
    }
  }

  async getAllNotes(): Promise<Note[]> {
    try {
      const data = await AsyncStorage.getItem(NOTES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading all notes:", error);
      return [];
    }
  }

  async addNote(courseId: number, activityId: number, content: string): Promise<void> {
    try {
      const allNotes = await this.getAllNotes();
      const newNote: Note = {
        id: Date.now().toString(),
        courseId,
        activityId,
        content,
        timestamp: Date.now(),
      };
      allNotes.unshift(newNote);
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
    } catch (error) {
      console.error("Error adding note:", error);
    }
  }

  async updateNote(noteId: string, content: string): Promise<void> {
    try {
      const allNotes = await this.getAllNotes();
      const index = allNotes.findIndex((n) => n.id === noteId);
      if (index !== -1) {
        allNotes[index].content = content;
        allNotes[index].timestamp = Date.now();
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
      }
    } catch (error) {
      console.error("Error updating note:", error);
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      const allNotes = await this.getAllNotes();
      const filtered = allNotes.filter((n) => n.id !== noteId);
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }
}

export const notesService = new NotesService();
