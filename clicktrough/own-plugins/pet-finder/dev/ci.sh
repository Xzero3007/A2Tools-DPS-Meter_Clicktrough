#!/usr/bin/env bash
# Clicktrough-Build: prüft Pet Finder gegen den Plugin-Decoder der Meter-Version,
# mit der es ausgeliefert wird (src-tauri/src/plugins/decoder.rs, unverändert).
# Ändert das Original den Decoder so, dass Pet Finder seine Frames nicht mehr
# lesen kann, schlägt der Build fehl, statt ein stummes Plugin auszuliefern.
#
#   dev/ci.sh <Quellordner des Meters>
#
# Ohne PetTracker-Checkout laufen die Nearby/Collection- und die EU-Händler-
# Tests; der US-Händler-Test (market_frames.py) braucht PetTracker und bleibt
# hier aus.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
plugin="$(dirname "$here")"
meter="$(cd "$1" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cp -r "$here/decoder-check" "$work/decoder-check"
cp "$meter/src-tauri/src/plugins/decoder.rs" "$work/decoder-check/src/decoder.rs"
cargo build -q --manifest-path "$work/decoder-check/Cargo.toml" --target-dir "$work/target"
D="$work/target/debug/decoder-check"

# Eine Kopie außerhalb des Meters: dessen package.json setzt "type": "module",
# und Node läse logic.js dann als Modul statt als klassisches Skript.
mkdir "$work/plugin"
cp "$plugin"/*.js "$plugin/manifest.json" "$work/plugin/"
cp -r "$here/tests" "$work/tests"
cd "$work/tests"
python3 -I frames.py
"$D" "$work/plugin/manifest.json" < frames.txt > events.jsonl
sed 's/^/91 56 /' eu-merchant.hex | "$D" "$work/plugin/manifest.json" > eu-events.jsonl
PLUGIN_DIR="$work/plugin" node --test logic.test.cjs eu.test.cjs
