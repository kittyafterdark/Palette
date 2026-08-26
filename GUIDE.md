# Palette

> **Visual theme authoring for Lumiverse.** Pick the thing you mean, describe the visual intent, and Palette turns it into scoped, reusable CSS. Generated CSS is output; your semantic Palette project is the source of truth.

**Palette 1.0.0 · schema v39**  
Release history lives in the project changelog; this page is the actual manual.

**Jump to:** [Start here](#palette-guide-start) · [Pick & scope](#palette-guide-pick) · [Style packets](#palette-guide-packets) · [Groups](#palette-guide-groups) · [Read styles](#palette-guide-read) · [Reuse](#palette-guide-reuse) · [Boost](#palette-guide-boost) · [Widget & Code](#palette-guide-code) · [CSS field guide](#palette-guide-css) · [Debugging](#palette-guide-debug)

## Start here

Palette is easiest to understand as **visual DevTools with memory**. It knows enough about Lumiverse anatomy to avoid making you write selectors for normal work, but it never traps advanced users inside a black box.

| Workspace | What it is for |
| --- | --- |
| **Design** | Pick a real mounted element and author semantic style packets. |
| **Themes** | App-wide Boost, Typography, Quick Looks, pack workbenches, and theme projects. |
| **Style Library** | Browse reusable looks and your cross-project **My Styles**. |
| **Code** | Inspect compiler-owned CSS, add Custom CSS, and use native `.lumitheme` handoff. |

A normal workflow is:

1. Open **Design** and turn on **Pick**.
2. Click the thing you actually want to change.
3. Use the breadcrumb, **Edit Part**, or **Browse Inside** if Lumi wrapped your target in three divs and a trench coat.
4. Add packets such as Background, Typography, Size, Image, or Position.
5. Switch **Base / Mobile** or **Normal / Hover / Active / Focus / Disabled** when needed.
6. Save the result as a **My Style**, keep building the current theme, or inspect the generated CSS in **Code**.

> **Rule of thumb:** if you are reaching for Custom CSS during ordinary styling, first ask whether Palette already has a visual packet for that intent. The packet is safer, responsive, reusable, and pack-aware.

## Pick & scope

### Pick stays armed

The main Design picker stays active until **Done** or **Esc**. This makes it practical to inspect several nearby pieces without reopening the picker every time. The floating mini-widget uses a lighter one-shot picking flow so it does not become a tiny second DevTools.

Palette separates four things that browsers often blur together:

| Layer | Example | Why it matters |
| --- | --- | --- |
| **Clicked node** | the exact `<img>` under your cursor | What you physically picked. |
| **DOM ladder** | Image → Avatar → Header Left → Header → Bubble | How the mounted tree is built. |
| **Semantic owner** | BubbleMessage / Personas / InputArea | Which Lumiverse surface owns it. |
| **Persistent scope** | Avatar in BubbleMessage | What future rerenders should keep styling. |

### Edit Part vs Browse Inside

**Edit Part** is the curated semantic map of useful parts for the current component. It is where you go when you know you want *Avatar*, *Meta Wrap*, *Actions*, *Message Content*, and similar authored pieces.

**Browse Inside** follows the actual mounted subtree. Use it when the thing you need is deeper, conditional, or too weird to belong in the curated list.

They intentionally do not show the same list.

### Stable selectors beat generated hashes

Palette prefers public semantic boundaries such as:

```css
[data-component="BubbleMessage"]
[data-component="InputArea"]
[data-spindle-drawer-tab="personas"]
[data-composer-action="send"]
```

Then it can narrow to a stable CSS-module family:

```css
[data-component="BubbleMessage"] [class*="_avatar_"]
```

instead of persisting an exact generated class such as:

```css
._avatar_1hvlc_181
```

Generated hashes can change. The family selector communicates the actual visual part.

### Assistant, User, and Both

Message targets can be side-aware. When Lumi shares internal classes between both sides, Palette keeps the side discriminator in the selector instead of pretending one `_avatar_` means every avatar in civilization.

Typical shapes:

```css
/* Assistant */
[data-component="BubbleMessage"]:not([data-part="user"]) [class*="_avatar_"]

/* User */
[data-component="BubbleMessage"][data-part="user"] [class*="_avatar_"]
```

Use **Both** only when you actually want the same treatment on both speakers.

### Surface means the real thing, not just its box

Many Lumi parts have multiple useful surfaces:

- Element
- `::before` / Back layer
- `::after` / Front layer
- `::placeholder` when the mounted control actually has placeholder text

Generated surfaces are useful for labels, ornaments, stickers, frames, SVG stencils, and other decorative planes without inserting DOM.

## Style packets

Palette packets describe intent. You should not need to remember the CSS property names for ordinary work.

| Packet | Think of it as | Common CSS underneath |
| --- | --- | --- |
| **Background** | paint the surface | `background`, gradients, images |
| **Text Style** | text ink/effects | `color`, gradient text, stroke, shadow |
| **Typography** | type structure | family, size, weight, line-height, spacing |
| **Border / Corners** | edge treatment | border longhands, radius |
| **Spacing** | breathing room | padding + margin |
| **Shadow / Glass** | depth/material | shadow, blur, backdrop-filter |
| **Opacity** | fade the entire target | `opacity` |
| **Container Layout** | arrange direct children | flex/grid, gap, distribute, align |
| **Layout Item** | behavior inside its parent | grow/shrink, order, self-alignment |
| **Size** | fit, fill, or fix the box | width/height/min/max |
| **Image** | crop and treat pixels | object-fit, object-position, filter, mask |
| **Media Flow** | make prose/native media behave | natural height, unclipping, full-width flow |
| **Position & Layer** | move/place/stack | translate, anchored position, sticky/fixed, z-index |
| **Transform** | pose it | rotate, scale, skew |
| **Background Image** | decorative image layer | background-image/position/size |
| **Visibility** | visible / hidden / gone | visibility/display |
| **Generated Content** | label a pseudo surface | CSS `content` |
| **SVG Asset** | reusable icon/ornament | sanitized project SVG stencil |

### Size: Fit, Fill, Fixed

Use **Fit** when the box should hug its content. Use **Fill** when it should claim the available space. Use **Fixed** when you really want a number.

If Fill appears not to fill anything, inspect the parent. A flex/grid child can only fill the space its parent actually gives it.

### Position: Nudge vs Anchored

**Nudge** is visual movement that keeps the native layout contract intact. It compiles as translation and is excellent for “this is correct, just 12px too high.”

**Anchored** means Palette owns the positioning relationship: top/right/bottom/left relative to a chosen containing block.

Use Nudge when Lumi already knows where an element belongs. Use Anchored when you are intentionally building a new composition.

### Image: wrapper vs image

This distinction saves hours.

```css
/* Avatar frame / wrapper */
[data-component="BubbleMessage"] [class*="_avatar_"]

/* Pixels inside that frame */
[data-component="BubbleMessage"] [class*="_avatar_"] img

/* Large native ghost/backdrop image — different target */
[data-component="BubbleMessage"] [class*="_avatarBgImg_"]
```

Resize the wrapper when you need a larger stage. Use **Image → Move inside frame** when the frame is correct and only the crop/focal point is wrong.

### Media Flow

Lumiverse prose images and native attachments are not the same DOM species. Palette treats both lanes deliberately:

**Markdown/XML lane**  
image paragraph → linked/span wrapper → image

**Native attachment lane**  
attachments → inline image button → inline image frame → inline image

Use **Full width** or **Unclipped** when native thumbnail chrome is fighting an authored reading layout. Do not solve every media problem with a global `img { width:100% }` missile.

### Guides

**Guides → Smart** follows the active packet:

- Spacing → box model
- Size → dimensions + containing block
- Layout → flex/grid geometry
- Layout Item → target + layout parent
- Position → placement/anchor relationship
- Image → crop/focal frame
- Background/Text/Shadow → lightweight outline

If a tiny text node has no useful box of its own, inspect its meaningful wrapper or parent boundary instead of assuming the guide is broken.

## Groups

**Group** is for several real siblings that should behave as one authored composition. Palette does **not** reparent React DOM and does not invent wrappers.

Group mode now has two ways to select members:

- **Visual:** click siblings on the page.
- **Structural:** retarget a picked member through nearby DOM levels, then use **Add sibling** once Palette knows the shared parent.

This is specifically useful for Lumi's favorite anatomy:

```text
row
└─ wrapper
   └─ inner wrapper
      └─ actual control
```

A valid saved group requires one real shared direct parent. Palette can temporarily let draft members sit at different depths while you line them up, but **Create group** stays disabled until the structural relationship is safe.

A Layout Group has four jobs:

| Tab | Purpose |
| --- | --- |
| **Layout** | Row / Column / Grid, columns, gap, responsive behavior. |
| **Members** | Shared packets on the member roots. |
| **Contents** | Shared descendant treatment for icons, text, buttons, or images. |
| **Frame** | One generated visual plane behind the group using the real parent. |

Unsafe cases reject instead of generating nth-child spaghetti: different parents, ancestor/descendant members, or selectors that cannot be distinguished safely.

## Read styles

### Read Style

**Read Style** reverse-engineers the selected target into familiar Palette controls.

The important contract is **Read is inspection; editing is capture**.

Observed values can appear in the controls without becoming project state. Palette only materializes the semantic operation you actually change. If you inspect a heading and only change its font size, Palette should not suddenly claim its native border, margin, color, shadow, and seventeen inherited properties.

### Read Page

**Read Page** is the larger map. It inventories mounted, visibly styled targets by semantic surface and lets you inspect where a result came from before deciding to edit it.

Use the search box for things like:

```text
heading
button
InputArea
avatar
::before
```

Source information is diagnostic context; the semantic target is the star. Click a target to inspect/capture it rather than translating an entire foreign stylesheet into semantic oatmeal at once.

## Reuse

Palette has three different reuse layers because they solve different jobs.

### Quick Looks

Quick Looks are curated starter recipes. **Apply** merges the packet types the recipe owns. The pencil applies it and opens the result in Design. Reset only peels that recipe layer back off.

### My Styles

My Styles are your reusable semantic styling, stored above individual theme projects.

| Save mode | Captures |
| --- | --- |
| **This target** | current target + decorative surfaces |
| **This component** | authored styling under the current semantic component |
| **Choose parts…** | any checked multi-component combination as a Bundle |

Applying a My Style merges packet types. If the destination already has Border + Shadow and your saved style contains Background + Typography, the unrelated Border + Shadow survive.

Stable targets do not need to be mounted at apply time to remain reusable.

### Packs

Packs are curated compositions built from the same semantic engine as Design: targets, packets, Base/Mobile, groups, media policy, asset slots, and provenance.

**Apply pack** should never mean “paste a giant CSS blob.” After applying a pack, every owned piece remains editable through ordinary Design controls.

**Reset pack** removes the pack's layers and reveals whatever was underneath. Manual styling and other packs remain unless that reset actually owns them.

## Boost

App-wide controls are split by what they actually depend on.

### Boost

Boost transforms Lumiverse's native variable map. **Colors** is the main recolor layer; **Backdrop** lives inside Boost because wallpaper/canvas treatment participates in that same transformed world.

The source flow is intentionally one-way:

```text
Lumiverse canonical generated variables
        ↓
Palette transform
        ↓
Presented app variables
```

Palette should never recursively recolor its already transformed root output.

### Typography

Typography is standalone. You can change global font family/scale without enabling palette recoloring.

This is a valid configuration:

```text
Boost colors: OFF
Backdrop:     OFF
Typography:   ON
```

### Acceptance-test nonsense that is actually useful

If you are developing Palette itself:

- **Blood Mode** — absurd red anchors; catches untransformed surfaces.
- **Pinkpocalypse** — absurd pink; catches old complex gradient values.
- Typography-only — catches accidental palette coupling.
- Wallpaper test — catches backdrop layers that remain hidden under a wash.

## Widget & Code

### Floating mini-widget

The widget is a utility cockpit, not a second full editor:

- Pick
- Guides
- Zap
- Code/selector peek
- Float/dock

Desktop: right-click the collapsed widget for its context menu.  
Touch: long-press it.  
**Hide mini widget** is reversible from Palette's sidebar/workbar control.

On phones the floating editor can attach to the top or bottom edge; the resize handle follows the anchored edge.

### Generated CSS vs Custom CSS

**Generated CSS** is compiler-owned and read-only. It exists so advanced users can inspect exactly what Palette emitted.

**Custom CSS** is your deliberate escape hatch. It stays separate from semantic project state.

Do not treat generated CSS as persistence input. Palette should regenerate it deterministically from semantic state.

### Native handoff and assets

The Code workspace can send/export the current work through Lumiverse's native theme bridge and import compatible `.lumitheme` data.

Native Theme Assets are project-owned. Palette stores canonical `./assets/...` references so an exported native theme does not depend on a temporary browser URL. Images can be optimized, and font assets can be registered into the Typography browser.

SVG imports are sanitized before entering the project wardrobe. XML declarations and harmless old exporter wrappers can be cleaned, but scripts/events/remote-content are not treated as decoration.

## CSS field guide

Palette is designed so you do not *need* CSS, but knowing a few patterns makes debugging and Custom CSS dramatically easier.

### 1. Scope before specificity

Prefer a meaningful owner plus a stable part:

```css
[data-component="BubbleMessage"] [class*="_nameChar_"] {
  color: white;
}
```

over a naked reusable family:

```css
[class*="_nameChar_"] {
  color: white;
}
```

The second rule may style another component that happens to reuse the same local class word.

### 2. `:where()` makes strong-looking selectors easier to override

Palette often wraps authored selectors in `:where(...)` so the structural scope itself contributes zero specificity while Palette controls authority deliberately:

```css
:where([data-component="BubbleMessage"] [class*="_avatar_"] img) {
  object-fit: cover;
}
```

This is different from solving everything by piling on more IDs/classes.

### 3. `!important` is not automatically evil

A visual theme editor sometimes has to beat native component CSS. The real sin is using `!important` without correct scope.

Good:

```css
[data-component="InputArea"] [data-composer-action="send"] button {
  color: white !important;
}
```

Bad:

```css
button {
  color: white !important;
}
```

### 4. Flex and Grid: style the parent to arrange children

If you want siblings to become columns, the important rule usually belongs to their parent:

```css
.parent {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
```

A child cannot make its siblings become a grid by itself. This is why Palette's Layout Item warns when the actual parent is not a layout container.

### 5. `width:100%` only means 100% of the available containing width

If a child still looks tiny after `width:100%`, inspect the parent chain. A 100%-wide child inside a 112px wrapper is still 112px.

Useful debugging sequence:

```text
Target width
→ parent width
→ parent display/layout
→ min/max constraints
→ overflow/clipping
```

### 6. Move the image *inside* the frame with `object-position`

For cropped images:

```css
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 28%;
}
```

Changing `object-position` moves the focal point inside the existing frame. Translating `.avatar` moves the whole frame instead.

### 7. Fades are masks, not opacity gradients

A common portrait fade:

```css
.avatar img {
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 68%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 68%,
    transparent 100%
  );
}
```

If native Lumi already applies a mask and you want the full image, explicitly clear it:

```css
mask-image: none;
-webkit-mask-image: none;
```

### 8. Pseudo-elements need `content`

A `::before` or `::after` does not exist visually until content is generated:

```css
.target::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}
```

For a host-local decorative back plane, the host usually needs a positioning context:

```css
.target {
  position: relative;
  isolation: isolate;
}
```

Palette adds isolation automatically when one of its generated pseudo surfaces uses a custom negative z-index.

### 9. Nudge is safer than re-owning native positioning

If Lumi already has a correct absolute/sticky/flow relationship and you only need a visual adjustment:

```css
.target {
  translate: 0 -12px;
}
```

is often safer than changing `position`, `top`, and `left` just to move it twelve pixels.

### 10. Mobile deltas should override only what changes

```css
.target {
  font-size: 30px;
  translate: 0 -40px;
}

@media (max-width: 720px) {
  .target {
    font-size: 22px;
  }
}
```

If the mobile composition should keep the Base Nudge, do not unnecessarily re-author positioning. If you need to cancel the Base movement, explicitly set the mobile translation back to zero.

### 11. Composer actions have stable identities

Prefer the stable wrappers on current Lumiverse:

```css
[data-component="InputArea"]
[data-composer-action="persona"]
[data-toolbar-action="persona"] {
  /* persona action */
}
```

The Spindle `chat_toolbar` mount is a separate extension toolbar. Do not confuse it with native composer actions just because they appear beside each other.

### 12. CSS variables are the app-wide language

Lumiverse theme variables look like:

```css
:root {
  --lumiverse-bg: #111;
  --lumiverse-text: #f7f2fa;
  --lumiverse-primary: #b78cff;
  --lumiverse-card-bg: linear-gradient(...);
}
```

Boost transforms the canonical variable map rather than hue-rotating the rendered app. That is why images/media can remain intact while the UI changes palette.

### 13. A few useful selector recipes

```css
/* Assistant message only */
[data-component="BubbleMessage"]:not([data-part="user"]) { }

/* User message only */
[data-component="BubbleMessage"][data-part="user"] { }

/* Message prose */
[data-component="BubbleMessage"] [data-component="MessageContent"] { }

/* H2 inside message prose */
[data-component="MessageContent"] h2 { }

/* Persona drawer surface */
[data-spindle-drawer-tab="personas"] { }

/* Native send action */
[data-component="InputArea"] [data-composer-action="send"] { }

/* Only paragraphs that contain an image */
[data-component="MessageContent"] p:has(img) { }
```

### 14. Full-width prose image without stretching its aspect ratio

```css
[data-component="MessageContent"] p:has(img) {
  width: 100%;
  max-width: 100%;
  margin: 14px 0 22px;
  text-align: center;
}

[data-component="MessageContent"] img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
  object-fit: contain;
}
```

For native Lumi attachments, use Palette's **Media Flow** rather than assuming this raw prose selector also owns the attachment button/frame wrappers.

## Debugging

When something “does nothing,” check these before inventing new infrastructure:

| Symptom | First thing to inspect |
| --- | --- |
| Border is mysteriously invisible | color alpha / opacity is not literally 0%. Yes, this happened. |
| `width:100%` is still tiny | containing parent width + max-width. |
| Element will not move as expected | native `position`/inset contract; try Nudge. |
| Image crop is wrong | wrapper size vs image `object-position`. |
| Mobile layer vanished | native `display:none` can defeat mere `visibility:visible`. |
| Style leaks to unrelated UI | selector lost its semantic owner/context. |
| Read Style created too much CSS | observed values should stay unowned until edited. |
| Pack reset resurrects something deleted | provenance/ownership detach is wrong. |
| `::after` decoration sits on top instead of bottom | mobile override accidentally reset Base positioning. |
| Composer selector broke after upstream change | use stable `data-composer-action` / `data-toolbar-action` identity. |

A good escalation order is:

1. Check the actual authored packet values.
2. Check the mounted target and parent geometry.
3. Inspect the generated selector in **Code**.
4. Use browser DevTools to inspect the winning declaration/cascade.
5. Only then decide whether Palette is missing a primitive or selector boundary.

> **Mounted visual truth wins.** A mathematically elegant selector or positioning scheme that does not match the real screen is still wrong.

## Credits

Palette drawer icon: **paintbrush by Alum Design (CC BY 3.0)**.  
Palette is built as a Lumiverse Spindle extension and intentionally keeps its internal `theme_studio` identity stable for persistence/runtime compatibility.
