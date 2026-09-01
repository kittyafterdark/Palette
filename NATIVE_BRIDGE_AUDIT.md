# Theme Studio native bridge audit · v27.1

Theme Studio no longer reverse-engineers Lumiverse's private theme internals at runtime. The v25 bridge is intentionally split between two public surfaces with different lifetimes.

## 1. Frontend native authoring: `ctx.theme`

Theme Studio feature-detects four versioned host capabilities and only enables the corresponding UI when the host advertises them.

| Capability | Theme Studio use | No longer needed |
| --- | --- | --- |
| `theme-catalog-v1` | component picker catalog, live CSS-variable reference, Boost baseline enrichment | generated component/variable snapshot, source-path parsing |
| `theme-assets-v1` | project bundle creation, list/upload/delete/optimize, font/image resources | `/api/v1/settings` and `/api/v1/theme-assets` fetch adapters |
| `theme-packs-v1` | canonical `.lumitheme` export/import and native install/save | extension-owned archive codec or settings mutation |
| `theme-editor-navigation-v1` | supported Global/Assets editor handoff | native modal DOM/store poking |

The public catalog contains presentation metadata only. Theme Studio may inspect the currently mounted DOM under a public component selector to discover visible CSS-module local class names for picker ergonomics, but it never treats those hashes or private file paths as canonical native metadata.

## 2. Asset identity

Native asset DTOs deliberately expose two addresses and Theme Studio preserves that distinction:

- `contentUrl` is used only to preview the asset in the current Lumiverse session.
- `cssPath` is the canonical pack-relative `./assets/<slug>` identity persisted in packets, fonts, projects, and exported CSS.

A Theme Studio project stores its own native **source bundle** ID. The first project upload creates that bundle through `ctx.theme.assets.createBundle()`. Native installation deliberately creates/localizes a fresh installation bundle; Theme Studio keeps the project source bundle unchanged so further editing and reinstalling never mutate the installed copy.

## 3. Theme pack boundary

Theme Studio produces `SpindleThemePackDraft`, not a `.lumitheme` archive. The draft contains project metadata, compiled global CSS, recognized native component CSS sections, and an optional asset bundle ID. It has no TSX input surface.

Lumiverse owns archive encoding, archive parsing, asset localization, install semantics, theme-library persistence, and imported-TSX safety. Theme Studio's import flow is inert: after native parsing it creates a new project and stores arbitrary imported global/component CSS in the Custom CSS layer because semantic packets cannot losslessly represent unknown CSS. Nothing is applied until the user explicitly sends/installs it.

## 4. Worker live presentation remains separate

Full App Boost now uses reversible frontend root-inline authority. Theme Studio still clears the backend `spindle.theme` override on startup/reset/teardown for compatibility with older builds, but it does not feed transformed Boost values through that path because those values participate in Lumiverse’s resolved source map.

This gives Theme Studio two explicit contracts:

```text
ctx.theme       persistent/native authoring, assets, catalog, pack handoff
root inline      reversible extension-owned live variable presentation
spindle.theme   legacy Boost cleanup only
```

## 5. Permission and capability behavior

Theme Studio declares `app_manipulation` plus `ui_panels` for the optional native Style Library dock. Lumiverse remains responsible for enforcing authority at mutating native leaves. Theme Studio still checks capability versions to control UX and degrades to visual editing/Custom CSS when a host does not provide a native authoring subtree. There are no private REST/store fallbacks.

## 6. Remaining deliberate gap

Pack definitions already declare semantic asset slots, but v25 does not automatically bind a bundle asset into those slots. Native assets are usable from Resources, Background → Image, font registration, `.lumitheme`, and installation today. Explicit pack-slot assignment should be implemented as a Theme Studio recipe/pack feature on top of canonical asset paths, not by expanding the native bridge again.

## Upstream landing note

The bridge now targets the landed Lumiverse implementation and published Spindle Types `0.6.19`. Lumiverse's follow-up canonical-path fix normalizes asset slugs through its own `toThemeAssetRelativePath()` helper, so Theme Studio deliberately trusts `SpindleThemeAsset.cssPath` verbatim and never reconstructs `./assets/…` from `slug`. Project asset bundles remain source bundles: **Send to Lumiverse** installs a fresh native bundle without replacing the project-owned source bundle.


## Boost root authority

Current Lumiverse applies its resolved native/extension variable map directly to `document.documentElement.style`. Theme Studio therefore keeps Full App Boost on that same root inline declaration block with `important` priority and does **not** mirror transformed values back into `spindle.theme`; doing both creates a source/output feedback loop. A MutationObserver watches only the root `style` attribute while Boost is active, records newer native declarations as the underlying state **and current transform baseline**, then reasserts the explicit Boost values. Boost is excluded from project/native `.lumitheme` CSS.


## v26 boundary note

Responsive Base/Mobile state, canonical compiler slots, fullscreen pack choreography, and message-chrome recipes are entirely Theme Studio-side semantics; they require no further native bridge expansion. Mobile deltas compile to ordinary CSS media queries, pseudo-elements remain ordinary selector surfaces, and Greetings/Swipe/action-dock recipes only restyle mounted native UI.

For saved active Boost, frontend startup now calls the same guarded baseline refresh that powers **Refresh source** before the saved transform is applied. This is still public-catalog/worker-cleanup behavior and does not add a new native contract.

## v27.1 message-side boundary note

Assistant/User/Both authoring does not require another native bridge surface. Current BubbleMessage and MinimalMessage expose their role distinction in mounted presentation anatomy through the user-side CSS-module modifier and, for some parts, `*User` variants. Theme Studio derives the facet from the mounted DOM underneath the public component boundary and keeps it as selector/compiler metadata only. It does not add a private store/REST dependency, filesystem metadata, or a new persistence contract.

