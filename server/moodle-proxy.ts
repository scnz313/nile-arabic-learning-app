import type { Express } from "express";
import * as cheerio from "cheerio";

const MOODLE_BASE_URL = "https://nilecenter.online";

interface MoodleSession {
  cookie: string;
  username: string;
  expiresAt: number;
}

const sessionCache = new Map<string, MoodleSession>();
const MAX_SESSIONS = 100;

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessionCache) {
    if (session.expiresAt <= now) sessionCache.delete(key);
  }
  if (sessionCache.size > MAX_SESSIONS) {
    const entries = [...sessionCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (let i = 0; i < entries.length - MAX_SESSIONS; i++) {
      sessionCache.delete(entries[i][0]);
    }
  }
}

async function getMoodleSession(username: string, password: string): Promise<string> {
  cleanupExpiredSessions();
  const cached = sessionCache.get(username);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.cookie;
  }

  const loginPageRes = await fetch(`${MOODLE_BASE_URL}/login/index.php`);
  const loginPageHtml = await loginPageRes.text();
  const $ = cheerio.load(loginPageHtml);
  const logintoken = $('input[name="logintoken"]').val() as string;

  const setCookies = loginPageRes.headers.getSetCookie?.() || [];
  let sessionCookie = "";
  for (const c of setCookies) {
    const match = c.match(/MoodleSession=([^;]+)/);
    if (match) sessionCookie = match[1];
  }

  const formData = new URLSearchParams({
    username,
    password,
    logintoken: logintoken || "",
    anchor: "",
  });

  const loginRes = await fetch(`${MOODLE_BASE_URL}/login/index.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `MoodleSession=${sessionCookie}`,
    },
    body: formData.toString(),
    redirect: "manual",
  });

  const loginSetCookies = loginRes.headers.getSetCookie?.() || [];
  for (const c of loginSetCookies) {
    const match = c.match(/MoodleSession=([^;]+)/);
    if (match) sessionCookie = match[1];
  }

  const location = loginRes.headers.get("location");
  if (location) {
    const followRes = await fetch(location.startsWith("http") ? location : `${MOODLE_BASE_URL}${location}`, {
      headers: { Cookie: `MoodleSession=${sessionCookie}` },
      redirect: "manual",
    });
    const followCookies = followRes.headers.getSetCookie?.() || [];
    for (const c of followCookies) {
      const match = c.match(/MoodleSession=([^;]+)/);
      if (match) sessionCookie = match[1];
    }
  }

  sessionCache.set(username, {
    cookie: sessionCookie,
    username,
    expiresAt: Date.now() + 30 * 60 * 1000,
  });

  return sessionCookie;
}

async function fetchWithSession(url: string, cookie: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Cookie: `MoodleSession=${cookie}` },
  });
  return res.text();
}

function makeAbsoluteUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${MOODLE_BASE_URL}${url}`;
  return `${MOODLE_BASE_URL}/${url}`;
}

function extractContentHtml($: cheerio.CheerioAPI, selector: string): string {
  const el = $(selector);
  if (!el.length) return "";
  // Make all image URLs absolute
  el.find("img").each((_, img) => {
    const src = $(img).attr("src");
    if (src) $(img).attr("src", makeAbsoluteUrl(src));
  });
  // Make all link URLs absolute
  el.find("a").each((_, a) => {
    const href = $(a).attr("href");
    if (href) $(a).attr("href", makeAbsoluteUrl(href));
  });
  // Make audio/video source URLs absolute
  el.find("source").each((_, s) => {
    const src = $(s).attr("src");
    if (src) $(s).attr("src", makeAbsoluteUrl(src));
  });
  el.find("audio").each((_, a) => {
    const src = $(a).attr("src");
    if (src) $(a).attr("src", makeAbsoluteUrl(src));
  });
  el.find("video").each((_, v) => {
    const src = $(v).attr("src");
    if (src) $(v).attr("src", makeAbsoluteUrl(src));
  });
  return el.html() || "";
}

export function registerMoodleProxy(app: Express) {
  // Login endpoint
  app.post("/api/moodle/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Username and password required" });
        return;
      }

      const cookie = await getMoodleSession(username, password);
      const dashboardHtml = await fetchWithSession(`${MOODLE_BASE_URL}/my/`, cookie);
      const $ = cheerio.load(dashboardHtml);
      const fullName = $(".usertext").first().text().trim() || username;

      if (!fullName || dashboardHtml.includes('id="login"')) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      res.json({
        success: true,
        sessionCookie: cookie,
        user: { username, fullName },
      });
    } catch (error) {
      console.error("Moodle login error:", error);
      res.status(500).json({ error: "Failed to connect to Moodle" });
    }
  });

  // Get enrolled courses
  app.post("/api/moodle/courses", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Credentials required" });
        return;
      }

      const cookie = await getMoodleSession(username, password);
      const html = await fetchWithSession(`${MOODLE_BASE_URL}/my/`, cookie);
      const $ = cheerio.load(html);

      const courses: any[] = [];
      const seen = new Set<number>();

      $('a[href*="/course/view.php"]').each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (text && text.length > 3) {
          const idMatch = href.match(/id=(\d+)/);
          const courseId = idMatch ? parseInt(idMatch[1], 10) : 0;
          if (courseId > 0 && !seen.has(courseId)) {
            seen.add(courseId);
            courses.push({
              id: courseId,
              fullname: text,
              shortname: text.split(" - ")[0] || text,
              url: href,
            });
          }
        }
      });

      res.json({ courses });
    } catch (error) {
      console.error("Moodle courses error:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  // Get FULL course structure with all sections and activities
  app.post("/api/moodle/course-full", async (req, res) => {
    try {
      const { username, password, courseId } = req.body;
      if (!username || !password || !courseId) {
        res.status(400).json({ error: "Credentials and courseId required" });
        return;
      }

      const cookie = await getMoodleSession(username, password);

      // First get the course page to find section tabs
      const courseHtml = await fetchWithSession(
        `${MOODLE_BASE_URL}/course/view.php?id=${courseId}`,
        cookie
      );
      const $course = cheerio.load(courseHtml);

      // Find the Lessons tab section ID
      let lessonsSectionId = "";
      $course('a').each((_, el) => {
        const href = $course(el).attr("href") || "";
        const text = $course(el).text().trim();
        if (text === "Lessons" && href.includes("sectionid=")) {
          const match = href.match(/sectionid=(\d+)/);
          if (match) lessonsSectionId = match[1];
        }
      });

      // Extract intro section content
      const introSection = extractIntroSection($course);

      // Fetch the Lessons tab page to get all lesson sections
      let lessonsHtml = courseHtml;
      if (lessonsSectionId) {
        lessonsHtml = await fetchWithSession(
          `${MOODLE_BASE_URL}/course/view.php?id=${courseId}&sectionid=${lessonsSectionId}`,
          cookie
        );
      }
      const $lessons = cheerio.load(lessonsHtml);

      // Extract all lesson sections from the accordion/collapsible list
      const lessonSections: any[] = [];
      const sectionLinks: { name: string; url: string }[] = [];

      // Find all section links in the accordion
      $lessons("ul.flexsections a, ul.topics a, .course-content a").each((_, el) => {
        const href = $lessons(el).attr("href") || "";
        const text = $lessons(el).text().trim();
        if (text && href.includes("/course/view.php") && href.includes("section=")) {
          sectionLinks.push({ name: text, url: href });
        }
      });

      // Also look for collapsible section headers
      $lessons(".course-content li.section").each((_, sectionEl) => {
        const $sec = $lessons(sectionEl);
        const sectionName = $sec.find("h3.sectionname, span.sectionname, .section-title").first().text().trim();
        if (!sectionName) return;

        const activities: any[] = [];
        $sec.find("li.activity").each((_, actEl) => {
          const $act = $lessons(actEl);
          const activity = parseActivity($lessons, $act);
          if (activity) activities.push(activity);
        });

        if (activities.length > 0 || sectionName) {
          lessonSections.push({ name: sectionName, activities });
        }
      });

      // If we didn't get sections from the DOM, try parsing the nav sidebar
      if (lessonSections.length <= 1) {
        const navSections: any[] = [];
        $lessons('ul[role="tree"] a, .block_navigation a').each((_, el) => {
          const href = $lessons(el).attr("href") || "";
          const text = $lessons(el).text().trim();
          if (text && href.includes("/course/view.php") && (href.includes("section=") || href.includes("sectionid="))) {
            navSections.push({ name: text, url: makeAbsoluteUrl(href) });
          }
        });

        // Also parse from the accordion list items
        $lessons("ul li").each((_, li) => {
          const $li = $lessons(li);
          const link = $li.children("a").first();
          const href = link.attr("href") || "";
          const text = link.text().trim();

          // Check if this is a lesson section link
          if (text && /^\d+[-\s]/.test(text) && href.includes("/course/view.php")) {
            // This is a numbered lesson section
            const subActivities: any[] = [];
            $li.find("ul a").each((_, subEl) => {
              const subHref = $lessons(subEl).attr("href") || "";
              const subText = $lessons(subEl).text().trim();
              if (subText && subHref && subHref.includes("/mod/")) {
                const modMatch = subHref.match(/\/mod\/(\w+)\//);
                const modType = modMatch ? modMatch[1] : "unknown";
                const idMatch = subHref.match(/id=(\d+)/);
                subActivities.push({
                  id: idMatch ? idMatch[1] : "",
                  name: subText,
                  modType,
                  url: makeAbsoluteUrl(subHref),
                });
              }
            });

            lessonSections.push({
              name: text,
              url: makeAbsoluteUrl(href),
              activities: subActivities,
            });
          }
        });
      }

      // Now fetch each section page to get its activities
      const sectionsWithActivities: any[] = [];

      // If we have section URLs but no activities, fetch each section
      for (const section of lessonSections) {
        if (section.activities && section.activities.length > 0) {
          sectionsWithActivities.push(section);
          continue;
        }

        if (section.url) {
          try {
            const sectionHtml = await fetchWithSession(section.url, cookie);
            const $sec = cheerio.load(sectionHtml);
            const activities: any[] = [];

            $sec("li.activity").each((_, actEl) => {
              const $act = $sec(actEl);
              const activity = parseActivity($sec, $act);
              if (activity) activities.push(activity);
            });

            sectionsWithActivities.push({
              name: section.name,
              activities,
            });
          } catch (e) {
            sectionsWithActivities.push({
              name: section.name,
              activities: [],
            });
          }
        }
      }

      // If still no sections with activities, expand all and parse
      if (sectionsWithActivities.length === 0 || sectionsWithActivities.every(s => s.activities.length === 0)) {
        // Try fetching with expand=1 or similar
        const expandHtml = await fetchWithSession(
          `${MOODLE_BASE_URL}/course/view.php?id=${courseId}&expandall=1`,
          cookie
        );
        const $expand = cheerio.load(expandHtml);

        // Parse all sections from expanded view
        const allSections = parseAllSections($expand);
        if (allSections.length > 0) {
          sectionsWithActivities.length = 0;
          sectionsWithActivities.push(...allSections);
        }
      }

      // Get course tabs info
      const tabs: string[] = [];
      $course(".nav-tabs a, .tabrow a").each((_, el) => {
        const text = $course(el).text().trim();
        if (text) tabs.push(text);
      });

      res.json({
        courseId,
        tabs,
        intro: introSection,
        sections: sectionsWithActivities,
        totalSections: sectionsWithActivities.length,
        totalActivities: sectionsWithActivities.reduce((sum: number, s: any) => sum + (s.activities?.length || 0), 0),
      });
    } catch (error) {
      console.error("Moodle course-full error:", error);
      res.status(500).json({ error: "Failed to fetch course contents" });
    }
  });

  // Get activity content (page, book, quiz, etc.)
  app.post("/api/moodle/activity-content", async (req, res) => {
    try {
      const { username, password, activityUrl, modType } = req.body;
      if (!username || !password || !activityUrl) {
        res.status(400).json({ error: "Credentials and activityUrl required" });
        return;
      }

      const cookie = await getMoodleSession(username, password);
      const html = await fetchWithSession(makeAbsoluteUrl(activityUrl), cookie);
      const $ = cheerio.load(html);

      let content: any = {};

      switch (modType) {
        case "page": {
          const mainContent = extractContentHtml($, "#region-main .box.generalbox, #region-main [role='main'], #region-main .content");
          const title = $("h2").first().text().trim() || $(".page-header-headings h1").text().trim();
          
          // Extract audio sources
          const audioSources: string[] = [];
          $("audio source, audio[src]").each((_, el) => {
            const src = $(el).attr("src");
            if (src) audioSources.push(makeAbsoluteUrl(src));
          });
          
          // Extract images
          const images: string[] = [];
          $(".box.generalbox img, [role='main'] img").each((_, el) => {
            const src = $(el).attr("src");
            if (src && !src.includes("theme/image")) images.push(makeAbsoluteUrl(src));
          });

          // Extract iframes (Google Slides, etc.)
          const iframes: string[] = [];
          $(".box.generalbox iframe, [role='main'] iframe").each((_, el) => {
            const src = $(el).attr("src");
            if (src) iframes.push(makeAbsoluteUrl(src));
          });

          content = { type: "page", title, html: mainContent, audioSources, images, iframes };
          break;
        }

        case "book": {
          const title = $("h2").first().text().trim();
          const mainContent = extractContentHtml($, "#region-main .box.generalbox, #region-main .book_content, #region-main [role='main']");
          
          // Get book chapters from TOC
          const chapters: any[] = [];
          $(".book_toc a, .book_toc_numbered a").each((_, el) => {
            const href = $(el).attr("href") || "";
            const text = $(el).text().trim();
            if (text && href) {
              chapters.push({ name: text, url: makeAbsoluteUrl(href) });
            }
          });

          content = { type: "book", title, html: mainContent, chapters };
          break;
        }

        case "quiz": {
          const title = $("h2").first().text().trim() || $(".page-header-headings h1").text().trim() || $("title").text().replace(/:.*$/, "").trim();
          const description = $(".quizinfo, .box.quizinfo, #intro .box.generalbox, .quizattempt .quizinfo").text().trim();
          const attempts = $(".quizattemptsummary, .generaltable").html() || "";
          
          content = { type: "quiz", title, description, attemptsHtml: attempts };
          break;
        }

        case "assign": {
          const title = $("h2").first().text().trim() || $(".page-header-headings h1").text().trim() || $("title").text().replace(/:.*$/, "").trim();
          const description = extractContentHtml($, "#intro .box.generalbox, .submissionstatustable, .assignsubmission, .submissionstatustable");
          const submissionStatus = $(".submissionstatustable").text().trim();
          
          content = { type: "assignment", title, html: description, status: submissionStatus };
          break;
        }

        case "forum": {
          const title = $("h2").first().text().trim() || $(".page-header-headings h1").text().trim() || $("title").text().replace(/:.*$/, "").trim();
          const discussions: any[] = [];
          $(".discussion, .forumpost, tr.discussion").each((_, el) => {
            const $disc = $(el);
            const subject = $disc.find(".subject a, .topic a, td.topic a").first().text().trim();
            const author = $disc.find(".author, td.author").first().text().trim();
            const date = $disc.find(".lastpost, td.lastpost").first().text().trim();
            const postContent = $disc.find(".posting, .content").first().text().trim();
            if (subject) discussions.push({ subject, author, date, content: postContent });
          });

          content = { type: "forum", title, discussions };
          break;
        }

        case "url": {
          const title = $("h2").first().text().trim();
          const externalUrl = $(".urlworkaround a, .box.urlworkaround a, #region-main a[href]").first().attr("href") || activityUrl;
          content = { type: "url", title, externalUrl: makeAbsoluteUrl(externalUrl) };
          break;
        }

        case "resource": {
          const title = $("h2").first().text().trim();
          const downloadLink = $(".resourceworkaround a, .box.generalbox a, #region-main a[href*='pluginfile']").first().attr("href") || "";
          content = { type: "resource", title, downloadUrl: makeAbsoluteUrl(downloadLink) };
          break;
        }

        case "videotime": {
          const title = $("h2").first().text().trim();
          // Look for video URLs in the page
          let videoUrl = "";
          $("video source, video[src]").each((_, el) => {
            const src = $(el).attr("src");
            if (src) videoUrl = makeAbsoluteUrl(src);
          });
          // Also check for iframe (Vimeo, YouTube)
          let iframeSrc = "";
          $("iframe").each((_, el) => {
            const src = $(el).attr("src");
            if (src) iframeSrc = makeAbsoluteUrl(src);
          });
          // Check for data attributes with video info
          const videoData = $("[data-vimeo-url], [data-video-url]").first();
          const vimeoUrl = videoData.attr("data-vimeo-url") || videoData.attr("data-video-url") || "";

          content = { type: "video", title, videoUrl, iframeSrc, vimeoUrl: makeAbsoluteUrl(vimeoUrl) };
          break;
        }

        case "hvp":
        case "h5pactivity": {
          const title = $("h2").first().text().trim();
          const iframeSrc = $("iframe").first().attr("src") || "";
          content = { type: "interactive", title, iframeSrc: makeAbsoluteUrl(iframeSrc) };
          break;
        }

        case "attendance": {
          const title = $("h2").first().text().trim();
          const tableHtml = extractContentHtml($, ".generaltable, .attlist, #region-main table");
          content = { type: "attendance", title, html: tableHtml };
          break;
        }

        case "feedback": {
          const title = $("h2").first().text().trim();
          const description = $(".box.generalbox").first().text().trim();
          content = { type: "feedback", title, description };
          break;
        }

        default: {
          const title = $("h2").first().text().trim();
          const mainContent = extractContentHtml($, "#region-main");
          content = { type: modType || "unknown", title, html: mainContent };
        }
      }

      res.json(content);
    } catch (error) {
      console.error("Moodle activity content error:", error);
      res.status(500).json({ error: "Failed to fetch activity content" });
    }
  });

  // Proxy images and media from Moodle (to bypass CORS)
  app.get("/api/moodle/proxy-media", async (req, res) => {
    try {
      const { url, username, password } = req.query as Record<string, string>;
      if (!url) {
        res.status(400).json({ error: "URL required" });
        return;
      }

      let headers: Record<string, string> = {};
      if (username && password) {
        const cookie = await getMoodleSession(username, password);
        headers = { Cookie: `MoodleSession=${cookie}` };
      }

      const mediaRes = await fetch(makeAbsoluteUrl(url), { headers });
      const contentType = mediaRes.headers.get("content-type") || "application/octet-stream";
      const buffer = Buffer.from(await mediaRes.arrayBuffer());

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (error) {
      console.error("Moodle proxy media error:", error);
      res.status(500).json({ error: "Failed to proxy media" });
    }
  });
}

function parseActivity($: cheerio.CheerioAPI, $act: any): any | null {
  const instanceName = $act.find("span.instancename").first();
  let name = instanceName.text().trim();
  const accessHide = instanceName.find(".accesshide").text().trim();
  if (accessHide) name = name.replace(accessHide, "").trim();

  if (!name) {
    const linkText = $act.find("a").first().text().trim();
    name = linkText || "";
  }

  const classes = ($act.attr("class") || "").split(" ");
  let modType = "resource";
  for (const cls of classes) {
    if (cls.startsWith("modtype_")) {
      modType = cls.replace("modtype_", "");
      break;
    }
  }

  const link = $act.find("a").first();
  const href = link.attr("href") || "";
  const actId = $act.attr("id") || "";
  const moduleId = actId.replace("module-", "");

  // Get icon to determine type
  const iconSrc = $act.find("img.activityicon, img.iconlarge").first().attr("src") || "";

  if (!name || modType === "label") return null;

  return {
    id: moduleId,
    name,
    modType,
    url: makeAbsoluteUrl(href),
    icon: makeAbsoluteUrl(iconSrc),
  };
}

function extractIntroSection($: cheerio.CheerioAPI): any {
  const intro: any = { name: "Intro", activities: [] };
  
  // Look for intro content
  $("li.section").first().find("li.activity").each((_, actEl) => {
    const $act = $(actEl);
    const activity = parseActivity($, $act);
    if (activity) intro.activities.push(activity);
  });

  return intro;
}

function parseAllSections($: cheerio.CheerioAPI): any[] {
  const sections: any[] = [];
  
  $("li.section").each((_, sectionEl) => {
    const $sec = $(sectionEl);
    const sectionName = $sec.find("h3.sectionname, span.sectionname, .section-title").first().text().trim();
    if (!sectionName) return;

    const activities: any[] = [];
    $sec.find("li.activity").each((_, actEl) => {
      const $act = $(actEl);
      const activity = parseActivity($, $act);
      if (activity) activities.push(activity);
    });

    sections.push({ name: sectionName, activities });
  });

  return sections;
}
