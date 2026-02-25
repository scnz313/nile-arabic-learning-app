# Bugs Found During Testing

## Critical Bugs

### 1. Flashcard SM-2 Algorithm Bug (Line 110)
**File**: `lib/flashcard-service.ts`
**Line**: 110
**Issue**: The SM-2 algorithm calculation is hardcoded with `(5 - 4)` which always equals 1. This should use the actual quality rating (0-5) passed by the user.
**Current Code**:
```typescript
progress.easeFactor = Math.max(1.3, progress.easeFactor + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)));
```
**Expected**: Should accept a quality parameter (0-5) from user rating
**Impact**: High - Spaced repetition won't work correctly
**Status**: NEEDS FIX

### 2. Flashcard ID Collision Risk
**File**: `lib/flashcard-service.ts`
**Line**: 44
**Issue**: Using `Date.now().toString()` for IDs can cause collisions if multiple flashcards are created in the same millisecond
**Current Code**:
```typescript
id: Date.now().toString(),
```
**Expected**: Use UUID or combination of timestamp + random
**Impact**: Medium - Rare but possible data corruption
**Status**: NEEDS FIX

## High Priority Bugs

### 3. Missing Error Boundaries
**Files**: All screen components
**Issue**: No error boundaries to catch React errors, app will crash completely on any render error
**Impact**: High - Poor user experience
**Status**: NEEDS FIX

### 4. No Network Error Handling in UI
**Files**: `app/(tabs)/index.tsx`, `app/course/[id].tsx`
**Issue**: Network errors are logged to console but not shown to user
**Impact**: High - Users don't know why content isn't loading
**Status**: NEEDS FIX

### 5. WebView Not Imported
**File**: `app/lesson/[id].tsx`
**Issue**: Code uses WebView but react-native-webview is imported, need to destructure WebView component
**Impact**: Critical - App will crash when trying to render WebView
**Status**: NEEDS IMMEDIATE FIX

## Medium Priority Bugs

### 6. Race Condition in Prefetch Service
**File**: `lib/prefetch-service.ts`
**Issue**: Multiple simultaneous prefetch calls could corrupt the queue
**Impact**: Medium - Prefetch might fail occasionally
**Status**: NEEDS FIX

### 7. Cache Size Calculation Inaccurate
**File**: `lib/webview-cache-service.ts`
**Issue**: Only counts file sizes, doesn't include AsyncStorage overhead
**Impact**: Low - Cache size display slightly inaccurate
**Status**: NICE TO FIX

### 8. No Pagination in Course List
**File**: `app/(tabs)/index.tsx`
**Issue**: Loading all courses at once, could be slow with many courses
**Impact**: Medium - Performance issue with 50+ courses
**Status**: NEEDS FIX

## Low Priority Bugs

### 9. Missing Loading States
**Files**: Multiple screens
**Issue**: Some screens don't show loading indicators during async operations
**Impact**: Low - UX issue
**Status**: NICE TO FIX

### 10. Inconsistent Error Messages
**Files**: Multiple
**Issue**: Error messages are technical (console.error) not user-friendly
**Impact**: Low - UX issue
**Status**: NICE TO FIX

## Testing Needed

- [ ] Test video playback on actual iOS device
- [ ] Test video playback on actual Android device
- [ ] Test offline mode thoroughly
- [ ] Test with slow network
- [ ] Test with 50+ courses
- [ ] Test with 100+ flashcards
- [ ] Test background sync
- [ ] Test notifications on device
- [ ] Test cache expiry
- [ ] Test concurrent operations

## Performance Issues

- [ ] Large course lists not virtualized properly
- [ ] Images not lazy loaded
- [ ] No debouncing on search
- [ ] Cache service reads entire cache on every check



## Fixed Bugs - Phase 1

### 1. Flashcard SM-2 Algorithm Bug ✅
**Fixed**: Changed `updateFlashcardProgress` to accept quality rating (0-5) instead of boolean
**File**: `lib/flashcard-service.ts`
**Impact**: Spaced repetition now works correctly

### 2. Flashcard ID Collision Risk ✅
**Fixed**: Added random string to timestamp for unique IDs
**File**: `lib/flashcard-service.ts`
**Impact**: No more ID collisions

### 3. Missing Error Boundaries ✅
**Fixed**: Created ErrorBoundary component and wrapped root app
**Files**: `components/error-boundary.tsx`, `app/_layout.tsx`
**Impact**: App won't crash completely on render errors

### 4. User-Friendly Error Messages ✅
**Fixed**: Created Toast component for notifications
**File**: `components/toast.tsx`
**Impact**: Users see friendly error messages instead of crashes

---

## Next: Continue testing and fixing remaining bugs
