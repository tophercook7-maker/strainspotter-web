# Mobile Testing Guide - StrainSpotter

## Quick Mobile Preview

### Option 1: Browser DevTools (Instant)

1. **Open the app in Chrome/Edge**
   ```
   http://localhost:4173
   ```

2. **Open DevTools**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

3. **Toggle Device Toolbar**
   - Press `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
   - Or click the phone/tablet icon in DevTools toolbar

4. **Test Different Devices**
   - Select from dropdown: iPhone 14 Pro, iPhone SE, Pixel 7, Galaxy S20, iPad
   - Or set custom dimensions (e.g., 375x667 for iPhone SE)

5. **Test Orientations**
   - Click rotation icon to test portrait/landscape
   - Verify tiles remain usable in both modes

### Option 2: Network Access (Test on Real Phone)

**Your preview server is already accessible on your network!**

1. **Find your Mac's IP address**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Example output: `inet 192.168.1.100`

2. **Open on your phone**
   - Make sure phone is on same WiFi network
   - Open browser on phone
   - Go to: `http://YOUR_IP:4173`
   - Example: `http://192.168.1.100:4173`

3. **Test all features**
   - Tap tiles (should be easy to tap)
   - Scroll smoothly
   - Forms work
   - Camera access (for scanner)

### Option 3: Capacitor iOS/Android App

**Build and run the native mobile app:**

```bash
# iOS (requires Xcode)
cd StrainSpotter_Starter_Integrated_v5
npm install
npx cap sync ios
npx cap open ios
# Then run in Xcode simulator or real device

# Android (requires Android Studio)
npx cap sync android
npx cap open android
# Then run in Android Studio
```

## Responsive Breakpoints

The app uses these breakpoints:

- **xs (mobile)**: 0-600px
  - 2 columns for tiles
  - Smaller text (0.8rem titles, 0.65rem captions)
  - minHeight: 110px
  
- **sm (tablet)**: 600-900px
  - 3 columns for tiles
  - Medium text (0.9rem titles, 0.75rem captions)
  - minHeight: 120px

- **md+ (desktop)**: 900px+
  - 4 columns for tiles
  - Full sizing

## Mobile-Specific Features to Test

### 1. Touch Interactions
- [ ] Tiles are easy to tap (not too small)
- [ ] No accidental double-taps
- [ ] Hover states work on tap (iOS Safari)
- [ ] Buttons have adequate spacing

### 2. Scanner (Camera)
- [ ] Camera permission prompt appears
- [ ] Camera stream displays correctly
- [ ] Photo capture works
- [ ] Image preview looks good
- [ ] Upload succeeds

### 3. Forms
- [ ] Keyboard doesn't cover inputs
- [ ] Form validates properly
- [ ] Submit buttons are reachable
- [ ] Error messages visible

### 4. Navigation
- [ ] Home button visible and tappable
- [ ] Scrolling is smooth
- [ ] No horizontal scroll (content fits)
- [ ] Back navigation works

### 5. Modals/Dialogs
- [ ] Dialogs fit on screen
- [ ] Close buttons accessible
- [ ] Content scrollable if needed

### 6. Performance
- [ ] Loads within 3 seconds on 4G
- [ ] Animations smooth (60fps)
- [ ] No layout shifts
- [ ] Images optimized

## Test Checklist (All Features)

### Core Features
- [ ] **Home** - All tiles visible and tappable
- [ ] **Scanner** - Camera access, capture, upload
- [ ] **Scan History** - List loads, items tappable
- [ ] **Strain Browser** - Search works, filters apply
- [ ] **Help** - All tiles work, navigation clear

### Commerce
- [ ] **Dispensaries** - Location access, map works
- [ ] **Seeds** - Links open correctly
- [ ] **Grower Directory** - List scrollable

### Community (Pro)
- [ ] **Groups & Chat** - Messages send/receive
- [ ] **Friends** - Request send/accept
- [ ] **Grow Coach** - Tabs work, content readable

### Settings/Admin
- [ ] **Membership Join** - Form submits
- [ ] **Feedback** - Message sends
- [ ] **Guidelines** - Scrollable, readable

## Common Mobile Issues & Fixes

### Issue: Tiles too big on phone
**Status:** ✅ Fixed - reduced minHeight to 110px (xs) / 120px (sm)

### Issue: Text too small to read
**Status:** ✅ Fixed - responsive font sizes (0.65rem to 0.9rem)

### Issue: Horizontal scroll
**Fix:** Check for fixed widths; use max-width: 100vw

### Issue: Keyboard covers inputs
**Fix:** Add `viewport-fit=cover` and handle safe areas

### Issue: Tap targets too small
**Fix:** Minimum 44x44px touch targets (MUI default)

## Quick Automated Checks

Run this in browser console to check viewport:

```javascript
// Check if content fits viewport
console.log('Viewport:', window.innerWidth, 'x', window.innerHeight);
console.log('Has horizontal scroll:', document.body.scrollWidth > window.innerWidth);

// Check tile sizes
const tiles = document.querySelectorAll('button[class*="MuiButtonBase"]');
console.log('Tiles found:', tiles.length);
tiles.forEach((tile, i) => {
  const rect = tile.getBoundingClientRect();
  console.log(`Tile ${i}:`, rect.width, 'x', rect.height);
});
```

## Performance Testing

### Lighthouse (Mobile)

1. Open DevTools
2. Click "Lighthouse" tab
3. Select:
   - ✅ Mobile
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
4. Click "Analyze page load"

**Target Scores:**
- Performance: >90
- Accessibility: >90
- Best Practices: >90

### Network Throttling

Test on slower connections:
1. DevTools → Network tab
2. Select throttling: "Fast 3G" or "Slow 3G"
3. Reload page
4. Verify loading states work

## Device-Specific Notes

### iOS Safari
- Test in both Safari and Chrome (different engines)
- Check safe area insets (notch/home indicator)
- PWA install prompt works
- Camera permissions

### Android Chrome
- Test gestures (back button, pull-to-refresh)
- Camera API compatibility
- Push notifications (if implemented)

### iPad/Tablets
- Verify 3-column grid looks good
- Landscape mode balanced
- Split-screen multitasking

## Results Summary

After testing, document here:

| Feature | Desktop | Mobile | Tablet | Issues |
|---------|---------|--------|--------|---------|
| Home | ✅ | ⏳ | ⏳ | |
| Scanner | ✅ | ⏳ | ⏳ | |
| History | ✅ | ⏳ | ⏳ | |
| Strains | ✅ | ⏳ | ⏳ | |
| Dispensaries | ✅ | ⏳ | ⏳ | |
| Groups | ✅ | ⏳ | ⏳ | |
| Forms | ✅ | ⏳ | ⏳ | |

## Next Steps

1. ✅ Reduced tile sizes (110-120px minHeight)
2. ✅ Added responsive font scaling
3. ⏳ Test on real device via network
4. ⏳ Run Lighthouse audit
5. ⏳ Fix any issues found
6. ⏳ Optional: Build Capacitor app for native testing
