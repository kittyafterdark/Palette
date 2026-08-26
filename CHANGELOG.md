# Changelog

Public release history for Palette. The long internal v27/v28 development log is preserved in [`docs/development/INTERNAL_CHANGELOG-v27-v28.md`](docs/development/INTERNAL_CHANGELOG-v27-v28.md).

## 1.0.0 — Initial public release

Palette 1.0 packages the internal v28.16 / schema v39 build line as the first public release.

### Authoring

- Persistent picker with semantic owner/context, target ladder, **Edit Part**, **Browse Inside**, target surfaces, and message-side facets.
- Semantic Base/Mobile and state-aware styling packets for paint, typography, shape, layout, imagery, media, positioning, transforms, visibility, pseudo surfaces, generated content, and reusable SVG assets.
- Smart geometry Guides for spacing, dimensions, layout, positioning, images, and Layout Groups.
- Layout Groups arrange real sibling DOM through their shared parent without React reparenting or synthetic wrappers.

### Inspection and reuse

- **Read Style** and **Read Page** inspect mounted presentation lazily; observed values do not become authored CSS until edited.
- **Quick Looks**, pack recipes, and reversible recipe provenance compile through the same ordinary Palette styling model.
- **My Styles** saves reusable Targets, Components, and multi-component Bundles across theme projects.
- Theme Stash provides persistent multi-project management with swatch cards, duplicate, rename, delete, and active-state handling.

### App-wide theming

- Full App **Boost** transforms Lumiverse's canonical native theme variable map with continuity across commits.
- Backdrop treatment lives inside Boost; global **Typography** remains independently toggleable.
- Native Theme Assets, font registration, `.lumitheme` handoff, generated CSS inspection, and separate Custom CSS are available from the normal workflows.

### Packs and media

- Curated Manga, Editorial, Journal, and Visual Novel composition systems.
- **Media Flow** supports both raw Markdown/XML prose images and Lumiverse's native inline-attachment anatomy.
- Image source policy supports Native / Auto / Full quality behavior for enlarged authored imagery.

### Product polish

- Palette product identity and Brush drawer icon.
- Float/Dock/mobile-safe editor workflows and hideable mini widget.
- Readable Read Page, compact Quick Look actions, and structural Group navigator for wrapper-heavy Lumiverse DOM.
- Rebuilt one-page Guide with Palette workflows first and a practical CSS field guide second.

### Compatibility

- Project persistence schema: **v39**.
- Minimum Lumiverse version: **1.1.6**.
- Internal extension identifier remains `theme_studio` to preserve existing storage/runtime compatibility.
