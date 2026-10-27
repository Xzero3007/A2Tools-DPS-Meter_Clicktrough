#!/usr/bin/env bash
# A2Tools DPS Meter: build and install the newest version with the
# Clicktrough changes locally (Arch / CachyOS / EndeavourOS). Not normally
# needed: this repo's releases build the same automatically.
#
#   ./a2tools-rebuild.sh            newest release (v2.0.76, v2.0.77 ...)
#   ./a2tools-rebuild.sh v2.0.77    a given version
#
# Next to this script (see README.md):
#   backports/    the original's fixes not in a version yet (skipped once the
#                 version contains the commit)
#   patches/      the meter's changes
#   plugins/<id>  changes to plugins from taengu/A2Tools-Plugins
#   own-plugins/  this repo's own plugins (Pet Finder)
#
# The source goes to ~/.cache/a2tools-build (elsewhere: A2T_SRC=...).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cache="${A2T_SRC:-$HOME/.cache/a2tools-build/A2Tools-DPS-Meter}"
src="$cache"
plugins_src="$(dirname "$cache")/A2Tools-Plugins"
ref="${1:-}"
who=(-c user.name="A2Tools patch" -c user.email="patch@localhost")

shopt -s nullglob
patches=("$here"/patches/*.patch)
if [ ${#patches[@]} -eq 0 ]; then
  echo "No patches found in $here/patches." >&2
  exit 1
fi

if [ ! -d "$src/.git" ]; then
  mkdir -p "$(dirname "$src")"
  git clone https://github.com/taengu/A2Tools-DPS-Meter.git "$src"
fi
cd "$src"
git am --abort >/dev/null 2>&1 || true
git fetch --tags --force origin
git fetch -q origin main

if [ -z "$ref" ]; then
  ref="$(git tag -l 'v*' --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n1)"
fi
echo "==> Building $ref with ${#patches[@]} patch(es)"

# Changes of your own in the build folder are dropped (tracked files only).
git reset -q --hard
rm -rf src/data/ct-plugins
git checkout -q --detach "$ref"

fail() {
  git am --abort >/dev/null 2>&1 || true
  echo >&2
  echo "$1 no longer fits $ref (the code changed there)." >&2
  echo "The installed version stays as it is. The patch needs adapting." >&2
  exit 1
}

for p in "$here"/backports/*.patch; do
  [ -e "$p" ] || continue
  sha=$(sed -n '1s/^From \([0-9a-f]\{40\}\) .*/\1/p' "$p")
  if [ -n "$sha" ] && git merge-base --is-ancestor "$sha" HEAD 2>/dev/null; then
    continue
  fi
  git "${who[@]}" am -q "$p" || fail "$(basename "$p")"
done
git "${who[@]}" am -q "${patches[@]}" || fail "A patch"

# Plugins: the changed ones from A2Tools-Plugins, the others from there
# (each runs where it is installed: patch 0020, installed-only.txt) and this
# repo's own.
if [ ! -d "$plugins_src/.git" ]; then
  git clone https://github.com/taengu/A2Tools-Plugins.git "$plugins_src"
fi
git -C "$plugins_src" am --abort >/dev/null 2>&1 || true
git -C "$plugins_src" fetch -q origin
git -C "$plugins_src" reset -q --hard
git -C "$plugins_src" checkout -q --detach origin/HEAD
mkdir -p src/data/ct-plugins
: > src/data/ct-plugins/installed-only.txt
for d in "$here"/plugins/*/; do
  [ -d "$d" ] || continue
  id=$(basename "$d")
  git -C "$plugins_src" "${who[@]}" am -3 -q "$d"*.patch || fail "The plugin patch for $id"
  cp -r "$plugins_src/plugins/$id" "src/data/ct-plugins/$id"
  [ -e "$d/installed-only" ] && echo "$id" >> src/data/ct-plugins/installed-only.txt
done
for d in "$plugins_src"/plugins/*/; do
  id=$(basename "$d")
  [ -f "$d/manifest.json" ] || continue
  [ -e "$d/.unpublished" ] && continue
  [ -e "src/data/ct-plugins/$id" ] && continue
  [ -e "$here/own-plugins/$id" ] && continue
  cp -r "$d" "src/data/ct-plugins/$id"
  echo "$id" >> src/data/ct-plugins/installed-only.txt
done
for d in "$here"/own-plugins/*/; do
  [ -f "$d/manifest.json" ] || continue
  id=$(basename "$d")
  mkdir -p "src/data/ct-plugins/$id"
  cp -r "$d/." "src/data/ct-plugins/$id/"
  rm -rf "src/data/ct-plugins/$id/dev"
done

cd packaging/arch
rm -f ./*.pkg.tar.zst
makepkg -sf --noconfirm

pkg="$(ls -t ./*.pkg.tar.zst | head -n1)"
echo "==> Installing $pkg"
if pgrep -x a2tools-dps-met >/dev/null 2>&1; then
  echo "    (The meter is running: restart it afterwards.)"
fi
sudo pacman -U --noconfirm "$pkg"
echo "==> Done: $(pacman -Q a2tools-dps-meter)"
