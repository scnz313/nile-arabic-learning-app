# Project TODO

- [x] Generate custom app logo
- [x] Update app.config.ts branding
- [x] Update theme colors (teal/gold Arabic theme)
- [x] Create Moodle API client (login, courses, contents)
- [x] Create local storage service (AsyncStorage)
- [x] Create auth context provider
- [x] Build login screen UI
- [x] Wire auth flow in root layout (redirect to login if not authenticated)
- [x] Build dashboard home screen with course cards
- [x] Implement pull-to-refresh course sync
- [x] Build course detail screen with lessons by section
- [x] Build lesson view screen with video/PDF/text support
- [x] Build settings screen (profile, preferences, logout)
- [x] Add settings tab to tab bar with icon mapping
- [x] Create sync service for fetching course contents
- [x] Add background sync and notifications
- [x] Add haptic feedback throughout
- [x] Test all flows end-to-end

- [x] Fix login page UI and functionality
- [x] Verify auth flow works end-to-end
- [x] Fix any navigation issues after login
- [x] Verify course dashboard loads after login

## REBUILD - Full Content App
- [x] Deep-scrape all content types from website (text, images, quizzes, assignments, videos)
- [x] Build comprehensive server scraper for all content extraction
- [x] Display all lesson text content natively in-app (no browser needed)
- [x] Render images inline within lessons
- [x] Build native quiz interface
- [x] Build assignment viewer
- [x] Build forum/announcements viewer
- [x] Organize courses by proper categories/sections
- [x] Premium dashboard UI with course overview cards
- [x] Rich lesson viewer with formatted text, images, headings
- [x] Video player embedded in lessons
- [x] Progress tracking that updates across all screens
- [x] Daily sync to detect new content from teacher
- [x] Offline content caching
- [x] Beautiful minimalistic design throughout

## V3 - Full Scraper/Archiver App
- [x] Remove ALL "Open in Browser" / "Open in Web" buttons
- [x] Render videos in-app (no external browser)
- [x] Render quizzes in-app via embedded WebView
- [x] Render interactive H5P content in-app via WebView
- [x] Render assignments in-app
- [x] Render forums/announcements in-app
- [x] Render all links content in-app
- [x] Build persistent archive storage (never delete old data)
- [x] Append-only data model: new content added, old content preserved
- [x] Handle teacher hiding content: keep archived copy
- [x] Track content visibility status (visible/hidden by teacher)
- [x] Make app future-proof for any new courses (dynamic, not hardcoded)
- [x] Auto-detect new courses when syncing
- [x] Show "archived" badge on content hidden by teacher
- [x] Deep-scrape all page content including embedded media
- [x] Deep-scrape video URLs for in-app playback
- [x] Store scraped HTML content for offline rendering

## V4 - Modern UI Redesign & Bug Fixes
- [x] Research modern learning app UI patterns (Duolingo, Coursera, Khan Academy)
- [x] Redesign dashboard with modern card layouts
- [x] Add smooth animations and transitions
- [x] Add loading skeletons for better UX
- [x] Redesign course detail screen with proper spacing
- [x] Redesign lesson viewer with modern typography
- [x] Fix video playback — videos must play in-app with native player
- [x] Fix image visibility — proper sizing, aspect ratios, loading states
- [x] Add haptic feedback throughout
- [x] Make all interactions smooth and responsive
- [x] Add pull-to-refresh animations
- [ ] Add empty states and error states
- [ ] Improve color palette and contrast
- [x] Add proper loading indicators

## Course Enrollment Investigation
- [ ] Investigate Moodle course catalog and available courses
- [ ] Test self-enrollment endpoints
- [ ] Check for guest access options
- [ ] Find enrollment keys or automatic enrollment methods
- [ ] Implement bulk enrollment feature in app
- [ ] Update sync service to discover and enroll in new courses automatically

## V5 - Comprehensive Learning Features
- [x] Flashcard system for vocabulary practice (service created)
- [ ] Quiz mode with multiple choice questions
- [x] Progress tracking with statistics and charts
- [x] Bookmarking favorite lessons
- [x] Note-taking within lessons
- [ ] Search functionality across all courses
- [x] Audio playback speed control (in settings)
- [ ] Repeat/loop audio sections
- [ ] Offline download manager for lessons
- [ ] Dark mode toggle
- [x] Font size adjustment
- [x] Arabic text display options (with/without diacritics)
- [ ] Custom study schedules

## V6 - Search, Flashcards, and Offline Downloads
- [x] Add search bar to dashboard
- [x] Implement search filtering for courses and lessons
- [x] Create flashcard practice screen
- [x] Implement spaced repetition algorithm
- [x] Add flashcard flip animation
- [x] Build offline download manager service
- [x] Add download progress indicators
- [x] Implement offline content viewer
- [x] Add download/delete buttons to lessons

## V7 - Vocabulary Extraction, Study Reminders, and Quiz Mode
- [x] Implement Arabic word extraction from lesson content
- [x] Create vocabulary service to manage extracted words
- [x] Add one-tap "Create Flashcard" button for vocabulary
- [x] Build vocabulary list view in lessons
- [x] Implement study reminder service with notifications
- [x] Add reminder settings screen (time, frequency, days)
- [x] Create notification scheduler for daily reminders
- [x] Add streak tracking and motivation messages
- [x] Build quiz mode service with question generation
- [x] Create quiz screen with multiple choice questions
- [x] Add true/false question type
- [x] Add fill-in-the-blank question type
- [x] Implement quiz scoring and results screen
- [x] Add quiz history and progress tracking

## V8 - Fix In-App Content Display (Critical Bug Fixes)
- [x] Fix video playback - videos must play in-app, not open browser
- [x] Remove all WebBrowser.openBrowserAsync calls (replaced with WebView)
- [x] Replace external links with in-app viewers
- [x] Add WebView for all content types on native (videos, H5P, quizzes, assignments, forums, URLs)
- [x] Ensure images display in-app (using expo-image with blurhash)
- [x] Handle interactive H5P content in-app (WebView with JavaScript enabled)
- [x] Install react-native-webview package
- [x] Verify no external browser opens for any content

## V9 - Performance Optimizations (Caching, Progress, Prefetching)
- [x] Implement WebView caching service
- [x] Add cache storage management (max 100MB, 7-day expiry)
- [x] Enable offline access for cached content
- [x] Add download progress indicator component
- [x] Show file size estimates for media
- [x] Add cancel button for downloads
- [x] Implement content prefetching service
- [x] Automatically preload next lesson in background (triggered on completion)
- [x] Add prefetch queue with priority system
- [x] Integrate prefetching into lesson completion flow
- [ ] Test caching performance
- [ ] Test offline access
- [ ] Test prefetching behavior
