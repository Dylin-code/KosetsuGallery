#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return ascii_text


def parse_title_subtitle(existing: str) -> tuple[str | None, str | None]:
    title_match = re.search(r"export\s+const\s+TITLE\s*=\s*['\"](.+?)['\"]\s*;", existing)
    subtitle_match = re.search(r"export\s+const\s+SUBTITLE\s*=\s*['\"](.+?)['\"]\s*;", existing)
    return (
        title_match.group(1) if title_match else None,
        subtitle_match.group(1) if subtitle_match else None,
    )


def guess_title_from_dir(plan_dir: Path) -> str:
    return plan_dir.name.replace("-", " ").strip() or "成品展示"


def safe_stem(original_stem: str, fallback: str) -> str:
    slug = slugify(original_stem)
    return slug or fallback


def iter_images(dir_path: Path) -> list[Path]:
    if not dir_path.exists():
        return []
    return sorted(
        [p for p in dir_path.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS],
        key=lambda p: p.name.lower(),
    )


def parse_leading_order(stem: str) -> int | None:
    m = re.match(r"^\s*(\d{1,5})\s*[-_. ]", stem)
    if not m:
        m = re.match(r"^\s*(\d{1,5})\s*$", stem)
    return int(m.group(1)) if m else None


@dataclass(frozen=True)
class ImageEntry:
    src: Path
    full_name: str
    thumb_name: str
    order: int


def compute_entries(images: list[Path]) -> list[ImageEntry]:
    used_names: set[str] = set()
    entries: list[ImageEntry] = []

    def unique_name(base: str, ext: str) -> str:
        candidate = f"{base}{ext}"
        n = 2
        while candidate.lower() in used_names:
            candidate = f"{base}-{n}{ext}"
            n += 1
        used_names.add(candidate.lower())
        return candidate

    # Determine ordering: use leading numeric prefix if present; else stable by filename.
    with_orders: list[tuple[int | None, Path]] = [(parse_leading_order(p.stem), p) for p in images]
    has_any_prefix = any(o is not None for o, _ in with_orders)
    if has_any_prefix:
        with_orders.sort(key=lambda t: (t[0] is None, t[0] if t[0] is not None else 10**9, t[1].name.lower()))
    else:
        with_orders.sort(key=lambda t: t[1].name.lower())

    assigned_order = 1
    for maybe_order, path in with_orders:
        order = maybe_order if maybe_order is not None else assigned_order
        assigned_order = max(assigned_order, order + 1)

        base = f"{order:03d}-" + safe_stem(path.stem, fallback=f"img-{order:03d}")
        base = re.sub(r"-{2,}", "-", base).strip("-")

        full_name = unique_name(base, path.suffix.lower())
        thumb_name = unique_name(base, ".webp")
        entries.append(ImageEntry(src=path, full_name=full_name, thumb_name=thumb_name, order=order))

    # Ensure order field is strictly increasing in data.js even if prefixes skipped.
    entries.sort(key=lambda e: (e.order, e.src.name.lower()))
    normalized = []
    for idx, e in enumerate(entries, start=1):
        base = re.sub(r"^\d{3}-", f"{idx:03d}-", Path(e.full_name).stem)
        base = re.sub(r"-{2,}", "-", base).strip("-")
        # Re-uniquify after normalization
        full_name = f"{base}{Path(e.full_name).suffix.lower()}"
        thumb_name = f"{base}.webp"
        normalized.append(ImageEntry(src=e.src, full_name=full_name, thumb_name=thumb_name, order=idx))

    # Handle collisions post-normalization
    final_used: set[str] = set()
    final_entries: list[ImageEntry] = []
    for e in normalized:
        base = Path(e.full_name).stem
        ext = Path(e.full_name).suffix.lower()

        def uniq(base2: str, ext2: str) -> str:
            candidate = f"{base2}{ext2}"
            n = 2
            while candidate.lower() in final_used:
                candidate = f"{base2}-{n}{ext2}"
                n += 1
            final_used.add(candidate.lower())
            return candidate

        full_name = uniq(base, ext)
        thumb_name = uniq(base, ".webp")
        final_entries.append(ImageEntry(src=e.src, full_name=full_name, thumb_name=thumb_name, order=e.order))

    return final_entries


def rename_files(entries: list[ImageEntry], full_dir: Path, dry_run: bool) -> dict[Path, Path]:
    # Rename via temp names to avoid collisions.
    mapping: dict[Path, Path] = {}
    temp_suffix = ".tmp_rename"

    # Stage 1: move originals to temp
    staged: list[tuple[Path, Path]] = []
    for e in entries:
        src = e.src
        if src.parent != full_dir:
            raise ValueError(f"Expected full images in {full_dir}, got {src}")
        tmp = full_dir / f"{src.name}{temp_suffix}"
        staged.append((src, tmp))

    if not dry_run:
        for src, tmp in staged:
            if tmp.exists():
                tmp.unlink()
            src.rename(tmp)

    # Stage 2: move temps to final names
    for e, (_, tmp) in zip(entries, staged):
        dst = full_dir / e.full_name
        mapping[tmp] = dst
        if not dry_run:
            tmp.rename(dst)

    return {src: (full_dir / e.full_name) for e, (src, _) in zip(entries, staged)}


def generate_thumbs(entries: list[ImageEntry], full_dir: Path, thumbs_dir: Path, size: int, center_y: float, quality: int, dry_run: bool) -> None:
    if dry_run:
        return

    for e in entries:
        src_full = full_dir / e.full_name
        out_thumb = thumbs_dir / e.thumb_name

        with Image.open(src_full) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")
            # Square crop with slight top bias to reduce face cut-off.
            thumb = ImageOps.fit(img, (size, size), method=Image.Resampling.LANCZOS, centering=(0.5, center_y))
            out_thumb.parent.mkdir(parents=True, exist_ok=True)
            thumb.save(out_thumb, "WEBP", quality=quality, method=6)


def write_data_js(plan_dir: Path, entries: list[ImageEntry], title: str, subtitle: str, dry_run: bool) -> None:
    lines = []
    lines.append(f"export const TITLE = {title!r};")
    lines.append(f"export const SUBTITLE = {subtitle!r};")
    lines.append("")
    lines.append("// 依 order 由小到大排序（沒有 order 會排最後）")
    lines.append("export const IMAGES = [")
    for e in entries:
        full = f"./full/{e.full_name}"
        thumb = f"./thumbs/{e.thumb_name}"
        lines.append(f"  {{ thumb: {thumb!r}, full: {full!r}, alt: '', order: {e.order} }},")
    lines.append("];")
    lines.append("")

    out = "\n".join(lines)
    if dry_run:
        return
    (plan_dir / "data.js").write_text(out, encoding="utf-8")


def build_plan(plan_dir: Path, *, size: int, center_y: float, quality: int, dry_run: bool) -> None:
    plan_dir = plan_dir.resolve()
    full_dir = plan_dir / "full"
    thumbs_dir = plan_dir / "thumbs"
    full_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    images = iter_images(full_dir)
    if not images:
        print(f"[skip] {plan_dir} (no images in {full_dir})")
        return

    existing_data = (plan_dir / "data.js").read_text(encoding="utf-8") if (plan_dir / "data.js").exists() else ""
    existing_title, existing_subtitle = parse_title_subtitle(existing_data)
    title = existing_title or guess_title_from_dir(plan_dir)
    subtitle = existing_subtitle or "成品展示集"

    entries = compute_entries(images)

    # Apply renames
    if dry_run:
        for e in entries:
            if e.src.name != e.full_name:
                print(f"[rename] {plan_dir.name}/full/{e.src.name} -> {e.full_name}")
    else:
        rename_files(entries, full_dir, dry_run=dry_run)

    # Recompute based on final names for thumb generation
    generate_thumbs(entries, full_dir=full_dir, thumbs_dir=thumbs_dir, size=size, center_y=center_y, quality=quality, dry_run=dry_run)
    write_data_js(plan_dir, entries, title=title, subtitle=subtitle, dry_run=dry_run)

    print(f"[ok] {plan_dir.name}: {len(entries)} images")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rename plan images, generate thumbs, and write plans/<plan>/data.js.",
    )
    parser.add_argument("plan", nargs="?", help="Plan directory, e.g. plans/hanfu-classic")
    parser.add_argument("--all", action="store_true", help="Process all plans under ./plans/* that have ./full images")
    parser.add_argument("--thumb-size", type=int, default=600, help="Square thumb size in px (default: 600)")
    parser.add_argument("--thumb-center-y", type=float, default=0.35, help="0(top)~1(bottom) crop bias (default: 0.35)")
    parser.add_argument("--webp-quality", type=int, default=82, help="WEBP quality (default: 82)")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without writing files")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    os.chdir(repo_root)

    if args.all:
        plans_dir = Path("plans")
        if not plans_dir.exists():
            print("[error] Missing ./plans directory")
            return 2
        plan_dirs = [p for p in plans_dir.iterdir() if p.is_dir()]
        for p in sorted(plan_dirs, key=lambda x: x.name.lower()):
            build_plan(p, size=args.thumb_size, center_y=args.thumb_center_y, quality=args.webp_quality, dry_run=args.dry_run)
        return 0

    if not args.plan:
        parser.print_help()
        return 2

    plan_dir = Path(args.plan)
    if not plan_dir.exists():
        print(f"[error] Plan dir not found: {plan_dir}")
        return 2

    build_plan(plan_dir, size=args.thumb_size, center_y=args.thumb_center_y, quality=args.webp_quality, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

