# Strain Image Ingestion — Execution Roadmap

Realistic milestones for reaching 100,000 raw candidate images.

---

## Milestone 1: First 500 Strains

| Metric | Target |
|--------|--------|
| Strains | 500 |
| Raw images | ~5,000–10,000 |
| Staging candidates | ~2,000–4,000 |
| Approved references | ~500–1,000 (manual review) |

**Success looks like:**
- Pipeline runs end-to-end
- Raw → staging → review_queue works
- Manual approval flow exists
- At least 1 approved image per strain for 500 strains

**Focus:** Prove the pipeline; fix bottlenecks; validate source strategy.

---

## Milestone 2: First 5,000 Strains (Apple Launch Target)

| Metric | Target |
|--------|--------|
| Strains | 5,000 |
| Raw images | ~50,000–75,000 |
| Staging candidates | ~20,000–40,000 |
| Approved references | ~10,000–20,000 (review-assisted) |

**Success looks like:**
- Batch review tools in place
- Multiple sources feeding staging
- Clear metrics: pass rate, rejection reasons
- Scanner uses approved set

**Focus:** Scale ingestion; semi-automated review; quality monitoring.

---

## Milestone 3: First 50,000 Images

| Metric | Target |
|--------|--------|
| Raw images | 50,000 |
| Staging candidates | ~25,000 |
| Approved | ~15,000 |

**Success looks like:**
- Ingestion runs reliably
- Dedupe and quality filters tuned
- Embeddings generated for approved set

---

## Milestone 4: First 100,000 Raw Candidates

| Metric | Target |
|--------|--------|
| Raw images | 100,000 |
| Strains covered | 5,000+ |
| Staging candidates | ~50,000 |
| Approved | ~25,000+ |

**Success looks like:**
- High-volume pipeline stable
- Multiple source types integrated
- Review throughput sustainable
- Ready for further expansion
