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
