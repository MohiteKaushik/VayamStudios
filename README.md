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

A scene with one setup renders flat — the extra level is invisible until the
scene actually needs it.

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
- **The shoot-day field commits on blur, not per keystroke.** Committing per
  keystroke moves the tile into a new day group mid-word, React remounts it, and
  focus is lost after the first character.
- **Deleting a crew member or character cleans up its references.** A dangling
  `ownerId` silently reads as somebody else once role defaults take over; a
  dangling `characterId` leaves a grey puck the legend cannot remove.
