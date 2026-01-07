import os
import json
from pathlib import Path

from PIL import Image

IMAGE_ROOT = Path("/data/strain_images")
OUTPUT_DIR = Path("ml/datasets/v1")
MIN_IMAGES = 20
MIN_SIZE = 224

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

dataset = []
rejected = []


def is_valid_image(path: Path) -> bool:
    try:
        with Image.open(path) as img:
            w, h = img.size
            return w >= MIN_SIZE and h >= MIN_SIZE
    except Exception:
        return False


for strain_dir in IMAGE_ROOT.iterdir():
    if not strain_dir.is_dir():
        continue

    strain_slug = strain_dir.name
    images = []

    for img_path in strain_dir.iterdir():
        if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        if is_valid_image(img_path):
            images.append(str(img_path))

    if len(images) >= MIN_IMAGES:
        dataset.append(
            {
                "strain_slug": strain_slug,
                "image_count": len(images),
                "images": images,
            }
        )
    else:
        rejected.append(
            {
                "strain_slug": strain_slug,
                "image_count": len(images),
                "reason": "insufficient_images",
            }
        )

with open(OUTPUT_DIR / "dataset_v1_manifest.json", "w") as f:
    json.dump(dataset, f, indent=2)

with open(OUTPUT_DIR / "rejected_strains.json", "w") as f:
    json.dump(rejected, f, indent=2)

with open(OUTPUT_DIR / "dataset_v1_stats.json", "w") as f:
    json.dump(
        {
            "total_strains_included": len(dataset),
            "total_strains_rejected": len(rejected),
            "min_images_required": MIN_IMAGES,
        },
        f,
        indent=2,
    )

print("✅ Dataset v1 audit complete")

