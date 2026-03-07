# Strain Image Ingestion — Legal & Safety Model

Practical rules for safe, respectful, and legally compliant ingestion.

---

## 1. Crawl Restrictions

| Rule | Implementation |
|------|----------------|
| **Obey robots.txt** | Parse and respect `Disallow`; do not crawl forbidden paths |
| **Honor Crawl-delay** | If present, use that delay; otherwise default to ≥2s between requests per domain |
| **No aggressive concurrent requests** | Max 1–2 concurrent requests per domain |

---

## 2. Concurrency & Throttling

| Setting | Value | Reason |
|---------|-------|--------|
| Per-domain concurrency | 1–2 | Avoid overloading servers |
| Request delay | ≥2 seconds | Be a good netizen |
| Max requests per hour per domain | Configurable (e.g. 100) | Avoid abuse flags |

---

## 3. User-Agent & Identification

- **User-Agent:** Identify the bot, e.g. `StrainSpotter-Ingestion/1.0 (+https://strainspotter.app)` 
- **Purpose:** Allow site owners to contact or block if needed
- **No impersonation:** Do not pretend to be a browser or other service

---

## 4. Source Attribution

- Store `source_url` and `source_site` for every image
- Never strip attribution when promoting
- Enables takedown requests and accountability

---

## 5. Staging vs Approved

| Stage | Usage | Risk |
|-------|-------|------|
| **Staging** | Internal pipeline only; not shown to users | Raw third-party content; not production |
| **Approved** | Feeds reference layer; used by scanner | Must be reviewed; only after explicit approval |

**Rule:** Raw third-party images must not automatically become production references. Human or policy-based approval is required.

---

## 6. Why No Auto-Promotion

- **Copyright:** Scraped images are often copyrighted. We store for processing; promotion implies a decision to use as reference.
- **Quality:** Automated checks are not perfect. Review reduces bad data.
- **Liability:** Clear separation between "collected" and "used" limits exposure.
