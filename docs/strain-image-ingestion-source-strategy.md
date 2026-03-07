# Strain Image Ingestion — Source Strategy

**Target:** 5,000 strains before Apple launch; up to 100,000 raw candidate images.  
**Principle:** Raw scraped images never go straight to production. All third-party content flows through staging and review first.

---

## 1. Strain Libraries / Metadata Anchors

**What they are:** Structured catalogs with canonical strain names, lineage, and often metadata (THC/CBD, type, effects). Examples: Leafly-style databases, seed-bank catalogs, strain wikis.

| Aspect | Notes |
|--------|-------|
| **Best for** | Strain name authority, slug normalization, deduplication, linking images to canonical records |
| **Metadata quality** | High — names, types, lineage are curated |
| **Image usefulness** | Variable — some have hero images; many rely on user uploads or external links |
| **Crawl/storage risk** | Low for metadata-only. Medium if scraping images — respect robots.txt and rate limits |
| **Feeds** | Metadata → staging (strain_source_records). Images → staging only; promote to approved only after human review |

**Recommendation:** Use as the strain name backbone. Pull metadata first; images second. Never auto-promote images from these sources.

---

## 2. Breeder / Seed-Bank Sources

**What they are:** Official breeder sites, seed banks, dispensary product pages. Often have product photos (buds, packaging).

| Aspect | Notes |
|--------|-------|
| **Best for** | Product-quality bud shots, packaging images, strain-product association |
| **Metadata quality** | High — strain names tied to products |
| **Image usefulness** | High — curated product photography |
| **Crawl/storage risk** | Medium — commercial sites may restrict scraping. Respect robots.txt, low concurrency, clear attribution |
| **Feeds** | Raw → staging. Approve only after review. Best candidates for eventual approved reference set |

**Recommendation:** Primary target for bud and packaging images. Always store source attribution. Do not mirror images into production without explicit review.

---

## 3. Lower-Priority Expansion Sources

**What they are:** Community forums, social media, user-generated galleries, generic image search results.

| Aspect | Notes |
|--------|-------|
| **Best for** | Coverage when higher-quality sources lack images; variety (whole plant, leaf, trichome) |
| **Metadata quality** | Low — strain names often wrong or missing |
| **Image usefulness** | Mixed — some good, many off-topic or low quality |
| **Crawl/storage risk** | High — ToS, copyright, privacy. Many sites prohibit scraping |
| **Feeds** | Staging only. Treat as low-confidence until manually verified |

**Recommendation:** Use sparingly. Prioritize sources with permissive terms. Never auto-promote. Higher rejection rate expected.

---

## 4. Summary Table

| Source Type | Metadata | Images | Risk | Feeds Staging | Can Feed Approved |
|-------------|----------|--------|------|---------------|-------------------|
| Strain libraries | High | Variable | Low | Yes | After review |
| Breeder/seed-bank | High | High | Medium | Yes | After review |
| Expansion (forums, UGC) | Low | Mixed | High | Yes | After review only |

**Core rule:** No source type automatically feeds approved references. All images stay in staging until human or policy-based approval.
