# TradingLab Office 2.0 — Visual Systems & Asset Production Handoff

Status: implementation planning + visual production contract
Depends on: docs/research/atsmatrix-tradinglab-evolution.md
Working rule: inspect existing office/assets before redesigning. Existing layout is NOT sacred; preserve useful identity/assets but a major layout upgrade is authorized.

## Goal

Evolve the current TradingLab pixel-art office into a real visual control plane backed by actual TradingLab events. Incorporate, in TradingLab's own design language, useful concepts inspired by:
- Agent Compound: physical/pixel-art work floor
- Agent Ring: explicit decision/validation pipeline
- Horizon: market intelligence room
- Nexus: agent communication/network view
- Collision: deep diagnostic/activity view
- Voxel Yard concept: experimentation/backtest/stress environment

Do not clone ATS-MATRIX artwork or fake its metrics. Build TradingLab-native modules.

## Mandatory first pass for Claude

Before UI implementation:
1. Read canonical project/state/agent docs and the ATS-MATRIX evolution document.
2. Inspect current office implementation completely.
3. Locate and inventory the existing notebook/repository asset folders actually used by the office.
4. Identify each existing image/sprite, dimensions, format, transparency, references/usages and whether reusable.
5. Inspect responsive behavior for notebook and mobile.
6. Map existing backend events/APIs/WebSockets to visual modules.
7. Run current tests and record baseline.
8. Produce the documents listed below BEFORE requesting new art.

Claude may redesign the whole current office/layout if that produces a better result. Do not delete useful existing assets until replacements are integrated and verified.

## Target visual architecture

### 1. Main Office / Compound view
Keep pixel-art as the primary identity. Agents visibly move/work, but animations must reflect real state where possible.
Suggested zones:
- Market/Data
- Research
- Strategy
- Risk
- Validation
- Paper Execution
- Audit/Logs
- Stress Lab
- Backtest Lab
- Lounge/Idle state

Agents may walk/sit/use terminals. Visual state must never imply a real action that backend telemetry does not support.

### 2. Decision Ring
A dedicated view/panel for:
TRADER -> RISK -> VALIDATOR -> PAPER EXECUTION -> AUDIT
Show current decision, status, block reason, latency and receipt link. Use real decision lifecycle events.

### 3. Horizon / Market Intelligence room
A dense but readable market room:
- selected symbols
- price/volume
- regime/trend state
- volatility
- order-flow/liquidity only if real data exists
- signal/strategy evidence
- source freshness
No invented whale/arbitrage/order-book metrics.

### 4. Nexus / Communications
Network graph of real agent interactions/handoffs. Nodes = agents/services/stages; edges = actual messages/decision handoffs. Support selected-run filtering and recent activity.

### 5. Collision / Diagnostics
Advanced technical view for a selected run:
- decision/event timeline
- evidence references
- validator disagreements
- failures/retries
- stage latency
- risk checks
- provenance
This is a diagnostic tool, not decorative animation.

### 6. Stress Lab / Experiment Yard
Pixel-art laboratory plus functional result panels. Run deterministic paper-only scenarios and display:
- scenario
- seed
- agents involved
- risk violations
- kill-switch activations
- worst slippage
- max drawdown
- recovery time
- stale-data blocks
- result/invariant status

## Navigation proposal

Main Office is the default visual home. Other systems may be rooms, tabs, zoomable zones, monitor overlays or dedicated routes. Claude should choose the simplest architecture consistent with the existing code and notebook/mobile constraints. Avoid making everything visible simultaneously.

## Asset workflow — REQUIRED

Claude must create:
docs/design/OFFICE_ASSET_INVENTORY.md
docs/design/OFFICE_ASSET_REQUESTS.md

Optionally also:
docs/design/OFFICE_VISUAL_SPEC.md

### OFFICE_ASSET_INVENTORY.md
For every existing relevant asset:
- current exact path
- filename
- format
- pixel dimensions
- transparent background yes/no
- sprite-sheet/frame layout if applicable
- where referenced
- current purpose
- reuse: yes / modify / replace / unknown
- notes

### OFFICE_ASSET_REQUESTS.md
This is the production contract for ChatGPT/image generation. Each missing or replacement asset MUST be one row/item with:
- Asset ID
- exact output filename
- destination folder/path
- purpose/module
- exact canvas width x height in px
- transparent background required? yes/no
- pixel-art style requirements
- camera/view angle
- subject/object description
- composition/bounds/safe area
- palette or visual relationship to existing assets
- animation required? yes/no
- if animated: frame count, frame size, sheet orientation/order, FPS recommendation and loop behavior
- variants required
- forbidden elements
- priority: P0/P1/P2
- integration notes
- reference existing asset(s), if any

Do NOT write vague requests such as "make a risk room". A request must be executable without guessing.

Example:
Asset ID: TL-OFFICE-RISK-DESK-001
Filename: risk_desk_terminal.png
Destination: <actual repo asset path>
Canvas: 192x128
Background: transparent
View: same isometric/pixel perspective as current office
Description: risk-control desk with three monitors...
Animation: no
Priority: P0

Claude must derive exact sizes from the existing renderer/layout whenever possible. If size is flexible, state a permitted range and preferred exact size.

## ChatGPT visual-production responsibility

After Claude commits OFFICE_ASSET_INVENTORY.md and OFFICE_ASSET_REQUESTS.md, Dan can ask ChatGPT to read them.

ChatGPT will:
1. read the committed manifest
2. validate filenames, dimensions, paths and ambiguities
3. flag any impossible/inconsistent request before generation
4. generate requested visual assets in batches
5. preserve transparent backgrounds when specified
6. use exact filenames from the manifest
7. create animation frames/sheets according to the declared contract where image-generation output allows reliable production
8. package generated assets into a folder hierarchy mirroring the requested destination structure
9. provide the resulting files for integration; when repository write access/workflow is appropriate, place/commit them on a dedicated asset branch rather than main
10. produce a short generation manifest recording what was created and any deviations

Important: image generation may not reliably guarantee mathematically exact sprite-frame content in one generation. For strict sprite sheets, prefer generating clean source frames/assets and then assembling/cropping/scaling them programmatically to the exact canvas/sheet dimensions. Claude must specify frame contracts clearly.

## Asset style rules

- preserve TradingLab pixel-art identity unless OFFICE_VISUAL_SPEC explicitly approves a new coherent style
- no copyrighted character copies
- no ATS-MATRIX logo/branding/artwork copies
- agents must remain visually distinguishable at notebook scale
- assets should be readable at intended rendered size, not just zoomed
- avoid tiny text baked into images; UI text should remain HTML/canvas text where practical
- use transparent PNG for composable sprites/objects unless renderer requires another format
- keep large static backgrounds separate from interactive sprites where practical
- prefer reusable modular furniture/terminal/room assets over one giant baked scene when existing renderer supports composition

## Backend truth contract

Every visual state must map to one of:
REAL: derived from backend event/state
STATIC: decorative environment
SIMULATION: explicit paper/stress/backtest simulation
UNKNOWN/OFFLINE: no current observation

Never convert UNKNOWN into a random value for presentation.

## Implementation order

1. Audit + baseline
2. Existing asset inventory
3. Backend-to-visual event map
4. Wireframes/layout decision
5. Asset request manifest
6. Review manifest before mass implementation
7. Implement structural UI with placeholders only where necessary
8. ChatGPT produces approved assets
9. Integrate assets
10. Connect real telemetry
11. Responsive/performance pass
12. Security pass
13. Visual regression/manual validation
14. Final documentation

Placeholders must be clearly marked development placeholders and must not silently ship as fake telemetry.

## Performance constraints

Optimize for the user's notebook and mobile access:
- avoid unnecessary high-resolution sprite sheets
- lazy-load secondary views where possible
- cap expensive animations
- pause/reduce animation when tab hidden
- avoid rendering hundreds of animated DOM nodes if Canvas is more appropriate
- graph views need sensible node limits/filtering
- preserve responsive usability

Claude should measure rather than assume performance.

## Security constraints

Do not expose credentials/config secrets in UI or static JS.
Do not put exchange keys in assets/config/client state.
All sensitive data authorization remains server-side.
Diagnostic views require appropriate auth.
No real-money execution.
Do not weaken current access-control/security invariants to make UI integration easier.

## Required Claude deliverable before new assets are generated

Commit the following on the working branch:
1. docs/design/OFFICE_ASSET_INVENTORY.md
2. docs/design/OFFICE_ASSET_REQUESTS.md
3. docs/design/OFFICE_VISUAL_SPEC.md (recommended)
4. docs/design/OFFICE_BACKEND_VISUAL_MAP.md
5. audit summary including current test baseline and proposed implementation phases

Then STOP the asset-dependent visual work and report:
- commit SHA
- branch
- exact manifest path
- number of P0/P1/P2 assets requested
- which UI work can continue without those assets

This stop point lets ChatGPT take over visual asset production cleanly.

## Branch/merge policy

Do not automatically merge to main.
Prefer a dedicated feature branch/worktree for Office 2.0 implementation.
Do not overwrite the ATS-MATRIX research branch with implementation work.
Preserve rollback ability for the current office.

## Definition of done

Office 2.0 is done only when:
- current useful functionality is preserved or intentionally replaced
- new modules consume real/specified simulation data
- no fake telemetry is presented as live
- requested assets are integrated at correct dimensions/paths
- notebook and mobile views are usable
- performance is acceptable
- security invariants remain green
- tests pass
- documentation describes how each view maps to backend truth
