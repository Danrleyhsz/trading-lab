# Pixel Office local navigation and furniture

Status: presentation increment pending review, 2026-10-03. Stacked on living-office presence/collaboration (#28). Production remains entirely online; loopback browser review is development verification only.

## Delivered behavior

The approved scene and character atlas stay unchanged. Original `public/office/navigation.js` adds bounded cardinal-step breadth-first routes over authored room-local foot masks. Four desk spaces conservatively allow their clear front-floor strip; Quant Lab and Meeting Room also permit a side aisle. Lounge permits a central corridor and front/rear floor while excluding sofa, conference-table/chair and cabinet rectangles. This is a conservative navigation layer aligned to the inspected artwork, not a pixel-perfect automatic segmentation of all furniture.

Idle characters can take a longer safe round trip instead of a tiny fixed translation. Each active route reserves its entire footprint conservatively; other characters' actual room anchors and existing planned routes are obstacles. If the start/destination or aisle is blocked, motion waits instead of crossing a person or desk. Crowded rooms can remain still. A reservation is browser presentation state only, never a task, seat booking, meeting record or account operation.

Movement is segmented, so orientation changes on turns and on the return journey. The controller owns one timer/animation per character and checks its generation and motion gate on every completion. Actual room/status changes, pause, hidden page, reduced motion, viewport resize and modal opening cancel the old path. Removed views release their browser reservations. Snapshot refresh keeps stable views and cannot complete an obsolete journey into work/history.

The background now has six named, keyboard-accessible furniture entries: research library, market terminal, risk board, historical-study bench, coffee facilities and collaboration table. They open existing research/market/risk views or the corresponding room inspector. The same entries appear inside room dialogs for mobile access without a small map target. Closing a panel returns focus to its stable object on the map. Controls sit above character hit areas so a nearby character cannot intercept an intended object click.

## Data and authority

The navigation module receives only room geometry, IDs, coordinates and occupied footprints. It has no network calls, broker/risk/AI/store access or server mutation. Agent room, work status, name, experience and reasons stay in the existing backend projection. Position/route cycles are cosmetic browser state. Opening coffee does not record drinking/idle work; opening the collaboration table does not convene a meeting. Existing explicit research/paper actions retain authentication, admission and deterministic risk. No study/order/AI call was triggered for visual review.

## Resource and correctness limits

- Coordinates are even-numbered percentages on a bounded grid. Invalid/off-grid/unknown inputs fail; no snapping across obstacles. Search is capped at 2,304 expansions and never uses diagonal corner cutting.
- The collision model uses character foot centers with a conservative 12-percentage-point exclusion radius for peer paths. It is not full sprite-rectangle/pixel collision, a physics engine or timed multi-agent traffic optimization.
- Whole-route reservations favor safety over movement availability. Future larger layouts may require explicit cells/time intervals and seating priority rather than loosening exclusion silently.
- Current paths stay in the received actual room. Inter-room door graphs, cross-room journeys and actual meeting seat layout are not implemented. Real room changes retain the existing brief arrival effect.
- The atlas still has one neutral frame per agent. Facing and stepping transform that frame; they are not a multi-frame directional sprite sheet. Original directional art remains a next increment.
- Furniture destinations are authored safe approach coordinates. A furniture click is navigation to product information, not a command to send an agent to that object. Periodic idle cycles may prefer a safe furniture approach, when unoccupied; this remains cosmetic and does not assert that the agent used the object.

## Verification

Tests check the Lounge detour around furniture, cardinal steps, blocked narrow aisles, malformed/off-grid geometry, all six accessible approaches, round-trip return, facing reversal, concurrent reservations and stale callbacks/removal. Existing office tests keep actual empty memory/work/accounts and communication safeguards. Browser review covers pointer/keyboard object navigation, room-list alternatives, native Escape and focus return, actual idle roster/empty collaboration, desktop and mobile sizing. Reduced-motion preference remains respected; motion behavior is verified independently through the controller tests. CI must exercise PostgreSQL and the existing compiled historical/container checks before final approval.
