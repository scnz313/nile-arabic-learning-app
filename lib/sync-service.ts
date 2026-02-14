import { moodleAPI } from "./moodle-api";
import { storage, type LessonData, type ResourceData, type CourseData } from "./storage";

export interface SyncResult {
  success: boolean;
  coursesUpdated: number;
  lessonsAdded: number;
  lessonsUpdated: number;
  errors: string[];
}

function getResourceType(mimeType: string, filename: string): string {
  const mime = (mimeType || "").toLowerCase();
  const name = filename.toLowerCase();
  if (mime.includes("video") || name.match(/\.(mp4|avi|mov|wmv|webm)$/)) return "video";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mime.includes("image") || name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "image";
  if (mime.includes("audio") || name.match(/\.(mp3|wav|ogg|m4a)$/)) return "audio";
  return "file";
}

function getContentType(mod: { modname: string; contents?: { mimetype?: string; filename: string }[] }): string {
  if (mod.modname === "resource" && mod.contents && mod.contents.length > 0) {
    const first = mod.contents[0];
    return getResourceType(first.mimetype || "", first.filename);
  }
  switch (mod.modname) {
    case "page": return "text";
    case "url": return "url";
    case "assign": return "assignment";
    case "quiz": return "quiz";
    case "forum": return "forum";
    case "book": return "book";
    case "label": return "label";
    default: return mod.modname;
  }
}

class SyncService {
  private isSyncing = false;

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, coursesUpdated: 0, lessonsAdded: 0, lessonsUpdated: 0, errors: ["Sync already in progress"] };
    }

    this.isSyncing = true;
    const result: SyncResult = { success: true, coursesUpdated: 0, lessonsAdded: 0, lessonsUpdated: 0, errors: [] };

    try {
      const courses = await storage.getCourses();
      for (const course of courses) {
        try {
          const courseResult = await this.syncCourse(course.moodleCourseId);
          result.coursesUpdated++;
          result.lessonsAdded += courseResult.lessonsAdded;
          result.lessonsUpdated += courseResult.lessonsUpdated;
        } catch (error) {
          result.errors.push(`Failed to sync ${course.displayName}: ${error instanceof Error ? error.message : "Unknown"}`);
        }
      }
      await storage.setLastSyncTime(Date.now());
      if (result.errors.length > 0) result.success = false;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  async syncCourse(courseId: number): Promise<{ lessonsAdded: number; lessonsUpdated: number }> {
    const result = { lessonsAdded: 0, lessonsUpdated: 0 };

    const sections = await moodleAPI.getCourseContents(courseId);
    const existingLessons = await storage.getCourseContents(courseId);
    const existingMap = new Map(existingLessons.map((l) => [l.id, l]));

    const lessons: LessonData[] = [];

    for (const section of sections) {
      if (!section.modules || section.modules.length === 0 || section.visible === 0) continue;

      for (const mod of section.modules) {
        if (mod.visible === 0 || mod.uservisible === false) continue;
        // Skip labels - they are just section dividers
        if (mod.modname === "label") continue;

        const lessonId = `${mod.id}`;
        const contentType = getContentType(mod);

        const resources: ResourceData[] = [];
        if (mod.contents && mod.contents.length > 0) {
          for (const content of mod.contents) {
            if (content.fileurl) {
              resources.push({
                id: `${mod.id}_${content.filename}`,
                lessonId,
                name: content.filename,
                type: getResourceType(content.mimetype || "", content.filename),
                url: content.fileurl,
                fileSize: content.filesize,
                mimeType: content.mimetype,
                isDownloaded: false,
              });
            }
          }
        }

        const existing = existingMap.get(lessonId);
        const lesson: LessonData = {
          id: lessonId,
          moodleModuleId: mod.id,
          courseId,
          sectionId: section.id,
          sectionName: section.name || "General",
          name: mod.name,
          moduleName: mod.modname,
          description: mod.description,
          contentType,
          url: mod.url,
          isCompleted: existing?.isCompleted || false,
          lastAccessedAt: existing?.lastAccessedAt,
          completedAt: existing?.completedAt,
          resources,
        };

        if (existing) {
          result.lessonsUpdated++;
        } else {
          result.lessonsAdded++;
        }

        lessons.push(lesson);
      }
    }

    await storage.setCourseContents(courseId, lessons);

    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l) => l.isCompleted).length;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    await storage.updateCourse(courseId, { totalLessons, completedLessons, progress, updatedAt: Date.now() });

    return result;
  }

  async getCourseLessons(courseId: number): Promise<LessonData[]> {
    return storage.getCourseContents(courseId);
  }

  async getCourseLessonsBySection(courseId: number): Promise<Map<string, LessonData[]>> {
    const lessons = await storage.getCourseContents(courseId);
    const bySection = new Map<string, LessonData[]>();
    for (const lesson of lessons) {
      const key = lesson.sectionName || "General";
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key)!.push(lesson);
    }
    return bySection;
  }

  async markLessonComplete(courseId: number, lessonId: string): Promise<void> {
    await storage.markLessonComplete(courseId, lessonId);
  }

  async updateLessonAccess(courseId: number, lessonId: string): Promise<void> {
    await storage.updateLesson(courseId, lessonId, { lastAccessedAt: Date.now() });
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
