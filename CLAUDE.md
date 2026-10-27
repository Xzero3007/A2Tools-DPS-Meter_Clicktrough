# Clicktrough: instructions for Claude

Read this first in every session on this repo. It holds what earlier sessions
learnt, so nothing has to be asked or worked out again.

## The person

- Writes in **German**: answer in German. Everything that gets built is in
  **English**: UI texts, READMEs, code comments, commit messages, issues.
- Uses the meter on an Arch-based Linux with KDE and updates it through the
  **green button** in the meter's title (Settings → check for updates as the
  fallback). Sends screenshots from the game.
- **No blue in any UI** (buttons, highlights, links): neutral whites and greys,
  gold, red, purple are fine. Data colours that match an existing plugin are fine
  (Pet Finder's genus colours).
- Wants results and a short, plain explanation of what changed and what to do,
  not a log of the work.

## Hard rules

- **Write down the plan before changing anything**, in plain words, and wait
  for the person's yes. They decide; don't take features away on your own.
- **Nothing is sent, no account, no prompts, no links out.** The person wants
  every plugin (new ones too, through this repo's releases only, never the
  original's catalog), the timers, Pet Soul Tracker and Pet Finder, the
  market prices, and nothing sent anywhere: no A2 Tools account, sign-in,
  uploads, leaderboards, reports, live connection, Discord, donation or
  "report it here" links, no pop-up asking to sign in or share, no link to
  a website in any page. Downloads allowed (net_guard.rs, patch 0025): this
  repo's releases, the market prices (`WEB_HOSTS`), the shared world boss
  and Abyss siege timer files (cdn.a2tools.app/feeds/, read only), and the
  game's skill icon server (assets.playnccdn.com, page CSP). The release is
  the original's private build (`--no-default-features --features
  desktop,net`). Anything else needs the person's yes first.
- **After every new version of the original, and before saying a release is
  done: build it and look.** Run the meter (`setup-workspace.sh --build`,
  `run-meter.sh start`), click through the meter, Settings (every section)
  and the plugins, take screenshots, and grep the patched source and the
  original's plugins for new hosts and links (`grep -rnoE "https?://[a-z0-9.-]+"`
  over `src-tauri/src`, `public`, `index.html`, `src`, and the shipped
  plugins). Something new that reaches out or links out: remove it in a
  patch, then tell the person what it was.
- **Never push to, or open anything on, the original's repos**
  (`taengu/A2Tools-DPS-Meter`, `taengu/A2Tools-Plugins`). They are read only:
  this repo takes from them, never gives back. The working clones of them
  (`../ct-src`, `../ct-plugins`) are never pushed.
- Commit in this repo as `Claude <noreply@anthropic.com>`, on `main`, and push
  `main`: the release builds from `main`. End commit messages with the session's
  attribution lines.
- Patch commits in the working clones: author `A2Tools-patch
  <patch@localhost>`, committer Claude (`setup-workspace.sh` sets this up).
- Take data only where its licence allows it, and credit it (NOTICE files,
  READMEs). Not allowed so far: Aion 2 Timers' spawn data and map pictures
  (their permission is A2 Tools'), The Hidden Gaming Lair, allthings.how.
- Plugin storage keys must match `[A-Za-z0-9_-]{1,64}`.
- One project per repo: other projects of the person (e.g. the G502 mouse) have
  their own repo and their own sessions. Don't mix them into this one.

## What this repo is

A fork of the A2Tools DPS Meter (AION 2) that rebuilds every version of the
original with its own patches, ships its own plugins, and publishes an Arch
package as a GitHub release ("A2Tools 2.0.79 · Clicktrough 47"). The installed
meter updates only from these releases (patch 0003), plugins too (patch 0020).

| Path | What |
|---|---|
| repo root (`src-tauri/`, `public/`, ...) | An old copy of the original from when it was forked. **Not built, don't edit**: the release takes the original at its version tag. |
| `clicktrough/README.md` | Every patch and plugin change, in the person's terms. Keep it current. |
| `clicktrough/patches/NNNN-*.patch` | The meter patches (`git format-patch`), applied in order on the original's tag. |
| `clicktrough/backports/` | Fixes of the original taken before its release (none at the moment). |
| `clicktrough/plugins/<id>/` | Patches for the original's plugins (Daily Checklist, Event Timers; Pet Soul Tracker and Enhanced Boss Telegraph without links). A file `installed-only` there: the plugin still runs only where installed. |
| `clicktrough/own-plugins/<id>/` | Own plugins: `map`, `market`, `pet-finder`. Edited here directly; `dev/` holds tests (`dev/ci.sh`) and generators, not shipped. |
| `clicktrough/watch/plugin_watch.py` | The plugin watch (issues when the original has a new plugin). |
| `clicktrough/dev/` | `setup-workspace.sh` (the working clones), `run-meter.sh` (the meter on a virtual screen). |
| `clicktrough/a2tools-rebuild.sh` | The same build on the person's own PC, without GitHub. |
| `.github/workflows/clicktrough-release.yml` | Builds and publishes. Hourly, and on a push to `clicktrough/`. |
| `.github/workflows/market-prices.yml` | Hourly copy of aion2.exchange's prices (branch `market-data`) for the Market plugin. |
| `.github/workflows/plugin-watch.yml` | Hourly look at the original's plugins (branch `plugin-watch`); starts a release for a new one. |

## Start of a session

```bash
bash clicktrough/dev/setup-workspace.sh           # ../ct-src and ../ct-plugins, ~10 s
bash clicktrough/dev/setup-workspace.sh --build   # and a debug meter to run (minutes)
```

`../ct-src`: the original meter at its newest version with all patches, branch
`ct-<tag>`, one commit per patch. `../ct-plugins`: the original's plugins with
the plugin patches, branch `ct-patches`.

## Changing things

**A meter patch.** Work in `../ct-src`. A fix to an existing patch: commit it
with `git commit --fixup=<that patch's commit>`, then
`GIT_SEQUENCE_EDITOR=: git rebase -q --autosquash <tag>`. A new patch: a new
commit at the end. Then write the patch files again and describe the patch:

```bash
rm clicktrough/patches/*.patch
git -C ../ct-src format-patch -q -o "$PWD/clicktrough/patches" <tag>..HEAD
```

Add or update its row in `clicktrough/README.md`. Tests:
`(cd ../ct-src && node --test tests/*.test.mjs)` and
`(cd ../ct-src/src-tauri && cargo test --lib)`.

**A plugin patch** (the original's plugins): work in `../ct-plugins` on
`ct-patches`, then for each changed plugin `<id>`:

```bash
rm clicktrough/plugins/<id>/*.patch; n=0
for c in $(git -C ../ct-plugins rev-list --reverse origin/main..HEAD -- plugins/<id>); do
  n=$((n+1)); git -C ../ct-plugins format-patch -q --start-number $n -1 $c -o "$PWD/clicktrough/plugins/<id>/"
done
```

**An own plugin**: edit it in `clicktrough/own-plugins/<id>/`, raise its
`manifest.json` version, update its README and the row in
`clicktrough/README.md`, run `bash clicktrough/own-plugins/<id>/dev/ci.sh ../ct-src`.
To look at a page: serve the folder (`python3 -m http.server`) with a small
stand-in for `/_sdk/a2.js` (`a2.on`, `a2.storage`, `a2.share`, ... and a way to
emit events), and take screenshots with Playwright (installed, needs no
options). In the real meter: `bash clicktrough/dev/run-meter.sh start`, then
xdotool on `DISPLAY=:97` and `run-meter.sh shot <file>`.

Tests are run as the release is built: `cargo test --lib --no-default-features
--features desktop,net`.

**Release.** Push `main`. "Clicktrough release" builds in about 10 minutes:

```bash
gh run list -R Xzero3007/A2Tools-DPS-Meter_Clicktrough -w "Clicktrough release" -L 3
gh api repos/Xzero3007/A2Tools-DPS-Meter_Clicktrough/releases/latest -q .name
```

The meter offers it within 20 minutes (the green button).

**The original released a new version** and the build failed (an issue "Build
for vX failed" opens): `setup-workspace.sh --tag <last version that built>`,
then `git -C ../ct-src checkout -b ct-<new> <new tag>` and cherry-pick the
patch commits onto it one by one, resolving conflicts in the spirit of each
patch. Write the patch files again; delete backports the new version contains.

## Known pitfalls

- `pkill -f <pattern>` also kills the shell running it: use
  `pkill -x a2tools-dps-met`, or a bracket pattern (`pkill -f "[v]ite --port"`).
- GitHub starts scheduled workflows late and drops many: every 4 to 5 hours in
  practice, even when hourly.
- aion2.exchange is slow and often answers 503: the Market reads the hourly
  copy on the branch `market-data` first.
- The player's own position: the game sends it only with an action, an effect,
  a teleport or a loading screen. What the client sends while walking is
  encrypted. In between, the meter estimates it from what is around (SkeeveAN's
  method, about 10 m in the median), and the Map smooths it.
- WebKitGTK: a plugin's frame can't load its own files once its page has
  started (use `a2.file`, patch 0012), and a `<select>` is drawn in the
  desktop's light theme unless styled.
- The person's green button and Settings show "vX (Clicktrough N)": N is the
  release workflow's run number (`CT_REVISION`).
