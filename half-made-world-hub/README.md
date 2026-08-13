# Half-Made World Hub

An interactive worldbuilding archive for the "Half-Made World" story. It holds everything from the
`Half_made world ideas.docx` reference document and lets you **add, edit, and remove entries through an
interactive UI** — no raw typing into a document needed.

## Stack

- **Client**: React + TypeScript + Vite (dark fantasy themed UI)
- **Server**: Node + Express (JavaScript), persists data to a JSON file on disk

## Getting started

```bash
# 1. Install everything (server + client)
npm run install:all

# 2. Run both dev servers (server on :5001, client on :5173)
npm run dev
```

Open http://localhost:5173

The first time the server starts it seeds `server/data/world.json` with all the content from the
reference document. From then on, all changes you make in the UI are saved to that file.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts server + client dev servers |
| `npm run build` | Typechecks and builds the client |
| `npm start` | Starts only the server (serves API) |
| `npm run install:all` | Installs dependencies for server and client |

## API

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/entries` | List entries (`?category=&search=`) |
| GET | `/api/entries/:id` | Get one entry |
| POST | `/api/entries` | Create an entry |
| PUT | `/api/entries/:id` | Update an entry |
| DELETE | `/api/entries/:id` | Delete an entry |
| GET | `/api/categories` | Category names + entry counts |
| POST | `/api/reset` | Reset the data back to the original seed |

## Data model

Each entry has:

- `category` — which section it belongs to (Realms, Monsters, Classes, Items, …)
- `name` + `subtitle` — the title and a one-line tagline
- `description` — the main text
- `fields` — structured key/value details (e.g. Rank, Appearance, Skills)
- `tags` — freeform search tags

## Relationship map

A dedicated **Relationship Map** view (button in the sidebar) shows characters as nodes and their
connections as colored, arrowed edges — who knows whom, who loves whom, who betrayed whom.

- **Drag** characters to rearrange the layout.
- **Hover** a character to trace all of its links; dim everything else.
- **Click a character** to open their full archive entry.
- **Click an edge** to read its story (with edit/delete actions).
- **Add relationships** through a structured form (source, target, type, label, notes) — types drive
  edge colors, e.g. `betrayed`, `ordered killed`, `right-hand of`, `unaware of`.

Relationships are seeded from the reference document (15 links between the 8 characters) and persist
in `server/data/relationships.json`.

## Relationship API

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/relationships` | List all relationships |
| POST | `/api/relationships` | Create a relationship `{ source, target, type, label, description }` |
| PUT | `/api/relationships/:id` | Update a relationship |
| DELETE | `/api/relationships/:id` | Delete a relationship |

`POST /api/reset` now restores both the entries and the relationships to their original seeds.
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
`server/data/story-links.json`. API: `/api/story-links` with the same CRUD shape as relationships.
