#!/usr/bin/env python3
"""
Dataset Readiness Report — Strain Image Scanner Model
Reads image_pool.json, strain_images.json, optional image dirs.
Outputs DATASET_REPORT.md.

Run: python3 tools/dataset_readiness_report.py

Optional deps for full analysis (D: pHash, E: resolution):
  pip install Pillow imagehash
"""
from __future__ import annotations

import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

# Paths (project root)
ROOT = Path(__file__).resolve().parent.parent
POOL_PATH = ROOT / "image_pool.json"
ASSIGNMENTS_PATH = ROOT / "strain_images.json"
STRAIN_FILE = os.environ.get("DATASET_STRAINS_FILE", "/Volumes/TheVault/full_strains_35000.txt")
# Possible image dirs (scraper does NOT download; these are alternate pipelines)
IMAGE_DIRS = [
    ROOT / "data" / "strain_images",
    Path("/data/strain_images"),
    Path("/Volumes/TheVault/AI-Hero-Images"),
    ROOT / "tmp" / "dataset",
    Path(os.environ.get("DATASET_ROOT", "")),
]
OUTPUT_PATH = ROOT / "DATASET_REPORT.md"


def load_json(path: Path, default=None):
    if default is None:
        default = []
    if not path.exists():
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warn: {path}: {e}", file=sys.stderr)
        return default


def count_strains_from_txt(path: str | Path) -> int:
    p = Path(path)
    if not p.exists():
        return 0
    with open(p, "r", encoding="utf-8") as f:
        return sum(1 for line in f if line.strip())


def find_local_images() -> tuple[list[Path], Path | None]:
    """Return (list of image paths, root dir used)."""
    for d in IMAGE_DIRS:
        if not d or not d.exists() or not d.is_dir():
            continue
        images = []
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            images.extend(d.rglob(f"*{ext}"))
        if images:
            return images, d
    return [], None


def basename_from_url(url: str) -> str:
    try:
        return urlparse(url).path.rstrip("/").split("/")[-1] or url[:80]
    except Exception:
        return url[:80]


def main() -> None:
    pool = load_json(POOL_PATH, [])
    assignments = load_json(ASSIGNMENTS_PATH, [])
    local_images, img_root = find_local_images()
    total_strains = count_strains_from_txt(STRAIN_FILE)
    if total_strains == 0 and assignments:
        total_strains = len(set(a.get("strain_slug") for a in assignments if a.get("strain_slug")))

    # A) Inventory
    pool_urls = {p.get("image_url") for p in pool if p.get("image_url")}
    assign_urls = {a.get("image_url") for a in assignments if a.get("image_url")}
    missing_from_pool = assign_urls - pool_urls
    url_to_basename = {u: basename_from_url(u) for u in assign_urls}
    basename_to_urls: dict[str, list[str]] = defaultdict(list)
    for u in assign_urls:
        b = basename_from_url(u)
        basename_to_urls[b].append(u)
    duplicate_basenames = {b: urls for b, urls in basename_to_urls.items() if len(urls) > 1}

    # B) Images-per-strain
    strain_to_count: dict[str, int] = defaultdict(int)
    strain_to_assignments: dict[str, list[dict]] = defaultdict(list)
    for a in assignments:
        slug = a.get("strain_slug")
        if slug:
            strain_to_count[slug] += 1
            strain_to_assignments[slug].append(a)

    counts = list(strain_to_count.values()) or [0]
    n = len(counts)
    sorted_counts = sorted(counts)

    def pctile(p: float) -> float:
        if not sorted_counts:
            return 0
        idx = int((p / 100) * (n - 1)) if n > 1 else 0
        return float(sorted_counts[min(idx, n - 1)])

    mean = sum(counts) / n if n else 0
    median = pctile(50)
    dist_0 = sum(1 for c in counts if c == 0)
    dist_1 = sum(1 for c in counts if c == 1)
    dist_2 = sum(1 for c in counts if c == 2)
    dist_3_4 = sum(1 for c in counts if 3 <= c <= 4)
    dist_5_9 = sum(1 for c in counts if 5 <= c <= 9)
    dist_10_19 = sum(1 for c in counts if 10 <= c <= 19)
    dist_20_plus = sum(1 for c in counts if c >= 20)

    top_50_strains = sorted(strain_to_count.items(), key=lambda x: -x[1])[:50]

    # C) Label quality
    by_source: dict[str, int] = Counter()
    fallback_url_to_strains: dict[str, set[str]] = defaultdict(set)
    strains_only_fallback: set[str] = set()

    for a in assignments:
        src = a.get("assigned_from") or "unknown"
        by_source[src] += 1
        url = a.get("image_url")
        slug = a.get("strain_slug")
        if src == "fallback" and url and slug:
            fallback_url_to_strains[url].add(slug)

    for slug, asns in strain_to_assignments.items():
        if all((a.get("assigned_from") or "") == "fallback" for a in asns):
            strains_only_fallback.add(slug)

    total_assign = len(assignments)
    pct_exact = 100 * by_source.get("exact", 0) / total_assign if total_assign else 0
    pct_alias = 100 * by_source.get("alias", 0) / total_assign if total_assign else 0
    pct_parent = 100 * by_source.get("parent", 0) / total_assign if total_assign else 0
    pct_fallback = 100 * by_source.get("fallback", 0) / total_assign if total_assign else 0

    unique_fallback_urls = len(fallback_url_to_strains)
    top_50_reused = sorted(
        [(url, len(strains)) for url, strains in fallback_url_to_strains.items()],
        key=lambda x: -x[1],
    )[:50]

    # D) Dedup (only if local images)
    phash_note = ""
    dup_clusters: list[tuple[str, list[str]]] = []
    if local_images:
        try:
            import imagehash
            from PIL import Image
            hash_to_paths: dict[str, list[str]] = defaultdict(list)
            sample = local_images[: min(5000, len(local_images))]
            for p in sample:
                try:
                    with Image.open(p) as img:
                        h = str(imagehash.phash(img))
                    hash_to_paths[h].append(str(p))
                except Exception:
                    pass
            dup_clusters = [(h, paths) for h, paths in hash_to_paths.items() if len(paths) > 1][:20]
            n_dup = sum(len(paths) - 1 for _, paths in dup_clusters)
            pct_dup = 100 * n_dup / len(sample) if sample else 0
            phash_note = f"\n- Near-duplicate clusters: {len(dup_clusters)}; ~{pct_dup:.1f}% estimated duplicates in sample"
        except ImportError:
            phash_note = "\n- (imagehash not installed; pip install imagehash)"
    else:
        phash_note = "\n- **No local images.** Images are external URLs only; scraper does not download. Run a download step first, then re-run this script for pHash/dedup."

    # E) Resolution (only if local images)
    res_note = ""
    if local_images:
        try:
            from PIL import Image  # pip install Pillow
            widths, heights = [], []
            under_256, under_512, under_800 = 0, 0, 0
            bad = 0
            sample = local_images[: min(2000, len(local_images))]
            for p in sample:
                try:
                    with Image.open(p) as img:
                        w, h = img.size
                        s = min(w, h)
                        widths.append(w)
                        heights.append(h)
                        if s < 256:
                            under_256 += 1
                        if s < 512:
                            under_512 += 1
                        if s < 800:
                            under_800 += 1
                except Exception:
                    bad += 1
            n_ok = len(widths)
            res_note = f"""
- Width:  min={min(widths) if widths else 0}, median={sorted(widths)[len(widths)//2] if widths else 0}, mean={sum(widths)/len(widths):.0f if widths else 0}, max={max(widths) if widths else 0}
- Height: min={min(heights) if heights else 0}, median={sorted(heights)[len(heights)//2] if heights else 0}, mean={sum(heights)/len(heights):.0f if heights else 0}, max={max(heights) if heights else 0}
- Shortest side: <256px: {under_256}, <512px: {under_512}, <800px: {under_800}
- Corrupted/unreadable: {bad}
"""
        except ImportError as e:
            res_note = f"\n- Pillow not installed. Run `pip install Pillow` for resolution stats.\n"
        except Exception as e:
            res_note = f"\n- Error: {e}\n"
    else:
        res_note = "\n- **No local images.** The image_scraper_v2 stores URLs only (no downloads). Resolution analysis requires a download step (e.g. scripts/dataset/download.ts) or /Volumes/TheVault/AI-Hero-Images.\n"

    # F) Trainability
    exact_strains = sum(1 for asns in strain_to_assignments.values() if any((a.get("assigned_from") or "") == "exact" for a in asns))
    rec_good_35k = "No" if (mean < 2 or exact_strains < total_strains * 0.1) else "Marginal"
    rec_use = []
    if mean < 2:
        rec_use.append("weed vs not-weed binary classification")
    if pct_fallback > 50:
        rec_use.append("phenotype/style filters (many strains share fallback imagery)")
    if exact_strains > 1000:
        rec_use.append("limited strain recognition on subset with exact-match labels")
    rec_use_str = "; ".join(rec_use) if rec_use else "low-confidence strain hints only"
    rec_min = []
    if mean < 5:
        rec_min.append(f"more images per strain (current mean {mean:.1f})")
    if pct_fallback > 30:
        rec_min.append("exact-match targets for more strains")
    if not local_images:
        rec_min.append("download images and run deduplication")
    rec_min.append("quality filter (e.g. min 256px shortest side)")
    rec_min_str = "; ".join(rec_min)

    # Build report
    lines = [
        "# Dataset Readiness Report — Strain Image Scanner",
        "",
        "## 1) Data Locations",
        "",
        "| Item | Path |",
        "|------|------|",
        f"| Image pool metadata | `{POOL_PATH.relative_to(ROOT) if str(POOL_PATH).startswith(str(ROOT)) else POOL_PATH}` |",
        f"| Strain→image assignments | `{ASSIGNMENTS_PATH.relative_to(ROOT) if str(ASSIGNMENTS_PATH).startswith(str(ROOT)) else ASSIGNMENTS_PATH}` |",
        f"| Strain list input | `{STRAIN_FILE}` |",
        f"| Downloaded images dir | Scraper: none (URLs only). Alternate: `{img_root or 'none'}` |",
        "",
        "---",
        "",
        "## A) Inventory",
        "",
        f"- **Total strains:** {total_strains}",
        f"- **Total unique images on disk:** {len(set(local_images))}",
        f"- **Total images in pool metadata:** {len(pool)}",
        f"- **Total assignments:** {len(assignments)}",
        f"- **Missing images (in assignments but not pool):** {len(missing_from_pool)}",
        f"- **Duplicate basenames pointing to different URLs:** {len(duplicate_basenames)}",
        "",
        "---",
        "",
        "## B) Images-per-Strain Distribution",
        "",
        f"- Mean: {mean:.2f}, Median: {median:.0f}",
        f"- p10: {pctile(10):.0f}, p25: {pctile(25):.0f}, p75: {pctile(75):.0f}, p90: {pctile(90):.0f}",
        "",
        "| Bucket | Count |",
        "|--------|-------|",
        f"| 0 images | {dist_0} |",
        f"| 1 image | {dist_1} |",
        f"| 2 images | {dist_2} |",
        f"| 3–4 images | {dist_3_4} |",
        f"| 5–9 images | {dist_5_9} |",
        f"| 10–19 images | {dist_10_19} |",
        f"| 20+ images | {dist_20_plus} |",
        "",
        "### Top 50 Strains by Image Count",
        "",
        "| Rank | Strain | Images |",
        "|------|--------|--------|",
    ]
    for i, (slug, c) in enumerate(top_50_strains, 1):
        lines.append(f"| {i} | {slug} | {c} |")
    lines.extend([
        "",
        "---",
        "",
        "## C) Label Quality Signals",
        "",
        f"- Exact: {pct_exact:.1f}%",
        f"- Alias: {pct_alias:.1f}%",
        f"- Parent: {pct_parent:.1f}%",
        f"- Fallback: {pct_fallback:.1f}%",
        "",
        "### Fallback Analysis",
        "",
        f"- Unique fallback images: {unique_fallback_urls}",
        f"- Strains with only fallback images: {len(strains_only_fallback)}",
        "",
        "### Top 50 Most Reused Fallback Images (by strain count)",
        "",
        "| Rank | URL (truncated) | Strains |",
        "|------|-----------------|--------|",
    ])
    for i, (url, n) in enumerate(top_50_reused, 1):
        short = url[:70] + "..." if len(url) > 70 else url
        lines.append(f"| {i} | `{short}` | {n} |")
    lines.extend([
        "",
        "---",
        "",
        "## D) Deduping / Near-Duplicates",
        "",
        f"- Perceptual hash (pHash) analysis:{phash_note}",
        "",
    ])
    if dup_clusters:
        lines.append("### Top 20 Duplicate Clusters (representative paths)")
        lines.append("")
        for h, paths in dup_clusters[:20]:
            lines.append(f"- **{h}** (n={len(paths)}): `{paths[0][-60:]}`")
        lines.append("")
    lines.extend([
        "---",
        "",
        "## E) Image Quality / Resolution",
        "",
        f"{res_note}",
        "",
        "---",
        "",
        "## F) Trainability Recommendation",
        "",
        "### Is this dataset good for strain-classification across 35k classes?",
        "",
        f"**{rec_good_35k}.** With ~1 image per strain on average and high fallback reuse, discriminative strain classification across all 35k classes is not feasible.",
        "",
        "### If not, what is it good for?",
        "",
        f"{rec_use_str}",
        "",
        "### Minimum additional data / steps required",
        "",
        f"{rec_min_str}",
        "",
    ])

    report = "\n".join(lines)
    OUTPUT_PATH.write_text(report, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
