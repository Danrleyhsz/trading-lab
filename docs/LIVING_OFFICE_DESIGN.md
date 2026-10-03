# Living Pixel Office — product contract and incremental design

Status: first presentation increment, pending review. Updated 2026-10-03 following the user's request for a living, interactive office and broad reuse research. See [research and adoption matrix](OPEN_SOURCE_RESEARCH.md). This document consolidates available product intent; it is not an allegedly recovered historical master GDD.

## Intended experience

The office is the laboratory's primary interface. A person can explore six connected spaces, follow the real team workflow, inspect an agent's role/memory/history and understand the market, separate account performance and risk. Characters should have recognizable identity, visible presence, movement, contextual actions and interaction with colleagues. The approved scene remains the art direction; desktop and mobile must both reach every agent and function.

Research Lab coordinates hypotheses; Quant Lab tests them; Risk Desk reviews exposure deterministically; Trading Floor displays approved paper work; Meeting Room exposes structured collaboration; Lounge provides cosmetic presence. Atlas coordinates, Euler tests, Sentinel reviews risk and Nova handles paper trading. Satoshi, Flux, Vega and Oracle retain their existing specializations. A role or desk does not assert that any work was performed.

Production runs entirely online. The browser presents cloud state; no essential runtime depends on a personal computer. AI analytical calls remain disabled without a reviewed provider/budget contract. Activity, memory and career are auditable, not rewards granted for walking.

## Three distinct layers

1. **Domain evidence:** agents, actual room/status/reason, messages, original events, research/study evidence, memories and account ledgers. Existing backend/risk/persistence remain authoritative.
2. **Presentation director:** stable character views, orientation and cancelable cosmetic motion. It reads agent projections without modifying them. It owns only browser timers/animations.
3. **Interaction:** rooms and characters open existing views; collaboration exposes original participants, message time/ID and summary. Read-only navigation does not schedule work. Existing explicit research/paper controls retain all authentication, admission and deterministic risk checks.

Idle breathing or short local wandering is permitted and consumes no AI. It must not create a research/meeting/trade status, change a server room, grant experience or append history. A work pose requires actual non-idle state; a message bubble requires a newly observed original message. Historical messages are browsable without replaying them as current chatter.

## Delivered increment

- Reuse each character element across snapshots/events; preserve identity and avoid periodic re-creation.
- Authored short round trips in the front-floor lane of a known actual room; unknown rooms do not receive an invented room label or path. Task/room changes cancel prior motion; brief arrival fades do not imply collision-aware inter-room walking.
- Six keyboard-accessible room entrances show current occupants, contextual links and existing profiles. The collaboration button opens Meeting Room's last 20 fetched messages.
- Sender → original recipients, safe text summaries, dates and IDs; recent unseen messages may create an eight-second visual indicator. Initial load and access/source recovery do not replay old speech.
- Paused, hidden, reduced-motion or modal states cancel owned movement. Reduced-motion preference is labeled explicitly. Room/message focus survives periodic replacement of controls; closing uses native dialog focus behavior.

All scene interactions in this increment are read-only. No third-party source/assets, renderer dependency, database schema, market adapter or execution authority was introduced.

## Next movement and interaction increment

Author a navigation layer aligned with the approved scene: room walkable areas, obstacle polygons/tiles, door links, desk seats and safe furniture approach points. Keep scene coordinates and logical backend room separate. Routes between rooms must originate in a received real room transition; queued/stale transitions must cancel cleanly. Never delay, hide or rewrite actual work state just to finish an animation.

Create original directional frames for idle/walk and reviewed task poses, retaining each agent's identity. Seats and furniture occupancy need deterministic presentation reservations; path failures show a stable accessible character instead of crossing desks/walls. Optional cosmetic social presence must be labeled and must not become a backend meeting or fabricated dialogue.

Connect task boards and handoffs to existing recorded research/message IDs. Show accepted, rejected, failed and interrupted outcomes equally. Do not infer a completed task from a consumed paper cursor, a profitable simulation, a conversation or a position card. Open exact evidence from the board. A real meeting scene requires actual room/status evidence; opening the room never convenes agents.

Use the current DOM scene while it can meet movement/accessibility requirements. Phaser is a researched candidate, not an approved rewrite. Any substantial renderer/world-engine migration should be isolated, compared against mobile/accessibility/resource requirements and reviewed before merging. No external service is required for a client navigation layer.

## Limits and verification

The atlas still contains a single neutral pose per agent; CSS transforms are not a full walking sprite sheet. Current paths are short room-local lanes, not a general collision map. The communication API still returns complete history; only its presentation is capped at 20. Room filtering uses current occupants and does not establish a historical conversation location. No actual AI conversation generation or public deployment is claimed.

Tests cover stable characters, no invented activity, original participant/message rendering, new-message-only speech, access/error handling, stale animation callbacks, cancelation, reduced motion and room focus. Browser checks use actual empty history/default-disabled execution; nonempty scenarios use test fixtures only. Keep zero work/P&L/memory in the preview when those are its actual values.
