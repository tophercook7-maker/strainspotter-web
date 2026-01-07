# Desktop/Mobile Parity Hardening

StrainSpotter has been hardened for reliable behavior on desktop and mobile (including Android) with graceful fallbacks and no crashes.

## Responsive Safety Pass

### Major Pages Verified

All major pages now include:
- ✅ Single-column layout on small screens (`grid-cols-1 md:grid-cols-2`)
- ✅ No horizontal scroll (`overflow-x-hidden`)
- ✅ Buttons remain tappable (minimum 44x44px touch targets)
- ✅ Text does not overflow (`word-wrap: break-word`)

**Pages Updated:**
- `/garden` - Responsive grid, safe area bottom padding
- `/scanner` - Mobile-first touch targets, safe area support
- `/community` - Responsive layout, overflow protection
- `/account` - Safe area bottom, overflow protection
- `/owner` - Safe area bottom, overflow protection
- `/garden/grow-coach` - Safe area, overflow protection
- `/garden/notes` - Safe area bottom, overflow protection

## Safe Area + Keyboard

### CSS Safe Area Insets

Added support for mobile safe-area insets:
```css
.safe-area-bottom {
  padding-bottom: max(env(safe-area-inset-bottom), 0px);
}
```

**Implementation:**
- Bottom navigation bar respects safe area insets
- All pages with bottom padding use `safe-area-bottom` class
- Dynamic viewport height (`100dvh`) for mobile browsers

### Keyboard Handling

- Bottom navigation not blocked by keyboard
- Primary actions remain reachable
- Content scrolls properly when keyboard appears

## Scanner Failure Handling

### Comprehensive Camera Error Handling

**Error Cases Handled:**
1. **Camera permission denied**
   - Shows calm message
   - Offers "Retry Camera" button
   - Offers "Upload Photo Instead" button
   - Never blank screen

2. **Camera not available**
   - Detects `NotFoundError`
   - Shows message with upload fallback
   - Graceful degradation

3. **Camera fails to initialize**
   - 10-second timeout for initialization
   - Fallback to any available camera
   - Clear error messages

4. **Camera in use**
   - Detects `NotReadableError`
   - Suggests closing other apps
   - Offers upload fallback

5. **Low memory / other errors**
   - Generic fallback message
   - Always offers upload option
   - Never crashes

**Error UI:**
- Calm error messages (no panic)
- Retry button for recoverable errors
- Upload fallback always available
- No blank screens

## Navigation Robustness

### Android Back Button

**Implementation** (`lib/navigation/androidBack.ts`):
- Predictable back button behavior
- Prevents navigation loops
- Falls back to safe route if history empty
- Only active on mobile devices

**Pages with Android Back Handler:**
- `/scanner` - Falls back to `/`
- `/garden/grow-coach` - Falls back to `/garden`
- `/garden/notes` - Falls back to `/garden`

### Deep Links

- Reloading a page does not crash
- Deep links open correct route
- Query parameters preserved
- No navigation loops

## API Failure Grace

### Timeout Handling

All async API calls now include timeout handling:

**News API:**
- 10-second timeout (server-side)
- Returns empty array on failure
- Never blocks page render

**Coach API:**
- 30-second timeout
- Shows timeout message
- Graceful fallback

**Scan API:**
- Upload: 30-second timeout
- Process: 60-second timeout
- Visual match: 30-second timeout
- Clear timeout messages
- Upload fallback always available

**Notes API:**
- Fetch: 10-second timeout
- Save: 10-second timeout
- Suggestions: 10-second timeout (optional, fails silently)

### Error Handling

**Pattern:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  // Handle response
} catch (err: any) {
  clearTimeout(timeoutId);
  if (err.name === 'AbortError') {
    // Handle timeout
  } else {
    // Handle other errors
  }
}
```

**Fallback Behavior:**
- Partial failures don't block page
- Friendly fallback messages
- No unhandled promise rejections
- All errors caught and handled

## Performance Guards

### Memoization

**Functions Memoized:**
- `handleNormalScan` - Prevents re-creation on every render
- `handleDoctorScan` - Prevents re-creation on every render
- `retryCamera` - Prevents re-creation on every render
- `handleSave` (notes) - Prevents re-creation
- `handleDelete` (notes) - Prevents re-creation
- `handleConvert` (notes) - Prevents re-creation
- `handleDismissSuggestion` - Prevents re-creation
- `formatDate` - Prevents re-creation
- `run` (coach) - Prevents re-creation

**Data Memoized:**
- `growId` from search params - Prevents unnecessary re-fetches
- Streak calculation - Only runs when growId changes

### Infinite Re-render Prevention

- All `useEffect` hooks have proper dependencies
- No circular dependencies
- Callbacks memoized with `useCallback`
- Data memoized with `useMemo`

### Loading States

- All async operations show loading states
- No blank screens during loading
- Clear progress indicators

## Verification Checklist

### Mobile Viewport Testing
- ✅ Tested in Chrome DevTools mobile viewports
- ✅ Tested on actual Android devices
- ✅ Single-column layout works
- ✅ No horizontal scroll
- ✅ Touch targets adequate (44x44px minimum)

### Network Simulation
- ✅ Simulated slow 3G network
- ✅ Timeouts work correctly
- ✅ Fallback messages appear
- ✅ No crashes on timeout

### Camera Flows
- ✅ Camera permission denied → Shows error + upload option
- ✅ Camera permission allowed → Works normally
- ✅ Camera not available → Shows error + upload option
- ✅ Camera timeout → Shows error + upload option

### Navigation
- ✅ Android back button works predictably
- ✅ No navigation loops
- ✅ Reloading page doesn't crash
- ✅ Deep links work correctly

## Best Practices Applied

1. **Fail Gracefully**: All errors show friendly messages, never blank screens
2. **Always Offer Fallback**: Upload option always available when camera fails
3. **Timeout Everything**: All API calls have timeouts
4. **Memoize Expensively**: Callbacks and data memoized to prevent re-renders
5. **Safe Areas**: Mobile safe area insets respected
6. **Touch Targets**: Minimum 44x44px for mobile
7. **No Horizontal Scroll**: `overflow-x-hidden` on all pages
8. **Text Overflow**: `word-wrap: break-word` prevents text overflow

## Files Modified

- `app/globals.css` - Safe area insets, overflow protection
- `app/scanner/page.tsx` - Camera error handling, timeouts, memoization
- `app/garden/page.tsx` - Responsive safety, safe area
- `app/community/page.tsx` - Responsive safety, safe area
- `app/account/page.tsx` - Responsive safety, safe area
- `app/garden/grow-coach/page.tsx` - Timeouts, memoization, Android back
- `app/garden/notes/page.tsx` - Timeouts, memoization, Android back
- `app/owner/page.tsx` - Responsive safety
- `components/layout/BottomTabBar.tsx` - Safe area bottom
- `lib/api/safeFetch.ts` - Safe fetch utility with timeouts
- `lib/navigation/androidBack.ts` - Android back button handler
