# Garden Console — End-to-End Verify

Goal: confirm `garden_sensor_readings` exists, ingest works, API returns latest, and `/garden` live tiles refresh.

## 0) Prereq: schema applied
Migration file should already exist:
- `supabase/migrations/20250211000004_garden_sensor_readings_columns.sql`

Apply migrations (preferred):
```bash
supabase db push
```
