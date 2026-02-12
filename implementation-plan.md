# Baywatch AI — Implementation Plan

## Context

**What:** A real-time beach safety intelligence dashboard for a 2-day hackathon, using the Trio API (AI vision on live YouTube streams) + NOAA environmental data to compute zone-level risk scores across 3 LA/OC beach zones.

**Why:** Hackathon judged on Creativity (40%), Trio API Usage (30%), Impact (15%), Polish (15%). This project uses ALL 3 Trio monitoring endpoints (check-once, live-monitor, live-digest) plus jobs management, stream validation, and prepare-stream — maximizing API usage score while delivering a unique, real-world-useful concept.

**Outcome:** A locally-run Next.js app with two views: (1) a desktop "Operations Center" dashboard with SVG coastline map, live video, risk scores, alert feed, and context-based action cards, and (2) a mobile `/patrol` view for field lifeguards receiving push alerts.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (self-hosted, localhost:3000)                       │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Splash   │  │  Dashboard   │  │  /patrol (mobile)      │ │
│  │ Page     │→ │  (desktop)   │  │  Name+Zone login       │ │
│  └──────────┘  │  - SVG Map   │  │  Alert cards           │ │
│                │  - Video     │  │  Browser notifications  │ │
│                │  - Feed      │  └────────────────────────┘ │
│                │  - Actions   │              ↑               │
│                └──────┬───────┘              │               │
│                       │ polls /api/zones every 5s            │
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  API Routes                                              ││
│  │  GET  /api/zones          — all zone state               ││
│  │  GET  /api/zones/[id]     — single zone + narrative      ││
│  │  POST /api/system/start   — initialize monitoring        ││
│  │  GET  /api/system/status  — health check                 ││
│  │  POST /api/webhooks/trio  — Trio webhook receiver        ││
│  │  GET  /api/patrol/alerts  — zone-filtered alerts         ││
│  └──────────────────────────────────────────────────────────┘│
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Orchestrator (in-process timers)                        ││
│  │  - 3 live-monitor jobs (1/zone, auto-restart every 10m) ││
│  │  - 1 live-digest job (rotates across zones every 3m)    ││
│  │  - check-once polling (45s cycle, supplementary conds)   ││
│  │  - NOAA fetch (every 5 minutes)                         ││
│  └──────────────────────────────────────────────────────────┘│
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  In-Memory Store (module singleton)                      ││
│  │  zones{} → risk, environmental, alerts, job IDs, digest ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
         ↕ ngrok tunnel                    ↕ HTTPS
    Trio API (webhooks)              NOAA APIs (polling)
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | CSS Modules + CSS custom properties |
| State | In-memory JS singleton (no DB) |
| Real-time | Frontend polls `/api/zones` every 5s |
| Webhooks | ngrok tunnel → Next.js API route |
| Package manager | pnpm |
| Deployment | Local only (localhost:3000) |
| Font | Bebas Neue (display/logo), system-ui (body) |

---

## Trio API Usage (All Endpoints)

| Endpoint | Usage | Job Slots |
|---|---|---|
| `POST /check-once` | Supplementary conditions (swimmers, emergency vehicles) polled every 45s | 0 (sync) |
| `POST /live-monitor` | 1 per zone: "Are there many people near the waterline?" + webhook | 3 |
| `POST /live-digest` | Rotating narrative summaries (3min per zone) | 1 |
| `GET /api/jobs` | System status display | 0 |
| `GET /api/jobs/{id}` | Job health checks | 0 |
| `DELETE /api/jobs/{id}` | Cleanup on stop/restart | 0 |
| `POST /api/prepare-stream` | Cache streams + get embed URLs on init | 0 |
| `POST /api/streams/validate` | Validate streams on init, detect offline | 0 |
| **Total steady-state** | | **4 of 10** |

### Trio Conditions (yes/no questions)
1. **Live-monitor (1/zone):** "Are there many people near the waterline? Look for groups of people standing or walking close to where the waves meet the sand."
2. **Check-once poll:** "Are there people swimming in the ocean? Look for people in the water past the wave break."
3. **Check-once poll:** "Are there emergency vehicles or personnel visible? Look for lifeguard trucks, ambulances, police cars, or people in uniform."

---

## NOAA Data Sources (All 5 Zones Pre-Configured, User Picks 3)

| Zone ID | Beach | NDBC Buoy (waves/temp) | CO-OPS Tide Station |
|---|---|---|---|
| `venice` | Venice Beach | **46221** (Santa Monica Bay) | **9410840** (Santa Monica) |
| `santa-monica` | Santa Monica | **46221** (Santa Monica Bay) | **9410840** (Santa Monica) |
| `huntington` | Huntington Beach | **46253** (San Pedro South) | **9410660** (Los Angeles) |
| `newport` | Newport Beach | **46222** (San Pedro) | **9410580** (Newport Beach) |
| `laguna` | Laguna Beach | **46222** (San Pedro) | **9410580** (Newport Beach) |

Zone config has an `enabled: boolean` flag. Only enabled zones get monitored. User activates 3 based on available YouTube streams.

**NDBC API** (free, no auth): `https://www.ndbc.noaa.gov/data/realtime2/{STATION}.txt` — fixed-width text, parse row 3 for latest data. Columns: WVHT (wave height m), DPD (wave period s), WSPD (wind speed m/s), WTMP (water temp C). `MM` = missing → null.

**CO-OPS API** (free, no auth): `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station={ID}&product=water_level&datum=MLLW&units=english&time_zone=lst_ldt&format=json&date=latest&application=BaywatchAI`

**Note:** Buoys 46221/46222/46253 report waves + water temp only (no wind). Wind data comes from CO-OPS tide stations (9410840, 9410660) which have anemometers.

---

## Risk Model (Simple Weighted Sum)

| Factor | Source | Weight | Threshold |
|---|---|---|---|
| `swimmersDetected` | check-once | +30 | triggered = true |
| `emergencyVehiclesVisible` | check-once | +25 | triggered = true |
| `highCrowdNearWaterline` | live-monitor webhook | +20 | triggered = true |
| `highWaveHeight` | NDBC buoy | +15 | wave_height > 1.5m |
| `strongWind` | CO-OPS station | +10 | wind_speed > 25 kts |
| `extremeTide` | CO-OPS station | +10 | |deviation from mean| > 1.5ft |
| `poorVisibility` | (future) | +10 | false for MVP |
| **Max possible** | | **120 → capped at 100** | |

**Risk levels:** 0-33 = Low (green), 34-66 = Elevated (amber), 67-100 = High (red)

---

## Context-Based Suggested Actions

Rules evaluated in priority order against active risk factors:

| Condition | Priority | Action |
|---|---|---|
| emergencyVehiclesVisible | urgent | "Emergency Activity Detected — Contact zone lifeguard captain" |
| swimmersDetected AND highWaveHeight | urgent | "Swimmers in Dangerous Surf — Consider red flag, deploy additional guards" |
| highCrowdNearWaterline AND strongWind | warning | "High Crowd + Strong Wind — Increase patrol frequency" |
| swimmersDetected AND extremeTide | warning | "Swimmers in Extreme Tide — Watch for rip currents" |
| highCrowdNearWaterline | warning | "Crowded Waterline — Maintain visual surveillance" |
| highWaveHeight | info | "High Surf Advisory — Monitor conditions" |
| extremeTide | info | "Extreme Tide Conditions — Watch for rip currents" |

---

## File Structure

```
bay-watch-ai-v1/
├── CLAUDE.md                           # Project rules, context, lessons learned
├── progress.txt                        # Block-by-block progress tracker
├── implementation-plan.md              # Full plan (copy of this document)
├── .env.local                          # TRIO_API_KEY, TRIO_BASE_URL, NGROK_URL
├── .gitignore                          # Includes .env.local
├── next.config.ts
├── package.json
├── tsconfig.json
│
├── public/
│   └── fonts/
│       └── BebasNeue-Regular.ttf
│
├── src/
│   ├── types/
│   │   └── index.ts                   # All TypeScript interfaces
│   │
│   ├── lib/
│   │   ├── trio-client.ts             # Trio API wrapper (all endpoints)
│   │   ├── noaa-client.ts             # NDBC text parser + CO-OPS JSON
│   │   ├── store.ts                   # In-memory state singleton
│   │   ├── orchestrator.ts            # Job lifecycle + timers
│   │   ├── risk-engine.ts             # Weighted sum computation
│   │   ├── actions.ts                 # Suggested action rules
│   │   └── zone-config.ts            # 3 zone definitions + NOAA IDs
│   │
│   └── app/
│       ├── layout.tsx                 # Root layout, fonts, meta
│       ├── globals.css                # CSS custom properties, resets
│       ├── page.tsx                   # Splash page
│       ├── page.module.css
│       │
│       ├── dashboard/
│       │   ├── page.tsx               # Main ops center (client component)
│       │   ├── page.module.css
│       │   └── components/
│       │       ├── CoastlineMap.tsx + .module.css    # SVG map + zone markers
│       │       ├── ZonePanel.tsx + .module.css       # Video + gauge + env data + narrative
│       │       ├── LiveVideoEmbed.tsx + .module.css  # YouTube iframe
│       │       ├── RiskGauge.tsx + .module.css       # Semicircle 0-100
│       │       ├── EnvironmentalBar.tsx + .module.css # Wave/wind/tide/temp badges
│       │       ├── AlertFeed.tsx + .module.css       # Scrollable feed
│       │       ├── AlertFeedItem.tsx + .module.css   # Single entry + thumbnail
│       │       ├── ActionCards.tsx + .module.css     # Context-based recommendations
│       │       └── StatusBar.tsx + .module.css       # Top bar: logo, health, jobs
│       │
│       ├── patrol/
│       │   ├── page.tsx               # Mobile patrol view
│       │   └── page.module.css
│       │
│       └── api/
│           ├── zones/
│           │   └── route.ts           # GET all zone data
│           ├── zones/[zoneId]/
│           │   └── route.ts           # GET single zone detail
│           ├── webhooks/trio/
│           │   └── route.ts           # POST webhook receiver
│           ├── system/start/
│           │   └── route.ts           # POST initialize monitoring
│           ├── system/status/
│           │   └── route.ts           # GET health check
│           └── patrol/alerts/
│               └── route.ts           # GET zone-filtered alerts
```

---

## Visual Design

**Theme:** Full Baywatch vibes — bold red/orange accents, lifeguard tower iconography, retro Bebas Neue font for headings, dark (#0a0a0f) background base.

**CSS Custom Properties:**
```css
--color-bg: #0a0a0f;
--color-surface: #141420;
--color-surface-2: #1e1e2e;
--color-red: #ef4444;
--color-orange: #f97316;
--color-amber: #f59e0b;
--color-green: #22c55e;
--color-text: #f1f1f1;
--color-text-muted: #9ca3af;
--color-sand: #f4d98c;
```

**SVG Map:** Hand-crafted simplified inline SVG (~600x500 viewBox) of the LA→OC coastline. Dark ocean background, simplified land mass path, sandy beach strip, zone markers (circles) colored by risk level with CSS pulse animation for elevated/high.

**Dashboard layout:** CSS Grid, 2 columns (60% map+panel / 40% feed+actions). StatusBar fixed top.

**Splash page:** Full-viewport, beach photo background with dark gradient overlay, centered logo + tagline + "Enter Operations Center" CTA button.

---

## Working Process

Each block follows this cycle:
1. **Build** — I launch up to 10 parallel agents to create all files in the block
2. **Report** — I summarize what was built and update `progress.txt`
3. **Test checklist** — I give you specific commands to run and what to verify
4. **You confirm** — You run the tests and report back
5. **Fix** — If anything's broken, we fix it before moving on
6. **Commit** — Clean commit after each block passes

Zones are **configurable** — the system reads from `zone-config.ts`. We build with placeholder stream URLs and swap in real YouTube URLs when you find them. NOAA station IDs are pre-filled for all 5 candidate zones.

**YouTube streams:** I will search for live beach cam candidates and present options. You verify the LIVE badge and confirm.

**GitHub:** On the first commit (after Block 1), I'll create a public repo called `BayWatchAI` and push.

**ngrok:** Will be installed and configured as part of Block 1 scaffolding (via `brew install ngrok` or `npm install -g ngrok`).

---

## Implementation Order (2-Day Schedule)

### DAY 1 — Foundation + Backend

**Block 1 (2h): Scaffolding + Types + Project Files**
- `pnpm create next-app` with TypeScript, App Router, src dir
- `CLAUDE.md` with project context, tech stack, and Lessons section
- `progress.txt` initialized with all blocks
- `implementation-plan.md` (full plan copy)
- All TypeScript interfaces in `src/types/index.ts`
- Zone config with NOAA station IDs in `src/lib/zone-config.ts` (all 5 zones pre-configured, 3 active)
- `.env.local` with TRIO_API_KEY + placeholders
- `.gitignore` (includes .env.local)
- `globals.css` with custom properties + font-face
- Root layout with font loading
- Install ngrok
- Create GitHub repo `BayWatchAI`, first commit + push

**Test checklist (Block 1):**
- `pnpm dev` starts without errors
- `localhost:3000` shows default Next.js page
- `.env.local` exists with TRIO_API_KEY set
- `CLAUDE.md`, `progress.txt`, `implementation-plan.md` exist in repo root
- GitHub repo exists at github.com/<you>/BayWatchAI

---

**Block 2 (2h): API Clients**
- `src/lib/trio-client.ts` — all 7 Trio endpoints wrapped
- `src/lib/noaa-client.ts` — NDBC text parser + CO-OPS JSON fetcher

**Test checklist (Block 2):**
- Run a test script that calls `trio-client.validateStream()` with a known YouTube live URL → returns `is_live: true`
- Run a test script that calls `noaa-client.fetchBuoyData('46221')` → returns wave height, water temp (not all null)
- Run a test script that calls `noaa-client.fetchTideData('9410840')` → returns tide predictions array

---

**Block 3 (2h): Store + Risk Engine + Actions**
- `src/lib/store.ts` — full in-memory store with accessor functions
- `src/lib/risk-engine.ts` — weighted sum + environmental factor derivation
- `src/lib/actions.ts` — context-based action rules

**Test checklist (Block 3):**
- Run a test script that imports store, sets risk factors, computes score → returns correct total/level
- Run a test script that imports actions, passes risk factors → returns correct suggested actions

---

**Block 4 (2h): API Routes**
- All 6 API routes wired to store
- Webhook route calls orchestrator handler (stub orchestrator for now)

**Test checklist (Block 4):**
- `curl localhost:3000/api/zones` → returns JSON with 3 zones, all at risk 0
- `curl localhost:3000/api/zones/venice` → returns single zone detail
- `curl localhost:3000/api/system/status` → returns system health JSON
- `curl -X POST localhost:3000/api/webhooks/trio -H 'Content-Type: application/json' -d '{"event":"watch_triggered","triggered":true}'` → returns `{received: true}`

---

**Block 5 (2h): Orchestrator + E2E Test**
- `src/lib/orchestrator.ts` — job lifecycle, timers, restart logic
- Start ngrok tunnel
- End-to-end test with real Trio API + NOAA data

**Test checklist (Block 5):**
- Start ngrok: `ngrok http 3000` → copy HTTPS URL to `.env.local`
- `curl -X POST localhost:3000/api/system/start` → returns `{status: 'started', jobsCreated: N}`
- Check Trio console (console.machinefi.com) → see running jobs
- Wait 30-60s → `curl localhost:3000/api/zones` → see non-zero risk scores or NOAA data populated
- Check server logs → webhook received from Trio

**Day 1 Checkpoint:** Backend fully functional. All Trio jobs running, NOAA data flowing, risk scores computing, alerts accumulating.

---

### DAY 2 — Frontend + Polish

**Block 6 (2h): Splash + Dashboard Skeleton**
- Splash page with Baywatch branding
- Dashboard page with CSS Grid layout
- StatusBar component
- `useZonePolling` hook (fetches /api/zones every 5s)

**Test checklist (Block 6):**
- Open `localhost:3000` → see Baywatch AI splash page with logo, tagline, CTA button
- Click "Enter Operations Center" → navigate to `/dashboard`
- Dashboard shows grid layout skeleton with StatusBar
- Open browser DevTools Network tab → see `/api/zones` being polled every 5s

---

**Block 7 (2h): Map + Zone Panel**
- Inline SVG coastline with dynamic zone markers
- ZonePanel: LiveVideoEmbed, RiskGauge, EnvironmentalBar, narrative text
- Zone selection (click marker → show panel)

**Test checklist (Block 7):**
- Dashboard shows SVG coastline map with 3 colored zone markers
- Click a zone marker → ZonePanel slides in with video embed + risk gauge + environmental data
- Zone markers change color based on risk level (green/amber/red)
- Environmental bar shows wave height, wind, tide, temperature

---

**Block 8 (2h): Feed + Actions**
- AlertFeed + AlertFeedItem (with frame thumbnails from Trio)
- ActionCards (context-based)
- Wire to polling data

**Test checklist (Block 8):**
- Right column shows scrollable alert feed with entries
- Alert entries show timestamp, zone badge, description
- If Trio has sent frame captures, thumbnails visible in feed
- Action cards appear below feed, changing based on active conditions

---

**Block 9 (1.5h): Patrol Page**
- Name + zone login (localStorage)
- Alert card feed polling
- Browser Notification API
- Mobile-optimized CSS

**Test checklist (Block 9):**
- Open `localhost:3000/patrol` → see login form (name + zone dropdown)
- Enter name + select zone → see patrol view with incoming alerts
- Open browser DevTools → Application → Notifications → permission prompt works
- Resize browser to mobile width → layout adapts properly

---

**Block 10 (1.5h): Polish + Demo Prep**
- CSS animations (pulse, slide-in, gauge fill)
- "Stream Offline" graceful degradation state
- Error handling for NOAA/Trio failures
- Source + configure YouTube live stream URLs
- Test full demo flow end-to-end

**Test checklist (Block 10):**
- Full demo flow: splash → dashboard → zones updating → click zone → detail → patrol on phone
- Zone with no stream URL shows "Stream Offline" state gracefully
- No console errors in browser or server
- All CSS animations smooth (pulse on markers, gauge fill, alert slide-in)

---

## Critical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| YouTube live streams go offline | Zone shows no video/AI data | Graceful degradation: "Stream Offline" state, show last-known data + environmental only |
| Can't find 3 reliable beach cams | Incomplete demo | Search Explore.org, HDOnTap, Surfline YouTube channels. Fallback: use any live outdoor cam and relabel |
| NDBC text parsing breaks | No environmental data | Robust parser with all-null fallback. Environmental section shows "Data unavailable" |
| Trio live-digest SSE hard to consume | No narrative summaries | Fallback: use check-once `explanation` field (always contains descriptive text even for yes/no conditions) |
| Trio 10-min auto-stop restart fails | Live-monitor data stops | check-once polling provides backup. Add retry logic with exponential backoff |

---

## Verification Plan

1. **Trio integration:** POST to `/api/system/start` → verify jobs appear in Trio console (console.machinefi.com) → verify webhooks arrive at `/api/webhooks/trio` → verify `/api/zones` returns updated risk data
2. **NOAA integration:** Check `/api/zones` returns non-null buoy and tide data for all 3 zones
3. **Risk scoring:** Manually trigger conditions (use check-once with a known stream) → verify risk score changes → verify suggested actions update
4. **Dashboard:** Open localhost:3000 → splash loads → enter dashboard → map shows zones → click zone → video + data loads → feed updates every 5s
5. **Patrol:** Open localhost:3000/patrol on phone (via ngrok URL) → login → see alerts arriving → browser notification fires on high risk
6. **Resilience:** Kill a YouTube stream → zone shows "Stream Offline" → other zones continue working
