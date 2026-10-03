# Seated workstations and truthful monitors

Eight original characters now default to their own computer seat when the backend places them in that workstation's actual room. Atlas, Satoshi and Oracle each have a separate Research desk; Euler/Vega occupy Quant, Nova/Flux Trading and Sentinel Risk. A visiting agent keeps its real room and uses the existing floor placement. No backend room, experience, work record or account is changed for visual convenience.

## Scene and movement
The original background and eight character sources are unchanged. Built-in imagegen produced research-stations.png with three desks. The browser clips that variant to the Research furniture rectangle so all other scene pixels remain original. WORKSTATION_ART.json records the exact prompt, source, hash and size. No third-party art or renderer is added.

Column 6 of the existing character sheets supplies the static seated back view. It is a posture for both available and busy states, not evidence of typing. The character scales with the scene; existing chair-back art is a pointer-transparent foreground mask. Each named seat has one owner and is only assigned when that owner's real room matches. IDLE at a station schedules no cosmetic stroll.

The two existing verified door routes can begin/end at catalog seats through an explicit front-of-chair access leg to the existing floor aisle. The actual rendered departure must match the seat within a small tolerance; the entire route remains reserved. Fresh original room-change events are still required. Unverified doors, blocked routes, focused characters, dialogs, hidden/pause/reduced-motion conditions settle immediately to the authoritative state. This is not a complete physical sit/stand interaction animation. Fine gait timing and knee/arm/desk contact still need visual review.

## Monitors and evidence
Each physical workstation has a live, read-only monitor button. It reuses existing agent snapshots and event reception; there is no new endpoint or eight-profile background poll. Clicking opens the existing real profile with current state, reason, timestamp and an original source event link only when the bounded session event exactly matches that state. Without that ID the coverage gap is explicit; existing profile history still supplies recorded originals.

IDLE says **Sem tarefa**, and its reason is labeled **last recorded reason, not a current task**. A recent receipt can confirm an unchanged older state; backend updatedAt is not falsely used as receipt freshness. After 15 seconds without a valid receipt, malformed timestamps, or a snapshot failure, the monitor says stale/unavailable and stops highlighting activity. A dropped event stream identifies the remaining snapshot explicitly. Historical memories/results remain labeled historical; absent evidence stays absent. No percentages, chart samples, typing, task delays, order calls or social chatter are manufactured.

## Verification
Baseline: typecheck and 184 local passes, one PostgreSQL skip (185 total); parent #32 CI passed PostgreSQL and all checks. Increment: typecheck/build, 190 local passes plus one PostgreSQL skip (191 total), and 70 compiled office passes. CI validates PostgreSQL and the container.

Actual development browser review: all eight IDLE, zero work/individual accounts, public spot observed, USD-M honestly unavailable, execution/autonomy disabled. All eight show exactly the up-facing seated source frame, including reduced motion. Monitors open actual empty profiles. Mobile 390×844: body/client 375px and profile 341px, no page overflow; monitor hit areas at least 44px. No console errors observed. Unit scenarios are TEST_ONLY, isolated from backend writes. The machine's reduced-motion preference was honored; no live temporal gait perfection is claimed.

## Remaining work
Live job/dataset/strategy cards and actual available curves should deepen the selected monitor with explicit current-versus-last-result attribution. Task status alone is not proof of successful work. Mobile transfer remains heavy: eight source sheets total 17.86MB and the additive scene variant is 2.71MB; optimize production delivery without losing original provenance. Do not regenerate the entire sprite set.

Deterministic research/backtest/risk/paper flows exist when explicitly invoked; no paid LLM adapter or hosted 24/7 service is connected. Research scheduling, cloud/PostgreSQL deployment and any execution/AI activation remain separately gated. No merge, provider contract or public deployment is part of this increment.
