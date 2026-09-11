import { describe, expect, test } from 'bun:test'
import {
  authoritySelector, compileBackgroundPacket, compileContentPacket, compileFontFace, compileImagePacket, compileMaskPacket, compileLayoutPacket, compileMediaFlowPacket, compilePatternPacket, compilePositionPacket, compilePreviewThemeProject,
  compilePlacementPacket, compileSafeTargetSelector, compileSizePacket, compileSpacingPacket, compileTextEntryPacket, compileTextPacket, compileThemeProject, compileTransformPacket, compileTypographyPacket, compileVisibilityPacket,
} from '../src/compiler/compiler'
import { colorWithAlpha, parseHexColor } from '../src/compiler/color'
import { transformThemeVariables } from '../src/compiler/boost'
import { validateOverride } from '../src/compiler/validation'
import { createBackgroundPacket, createProject, createStylePacket, newId, type ComponentOverride, type DimensionValue, type StylePacket } from '../src/project/model'

function override(selector: string, states: ComponentOverride['states'], source: 'native-aware' | 'dom-scoped' = 'dom-scoped'): ComponentOverride {
  return { id: newId('override'), target: { selector, strategy: 'css-module', stability: 'medium', persistence: 'persistent', source, label: 'button · Chats' }, states }
}

describe('Phase Three semantic CSS compiler', () => {
  test('parses compact hex and keeps Background alpha out of element opacity', () => {
    expect(parseHexColor('#abc')).toEqual({ r: 170, g: 187, b: 204, alpha: 1 })
    expect(colorWithAlpha('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)')
    const packet = createBackgroundPacket(); packet.solid.color = '#38153f'; packet.solid.alpha = 0.5
    expect(compileBackgroundPacket(packet)).toBe('background: rgba(56, 21, 63, 0.5);')
    expect(compileBackgroundPacket(packet)).not.toContain('opacity:')
  })

  test('Media Flow restores natural/full-width replaced-media layout without thumbnail CSS', () => {
    const packet = createStylePacket('media-flow'); if (packet.type !== 'media-flow') throw new Error()
    expect(compileMediaFlowPacket(packet)).toBe('')
    packet.mode = 'full'; packet.unclipped = true
    const css = compileMediaFlowPacket(packet)
    expect(css).toContain('display: block;')
    expect(css).toContain('width: 100%;')
    expect(css).toContain('height: auto;')
    expect(css).toContain('max-height: none;')
    expect(css).toContain('aspect-ratio: auto;')
    expect(css).toContain('float: none;')
    expect(css).toContain('clear: both;')
    expect(css).toContain('overflow: visible;')
  })

  test('Text supports solid and compiler-owned gradient text semantics', () => {
    const packet = createStylePacket('text'); if (packet.type !== 'text') throw new Error()
    packet.solid.color = '#ffffff'; packet.solid.alpha = 0.75
    expect(compileTextPacket(packet)).toContain('color: rgba(255, 255, 255, 0.75);')
    expect(compileTextPacket(packet)).not.toContain('-webkit-text-fill-color')
    expect(compileTextPacket(packet)).not.toContain('background-clip')
    packet.inkMode = 'force'
    expect(compileTextPacket(packet)).toContain('-webkit-text-fill-color: rgba(255, 255, 255, 0.75);')
    packet.colorMode = 'gradient'; packet.gradient.angle = 90
    const css = compileTextPacket(packet)
    expect(css).toContain('background-image: linear-gradient(90deg,')
    expect(css).toContain('background-clip: text;')
    expect(css).toContain('-webkit-background-clip: text;')
    expect(css).toContain('-webkit-text-fill-color: transparent;')
    packet.strokeWidth = 1.5; packet.strokeColor = '#120818'; packet.strokeAlpha = 0.6; packet.shadow = { x: 0, y: 2, blur: 8, color: '#000000', alpha: 0.35 }
    const styled = compileTextPacket(packet)
    expect(styled).toContain('-webkit-text-stroke: 1.5px rgba(18, 8, 24, 0.6);')
    expect(styled).toContain('text-shadow: 0px 2px 8px rgba(0, 0, 0, 0.35);')

    packet.outlineMode = 'outside'
    const outside = compileTextPacket(packet)
    expect(outside).not.toContain('-webkit-text-stroke:')
    expect(outside).toContain('text-shadow:')
    expect(outside).toContain('1.5px 0px 0 rgba(18, 8, 24, 0.6)')
    expect(outside).toContain('0px 2px 8px rgba(0, 0, 0, 0.35)')
  })

  test('Respect Ink repairs exact-target inline colors without flattening descendant colors', () => {
    const packet = createStylePacket('text'); if (packet.type !== 'text') throw new Error()
    packet.solid.color = '#7f4fcf'; packet.solid.alpha = 0.8
    const project = createProject('Inline legacy ink')
    project.componentOverrides.push(override('[data-component="MessageContent"] span', { normal: [packet] }))
    const css = compileThemeProject(project)

    expect(css).toContain('[data-component="MessageContent"] span {\n  color: rgba(127, 79, 207, 0.8);\n}')
    expect(css).toContain('Inline ink compatibility · exact-target legacy/author color')
    expect(css).toContain('[data-component="MessageContent"] span:where([style^="color:" i], [style^=" color:" i], [style*=";color:" i], [style*="; color:" i], [color])')
    expect(css).toContain('color: rgba(127, 79, 207, 0.8) !important;')
    expect(css).not.toContain('[data-component="MessageContent"] span [style')
    expect(css).not.toContain('-webkit-text-fill-color')
  })

  test('Force Ink and pseudo-element Ink do not emit the inline-color compatibility shim', () => {
    const forced = createStylePacket('text'); if (forced.type !== 'text') throw new Error()
    forced.inkMode = 'force'
    const forcedProject = createProject('Forced ink')
    forcedProject.componentOverrides.push(override('.label', { normal: [forced] }))
    expect(compileThemeProject(forcedProject)).not.toContain('Inline ink compatibility')

    const pseudo = createStylePacket('text'); if (pseudo.type !== 'text') throw new Error()
    const pseudoProject = createProject('Pseudo ink')
    pseudoProject.componentOverrides.push(override('.label::after', { normal: [pseudo] }))
    expect(compileThemeProject(pseudoProject)).not.toContain('Inline ink compatibility')
  })

  test('sparse Ink that does not own fill does not emit the inline-color compatibility shim', () => {
    const packet = createStylePacket('text'); if (packet.type !== 'text') throw new Error()
    packet.editedFields = ['strokeWidth']
    packet.strokeWidth = 2
    const project = createProject('Sparse stroke')
    project.componentOverrides.push(override('.label', { normal: [packet] }))
    const css = compileThemeProject(project)
    expect(css).toContain('-webkit-text-stroke:')
    expect(css).not.toContain('Inline ink compatibility')
  })

  test('Generated Content safely quotes literal pseudo labels', () => {
    const packet = createStylePacket('content'); if (packet.type !== 'content') throw new Error()
    packet.value = 'PRIVATE "NOTE"\nFILED'
    expect(compileContentPacket(packet)).toBe(String.raw`content: "PRIVATE \"NOTE\"\A FILED";`)
    packet.source = 'title'
    expect(compileContentPacket(packet)).toBe('content: attr(title);')
    packet.source = 'aria-label'
    expect(compileContentPacket(packet)).toBe('content: attr(aria-label);')
  })


  test('Generated Content on a real element compiles onto its ::after skin', () => {
    const packet = createStylePacket('content'); if (packet.type !== 'content') throw new Error()
    packet.value = 'FORK'
    const project = createProject('Generated skin')
    project.componentOverrides.push(override('[data-component="MinimalMessage"] button[aria-label="Fork chat"]', { normal: [packet] }))
    const css = compileThemeProject(project)
    expect(css).toContain('[data-component="MinimalMessage"] button[aria-label="Fork chat"]::after')
    expect(css).toContain('content: "FORK";')
    expect(css).not.toContain('[data-component="MinimalMessage"] button[aria-label="Fork chat"] {\n  content: "FORK";')
  })

  test('Typography is an independent semantic packet', () => {
    const packet = createStylePacket('typography'); if (packet.type !== 'typography') throw new Error()
    packet.fontFamily = 'Studio Sans'; packet.fontSize = 1.1; packet.fontSizeUnit = 'rem'; packet.fontWeight = 700; packet.fontStyle = 'italic'; packet.textAlign = 'center'; packet.lineHeight = 1.6; packet.letterSpacing = 0.03; packet.transform = 'uppercase'
    const css = compileTypographyPacket(packet)
    expect(css).toContain('font-family: Studio Sans;')
    expect(css).toContain('font-size: 1.1rem;')
    expect(css).toContain('font-weight: 700;')
    expect(css).toContain('font-style: italic;')
    expect(css).toContain('text-align: center;')
    expect(css).toContain('line-height: 1.6;')
    expect(css).toContain('letter-spacing: 0.03px;')
    expect(css).toContain('text-transform: uppercase;')
  })

  test('Text Entry moves typing origin and mirrors autosize metrics without faking placeholder positioning', () => {
    const packet = createStylePacket('text-entry'); if (packet.type !== 'text-entry') throw new Error()
    packet.insetX = 14; packet.insetY = 9; packet.fontFamily = 'Georgia'; packet.fontSize = 16; packet.lineHeight = 1.52; packet.placeholderColor = '#665f62'; packet.placeholderAlpha = .62; packet.placeholderStyle = 'italic'
    const declaration = compileTextEntryPacket(packet)
    expect(declaration).toContain('padding: 9px 14px;')
    expect(declaration).toContain('font-family: Georgia;')
    expect(declaration).toContain('font-size: 16px;')

    const project = createProject('Composer metrics')
    project.componentOverrides.push(override('[data-component="InputArea"] textarea[name="chat-message"]', { normal: [packet] }))
    const css = compileThemeProject(project)
    expect(css).toContain('Text Entry mirror sync · keep autosize metrics honest')
    expect(css).toContain('[data-component="InputArea"] [class*="_textareaMirror_"]')
    expect(css).toContain('Text Entry placeholder appearance')
    expect(css).toContain('textarea[name="chat-message"]::placeholder')
    expect(css).toContain('color: rgba(102, 95, 98, 0.62);')
  })

  test('Layout Normal omits display while Flex compiles semantic alignment', () => {
    const packet = createStylePacket('layout'); if (packet.type !== 'layout') throw new Error()
    expect(compileLayoutPacket(packet)).toBe('')
    packet.display = 'flex'; packet.direction = 'row'; packet.justify = 'space-between'; packet.align = 'center'; packet.gap = { mode: 'fixed', value: 1.5, unit: 'rem' }
    expect(compileLayoutPacket(packet)).toBe('display: flex;\nflex-direction: row;\nflex-wrap: nowrap;\njustify-content: space-between;\nalign-items: center;\ngap: 1.5rem;')
  })

  test('Spacing preserves independent box sides and allows negative margins', () => {
    const packet = createStylePacket('spacing'); if (packet.type !== 'spacing') throw new Error()
    packet.padding = { linked: false, top: 2, right: 42, bottom: 10, left: 92, unit: 'px' }
    packet.margin = { linked: false, top: -4, right: 8, bottom: 12, left: -16, unit: 'px' }
    expect(compileSpacingPacket(packet)).toBe('padding: 2px 42px 10px 92px;\nmargin: -4px 8px 12px -16px;\ngap: 8px;')
  })

  test('Quick Align resolves friendly placement into logical CSS without requiring Flex/Grid', () => {
    const packet = createStylePacket('placement'); if (packet.type !== 'placement') throw new Error()
    expect(compilePlacementPacket(packet)).toBe('')
    packet.horizontal = 'end'
    expect(compilePlacementPacket(packet)).toBe('width: fit-content;\nmargin-inline-start: auto;\nmargin-inline-end: 0;\njustify-self: end;')
    packet.horizontal = 'center'; packet.vertical = 'center'
    const centered = compilePlacementPacket(packet)
    expect(centered).toContain('width: fit-content;')
    expect(centered).toContain('margin-inline-start: auto;')
    expect(centered).toContain('margin-inline-end: auto;')
    expect(centered).toContain('margin-block-start: auto;')
    expect(centered).toContain('margin-block-end: auto;')
    expect(centered).toContain('align-self: center;')
    packet.horizontal = 'stretch'; packet.vertical = 'stretch'
    const stretched = compilePlacementPacket(packet)
    expect(stretched).toContain('width: 100%;')
    expect(stretched).toContain('height: 100%;')
  })

  test('Size compiles friendly dimension modes and practical units', () => {
    const values: Array<[DimensionValue, string]> = [[{ mode: 'native' }, ''], [{ mode: 'content' }, 'fit-content'], [{ mode: 'parent' }, '100%'], [{ mode: 'fixed', value: 320, unit: 'px' }, '320px'], [{ mode: 'fixed', value: 50, unit: '%' }, '50%'], [{ mode: 'fixed', value: 24, unit: 'rem' }, '24rem']]
    for (const [value, expected] of values) {
      const packet = createStylePacket('size'); if (packet.type !== 'size') throw new Error(); packet.width = value; packet.height = undefined
      expect(compileSizePacket(packet)).toBe(expected ? `width: ${expected};` : '')
    }
  })

  test('Image semantics compile visual adjustments without owning surface masks', () => {
    const packet = createStylePacket('image'); if (packet.type !== 'image') throw new Error()
    packet.brightness = 0.82; packet.saturation = 1.35; packet.contrast = 1.1; packet.objectFit = 'cover'; packet.fillFrame = true; packet.objectPositionX = 68; packet.objectPositionY = 32
    const css = compileImagePacket(packet)
    expect(css).toContain('filter: brightness(0.82) saturate(1.35) contrast(1.1);')
    expect(css).toContain('width: 100%;')
    expect(css).toContain('height: 100%;')
    expect(css).toContain('object-position: 68% 32%;')
    expect(css).not.toContain('mask-image')
    expect(css).not.toContain('translate:')
  })

  test('Mask preserves native masks, explicitly clears them, fades edges, or composes custom WebKit-safe layers', () => {
    const packet = createStylePacket('mask'); if (packet.type !== 'mask') throw new Error()
    packet.maskMode = 'native'
    expect(compileMaskPacket(packet)).not.toContain('mask-image')
    packet.maskMode = 'none'
    expect(compileMaskPacket(packet)).toContain('mask-image: none;')
    expect(compileMaskPacket(packet)).toContain('-webkit-mask-image: none;')
    packet.maskMode = 'fade'; packet.fade = { direction: 'right', amount: 30 }
    expect(compileMaskPacket(packet)).toContain('mask-image: linear-gradient(to right')
    packet.maskMode = 'custom'
    packet.customMask = {
      horizontal: { enabled: true, side: 'right', solidUntil: 25, fadeUntil: 90 },
      top: { enabled: true, solidUntil: 85, fadeUntil: 100 },
      bottom: { enabled: true, solidUntil: 55, fadeUntil: 100 },
      combine: 'intersect',
    }
    const css = compileMaskPacket(packet)
    expect(css).toContain('linear-gradient(to right, #000 0%, #000 25%, transparent 90%, transparent 100%)')
    expect(css).toContain('linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)')
    expect(css).toContain('linear-gradient(to top, #000 0%, #000 85%, transparent 100%)')
    expect(css).toContain('mask-composite: intersect, intersect;')
    expect(css).toContain('-webkit-mask-composite: source-in, source-in;')
  })

  test('Visibility exposes semantic visible, invisible and gone modes', () => {
    const packet = createStylePacket('visibility'); if (packet.type !== 'visibility') throw new Error()
    expect(compileVisibilityPacket(packet)).toBe('display: none;')
    packet.mode = 'invisible'; expect(compileVisibilityPacket(packet)).toBe('visibility: hidden;')
    packet.mode = 'visible'; expect(compileVisibilityPacket(packet)).toBe('visibility: visible;')
  })

  test('Position semantics compile friendly modes, offsets and layer presets', () => {
    const packet = createStylePacket('position'); if (packet.type !== 'position') throw new Error()
    packet.mode = 'anchored'; packet.top = 12; packet.right = 8; packet.nudgeX = 6; packet.nudgeY = -4; packet.layer = 'overlay'
    expect(compilePositionPacket(packet)).toContain('position: absolute;')
    expect(compilePositionPacket(packet)).toContain('top: 12px;')
    expect(compilePositionPacket(packet)).toContain('right: 8px;')
    expect(compilePositionPacket(packet)).toContain('translate: 6px -4px;')
    expect(compilePositionPacket(packet)).toContain('z-index: 100;')
  })

  test('Anchored position neutralizes stale translate when nudge is zero', () => {
    const packet = createStylePacket('position'); if (packet.type !== 'position') throw new Error()
    packet.mode = 'anchored'; packet.right = 12; packet.bottom = 10
    const css = compilePositionPacket(packet)
    expect(css).toContain('position: absolute;')
    expect(css).toContain('translate: 0px 0px;')
  })

  test('Anchored position clears unauthored native edges', () => {
    const packet = createStylePacket('position'); if (packet.type !== 'position') throw new Error()
    packet.mode = 'anchored'; packet.right = 16; packet.bottom = 12
    const css = compilePositionPacket(packet)
    expect(css).toContain('top: auto;')
    expect(css).toContain('right: 16px;')
    expect(css).toContain('bottom: 12px;')
    expect(css).toContain('left: auto;')
  })

  test('Nudge uses intuitive signed movement instead of opposite-side CSS offsets', () => {
    const packet = createStylePacket('position'); if (packet.type !== 'position') throw new Error()
    packet.mode = 'nudge'; packet.nudgeX = 24; packet.nudgeY = -8; packet.unit = 'px'
    const css = compilePositionPacket(packet)
    expect(css).not.toContain('position:')
    expect(css).toContain('translate: 24px -8px;')
    expect(css).not.toContain('right:')
    expect(css).not.toContain('bottom:')
  })

  test('Nudge preserves native positioning instead of forcing relative flow', () => {
    const packet = createStylePacket('position'); if (packet.type !== 'position') throw new Error()
    packet.mode = 'nudge'; packet.nudgeX = -5; packet.nudgeY = 161; packet.unit = 'px'; packet.layer = 'custom'; packet.zIndex = 34
    const css = compilePositionPacket(packet)
    expect(css).toContain('translate: -5px 161px;')
    expect(css).toContain('z-index: 34;')
    expect(css).not.toContain('position: relative;')
    expect(css).not.toContain('position: absolute;')
  })

  test('Nudge can explicitly reset an inherited Base translation to zero', () => {
    const packet = createStylePacket('position'); if (packet.type !== 'position') throw new Error()
    packet.mode = 'nudge'; packet.nudgeX = 0; packet.nudgeY = 0; packet.unit = 'px'
    const css = compilePositionPacket(packet)
    expect(css).not.toContain('position:')
    expect(css).toContain('translate: 0px 0px;')
  })


  test('Negative pseudo planes isolate their parent stacking context instead of escaping behind ancestors', () => {
    const project = createProject('Pseudo isolation')
    const background = createStylePacket('background'); if (background.type !== 'background') throw new Error()
    background.solid = { color: '#3a5355', alpha: 1 }
    const position = createStylePacket('position'); if (position.type !== 'position') throw new Error()
    position.mode = 'nudge'; position.layer = 'custom'; position.zIndex = -1
    project.componentOverrides.push(override('[data-component="MessageContent"] [class*="_htmlIsland_"]::before', { normal: [background, position] }))
    const css = compilePreviewThemeProject(project)
    expect(css).toContain('isolation: isolate;')
    expect(css).toContain('z-index: -1;')
    expect(css).toContain('::before')
  })

  test('Transform composes rotate and scale independently from Position while skew owns transform', () => {
    const packet = createStylePacket('transform'); if (packet.type !== 'transform') throw new Error()
    packet.rotate = -3.2; packet.scaleX = packet.scaleY = 1.015; packet.skewX = -4; packet.skewY = 1
    const css = compileTransformPacket(packet)
    expect(css).toContain('rotate: -3.2deg;')
    expect(css).toContain('scale: 1.015;')
    expect(css).toContain('transform: skew(-4deg, 1deg);')
    expect(css).not.toContain('translate:')
  })

  test('Strong authority keeps ::placeholder after authority guards', () => {
    const selector = authoritySelector('[data-component="InputArea"] textarea::placeholder')
    expect(selector).toContain(':where([data-component="InputArea"] textarea):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__)::placeholder')
    expect(selector).not.toContain('::placeholder:not(')
  })

  test('decorative layer state selectors keep pseudo-elements after the state', () => {
    const project = createProject('Layered states')
    project.componentOverrides.push(override('.card::before', { normal: [createStylePacket('background')], hover: [createStylePacket('border')] }))
    const css = compileThemeProject(project)
    expect(css).toContain('.card:hover::before {')
    expect(css).not.toContain('.card::before:hover')
    expect(css).toContain('content: "";')
    expect(css).toContain('pointer-events: none;')
  })

  test('assistant/user selector lists keep states, Strong authority and pseudo surfaces branch-safe', () => {
    const project = createProject('Message sides')
    const target = override('[data-component="BubbleMessage"]:not([class*="_user_"]) [class*="_name_"]::before,\n[data-component="BubbleMessage"][class*="_user_"] [class*="_nameUser_"]::before', {
      normal: [createStylePacket('background')],
      hover: [createStylePacket('border')],
    }, 'native-aware')
    target.target.overrideStrength = 'strong'
    project.componentOverrides.push(target)
    const css = compileThemeProject(project)
    expect(css).toContain('[class*="_name_"]:hover)')
    expect(css).toContain('[class*="_nameUser_"]:hover)')
    expect(css.match(/#__theme_studio_authority_a__/g)?.length ?? 0).toBeGreaterThan(1)
    expect(css.match(/::before/g)?.length ?? 0).toBeGreaterThan(3)
    expect(css).not.toContain('::before:hover')
  })

  test('Size boundaries and phone safety compile semantic helper rules', () => {
    const project = createProject('Responsive size')
    const size = createStylePacket('size'); if (size.type !== 'size') throw new Error()
    size.width = { mode: 'fixed', value: 640, unit: 'px' }; size.boundary = { selector: '.bubble', label: 'Bubble' }; size.mobileSafe = true
    project.componentOverrides.push(override('.avatar', { normal: [size] }))
    const css = compileThemeProject(project)
    expect(css).toContain('.bubble {\n  container-type: inline-size;')
    expect(css).toContain('max-width: 100cqw;')
    expect(css).toContain('@media (max-width: 720px)')
    expect(css).toContain('width: min(640px, calc(100vw - 24px));')
  })

  test('Fill with a chosen boundary fills that boundary rather than only the immediate parent', () => {
    const project = createProject('Boundary fill')
    const size = createStylePacket('size'); if (size.type !== 'size') throw new Error()
    size.width = { mode: 'parent' }; size.boundary = { selector: '.bubble', label: 'Bubble' }
    project.componentOverrides.push(override('.child', { normal: [size] }))
    const css = compileThemeProject(project)
    expect(css).toContain('.bubble {\n  container-type: inline-size;')
    expect(css).toContain('.child {\n  width: 100cqw;')
    expect(css).toContain('max-width: 100cqw;')
  })

  test('pack asset decoration compiles as a pointer-safe anchored pseudo layer', () => {
    const project = createProject('Pack asset')
    const background = createStylePacket('background'); const position = createStylePacket('position'); const size = createStylePacket('size')
    if (background.type !== 'background' || position.type !== 'position' || size.type !== 'size') throw new Error()
    background.mode = 'image'; background.image.assetPath = './assets/sticker.webp'; background.image.size = 'contain'
    position.mode = 'anchored'; position.anchorSelector = '[data-component="MinimalMessage"]'; position.anchorLabel = 'Minimal message frame'; position.left = 18; position.top = -12; position.layer = 'custom'; position.zIndex = 120
    size.width = { mode: 'fixed', value: 96, unit: 'px' }; size.height = { mode: 'fixed', value: 96, unit: 'px' }
    project.componentOverrides.push(override('[data-component="MinimalMessage"]:where(:not([data-theme-studio-asset-slot="manga-corner-art"]))::after', { normal: [background, position, size] }, 'native-aware'))
    const css = compileThemeProject(project)
    expect(css).toContain('content: "";')
    expect(css).toContain('pointer-events: none;')
    expect(css).toContain('inset: auto;')
    expect(css).toContain('background-image: url("./assets/sticker.webp");')
    expect(css).toContain('position: absolute;')
    expect(css).toContain('left: 18px;')
    expect(css).toContain('top: -12px;')
    expect(css).toContain('width: 96px;')
    expect(css).toContain('/* Position anchor · Minimal message frame */')
  })

  test('Anchored positioning emits an explicit ancestor helper', () => {
    const project = createProject('Anchored')
    const position = createStylePacket('position'); if (position.type !== 'position') throw new Error()
    position.mode = 'anchored'; position.anchorSelector = '.bubble'; position.anchorLabel = 'Bubble'; position.layer = 'raised'
    project.componentOverrides.push(override('.badge', { normal: [position] }))
    const css = compileThemeProject(project)
    expect(css).toContain('/* Position anchor · Bubble */')
    expect(css).toContain(':where(.bubble) {\n  position: relative;')
    expect(css).toContain('.badge {\n  position: absolute;')
  })


  test('anchor helper stays lower priority than an anchors own positioning', () => {
    const project = createProject('Nested anchors')
    const parentPosition = createStylePacket('position'); const childPosition = createStylePacket('position')
    if (parentPosition.type !== 'position' || childPosition.type !== 'position') throw new Error()
    parentPosition.mode = 'anchored'; parentPosition.anchorSelector = '.frame'; parentPosition.anchorLabel = 'Frame'; parentPosition.top = 0; parentPosition.left = 0
    childPosition.mode = 'anchored'; childPosition.anchorSelector = '.scene'; childPosition.anchorLabel = 'Scene'; childPosition.bottom = 0; childPosition.left = 0
    project.componentOverrides.push(override('.scene', { normal: [parentPosition] }))
    project.componentOverrides.push(override('.scrim', { normal: [childPosition] }))
    const css = compileThemeProject(project)
    expect(css).toContain('.scene {\n  position: absolute;')
    expect(css).toContain(':where(.scene) {\n  position: relative;')
    expect(css.indexOf('.scene {\n  position: absolute;')).toBeLessThan(css.indexOf(':where(.scene) {\n  position: relative;'))
  })

  test('normal, hover, active, focus-visible and disabled compile separately', () => {
    const packets = (color: string): StylePacket[] => { const value = createBackgroundPacket(); value.solid.color = color; return [value] }
    const project = createProject('States'); const item = override('.button', { normal: packets('#111111'), hover: packets('#222222'), active: packets('#333333'), focusVisible: packets('#444444'), disabled: packets('#555555') })
    project.componentOverrides.push(item)
    const canonical = compileThemeProject(project)
    expect(canonical).toContain('.button:hover {'); expect(canonical).toContain('.button:active {'); expect(canonical).toContain('.button:focus-visible {')
    expect(canonical).toContain('.button:disabled,\n.button[aria-disabled="true"] {')
    expect(canonical).not.toContain('data-theme-studio-preview-state')
    const preview = compilePreviewThemeProject(project, { forcedOverrideId: item.id, forcedState: 'hover' })
    expect(preview).toContain('.button[data-theme-studio-preview-state="hover"]')
  })

  test('safe percent-encoded inline SVG assets compile on semantic pseudo-surfaces', () => {
    const background = createBackgroundPacket(); background.mode = 'image'; background.image.assetPath = 'data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M2%202h20v20H2Z%22%2F%3E%3C%2Fsvg%3E'; background.image.size = 'contain'
    expect(compileBackgroundPacket(background)).toContain('data:image/svg+xml,%3Csvg')
  })

  test('Background Stencil masks a native icon box and can suppress its direct SVG contents', () => {
    const background = createBackgroundPacket(); background.mode = 'image'; background.image.assetPath = 'data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M2%202h20v20H2Z%22%2F%3E%3C%2Fsvg%3E'; background.image.size = 'contain'; background.image.renderMode = 'mask'; background.image.maskColor = '#92a6b3'; background.image.maskAlpha = .8; background.image.hideContents = true
    const declarations = compileBackgroundPacket(background)
    expect(declarations).toContain('-webkit-mask-image: url("data:image/svg+xml,')
    expect(declarations).toContain('mask-size: contain;')
    expect(declarations).toContain('background: rgba(146, 166, 179, 0.8);')
    const project = createProject('Stencil')
    project.componentOverrides.push(override('[class*="_brain_"]', { normal: [background] }))
    const css = compileThemeProject(project)
    expect(css).toContain('[class*="_brain_"] > *')
    expect(css).toContain('display: none;')
  })

  test('asset font faces and Background images compile portable paths', () => {
    expect(compileFontFace({ id: 'font', family: 'Alike Angular', source: { type: 'theme-asset', path: './assets/alike.woff2' }, weight: 400, style: 'normal', display: 'swap' })).toContain('src: url("./assets/alike.woff2") format("woff2");')
    const background = createBackgroundPacket(); background.mode = 'image'; background.image.assetPath = './assets/panel.png'; background.image.size = 'cover'
    expect(compileBackgroundPacket(background)).toContain('background-image: url("./assets/panel.png");')
  })

  test('DOM-only full packet/state rules and app-wide Boost compile from the native baseline', () => {
    const project = createProject('Boosted DOM'); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.typographyEnabled = true; project.boost.primary = { color: '#ff8a65', alpha: 1 }; project.boost.textMode = 'custom'; project.boost.text = { color: '#fff3e0', alpha: 1 }; project.boost.typography.fontFamily = 'Studio Sans'
    const types = ['background', 'text', 'border', 'corners', 'spacing', 'shadow', 'glass', 'opacity', 'layout', 'size'] as const
    project.componentOverrides.push(override('[class*="_thirdPartyWidget_"]', { normal: types.map(createStylePacket), hover: [createStylePacket('shadow')] }))
    const css = compilePreviewThemeProject(project, { includeBoost: true }, { '--lumiverse-primary': '#9370db', '--lumiverse-bg': '#18151f', '--lumiverse-text': '#f4eef8', '--lumiverse-font-family': 'Native Sans' })
    expect(css).toContain('/* Application-wide Palette Boost */')
    expect(css).toContain('--lumiverse-text: #fff3e0;')
    expect(css).toContain('/* DOM target · button · Chats')
    expect(css).toContain('[class*="_thirdPartyWidget_"]:hover')
  })

  test('Pattern is a composable paint layer rather than a background-image collision', () => {
    const project = createProject('Patterned')
    const background = createStylePacket('background'); const pattern = createStylePacket('pattern')
    if (background.type !== 'background' || pattern.type !== 'pattern') throw new Error()
    background.mode = 'gradient'; background.gradient.angle = 120
    pattern.pattern = 'diamonds'; pattern.color = '#ffffff'; pattern.alpha = .16; pattern.scale = 22; pattern.angle = 45
    expect(compilePatternPacket(pattern)).toContain('background-image: linear-gradient(')
    project.componentOverrides.push(override('.card', { normal: [background, pattern] }))
    const css = compileThemeProject(project)
    expect(css).toContain('.card {')
    expect(css).toContain('background-image: linear-gradient(45deg')
    expect(css).toContain('linear-gradient(120deg')
    expect((css.match(/background-image:/g) ?? []).length).toBe(1)
  })

  test('Strong authority normalizes selector specificity so later local edits beat more specific Strong sources', () => {
    const project = createProject('Authority')
    const source = override('[data-component="BubbleMessage"] [data-component="MessageContent"] h1', { normal: [createStylePacket('text')] }, 'native-aware')
    source.target.overrideStrength = 'strong'
    const local = override('h1', { normal: [createStylePacket('text')] }, 'dom-scoped')
    local.target.overrideStrength = 'strong'
    if (source.states.normal[0]?.type === 'text') source.states.normal[0].solid.color = '#8c7bff'
    if (local.states.normal[0]?.type === 'text') local.states.normal[0].solid.color = '#ff00ff'
    project.componentOverrides.push(source, local)
    const css = compileThemeProject(project)
    expect(css).toContain(':where([data-component="BubbleMessage"] [data-component="MessageContent"] h1):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__) {')
    expect(css).toContain(':where(h1):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__) {')
    expect(css.indexOf('color: #ff00ff !important;')).toBeGreaterThan(css.indexOf('color: #8c7bff !important;'))
    expect(authoritySelector('button:is(.a,.b), .card::before')).toBe(':where(button:is(.a,.b)):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__),\n:where(.card):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__)::before')
  })

  test('Strong native override strengthens semantic declarations and helper rules', () => {
    const project = createProject('Strong')
    const background = createStylePacket('background'); const size = createStylePacket('size'); const position = createStylePacket('position')
    if (size.type !== 'size' || position.type !== 'position') throw new Error()
    size.width = { mode: 'fixed', value: 420, unit: 'px' }; size.boundary = { selector: '.bubble', label: 'Bubble' }; size.mobileSafe = true
    position.mode = 'anchored'; position.anchorSelector = '.bubble'; position.anchorLabel = 'Bubble'
    const item = override('.native-part', { normal: [background, position, size] }, 'native-aware')
    item.target.overrideStrength = 'strong'
    project.componentOverrides.push(item)
    const css = compileThemeProject(project)
    expect(css).toContain('background: #5f4b8b !important;')
    expect(css).toContain('position: absolute !important;')
    expect(css).toContain('container-type: inline-size !important;')
    expect(css).toContain('width: min(420px, calc(100vw - 24px)) !important;')
    expect(css).toContain('max-width: 100cqw !important;')
  })

  test('Design preview can omit Boost so local slider scrubs never replace world-state variables', () => {
    const project = createProject('Barney world state')
    project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#8f3fd1', alpha: 1 }
    const size = createStylePacket('size')
    if (size.type !== 'size') throw new Error('Expected size packet')
    size.width = { mode: 'fixed', value: 72, unit: 'px' }
    const item = override('.avatar', { normal: [size] })
    project.componentOverrides.push(item)
    const native = { '--lumiverse-primary': '#9370db', '--lumiverse-bg': '#101016', '--lumiverse-text': '#f4eef8' }
    const canonical = compilePreviewThemeProject(project, {}, native)
    const designOnly = compilePreviewThemeProject(project, { includeBoost: false }, native)
    expect(canonical).toContain('Application-wide Palette Boost')
    expect(designOnly).not.toContain('Application-wide Palette Boost')
    expect(designOnly).toContain('.avatar')
  })

  test('Protect controls stays surgical and never rewrites shared primary prose text', () => {
    const project = createProject('Readable Barney')
    project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.protectControls = true; project.boost.originalSaturation = 0
    project.boost.primary = { color: '#ffffff', alpha: 1 }
    const baseline = { '--lumiverse-primary': '#f5f5f5', '--lumiverse-primary-text': '#ffffff', '--lumiverse-primary-deep': '#f0f0f0', '--lumiverse-primary-deep-contrast': '#ffffff' }
    const protectedVars = transformThemeVariables(baseline, project.boost).variables
    project.boost.protectControls = false
    const rawVars = transformThemeVariables(baseline, project.boost).variables
    expect(protectedVars['--lumiverse-primary-text']).toBe(rawVars['--lumiverse-primary-text'])
    expect(protectedVars['--lumiverse-primary-deep-contrast']).toBe('#17131f')
    expect(rawVars['--lumiverse-primary-deep-contrast']).not.toBe('#17131f')
  })

  test('Canvas Boost can reveal wallpaper without recoloring the rest of the variable map', () => {
    const project = createProject('Canvas only')
    project.boost.enabled = true; project.boost.canvasEnabled = true; project.boost.canvasOpacity = .4
    const baseline = { '--lumiverse-scene-text-scrim': 'rgba(7, 9, 16, 0.46)', '--lumiverse-bg-deep-080': 'rgba(14, 12, 22, 0.8)', '--lumiverse-bg-070': 'rgba(28, 24, 38, 0.7)', '--lumiverse-bg': 'rgba(28, 24, 38, 0.95)', '--lumiverse-card-bg': 'rgba(20, 20, 20, 0.9)', '--lumiverse-text': '#ffffff' }
    const result = transformThemeVariables(baseline, project.boost)
    expect(Object.keys(result.variables)).toEqual(['--lumiverse-scene-text-scrim', '--lumiverse-bg-deep-080', '--lumiverse-bg-070'])
    expect(result.variables['--lumiverse-scene-text-scrim']).toContain('0.184')
    expect(result.variables['--lumiverse-bg-deep-080']).toContain('0.32')
    expect(result.variables['--lumiverse-bg-070']).toContain('0.28')
    expect(result.variables['--lumiverse-card-bg']).toBeUndefined()
  })

  test('Read Style sparse packets compile only explicitly edited semantic fields', () => {
    const project = createProject('Lazy read')
    const typography = createStylePacket('typography'); if (typography.type !== 'typography') throw new Error()
    typography.fontFamily = 'Georgia'; typography.fontSize = 33; typography.fontWeight = 700; typography.lineHeight = 1.45
    typography.editedFields = ['fontSize']
    const text = createStylePacket('text'); if (text.type !== 'text') throw new Error()
    text.colorMode = 'solid'; text.solid.color = '#9370db'; text.strokeWidth = 2; text.strokeColor = '#ffffff'; text.editedFields = ['strokeWidth', 'strokeColor']
    const item = override('h1', { normal: [typography, text] })
    item.target.overrideStrength = 'strong'; project.componentOverrides.push(item)
    const css = compileThemeProject(project)
    expect(css).toContain('font-size: 33px !important;')
    expect(css).not.toContain('font-family: Georgia')
    expect(css).not.toContain('font-weight: 700')
    expect(css).not.toContain('line-height: 1.45')
    expect(css).toContain('-webkit-text-stroke: 2px #ffffff !important;')
    expect(css).not.toContain('color: #9370db')

    typography.fontSizeUnit = 'rem'; typography.editedFields = ['fontSizeUnit']
    const unitOnly = compileThemeProject(project)
    expect(unitOnly).toContain('font-size: 33rem !important;')
  })


  test('Read Style sparse borders use longhands and do not preserve a transparent observed color after the user chooses paint', () => {
    const project = createProject('Lazy border')
    const border = createStylePacket('border'); if (border.type !== 'border') throw new Error()
    border.width = 20; border.style = 'solid'; border.color = '#4dd1db'; border.alpha = 0
    border.editedFields = ['width', 'color']
    const item = override('.persona-row', { normal: [border] })
    item.target.overrideStrength = 'strong'; project.componentOverrides.push(item)
    const css = compileThemeProject(project)
    expect(css).toContain('border-width: 20px !important;')
    expect(css).toContain('border-color: #4dd1db !important;')
    expect(css).not.toContain('rgba(77, 209, 219, 0)')
    expect(css).not.toContain('border: 20px')
    expect(css).not.toContain('border-style:')
  })

  test('questionable packet combinations produce centralized non-fatal warnings', () => {
    const background = createStylePacket('background'); const text = createStylePacket('text'); const layout = createStylePacket('layout')
    if (text.type !== 'text' || layout.type !== 'layout') throw new Error(); text.colorMode = 'gradient'; layout.justify = 'center'
    const item = override('.target', { normal: [background, text, layout] })
    expect(validateOverride(item).map((warning) => warning.code)).toEqual(['gradient-text-background', 'layout-normal-alignment'])
  })

  test('canonical slots collapse repeated style categories instead of appending cascade strata', () => {
    const project = createProject('Canonical slots')
    const oldTypography = createStylePacket('typography'); if (oldTypography.type !== 'typography') throw new Error()
    oldTypography.fontSize = 18
    const newestTypography = createStylePacket('typography'); if (newestTypography.type !== 'typography') throw new Error()
    newestTypography.fontSize = 26
    const background = createStylePacket('background')
    project.componentOverrides.push(override('.card', { normal: [oldTypography, background, newestTypography] }))
    const css = compileThemeProject(project)
    expect(css.match(/\/\* Slot · Typography \*\//g)?.length).toBe(1)
    expect(css).toContain('font-size: 26px;')
    expect(css).not.toContain('font-size: 18px;')
    expect(css.match(/\/\* Slot · Background \*\//g)?.length).toBe(1)
  })

  test('mobile authored state compiles as a sparse canonical media scope', () => {
    const project = createProject('Phone scope')
    const base = createStylePacket('typography'); if (base.type !== 'typography') throw new Error()
    base.fontFamily = 'Georgia'; base.fontSize = 34
    const mobile = createStylePacket('typography'); if (mobile.type !== 'typography') throw new Error()
    mobile.fontFamily = 'Georgia'; mobile.fontSize = 25; mobile.editedFields = ['fontSize']
    const item = override('.story h1', { normal: [base] })
    item.mobileStates = { normal: [mobile] }
    project.componentOverrides.push(item)
    const css = compileThemeProject(project)
    expect(css).toContain('/* Scope · Base */')
    expect(css).toContain('@media (max-width: 720px) {')
    expect(css).toContain('/* Scope · Mobile ≤ 720px */')
    const mobileBlock = css.slice(css.indexOf('@media (max-width: 720px)'))
    expect(mobileBlock).toContain('font-size: 25px;')
    expect(mobileBlock).not.toContain('font-family: Georgia;')
  })

  test('preserves ancestor context when strengthening selectors', () => {
    const selector = authoritySelector('[data-component="MinimalMessage"]:not([class*="_user_"]) [class*="_avatar_"]')
    expect(selector).toContain('[data-component="MinimalMessage"]')
    expect(selector).toContain('[class*="_avatar_"]')
    expect(selector).not.toBe(':where([class*="_avatar_"]):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__)')
  })

  test('native-aware local CSS-module targets fail closed instead of leaking globally', () => {
    const project = createProject('Scope guard')
    const sized = createStylePacket('size'); if (sized.type !== 'size') throw new Error()
    sized.width = { mode: 'fixed', value: 18, unit: '%' }
    project.componentOverrides.push({ id: 'repairable', target: { selector: '[class*="_avatar_"]', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Avatar · Ancestor', nativeComponentId: 'mounted:MinimalMessage', nativeContextSelector: '[data-component="MinimalMessage"]', localSelector: '[class*="_avatar_"]' }, states: { normal: [sized] } })
    const repaired = compileThemeProject(project)
    expect(repaired).toContain('[data-component="MinimalMessage"] [class*="_avatar_"]')
    expect(repaired).not.toMatch(/(?:^|\n)\[class\*="_avatar_"\]\s*\{/m)

    project.componentOverrides[0].target.nativeComponentId = undefined
    project.componentOverrides[0].target.nativeContextSelector = undefined
    const quarantined = compileThemeProject(project)
    expect(quarantined).not.toContain('[class*="_avatar_"]')
  })

  test('quarantines historical App > Avatar while allowing a family-anchored avatar path', () => {
    const project = createProject('Avatar collision guard')
    const size = createStylePacket('size'); if (size.type !== 'size') throw new Error()
    size.width = { mode: 'fixed', value: 456, unit: 'px' }
    project.componentOverrides.push({
      id: 'broad-app-avatar',
      target: {
        selector: '[class*="_app_"] [class*="_avatar_"]', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware',
        label: 'Avatar selector · App', nativeComponentId: 'src/App', nativeContextSelector: '[class*="_app_"]', localSelector: '[class*="_avatar_"]',
      },
      states: { normal: [size] },
    })
    expect(compileThemeProject(project)).not.toContain('[class*="_app_"] [class*="_avatar_"]')

    project.componentOverrides[0].target.selector = '[class*="_app_"] [class*="_characterCard_"] [class*="_avatar_"]'
    project.componentOverrides[0].target.localSelector = '[class*="_characterCard_"] [class*="_avatar_"]'
    const anchored = compileThemeProject(project)
    expect(anchored).toContain('[class*="_characterCard_"] [class*="_avatar_"]')
  })

  test('canonicalizes a duplicated native context before compiling image/runtime selectors', () => {
    const project = createProject('Context echo image')
    const image = createStylePacket('image'); if (image.type !== 'image') throw new Error()
    image.sourceQuality = 'full'
    const mask = createStylePacket('mask'); if (mask.type !== 'mask') throw new Error(); mask.maskMode = 'fade'; mask.fade = { direction: 'top', amount: 31 }
    project.componentOverrides.push({
      id: 'app-image',
      target: {
        selector: '[class*="_app_"] [class*="_app_"] [class*="_avatar_"] img', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware',
        label: 'img in App', nativeComponentId: 'src/App', nativeContextSelector: '[class*="_app_"]', localSelector: '[class*="_avatar_"] img',
      },
      states: { normal: [image, mask] },
    })
    expect(compileSafeTargetSelector(project.componentOverrides[0].target)).toBe('[class*="_app_"] [class*="_avatar_"] img')
    const css = compileThemeProject(project)
    expect(css).toContain('[class*="_app_"] [class*="_avatar_"] img {')
    expect(css).not.toContain('[class*="_app_"] [class*="_app_"]')
  })

  test('native-aware CSS-module targets outside message components remain stylable', () => {
    const project = createProject('Native non-message scope')
    const background = createStylePacket('background'); if (background.type !== 'background') throw new Error()
    background.solid.color = '#221144'
    project.componentOverrides.push({
      id: 'bar-wrapper',
      target: {
        selector: '[class*="_barWrapper_"]',
        strategy: 'css-module',
        stability: 'medium',
        persistence: 'persistent',
        source: 'native-aware',
        label: 'Bar Wrapper · Ancestor',
        nativeComponentId: 'src/components/chat/ChatView',
      },
      states: { normal: [background] },
    })
    const css = compileThemeProject(project)
    expect(css).toContain('[class*="_barWrapper_"]')
    expect(css).toContain('background:')
    expect(css).not.toContain('[data-component="MinimalMessage"] [class*="_barWrapper_"]')
  })

})


test('flow centering uses logical auto margins without changing positioning mode', () => {
  const packet = createStylePacket('position')
  if (packet.type !== 'position') throw new Error('expected position packet')
  packet.mode = 'flow'
  packet.flowAlign = 'center'
  expect(compilePositionPacket(packet)).toContain('margin-inline: auto;')
  expect(compilePositionPacket(packet)).not.toContain('position:')
  packet.mode = 'nudge'
  packet.nudgeX = 12
  expect(compilePositionPacket(packet)).toContain('translate: 12px 0px;')
  expect(compilePositionPacket(packet)).toContain('margin-inline: auto;')
})

test('sticky Position compiles offsets and a sparse flow mode can release it on mobile', () => {
  const sticky = createStylePacket('position')
  if (sticky.type !== 'position') throw new Error('expected position packet')
  sticky.mode = 'sticky'
  sticky.top = 18
  expect(compilePositionPacket(sticky)).toContain('position: sticky;')
  expect(compilePositionPacket(sticky)).toContain('top: 18px;')
  expect(compilePositionPacket(sticky)).not.toContain('position: absolute;')

  const release = createStylePacket('position')
  if (release.type !== 'position') throw new Error('expected position packet')
  release.mode = 'flow'
  release.editedFields = ['mode']
  expect(compilePositionPacket(release)).toContain('position: static;')
})


test('Composer Icons replace only stable native action glyphs and keep badges/buttons intact', () => {
  const project = createProject('Composer icon family')
  const icons = createStylePacket('composer-icons')
  if (icons.type !== 'composer-icons') throw new Error('expected composer icons')
  icons.family = 'manga'
  icons.size = 15
  project.componentOverrides.push({
    id: 'composer-icons',
    target: { selector: '[data-component="InputArea"] [class*="_actionBar_"]', strategy: 'native-context-local', stability: 'high', persistence: 'persistent', source: 'native-aware', label: 'Native composer action bar', nativeComponentId: 'InputArea', nativeContextSelector: '[data-component="InputArea"]', localSelector: '[class*="_actionBar_"]' },
    states: { normal: [icons] },
  })
  const css = compileThemeProject(project)
  expect(css).toContain('Composer icon family · manga')
  expect(css).toContain('[data-composer-action="home"][data-toolbar-action="home"] > button svg')
  expect(css).toContain('[data-composer-action="guides"][data-toolbar-action="guides"] > button::before')
  expect(css).toContain('-webkit-mask-image: url("data:image/svg+xml,')
  expect(css).not.toContain('[data-composer-action="persona"][data-toolbar-action="persona"] span {')

  icons.editedFields = ['size']
  const sparseSizeOnlyCss = compileThemeProject(project)
  expect(sparseSizeOnlyCss).not.toContain('Composer icon family ·')

  icons.family = 'manga'
  icons.editedFields = ['family']
  const sparseFamilyCss = compileThemeProject(project)
  expect(sparseFamilyCss).toContain('Composer icon family · manga')

  const customSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16" stroke="white"/></svg>'
  icons.family = 'native'
  icons.customIcons = { home: customSvg }
  icons.editedFields = ['customIcons.home']
  const customCss = compileThemeProject(project)
  expect(customCss).toContain('Composer icon family · native + saved overrides')
  expect(customCss).toContain('[data-composer-action="home"][data-toolbar-action="home"] > button::before')
  expect(customCss).not.toContain('[data-composer-action="guides"][data-toolbar-action="guides"] > button::before')

  icons.family = 'native'
  icons.customIcons = {}
  icons.editedFields = undefined
  const nativeCss = compileThemeProject(project)
  expect(nativeCss).not.toContain('Composer icon family ·')
})

test('Composer Icons can target one stable composer action without restyling its siblings', () => {
  const project = createProject('One composer action')
  const icons = createStylePacket('composer-icons')
  if (icons.type !== 'composer-icons') throw new Error('expected composer icons')
  icons.family = 'journal'
  project.componentOverrides.push({
    id: 'composer-home-only',
    target: { selector: '[data-component="InputArea"] [data-composer-action="home"][data-toolbar-action="home"]', strategy: 'studio-registry', stability: 'high', persistence: 'persistent', source: 'dom-scoped', label: 'Home composer action' },
    states: { normal: [icons] },
  })
  const css = compileThemeProject(project)
  expect(css).toContain('[data-composer-action="home"][data-toolbar-action="home"] > button::before')
  expect(css).not.toContain('[data-composer-action="regen"][data-toolbar-action="regen"] > button::before')
  expect(css).not.toContain('[data-composer-action="home"][data-toolbar-action="home"] [data-composer-action="home"]')
})

test('SVG Asset compiles a sanitized saved SVG snapshot for decorative pseudo surfaces', () => {
  const project = createProject('SVG ornament')
  const svg = createStylePacket('svg-asset')
  if (svg.type !== 'svg-asset') throw new Error('expected SVG asset')
  svg.svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2 22 22H2Z"/></svg>'
  svg.renderMode = 'mask'
  svg.color = '#ff00aa'
  project.componentOverrides.push({
    id: 'svg-after',
    target: { selector: '[data-component="BubbleMessage"]::after', strategy: 'studio-registry', stability: 'high', persistence: 'persistent', source: 'native-aware', label: 'Bubble front ornament' },
    states: { normal: [svg] },
  })
  const css = compileThemeProject(project)
  expect(css).toContain('content: "";')
  expect(css).toContain('-webkit-mask-image: url("data:image/svg+xml,')
  expect(css).toContain('background-color: #ff00aa;')


})

test('SVG / Icon replaces a discovered nested SVG without replacing the native button box', () => {
  const project = createProject('Nested icon replacement')
  const svg = createStylePacket('svg-asset')
  if (svg.type !== 'svg-asset') throw new Error('expected SVG asset')
  svg.targetMode = 'replace'
  svg.svgPath = '> span > svg'
  svg.svgLabel = 'Send icon'
  svg.svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M3 12 21 3l-6 18-4-7z"/></svg>'
  svg.renderMode = 'mask'
  svg.colorMode = 'inherit'
  svg.alpha = .75
  svg.size = 18
  svg.rotate = -12
  project.componentOverrides.push(override('[data-component="InputArea"] button[class*="_sendBtn_"]', { normal: [svg] }))
  const css = compileThemeProject(project)
  expect(css).toContain('SVG/Icon replacement · Send icon')
  expect(css).toContain('[data-component="InputArea"] button[class*="_sendBtn_"] > span > svg')
  expect(css).toContain('-webkit-mask-image: url("data:image/svg+xml,')
  expect(css).toContain('background-color: color-mix(in srgb, currentColor 75%, transparent);')
  expect(css).toContain('width: 18px;')
  expect(css).toContain('height: 18px;')
  expect(css).toContain('rotate: -12deg;')
  expect(css).toContain('> span > svg *')
  expect(css).toContain('opacity: 0;')
  expect(css).not.toContain('[data-component="InputArea"] button[class*="_sendBtn_"] {\n  -webkit-mask-image:')
})

test('SVG / Icon preserve-colors mode paints the nested SVG box with the saved SVG image', () => {
  const project = createProject('Full color icon replacement')
  const svg = createStylePacket('svg-asset')
  if (svg.type !== 'svg-asset') throw new Error('expected SVG asset')
  svg.targetMode = 'replace'
  svg.svgPath = 'svg'
  svg.svgLabel = 'All SVGs'
  svg.svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ff4aa2" d="M2 2h20v20H2z"/></svg>'
  svg.renderMode = 'image'
  project.componentOverrides.push(override('.toolbar', { normal: [svg] }))
  const css = compileThemeProject(project)
  expect(css).toContain('.toolbar svg')
  expect(css).toContain('background-image: url("data:image/svg+xml,')
  expect(css).toContain('-webkit-mask-image: none;')
  expect(css).toContain('mask-image: none;')
})



test('Mobile pseudo scaffolding inherits Base anchored positioning instead of resetting inset', () => {
  const project = createProject('Responsive pseudo inheritance')
  const basePosition = createStylePacket('position'); if (basePosition.type !== 'position') throw new Error()
  basePosition.mode = 'anchored'; basePosition.bottom = -5; basePosition.left = 0
  const baseSize = createStylePacket('size'); if (baseSize.type !== 'size') throw new Error()
  baseSize.width = { mode: 'parent' }; baseSize.height = { mode: 'fixed', value: 64, unit: 'px' }
  const mobileBackground = createStylePacket('background'); if (mobileBackground.type !== 'background') throw new Error()
  mobileBackground.mode = 'solid'; mobileBackground.solid = { color: '#ffffff', alpha: 1 }
  const mobileSize = createStylePacket('size'); if (mobileSize.type !== 'size') throw new Error()
  mobileSize.width = { mode: 'parent' }; mobileSize.height = { mode: 'fixed', value: 64, unit: 'px' }
  const responsivePseudo = override('[data-component="BubbleMessage"] [class*="_content_"]::after', { normal: [basePosition, baseSize] })
  responsivePseudo.mobileStates = { normal: [mobileBackground, mobileSize] }
  project.componentOverrides.push(responsivePseudo)
  const css = compileThemeProject(project)
  const mobile = css.split('/* Scope · Mobile ≤ 720px */')[1] ?? ''
  expect(mobile).toContain('inset: auto')
  expect(mobile).not.toContain('inset: 0;')
})
