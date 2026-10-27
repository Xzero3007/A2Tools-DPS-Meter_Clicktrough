#!/usr/bin/env bash
# Clicktrough: the working clones a Claude session (or anyone) needs to work
# on this repo's patches, made fresh from what this repo holds:
#
#   <workspace>/ct-src      the original meter (taengu/A2Tools-DPS-Meter) at its
#                           newest version, or --tag, with clicktrough/backports
#                           and clicktrough/patches applied, on branch ct-<tag>
#   <workspace>/ct-plugins  the original's plugins (taengu/A2Tools-Plugins) at
#                           their newest commit with clicktrough/plugins/<id>
#                           applied, on branch ct-patches
#
# <workspace> is the folder this repo sits in (or $WORKSPACE_DIR). Nothing is
# ever pushed from these clones: they belong to the original's author.
#
#   bash clicktrough/dev/setup-workspace.sh            the two clones
#   bash clicktrough/dev/setup-workspace.sh --deps     and the build's system
#        packages (apt) and the meter's npm packages
#   bash clicktrough/dev/setup-workspace.sh --build    and a debug build of the
#        meter with this build's plugins in place (minutes; implies --deps)
#   --tag v2.0.79   that version of the meter     --force   discard changes
#                                                           in the clones
set -euo pipefail

here="$(cd "$(dirname "$0")/../.." && pwd)"
ws="${WORKSPACE_DIR:-$(dirname "$here")}"
meter_url=https://github.com/taengu/A2Tools-DPS-Meter.git
plugins_url=https://github.com/taengu/A2Tools-Plugins.git
tag="" deps=0 build=0 force=0
while [ $# -gt 0 ]; do
  case "$1" in
    --tag) tag="$2"; shift ;;
    --deps) deps=1 ;;
    --build) build=1; deps=1 ;;
    --force) force=1 ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

# Patch commits: the patch author, Claude as committer (the patch files keep
# "A2Tools-patch <patch@localhost>" as their author).
export GIT_COMMITTER_NAME=Claude GIT_COMMITTER_EMAIL=noreply@anthropic.com
who=(-c user.name=A2Tools-patch -c user.email=patch@localhost)

clean_or_stop() {
  local dir="$1"
  [ -d "$dir/.git" ] || return 0
  git -C "$dir" am --abort >/dev/null 2>&1 || true
  git -C "$dir" cherry-pick --abort >/dev/null 2>&1 || true
  git -C "$dir" rebase --abort >/dev/null 2>&1 || true
  if [ -n "$(git -C "$dir" status --porcelain --untracked-files=no)" ]; then
    if [ "$force" = 1 ]; then
      git -C "$dir" reset -q --hard
    else
      echo "$dir has changes not committed. Commit them, or run again with --force to discard them." >&2
      exit 1
    fi
  fi
}

echo "==> Workspace: $ws"
mkdir -p "$ws"

# ---- the meter ----
src="$ws/ct-src"
clean_or_stop "$src"
if [ ! -d "$src/.git" ]; then
  git clone -q --filter=blob:none "$meter_url" "$src"
fi
git -C "$src" fetch -q --tags origin
if [ -z "$tag" ]; then
  tag=$(git -C "$src" tag -l 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n1)
fi
echo "==> Meter $tag, branch ct-$tag"
git -C "$src" checkout -q -B "ct-$tag" "$tag"
for p in "$here"/clicktrough/backports/*.patch; do
  [ -e "$p" ] || continue
  sha=$(sed -n '1s/^From \([0-9a-f]\{40\}\) .*/\1/p' "$p")
  if [ -n "$sha" ] && git -C "$src" merge-base --is-ancestor "$sha" HEAD 2>/dev/null; then
    continue
  fi
  git -C "$src" "${who[@]}" am -q "$p"
done
if ! git -C "$src" "${who[@]}" am -q "$here"/clicktrough/patches/*.patch; then
  echo "A patch doesn't apply to $tag: see 'git -C $src am --show-current-patch=diff'." >&2
  echo "To port: start from the last version it fitted (--tag), then cherry-pick its commits onto $tag." >&2
  exit 1
fi
echo "    $(git -C "$src" rev-list --count "$tag"..HEAD) commits on $tag"

# ---- the plugins ----
plugins="$ws/ct-plugins"
clean_or_stop "$plugins"
if [ ! -d "$plugins/.git" ]; then
  git clone -q "$plugins_url" "$plugins"
fi
git -C "$plugins" fetch -q origin
git -C "$plugins" checkout -q -B ct-patches origin/main
for d in "$here"/clicktrough/plugins/*/; do
  [ -d "$d" ] || continue
  git -C "$plugins" "${who[@]}" am -3 -q "$d"*.patch || {
    echo "The patches of $(basename "$d") don't apply to the original's newest plugins." >&2
    exit 1
  }
done
echo "==> Plugins: branch ct-patches, $(git -C "$plugins" rev-list --count origin/main..HEAD) commits on origin/main"

# ---- system and npm packages ----
if [ "$deps" = 1 ]; then
  echo "==> Packages"
  if command -v apt-get >/dev/null; then
    sudo_cmd=""; [ "$(id -u)" = 0 ] || sudo_cmd=sudo
    $sudo_cmd apt-get install -y -q libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
      libsoup-3.0-dev libssl-dev libpcap-dev pkg-config xvfb openbox xdotool imagemagick dbus-x11 >/dev/null \
      || echo "    (some system packages could not be installed)" >&2
  fi
  (cd "$src" && npm ci --no-audit --no-fund >/dev/null) || echo "    (npm ci failed)" >&2
fi

# ---- a debug build, with this build's plugins where the release has them ----
if [ "$build" = 1 ]; then
  echo "==> Debug build (cargo build)"
  # As the release is built (PKGBUILD): without `online`, with `net`.
  (cd "$src/src-tauri" && cargo build -q --no-default-features --features desktop,net)
  dest="$src/src-tauri/target/debug/_up_/src/data/ct-plugins"
  rm -rf "$dest" && mkdir -p "$dest"
  : > "$dest/installed-only.txt"
  for d in "$here"/clicktrough/plugins/*/; do
    [ -d "$d" ] && cp -r "$plugins/plugins/$(basename "$d")" "$dest/"
    [ -e "$d/installed-only" ] && basename "$d" >> "$dest/installed-only.txt"
  done
  for d in "$plugins"/plugins/*/; do
    id=$(basename "$d")
    [ -f "$d/manifest.json" ] && [ ! -e "$d/.unpublished" ] && [ ! -e "$dest/$id" ] && [ ! -e "$here/clicktrough/own-plugins/$id" ] || continue
    cp -r "$d" "$dest/$id" && echo "$id" >> "$dest/installed-only.txt"
  done
  for d in "$here"/clicktrough/own-plugins/*/; do
    id=$(basename "$d")
    cp -r "$d" "$dest/$id" && rm -rf "$dest/$id/dev"
  done
  echo "    $src/src-tauri/target/debug/a2tools-dps-meter (run it with clicktrough/dev/run-meter.sh)"
fi
echo "==> Done."
