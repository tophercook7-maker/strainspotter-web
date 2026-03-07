# Strain Image Ingestion — Vault Structure

**Base path:** `/Volumes/Vault/strainspotter-vault` or `/Volumes/TheVault/strainspotter-vault`  
**Principle:** Raw → Staging → Approved. Nothing skips staging.

---

## 1. Folder Layout

```
strainspotter-vault/
├── raw_sources/
│   ├── html/           # Raw HTML pages (scraped)
│   ├── json/           # Raw JSON/API responses
│   ├── images/         # Raw downloaded images by strain
│   │   └── {strain-slug}/
│   └── rejected/       # Quality-rejected images (blur, low-res, etc.)
│
├── staging/
│   ├── strain_source_records/   # Extracted source records (JSON)
│   └── candidate_strain_images/ # Images that passed quality + dedupe
│       └── {strain-slug}/
│
├── approved/
│   ├── vault_strains/           # Canonical strain records (JSON)
│   └── strain_reference_images/ # Approved reference images by type
│       ├── bud/
│       ├── whole_plant/
│       ├── leaf/
│       ├── trichome/
│       └── packaging/
│
├── embeddings/
│   ├── image_vectors/   # Image embeddings (for similarity search)
│   └── text_vectors/    # Text embeddings
│
├── review_queue/
│   ├── strains/        # Strains pending approval
│   └── images/         # Images pending approval
│
├── logs/               # Pipeline run logs
└── schema/             # JSON schemas for records
```

---

## 2. Image Flow: Raw → Staging → Approved

```
[External Source]
       │
       ▼
raw_sources/html | json | images
       │
       │  (extraction, download)
       ▼
raw_sources/images/{strain-slug}/
       │
       │  (quality filter)  ────────► raw_sources/rejected/
       │
       ▼
staging/candidate_strain_images/{strain-slug}/
       │
       │  (review)  ────────────────► rejected / deleted
       │
       ▼
review_queue/images/
       │
       │  (approval)
       ▼
approved/strain_reference_images/{type}/
       │
       │  (embedding generation)
       ▼
embeddings/image_vectors/
```

---

## 3. Record Flow

| Stage | Content | Format |
|-------|---------|--------|
| Raw HTML/JSON | Pages, API responses | `.html`, `.json` |
| Raw images | Downloaded files | `.jpg`, `.png`, `.webp` + `.meta.json` |
| Source records | Extracted metadata per source | JSON in `staging/strain_source_records/` |
| Candidate images | Quality-passed, deduped | Same structure as raw + `.meta.json` |
| Approved images | Human-approved only | Organized by type in `approved/strain_reference_images/` |

---

## 4. Key Rules

1. **Raw** = unverified. Never used by the scanner.
2. **Staging** = passed automated checks. Still not used by the scanner.
3. **Approved** = human-reviewed or policy-approved. Only these feed the reference layer.
4. **Rejected** = quality failures; kept for audit, not promoted.
