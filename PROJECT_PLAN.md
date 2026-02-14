# Nile Arabic Learning Mobile App - Implementation Plan

## Project Overview

A mobile application for Arabic learning courses that syncs with nilecenter.online (Moodle platform), providing offline access to course content with automatic daily updates.

## Key Features

### 1. Authentication
- Login with Nile Center credentials (email: hashimdae141@gmail.com)
- Secure token storage using AsyncStorage
- Moodle Web Services API integration

### 2. Course Management
- Dashboard displaying all enrolled courses
- Course cards with progress indicators
- Pull-to-refresh to sync latest content
- Course detail view with lessons organized by units (7A, 7B, 8A, 8B, etc.)

### 3. Content Syncing
- Automatic sync with Moodle platform
- Fetch course contents, lessons, and resources
- Parse lesson structure and metadata
- Background sync with daily schedule
- Notifications for new content

### 4. Lesson Viewing
- Video player with controls (using expo-video)
- PDF viewer for documents
- Text content viewer
- Resource downloads (videos, PDFs, documents)
- Progress tracking and completion marking

### 5. Offline Support
- Local storage using AsyncStorage
- Downloaded content accessible offline
- Sync queue for pending updates

### 6. Settings & Preferences
- Auto-download new content toggle
- WiFi-only download option
- Video quality selection (auto, 720p, 480p, 360p)
- Push notifications toggle
- Theme selection (light, dark, auto)
- Language selection (English, Arabic)

### 7. Background Sync
- Daily automatic content checks
- Push notifications for new lessons
- Background fetch task registration

## Technical Architecture

### API Integration
- **Moodle Web Services API**: `https://nilecenter.online/webservice/rest/server.php`
- **Authentication**: Token-based using `moodle_mobile_app` service
- **Key Endpoints**:
  - `core_webservice_get_site_info`: Get user info
  - `core_enrol_get_users_courses`: Get enrolled courses
  - `core_course_get_contents`: Get course contents and lessons

### Data Storage
- **AsyncStorage**: Local key-value storage for:
  - User information
  - Courses and progress
  - Lessons and completion status
  - Downloaded resources metadata
  - User settings
  - Notifications

### File Structure
```
lib/
  moodle-api.ts          # Moodle API client
  storage.ts             # AsyncStorage service
  sync-service.ts        # Content syncing logic
  auth-context.tsx       # Authentication provider
  background-sync.ts     # Background tasks and notifications

app/
  login.tsx              # Login screen
  (tabs)/
    index.tsx            # Dashboard/home screen
    settings.tsx         # Settings screen
  course/[id].tsx        # Course detail screen
  lesson/[courseId]/[lessonId].tsx  # Lesson view screen

components/
  course-card.tsx        # Course card component
  screen-container.tsx   # Safe area wrapper
```

## Implementation Checklist

### Phase 1: Core Setup ✅
- [x] Custom app logo with Arabic calligraphy
- [x] App branding configuration
- [x] Project structure

### Phase 2: Authentication
- [ ] Moodle API client implementation
- [ ] Login screen UI
- [ ] Auth context provider
- [ ] Secure token storage
- [ ] Error handling

### Phase 3: Course Management
- [ ] Dashboard UI with course cards
- [ ] Fetch and display enrolled courses
- [ ] Course progress indicators
- [ ] Pull-to-refresh functionality
- [ ] Course detail screen
- [ ] Lessons organized by units

### Phase 4: Content Syncing
- [ ] Sync service implementation
- [ ] Parse Moodle course contents
- [ ] Extract lesson metadata
- [ ] Store content locally
- [ ] Handle content updates

### Phase 5: Lesson Viewing
- [ ] Lesson view screen
- [ ] Video player integration
- [ ] PDF viewer
- [ ] Text content display
- [ ] Resource list and download
- [ ] Completion tracking

### Phase 6: Settings & Preferences
- [ ] Settings screen UI
- [ ] User preferences storage
- [ ] Download settings
- [ ] Notification settings
- [ ] Theme and language selection
- [ ] Logout functionality

### Phase 7: Background Sync
- [ ] Background fetch task
- [ ] Daily sync schedule
- [ ] Push notifications
- [ ] Notification permissions
- [ ] Sync status indicators

### Phase 8: Polish & Testing
- [ ] UI refinements
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Haptic feedback
- [ ] Performance optimization

## Design Guidelines

### Color Scheme
- **Primary (Teal)**: `#0a7ea4` - Inspired by Nile Center branding
- **Background**: `#ffffff` (light) / `#151718` (dark)
- **Surface**: `#f5f5f5` (light) / `#1e2022` (dark)
- **Foreground**: `#11181C` (light) / `#ECEDEE` (dark)
- **Success**: `#22C55E`
- **Error**: `#EF4444`

### Typography
- **Display**: 24-32px, Bold
- **Heading**: 18-22px, Semibold
- **Body**: 14-16px, Regular
- **Caption**: 12-14px, Regular

### UI Patterns
- **Cards**: Rounded corners (16px), subtle shadows
- **Buttons**: Primary (teal background), Secondary (outlined)
- **Progress bars**: Animated, gradient fill
- **Transitions**: Smooth (250-300ms)
- **Haptic feedback**: Light impact on taps

## API Credentials

**Moodle Platform**: https://nilecenter.online
**Test Account**:
- Email: hashimdae141@gmail.com
- Password: 12345

## Next Steps

1. Implement Moodle API client with authentication
2. Create login screen and auth flow
3. Build dashboard with course syncing
4. Implement course detail and lesson views
5. Add background sync and notifications
6. Polish UI and test all features
7. Create final checkpoint for deployment

## Notes

- The app uses a local-first architecture with AsyncStorage for better offline performance
- Background sync ensures content is always up-to-date
- All video content is streamed, not downloaded by default
- Resources (PDFs, documents) can be downloaded for offline access
- The app supports both light and dark themes
- RTL support for Arabic content is built-in
