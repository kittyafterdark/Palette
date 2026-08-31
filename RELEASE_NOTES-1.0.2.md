# Palette 1.0.2

A selector-resolution hotfix for message-side DOM anatomy.

## Fixed

Palette could confuse identically named CSS-module locals from different Lumiverse modules while expanding Assistant/User/Both scopes. In BubbleMessage, the outer wrapper `_content_1hvlc_*` could be mistaken for the nested MessageContent family because the user leaf also carried `_contentUser_16x4f_*`. Picking the user outer Content could therefore jump inward to MessageContent.

Palette now keeps the mounted CSS-module hash as **pairing evidence only**. Persisted selectors remain rebuild-tolerant local-family selectors, but side variants are accepted only when the mounted locals belong to the same CSS-module family. Repeated locals inside one component also retain a nearby same-module structural anchor when the shorter selector would match multiple layers.

The same resolver now understands Lumiverse's full three-member message grammar:

```text
foo        shared/base local
fooChar    assistant leaf
fooUser    user leaf
```

So a mounted name family such as `_name_1hvlc_* / _nameChar_1hvlc_* / _nameUser_1hvlc_*` resolves as one semantic **Name** part. Assistant targets `nameChar`, User targets `nameUser`, and Both compiles exactly those two speaker branches instead of reusing the assistant leaf on the user side. Side-only `*Char` / `*User` leaves are no longer exposed as duplicate fake parts when the shared family is present.

Assistant, User, and Both are covered as one resolver contract:

- outer Bubble Content stays the outer Bubble Content on each side;
- MessageContent remains separately targetable;
- `foo / fooChar / fooUser` families resolve to the correct speaker leaf;
- Both selects exactly the corresponding target on both speakers;
- older `foo / fooUser` families still resolve normally;
- cross-module lookalikes never become side siblings merely because their local names resemble each other.

The same hotfix also closes a downstream **Both editor-state leak** found with shared parts such as BubbleMessage Header Left. Target Details could already show the correct two-branch Both selector while the Style Stack silently borrowed an Assistant-only authored packet because Both retained the originally clicked Assistant DOM node as a representative element. Editing that card therefore wrote back to the Assistant override, making generated CSS look one-sided even though the active target preview was correct.

Palette now distinguishes a representative DOM node from the full mounted scope:

- Both only treats a matched authored override as common styling when that override covers every mounted branch of the active Both selector;
- a matched-but-different message override is localized under the active Assistant/User/Both selector before edits are persisted instead of mutating the source rule;
- Both selection highlighting covers every mounted branch rather than only the speaker that was clicked first;
- forced Hover/Active/Focus/Disabled preview markers are applied to every mounted Both branch and cleaned up together.

The canonical compiler already preserved comma-separated selector lists correctly; this correction is in Design's authored-style matching and preview plumbing.

- Public release: **1.0.2**
- Project schema: **v41**
- Minimum Lumiverse version: **1.1.6**
