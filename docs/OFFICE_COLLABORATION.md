# Office recorded collaboration — scope and evidence

Original read-only presentation increment, pending review. Production remains100% online; local previews are development QA only. Existing pixel scene, atlas and renderer are retained.

## Delivered behavior
- The inline board displays six newest entries in the20-message presentation window, preserving original kind/participants/date/ID/summary. Other recent messages remain accessible in room inspectors. Room messages can select the same scene highlights.
- Selection marks actual current sender/recipient views and shows current room/status profile links. Missing agents are labeled unavailable, never created. Finite current DOM positions in recognized rooms supply static SVG lines; unknown/missing endpoints produce no line. Lines are conceptual communication links, not travel paths or historical sending locations.
- Selection cancels owned idle travel and disables cosmetic presence while geometry is inspected; clearing resumes only if the user's existing pause/reduced-motion/visibility/modal gates allow it. Actual backend status/room transitions continue to update characters and links. Resize recomputes current geometry.
- Recent newly seen original records (age0–30s) may label the sender and available recipients for8s. They do not acknowledge receipt/read/acceptance or task completion. Initial load/history/source recovery never performs old chatter. Repeated polling of the same IDs does not repeat indicators.
- Original text uses textContent. Last-window validation rejects malformed dates, unknown participants/kinds, duplicate IDs/recipients and changed observed message fields. Failure clears history/selection/markers rather than showing invented evidence. A successful recovery starts with historical display only.
- Keyboard selection survives refreshed controls. Closing a participant profile restores focus to its current control, or the collaboration button if that control disappeared. Clearing selection focuses the original board entry when available. Mobile stacks list/details and retains explicit profile labels/44px controls.

## Boundaries and remaining work
The existing /agent-messages endpoint reads current backend registry messages; it is not a last-successful-durable-snapshot guarantee or read acknowledgement. Displayed structured messages can precede durable save confirmation; no saved-history claim is added. Open original event audit for separate confirmed evidence where available.

The endpoint still returns complete history. Client presentation limits20 (board6); this is not server pagination or an incremental feed. Message validation compares the current20-message window; it is not a full immutable journal verifier. Clearing an unavailable source intentionally removes the local comparison window, and recovery is not replayed as live speech.

Static links cross painted walls because they express participants, not actor travel. They are refreshed with normal snapshots/resize; no animation/render loop, particle transport, meeting choreography, seats, inter-room navigation or original directional frame sheet is supplied. Opening/selecting communication cannot summon agents, create meetings/work, change memory/experience, approve risk, execute a paper order or call AI. No external code/art/dependency was imported.

## Verification
Meaningful fixtures cover bounded/copy-safe originals, conflicts/malformed identities, absent/nonfinite endpoints, current geometry after actual state transitions, unavailable participant labels, sender/recipient indicators, source failure, selection removal and keyboard/profile return. Actual preview retains its real empty communication history. A separate temporary loopback test server returns explicitly labeled fixtures with no trading backend, mutation handlers, persisted state, market/provider connection or credentials; it verifies the nonempty board/line/profile/mobile presentation without seeding product records.
