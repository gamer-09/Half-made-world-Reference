# Half-Made World — Reference

Reference archive for the *Half-Made World* fantasy novel — a searchable, editable knowledge base
for its lore, magic systems, and characters, built as an interactive web app so world details never
have to live buried in a single document again.

## What's in this repo

- **`half-made-world-hub/`** — the interactive archive app (React + TypeScript + Vite client, dark
  fantasy themed UI; Node + Express server, persists to a JSON file on disk).
- **`Half_made world ideas.docx`** — the original source document. Everything in the hub was seeded
  from this file; it remains here as the canonical starting reference.

The archive holds **185+ entries across 20 categories** — Demon/Angel Skills, Classes, Monsters,
Items, Characters, Artifacts, Locations, Realms, Magic Systems, and more — all browsable, searchable,
and editable through the UI.

## Quick start

```bash
cd half-made-world-hub
npm run install:all   # installs server + client
npm run dev            # server on :5001, client on :5173
```

Open http://localhost:5173. The first run seeds `server/data/world.json` from the reference
document; every edit after that is made and saved through the UI itself.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts server + client dev servers |
| `npm run build` | Typechecks and builds the client |
| `npm start` | Starts only the server (serves API) |
| `npm run install:all` | Installs dependencies for server and client |

## Data model

Each entry has:

- `category` — which section it belongs to (Realms, Monsters, Classes, Items, …)
- `name` + `subtitle` — the title and a one-line tagline
- `description` — the main text
- `fields` — structured key/value details (e.g. Rank, Appearance, Skills)
- `tags` — freeform search tags

## Relationship Map

A dedicated **Relationship Map** view (button in the sidebar) shows the 9 named characters as nodes
and their connections as colored, arrowed edges — who knows whom, who loves whom, who betrayed whom.

- **Drag** characters to rearrange the layout.
- **Hover** a character to trace all of its links; dim everything else.
- **Click a character** to open their full archive entry.
- **Click an edge** to read its story (with edit/delete actions).
- **Add relationships** through a structured form (source, target, type, label, notes) — types drive
  edge colors, e.g. `betrayed`, `ordered killed`, `right-hand of`, `unaware of`.

Relationships are seeded from the reference document (15 links between the 8 characters) and persist
in `server/data/relationships.json`.

## Story Web

A **Story Web** page (second button in the sidebar) shows the *whole story* as one interactive map —
every realm, location, monster, being, rank, item, artifact, character, and plot thread as a node,
connected by colored, arrowed links like `located in`, `guards`, `rules`, `kills`, `sealed in`,
`crafted by`, and `story of`. Character relationship links are merged in too.

- **Category chips** above the map toggle whole categories on/off (e.g. hide Classes to declutter).
- **Drag** any node to rearrange; **hover** traces its connections; **click** a node opens its entry;
  **click** a link reads its story (with edit/delete).
- Node ring colors match the archive category colors; link colors match their type legend.
- **Add links** through the same structured form as relationships (any entry name is suggested).

Story links are seeded from the reference document (69 links) and persist in
`server/data/story-links.json`.

## API reference

**Entries**

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/entries` | List entries (`?category=&search=`) |
| GET | `/api/entries/:id` | Get one entry |
| POST | `/api/entries` | Create an entry |
| PUT | `/api/entries/:id` | Update an entry |
| DELETE | `/api/entries/:id` | Delete an entry |
| GET | `/api/categories` | Category names + entry counts |
| POST | `/api/reset` | Reset entries, relationships, and story links back to their original seeds |

**Relationships**

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/relationships` | List all relationships |
| POST | `/api/relationships` | Create a relationship `{ source, target, type, label, description }` |
| PUT | `/api/relationships/:id` | Update a relationship |
| DELETE | `/api/relationships/:id` | Delete a relationship |

**Story links**

Same CRUD shape as relationships, under `/api/story-links`.
