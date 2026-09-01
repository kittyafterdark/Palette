# Palette 1.0.3 — Community UX Pass

Palette 1.0.3 is a presentation and browsing pass. It does not change theme recipes, selector resolution, renderer styling, or the persisted project schema.

## What changed

- **Style Library: fullscreen ↔ native left dock.** On desktop, use **Dock left** to move the live Style Library into Lumiverse's native resizable dock and keep the themed chat visible. Use **Fullscreen** to move the same state back.
- **Quick Looks can browse packs inline.** Switch between **Current target**, Manga, Editorial, Visual Novel, Journal, and future registered packs without opening the full library.
- **Two-look horizontal paging.** Quick Looks are grouped two cards per snap page with compact pagination markers.
- **Mobile Style Library geometry.** Safe-area/host top chrome is respected, Close has a proper touch target, and Browse/Tune Previews stack instead of fighting for width.
- **Roomier mobile pack cards.** Pack results stay one-per-row and narrow phones use a vertical preview/copy composition.
- **Mini-widget radius fix.** `.ts-widget-launch-shell .ts-widget-launch { border-radius: inherit; }` removes the clipped inner corner.

## Compatibility

- Public extension version: **1.0.3**
- Persisted Palette schema: **v42** (unchanged)
- Minimum Lumiverse version: **1.1.6** (unchanged)
- Permissions: `app_manipulation`, `ui_panels`

The native dock is optional presentation. If the host does not expose the public dock-panel API, Palette simply keeps the full-screen Style Library.

## Boundary

1.0.3 deliberately contains **no new selector surgery**. The 1.0.2 Message Scope Correctness patch remains included; this release only changes Palette's own browsing/presentation UI.
## QA follow-up

- Quick Looks now turn **Apply** into an explicit **Revert** action while that recipe owns the active quick-style layer.
- Pack cards open from the whole card surface, with the favorite control excluded from navigation.
- Mobile library view tabs use the same compact horizontal strip as the desktop dock instead of full-width pseudo-pages.
- Mobile browse/search/filter controls can collapse independently from the style results.
- **Current target** Quick Looks now resolve the selected semantic role first, then rank recipes that actually touch that role; pack Quick Looks use the same target-first ordering.


### QA follow-up II

- Phone browse results now reserve explicit rows for the Browse-controls disclosure, toolbar, and scrolling results, preventing expanded controls from overlapping the Packs list.
- Docked pack workbenches now default the Recipe set disclosure closed, matching compact/mobile behavior instead of opening directly into the full recipe manifest.
- On narrow layouts, any open pack side section (including Refine palette and Asset slots) expands across the full control width; multiple open sections stack vertically.

### QA follow-up III

- Collapsing Lumiverse's native Style Library dock no longer expires Palette's dock state. Spindle temporarily detaches an extension root while collapsed, so Palette now tracks the persistent native dock shell and treats only shell removal as a real close.
- Re-expanding the native dock reuses the same live Style Library DOM/state, including the current view, pack workbench, filters, and scroll state.
- Palette explicitly opts into Lumiverse's collapsed dock title so the narrow tab remains identifiable while the library is tucked away.

### QA follow-up IV

- **Apply and edit** from a docked Style Library now performs a real presentation handoff: Palette releases the native Style Library dock, returns library presentation state to fullscreen, and then opens the selected recipe in Design. The chat no longer remains squeezed beside an empty black dock.
- Composer-workshop **Open full Design** paths use the same handoff, so every library → Design transition tears down native dock ownership consistently instead of leaving a hidden library inside a still-live panel.
- Ordinary native dock collapse remains state-preserving from QA follow-up III; only an intentional transition out of the Style Library releases the dock.

### QA follow-up V

- Docked **Apply and edit** now treats Design as a temporary workspace handoff: Palette collapses the native Style Library instead of destroying it, preserving dock ownership plus the current browse/pack/filter state.
- **Browse styles** (and save-to-My-Styles flows) expand the existing dock when Palette is still in dock presentation, so returning to the library no longer reopens fullscreen or asks you to dock it again.
- Fullscreen Style Library behavior is unchanged: a fullscreen library still closes when handing off to Design.
