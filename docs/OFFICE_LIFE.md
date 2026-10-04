# Living office v3

Requested 2026-10-04: the characters had walk frames but never moved, and the painted monitors stayed dark. This increment adds movement across every room and puts received data on the scene's screens. It still follows the LIVING_OFFICE_DESIGN contract: motion is cosmetic and never changes backend state, work, experience or P&L.

## Why nothing moved before

- Every agent has a workstation seat, and the presence director stopped every seated agent.
- Only two room-to-room doors existed, and the walkable floor was a thin strip per room.
- The owner's browser reports `prefers-reduced-motion: reduce` (the Windows animation setting). That disabled all motion, and the button could not be clicked.

## Motion preference

- Reduced motion is still the default when the system asks for it.
- **Ativar animações** is now always clickable. It stores an explicit choice in `trading-lab.motion.v1` (browser only).
- Modals, keyboard focus on a character, a hidden tab and a selected handoff still stop every walk and seat the characters.

## Walk map (`public/office/life.js`)

Three lanes follow the front aisle of each row in `office-reference-v2.png`, in scene pixels:

| Lane | y | x range |
|---|---|---|
| r1 | 300 | 80–1720 |
| r2 | 544 | 90–1760 |
| r3 | 812 | 120–1760 |

Four vertical passages connect them: x 632 and 1267 (row 1 ↔ row 2), x 475 and 1320 (row 2 ↔ row 3). Routes move only along lanes and passages, never diagonally. Some destinations have a short final step off the lane (coffee machine, water cooler, risk board, meeting-table ends).

## Idle outings (cosmetic)

- **Who:** a seated IDLE agent. The first outing happens 5–25 s after load, then every 25–70 s.
- **How many:** at most three agents are away at once. Each destination is reserved, so no two agents share one.
- **Where:** coffee, water, lounge, meeting room, Risk Desk board, War Room screens, Análise de Mercado, Data Center, a stretch spot, or a colleague's desk.
- **Bubble:** names the place only (for example "☕ Pausa para café" or "Visitando a mesa de Nova"). It is dashed and italic and never claims work.

## Walks tied to recorded messages

When `/agent-messages` returns a message created at most 30 s earlier:

- **A research finding:** the sender walks to the desk of the first recipient that has a seat. For a pilot briefing that is Nova's desk. On arrival it shows the message, rewritten in Portuguese from the recorded fields only.
- **A risk review:** Sentinel walks to the risk board.
- **Nova's plan:** shown at her desk; she does not move.
- **Recipients:** stay at their desks for 45 s. One on an idle outing is called back.

Each agent's latest recorded message, up to 2 h old, stays above the character with its age. The bubble is marked "registro original" and its tooltip carries the original id.

## Screens (`public/office/screens.js`)

The inner rectangles of the painted screens were measured on the PNG. They show:

| Screen | Content | Source |
|---|---|---|
| War Room left | Nova's (pilot) equity change and curve | `/finance` minute samples |
| War Room centre | Open positions; move vs fresh mark | `/finance` positions, fresh USD-M mark |
| War Room right | Current drawdown from the sampled peak, max observed, curve | `/finance` samples |
| Análise · mark | BTC USD-M mark and session trace | live quote |
| Análise · funding | Quoted funding and time to next settlement | live quote |
| Análise · book | Bid/ask and spread in bps | live quote |
| Análise · pilot | Time to the next hourly decision, last processed candle | `/finance` autonomous status |
| Meeting Room | Last team briefing (one line per researcher, plus Nova's plan) | recorded messages with the same `decisionEventId` |
| Risk Desk board | Five checks: exposure not halted, market fresh, funding reconciled, pilot loss below its limit, persistence healthy | `/finance` risk + autonomous |
| Data Center | Online/alert and last DB write | `/runtime/readiness` |

A missing or stale source shows "indisponível" and a dimmed screen. Nothing is extrapolated.
