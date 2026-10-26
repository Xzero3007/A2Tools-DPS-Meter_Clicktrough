#!/usr/bin/env bash
# Clicktrough: run the debug meter (made by setup-workspace.sh --build) on a
# virtual screen, to look at it without a desktop: Xvfb :97 with openbox and a
# D-Bus session, the meter's page server (vite, port 1420) and the meter.
#
#   bash clicktrough/dev/run-meter.sh start     start everything (again)
#   bash clicktrough/dev/run-meter.sh shot F    a screenshot of the screen to F
#   bash clicktrough/dev/run-meter.sh stop      stop everything
#
# Its own home ($HOME=/tmp/ct-home): settings and plugins there, not yours.
# The log: /tmp/ct-app.log. xdotool drives it (DISPLAY=:97).
set -euo pipefail
here="$(cd "$(dirname "$0")/../.." && pwd)"
src="${WORKSPACE_DIR:-$(dirname "$here")}/ct-src"
export DISPLAY=:97

stop() {
  pkill -x a2tools-dps-met 2>/dev/null || true
  pkill -f "[v]ite --port 1420" 2>/dev/null || true
  pkill -f "[X]vfb :97" 2>/dev/null || true
  pkill -x openbox 2>/dev/null || true
}

case "${1:-}" in
  start)
    stop
    sleep 1
    mkdir -p /tmp/ct-home /tmp/ct-run && chmod 700 /tmp/ct-run
    Xvfb :97 -screen 0 1600x1000x24 >/dev/null 2>&1 &
    sleep 1
    openbox >/dev/null 2>&1 &
    (cd "$src" && nohup node_modules/.bin/vite --port 1420 --strictPort >/tmp/ct-vite.log 2>&1 &)
    sleep 4
    HOME=/tmp/ct-home GDK_BACKEND=x11 XDG_RUNTIME_DIR=/tmp/ct-run \
      nohup dbus-run-session -- "$src/src-tauri/target/debug/a2tools-dps-meter" >/tmp/ct-app.log 2>&1 &
    sleep 15
    grep -E "Plugins:|ERROR" /tmp/ct-app.log | tail -12 || true
    echo "Meter running on :97 (log /tmp/ct-app.log)."
    ;;
  shot)
    import -window root "${2:?a file name}"
    echo "${2}"
    ;;
  stop)
    stop
    ;;
  *)
    sed -n '2,12p' "$0"
    exit 2
    ;;
esac
