# Recorded room transitions

Presentation increment, 2026-10-03, pending review; stacked on recorded collaboration (#30). Production remains cloud-only. Loopback screenshots are development verification.

## Behavior

Backend room/status is rendered immediately in the stable character, roster and profile. A newly received AGENT_STATE_CHANGED event can additionally start a browser-only journey from the previous rendered foot position to the destination. Walking cannot delay or change work, grant experience, write memory/history, acknowledge a message or execute anything.

Two reversible passages are authored against the existing scene: Research Lab ↔ Quant Lab and Trading Floor ↔ Lounge. Quant uses a dogleg below its entrance to pass to the right of the back shelf, then reaches the clear front-floor strip. A first straight route was rejected during visual inspection; a regression checks the shelf exclusion. Lounge uses its open middle entrance and corridor between sofa and table. Other room pairs, including Risk Desk ↔ Meeting Room, remain unverified and settle directly at the actual destination. There is no general six-room door graph yet.

The planner retains the cardinal room-local floor model and adds scene-percent connectors. A current stroll can depart from its actual foot position only when its short bridge to the grid stays inside the authored floor. Unknown/invalid rooms, slots, floor positions, occupied corridors or missing geometry produce no journey. Current workflow phases often keep agents in the same room; a default-disabled office does not generate travel simply to appear busy.

## Ownership, freshness and occupancy

Only a matching streamed event with an ID and timestamp within five seconds of the browser clock (one second future tolerance) admits travel. Initial snapshots, polling, historical events and recovery never replay journeys. Clock skew or delayed delivery settles at the current destination. This presentation rule does not validate or reorder domain history.

Each traveler owns one segmented Web Animation at a time and a generation. Turning updates presentation facing; speed scales to finish the entire route in at most eight seconds. Completed filled effects are canceled rather than accumulated. Duplicate or obsolete completions cannot advance another segment.

The complete route is sampled at intervals no larger than 0.5 scene percentage points and reserved. Actual peer anchors and existing local/travel paths are obstacles. Idle movement also considers a traveler's departing-room route, not just its updated logical destination. A peer state arriving in a reserved corridor cancels the journey. Blocked travel is never queued for replay; crowded rooms may remain still.

Actual room/status/slot changes, view removal, pause, hidden page, reduced motion, modal/communication selection, resize and stream disconnect cancel travel. The character then rests at its received destination. Focused characters do not start or continue moving. Existing room/object/profile controls and focus return remain available on mobile.

## Boundaries

- Foot-center geometry is not sprite-rectangle collision, pixel-perfect physics, depth occlusion, seat ownership or timed traffic optimization. The narrow Quant passage does not promise full-width sprite clearance.
- The atlas still has one neutral pose per agent. Existing CSS stepping/facing transforms remain; no new directional frames, seated poses or finished animation art are delivered here.
- No new backend route/state/schema, imported code/art/dependency, renderer rewrite, paid AI, study/order activation, external account, provisioning or public deploy.
- The motion module has no network, broker, risk, AI or persistence capability. Placement stays separate from authoritative room/status.
- Opening coffee/collaboration does not schedule a break/meeting. Meeting placement needs actual room/status evidence and validated seats/doors, still pending.

## Verification

Baseline: clean 97fe0b5/#30, CI green with 166/166 tests including PostgreSQL; local typecheck and 165 passed, one PostgreSQL integration skipped. After changes: typecheck/build passed; full local suite 177 passed, one PostgreSQL integration deferred (178 total); 57 compiled office checks passed. CI now also runs compiled office checks, alongside PostgreSQL, historical worker checks and the container build.

Tests cover reversible/cardinal doors, the Quant shelf detour, invalid/unknown/occupied paths, current feet, immediate actual labels, duration/effect ownership, sampled conflicts, status changes, stale callbacks, focus, reduced motion, disconnect and snapshot non-replay. Actual browser review checked eight idle agents, empty memories/messages/positions/evaluation accounts, observed public spot and honestly unavailable USD-M. Desktop room → profile → Escape/focus and 390×844 mobile object/dialog/Escape passed; mobile body/client width 375px and dialog 351px, no body overflow. Reduced-motion preference stayed enabled: temporal motion is covered by controller tests, not claimed as a live browser walking demonstration.

A separate explicitly bannered TEST_ONLY geometry page overlaid foot routes on the unchanged scene. It had no trading backend, market, storage, mutation or provider access; no fixture events were uploaded. Screenshots stay outside the repository. Temporary tabs/owned loopback processes were closed. Verify remote CI before reporting the draft validated.

Next: original directional frames and task/interaction poses with art review, then additional doors/seats and evidence-driven meeting placement. Never synthesize work or add artificial task delays to finish an animation.
