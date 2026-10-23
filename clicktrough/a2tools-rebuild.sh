#!/usr/bin/env bash
# A2Tools DPS Meter: die neueste Version mit den Clicktrough-Patches lokal
# bauen und installieren (Arch / CachyOS / EndeavourOS). Normalerweise nicht
# noetig: die Releases dieses Repos bauen dasselbe automatisch.
#
#   ./a2tools-rebuild.sh            neueste Release-Version (v2.0.75, v2.0.76 ...)
#   ./a2tools-rebuild.sh v2.0.75    eine bestimmte Version
#
# Die Patches liegen im Ordner patches/ neben diesem Skript:
#   0001  Schloss + Click-through fuer alle Fenster, auch unter nativem Wayland
#   0002  das Meter-Fenster bleibt beim Wachsen/Schrumpfen an seinem Platz (KDE)
#   0003  Updates kommen aus dem Clicktrough-Repo statt vom Original
#
# Der Quellcode kommt nach ~/.cache/a2tools-build (anderer Ort: A2T_SRC=...).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="${A2T_SRC:-$HOME/.cache/a2tools-build/A2Tools-DPS-Meter}"
ref="${1:-}"

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

if [ -z "$ref" ]; then
  ref="$(git tag -l 'v*' --sort=-v:refname | head -n1)"
fi
echo "==> Baue $ref mit ${#patches[@]} Patch(es)"

# Eigene Aenderungen im Bauordner werden verworfen (nur getrackte Dateien).
git reset -q --hard
git checkout -q --detach "$ref"

if ! git -c user.name="A2Tools patch" -c user.email="patch@localhost" am -q "${patches[@]}"; then
  git am --abort || true
  echo >&2
  echo "Der Patch passt nicht mehr auf $ref (der Code hat sich dort geaendert)." >&2
  echo "Die installierte Version bleibt wie sie ist. Den Patch muss man anpassen." >&2
  exit 1
fi

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
