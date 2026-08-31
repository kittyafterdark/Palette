# Palette 1.0.2

A selector-resolution hotfix for message-side DOM anatomy.

## Fixed

Palette could confuse identically named CSS-module locals from different Lumiverse modules while expanding Assistant/User/Both scopes. In BubbleMessage, the outer wrapper `_content_1hvlc_*` could be mistaken for the nested MessageContent family because the user leaf also carried `_contentUser_16x4f_*`. Picking the user outer Content could therefore jump inward to MessageContent.

Palette now keeps the mounted CSS-module hash as **pairing evidence only**. Persisted selectors remain rebuild-tolerant local-family selectors, but a `foo` ↔ `fooUser` relationship is accepted only when both mounted locals come from the same module family. Repeated locals inside one component also retain a nearby same-module structural anchor when the shorter selector would match multiple layers.

Assistant, User, and Both are covered as one resolver contract:

- outer Bubble Content stays the outer Bubble Content on each side;
- MessageContent remains separately targetable;
- Both selects exactly the corresponding target on both speakers;
- legitimate same-family pairs such as `name` / `nameUser` still resolve normally.

- Public release: **1.0.2**
- Project schema: **v41**
- Minimum Lumiverse version: **1.1.6**
