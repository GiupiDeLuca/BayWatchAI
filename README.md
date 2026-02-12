<p align="center">
  <img src="https://img.shields.io/badge/BAYWATCH-AI-e63946?style=for-the-badge&labelColor=2b2d42&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2U2Mzk0NiI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48L3N2Zz4="/>
</p>

<h1 align="center">
  <code style="color: #e63946">BAY</code><code style="color: #2b2d42">WATCH</code> <sup>AI</sup>
</h1>

<p align="center">
  <strong>Coast-Wide Beach Safety Intelligence</strong>
  <br/>
  <em>"Somebody's gotta watch over this beach. Today, it's AI."</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000?style=flat-square&logo=next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Trio_AI-Vision-e63946?style=flat-square"/>
  <img src="https://img.shields.io/badge/NOAA-Environmental-1d6fa5?style=flat-square"/>
</p>

---

Real-time AI monitoring of the LA coastline using **Trio AI Vision** on live YouTube beach cams and **NOAA environmental data** (waves, tides, wind, water temperature). Three monitored zones — Santa Monica, Venice, and Manhattan Beach — with computed risk scores, automated alerts, and context-based lifeguard action recommendations.

Built for the **Trio API Hackathon** (Creativity 40% / API Usage 30% / Impact 15% / Polish 15%).

---

## How It Works

```
YouTube Live Cams ──► Trio AI Vision ──► Condition Detection
                                              │
NOAA Buoys + Tides ──► Environmental Data ────┤
                                              ▼
                                    ┌─────────────────┐
                                    │   Risk Engine    │
                                    │  Weighted Score  │
                                    │   0-100 / zone   │
                                    └────────┬────────┘
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                         Dashboard      Alert Feed    Action Cards
                        (3 zones)     (real-time)    (context-based)
```

**Trio AI** watches each beach cam and answers questions like:
- *"Are there many people near the waterline?"* (live-monitor, per zone)
- *"Are there people swimming past the wave break?"* (check-once, polling)
- *"Are there emergency vehicles visible?"* (check-once, polling)

These detections combine with NOAA wave height, tide level, wind speed, and water temperature to produce a **0-100 risk score** per zone, which drives color-coded alerts and suggested lifeguard actions.

---

## Features

| Feature | Description |
|---|---|
| **3-Zone Monitoring** | Santa Monica, Venice, Manhattan Beach — each with dedicated AI + environmental tracking |
| **Live Video Feeds** | Embedded YouTube live cams with Trio AI vision analysis |
| **Risk Scoring** | Weighted 0-100 score combining AI detections + NOAA environmental factors |
| **Alert Feed** | Real-time scrolling feed of all detections and environmental warnings |
| **Action Cards** | Context-based lifeguard recommendations (e.g. "Swimmers in Dangerous Surf") |
| **Illustrated Maps** | Tourist-style SVG maps per zone with landmarks, streets, and risk markers |
| **NOAA Integration** | Live wave height, tide level, wind speed, water temperature from NDBC buoys and CO-OPS stations |
| **Demo Mode** | Auto-seeded data + trigger panel at `/demo` for live hackathon presentations |
| **Mobile Patrol** | `/patrol` view for field lifeguards with zone-filtered alerts |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript 5.7** |
| UI | **React 19** + CSS Modules |
| AI Vision | **Trio API** (check-once, live-monitor, live-digest) |
| Environmental | **NOAA** NDBC buoys + CO-OPS tide stations |
| State | In-memory singleton (no database) |
| Real-time | Frontend polls `/api/zones` every 5s |
| Webhooks | ngrok tunnel for Trio callbacks |
| Font | Bebas Neue (display) + system-ui (body) |

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **pnpm** (or npm/yarn)
- **ngrok** for Trio webhook callbacks
- A **Trio API key** from [console.machinefi.com](https://console.machinefi.com)

### 1. Clone & Install

```bash
git clone https://github.com/GiupiDeLuca/BayWatchAI.git
cd BayWatchAI
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```env
# Trio AI Vision
TRIO_API_KEY=your_trio_api_key_here
TRIO_BASE_URL=https://trio.machinefi.com/api

# ngrok tunnel URL (set after starting ngrok)
NGROK_URL=https://your-tunnel.ngrok-free.app
```

### 3. Start ngrok

In a separate terminal, start an ngrok tunnel pointing to port 3000:

```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL and update `NGROK_URL` in `.env.local`.

### 4. Run the Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the Baywatch AI splash page.

### 5. Enter the Operations Center

Click **"ENTER OPERATIONS CENTER"** — this calls `/api/system/start` which:
1. Initializes the orchestrator (Trio jobs + NOAA polling)
2. Seeds demo data so the dashboard isn't empty
3. Redirects to the dashboard

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Splash page
│   ├── globals.css                       # Theme + CSS custom properties
│   ├── dashboard/
│   │   ├── page.tsx                      # Main ops center
│   │   └── components/
│   │       ├── StatusBar.tsx             # Top bar: logo, health, jobs
│   │       ├── ZoneSummaryStrip.tsx      # Zone cards with video + risk + data
│   │       ├── ZoneMiniMaps.tsx          # Illustrated tourist-style SVG maps
│   │       ├── AlertFeed.tsx             # Scrollable alert feed
│   │       └── ActionCards.tsx           # Context-based recommendations
│   ├── patrol/page.tsx                   # Mobile lifeguard view
│   ├── demo/page.tsx                     # Demo trigger panel
│   └── api/
│       ├── zones/route.ts                # GET all zone data
│       ├── system/start/route.ts         # POST initialize monitoring
│       ├── webhooks/trio/route.ts        # POST Trio webhook receiver
│       └── demo/                         # Demo seed + trigger endpoints
│
├── lib/
│   ├── trio-client.ts                    # Trio API wrapper (all endpoints)
│   ├── noaa-client.ts                    # NDBC buoy + CO-OPS tide parser
│   ├── store.ts                          # In-memory state singleton
│   ├── orchestrator.ts                   # Job lifecycle + timers
│   ├── risk-engine.ts                    # Weighted risk score computation
│   ├── actions.ts                        # Suggested action rules
│   ├── zone-config.ts                    # Zone definitions + NOAA station IDs
│   └── demo-data.ts                      # Demo seeder + event triggers
│
└── types/index.ts                        # All TypeScript interfaces
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/zones` | All zone states (risk, environmental, alerts, actions) |
| `GET` | `/api/zones/[zoneId]` | Single zone detail with narrative |
| `POST` | `/api/system/start` | Initialize monitoring + seed demo data |
| `GET` | `/api/system/status` | Health check (jobs, uptime) |
| `POST` | `/api/webhooks/trio` | Trio webhook receiver |
| `POST` | `/api/demo/seed` | Seed demo data |
| `POST` | `/api/demo/trigger` | Trigger specific event (`{zoneId, event}`) |
| `GET` | `/api/patrol/alerts` | Zone-filtered alerts for mobile patrol |

---

## Risk Model

Risk is a weighted sum of AI detections + environmental factors, capped at 100:

| Factor | Source | Weight |
|---|---|---|
| Swimmers detected | Trio check-once | +30 |
| Emergency vehicles visible | Trio check-once | +25 |
| Crowded waterline | Trio live-monitor | +20 |
| High wave height (>1.5m) | NOAA NDBC buoy | +15 |
| Strong wind (>25 kts) | NOAA CO-OPS | +10 |
| Extreme tide deviation | NOAA CO-OPS | +10 |

**Risk levels:** `0-33` Low (green) | `34-66` Elevated (amber) | `67-100` High (red)

---

## Trio API Usage

All available Trio endpoints are used:

| Endpoint | Usage |
|---|---|
| `POST /check-once` | Supplementary condition polling (swimmers, emergency vehicles) |
| `POST /live-monitor` | 1 per zone — continuous waterline crowd detection via webhooks |
| `POST /live-digest` | Rotating narrative summaries across zones |
| `GET /api/jobs` | System status display |
| `GET /api/jobs/{id}` | Job health checks |
| `DELETE /api/jobs/{id}` | Cleanup on stop/restart |
| `POST /api/prepare-stream` | Cache streams + get embed URLs on init |
| `POST /api/streams/validate` | Validate streams on init |

---

## NOAA Data Sources

| Zone | NDBC Buoy | CO-OPS Tide Station |
|---|---|---|
| Santa Monica | 46221 (SM Bay) | 9410840 (Santa Monica) |
| Venice | 46221 (SM Bay) | 9410840 (Santa Monica) |
| Manhattan Beach | 46221 (SM Bay) | 9410840 (Santa Monica) |

Data includes: wave height (m), dominant wave period (s), water temperature (C), tide level (ft), wind speed (kts).

---

## Demo Mode

For hackathon presentations, the system auto-seeds realistic data on start. You can also manually trigger events:

**Trigger Panel:** Visit [localhost:3000/demo](http://localhost:3000/demo) to fire specific events per zone:
- `swimmers_detected` | `crowd_waterline` | `emergency_vehicle`
- `high_waves` | `strong_wind` | `extreme_tide`
- `all_clear` (reset zone to safe)

**API trigger:**
```bash
curl -X POST http://localhost:3000/api/demo/trigger \
  -H "Content-Type: application/json" \
  -d '{"zoneId": "venice", "event": "emergency_vehicle"}'
```

---

## Design

The UI uses a warm beach aesthetic inspired by the original Baywatch show:

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#faf6ee` | Warm cream background |
| `--color-red` | `#e63946` | Primary accent (alerts, branding) |
| `--color-red-dark` | `#c1121f` | Hover states, depth |
| `--color-sand` | `#d4a055` | Secondary accent (warm highlights) |
| `--color-ocean` | `#1d6fa5` | Info states, water elements |
| `--color-risk-low` | `#22c55e` | Safe / low risk |
| `--color-risk-elevated` | `#f59e0b` | Elevated risk |
| `--color-risk-high` | `#ef4444` | High risk |

Font: **Bebas Neue** for display headings, **system-ui** for body text, **SF Mono** for data.

---

## License

Built for the Trio API Hackathon 2026. Not affiliated with the Baywatch television franchise.

---

<p align="center">
  <em>"I'm always ready." — Mitch Buchannon</em>
  <br/><br/>
  <sub>Built with Trio AI Vision + NOAA + Next.js</sub>
</p>
