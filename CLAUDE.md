# Clicktrough: instructions for Claude

Read this first in every session on this repo. It holds what earlier sessions
learnt, so nothing has to be asked or worked out again. This repo is **the
meter (the app)**: its patches, its build and releases. The plugins (own ones
and the changes to the original's) are their own repo,
[Xzero3007/A2Tools-Clicktrough-Plugins](https://github.com/Xzero3007/A2Tools-Clicktrough-Plugins),
with its own CLAUDE.md: plugin work happens there.

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
  every plugin (through the plugins repo and this repo's releases only, never
  the original's catalog), the timers, Pet Finder, the market prices, and
  nothing sent anywhere: no A2 Tools account, sign-in, uploads, leaderboards,
  reports, live connection, Discord, donation or "report it here" links, no
  pop-up asking to sign in or share, no link to a website in any page.
  Downloads allowed (`net_guard.rs`, patch 0025): this repo's releases, the
  market prices (`WEB_HOSTS`), the shared world boss and Abyss siege timer
  files (cdn.a2tools.app/feeds/, read only), and the game's skill icon server
  (assets.playnccdn.com, page CSP). The release is the original's private
  build (`--no-default-features --features desktop,net`). Anything else needs
  the person's yes first.
- **This repo is public. No network analysis goes in here**: no write-ups of
  what the game's traffic holds, no packet captures, no logs. Those go in
  the person's private repo `Xzero3007/A2Tools-Clicktrough-Notes` (clone it
  next to this one as `../a2tools-clicktrough-notes`; its CLAUDE.md says
  what goes there), which also holds what is known about the traffic. Code
  that reads the game (the patches) is code and lives here.
- **Packet logs the person sends** hold chat and names: use them only for the
  analysis in the session, never commit them anywhere.
- **Before saying a release is done: build it and look.** Run the meter
  (`setup-workspace.sh --build`, `run-meter.sh start`), click through the
  meter, Settings (every section) and the plugins, take screenshots, and grep
  the patched source and the shipped plugins for new hosts and links
  (`grep -rnoE "https?://[a-z0-9.-]+"` over `src-tauri/src`, `public`,
  `index.html`, `src`, and the plugins). Something new that reaches out or
  links out: remove it in a patch, then tell the person what it was.
- **Never push to, or open anything on, the original's repos**
  (`taengu/A2Tools-DPS-Meter`, `taengu/A2Tools-Plugins`). They are read only:
  this repo takes from them, never gives back. The working clones of them
  (`../ct-src`, `../ct-plugins`) are never pushed.
- Commit in this repo as `Claude <noreply@anthropic.com>`, on `main`, and push
  `main`: the release builds from `main`. End commit messages with the
  session's attribution lines.
- Patch commits in the working clones: author `A2Tools-patch
  <patch@localhost>`, committer Claude (`setup-workspace.sh` sets this up).
- Take data only where its licence allows it, and credit it (NOTICE files,
  READMEs, as text). Game data taken from the client (spawn points, the
  game's map pictures) is the game's, whoever extracted it: Aion 2 Timers'
  spawn points and map pictures are used, as A2 Tools' Pet Soul Tracker has
  them, credited (the person's decision, 2026-10-28). Not allowed so far:
  The Hidden Gaming Lair, allthings.how (gathering spots players collected).
- One project per repo: other projects of the person (e.g. the G502 mouse) have
  their own repo and their own sessions. Don't mix them into this one.

## What this repo is

A fork of the A2Tools DPS Meter (AION 2) that builds the original at one
version (`clicktrough/BASE`, now **v2.0.80**) with its own patches, adds the
plugins from the plugins repo, and publishes an Arch package as a GitHub
release ("A2Tools 2.0.80 · Clicktrough 64"). The installed meter updates only
from these releases (patch 0003), plugins too (patch 0020).

**Frozen on BASE.** Since October 2026 newer versions of the original are not
taken on by themselves: the work goes on in this build. The "Original watch"
opens an issue (label `original-watch`) for a new version, with its commits;
it is taken only when something fundamental changed and the person decided
(see "Taking a new version" below). New plugins of the original are reported
the same way (label `plugin-watch`) and taken in the plugins repo once chosen.

| Path | What |
|---|---|
| repo root (`src-tauri/`, `public/`, ...) | An old copy of the original from when it was forked. **Not built, don't edit**: the release takes the original at its version tag. |
| `clicktrough/BASE` | The original's version this build is based on. |
| `clicktrough/README.md` | Every patch, in the person's terms. Keep it current. |
| `clicktrough/patches/NNNN-*.patch` | The meter patches (`git format-patch`), applied in order on BASE. |
| `clicktrough/backports/` | Fixes of the original taken before its release (none at the moment). |
| `clicktrough/watch/plugin_watch.py` | The plugin part of the Original watch. |
| `clicktrough/dev/` | `setup-workspace.sh` (the working clones), `run-meter.sh` (the meter on a virtual screen). |
| `clicktrough/a2tools-rebuild.sh` | The same build on the person's own PC, without GitHub. |
| `.github/workflows/clicktrough-release.yml` | Builds and publishes. Hourly (when this repo or the plugins repo changed), and on a push to `clicktrough/`. |
| `.github/workflows/plugin-watch.yml` | "Original watch": hourly look at the original's meter and plugins (state on branch `plugin-watch`); issues only. |
| `.github/workflows/market-prices.yml` | Hourly copy of aion2.exchange's prices (branch `market-data`) for the Market plugin, with the plugin's `dev/copy_prices.py` from the plugins repo. The branch stays here: the meter reads it (`WEB_HOSTS`, net_guard). |

The plugins in the package: the plugins repo's `build/assemble.sh` puts them
together (its own plugins, the original's at a pinned commit with its
patches); the release, `setup-workspace.sh` and `a2tools-rebuild.sh` all run
it. The release takes the plugins repo's `main` as it is.

## Start of a session

**First, the Original watch's open issues** (the person's decision,
2026-10-28): before any other work, and again before a release, look at
them and tell the person what is new, with an assessment (what changed,
what it would bring here, whether it sends or links anything, the effort,
a recommendation). Don't wait to be asked.

```bash
gh api "repos/Xzero3007/A2Tools-DPS-Meter_Clicktrough/issues?state=open&labels=original-watch" -q '.[] | "#\(.number) \(.title)"'
gh api "repos/Xzero3007/A2Tools-DPS-Meter_Clicktrough/issues?state=open&labels=plugin-watch" -q '.[] | "#\(.number) \(.title)"'
```

An issue whose content is all taken or decided against gets a comment
saying so and is closed; one with something still open stays open.

```bash
bash clicktrough/dev/setup-workspace.sh           # ../ct-src, the plugins repo, ../ct-plugins, ~10 s
bash clicktrough/dev/setup-workspace.sh --build   # and a debug meter to run (minutes)
```

`../ct-src`: the original meter at BASE with all patches, branch `ct-<tag>`,
one commit per patch. `../a2tools-clicktrough-plugins` (or `$PLUGINS_REPO`):
the plugins repo. `../ct-plugins`: the original's plugins as the plugins repo
pins and patches them.

## Changing things

**A meter patch.** Work in `../ct-src`. A fix to an existing patch: commit it
with `git commit --fixup=<that patch's commit>`, then
`GIT_SEQUENCE_EDITOR=: git rebase -q -i --autosquash <tag>`. A new patch: a
new commit at the end. Then write the patch files again and describe the
patch:

```bash
rm clicktrough/patches/*.patch
git -C ../ct-src format-patch -q -o "$PWD/clicktrough/patches" <tag>..HEAD
```

Add or update its row in `clicktrough/README.md`. Tests:
`(cd ../ct-src && node --test tests/*.test.mjs)` and
`(cd ../ct-src/src-tauri && cargo test --lib --no-default-features --features desktop,net)`
(as the release runs them). After a rebase with conflicts, check the files
it touched: a CSS block left open swallows every rule after it.

**Looking at it.** `bash clicktrough/dev/run-meter.sh start`, then xdotool on
`DISPLAY=:97` and `run-meter.sh shot <file>`. The plugins come from the
plugins repo as the release builds them (`--build` puts them in place).

**A plugin.** In the plugins repo (its CLAUDE.md). A meter patch that a
plugin needs (a new event, permission or call) is made here; the plugin
change there.

**Release.** Push `main`. "Clicktrough release" builds in about 10 minutes:

```bash
gh run list -R Xzero3007/A2Tools-DPS-Meter_Clicktrough -w "Clicktrough release" -L 3
gh api repos/Xzero3007/A2Tools-DPS-Meter_Clicktrough/releases/latest -q .name
```

The meter offers it within 20 minutes (the green button). A change only in
the plugins repo builds at the next hourly run, or at once with
`gh workflow run "Clicktrough release" -R Xzero3007/A2Tools-DPS-Meter_Clicktrough`.

**Taking a new version of the original** (only when the person decided, after
an `original-watch` issue): `setup-workspace.sh` (at BASE), then
`git -C ../ct-src checkout -b ct-<new> <new tag>` and cherry-pick the patch
commits onto it one by one, resolving conflicts in the spirit of each patch.
Write the patch files again, delete backports the new version contains, set
`clicktrough/BASE` to the new tag, build and look (the hard rule above: the
new version's hosts and links).

## Known pitfalls

- `pkill -f <pattern>` also kills the shell running it: use
  `pkill -x a2tools-dps-met`, or a bracket pattern (`pkill -f "[v]ite --port"`).
- GitHub starts scheduled workflows late and drops many: every 4 to 5 hours in
  practice, even when hourly.
- aion2.exchange is slow and often answers 503: the Market reads the hourly
  copy on the branch `market-data` first.
- The player's own position: the game sends it only with an action, an effect,
  a teleport or a loading screen. In between, the meter estimates it from what
  is around (SkeeveAN's method, about 10 m in the median).
- WebKitGTK: a plugin's frame can't load its own files once its page has
  started (use `a2.file`, patch 0012); a `<select>` is drawn in the desktop's
  light theme unless styled; a `<button>` without the page's styles is drawn
  as the desktop's (a white box).
- The plugin dock is its own window: a change it makes (order, lock) reaches
  Settings only through an event (`plugins-changed`, `dock-locked`).
- The person's green button and Settings show "vX (Clicktrough N)": N is the
  release workflow's run number (`CT_REVISION`).
