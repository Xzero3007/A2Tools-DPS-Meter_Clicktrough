"""Clicktrough: the plugins the original has that it didn't have before.

    python3 -I plugin_watch.py <A2Tools-Plugins checkout> <state dir> <out dir>

Reads every plugins/<id>/manifest.json of taengu/A2Tools-Plugins and the
meter's plugin catalog (cdn.a2tools.app/plugins/index.json, what Settings
installs from), and compares them with <state dir>/known.json, the plugins
seen so far. Writes the new known.json there and, when a plugin came or went,
<out dir>/title.txt and <out dir>/issue.md for an issue that says so. The
first run (no known.json) lists every plugin there is, so the watch shows it
works.

Prints publish=true|false, report=true|false and build=true|false for
$GITHUB_OUTPUT: publish when known.json changed, report when there is an
issue to open, build when a plugin came to the original's repo (the release
workflow then ships it). The catalog
not answering is no change: its part of known.json stays as it was.

    --catalog-file <file>   read the catalog from a file (testing)
"""

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CATALOG_URL = "https://cdn.a2tools.app/plugins/index.json"
REPO_URL = "https://github.com/taengu/A2Tools-Plugins"


def read_repo(root):
    """id -> what its manifest says, for every plugin folder of the repo."""
    plugins = {}
    for manifest in sorted((Path(root) / "plugins").glob("*/manifest.json")):
        try:
            m = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            print(f"::warning::{manifest}: {e}", file=sys.stderr)
            continue
        pid = str(m.get("id") or manifest.parent.name)
        plugins[pid] = {
            "name": str(m.get("name") or pid),
            "version": str(m.get("version") or ""),
            "description": str(m.get("description") or ""),
            "author": str(m.get("author") or ""),
            "permissions": [str(p) for p in m.get("permissions") or []],
            "folder": manifest.parent.name,
            # The author's markers: a test plugin (its own catalog, read by
            # meters from 2.0.78), or one held back (not published).
            "test": (manifest.parent / ".test").exists(),
            "unpublished": (manifest.parent / ".unpublished").exists(),
        }
    return plugins


def read_catalog(path=None):
    """id -> entry of the meter's catalog, or None when it can't be read."""
    try:
        if path:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
        else:
            req = urllib.request.Request(CATALOG_URL, headers={"User-Agent": "Clicktrough plugin watch"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.loads(r.read(1024 * 1024 + 1))
        return {
            str(e["id"]): {
                "name": str(e.get("name") or e["id"]),
                "version": str(e.get("version") or ""),
                "description": str(e.get("description") or ""),
                "author": str(e.get("author") or ""),
                "permissions": [str(p) for p in e.get("permissions") or []],
                "source": str(e.get("source") or ""),
            }
            for e in data.get("plugins") or []
            if e.get("id")
        }
    except Exception as e:  # noqa: BLE001 - any failure: the catalog is unknown this time
        print(f"::warning::the catalog could not be read: {e}", file=sys.stderr)
        return None


def describe(pid, repo, catalog):
    """One plugin, as the issue lists it."""
    r, c = repo.get(pid), (catalog or {}).get(pid)
    p = r or c
    lines = [f"### {p['name']} (`{pid}`) {p['version']}".rstrip()]
    if p["description"]:
        lines.append(p["description"])
    lines.append("")
    if p["author"]:
        lines.append(f"- **Author:** {p['author']}")
    if p["permissions"]:
        lines.append("- **Asks for:** " + ", ".join(f"`{x}`" for x in p["permissions"]))
    if r:
        lines.append(f"- **In the original's repo:** [plugins/{r['folder']}]({REPO_URL}/tree/main/plugins/{r['folder']})")
    if r and r["test"]:
        lines.append("- **A test plugin:** the author publishes it in a test catalog only meters from 2.0.78 read, not in the catalog")
    elif r and r["unpublished"]:
        lines.append("- **Held back by the author** (not published)")
    elif catalog is None:
        lines.append("- **In the catalog:** unknown (the catalog didn't answer)")
    elif c:
        lines.append(f"- **In the catalog:** yes, {c['version']}")
    else:
        lines.append("- **In the catalog:** not yet (the author hasn't published it there)")
    if r and r["unpublished"]:
        lines.append("- **In this repo's build:** not shipped while the author holds it back.")
    elif r:
        lines.append(
            "- **In this repo's build:** the next Clicktrough release ships it (this watch starts that build now); "
            "then Settings → Plugins → Available installs it, tagged Clicktrough, and its updates come with this repo's releases."
        )
    else:
        source = f" (source: {c['source']})" if c and c["source"] else ""
        lines.append(
            f"- **Only in the catalog**{source}: this repo's build doesn't ship it. Installed from the catalog it "
            "runs as its author published it and gets no updates (patch 0020): ask for it to be taken into the build."
        )
    return "\n".join(lines)


def main(argv):
    args = list(argv)
    catalog_file = None
    if "--catalog-file" in args:
        i = args.index("--catalog-file")
        catalog_file = args[i + 1]
        del args[i : i + 2]
    if len(args) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    root, state_dir, out_dir = (Path(a) for a in args)
    state_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)

    repo = read_repo(root)
    catalog = read_catalog(catalog_file)
    if not repo:
        print("::error::no plugin found in the original's repo", file=sys.stderr)
        return 1

    known_path = state_dir / "known.json"
    first = not known_path.exists()
    known = {} if first else json.loads(known_path.read_text(encoding="utf-8"))
    known_repo = set(known.get("repo") or [])
    known_catalog = set(known.get("catalog") or [])

    now = sorted(set(repo) | set(catalog or {}))
    # Known from the repo before and in the catalog only now: installable.
    listed = []
    if first:
        came = now
        gone = []
    else:
        if catalog is not None:
            listed = sorted(x for x in (set(catalog) - known_catalog) & known_repo if x in repo)
        came = sorted((set(repo) - known_repo) | ((set(catalog) - known_catalog - set(repo) - known_repo) if catalog is not None else set()))
        gone_repo = known_repo - set(repo)
        gone_catalog = (known_catalog - set(catalog)) if catalog is not None else set()
        gone = sorted(x for x in gone_repo | gone_catalog if x not in repo and (catalog is None or x not in catalog))

    new_known = {
        "repo": sorted(repo),
        "catalog": sorted(catalog) if catalog is not None else sorted(known_catalog),
        "checked": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
    }
    changed = first or new_known["repo"] != sorted(known_repo) or new_known["catalog"] != sorted(known_catalog)
    known_path.write_text(json.dumps(new_known, indent=1) + "\n", encoding="utf-8")

    report = bool(came or gone or listed)
    if report:
        owner = os.environ.get("GITHUB_REPOSITORY_OWNER", "")
        names = [((repo.get(x) or (catalog or {}).get(x))["name"]) for x in came]
        if first:
            title = f"Plugin watch is on: the original's {len(now)} plugins today"
            intro = (
                "From now on this watch looks at the original's plugins every three hours "
                f"([taengu/A2Tools-Plugins]({REPO_URL}) and the meter's catalog) and opens an issue "
                "like this one when a new plugin comes. These are the plugins there are today:"
            )
        elif came:
            title = ("New plugin in the original: " if len(came) == 1 else "New plugins in the original: ") + ", ".join(names)
            intro = "The original has a plugin it didn't have before:" if len(came) == 1 else "The original has plugins it didn't have before:"
        elif listed:
            title = "Now in the catalog: " + ", ".join(repo[x]["name"] for x in listed)
            intro = ""
        else:
            title = "Plugins gone from the original: " + ", ".join(gone)
            intro = ""
        body = [intro, ""] if intro else []
        for pid in came:
            body += [describe(pid, repo, catalog), ""]
        if listed:
            body += ["### Now in the catalog", "Plugins of the original's repo that Settings → Plugins can install now:", ""]
            body += [f"- **{repo[x]['name']}** (`{x}`) {catalog[x]['version']}" for x in listed] + [""]
        if gone:
            body += ["### Gone", "No longer in the original: " + ", ".join(f"`{x}`" for x in gone), ""]
        if owner:
            body.append(f"@{owner}")
        (out_dir / "title.txt").write_text(title + "\n", encoding="utf-8")
        (out_dir / "issue.md").write_text("\n".join(body).strip() + "\n", encoding="utf-8")

    new_in_repo = any(x in repo for x in came) and not first
    print(f"publish={'true' if changed else 'false'}")
    print(f"build={'true' if new_in_repo else 'false'}")
    print(f"report={'true' if report else 'false'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
