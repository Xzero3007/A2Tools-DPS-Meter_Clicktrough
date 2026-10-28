#!/usr/bin/env bash
# A2Tools DPS Meter: build and install the Clicktrough build locally (Arch /
# CachyOS / EndeavourOS). Not normally needed: this repo's releases build the
# same automatically.
#
#   ./a2tools-rebuild.sh            the version this build is based on (BASE)
#   ./a2tools-rebuild.sh v2.0.80    a given version of the original
#
# Next to this script (see README.md):
#   BASE          the original's version this build is based on
#   backports/    the original's fixes not in a version yet (skipped once the
#                 version contains the commit)
#   patches/      the meter's changes
# The plugins come from the plugins repo (Xzero3007/A2Tools-Clicktrough-
# Plugins, its build/assemble.sh), as in the releases.
#
# The source goes to ~/.cache/a2tools-build (elsewhere: A2T_SRC=...).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cache="${A2T_SRC:-$HOME/.cache/a2tools-build/A2Tools-DPS-Meter}"
src="$cache"
plugins_src="$(dirname "$cache")/A2Tools-Plugins"
plugins_repo="$(dirname "$cache")/A2Tools-Clicktrough-Plugins"
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
  ref="$(sed -n '1p' "$here/BASE")"
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

# Plugins: as the plugins repo puts them together (its own, and the
# original's as it pins and patches them).
if [ ! -d "$plugins_repo/.git" ]; then
  git clone https://github.com/Xzero3007/A2Tools-Clicktrough-Plugins.git "$plugins_repo"
fi
git -C "$plugins_repo" fetch -q origin
git -C "$plugins_repo" reset -q --hard origin/HEAD
if [ ! -d "$plugins_src/.git" ]; then
  git clone https://github.com/taengu/A2Tools-Plugins.git "$plugins_src"
fi
git -C "$plugins_src" fetch -q origin
git -C "$plugins_src" reset -q --hard
GIT_AUTHOR_NAME="A2Tools patch" GIT_AUTHOR_EMAIL=patch@localhost \
  bash "$plugins_repo/build/assemble.sh" "$plugins_src" src/data/ct-plugins || fail "A plugin patch"

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
