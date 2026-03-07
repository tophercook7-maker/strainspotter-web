# Strain Image Ingestion — Image Review Model

Rules for accepting or rejecting images before promotion to the reference layer.

---

## 1. Rejection Rules (Hard Failures)

| Rule | Threshold | Action |
|------|-----------|--------|
| **Blurry** | Laplacian variance < 100 (configurable) | Reject → `raw_sources/rejected/` |
| **Tiny** | Min dimension < 512px | Reject |
| **Too dark** | Mean brightness < 30 | Reject |
| **Heavy watermark** | Watermark coverage > threshold (ML or heuristic) | Reject |
| **Not cannabis** | Off-topic (memes, people, unrelated) | Reject |

---

## 2. Image Type Classification

| Type | Description | Priority |
|------|-------------|----------|
| `bud` | Close-up bud/flower | Primary matching |
| `whole_plant` | Full plant view | Context |
| `leaf` | Leaf close-up | Secondary |
| `trichome` | Trichome macro | Optional |
| `packaging` | Label, jar, bag | Brand/OCR |

Classification can be heuristic (filename/path) or AI. Stored in metadata for filtering and routing.

---

## 3. Watermark Handling

- **Light watermark:** Allow if cannabis subject is clear; note in metadata.
- **Heavy watermark:** Reject — obscures subject.
- **Detect:** Heuristic (edge density, corner logos) or ML model. Store `watermark_score` in metadata.

---

## 4. Source Attribution

Every image must carry:

- `source_url` — Original URL
- `source_site` — Domain or site identifier
- `source_record_id` — Link to `strain_source_records` if applicable

Required for audit and legal compliance.

---

## 5. Approval Status

| Status | Meaning |
|--------|---------|
| `pending` | In review queue, not yet decided |
| `approved` | Passed review; can be promoted to reference layer |
| `rejected` | Explicitly rejected; not promoted |

---

## 6. Quality Score

- **Range:** 0–1
- **Factors:** Sharpness, resolution, composition, relevance
- **Use:** Rank candidates; prefer higher scores when promoting.
