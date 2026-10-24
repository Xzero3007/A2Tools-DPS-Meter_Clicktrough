#!/usr/bin/env bash
# A2Tools DPS Meter: die neueste Version mit den Clicktrough-Anpassungen lokal
# bauen und installieren (Arch / CachyOS / EndeavourOS). Normalerweise nicht
# noetig: die Releases dieses Repos bauen dasselbe automatisch.
#
#   ./a2tools-rebuild.sh            neueste Release-Version (v2.0.76, v2.0.77 ...)
#   ./a2tools-rebuild.sh v2.0.77    eine bestimmte Version
#
# Neben diesem Skript (siehe LIESMICH.md):
#   backports/    Korrekturen des Originals, die noch in keiner Version sind
#                 (enthaelt die Version den Commit schon, wird er uebersprungen)
#   patches/      die Anpassungen des Meters
#   plugins/<id>  Anpassungen an Plugins aus taengu/A2Tools-Plugins
#   own-plugins/  eigene Plugins dieses Repos (Pet Finder)
#
# Der Quellcode kommt nach ~/.cache/a2tools-build (anderer Ort: A2T_SRC=...).
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
  echo "Keine Patches in $here/patches gefunden." >&2
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
echo "==> Baue $ref mit ${#patches[@]} Patch(es)"

# Eigene Aenderungen im Bauordner werden verworfen (nur getrackte Dateien).
git reset -q --hard
rm -rf src/data/ct-plugins
git checkout -q --detach "$ref"

fail() {
  git am --abort >/dev/null 2>&1 || true
  echo >&2
  echo "$1 passt nicht mehr auf $ref (der Code hat sich dort geaendert)." >&2
  echo "Die installierte Version bleibt wie sie ist. Den Patch muss man anpassen." >&2
  exit 1
}

for p in "$here"/backports/*.patch; do
  sha=$(sed -n '1s/^From \([0-9a-f]\{40\}\) .*/\1/p' "$p")
  if [ -n "$sha" ] && git merge-base --is-ancestor "$sha" HEAD 2>/dev/null; then
    continue
  fi
  git "${who[@]}" am -q "$p" || fail "$(basename "$p")"
done
git "${who[@]}" am -q "${patches[@]}" || fail "Ein Patch"

# Plugins: angepasste aus A2Tools-Plugins und die eigenen dieses Repos.
plugin_dirs=("$here"/plugins/*/)
if [ ${#plugin_dirs[@]} -gt 0 ]; then
  if [ ! -d "$plugins_src/.git" ]; then
    git clone https://github.com/taengu/A2Tools-Plugins.git "$plugins_src"
  fi
  git -C "$plugins_src" am --abort >/dev/null 2>&1 || true
  git -C "$plugins_src" fetch -q origin
  git -C "$plugins_src" reset -q --hard
  git -C "$plugins_src" checkout -q --detach origin/HEAD
  for d in "${plugin_dirs[@]}"; do
    id=$(basename "$d")
    git -C "$plugins_src" "${who[@]}" am -q "$d"*.patch || fail "Der Plugin-Patch fuer $id"
    mkdir -p src/data/ct-plugins
    cp -r "$plugins_src/plugins/$id" "src/data/ct-plugins/$id"
  done
fi
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
echo "==> Installiere $pkg"
if pgrep -x a2tools-dps-met >/dev/null 2>&1; then
  echo "    (Das Meter laeuft gerade: danach einmal neu starten.)"
fi
sudo pacman -U --noconfirm "$pkg"
echo "==> Fertig: $(pacman -Q a2tools-dps-meter)"
