# No-Reinstall Update System

StrainSpotter uses a continuous update system that ensures users never need to reinstall the desktop or mobile app.

## Desktop Strategy (Tauri)

The desktop app loads the UI from a remote production URL, not bundled assets:

**Configuration** (`src-tauri/tauri.conf.json`):
```json
{
  "build": {
    "devUrl": "https://app.strainspotter.app",
    "frontendDist": "https://app.strainspotter.app"
  }
}
```

**Key Points:**
- ✅ Desktop app loads UI from `https://app.strainspotter.app`
- ✅ No static frontend assets bundled in the app
- ✅ Changes to the web app are immediately reflected in desktop
- ✅ No auto-updater needed (UI updates automatically)
- ✅ App handles reload gracefully via Tauri's webview

## Web Strategy

The Next.js app is the single source of truth:

- All routes remain stable
- All logic lives server-side or via APIs
- Client-side code is minimal and stateless
- Updates deploy instantly via Vercel/Netlify

## Feature Flags

Feature flags allow instant rollback and gradual feature rollout without code changes.

### Database Schema

Feature flags are stored in the `feature_flags` table:

```sql
CREATE TABLE feature_flags (
  id uuid PRIMARY KEY,
  flag_key text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  user_id uuid, -- Optional: per-user targeting
  cohort text,  -- Optional: per-cohort targeting (e.g., 'elite', 'pro')
  created_at timestamp,
  updated_at timestamp
);
```

### Available Flags

- `enable_grow_notes` - Grow Notes feature
- `enable_news_sources_v2` - Enhanced news sources
- `enable_enriched_scans` - Enriched scan results
- `enable_scan_topups` - Scan top-up packages
- `enable_community_intelligence` - Community intelligence loop
- `enable_visual_matching` - Visual strain matching

### Usage

**Client-side:**
```typescript
import { isFeatureEnabled } from '@/lib/featureFlags';

const enabled = await isFeatureEnabled('enable_grow_notes', false);
if (enabled) {
  // Show feature
}
```

**Server-side:**
```typescript
import { isFeatureEnabled } from '@/app/api/_utils/featureFlags';

const enabled = await isFeatureEnabled('enable_grow_notes', userId, userCohort, false);
```

**Component wrapper:**
```tsx
import FeatureFlag from '@/components/FeatureFlag';

<FeatureFlag flag="enable_grow_notes">
  <GrowNotesFeature />
</FeatureFlag>
```

### API Endpoints

- `GET /api/feature-flags` - Get all flags for current user
- `GET /api/feature-flags/[flag]` - Check specific flag

### Flag Evaluation

Flags are evaluated in this order:
1. User-specific flag (if `user_id` matches)
2. Cohort-specific flag (if `cohort` matches)
3. Global flag (if `user_id` and `cohort` are null)

If any level is enabled, the flag returns `true`.

### Safety Features

- ✅ All flags default to `false` (fail-safe)
- ✅ Errors return `false` (never crash)
- ✅ Flags are cached for 5 minutes (performance)
- ✅ Server-side evaluation is atomic (no race conditions)

## Rollback Safety

### Instant Disable

To disable a feature:
```sql
UPDATE feature_flags 
SET enabled = false 
WHERE flag_key = 'enable_grow_notes';
```

The feature disappears immediately for all users.

### Clean UI Hiding

Features wrapped in `<FeatureFlag>` automatically hide when disabled:
- No broken links
- No 404 errors
- No UI glitches
- Graceful degradation

### No Hard Dependencies

Features are designed to be independent:
- No cross-feature dependencies
- Each feature can be disabled independently
- UI adapts automatically

## Verification

### Desktop App

1. ✅ Desktop app loads from `https://app.strainspotter.app`
2. ✅ Changes to web app reflect immediately
3. ✅ No reinstall required for UI updates
4. ✅ App handles reload gracefully

### Feature Flags

1. ✅ Flags default to `false`
2. ✅ Errors fail safely
3. ✅ UI hides disabled features cleanly
4. ✅ Flags can be toggled instantly

### Stability

1. ✅ App remains stable when flags toggle
2. ✅ No crashes on flag errors
3. ✅ No broken links or 404s
4. ✅ Graceful degradation

## Admin Operations

### Enable a Feature Globally

```sql
UPDATE feature_flags 
SET enabled = true 
WHERE flag_key = 'enable_grow_notes' 
  AND user_id IS NULL 
  AND cohort IS NULL;
```

### Enable for Specific User

```sql
INSERT INTO feature_flags (flag_key, enabled, user_id)
VALUES ('enable_grow_notes', true, 'user-uuid-here');
```

### Enable for Cohort

```sql
INSERT INTO feature_flags (flag_key, enabled, cohort)
VALUES ('enable_grow_notes', true, 'elite');
```

### Disable Feature

```sql
UPDATE feature_flags 
SET enabled = false 
WHERE flag_key = 'enable_grow_notes';
```

## Best Practices

1. **Always default to `false`** - New features should be disabled by default
2. **Fail safely** - Errors should return `false`, never crash
3. **Cache flags** - Use client-side caching for performance
4. **Test rollback** - Verify features hide cleanly when disabled
5. **Document flags** - Add descriptions to the database
6. **Monitor usage** - Track which flags are enabled for which users
