#!/usr/bin/env python3
"""Verify retained Drive and research migrations without network access.

This checks captured inventories and local content, not current upstream state.
Legacy Git reachability, source replication and browser behavior need separate evidence.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
import zipfile

ROOT = Path(__file__).resolve().parent.parent
GOOGLE_DOC = "application/vnd.google-apps.document"
RESEARCH_ROOT = "docs/research/upstream"
RESEARCH_HTML = {
    "studies/idle-clans/1.6800/prototypes/shared_sim_prototype.html",
    "studies/koltera/7.0.0/prototypes/collection_idle_prototype.html",
    "studies/super-auto-pets/steam-2026-11-25/prototypes/autobattler_dsl_prototype.html",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def documentation_file(root: Path, name: str) -> Path:
    """Keep migration originals and destinations in real documentation files."""
    require(isinstance(name, str), "Migration path must be a string")
    relative = PurePosixPath(name)
    require(
        relative.parts and relative.parts[0] == "docs"
        and ".." not in relative.parts and "\\" not in name
        and relative.as_posix() == name,
        f"Migration path is not a canonical documentation path: {name}",
    )
    path = root / relative
    require(
        all(not parent.is_symlink() for parent in [path, *path.parents]
            if parent != root and root in parent.parents),
        f"Migration path contains a symlink: {name}",
    )
    require(path.is_file(), f"Missing migration file: {name}")
    return path


def check_hash(data: bytes, expected: str, label: str) -> None:
    require(isinstance(expected, str) and re.fullmatch(r"[0-9a-f]{64}", expected),
            f"Invalid SHA-256 for {label}")
    require(hashlib.sha256(data).hexdigest() == expected,
            f"SHA-256 mismatch: {label}")


def localize_links(body: str, destination: str, targets: dict[str, str]) -> str:
    """The only body transformation allowed by this migration."""
    for ident, target in targets.items():
        relative = os.path.relpath(target, Path(destination).parent).replace(os.sep, "/")
        body = re.sub(
            r"https(?:\\)?:\/\/docs\.google\.com/document/d/" + re.escape(ident)
            + r"(?:/edit)?(?:\?[^)\s]*)?", relative, body,
        )
        body = re.sub(
            r"https(?:\\)?:\/\/drive\.google\.com/file/d/" + re.escape(ident)
            + r"(?:/view)?(?:\?[^)\s]*)?", relative, body,
        )
    return body


def check_body(root: Path, destination: str, body: str, targets: dict[str, str]) -> None:
    actual = documentation_file(root, destination).read_bytes().decode("utf-8")
    expected = localize_links(body, destination, targets)
    require(expected and expected in actual,
            f"Source text missing or changed beyond link localization: {destination}")


def validate_research(root: Path) -> dict[str, int]:
    manifest = json.loads(documentation_file(root, "docs/migration/research-manifest.json").read_text())
    require(isinstance(manifest["source_commit"], str)
            and re.fullmatch(r"[0-9a-f]{40}", manifest["source_commit"]),
            "Invalid research source commit")
    require(manifest["files"], "Empty research import inventory")
    sources, destinations = set(), set()
    for item in manifest["files"]:
        source, destination = item["source_path"], item["destination"]
        require(isinstance(source, str) and isinstance(destination, str),
                "Research source and destination paths must be strings")
        source_path = PurePosixPath(source)
        require(source_path.parts and not source_path.is_absolute()
                and ".." not in source_path.parts and "\\" not in source
                and source_path.as_posix() == source, f"Invalid research source path: {source}")
        require(source not in sources and destination not in destinations,
                f"Duplicate research source or destination: {source}")
        sources.add(source)
        destinations.add(destination)
        require(destination.startswith(RESEARCH_ROOT + "/"),
                f"Research destination is outside the upstream reference directory: {destination}")
        path = documentation_file(root, destination)
        require(path.suffix in {".md", ".png", ".txt", ".html"},
                f"Unexpected research file format: {destination}")
        require(path.suffix != ".html"
                or path.relative_to(root / RESEARCH_ROOT).as_posix() in RESEARCH_HTML,
                f"Unapproved HTML research prototype: {destination}")
        require(isinstance(item["source_blob_sha"], str)
                and re.fullmatch(r"[0-9a-f]{40}", item["source_blob_sha"]),
                f"Invalid research source blob SHA: {source}")
        require(isinstance(item["source_sha256"], str)
                and re.fullmatch(r"[0-9a-f]{64}", item["source_sha256"]),
                f"Invalid research source SHA-256: {source}")
        require(all(type(item[key]) is int and item[key] >= 0
                    for key in ("source_bytes", "destination_bytes")),
                f"Invalid research byte count: {source}")
        require(isinstance(item["classification"], str) and item["classification"].strip(),
                f"Unclassified research file: {source}")
        raw = path.read_bytes()
        require(len(raw) == item["destination_bytes"], f"Research byte size mismatch: {destination}")
        check_hash(raw, item["destination_sha256"], destination)

    generated = manifest["generated_docs"]
    require(len(generated) == len(set(generated)) and not destinations.intersection(generated),
            "Duplicate or overlapping generated research documentation")
    for destination in generated:
        require(isinstance(destination, str) and destination.startswith(RESEARCH_ROOT + "/")
                and destination.endswith("/README.md"),
                f"Invalid generated research wrapper path: {destination}")
        documentation_file(root, destination)
    entries = list((root / RESEARCH_ROOT).rglob("*"))
    require(not any(path.is_symlink() for path in entries), "Symlink in research import directory")
    actual = {path.relative_to(root).as_posix() for path in entries if path.is_file()}
    require(actual == destinations.union(generated),
            "Research files differ from the complete manifest: "
            + ", ".join(sorted(actual.symmetric_difference(destinations.union(generated)))))
    return {"research_files": len(destinations), "research_wrappers": len(generated)}


def validate(root: Path = ROOT) -> dict[str, int]:
    root = root.resolve()
    manifest = json.loads(documentation_file(root, "docs/migration/drive-manifest.json").read_text())
    require(manifest["all_items_accounted_for"] is True
            and manifest["originals_modified"] is False, "Incomplete or modified source inventory")
    files, folders = manifest["files"], manifest["folders"]
    require(files and folders, "Empty Drive snapshot inventory")
    require(len({folder["id"] for folder in folders}) == len(folders), "Duplicate folder ID")
    for folder in folders:
        require(all(type(folder[key]) is int and folder[key] >= 0
                    for key in ("direct_children", "subfolders", "pages_read")),
                "Invalid folder inventory counts")
        require(folder["direct_children"] >= folder["subfolders"]
                and folder["pages_read"] > 0 and folder["continuation_token"] is None,
                "Folder inventory is incomplete")
    require(sum(folder["subfolders"] for folder in folders) == len(folders) - 1
            and sum(folder["direct_children"] - folder["subfolders"] for folder in folders) == len(files),
            "Folder counts do not account for the recorded files and subfolders")

    targets, expected_members, destinations = {}, {}, []
    for item in files:
        ident = item["id"]
        require(isinstance(ident, str) and re.fullmatch(r"[A-Za-z0-9_-]+", ident)
                and ident not in targets, "Missing, invalid or duplicate Drive file ID")
        require(item["destinations"] and item["classification"], f"Unclassified source: {ident}")
        targets[ident] = item["destinations"][0]
        for destination in item["destinations"]:
            documentation_file(root, destination)
            destinations.append(destination)
        original, separator, member = item["original_export"].partition("#")
        documentation_file(root, original)
        if item["mime_type"] == GOOGLE_DOC:
            require(separator and original.startswith("docs/archive/drive/")
                    and original.endswith(".zip") and member == ident + ".md",
                    f"Invalid original Markdown archive member: {ident}")
            expected_members.setdefault(original, []).append(member)
        else:
            require(item["mime_type"] == "text/html" and not separator
                    and original.startswith("docs/reference/"), f"Unexpected source format: {ident}")
    require(len(destinations) == len(set(destinations)), "Duplicate migration destination")

    originals = {}
    for archive, expected in expected_members.items():
        with zipfile.ZipFile(documentation_file(root, archive)) as bundle:
            require(sorted(bundle.namelist()) == sorted(expected),
                    f"Unexpected, missing or duplicate original ZIP member: {archive}")
            for member in expected:
                originals[archive + "#" + member] = bundle.read(member)

    fragment_count = 0
    for item in files:
        original = item["original_export"]
        raw = originals[original] if original in originals else documentation_file(root, original).read_bytes()
        require(type(item["export_size"]) is int and len(raw) == item["export_size"],
                f"Source byte size mismatch: {item['id']}")
        check_hash(raw, item["source_sha256"], item["id"])
        if item["mime_type"] == "text/html":
            for destination in item["destinations"]:
                require(documentation_file(root, destination).read_bytes() == raw,
                        f"Original HTML was altered: {destination}")
            continue
        body = raw.decode("utf-8")
        segments = item.get("segments")
        if segments is None:
            require(len(item["destinations"]) == 1, "Unsplit source has multiple destinations")
            check_body(root, item["destinations"][0], body, targets)
            continue
        require([segment["path"] for segment in segments] == item["destinations"],
                "Fragment paths do not match ordered destinations")
        cursor = 0
        for segment in segments:
            start, end = segment["source_character_range"]
            require(type(start) is int and type(end) is int
                    and start == cursor and start < end <= len(body),
                    f"Invalid, overlapping or gapped character range: {segment['path']}")
            fragment = body[start:end]
            check_hash(fragment.encode("utf-8"), segment["source_fragment_sha256"], segment["path"])
            check_body(root, segment["path"], fragment, targets)
            cursor = end
            fragment_count += 1
        require(cursor == len(body), f"Source character ranges are incomplete: {item['id']}")

    legacy = json.loads(documentation_file(root, "docs/archive/legacy-branches.json").read_text())
    require(len(legacy) == 50 and len({row["branch"] for row in legacy}) == 50,
            "Legacy inventory must retain all 50 unique original branch tips")
    for row in legacy:
        require(all(isinstance(row[key], str) and re.fullmatch(r"[0-9a-f]{40}", row[key])
                    for key in ("sha", "tree")), f"Invalid legacy tip/tree: {row['branch']}")
        require(isinstance(row["branch"], str) and row["branch"]
                and re.fullmatch(r"refs/heads/archive/[A-Za-z0-9_/-]+", row["archive_ref"]),
                f"Missing or invalid archive reference: {row['branch']}")
        require(all(type(row[key]) is int and row[key] >= 0
                    for key in ("ahead_main", "behind_main", "outside_latest", "file_count")),
                f"Invalid legacy inventory counts: {row['branch']}")
    result = {"sources": len(files), "destinations": len(destinations),
              "fragments": fragment_count, "zip_members": len(originals),
              "legacy_tips": len(legacy), "archive_refs": len({row["archive_ref"] for row in legacy})}
    result.update(validate_research(root))
    return result


if __name__ == "__main__":
    try:
        result = validate()
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
        print(f"FAIL: migration validation: {error}", file=sys.stderr)
        raise SystemExit(1) from None
    print("PASS: migration snapshot integrity, complete source text and documentation-only destinations")
    print(", ".join(f"{value} {key.replace('_', ' ')}" for key, value in result.items()))
    print("Legacy inventory fields checked; remote Git reachability is not checked by this offline command.")
    print("Research destination integrity checked; upstream source replication and execution are not checked.")
