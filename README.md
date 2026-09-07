# Visual Shooting Blueprint

Turns each scene of a short film into a branch tree a crew can read without the
director explaining it.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

## Deploy to Netlify

`netlify.toml` is included. Either drag `dist/` onto Netlify, or connect the repo
— build command `npm run build`, publish directory `dist`. The SPA redirect rule
is already configured, so deep links like `/film/abc/scene/xyz` resolve.

## The hierarchy

```
FILM
 └── SCENE                 narrative unit
      ├── BLOCKING         scene-scoped
      ├── PRODUCTION       scene-scoped
      ├── AUDIO            scene-scoped
      ├── ...custom        scene-scoped, user-added
      └── SETUP A, B, C    one camera position each
           ├── CAMERA      setup-scoped
           └── COMPOSITION setup-scoped
```

**Storage scope is not display scope.** Expanding a setup shows all five
categories together, because that is what a crew member needs in one place. The
three scene-scoped ones are badged `Scene` and shared by every setup — a scene
is one physical arrangement of people, lights and microphones, shot from several
angles, so the director enters it once rather than once per setup.

## Where things live

| Path | Responsibility |
|---|---|
| `src/lib/types.ts` | Domain model |
| `src/lib/layout.ts` | Pure tree layout function (replaces a graph library) |
| `src/lib/factory.ts` | Guarantees the mandatory node set exists |
| `src/data/nodeSchemas.ts` | **Field declarations. Add a field here, nowhere else.** |
| `src/data/seed.ts` | Sample film |
| `src/storage/` | Persistence facade, Zod validation, migrations, IndexedDB assets |
| `src/store/projectStore.ts` | Zustand store, debounced save |
| `src/features/graph/` | Desktop canvas + mobile list |
| `src/features/nodes/` | Detail panel + field renderer |
| `src/features/blocking/` | 2D floor plan |
| `src/features/export/` | Scene card, PNG export, print blueprint |
| `src/features/project/` | Film settings — crew, characters, metadata |
| `src/features/flow/` | **The vertical scene/shot flow and the collapsible shot card** |
| `src/features/people/` | Crew + cast filter |
| `src/features/media/` | Optional reference clip |
| `src/lib/relevance.ts` | Who is involved in which scene and setup |

## Phases

**Phase 1** — the hierarchy, the node canvas, the detail panel, the blocking
floor plan, the mobile renderer, scene-card PNG and the print blueprint,
project file export/import.

**Phase 2** — everything that belongs to the film rather than one scene:

- **Film settings** at `/film/:filmId/settings`. Crew with role-to-node-type
  defaults, characters with their blocking-puck colours, title, logline,
  director, aspect ratio, and deleting the film.
- **Scene reordering and duplication** from the overview. A duplicate lands
  directly after its original, takes the next scene letter (3 becomes 3A),
  resets to *planned*, and gets fresh ids throughout while keeping its image
  references.
- **Shoot-day grouping** in the overview, with the day editable inline.

Crew and characters were seeded but not editable before Phase 2, so a film you
started yourself could never assign an owner or place anybody on the floor plan.

**Iteration 2** — the flow, rebuilt around what the crew actually reads:

- **Everything is vertical.** The film is a top-to-bottom spine of scenes; a
  scene is a top-to-bottom sequence of setups. The horizontal fan is gone, and
  with it `layout.ts`, `GraphCanvas` and `MobileNodeList` — the vertical flow
  works on a phone unchanged, so there is one renderer instead of two.
- **Setups are collapsed by default.** Opening a scene shows only the setup
  cards. One setup expands at a time to reveal its five categories; only the
  open one is mounted, so a forty-setup film renders one detail block.
- **Crew filter.** Pick a person and the scenes and setups that are not theirs
  dim rather than disappear — you still need to see where your work falls in the
  film. Relevance is derived from explicit assignment, per-node owner overrides
  and crew role defaults.
- **Parallel scenes.** Consecutive scenes can be grouped as threads of one beat;
  they render side by side and rejoin the spine. The scene list stays flat, so
  ordering, duplication, shoot days and the blueprint are unaffected.
- **Setup reorder and duplicate.** Duplicating carries the camera data over,
  which is where most of the retyping was.
- **Optional reference clip** per scene or setup, by link or upload.

## Extending it

**Add a field to a node type** — one entry in `NODE_TYPES[...].fields`. No new
component, no migration.

**Add a node type** — one entry in `NODE_TYPES`, plus its `scope`.

**Add a backend** — every function in `src/storage/persistence.ts` is already
async. Swap the bodies for network calls; no call site changes.

**Change the schema** — bump `SCHEMA_VERSION` in `src/lib/types.ts` and add a
step in `src/storage/migrations.ts`.

## Deliberate constraints

- **Flat hex colours and inline styles in `SceneCard.tsx`.** `html-to-image`
  cannot resolve CSS custom properties or `oklch()` and drops those colours from
  the PNG without warning.
- **Images in IndexedDB, project JSON in localStorage.** One phone photo as
  base64 exceeds a meaningful share of the ~5 MB localStorage quota.
- **PDF is browser print, not jsPDF.** More reliable pagination, better type,
  zero bundle cost.
- **Export the project file often.** A browser cache clear removes everything.
- **Uploaded reference clips are not in the project file.** A ten-second clip is
  ~15 MB; inlined as base64 it would be ~20 MB of string in one JSON document
  and would hang the tab. Clips keyed `video_*` are skipped by
  `collectAssetIds`; a pasted link travels with the file instead.
- **The shoot-day field commits on blur, not per keystroke.** Committing per
  keystroke moves the tile into a new day group mid-word, React remounts it, and
  focus is lost after the first character.
- **Deleting a crew member or character cleans up its references.** A dangling
  `ownerId` silently reads as somebody else once role defaults take over; a
  dangling `characterId` leaves a grey puck the legend cannot remove.
