# Half-Made World — Reference

**[Open the live archive →](https://gamer-09.github.io/Half-made-world-Reference/)**

Reference archive for the *Half-Made World* fantasy novel — a searchable, editable knowledge base
for its lore, magic systems, and characters, built as an interactive web app so world details never
have to live buried in a single document again.

## What's in this repo

- **`half-made-world-hub/`** — the interactive archive app (React + TypeScript + Vite client, dark
  fantasy themed UI; Node + Express server, persists to a JSON file on disk).
- **`Half_made world ideas.docx`** — the original source document. Everything in the hub was seeded
  from this file; it remains here as the canonical starting reference.

The archive holds **1053 entries across 57 categories** — Demon/Angel/Class/Hybrid Skills, Titles,
Rules & Notes, Characters, Classes, Class Progression, Grade System, Rune Star Circles, Monsters,
Rifts, Locations, Items, Magic Systems, Realms, Coins, Clan, Economy, Organizations, Calendar, Combat
Mechanics, Laws & Justice, Academy, and many more — all browsable, searchable, and editable through
the UI. **27 characters**, **4209 story links**, and **65 relationships** tie it all together.

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

A dedicated **Relationship Map** view shows named characters as nodes and their connections as
colored, arrowed edges — who knows whom, who loves whom, who betrayed whom.

- **Drag** characters to rearrange the layout.
- **Hover** a character to trace all of its links; dim everything else.
- **Click a character** to open their full archive entry.
- **Click an edge** to read its story (with edit/delete actions).
- **Add relationships** through a structured form (source, target, type, label, notes) — types drive
  edge colors, e.g. `betrayed`, `ordered killed`, `right-hand of`, `unaware of`.

Relationships persist in `server/data/relationships.json`.

## Story Web

A **Story Web** page shows the *whole story* as one interactive map — every realm, location,
monster, being, rank, item, artifact, character, and plot thread as a node, connected by **4209**
colored, arrowed links like `located in`, `guards`, `rules`, `kills`, `sealed in`, `crafted by`, and
`story of`. Character relationship links are merged in too.

- **Category chips** above the map toggle whole categories on/off (e.g. hide Classes to declutter).
- **Drag** any node to rearrange; **hover** traces its connections; **click** a node opens its entry;
  **click** a link reads its story (with edit/delete).
- Node ring colors match the archive category colors; link colors match their type legend.
- **Add links** through the same structured form as relationships (any entry name is suggested).

Story links persist in `server/data/story-links.json`.

## Block Map

A **Block Map** view renders the world's geography as a rightward-flowing "blockchain": a genesis
block for *The World* sits at the far left, with each realm/category laid out as its own horizontal
chain of blocks (children in breadth-first order), packed left-to-right so the map grows wide rather
than tall. Realms and containment links (`located in`, `lives in`, `home of`, `part of`) drive the
hierarchy.

- **Scroll** to zoom, **drag** to pan, **hover** to trace a chain, **click** a block to open its
  entry, **Esc** to fit the whole map to screen.

## Query Chat (AI)

A **Query Chat** view lets you ask the archive plain-language questions. Its **query mode** is a
local keyword lookup — no AI is involved, and it works without any key. Its **explore mode** is
Groq-backed: it sends the whole archive to the server's `/api/ai/explore` route to have the AI find
the answer itself. Explore **always uses the HTTP (Groq) backend** and requires `AI_API_KEY` (or
`GROQ_API_KEY`) in the server environment; without a key, explore falls back to the local lookup.

## Planning Room (AI, local dev only)

A **Planning Room** view drafts *new* entries — characters, places, races, monsters, factions,
items, even whole new categories — that fit the world already written. It reads the whole archive
(its structure, field conventions, and every existing entry) so new material matches the archive's
tone and canon.

The flow is questions-first: the planner asks the open creative decisions it needs (motive, tone,
name, scope, which existing entries it ties to), then writes a full draft once you answer — or
draft it its own way. Drafts are **never saved**: they are ephemeral proposals shown only in the
local dev UI, and where a detail is your call rather than something the archive answers, the
planner asks instead of inventing it.

Planning is **gated to local development** (`import.meta.env.DEV`): the nav button, shortcut `6`,
and the view itself are absent from the deployed read-only build.

### Choosing the AI backend

The AI features use **two separate backends**, and each is wired to a fixed one:

- **Explore (Query Chat)** — always the **HTTP backend**, by default Groq. Set `AI_API_KEY` (or
  `GROQ_API_KEY`) to enable it. `AI_BASE_URL` / `AI_MODEL` point at any OpenAI-compatible
  chat-completions endpoint (Groq is the default; OpenRouter and local Ollama/LM Studio all work),
  and `AI_FALLBACK_MODELS` tries additional models in order when a free model is rate-limited.
  Explore never uses the opencode CLI.
- **Planning Room** — always the **local `opencode` CLI** (set nothing beyond having opencode
  installed; `opencode run --format json` drives it). It uses whatever model/auth opencode is
  configured with, so no API key is needed. `OPENCODE_MODEL` pins a model and `OPENCODE_BIN`
  overrides the binary path. The planner does **not** fall back to HTTP — if the opencode CLI
  fails, the plan request fails.

`AI_PROVIDER` is no longer needed to switch between them: explore is always HTTP and the planner is
always opencode. The only relevant knobs are the keys above and the optional opencode overrides.

The full-archive digest the planner reads is bounded by `AI_FULL_CONTEXT_BUDGET` (default
`700000` characters; set `0` to fall back to keyword matches only).

## World systems (as captured in the archive)

- **Ranks & roles** — angel and demon rank (Serapharch↔Lumen, Mordrach↔Gnash) measures *power*, not
  *profession*; most beings are civilians and any rank can leave the realm.
- **Grades (G–S)** — the universal power scale, with Early/Mid/Late/Peak sub-stages, the Wall, and
  Evolution Quests. Max level is 100.
- **Rune Star Circles (1–7)** — Mages progress by inscribing Rune Stars into their heart instead of
  using the Grade system; each circle maps to a rough Grade equivalent (1st≈F … 7th≈S).
- **Classes (20)** — Veyn and Ren classes, each with 10 class-skills and a 7-tier progression
  ladder. Angels/demons learn max 5 class-skills; humans learn all. Veyn & Ren can't mix (Smithing
  is the sole exception; angels/demons may unlock a Ren Organ at the cost of all Veyn).
- **Magic** — Veyn (neutral) → Holy Energy (angels/saints) and Corrupted Veyn (demons); Ren → Auric
  Ren (paladins).
- **Currency** — Sigils: 100 silver = 1 gold, 1,000 gold = 1 platinum.
- **Reference document** — `Half_made world ideas.docx` is the original source the archive was
  transcribed from. The live `server/data/*.json` files are the source of truth; the bundled seed
  data is synced from them with `npm run seeds:sync` (or verified with `npm run seeds:check`).

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
| DELETE | `/api/categories/:name` | Delete a category and cascade-remove its entries, relationships, and story links |
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

**Search & AI**

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/search` | Full-text search across the archive (`?q=…`) |
| POST | `/api/ai/answer` | Answer a natural-language question from the archive contents |
| POST | `/api/ai/explore` | AI-guided exploration/discovery across the archive |
| POST | `/api/ai/plan` | Draft a new entry that fits the archive (questions-first; local dev only) |
| POST | `/api/ai/plan/session/delete` | Delete the temporary AI session file(s) a plan created on disk |
