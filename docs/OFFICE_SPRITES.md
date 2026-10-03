# Directional character animation

The approved eight identities now have original directional raster sheets. World characters use actual front, left profile, right profile and back drawings, with four walk frames per direction. The existing portrait atlas and office background are unchanged. This replaces rotation/mirroring of one neutral portrait as the walking effect; no renderer migration is involved.

The user's Stardew Valley reference is a quality benchmark for coherent character animation and scenery interaction. No Stardew Valley files, source, sprites or other third-party game artwork were imported. Frame-based animation is also described in the [primary Phaser documentation](https://docs.phaser.io/phaser/concepts/animations); Phaser is not a new dependency.

## Asset and framing contract

- Eight `public/office/characters/<agent>.png` sheets, each RGBA 1536×1024, six columns and four directional rows. Each contains idle, four walking drawings and a seated drawing per direction: 192 source poses in total.
- Generated source placement is not perfectly uniform. `character-frames.js` contains audited alpha bounds, head-center pivots, per-column row boundaries, SHA-256 and one fixed reference height per character. Never slice these files by assuming uniform row cuts or scale each walk frame independently.
- Source inspection used alpha thresholds 64 for separating silhouettes and 8 for full frame bounds. It only read PNG pixels and generated metadata; it did not crop, redraw, recolor or re-encode the generated assets. The original generated files were copied into the repository unchanged.
- The DOM clips each exact source rectangle, uses one consistent scale, and anchors its bottom at the actual soles. Character buttons are 72×84; labels and speech sit above that footprint. Browser measurement confirmed the sprite bottom and button bottom coincide for all eight identities.
- Profiles/room portraits retain their original art, now framed from audited actual alpha bounds. The old PNG is 1774×887, not an evenly divisible 4×2 grid.

## Runtime and motion boundaries

`sprites.js` has no network, scheduling, market, storage or trading authority. It builds stable decorative DOM frames. Existing navigation/transition directors supply the actual segment direction and owned cosmetic movement. CSS displays one walk frame at a time in a four-frame 0.56s loop. Idle walking remains cosmetic; crossing a room still requires a fresh matching original backend room-change event. No artificial work delay is introduced.

Pause, hidden state, reduced motion, modal inspection and focused characters stop presentation. Modal refresh cannot re-enable CSS movement. Keyboard focus stops an owned route; stale callbacks cannot resume it. When a roster opener is replaced during profile inspection, closing the profile returns focus inside the still-open parent panel.

The seated source poses are prepared artwork, **not currently placed at desks or chairs**. Production character views mount only idle/walk frames. Actual desk/seat approach, occupancy, occlusion and reviewed task poses are the next increment. A non-idle backend state presently keeps its authoritative status label; a sprite does not assert typing, coffee, meetings or a completed job.

## Verification and current limits

Tests bind metadata to the actual PNG hashes/dimensions and bounded rectangles, known identities, stable views, original profiles, served-file allowlists, motion gates and focus recovery. Full CI includes PostgreSQL, compiled office tests, historical checks and the container build.

Browser review used an isolated development runtime with default-disabled execution and empty actual work/accounts. A separate bannered TEST_ONLY gallery, without backend/provider/storage access, compared all 32 identity/direction combinations and manually selected walking frames. The system's reduced-motion preference remained enabled; manual static inspection is not a live temporal gait playback claim. It showed one visible frame in every inspected cell.

These first sheets still need temporal art review, finer walking polish and purposeful workstation interaction. They are not a claim of perfect animation, eight angles, automatic meetings or a complete physical game world. Source PNGs total 17,859,978 bytes; mobile transfer/compression must be measured and optimized in a later asset increment while retaining source/provenance. Client scaling does not reduce downloaded source bytes.

## Generation provenance and prompt set

Used the built-in **imagegen** tool, with transparent-background requests, original local identity art and a new Atlas sheet as layout references. No external image API, account, key, paid provider adapter or runtime AI activation was introduced. Originals remain in the tool's generated-images folder. Selected final sheets live in `public/office/characters`; original source filenames are recorded in `SPRITE_GENERATION.json`.

The complete prompt set and reference roles are in `SPRITE_GENERATION.json`: Atlas's initial prompt, targeted gait correction, and the common per-character prompt with seven identity substitutions. Atlas's initial variant was discarded. Human review should assess natural movement and style before merging; automatic bounds/hash checks do not prove artistic quality.
