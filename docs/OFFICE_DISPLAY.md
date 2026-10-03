# Office framing and reference fidelity

The human explicitly requested an entire-office overview, scene resolution choices and the closest possible fidelity to the supplied initial concept. This concrete display request supersedes the preceding graphics-deferred priority; functional development remains next after this increment.

## Whole-screen overview

Default **Ajustar tudo à tela** bounds the header, market, complete original six-room map and financial/activity panels inside the viewport. The map keeps its 3:2 aspect and existing scene-relative station/route coordinates. Size containers calculate the largest uncropped map inside available width/height; no background stretching, room reassignment, fake scene data or renderer migration. Panels scroll internally when their actual content grows.

Short wide laptop screens place real market screens and activity/financial panels beside the map to maximize usable scene height. Taller screens keep market above and activity below, closer to the reference. **Composição dos painéis → Referência** explicitly retains that top/bottom arrangement on short screens too, with the necessarily smaller uncropped map. Mobile keeps all six rooms visible with roster/profile alternatives for inspecting small scene targets.

**Tela e escala** also offers available-width view with page scroll and explicit 50/75/100/125% scene scales. Scene source widths 960/1280/1536/1920/2560 preserve the 3:2 art ratio; these choices apply to percentage modes, not hardware monitor resolution. Width 1280 has a fractional proportional height displayed rounded as 853. Oversized explicit views scroll inside the map. Reset restores fit/automatic composition/original source width.

Only validated presentation fields persist in `trading-lab.display.v1`; denied/corrupt storage falls back safely. Preferences cannot request backend work or manipulate account/history/risk. The existing resize handler cancels owned animation and reprojects actual agent geometry. Modal close returns keyboard focus. The original communication board remains accessible through Feed in fit mode; Meeting Room navigation and its real records remain available.

The compact header uses an original geometric growth mark and an actual nonflat-position count. Count reads existing fund/evaluation positions, never sums their equity, and clears on financial-source failure. No daily P&L, unsupported ETH/OI/liquidation data or work claims are inferred from the concept image.

## Fidelity still requiring art work

The current source has six rooms in two rows; the reference has a broader, denser scene including Data Center, War Room and market-analysis areas. This increment preserves existing original scene, eight sprite sheets, room identity, furniture and navigation and does **not** claim identical architecture or finished artistic fidelity. The reference also depicts different character names and illustrative metrics; actual roster/records remain authoritative.

Next visual increment should author original background artwork closer to the reference's proportions, lighting and room arrangement, then explicitly review seats, chair occlusion, floor masks and passage coordinates against it. Auxiliary control areas can present actual existing sources without creating fictitious backend rooms or jobs. Document prompt/source/license/hash and validate desktop/mobile before replacing assets; never paste the concept's invented work/numbers into runtime. Keep existing character identities and code architecture.

Tests cover bounded validated preferences, restoration/reset, denied storage, modal focus, resize reprojection signals, static allowlist and financial-count expiration. Browser proof uses actual idle/no-account development state, not synthetic activity. Production remains cloud-only/paper-only, with no hosted deployment, connected LLM or autonomous activation implied.
