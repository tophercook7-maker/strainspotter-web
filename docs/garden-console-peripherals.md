# Garden Console: peripheral hookups and device roles

**Implemented shape** (not a tutorial). Next steps after console ships.

## Ingest and device roles

- **Ingest endpoint:** Add an endpoint (Express backend or Next API route) that writes rows to `garden_sensor_readings`. Accept `garden_id`, optional `plant_id`, `source`, and column fields (`temp_f`, `rh`, `vpd`, `ph`, `nitrogen_ppm`, `phosphorus_ppm`, `potassium_ppm`, `recorded_at`). Validate and insert; same-origin or authenticated.
- **Desktop:** Can run local collectors (USB / Bluetooth / Wi‑Fi devices) that POST readings to that backend. Desktop can later get dedicated "hardware hookup" setup UIs.
- **Phone:** Stays read-only (or manual entry only). No local collectors. Phone still sees live updates because the console tiles poll the same-origin API, which reads from `garden_sensor_readings`.

## Seed a manual reading for testing

Run in the **Supabase SQL editor**. Replace `<public_garden_id>` with your Public Garden id (e.g. from `SELECT id FROM gardens WHERE user_id IS NULL LIMIT 1`).

```sql
INSERT INTO garden_sensor_readings (garden_id, source, recorded_at, temp_f, rh, vpd, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm)
VALUES (
  '<public_garden_id>',
  'manual',
  now(),
  74.2,
  58,
  1.2,
  6.2,
  820,
  NULL,
  NULL
);
```

After running, the Garden Console "Latest environment" tile should show these values on the next refresh (or within the client poll interval).

## Ingest API (POST) with shared secret

The ingest endpoint is protected by a shared secret. Set `GARDEN_CONSOLE_INGEST_KEY` in `.env.local`. Clients must send it in the `x-ingest-key` header. In production, if the env key is missing, all requests are denied.

**Example (replace `YOUR_INGEST_KEY` with the value of `GARDEN_CONSOLE_INGEST_KEY`):**

```bash
curl -s -X POST http://localhost:3000/api/garden/console/ingest \
  -H "Content-Type: application/json" \
  -H "x-ingest-key: YOUR_INGEST_KEY" \
  -d '{"temp_f":74.2,"rh":58,"vpd":1.2,"ph":6.2,"nitrogen_ppm":820,"source":"manual"}'
```

Expected response: `{"ok":true,"id":"<uuid>"}`. Without the header or with a wrong key: `401` and `{"error":"unauthorized"}`.
