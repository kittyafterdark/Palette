import { describe, expect, test } from 'bun:test'
import { createInitialState, createStylePacket, normalizeComposerSvgSource, normalizeSvgTargetPath } from '../src/project/model'
import { normalizeState } from '../src/project/migrations'
import { ProjectStore } from '../src/project/store'
import { BUILTIN_ORNAMENTS } from '../src/presets/ornaments'

describe('Phase Three persistence and migrations', () => {
  test('schema v43 SVG target paths stay structural instead of becoming arbitrary selectors', () => {
    expect(normalizeSvgTargetPath(':self')).toBe(':self')
    expect(normalizeSvgTargetPath('> span > svg:nth-of-type(2)')).toBe('> span > svg:nth-of-type(2)')
    expect(normalizeSvgTargetPath('svg')).toBe('svg')
    expect(normalizeSvgTargetPath('> svg { color: red }')).toBeUndefined()
    expect(normalizeSvgTargetPath('> span, body > svg')).toBeUndefined()
    expect(normalizeSvgTargetPath('> span > svg:nth-of-type(0)')).toBeUndefined()
  })

  test('round-trips state stacks, fonts, Boost and DOM-only targets', () => {
    const state = createInitialState(); const project = state.projects[0]
    project.componentOverrides.push({ id: 'dom', target: { selector: '.widget', strategy: 'exact-class', stability: 'low', persistence: 'persistent', source: 'dom-scoped', label: 'div · widget' }, states: { normal: [createStylePacket('background'), createStylePacket('layout')], hover: [createStylePacket('shadow')] } })
    project.fonts.push({ id: 'font', family: 'Alike Angular', source: { type: 'theme-asset', path: './assets/alike.woff2' }, weight: 400, style: 'normal', display: 'swap' })
    project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.typographyEnabled = true; project.boost.legacyPalette = { surface: { color: '#18151f', alpha: 0.9 } }; project.boost.typography.fontFamily = 'Alike Angular'
    const restored = normalizeState(JSON.parse(JSON.stringify(state))); const override = restored.projects[0].componentOverrides[0]
    expect(override.target.source).toBe('dom-scoped'); expect(override.states.normal.map((packet) => packet.type)).toEqual(['background', 'layout']); expect(override.states.hover?.[0].type).toBe('shadow')
    expect(restored.projects[0].fonts[0].source.path).toBe('./assets/alike.woff2'); expect(restored.projects[0].boost.legacyPalette?.surface?.alpha).toBe(0.9)
  })

  test('migrates a Phase Two target and packets into target metadata plus states.normal', () => {
    const phaseTwo = { version: 2, activeProjectId: 'p', projects: [{ version: 2, id: 'p', name: 'Old', tokens: [], customCss: '', assets: [], createdAt: 1, updatedAt: 2, componentOverrides: [{ id: 'o', componentId: 'BubbleMessage', nativeComponentId: 'BubbleMessage', selector: '[data-component="BubbleMessage"] [class*="_nameChar_"]', selectorStrategy: 'css-module', packets: [{ id: 't', type: 'text', color: '#ffffff', alpha: 0.5, fontSize: 15, fontSizeUnit: 'px' }, { id: 'b', type: 'background', mode: 'gradient', solid: { color: '#111111', alpha: 1 }, gradient: { type: 'linear', angle: 90, stops: [{ color: '#111111', position: 0 }, { color: '#eeeeee', position: 100 }] } }] }] }] }
    const restored = normalizeState(phaseTwo); const override = restored.projects[0].componentOverrides[0]
    expect(override.target.selector).toBe('[data-component="BubbleMessage"] [class*="_nameChar_"]'); expect(override.target.source).toBe('native-aware')
    expect(override.states.normal.map((packet) => packet.type)).toEqual(['text', 'typography', 'background'])
    const text = override.states.normal[0]; if (text.type !== 'text') throw new Error(); expect(text.solid).toEqual({ color: '#ffffff', alpha: 0.5 })
    const typography = override.states.normal[1]; if (typography.type !== 'typography') throw new Error(); expect(typography.fontSize).toBe(15)
    const background = override.states.normal[2]; if (background.type !== 'background') throw new Error(); expect(background.gradient.stops.map((stop) => stop.alpha)).toEqual([1, 1])
  })

  test('migrates Phase Four dimensions and palette without losing intent', () => {
    const old = { version: 4, activeProjectId: 'p', projects: [{ version: 4, id: 'p', name: 'Phase Four', tokens: [], componentOverrides: [{ id: 'o', target: { selector: '.card', strategy: 'exact-class', stability: 'low', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [{ id: 's', type: 'size', width: { mode: 'auto' }, height: { mode: 'fill' }, maxWidth: { mode: 'fit' } }] } }], customCss: '', assets: [], fonts: [], presets: [], boost: { palette: { primary: { color: '#ff0000', alpha: .8 }, surface: { color: '#111111', alpha: 1 } }, typography: { fontFamily: 'Verdana' }, smartInvert: { enabled: true, strength: 1, preserveAccents: true, preserveMedia: true } }, createdAt: 1, updatedAt: 2 }] }
    const project = normalizeState(old).projects[0], size = project.componentOverrides[0].states.normal[0]
    expect(project.boost.enabled).toBe(true); expect(project.boost.mode).toBe('smart-invert'); expect(project.boost.primary).toEqual({ color: '#ff0000', alpha: .8 }); expect(project.boost.legacyPalette?.surface?.color).toBe('#111111')
    expect(size.type === 'size' && [size.width?.mode, size.height?.mode, size.maxWidth?.mode]).toEqual(['native', 'parent', 'content'])
  })

  test('preserves sparse Read Style ownership metadata', () => {
    const state = createInitialState(); const project = state.projects[0]
    const typography = createStylePacket('typography'); if (typography.type !== 'typography') throw new Error()
    typography.fontFamily = 'Georgia'; typography.fontSize = 42; typography.editedFields = ['fontSize']
    project.componentOverrides.push({ id: 'lazy', target: { selector: 'h1', strategy: 'structural', stability: 'medium', persistence: 'persistent', source: 'dom-scoped', overrideStrength: 'strong' }, states: { normal: [typography] } })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    expect(packet.editedFields).toEqual(['fontSize'])
  })


  test('repairs v27.5 sparse border color edits that inherited a fully transparent observed alpha', () => {
    const old = { version: 18, activeProjectId: 'p', projects: [{ version: 18, id: 'p', name: 'Persona row', tokens: [], componentOverrides: [{ id: 'row', target: { selector: '[class*="_rowActive_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Row Active', nativeComponentId: 'mounted:PersonaCard' }, states: { normal: [{ id: 'b', type: 'border', width: 20, style: 'solid', color: '#4dd1db', alpha: 0, editedFields: ['width', 'color'] }] } }], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old)
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    if (packet.type !== 'border') throw new Error()
    expect(packet.alpha).toBe(1)
    expect(packet.editedFields).toContain('alpha')
    expect(restored.version).toBe(43)
  })

  test('persists Image full-source quality through schema v21', () => {
    const state = createInitialState(); const project = state.projects[0]
    const image = createStylePacket('image'); if (image.type !== 'image') throw new Error()
    image.sourceQuality = 'full'; image.editedFields = ['sourceQuality']
    project.componentOverrides.push({ id: 'avatar-image', target: { selector: '.avatar img', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [image] } })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    if (packet.type !== 'image') throw new Error()
    expect(packet.sourceQuality).toBe('full')
    expect(packet.editedFields).toContain('sourceQuality')
    expect(restored.version).toBe(43)
  })

  test('schema v28 persists Background Stencil intent and defaults old images to normal rendering', () => {
    const state = createInitialState(); const project = state.projects[0]
    const stencil = createStylePacket('background'); if (stencil.type !== 'background') throw new Error()
    stencil.mode = 'image'; stencil.image.assetPath = './assets/mark.svg'; stencil.image.renderMode = 'mask'; stencil.image.maskColor = '#92a6b3'; stencil.image.maskAlpha = .75; stencil.image.hideContents = true
    project.componentOverrides.push({ id: 'stencil', target: { selector: '.brain', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [stencil] } })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    if (packet.type !== 'background') throw new Error()
    expect(restored.version).toBe(43)
    expect(packet.image).toMatchObject({ renderMode: 'mask', maskColor: '#92a6b3', maskAlpha: .75, hideContents: true })

    const legacy = normalizeState({ version: 27, activeProjectId: 'old', projects: [{ ...structuredClone(project), version: 27, id: 'old', componentOverrides: [{ ...project.componentOverrides[0], states: { normal: [{ ...stencil, image: { assetPath: './assets/legacy.png', size: 'cover', positionX: 50, positionY: 50, repeat: 'no-repeat' } }] } }] }] })
    const legacyPacket = legacy.projects[0].componentOverrides[0].states.normal[0]
    if (legacyPacket.type !== 'background') throw new Error()
    expect(legacyPacket.image.renderMode).toBe('image')
    expect(legacyPacket.image.hideContents).toBe(false)
  })

  test('schema v29 persists Transform intent and normalizes safe bounds', () => {
    const state = createInitialState(); const project = state.projects[0]
    const transform = createStylePacket('transform'); if (transform.type !== 'transform') throw new Error()
    transform.rotate = -4.5; transform.scaleLinked = false; transform.scaleX = 1.08; transform.scaleY = .92; transform.skewX = 7; transform.skewY = -2
    project.componentOverrides.push({ id: 'tilt', target: { selector: '.polaroid', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [transform] } })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    if (packet.type !== 'transform') throw new Error()
    expect(restored.version).toBe(43)
    expect(packet).toMatchObject({ rotate: -4.5, scaleLinked: false, scaleX: 1.08, scaleY: .92, skewX: 7, skewY: -2 })
  })

  test('schema v31 persists literal Generated Content intent', () => {
    const state = createInitialState(); const project = state.projects[0]
    const content = createStylePacket('content'); if (content.type !== 'content') throw new Error()
    content.value = 'PRIVATE NOTE'; content.editedFields = ['value']
    project.componentOverrides.push({ id: 'caption', target: { selector: '.note::before', strategy: 'structural', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [content] } })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    if (packet.type !== 'content') throw new Error()
    expect(restored.version).toBe(43)
    expect(restored.projects[0].version).toBe(43)
    expect(packet.value).toBe('PRIVATE NOTE')
    expect(packet.editedFields).toEqual(['value'])
  })

  test('schema v32 persists Layout Contents intent', () => {
    const state = createInitialState(); const project = state.projects[0]
    const layout = createStylePacket('layout'); if (layout.type !== 'layout') throw new Error()
    layout.display = 'contents'
    project.componentOverrides.push({ id: 'dissolve', target: { selector: '.wrapper', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [layout] } })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    if (packet.type !== 'layout') throw new Error()
    expect(restored.version).toBe(43)
    expect(packet.display).toBe('contents')
  })

  test('schema v40 persists Quick Align placement intent', () => {
    const state = createInitialState(); const project = state.projects[0]
    const placement = createStylePacket('placement'); if (placement.type !== 'placement') throw new Error()
    placement.horizontal = 'end'; placement.vertical = 'center'; placement.editedFields = ['horizontal', 'vertical']
    project.componentOverrides.push({ id: 'place', target: { selector: '.identity', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [placement] } })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    if (packet.type !== 'placement') throw new Error()
    expect(restored.version).toBe(43)
    expect(restored.projects[0].version).toBe(43)
    expect(packet).toMatchObject({ horizontal: 'end', vertical: 'center', editedFields: ['horizontal', 'vertical'] })
  })

  test('schema v41 Text Entry intent survives normalization into v43', () => {
    const state = createInitialState(); const project = state.projects[0]
    const entry = createStylePacket('text-entry'); if (entry.type !== 'text-entry') throw new Error()
    entry.insetX = 14; entry.insetY = 9; entry.fontFamily = 'Georgia'; entry.fontSize = 16; entry.lineHeight = 1.52; entry.placeholderColor = '#665f62'; entry.placeholderAlpha = .62; entry.placeholderStyle = 'italic'
    project.componentOverrides.push({ id: 'composer-entry', target: { selector: '[data-component="InputArea"] textarea[name="chat-message"]', strategy: 'studio-registry', stability: 'high', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [entry] } })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const packet = restored.projects[0].componentOverrides[0].states.normal[0]
    if (packet.type !== 'text-entry') throw new Error()
    expect(restored.version).toBe(43)
    expect(restored.projects[0].version).toBe(43)
    expect(packet).toMatchObject({ insetX: 14, insetY: 9, fontFamily: 'Georgia', fontSize: 16, lineHeight: 1.52, placeholderColor: '#665f62', placeholderAlpha: .62, placeholderStyle: 'italic' })
  })

  test('falls back safely for invalid persisted state', () => { const restored = normalizeState({ projects: [] }); expect(restored.projects).toHaveLength(1) })

  test('round-trips v15 mobile responsive state separately from base state', () => {
    const state = createInitialState(); const project = state.projects[0]
    const base = createStylePacket('typography'); if (base.type !== 'typography') throw new Error()
    base.fontSize = 34
    const mobile = createStylePacket('typography'); if (mobile.type !== 'typography') throw new Error()
    mobile.fontSize = 24; mobile.editedFields = ['fontSize']
    project.componentOverrides.push({
      id: 'responsive',
      target: { selector: 'h1', strategy: 'structural', stability: 'medium', persistence: 'persistent', source: 'dom-scoped', overrideStrength: 'strong' },
      states: { normal: [base] },
      mobileStates: { normal: [mobile] },
    })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    const restoredOverride = restored.projects[0].componentOverrides[0]
    expect(restored.version).toBe(43)
    expect(restored.projects[0].version).toBe(43)
    expect(restoredOverride.states.normal[0].type).toBe('typography')
    expect(restoredOverride.mobileStates?.normal[0].type).toBe('typography')
    expect(restoredOverride.mobileStates?.normal[0].editedFields).toEqual(['fontSize'])
  })

  test('repairs legacy message-local CSS-module overrides that leaked outside their native component', () => {
    const old = { version: 14, activeProjectId: 'p', projects: [{ version: 14, id: 'p', name: 'Scoped', tokens: [], componentOverrides: [{ id: 'avatar', target: { selector: '[class*="_avatar_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Avatar · Ancestor', nativeComponentId: 'src/components/chat/MinimalMessage' }, states: { normal: [{ id: 's', type: 'size', width: { mode: 'fixed', value: 18, unit: '%' }, height: { mode: 'fixed', value: 47, unit: 'vh' } }] } }], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old)
    expect(restored.projects[0].componentOverrides[0].target.selector).toBe('[data-component="MinimalMessage"] [class*="_avatar_"]')
  })

  test('repairs stranded schema-v15 message selectors instead of trusting the version stamp', () => {
    const old = { version: 15, activeProjectId: 'p', projects: [{ version: 15, id: 'p', name: 'Still leaked', tokens: [], componentOverrides: [{ id: 'avatar', target: { selector: '[class*="_avatar_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Avatar · Ancestor', nativeComponentId: 'mounted:MinimalMessage' }, states: { normal: [{ id: 's', type: 'size', width: { mode: 'fixed', value: 18, unit: '%' }, height: { mode: 'fixed', value: 47, unit: 'vh' } }] } }], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old)
    expect(restored.version).toBe(43)
    expect(restored.projects[0].componentOverrides[0].target.selector).toBe('[data-component="MinimalMessage"] [class*="_avatar_"]')
  })

  test('keeps repairing the message-scope invariant even on current-version imported state', () => {
    const current = { version: 16, activeProjectId: 'p', projects: [{ version: 16, id: 'p', name: 'Imported leak', tokens: [], componentOverrides: [{ id: 'avatar', target: { selector: '[class*="_avatar_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Avatar in MinimalMessage', nativeComponentId: 'mounted:MinimalMessage' }, states: { normal: [] } }], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(current)
    expect(restored.projects[0].componentOverrides[0].target.selector).toBe('[data-component="MinimalMessage"] [class*="_avatar_"]')
  })

  test('repairs only bare branches in a mixed message selector list', () => {
    const old = { version: 15, activeProjectId: 'p', projects: [{ version: 15, id: 'p', name: 'Mixed', tokens: [], componentOverrides: [{ id: 'avatar', target: { selector: '[data-component="MinimalMessage"] [class*="_name_"] , [class*="_avatar_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Avatar · Ancestor', nativeComponentId: 'mounted:MinimalMessage' }, states: { normal: [] } }], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old)
    expect(restored.projects[0].componentOverrides[0].target.selector).toBe('[data-component="MinimalMessage"] [class*="_name_"],\n[data-component="MinimalMessage"] [class*="_avatar_"]')
  })

  test('preserves explicitly broad legacy message selectors', () => {
    const old = { version: 14, activeProjectId: 'p', projects: [{ version: 14, id: 'p', name: 'Broad', tokens: [], componentOverrides: [{ id: 'avatar', target: { selector: '[class*="_avatar_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Similar avatar elements everywhere', nativeComponentId: 'src/components/chat/MinimalMessage' }, states: { normal: [] } }], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old)
    expect(restored.projects[0].componentOverrides[0].target.selector).toBe('[class*="_avatar_"]')
  })

  test('recovers a message-local orphan after an older save already discarded its native ownership metadata', () => {
    const old = { version: 16, activeProjectId: 'p', projects: [{ version: 16, id: 'p', name: 'Metadata casualty', tokens: [], componentOverrides: [
      { id: 'name', target: { selector: '[data-component="MinimalMessage"] [class*="_name_"]', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Name in MinimalMessage', nativeComponentId: 'mounted:MinimalMessage', nativeContextSelector: '[data-component="MinimalMessage"]', localSelector: '[class*="_name_"]' }, states: { normal: [] } },
      { id: 'avatar', target: { selector: '[class*="_avatar_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'dom-scoped', label: 'Avatar · Ancestor' }, states: { normal: [{ id: 's', type: 'size', width: { mode: 'fixed', value: 18, unit: '%' }, height: { mode: 'fixed', value: 47, unit: 'vh' } }] } },
    ], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old), avatar = restored.projects[0].componentOverrides.find((entry) => entry.id === 'avatar')!
    expect(avatar.target.selector).toBe('[data-component="MinimalMessage"] [class*="_avatar_"]')
    expect(avatar.target.source).toBe('native-aware')
    expect(avatar.target.nativeContextSelector).toBe('[data-component="MinimalMessage"]')
  })

  test('does not guess an orphan message family when a project intentionally styles both message layouts', () => {
    const old = { version: 16, activeProjectId: 'p', projects: [{ version: 16, id: 'p', name: 'Both layouts', tokens: [], componentOverrides: [
      { id: 'bubble', target: { selector: '[data-component="BubbleMessage"] [class*="_name_"]', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Name in BubbleMessage', nativeComponentId: 'mounted:BubbleMessage' }, states: { normal: [] } },
      { id: 'minimal', target: { selector: '[data-component="MinimalMessage"] [class*="_name_"]', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Name in MinimalMessage', nativeComponentId: 'mounted:MinimalMessage' }, states: { normal: [] } },
      { id: 'avatar', target: { selector: '[class*="_avatar_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'dom-scoped', label: 'Avatar · Ancestor' }, states: { normal: [] } },
    ], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old), avatar = restored.projects[0].componentOverrides.find((entry) => entry.id === 'avatar')!
    expect(avatar.target.selector).toBe('[class*="_avatar_"]')
    expect(avatar.target.source).toBe('dom-scoped')
  })


  test('v17 scope-quarantine overreach does not rehome unrelated native targets into MinimalMessage', () => {
    const old = { version: 17, activeProjectId: 'p', projects: [{ version: 17, id: 'p', name: 'Mixed native', tokens: [], componentOverrides: [
      { id: 'name', target: { selector: '[data-component="MinimalMessage"] [class*="_name_"]', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Name in MinimalMessage', nativeComponentId: 'mounted:MinimalMessage', nativeContextSelector: '[data-component="MinimalMessage"]', localSelector: '[class*="_name_"]' }, states: { normal: [] } },
      { id: 'bar', target: { selector: '[class*="_barWrapper_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Bar Wrapper · Ancestor', nativeComponentId: 'src/components/chat/ChatView' }, states: { normal: [] } },
    ], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old), bar = restored.projects[0].componentOverrides.find((entry) => entry.id === 'bar')!
    expect(bar.target.selector).toBe('[class*="_barWrapper_"]')
    expect(bar.target.nativeComponentId).toBe('src/components/chat/ChatView')
  })

  test('repairs v27.4 message-root contamination when native ownership contradicts the injected root', () => {
    const old = { version: 17, activeProjectId: 'p', projects: [{ version: 17, id: 'p', name: 'V27.4 contamination', tokens: [], componentOverrides: [
      { id: 'name', target: { selector: '[data-component="MinimalMessage"] [class*="_name_"]', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Name in MinimalMessage', nativeComponentId: 'mounted:MinimalMessage', nativeContextSelector: '[data-component="MinimalMessage"]', localSelector: '[class*="_name_"]' }, states: { normal: [] } },
      { id: 'toolbar', target: { selector: '[data-component="MinimalMessage"] [class*="_chatToolbar_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Chat Toolbar · Ancestor', nativeComponentId: 'src/components/chat/ChatView', nativeContextSelector: '[data-component="MinimalMessage"]', localSelector: '[class*="_chatToolbar_"]' }, states: { normal: [] } },
    ], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old), toolbar = restored.projects[0].componentOverrides.find((entry) => entry.id === 'toolbar')!
    expect(toolbar.target.selector).toBe('[class*="_chatToolbar_"]')
    expect(toolbar.target.nativeContextSelector).toBeUndefined()
    expect(toolbar.target.nativeComponentId).toBe('src/components/chat/ChatView')
  })

  test('repairs an App image target whose complete contextual selector was prefixed twice', () => {
    const old = { version: 21, activeProjectId: 'p', projects: [{ version: 21, id: 'p', name: 'Image context echo', tokens: [], componentOverrides: [
      { id: 'image', target: { selector: '[class*="_app_"] [class*="_app_"] [class*="_avatar_"] img', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'img in App', nativeComponentId: 'src/App', nativeContextSelector: '[class*="_app_"]', localSelector: '[class*="_avatar_"] img' }, states: { normal: [{ id: 'i', type: 'image', brightness: 1, saturation: 1, contrast: 1, grayscale: 0, hueRotate: 0, blur: 0, sourceQuality: 'full', objectFit: 'cover', objectPositionX: 50, objectPositionY: 50, fillFrame: false, offsetX: 0, offsetY: 0, fade: { direction: 'top', amount: 31 } }] } },
    ], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old), image = restored.projects[0].componentOverrides[0]
    expect(image.target.selector).toBe('[class*="_app_"] [class*="_avatar_"] img')
    expect(image.states.normal.map((packet) => packet.type)).toEqual(['image', 'mask'])
    const migratedImage = image.states.normal.find((packet) => packet.type === 'image')
    const migratedMask = image.states.normal.find((packet) => packet.type === 'mask')
    expect(migratedImage?.type === 'image' && migratedImage.sourceQuality).toBe('full')
    expect(migratedMask?.type === 'mask' && migratedMask.maskMode).toBe('fade')
    expect(migratedMask?.type === 'mask' && migratedMask.fade).toEqual({ direction: 'top', amount: 31 })
    expect(restored.version).toBe(43)
  })

  test('schema v42 promotes a legacy mask-only Image packet to Mask without leaving an empty Image card', () => {
    const old = { version: 41, activeProjectId: 'p', projects: [{ version: 41, id: 'p', name: 'Mask-only wrapper', tokens: [], componentOverrides: [
      { id: 'wrapper', target: { selector: '.avatar-wrap', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [{ id: 'mask-in-image', type: 'image', brightness: 1, saturation: 1, contrast: 1, grayscale: 0, hueRotate: 0, blur: 0, sourceQuality: 'native', objectFit: 'native', objectPositionX: 50, objectPositionY: 50, fillFrame: false, offsetX: 0, offsetY: 0, maskMode: 'fade', fade: { direction: 'bottom', amount: 44 }, editedFields: ['maskMode', 'fade.direction', 'fade.amount'] }] } },
    ], layoutGroups: [], recipeSlots: [], customCss: '', assets: [], fonts: [], presets: [], svgAssets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old)
    const packets = restored.projects[0].componentOverrides[0].states.normal
    expect(packets.map((packet) => packet.type)).toEqual(['mask'])
    const mask = packets[0]
    expect(mask.type === 'mask' && mask.fade).toEqual({ direction: 'bottom', amount: 44 })
    expect(mask.editedFields).toEqual(['maskMode', 'fade.direction', 'fade.amount'])
  })

  test('schema v42 splits legacy Image recipe provenance into Image + Mask sibling slots', () => {
    const target = { selector: '.avatar img', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }
    const old = { version: 41, activeProjectId: 'p', projects: [{ version: 41, id: 'p', name: 'Legacy image recipe', tokens: [], componentOverrides: [], layoutGroups: [], recipeSlots: [
      { id: 'slot-image', target, type: 'image', scope: 'base', layers: [{ presetId: 'avatar-soft-fade', packet: { id: 'image-layer', type: 'image', brightness: .9, saturation: .8, contrast: 1.1, grayscale: 0, hueRotate: 0, blur: 0, sourceQuality: 'auto', objectFit: 'cover', objectPositionX: 50, objectPositionY: 50, fillFrame: true, offsetX: 0, offsetY: 0, maskMode: 'fade', fade: { direction: 'bottom', amount: 52 } } }] },
    ], customCss: '', assets: [], fonts: [], presets: [], svgAssets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old)
    expect(restored.version).toBe(43)
    expect(restored.projects[0].recipeSlots.map((slot) => slot.type)).toEqual(['image', 'mask'])
    const imageSlot = restored.projects[0].recipeSlots.find((slot) => slot.type === 'image')
    const maskSlot = restored.projects[0].recipeSlots.find((slot) => slot.type === 'mask')
    expect(imageSlot?.layers[0].packet.type).toBe('image')
    expect(maskSlot?.layers[0].packet.type).toBe('mask')
    expect(maskSlot?.layers[0].packet.type === 'mask' && maskSlot.layers[0].packet.fade).toEqual({ direction: 'bottom', amount: 52 })
  })

  test('repairs a redundantly rooted native part when saved context/local metadata proves the duplicate', () => {
    const old = { version: 19, activeProjectId: 'p', projects: [{ version: 19, id: 'p', name: 'Selector echo', tokens: [], componentOverrides: [
      { id: 'desc', target: { selector: '[class*="_row_"] [class*="_row_"] [class*="_desc_"]', strategy: 'native-context-local', stability: 'medium', persistence: 'persistent', source: 'native-aware', label: 'Desc', nativeComponentId: 'src/components/ui/Badge', nativeContextSelector: '[class*="_row_"]', localSelector: '[class*="_row_"] [class*="_desc_"]' }, states: { normal: [{ id: 'v', type: 'visibility', mode: 'gone' }] } },
    ], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(old), desc = restored.projects[0].componentOverrides[0]
    expect(desc.target.selector).toBe('[class*="_row_"] [class*="_desc_"]')
    expect(restored.version).toBe(43)
  })

  test('persists recipe layer ownership so pack reset survives reloads', () => {
    const state = createInitialState(); const project = state.projects[0]
    const target = { selector: '[data-component="BubbleMessage"] [class*="_name_"]', strategy: 'native-context-local' as const, stability: 'high' as const, persistence: 'persistent' as const, source: 'native-aware' as const, label: 'Name', nativeComponentId: 'mounted:BubbleMessage', nativeContextSelector: '[data-component="BubbleMessage"]', localSelector: '[class*="_name_"]' }
    const base = createStylePacket('text'); const layer = createStylePacket('text')
    if (base.type !== 'text' || layer.type !== 'text') throw new Error()
    base.solid.color = '#ffffff'; layer.solid.color = '#ff66cc'
    project.recipeSlots.push({ id: 'slot', target, type: 'text', scope: 'base', base, layers: [{ presetId: 'editorial-byline', packet: layer }] })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    expect(restored.projects[0].recipeSlots).toHaveLength(1)
    expect(restored.projects[0].recipeSlots[0].layers[0].presetId).toBe('editorial-byline')
    expect(restored.projects[0].recipeSlots[0].layers[0].packet.type).toBe('text')
    expect(restored.version).toBe(43)
  })


  test('normalizes legacy recipe provenance to Base and preserves Mobile recipe ownership', () => {
    const legacy = { version: 26, activeProjectId: 'p', projects: [{ version: 26, id: 'p', name: 'Responsive provenance', tokens: [], componentOverrides: [], layoutGroups: [], recipeSlots: [
      { id: 'base-slot', target: { selector: '.lead', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, type: 'typography', base: null, layers: [{ presetId: 'editorial-feature-lead', packet: { ...createStylePacket('typography'), fontSize: 32 } }] },
      { id: 'mobile-slot', target: { selector: '.lead', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, type: 'typography', scope: 'mobile', base: null, layers: [{ presetId: 'editorial-feature-lead', packet: { ...createStylePacket('typography'), fontSize: 24, editedFields: ['fontSize'] } }] },
    ], customCss: '', assets: [], fonts: [], presets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(legacy)
    expect(restored.version).toBe(43)
    expect(restored.projects[0].recipeSlots.map((slot) => slot.scope)).toEqual(['base', 'mobile'])
    expect(restored.projects[0].recipeSlots[1].layers[0].packet.editedFields).toEqual(['fontSize'])
  })

  test('schema v35 promotes the saved SVG wardrobe to project-wide assets and sanitizes stored SVGs', () => {
    const state = createInitialState(); const project = state.projects[0]
    project.svgAssets.push({ id: 'svg-safe', name: 'Tiny star', svg: '<svg viewBox="0 0 24 24"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/></svg>', createdAt: 1 })
    const restored = normalizeState(JSON.parse(JSON.stringify(state)))
    expect(restored.version).toBe(43); expect(restored.projects[0].version).toBe(43)
    expect(restored.projects[0].svgAssets).toHaveLength(1)
    expect(restored.projects[0].svgAssets[0].name).toBe('Tiny star')
    expect(normalizeComposerSvgSource('<svg><script>alert(1)</script><path onclick="x()" d="M0 0h1v1z"/></svg>')).toBe('<svg><path d="M0 0h1v1z"/></svg>')
    expect(normalizeComposerSvgSource('<svg><image href="https://example.com/a.png"/></svg>')).toBe('<svg></svg>')
    expect(normalizeComposerSvgSource('<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">\n<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>')).toBe('<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>')
    expect(normalizeComposerSvgSource('<div>nope</div>')).toBeNull()
  })


  test('schema v43 persists generic SVG/Icon replacement targeting and built-in SVG snapshots', () => {
    const builtIn = BUILTIN_ORNAMENTS.find((entry) => entry.id === 'vn-arrow-right')
    if (!builtIn) throw new Error('missing built-in SVG')
    expect(normalizeComposerSvgSource(builtIn.svg)).toBe(builtIn.svg)
    const legacy = { version: 42, activeProjectId: 'p', projects: [{ version: 42, id: 'p', name: 'SVG replacement', tokens: [], componentOverrides: [
      { id: 'send', target: { selector: '[data-component="InputArea"] button[class*="_sendBtn_"]', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'dom-scoped', label: 'Send' }, states: { normal: [{ id: 'svg', type: 'svg-asset', svg: builtIn.svg, assetId: `builtin:${builtIn.id}`, assetName: builtIn.label, targetMode: 'replace', svgPath: '> span > svg', svgLabel: 'Send icon', renderMode: 'mask', colorMode: 'inherit', color: '#ffffff', alpha: .82, fit: 'contain', positionX: 50, positionY: 50, size: 18, rotate: -7 }] } },
    ], layoutGroups: [], recipeSlots: [], customCss: '', assets: [], fonts: [], presets: [], svgAssets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(legacy)
    expect(restored.version).toBe(43)
    expect(restored.projects[0].version).toBe(43)
    const packet = restored.projects[0].componentOverrides[0].states.normal?.[0]
    expect(packet?.type).toBe('svg-asset')
    if (!packet || packet.type !== 'svg-asset') throw new Error('expected SVG/Icon packet')
    expect(packet).toMatchObject({ targetMode: 'replace', svgPath: '> span > svg', svgLabel: 'Send icon', renderMode: 'mask', colorMode: 'inherit', alpha: .82, size: 18, rotate: -7 })
    expect(packet.assetId).toBe('builtin:vn-arrow-right')
  })

  test('schema v36 preserves Media Flow recipe provenance', () => {
    const flow = createStylePacket('media-flow'); if (flow.type !== 'media-flow') throw new Error()
    flow.mode = 'full'; flow.unclipped = true
    const legacy = { version: 35, activeProjectId: 'p', projects: [{ version: 35, id: 'p', name: 'Media', tokens: [], componentOverrides: [], layoutGroups: [], recipeSlots: [
      { id: 'media-slot', target: { selector: '[data-component="MessageContent"] img', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, type: 'media-flow', base: null, layers: [{ presetId: 'manga-media-panel', packet: flow }] },
    ], customCss: '', assets: [], fonts: [], presets: [], svgAssets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(legacy)
    expect(restored.version).toBe(43)
    const slot = restored.projects[0].recipeSlots[0]
    expect(slot?.type).toBe('media-flow')
    expect(slot?.layers[0].packet.type).toBe('media-flow')
    expect(slot?.layers[0].packet.type === 'media-flow' && slot.layers[0].packet.mode).toBe('full')
  })

  test('schema v37 preserves legacy forced fill while new Text packets default to cascade-safe ink', () => {
    const fresh = createStylePacket('text'); if (fresh.type !== 'text') throw new Error()
    expect(fresh.inkMode).toBe('cascade')
    const legacy = { version: 36, activeProjectId: 'p', projects: [{ version: 36, id: 'p', name: 'Legacy ink', tokens: [], componentOverrides: [
      { id: 'body', target: { selector: '[data-component="MessageContent"]', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }, states: { normal: [{ id: 'ink', type: 'text', colorMode: 'solid', solid: { color: '#202020', alpha: 1 }, gradient: { type: 'linear', angle: 135, stops: [{ color: '#fff', alpha: 1, position: 0 }, { color: '#000', alpha: 1, position: 100 }] }, strokeWidth: 0, strokeColor: '#000000', strokeAlpha: 1 }] } },
    ], layoutGroups: [], recipeSlots: [], customCss: '', assets: [], fonts: [], presets: [], svgAssets: [], boost: {}, createdAt: 1, updatedAt: 2 }] }
    const restored = normalizeState(legacy)
    const packet = restored.projects[0].componentOverrides[0].states.normal?.[0]
    expect(restored.version).toBe(43)
    expect(packet?.type).toBe('text')
    expect(packet?.type === 'text' && packet.inkMode).toBe('force')
  })


  test('schema v39 keeps My Styles global across projects and applies semantic packets into another theme', () => {
    const store = new ProjectStore()
    const first = store.activeProject
    const background = createStylePacket('background'); if (background.type !== 'background') throw new Error()
    background.mode = 'solid'; background.solid = { color: '#b88cff', alpha: .72 }
    const target = { selector: '[data-component="PersonaBrowser"] [class*="_panel_"]', strategy: 'native-context-local' as const, stability: 'high' as const, persistence: 'persistent' as const, source: 'native-aware' as const, label: 'Persona panel', nativeComponentId: 'PersonaBrowser', nativeContextSelector: '[data-component="PersonaBrowser"]', localSelector: '[class*="_panel_"]' }
    store.upsertPacket(target, background)
    const authored = store.activeProject.componentOverrides.filter((entry) => entry.target.selector === target.selector)
    const saved = store.saveStyle('Lavender dossier', authored, { scope: 'component', sourceLabel: 'PersonaBrowser' })
    expect(saved?.name).toBe('Lavender dossier')
    expect(store.snapshot.savedStyles).toHaveLength(1)

    const second = store.create('Second theme')
    expect(second.componentOverrides).toHaveLength(0)
    expect(store.applySavedStyle(saved!.id)).toBe(true)
    const applied = store.activeProject.componentOverrides.find((entry) => entry.target.selector === target.selector)
    const appliedPacket = applied?.states.normal[0]
    expect(appliedPacket?.type).toBe('background')
    if (appliedPacket?.type !== 'background') throw new Error()
    expect(appliedPacket.solid.color).toBe('#b88cff')
    expect(store.snapshot.savedStyles).toHaveLength(1)

    const restored = normalizeState(JSON.parse(JSON.stringify(store.snapshot)))
    expect(restored.version).toBe(43)
    expect(restored.savedStyles).toHaveLength(1)
    expect(restored.savedStyles[0].overrides[0].target.selector).toBe(target.selector)
    expect(restored.projects.map((project) => project.id)).toContain(first.id)
  })

  test('schema v39 preserves multi-component My Styles bundles across projects', () => {
    const store = new ProjectStore()
    const bg = createStylePacket('background'); if (bg.type !== 'background') throw new Error()
    const text = createStylePacket('text'); if (text.type !== 'text') throw new Error()
    const persona = { selector: '[data-component="PersonaBrowser"] [class*="_panel_"]', strategy: 'native-context-local' as const, stability: 'high' as const, persistence: 'persistent' as const, source: 'native-aware' as const, label: 'Persona panel', nativeComponentId: 'PersonaBrowser' }
    const footer = { selector: '[data-component="PersonaEditor"] [class*="_actions_"]', strategy: 'native-context-local' as const, stability: 'high' as const, persistence: 'persistent' as const, source: 'native-aware' as const, label: 'Persona actions', nativeComponentId: 'PersonaEditor' }
    store.upsertPacket(persona, bg)
    store.upsertPacket(footer, text)
    const bundle = store.saveStyle('Persona suite', store.activeProject.componentOverrides, { scope: 'bundle', sourceLabel: '2 selected parts' })
    expect(bundle?.scope).toBe('bundle')
    expect(bundle?.overrides).toHaveLength(2)
    store.create('Destination')
    expect(store.applySavedStyle(bundle!.id)).toBe(true)
    expect(store.activeProject.componentOverrides.map((entry) => entry.target.selector).sort()).toEqual([persona.selector, footer.selector].sort())
    const restored = normalizeState(JSON.parse(JSON.stringify(store.snapshot)))
    expect(restored.version).toBe(43)
    expect(restored.savedStyles[0].scope).toBe('bundle')
  })

})
