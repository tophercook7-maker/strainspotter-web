# Strain Database Setup

## Phase 5.0.1 — Real Strain Database

This directory should contain `strains.json` with 35,000+ strain entries.

### Requirements

- **Minimum:** 10,000 strains (hard fail if less)
- **Target:** 35,000+ strains for production accuracy
- **Format:** JSON array of strain objects

### File Location

Place your `strains.json` file in one of these locations:
- `lib/data/strains.json` (preferred for server-side)
- `public/data/strains.json` (for client-side fetch)

### Data Format

Each strain object should have:

```json
{
  "name": "Strain Name",
  "aliases": ["Alias 1", "Alias 2"],
  "genetics": "Parent 1 × Parent 2",
  "type": "Indica" | "Sativa" | "Hybrid",
  "visualProfile": {
    "trichomeDensity": "low" | "medium" | "high",
    "pistilColor": ["orange", "amber"],
    "budStructure": "low" | "medium" | "high",
    "leafShape": "narrow" | "broad",
    "colorProfile": "Description"
  },
  "terpeneProfile": ["myrcene", "caryophyllene", "pinene"],
  "effects": ["relaxation", "sedation"],
  "sources": ["Leafly", "AllBud"]
}
```

### Validation

The database loader will:
- ✅ Normalize all fields
- ✅ Log size on boot: `STRAIN DB SIZE: <count>`
- ❌ Hard fail if < 10,000 strains

### Example

See `strains.json.example` for a sample entry.

### Loading

The database is automatically loaded on app startup via `DatabaseInitializer` component in `app/layout.tsx`.

If the database file is not found, the system will:
1. Log a warning
2. Use fallback (12-15 legacy strains)
3. **Fail validation** (throws error if < 10,000 strains)

### Next Steps

1. Obtain 35,000+ strain dataset
2. Format as JSON array
3. Place in `lib/data/strains.json`
4. Restart app - database will load automatically
5. Check console for: `STRAIN DB SIZE: 35000+`
