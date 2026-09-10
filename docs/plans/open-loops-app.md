# Open Loops: a personal brain-dump and sorting app

Planning document, written 2026-09-10. Status: approved, build not started.

This doc is meant to be self-contained. A future Claude Code session should be able to start the build from this file alone, together with the "Kickoff prompt" at the end.

## 1. Why

The "Closing Your Open Loops" process (summarised in section 9) has worked several times on pen and paper. The digital version keeps the process intact and changes two things:

1. The brain dump is continuous. An inbox is always open on the phone, so loops get captured the moment they surface, not only during a timed session.
2. A sorting session pulls in whatever is already in the inbox, plus anything that has gone stale on the other lists.

The app installs on the phone, runs on the Hostinger VPS, and stores its data in a shape that the Hermes agent and a later desktop productivity app can read and write without a rebuild.

## 2. Decisions already made

| Question | Decision |
|---|---|
| Where the data lives | PocketBase, on the existing instance, as system of record. A nightly markdown export writes one file per loop into a git repo that can also be opened as an Obsidian vault. |
| Access | One PocketBase auth user. API rules require a logged-in user. Not the unlisted-URL approach used for FIKS DET. |
| Release 1 scope | Capture and the lists only. Scoring, sorting and the power hour follow in releases 2 and 3. |
| Hermes | Nous Research Hermes Agent. Release 1 is PWA only. Telegram capture and agent access come later. |
| Where the code lives | A new repo (suggested name `open-loops`). This site repo only holds the plan. |

Small choices deferred to build time, none of which block release 1: subdomain name (suggestion: `loops.svendoldenburg.com`), default Someday review interval (suggestion: 30 days), whether the 10 minute dump timer ships in release 1 or 2.

## 3. What already exists and gets reused

From the earlier builds documented on svendoldenburg.com (the pre-placeholder site is in git history at commit `1ac8329`) and from `mor/index.html`:

- Hostinger VPS with Docker, Traefik as reverse proxy, n8n. A new service is one more block in docker-compose with Traefik labels. SSL is automatic.
- One PocketBase instance at `pb.aetheriumforge.cloud` shared by the training tracker, the Energy spending tracker, Outbreak Watch and FIKS DET. Each app owns its collections.
- Frontend pattern: vanilla JS ES modules, hash router, no framework, no build step, PWA manifest and service worker. Served by an nginx container on a subdomain behind Traefik, as done for energy.svendoldenburg.com and outbreak.aetheriumforge.cloud.
- Collections are created by a Python script that also sets API rules. Copy that script's structure.
- Visual language: Fraunces for headings, Inter for body, light and dark tokens. Copy the token block from `mor/index.html`.
- Known PocketBase gotcha: sort by a field you own. Sorting by the system `created` field returned 400 on the installed version.
- Patterns available for later phases: the Energy Telegram bot (text and photos parsed by Claude, one tap saves to PocketBase), Python scripts on systemd timers (Outbreak Watch), the planned MCP wrapper over PocketBase.
- Guiding principle from the "Cut, don't build" journal entry: ship the small honest version, use it, then grow it.

## 4. Storage rationale, for the long term

| Option | Phone capture | Structured scores | Agent and desktop access | Portability | Verdict |
|---|---|---|---|---|---|
| PocketBase (existing) | Instant, offline queue is easy | Native fields, filters, realtime | REST, JS SDK, MCP wrapper | Export script plus built-in backups | System of record |
| Markdown in a GitHub repo | Token in the browser, one commit per edit, conflicts | Frontmatter only | Easy to read, awkward to write safely | Best | Export target |
| Obsidian vault | Needs Obsidian Sync or a git plugin on the phone | Frontmatter plus Dataview | File access only | Best | Optional export target |

Rules that keep the door open for the desktop app and for Hermes:

- The `loops` record shape is the contract (section 5). It carries a `schema_version`. Changes are additive only. Never rename or repurpose a field. Add a new one and migrate.
- The nightly export is read-only output. If files ever need to become primary, the export grows into a two-way sync. Not needed now.
- Turn on PocketBase's built-in backups and keep a weekly copy off the VPS.

## 5. Data contract

Collection `loops`, one record per open loop:

| Field | Type | Notes |
|---|---|---|
| title | text, required | The loop, one line |
| note | text | Optional detail, markdown |
| category | select | ongoing_project, considering, decision, admin, other. Mirrors the memory joggers in the process |
| importance | number 1 to 5, nullable | Null until scored |
| urgency | number 1 to 5, nullable | Null until scored |
| effort | number 1 to 5, nullable | Null until scored |
| state | select | inbox, scored, quick_win, someday, active, done, dropped |
| review_at | date, nullable | Set when a loop goes to someday. The "simple date in the future" |
| scored_at | date, nullable | When all three scores were set |
| sorted_at | date, nullable | When it landed on a list |
| done_at | date, nullable | When completed or dropped |
| sort_session | relation to sort_sessions, nullable | The session that placed it |
| source | select | pwa, telegram, voice, hermes, desktop |
| position | number | Manual order within a list |
| schema_version | number | 1 |
| owner | relation to users | Used by API rules |

Collection `sort_sessions`: started_at, finished_at, loops_pulled (number), power_hour_started_at, power_hour_done (number), notes (text), owner. Gives history and lets Hermes answer "how did the last sort go".

API rules for both collections, all five operations:

```
@request.auth.id != "" && owner = @request.auth.id
```

State flow:

```
inbox -> scored -> quick_win | someday | active -> done | dropped
```

Any loop can be re-sorted. Clearing its scores sends it back to inbox. Moving it directly between the three lists is also allowed (pro tip 1 in the process).

Sorting rule, applied as a suggestion the user can override per loop:

1. effort 2 or lower: quick_win
2. otherwise, importance 3 or lower and urgency 3 or lower: someday, with a review_at (default 30 days out)
3. otherwise: active

The full schema is built in release 1 even though release 1 never writes a score. That way releases 2 and 3 only touch the frontend.

Markdown export, one file per loop, filename `<created-date>-<slug>.md`:

```markdown
---
id: abc123
title: Decide where to live next year
state: active
category: decision
importance: 5
urgency: 3
effort: 4
review_at:
created: 2026-09-12T08:14:00Z
sorted_at: 2026-09-14T10:02:00Z
source: pwa
schema_version: 1
---
Optional note text here.
```

## 6. The process, mapped to the app

| Step | App behaviour | Release |
|---|---|---|
| 0 Prepare | Nothing to build. Optional focus mode that hides all but the dump screen. | later |
| 1 Brain dump | Dump screen. One input, Enter saves and clears, inbox grows below. Optional 10 minute timer showing the four category memory joggers. Inbox is always open. | 1 |
| 2 Rank | Score screen. Three passes over every inbox loop: importance for all, then urgency for all, then effort for all. Five big buttons, one loop at a time. This enforces the "do not context switch between dimensions" guideline. | 2 |
| 3 Quick wins | Sort screen shows the suggested bucket per loop from the rule in section 5. Confirm or move. | 2 |
| 4 Someday/Later | Same screen. Moving loops to someday asks for a review date once per session and applies it to all of them. | 2 |
| 5 Active projects | Same screen. Finishing the sort closes the sort session and shows the three lists. | 2 |
| 6 Power hour | Timer screen, 60 minutes, quick wins list, tap to complete. "Taking longer" re-runs rules 2 and 3 on that loop and moves it. "This repeats" creates a new active loop titled "System for: <loop>". | 3 |
| 7 Deep work | A daily view for picking 1 to 3 action items from active loops. Overlaps with the desktop app and the 12 Week Year skills, so it is designed together with those. | later |

Continuous dump behaviour: a sort session pulls every loop in state inbox. It also offers to include someday loops whose review_at has passed and active loops untouched for more than N days (suggestion: 30), so lists never go stale.

## 7. Screens

Release 1:

1. Dump (default). Input, inbox list, count badge, optional timer.
2. Lists. Tabs: Inbox, Quick Wins, Active, Someday, Done. Long-press or swipe moves a loop between lists by hand. This is the paper "rewrite it under a new heading" step, done manually until release 2 automates it. Moving to Someday asks for a review date. Tap marks done.
3. Login. One-time PocketBase login, the JS SDK keeps the token.

Release 2 adds Score and Sort. Release 3 adds Power Hour. Bottom nav grows with each release, same pattern as the Energy and training apps.

## 8. Architecture

- Frontend: vanilla JS ES modules, hash router, `manifest.webmanifest` and `sw.js` so it installs on Android and iOS. Tokens copied from `mor/index.html`. nginx container on a new subdomain with Traefik labels.
- Offline: writes go to a small IndexedDB outbox and flush when back online. Reads cache the last list. This is the one piece of real complexity in release 1 and it is worth it because dumps happen on the move.
- Backend: the existing PocketBase. New collections `loops` and `sort_sessions`. A setup script creates them and sets the rules from section 5.
- Auth: one auth user. Login once per device.
- Export: `scripts/export_markdown.py` on a systemd timer, writing into a git repo on the VPS. That repo can be cloned into an Obsidian vault or read by the desktop app.
- Agent access: the REST API is enough for Hermes at first. Hermes has a native MCP client, so the planned MCP wrapper over PocketBase is the cleaner second step. Likely Hermes jobs: capture a loop from a Telegram message, remind when review dates pass, summarise the last sort session, propose today's 1 to 3 actions from active loops.

Suggested repo layout for `open-loops`:

```
index.html                          shell, bottom nav, script tags
manifest.webmanifest
sw.js                               cache shell, network-first for the API
css/app.css                         tokens from mor/index.html
js/api.js                           PocketBase calls and the offline outbox
js/router.js                        hash router
js/views/dump.js                    release 1
js/views/lists.js                   release 1
js/views/login.js                   release 1
js/views/score.js                   release 2
js/views/sort.js                    release 2
js/views/powerhour.js               release 3
scripts/create_collections.py
scripts/export_markdown.py
deploy/docker-compose.snippet.yml   nginx service with Traefik labels
docs/DATA_CONTRACT.md               section 5 of this doc, kept current
```

## 9. The process, condensed for reference

Source: Svend's own notes on "Closing Your Open Loops". The Zeigarnik effect keeps unfinished tasks in an active, tense state. Getting every loop out and sorted releases that energy.

1. Brain dump. Ten minutes, list everything taking up attention. Do not act on anything. Memory joggers: ongoing projects, projects you are thinking about, unmade decisions, one-off admin tasks.
2. Rank each loop on three 1 to 5 scales. Importance (1 irrelevant, 5 makes everything else easier). Urgency (1 no consequence in six months, 5 something breaks within days). Effort (1 under five minutes, 5 a big, time-intensive or emotionally heavy lift). Score all loops on one dimension before moving to the next. First gut reaction. No action while ranking.
3. Quick Wins list: every loop with effort 1 or 2. Do not work on them yet.
4. Someday/Later list: everything left with importance 3 or lower and urgency 3 or lower. Set a review date.
5. Active Projects list: everything remaining, which should have importance or urgency of 4 or higher. Re-check surprises: an item may drop to Someday or move to Quick Wins.
6. Power hour: 60 minutes on Quick Wins, easiest first. If one takes more than a couple of minutes, re-sort it. If one will repeat, add a "build a system for this" loop to Active.
7. Daily deep work: block time, pick 1 to 3 action items from Active.

## 10. Releases

Each release is used for real before the next one starts.

Release 1, capture and lists. Done when the paper inbox and the three paper lists are retired.

1. Infra, half a day. `create_collections.py` creates both collections with the full schema and the auth rules. Create the auth user. Subdomain, nginx container, Traefik labels. The empty PWA installs on the phone.
2. Capture, half a day. Dump screen writes to PocketBase through the offline outbox.
3. Lists, half a day. Five tabs, manual moves, review date on Someday, mark done.
4. Export, half a day. `export_markdown.py` on a systemd timer. Turn on PocketBase backups.

Release 2, scoring and sorting. Done when a full sort session has been run in the app instead of on paper.

5. Three-pass score screen.
6. Sort screen with the suggested-bucket rule, sort sessions recorded, stale-loop pull-in.

Release 3, power hour. Done when a 60 minute session has been run from the app.

7. Timer, complete, "taking longer" re-sort, "this repeats" creates a system loop.

Release 4, agent access. REST notes for Hermes, then the MCP wrapper. First Hermes jobs: capture from Telegram, review-date reminders, last-session summary.

Later, with the desktop app: step 7, daily 1 to 3 deep-work actions from active loops, linked to the 12 Week Year skills.

## 11. Verification per release

- Release 1: add a loop on the phone in airplane mode, go online, see it in the PocketBase admin. Move it through every list. Kill and reopen the app, login survives. Run the export, open the folder in Obsidian, see the file.
- Release 2: run a real sort session with at least 20 loops. Every loop ends on exactly one list. Sort session record has the right count.
- Release 3: run a power hour. "Taking longer" moves a loop to the right list per the rule.
- Release 4: Hermes reads active loops through the API and answers "what did I sort last time".

## 12. Kickoff prompt for the build session

Paste this into Claude Code when starting, from inside the new `open-loops` repo:

> Read `docs/plans/open-loops-app.md` from the svendoldenburg.github.io repo (branch `claude/personal-note-taking-app-fm3x42` or main once merged). Build release 1 only, in the order listed in section 10. Reuse the visual tokens from `mor/index.html` in that repo. PocketBase is at pb.aetheriumforge.cloud. Ask before creating anything on the VPS.

## 13. Sources

- Repo history of svendoldenburg.github.io: commits `1ac8329` (full site), `f7edcc0` (placeholder), `b87fc39` (`mor/index.html`).
- Hermes Agent: https://hermes-agent.nousresearch.com/ and https://github.com/nousresearch/hermes-agent
- PocketBase authentication: https://pocketbase.io/docs/authentication/
- PocketBase releases: https://github.com/pocketbase/pocketbase/releases
