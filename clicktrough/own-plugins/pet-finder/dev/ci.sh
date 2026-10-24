#!/usr/bin/env bash
# Clicktrough build: checks Pet Finder against the plugin decoder of the meter
# version it ships with (src-tauri/src/plugins/decoder.rs, unchanged). If the
# original changes the decoder so that Pet Finder can no longer read its
# frames, the build fails instead of shipping a silent plugin.
#
#   dev/ci.sh <meter source folder>
#
# Without a PetTracker checkout the nearby/collection and the EU merchant tests
# run; the US merchant test (market_frames.py) needs PetTracker and is left
# out here.
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

# A copy outside the meter: its package.json sets "type": "module", and Node
# would then read logic.js as a module instead of a classic script.
mkdir "$work/plugin"
cp "$plugin"/*.js "$plugin/manifest.json" "$work/plugin/"
cp -r "$here/tests" "$work/tests"
cd "$work/tests"
python3 -I frames.py
"$D" "$work/plugin/manifest.json" < frames.txt > events.jsonl
sed 's/^/91 56 /' eu-merchant.hex | "$D" "$work/plugin/manifest.json" > eu-events.jsonl
PLUGIN_DIR="$work/plugin" node --test logic.test.cjs eu.test.cjs
