# Baywatch AI

## Project Overview
Real-time beach safety intelligence dashboard for a hackathon. Uses the Trio API (AI vision on YouTube live streams) + NOAA environmental data to compute zone-level risk scores along the LA/OC coastline.

## Tech Stack
- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** CSS Modules + CSS custom properties
- **State:** In-memory singleton (no database)
- **Package manager:** pnpm
- **External APIs:** Trio (trio.machinefi.com), NOAA NDBC, NOAA CO-OPS

## Key Architecture Decisions
- Self-hosted locally (not Vercel) — needs persistent in-memory state + timers
- ngrok tunnel exposes localhost for Trio webhooks
- Frontend polls `/api/zones` every 5 seconds (no WebSocket/SSE to frontend)
- Orchestrator runs in-process timers for job restarts, check-once polling, NOAA fetching

## File Structure
- `src/types/index.ts` — All TypeScript interfaces (single source of truth)
- `src/lib/` — Backend logic: trio-client, noaa-client, store, orchestrator, risk-engine, actions, zone-config
- `src/app/` — Next.js pages: splash (/), dashboard (/dashboard), patrol (/patrol)
- `src/app/api/` — API routes: zones, webhooks, system, patrol
- `src/app/dashboard/components/` — Dashboard UI components

## Environment Variables (.env.local)
- `TRIO_API_KEY` — Trio API authentication key
- `TRIO_BASE_URL` — https://trio.machinefi.com/api
- `NGROK_URL` — ngrok tunnel URL (set after starting ngrok)

## Commands
- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `ngrok http 3000` — Start webhook tunnel (separate terminal)

## Trio API Constraints
- Conditions MUST be yes/no questions
- Jobs auto-stop after 10 minutes (must restart via webhook handler)
- Max 10 concurrent jobs per account
- Only YouTube Live streams (must have active LIVE badge)
- Pre-filtering skips static frames (saves cost but means fewer data points for quiet scenes)

## NOAA Data Notes
- NDBC buoys (46221, 46222, 46253) report waves + water temp only (NO wind)
- Wind data comes from CO-OPS tide stations (9410840, 9410660)
- NDBC data is fixed-width text format — parser must handle `MM` values as null
- CO-OPS API returns JSON — use `application=BaywatchAI` param

## Lessons Learned
<!-- Add rules here when mistakes are made during development -->
<!-- Format: - [date] description of the mistake and the correct approach -->
