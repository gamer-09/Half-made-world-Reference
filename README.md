# Half-Made World — Reference

Reference archive for the *Half-Made World* fantasy novel — a searchable, editable knowledge base
for its lore, magic systems, and characters, built as an interactive web app so world details never
have to live buried in a single document again.

## What's in this repo

- **[`half-made-world-hub/`](./half-made-world-hub)** — the interactive archive app (React + Node).
  Browse, search, and edit 185+ entries across 20 categories (Demon/Angel Skills, Classes, Monsters,
  Items, Characters, Artifacts, Locations, and more), plus two visual maps:
  - **Relationship Map** — how the 9 named characters connect: who knows whom, who betrayed whom,
    who serves whom.
  - **Story Web** — the entire story as one connected graph: realms, locations, monsters, ranks,
    items, and plot threads linked by 69+ relationships (`located in`, `guards`, `rules`, `sealed in`,
    `crafted by`, and more).

  See **[`half-made-world-hub/README.md`](./half-made-world-hub/README.md)** for setup instructions,
  the full API reference, and the data model.

- **`Half_made world ideas.docx`** — the original source document. Everything in the hub was seeded
  from this file; it remains here as the canonical starting reference.

## Quick start

```bash
cd half-made-world-hub
npm run install:all
npm run dev
```

Then open http://localhost:5173. The first run seeds the archive from the reference document;
everything after that is edited and saved through the UI itself.
