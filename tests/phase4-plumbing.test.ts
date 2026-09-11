import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Window } from 'happy-dom'
import { createHappyDomWindow } from './support/happy-dom'
import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import { classifyBoostVariable, deriveBoostTokenOverrides, inspectBoostCssValue, transformThemeVariables } from '../src/compiler/boost'
import { contrastRatio, parseHexColor } from '../src/compiler/color'
import { compileLayoutItemPacket, compileLayoutPacket, compileThemeProject } from '../src/compiler/compiler'
import { validateOverride } from '../src/compiler/validation'
import { ThemeRuntimeBridge, materializeBoostBaseline } from '../src/nativeBridge/theme-runtime'
import { createProject, createStylePacket, newId, type ComponentOverride, type StudioTarget } from '../src/project/model'
import { ProjectStore } from '../src/project/store'
import { reconcileSelectionWithOverrides, resolveElement } from '../src/registry/selector-resolver'
import { detectSizeController, inspectLayoutContext } from '../src/registry/layout-context'
import type { NativeThemeComponent } from '../src/registry/types'

const TEST_NATIVE_VARIABLES = { '--lumiverse-primary': '#9370db', '--lumiverse-secondary': '#786bf0', '--lumiverse-bg': '#101016', '--lumiverse-bg-deep': '#08080d', '--lumiverse-bg-elevated': '#1b1b24', '--lumiverse-text': '#f4eef8', '--lumiverse-muted': '#a8a2b3', '--lumiverse-border': 'rgba(255,255,255,.16)', '--lumiverse-card-bg': 'linear-gradient(165deg, hsla(276, 3%, 12%, 1) 0%, hsla(276, 3%, 10%, 1) 50%, hsla(276, 3%, 8%, 1) 100%)' }

let window: Window
let previous: Record<string, unknown>
beforeEach(() => {
  window = createHappyDomWindow({ url: 'http://localhost/' }); previous = { window: globalThis.window, document: globalThis.document, CSS: globalThis.CSS, Element: globalThis.Element, MutationObserver: globalThis.MutationObserver, getComputedStyle: globalThis.getComputedStyle }
  Object.assign(globalThis, { window, document: window.document, CSS: window.CSS, Element: window.Element, MutationObserver: (window as any).MutationObserver, getComputedStyle: window.getComputedStyle.bind(window) })
})
afterEach(async () => { await window.close(); Object.assign(globalThis, previous) })

const bubble: NativeThemeComponent = { id: 'src/BubbleMessage', label: 'BubbleMessage', area: 'Chat', sources: ['css', 'tsx'], selectors: ['[data-component="BubbleMessage"]'], cssClasses: ['card', 'bubble', 'header', 'headerLeft', 'avatar', 'nameChar'], nativeKey: 'src/BubbleMessage' }
const target: StudioTarget = { selector: '.target', strategy: 'exact-class', stability: 'medium', persistence: 'persistent', source: 'dom-scoped' }
function item(states: ComponentOverride['states']): ComponentOverride { return { id: newId('override'), target, states } }

describe('Phase Four target traversal and restoration', () => {
  test('discovers meaningful avatar ancestors and persistent anchored leaf selectors', () => {
    document.body.innerHTML = '<div data-component="BubbleMessage" class="_card_hashx_1"><div class="_bubble_hashx_2"><div class="_header_hashx_3"><div class="_headerLeft_hashx_4"><div class="_avatar_hashx_5"><div><img src="avatar.png"></div></div></div></div></div></div>'
    const selection = resolveElement(document.querySelector('img')!, [bubble])
    expect(selection.targetLevels.map((level) => level.label)).toEqual(['Image', 'Avatar', 'Header Left', 'Header', 'Bubble', 'BubbleMessage'])
    expect(selection.scopeCandidates.some((scope) => scope.selector === '[data-component="BubbleMessage"] [class*="_avatar_"] img')).toBe(true)
    expect(selection.scopeCandidates.some((scope) => scope.selector === '[data-component="BubbleMessage"] [class*="_avatar_"]')).toBe(true)
    expect(selection.target.element?.tagName).toBe('IMG')
  })
  test('native component roots prefer their first concrete CSS-module part', () => {
    const inputArea: NativeThemeComponent = { id: 'src/InputArea', label: 'InputArea', area: 'Chat', sources: ['css', 'tsx'], selectors: ['[data-component="InputArea"]'], cssClasses: ['container', 'inputRow', 'textarea'], nativeKey: 'src/InputArea' }
    document.body.innerHTML = '<div data-component="InputArea" class="_container_abcd_1"><div class="_inputRow_abcd_2"><textarea class="_textarea_abcd_3"></textarea></div></div>'
    const selection = resolveElement(document.querySelector('[data-component="InputArea"]')!, [inputArea])
    const active = selection.scopeCandidates.find((scope) => scope.id === selection.activeScopeId)
    expect(active?.type).toBe('native-part')
    expect(active?.selector).toBe('[data-component="InputArea"][class*="_container_"]')
  })
  test('DOM-only target ladders still use CSS-module anchors', () => {
    document.body.innerHTML = '<div class="_header_hashx_3"><div class="_avatar_hashx_5"><div><img></div></div></div>'
    const selection = resolveElement(document.querySelector('img')!, [])
    expect(selection.targetLevels.map((level) => level.label)).toEqual(['Image', 'Avatar', 'Header'])
    expect(selection.scopeCandidates.some((scope) => scope.selector === '[class*="_avatar_"] img')).toBe(true)
  })
  test('re-picking reconnects the most specific existing styled scope', () => {
    document.body.innerHTML = '<div data-component="BubbleMessage"><span class="_nameChar_hashx_1">Mira</span></div>'
    const selection = resolveElement(document.querySelector('span')!, [bubble]); const local = selection.scopeCandidates.find((scope) => scope.selector.includes('_nameChar_'))!
    const broad = selection.scopeCandidates.find((scope) => scope.selector === '[data-component="BubbleMessage"]')!
    const reconciled = reconcileSelectionWithOverrides(selection, [item({ normal: [createStylePacket('background')] }), { ...item({ normal: [createStylePacket('border')] }), target: { ...target, selector: broad.selector } }, { ...item({ normal: [createStylePacket('text')] }), target: { ...target, selector: local.selector } }])
    expect(reconciled.selection.activeScopeId).toBe(local.id); expect(reconciled.activeOverride?.target.selector).toBe(local.selector); expect(reconciled.styledScopeIds).toContain(broad.id)
  })
  test('styled ancestors are annotated but never hijack an exact image pick', () => {
    document.body.innerHTML = '<div data-component="BubbleMessage"><div class="_headerLeft_hashx_1"><img style="width:100%"></div></div>'
    const selection = resolveElement(document.querySelector('img')!, [bubble]), initial = selection.activeScopeId
    const ancestor = selection.scopeCandidates.find((scope) => scope.element?.classList.contains('_headerLeft_hashx_1'))!
    const ancestorOverride = { ...item({ normal: [createStylePacket('background')] }), target: { ...target, selector: ancestor.selector } }
    const reconciled = reconcileSelectionWithOverrides(selection, [ancestorOverride])
    expect(reconciled.selection.activeScopeId).toBe(initial); expect(reconciled.activeOverride).toBeUndefined(); expect(ancestor.styledPacketCount).toBe(1)
    const exact = selection.scopeCandidates.find((scope) => scope.id === initial)!
    const exactOverride = { ...item({ normal: [createStylePacket('text')] }), target: { ...target, selector: exact.selector } }
    expect(reconcileSelectionWithOverrides(resolveElement(document.querySelector('img')!, [bubble]), [ancestorOverride, exactOverride]).activeOverride?.target.selector).toBe(exact.selector)
  })
  test('layout parent and conservative media size controller remain separate metadata', () => {
    document.body.innerHTML = '<div data-component="BubbleMessage"><div class="_header_hashx_1" style="display:flex"><div class="_avatar_hashx_2" style="width:48px;height:48px;overflow:hidden;position:relative"><img style="width:100%;height:100%;object-fit:cover"></div></div></div>'
    const image = document.querySelector('img')!, layout = inspectLayoutContext(image, [bubble]), selection = resolveElement(image, [bubble]), controller = detectSizeController(image, selection.scopeCandidates)
    expect(layout.parentLabel).toBe('avatar'); expect(layout.parentDisplay).toBe('block'); expect(controller?.label).toBe('avatar'); expect(controller?.scopeId).toBeTruthy()
  })
  test('actual immediate flex parent is reported independently of native context', () => {
    document.body.innerHTML = '<section data-component="BubbleMessage"><div class="_row_hashx_1" style="display:flex"><button>Pick</button></div></section>'
    const layout = inspectLayoutContext(document.querySelector('button')!, [bubble]); expect(layout.parentDisplay).toBe('flex'); expect(layout.isFlex).toBe(true); expect(layout.parentLabel).toBe('row')
  })
  test('deleting one ladder override leaves its sibling override intact', () => {
    const store = new ProjectStore(); const imageTarget = { ...target, selector: '.avatar img' }, headerTarget = { ...target, selector: '.headerLeft' }
    store.upsertPacket(imageTarget, createStylePacket('size')); store.upsertPacket(headerTarget, createStylePacket('background'))
    const header = store.activeProject.componentOverrides.find((entry) => entry.target.selector === '.headerLeft')!; store.removePacket(header.id, header.states.normal[0].id)
    expect(store.activeProject.componentOverrides.map((entry) => entry.target.selector)).toEqual(['.avatar img'])
  })
  test('manual packet removal detaches recipe ownership only in the edited responsive scope', () => {
    const store = new ProjectStore(); const recipeTarget = { ...target, selector: '.responsive-recipe' }
    const base = createStylePacket('typography'); const mobile = createStylePacket('typography')
    store.upsertPacket(recipeTarget, base, 'normal', 'base'); store.upsertPacket(recipeTarget, mobile, 'normal', 'mobile')
    store.setRecipeSlots([
      { id: 'base-slot', target: recipeTarget, type: 'typography', scope: 'base', layers: [{ presetId: 'spectacle', packet: base }] },
      { id: 'mobile-slot', target: recipeTarget, type: 'typography', scope: 'mobile', layers: [{ presetId: 'spectacle', packet: mobile }] },
    ])
    const override = store.activeProject.componentOverrides.find((entry) => entry.target.selector === recipeTarget.selector)!
    store.removePacket(override.id, mobile.id, 'normal', 'mobile')
    expect(store.activeProject.recipeSlots.map((slot) => slot.scope)).toEqual(['base'])
  })

  test('manual restore and packet removal detach persisted recipe ownership', () => {
    const store = new ProjectStore(); const recipeTarget = { ...target, selector: '.recipe-target' }; const packet = createStylePacket('background')
    store.upsertPacket(recipeTarget, packet)
    store.setRecipeSlots([{ id: 'slot-a', target: recipeTarget, type: 'background', scope: 'base', layers: [{ presetId: 'pack-recipe', packet }] }])
    const override = store.activeProject.componentOverrides.find((entry) => entry.target.selector === recipeTarget.selector)!
    store.removePacket(override.id, packet.id)
    expect(store.activeProject.recipeSlots).toHaveLength(0)

    const second = createStylePacket('text'); store.upsertPacket(recipeTarget, second)
    store.setRecipeSlots([{ id: 'slot-b', target: recipeTarget, type: 'text', scope: 'base', layers: [{ presetId: 'pack-recipe', packet: second }] }])
    store.restoreTarget([recipeTarget.selector])
    expect(store.activeProject.componentOverrides.find((entry) => entry.target.selector === recipeTarget.selector)).toBeUndefined()
    expect(store.activeProject.recipeSlots).toHaveLength(0)
  })
})

describe('Phase Four layout, size and state semantics', () => {
  test('supports every display mode plus grid column strategies', () => {
    const packet = createStylePacket('layout'); if (packet.type !== 'layout') throw new Error()
    for (const display of ['normal', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none'] as const) { packet.display = display; const css = compileLayoutPacket(packet); if (display === 'normal') expect(css).not.toContain('display:'); else expect(css).toContain(`display: ${display};`) }
    packet.display = 'grid'; packet.gridColumns = { mode: 'count', count: 3 }; expect(compileLayoutPacket(packet)).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));')
    packet.gridColumns = { mode: 'auto-fit', min: { mode: 'fixed', value: 180, unit: 'px' } }; expect(compileLayoutPacket(packet)).toContain('repeat(auto-fit, minmax(180px, 1fr))')
  })
  test('fill remaining uses flex-item semantics and coexists with container layout', () => {
    const layoutItem = createStylePacket('layout-item'); const layout = createStylePacket('layout'); if (layoutItem.type !== 'layout-item' || layout.type !== 'layout') throw new Error()
    expect(compileLayoutItemPacket(layoutItem)).toBe('')
    layoutItem.sizeInParent = 'fill'; layout.display = 'flex'
    expect(compileLayoutItemPacket(layoutItem)).toBe('flex-grow: 1;\nflex-shrink: 1;\nflex-basis: 0;')
    const project = createProject(); project.componentOverrides.push(item({ normal: [layoutItem, layout] })); const css = compileThemeProject(project)
    expect(css).toContain('flex-grow: 1;'); expect(css).toContain('display: flex;'); expect(css).not.toContain('width: 100%')
  })
  test('warns only for directly comparable contradictory constraints', () => {
    const size = createStylePacket('size'); if (size.type !== 'size') throw new Error(); size.minHeight = { mode: 'fixed', value: 900, unit: 'px' }; size.maxHeight = { mode: 'fixed', value: 800, unit: 'px' }
    expect(validateOverride(item({ normal: [size] })).map((warning) => warning.code)).toContain('size-height-constraints')
    size.maxHeight = { mode: 'fixed', value: 800, unit: 'rem' }; expect(validateOverride(item({ normal: [size] })).map((warning) => warning.code)).not.toContain('size-height-constraints')
  })
  test('Copy Normal deep-clones packets and Reset state leaves Normal intact', () => {
    const store = new ProjectStore(); store.upsertPacket(target, createStylePacket('background')); store.upsertPacket(target, createStylePacket('text')); const override = store.activeProject.componentOverrides[0]
    store.copyStatePackets(override.id, 'normal', 'hover'); const copied = store.activeProject.componentOverrides[0]
    expect(copied.states.hover?.map((packet) => packet.type)).toEqual(['background', 'text']); expect(copied.states.hover?.[0].id).not.toBe(copied.states.normal[0].id)
    store.removePacket(copied.id, copied.states.hover![0].id, 'hover'); expect(store.activeProject.componentOverrides[0].states.normal).toHaveLength(2)
    store.resetState(copied.id, 'hover'); expect(store.activeProject.componentOverrides[0].states.normal).toHaveLength(2)
  })
})

describe('Phase Four Boost semantics', () => {
  test('materializes the native semantic baseline without legacy palette bootstrapping', () => {
    const native = { '--lumiverse-primary': 'rgb(225, 75, 165)', '--lumiverse-secondary': '#6c7fd8', '--lumiverse-bg': '#18231d', '--lumiverse-text': '#f0eee8', '--lumiverse-border': 'rgba(255,255,255,.2)' }
    const baseline = materializeBoostBaseline(native)
    expect(baseline.primary?.color).toBe('#e14ba5'); expect(baseline.surface?.color).toBe('#18231d')
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff4f9a', alpha: 1 }; const variables = deriveBoostTokenOverrides(project.boost, native)
    expect(variables['--lumiverse-primary']).not.toBe(native['--lumiverse-primary']); expect(variables['--lumiverse-bg']).not.toBe(native['--lumiverse-bg'])
    expect(compileThemeProject(project)).not.toContain('Application-wide Palette Boost'); expect(compileThemeProject(project)).not.toContain('--lumiverse-primary')
  })
  test('live theme bridge owns Lumiverse root inline variables and restores the newest native declaration', async () => {
    const sent: Array<Record<string, unknown>> = []; let handler: (payload: unknown) => void = () => {}
    const context = { onBackendMessage(callback: (payload: unknown) => void) { handler = callback; return () => {} }, sendToBackend(payload: unknown) { const message = payload as Record<string, unknown>; sent.push(message); queueMicrotask(() => handler(message.type === 'theme_studio:get_theme_baseline' ? { type: 'theme_studio:theme_baseline', requestId: message.requestId, info: {}, variables: { '--lumiverse-primary': '#8855aa' } } : { type: message.type === 'theme_studio:apply_theme_override' ? 'theme_studio:theme_applied' : 'theme_studio:theme_cleared', requestId: message.requestId })) } } as unknown as SpindleFrontendContext
    let notifyRootMutation: MutationCallback | undefined
    class ManualMutationObserver {
      constructor(callback: MutationCallback) { notifyRootMutation = callback }
      observe(): void {}
      disconnect(): void {}
      takeRecords(): MutationRecord[] { return [] }
    }
    globalThis.MutationObserver = ManualMutationObserver as unknown as typeof MutationObserver
    document.documentElement.style.setProperty('--lumiverse-primary', '#112233')
    const bridge = new ThemeRuntimeBridge(context); const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#e14ba5', alpha: 1 }
    await bridge.sync(project.boost)
    const expected = bridge.runtimeDiagnostics?.expected
    expect(expected).toBeTruthy()
    expect(document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()).toBe(expected!)
    expect(document.documentElement.style.getPropertyPriority('--lumiverse-primary')).toBe('important')
    expect(bridge.runtimeDiagnostics?.authority).toBe('root-inline-important')

    // Lumiverse reapplies native themes directly onto <html>. Exercise Palette's
    // observer callback deterministically instead of depending on Happy DOM's
    // incomplete style-attribute MutationObserver delivery under Bun canary.
    document.documentElement.style.setProperty('--lumiverse-primary', '#445566')
    expect(notifyRootMutation).toBeDefined()
    notifyRootMutation!([], {} as MutationObserver)
    expect(document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()).toBe(expected!)
    expect(document.documentElement.style.getPropertyPriority('--lumiverse-primary')).toBe('important')

    await bridge.clear()
    expect(document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()).toBe('#445566')
    expect(document.documentElement.style.getPropertyPriority('--lumiverse-primary')).toBe('')
    await bridge.destroy()
    const sentTypes = sent.map((message) => message.type)
    expect(sentTypes[0]).toBe('theme_studio:clear_theme_override')
    expect(sentTypes.filter((type) => type === 'theme_studio:get_theme_baseline').length).toBeGreaterThanOrEqual(1)
    expect(sentTypes.filter((type) => type === 'theme_studio:clear_theme_override').length).toBeGreaterThanOrEqual(3)
    expect(sentTypes).not.toContain('theme_studio:apply_theme_override')
  })
  test('Boost fails closed when the canonical worker baseline is unavailable and never falls back to the frontend catalog', async () => {
    const sent: Array<Record<string, unknown>> = []; let handler: (payload: unknown) => void = () => {}; let catalogReads = 0
    const context = {
      theme: { catalog: { listVariables: () => { catalogReads += 1; return [{ name: '--lumiverse-primary', value: '#335577' }] } } },
      onBackendMessage(callback: (payload: unknown) => void) { handler = callback; return () => {} },
      sendToBackend(payload: unknown) {
        const message = payload as Record<string, unknown>; sent.push(message)
        queueMicrotask(() => handler({ type: 'theme_studio:theme_error', requestId: message.requestId, error: 'canonical baseline unavailable' }))
      },
    } as unknown as SpindleFrontendContext
    const bridge = new ThemeRuntimeBridge(context), project = createProject()
    project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff1493', alpha: 1 }; project.boost.originalSaturation = 0
    let error = ''
    try { await bridge.sync(project.boost) } catch (caught) { error = caught instanceof Error ? caught.message : String(caught) }
    expect(error).toContain('canonical baseline unavailable')
    expect(catalogReads).toBe(0)
    expect(sent.some((entry) => entry.type === 'theme_studio:get_theme_baseline')).toBe(true)
    expect(sent.some((entry) => entry.type === 'theme_studio:apply_theme_override')).toBe(false)
    expect(document.documentElement.style.getPropertyPriority('--lumiverse-primary')).toBe('')
    await bridge.destroy()
  })
  test('live bridge reuses one native baseline across parameter edits', async () => {
    const sent: Array<Record<string, unknown>> = []; let handler: (payload: unknown) => void = () => {}
    const context = { onBackendMessage(callback: (payload: unknown) => void) { handler = callback; return () => {} }, sendToBackend(payload: unknown) { const message = payload as Record<string, unknown>; sent.push(message); queueMicrotask(() => handler(message.type === 'theme_studio:get_theme_baseline' ? { type: 'theme_studio:theme_baseline', requestId: message.requestId, info: {}, variables: { '--lumiverse-primary': '#335577', '--lumiverse-font-scale': '1' } } : { type: message.type === 'theme_studio:apply_theme_override' ? 'theme_studio:theme_applied' : 'theme_studio:theme_cleared', requestId: message.requestId })) } } as unknown as SpindleFrontendContext
    const bridge = new ThemeRuntimeBridge(context), project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true
    await bridge.sync(project.boost); project.boost.brightness = .2; await bridge.sync(project.boost); await bridge.destroy()
    expect(sent.filter((entry) => entry.type === 'theme_studio:get_theme_baseline')).toHaveLength(1); expect(sent.filter((entry) => entry.type === 'theme_studio:apply_theme_override')).toHaveLength(0)
  })
  test('native theme changes update the cached canonical Boost source instead of feeding Boost back into itself', async () => {
    const sent: Array<Record<string, unknown>> = []; let handler: (payload: unknown) => void = () => {}
    let nativeVariables = { '--lumiverse-primary': '#335577', '--lumiverse-bg': '#101016', '--lumiverse-text': '#f4eef8' }
    const context = {
      theme: { catalog: { listVariables: () => [{ name: '--lumiverse-primary', value: '#catalog-poison' }] } },
      onBackendMessage(callback: (payload: unknown) => void) { handler = callback; return () => {} },
      sendToBackend(payload: unknown) {
        const message = payload as Record<string, unknown>; sent.push(message)
        queueMicrotask(() => handler(message.type === 'theme_studio:get_theme_baseline'
          ? { type: 'theme_studio:theme_baseline', requestId: message.requestId, info: {}, variables: structuredClone(nativeVariables) }
          : { type: 'theme_studio:theme_cleared', requestId: message.requestId }))
      },
    } as unknown as SpindleFrontendContext
    const bridge = new ThemeRuntimeBridge(context), project = createProject()
    project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#9370db', alpha: 1 }; project.boost.originalSaturation = 0
    await bridge.sync(project.boost)

    nativeVariables = { ...nativeVariables, '--lumiverse-primary': '#aa5533' }
    const changed = await (bridge as unknown as { rebaseFromCanonicalIfChanged(): Promise<boolean> }).rebaseFromCanonicalIfChanged()
    expect(changed).toBe(true)
    project.boost.brightness = .18
    const expected = transformThemeVariables(nativeVariables, project.boost).variables['--lumiverse-primary']
    await bridge.sync(project.boost)
    expect(document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()).toBe(expected)
    expect(sent.some((entry) => entry.type === 'theme_studio:apply_theme_override')).toBe(false)
    await bridge.destroy()
  })

  test('stale Boost root authority is detoxed from the canonical worker baseline without catalog sampling', async () => {
    const workerNative = { '--lumiverse-primary': '#9370db', '--lumiverse-bg': '#101016', '--lumiverse-text': '#f4eef8' }
    const catalogSamples: string[] = []
    let handler: (payload: unknown) => void = () => {}
    const context = {
      theme: { catalog: { listVariables: () => Object.keys(workerNative).map((name) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
        if (name === '--lumiverse-primary') catalogSamples.push(value)
        return { name, value }
      }) } },
      onBackendMessage(callback: (payload: unknown) => void) { handler = callback; return () => {} },
      sendToBackend(payload: unknown) {
        const message = payload as Record<string, unknown>
        queueMicrotask(() => handler(message.type === 'theme_studio:get_theme_baseline'
          ? { type: 'theme_studio:theme_baseline', requestId: message.requestId, info: {}, variables: workerNative }
          : { type: 'theme_studio:theme_cleared', requestId: message.requestId }))
      },
    } as unknown as SpindleFrontendContext

    // Simulate a hot-reload from an older Theme Studio build: its in-memory
    // underlying snapshot is gone, but the root still carries its boosted
    // `!important` output and ownership marker.
    document.documentElement.setAttribute('data-theme-studio-boost-live', '')
    document.documentElement.style.setProperty('--lumiverse-primary', '#003f3f', 'important')
    document.documentElement.style.setProperty('--lumiverse-bg', '#002f2f', 'important')
    document.documentElement.style.setProperty('--lumiverse-text', '#d8ffff', 'important')

    const bridge = new ThemeRuntimeBridge(context), project = createProject()
    project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#e14ba5', alpha: 1 }; project.boost.originalSaturation = 0
    const expected = transformThemeVariables(workerNative, project.boost).variables['--lumiverse-primary']
    await bridge.sync(project.boost)

    expect(catalogSamples).toHaveLength(0)
    expect(document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()).toBe(expected)
    expect(document.documentElement.style.getPropertyPriority('--lumiverse-primary')).toBe('important')

    await bridge.clear()
    expect(document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()).toBe(workerNative['--lumiverse-primary'])
    expect(document.documentElement.style.getPropertyPriority('--lumiverse-primary')).toBe('')
    await bridge.destroy()
  })

  test('Refresh source reseeds from canonical worker state with Theme Studio authority released and the observer guarded', async () => {
    const nativeVariables = { '--lumiverse-primary': '#6655aa', '--lumiverse-bg': '#111118', '--lumiverse-text': '#f4eef8' }
    const catalogSamples: string[] = []
    let handler: (payload: unknown) => void = () => {}
    const context = {
      theme: { catalog: { listVariables: () => Object.keys(nativeVariables).map((name) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
        if (name === '--lumiverse-primary') catalogSamples.push(value)
        return { name, value }
      }) } },
      onBackendMessage(callback: (payload: unknown) => void) { handler = callback; return () => {} },
      sendToBackend(payload: unknown) {
        const message = payload as Record<string, unknown>
        queueMicrotask(() => handler(message.type === 'theme_studio:get_theme_baseline'
          ? { type: 'theme_studio:theme_baseline', requestId: message.requestId, info: {}, variables: nativeVariables }
          : { type: 'theme_studio:theme_cleared', requestId: message.requestId }))
      },
    } as unknown as SpindleFrontendContext

    for (const [name, value] of Object.entries(nativeVariables)) document.documentElement.style.setProperty(name, value)
    const bridge = new ThemeRuntimeBridge(context), project = createProject()
    project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#9370db', alpha: 1 }; project.boost.originalSaturation = 0
    await bridge.sync(project.boost)
    const boosted = document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()
    expect(boosted).not.toBe(nativeVariables['--lumiverse-primary'])

    catalogSamples.length = 0
    await bridge.refreshBaseline()
    expect(catalogSamples).toHaveLength(0)
    expect(document.documentElement.style.getPropertyPriority('--lumiverse-primary')).toBe('important')
    await bridge.destroy()
  })

  test('startup Refresh source trusts the canonical worker baseline even when the frontend catalog is a stale Boost snapshot', async () => {
    const workerNative = { '--lumiverse-primary': '#6655aa', '--lumiverse-bg': '#111118', '--lumiverse-text': '#f4eef8' }
    const staleCatalog = { '--lumiverse-primary': '#003f3f', '--lumiverse-bg': '#002f2f', '--lumiverse-text': '#d8ffff' }
    let handler: (payload: unknown) => void = () => {}
    const context = {
      theme: { catalog: { listVariables: () => Object.entries(staleCatalog).map(([name, value]) => ({ name, value })) } },
      onBackendMessage(callback: (payload: unknown) => void) { handler = callback; return () => {} },
      sendToBackend(payload: unknown) {
        const message = payload as Record<string, unknown>
        queueMicrotask(() => handler(message.type === 'theme_studio:get_theme_baseline'
          ? { type: 'theme_studio:theme_baseline', requestId: message.requestId, info: {}, variables: workerNative }
          : { type: 'theme_studio:theme_cleared', requestId: message.requestId }))
      },
    } as unknown as SpindleFrontendContext

    document.documentElement.style.setProperty('--lumiverse-primary', staleCatalog['--lumiverse-primary'], 'important')
    document.documentElement.setAttribute('data-theme-studio-boost-live', '')
    const bridge = new ThemeRuntimeBridge(context), project = createProject()
    project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#9370db', alpha: 1 }; project.boost.originalSaturation = 0
    const expected = transformThemeVariables(workerNative, project.boost).variables['--lumiverse-primary']

    await bridge.refreshBaseline()
    await bridge.sync(project.boost)
    expect(document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()).toBe(expected)
    expect(document.documentElement.style.getPropertyValue('--lumiverse-primary').trim()).not.toBe(transformThemeVariables(staleCatalog, project.boost).variables['--lumiverse-primary'])
    await bridge.destroy()
  })

  test('Boost color and typography layers can run independently', () => {
    const baseline = { '--lumiverse-primary': '#335577', '--lumiverse-font-family': 'Native Sans', '--lumiverse-font-scale': '1' }
    const project = createProject()
    project.boost.enabled = true; project.boost.typographyEnabled = true; project.boost.typography = { fontFamily: 'Studio Sans', scale: 1.1 }
    const fontOnly = transformThemeVariables(baseline, project.boost).variables
    expect(fontOnly['--lumiverse-primary']).toBeUndefined()
    expect(fontOnly['--lumiverse-font-family']).toBe('Studio Sans')
    expect(fontOnly['--lumiverse-font-scale']).toBe('1.1')
    project.boost.typographyEnabled = false; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff0000', alpha: 1 }; project.boost.originalSaturation = 0
    const colorsOnly = transformThemeVariables(baseline, project.boost).variables
    expect(colorsOnly['--lumiverse-primary']).not.toBe('#335577')
    expect(colorsOnly['--lumiverse-font-family']).toBe('Native Sans')
  })

  test('Boost preserves token identity, alpha and non-color values from a stable baseline', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff0000', alpha: 1 }; project.boost.originalSaturation = 0
    const baseline = { '--lumiverse-primary': 'rgba(20, 40, 60, 0.35)', '--lumiverse-font-scale': '1', '--lumiverse-custom-color': '#336699' }
    const first = transformThemeVariables(baseline, project.boost), second = transformThemeVariables(baseline, project.boost)
    expect(first.variables).toEqual(second.variables); expect(Object.keys(first.variables)).toEqual(Object.keys(baseline)); expect(first.variables['--lumiverse-primary']).toContain('0.35'); expect(first.variables['--lumiverse-font-scale']).toBe('1')
  })
  test('semantic routing keeps Secondary supporting instead of dominant and preserves status colors', () => {
    const baseline = { '--lumiverse-primary': '#4060d0', '--lumiverse-secondary': '#687080', '--lumiverse-bg': '#203050', '--lumiverse-border': '#526070', '--lumiverse-fill': '#304050', '--lumiverse-text': '#f2f2f2', '--lumiverse-danger': '#ef4444', '--lumiverse-success': '#22c55e', '--lumiverse-custom-color': '#336699' }
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.originalSaturation = 0; project.boost.primary = { color: '#ff7043', alpha: 1 }; project.boost.secondary = { color: '#22aa66', alpha: 1 }
    const greenSecondary = transformThemeVariables(baseline, project.boost)
    project.boost.secondary = { color: '#6655ff', alpha: 1 }
    const violetSecondary = transformThemeVariables(baseline, project.boost)
    expect(greenSecondary.variables['--lumiverse-secondary']).not.toBe(violetSecondary.variables['--lumiverse-secondary'])
    expect(greenSecondary.variables['--lumiverse-primary']).toBe(violetSecondary.variables['--lumiverse-primary'])
    expect(greenSecondary.variables['--lumiverse-bg']).not.toBe(violetSecondary.variables['--lumiverse-bg'])
    expect(greenSecondary.variables['--lumiverse-border']).not.toBe(violetSecondary.variables['--lumiverse-border'])
    expect(greenSecondary.variables['--lumiverse-fill']).toBe(violetSecondary.variables['--lumiverse-fill'])
    expect(greenSecondary.variables['--lumiverse-danger']).toBe(baseline['--lumiverse-danger']); expect(greenSecondary.variables['--lumiverse-success']).toBe(baseline['--lumiverse-success']); expect(greenSecondary.variables['--lumiverse-custom-color']).toBe(baseline['--lumiverse-custom-color'])
    expect(greenSecondary.diagnostics.roleCounts).toMatchObject({ primary: 1, secondary: 1, canvas: 1, text: 1, border: 1, neutral: 1, semantic: 2, preserve: 1 })
  })
  test('neutral overlays and borders stay out of accent routing', () => {
    expect(classifyBoostVariable('--lumiverse-fill')).toBe('neutral'); expect(classifyBoostVariable('--lumiverse-fill-heavy')).toBe('neutral')
    expect(classifyBoostVariable('--lumiverse-bg-darker')).toBe('neutral'); expect(classifyBoostVariable('--lumiverse-border-neutral')).toBe('neutral'); expect(classifyBoostVariable('--lumiverse-swatch-border')).toBe('neutral')
    expect(classifyBoostVariable('--lumiverse-border')).toBe('border'); expect(classifyBoostVariable('--lumiverse-card-bg')).toBe('card')
  })
  test('material graph consumes Lumiverse semantic aliases and Chat Shell glass without flattening them into Secondary', () => {
    const baseline = {
      '--lumiverse-primary': '#4060d0', '--lumiverse-secondary': '#687080', '--lumiverse-bg': '#182038', '--lumiverse-surface': '#182038',
      '--lumiverse-bg-elevated': '#242c48', '--lumiverse-surface-raised': '#242c48', '--lumiverse-bg-hover': '#303956', '--lumiverse-surface-hover': '#303956',
      '--lumiverse-card-bg': 'linear-gradient(165deg, #20263e 0%, #181d32 100%)', '--lumiverse-gradient-modal': 'linear-gradient(135deg, #242c48, #151a2c)',
      '--lumiverse-input-bg': '#101318', '--lumiverse-border': '#526070', '--lumiverse-border-hover': '#687080', '--lumiverse-border-subtle': '#46505c',
      '--lcs-glass-bg': '#151824', '--lcs-glass-bg-hover': '#1d2230', '--lcs-glass-border': '#3e4652', '--lumiverse-fill': '#304050',
    }
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.originalSaturation = 0; project.boost.primary = { color: '#0011ff', alpha: 1 }; project.boost.secondary = { color: '#ff00ae', alpha: 1 }
    const pink = transformThemeVariables(baseline, project.boost)
    project.boost.secondary = { color: '#00e5ff', alpha: 1 }
    const cyan = transformThemeVariables(baseline, project.boost)
    expect(pink.variables['--lumiverse-primary']).toBe(cyan.variables['--lumiverse-primary'])
    // Canvas, ordinary surfaces, glass, and resting controls remain Primary-led.
    for (const name of ['--lumiverse-bg', '--lumiverse-surface', '--lumiverse-input-bg', '--lcs-glass-bg']) expect(pink.variables[name]).toBe(cyan.variables[name])
    // Raised/card/hover/border materials are Secondary-led and therefore visibly move.
    for (const name of ['--lumiverse-bg-elevated', '--lumiverse-surface-raised', '--lumiverse-bg-hover', '--lumiverse-surface-hover', '--lumiverse-card-bg', '--lumiverse-gradient-modal', '--lumiverse-border-hover']) expect(pink.variables[name]).not.toBe(cyan.variables[name])
    expect(pink.variables['--lumiverse-fill']).toBe(cyan.variables['--lumiverse-fill'])
    expect(classifyBoostVariable('--lumiverse-bg')).toBe('canvas')
    expect(classifyBoostVariable('--lumiverse-surface')).toBe('surface')
    expect(classifyBoostVariable('--lumiverse-bg-elevated')).toBe('raised')
    expect(classifyBoostVariable('--lumiverse-surface-raised')).toBe('raised')
    expect(classifyBoostVariable('--lumiverse-bg-hover')).toBe('hover')
    expect(classifyBoostVariable('--lumiverse-surface-hover')).toBe('hover')
    expect(classifyBoostVariable('--lumiverse-card-bg')).toBe('card')
    expect(classifyBoostVariable('--lumiverse-gradient-modal')).toBe('card')
    expect(classifyBoostVariable('--lumiverse-input-bg')).toBe('control')
    expect(classifyBoostVariable('--lcs-glass-bg')).toBe('glass')
    expect(classifyBoostVariable('--lcs-glass-bg-hover')).toBe('glass')
    expect(classifyBoostVariable('--lcs-glass-border')).toBe('border')
    expect(classifyBoostVariable('--lcs-radius')).toBe('preserve')
  })
  test('direct accents stay faithful to explicit picks while native accent variants keep their hierarchy', () => {
    const baseline = { '--lumiverse-primary': '#9370db', '--lumiverse-primary-hover': '#a784ef', '--lumiverse-primary-deep': '#1a1427', '--lumiverse-secondary': '#808080', '--lumiverse-secondary-hover': '#969696' }
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#00ff55', alpha: 1 }; project.boost.secondary = { color: '#ff00d0', alpha: 1 }; project.boost.originalSaturation = .2; project.boost.brightness = 0; project.boost.contrast = 0
    const variables = transformThemeVariables(baseline, project.boost).variables
    const distance = (a: string, b: string) => { const left = parseHexColor(a)!, right = parseHexColor(b)!; return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b) }
    expect(distance(variables['--lumiverse-primary'], '#00ff55')).toBeLessThanOrEqual(3)
    expect(distance(variables['--lumiverse-secondary'], '#ff00d0')).toBeLessThanOrEqual(3)
    expect(variables['--lumiverse-primary-hover']).not.toBe(variables['--lumiverse-primary'])
    const deep = parseHexColor(variables['--lumiverse-primary-deep'])!, primary = parseHexColor(variables['--lumiverse-primary'])!
    expect(deep.r + deep.g + deep.b).toBeLessThan(primary.r + primary.g + primary.b)
  })
  test('Auto text repairs foreground contrast while Custom owns the text family', () => {
    const baseline = { '--lumiverse-bg': '#777777', '--lumiverse-text': '#888888', '--lumiverse-text-muted': 'rgba(136, 136, 136, .65)', '--lumiverse-icon': 'rgba(136, 136, 136, .9)' }
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.originalSaturation = 1; project.boost.textMode = 'auto'
    const auto = transformThemeVariables(baseline, project.boost).variables, autoText = parseHexColor(auto['--lumiverse-text']), autoSurface = parseHexColor(auto['--lumiverse-bg'])
    expect(autoText).not.toBeNull(); expect(autoSurface).not.toBeNull(); expect(contrastRatio(autoText!, autoSurface!)).toBeGreaterThanOrEqual(4.5)
    project.boost.textMode = 'custom'; project.boost.text = { color: '#ffe0f0', alpha: 1 }
    const custom = transformThemeVariables(baseline, project.boost).variables
    expect(custom['--lumiverse-text']).toBe('#ffe0f0'); expect(custom['--lumiverse-text-muted']).toContain('255, 224, 240'); expect(custom['--lumiverse-icon']).toContain('255, 224, 240')
  })
  test('blood mode strongly pulls primary and surface roles toward the red theme family', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff0000', alpha: 1 }; project.boost.secondary = { color: '#a80000', alpha: 1 }; project.boost.originalSaturation = 0
    const variables = transformThemeVariables({ '--lumiverse-primary': '#4060d0', '--lumiverse-bg': '#203050' }, project.boost).variables
    expect(variables['--lumiverse-primary']).not.toBe('#4060d0'); expect(variables['--lumiverse-bg']).not.toBe('#203050')
  })
  test('base 0/0 and deranged +100/-100 both preserve the native material ladder', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#00ff55', alpha: 1 }; project.boost.secondary = { color: '#ff00d0', alpha: 1 }; project.boost.originalSaturation = .2
    const source = { '--lumiverse-bg-deep': '#101010', '--lumiverse-bg': '#202020', '--lumiverse-surface': '#282828', '--lumiverse-surface-raised': '#383838', '--lumiverse-surface-hover': '#505050', '--lcs-glass-bg': '#181818', '--lumiverse-input-bg': '#141414', '--lumiverse-fill': 'rgba(0, 0, 0, 0.15)' }
    const luminance = (value: string) => { const color = parseHexColor(value)!; return .2126 * color.r + .7152 * color.g + .0722 * color.b }
    const assertLadder = (variables: Record<string, string>) => {
      expect(luminance(variables['--lumiverse-bg-deep'])).toBeLessThan(luminance(variables['--lumiverse-bg']))
      expect(luminance(variables['--lumiverse-bg'])).toBeLessThan(luminance(variables['--lumiverse-surface-raised']))
      expect(luminance(variables['--lumiverse-surface-raised'])).toBeLessThan(luminance(variables['--lumiverse-surface-hover']))
      expect(new Set(['--lumiverse-bg', '--lumiverse-surface', '--lumiverse-surface-raised', '--lumiverse-surface-hover', '--lcs-glass-bg', '--lumiverse-input-bg'].map((name) => variables[name])).size).toBeGreaterThanOrEqual(5)
    }
    const base = transformThemeVariables(source, project.boost).variables; assertLadder(base)
    project.boost.brightness = 1; project.boost.contrast = -1
    const deranged = transformThemeVariables(source, project.boost).variables; assertLadder(deranged)
    expect(luminance(deranged['--lumiverse-bg'])).toBeGreaterThan(luminance(base['--lumiverse-bg']))
    expect(deranged['--lumiverse-fill']).toBe(source['--lumiverse-fill'])
  })
  test('Original Saturation controls material source-color retention without pulling explicit accents away from their picks', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff0000', alpha: 1 }; project.boost.secondary = { color: '#00ffcc', alpha: 1 }
    const source = { '--lumiverse-primary': '#0066ff', '--lumiverse-secondary': '#808080', '--lumiverse-bg': '#0066ff' }
    project.boost.originalSaturation = 0; const pulled = transformThemeVariables(source, project.boost).variables
    project.boost.originalSaturation = 1; const retained = transformThemeVariables(source, project.boost).variables
    expect(retained['--lumiverse-bg']).not.toBe(pulled['--lumiverse-bg'])
    expect(retained['--lumiverse-primary']).toBe(pulled['--lumiverse-primary'])
    expect(retained['--lumiverse-secondary']).toBe(pulled['--lumiverse-secondary'])
    const store = new ProjectStore(), seed = store.activeProject.boost.shuffleSeed; store.shuffleBoost(['Verdana']); expect(store.activeProject.boost.shuffleSeed).not.toBe(seed); expect(store.activeProject.boost.typography.fontFamily).toBe('Verdana')
  })
  test('normalizes harmless boundary whitespace and emits no prohibited controls', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff0000', alpha: 1 }; project.boost.originalSaturation = 0
    const transformed = transformThemeVariables({ ...TEST_NATIVE_VARIABLES, '--lumiverse-primary': '\t\r\n #102030 \r\n' }, project.boost)
    for (const value of Object.values(transformed.variables)) expect(inspectBoostCssValue(value).prohibited).toHaveLength(0)
    const primary = inspectBoostCssValue(transformed.variables['--lumiverse-primary']); expect(primary.parsedAsColor).toBe(true); expect(primary.json).toMatch(/^"#[0-9a-f]{6}"$/)
  })
  test('rejects a genuinely prohibited baseline control instead of stripping it at the bridge', () => {
    const project = createProject(); project.boost.enabled = true
    expect(() => transformThemeVariables({ '--lumiverse-primary': `var(--accent)${String.fromCharCode(1)}` }, project.boost)).toThrow(/U\+0001/)
  })
  test('transforms every color stop in a native gradient while preserving its structure', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff1493', alpha: 1 }; project.boost.secondary = { color: '#a80038', alpha: 1 }; project.boost.originalSaturation = 0
    const gradient = `linear-gradient(
  165deg,
  hsla(276, 3%, 12%, 1) 0%,
  hsla(276, 3%, 10%, 1) 50%,
  hsla(276, 3%, 8%, 1) 100%
)`
    const result = transformThemeVariables({ '--lumiverse-card-bg': gradient }, project.boost), output = result.variables['--lumiverse-card-bg']
    expect(output).toStartWith('linear-gradient(\n  165deg,'); expect(output).toContain(' 0%'); expect(output).toContain(' 50%'); expect(output).toContain(' 100%')
    expect(output.match(/hsla\(/g)).toHaveLength(3); expect(output.match(/, 1\)/g)).toHaveLength(3); expect(output).not.toContain('hsla(276, 3%')
    expect(result.diagnostics).toMatchObject({ standaloneColorCount: 0, complexColorCount: 1, transformedColorTokenCount: 3, changedCount: 1, preservedCount: 0 })
  })
  test('keeps var references exact while transforming a mixed rgba gradient stop', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff1493', alpha: 1 }; project.boost.originalSaturation = 0
    const value = `linear-gradient(
  135deg,
  var(--lumiverse-bg),
  rgba(20, 17, 28, .98)
)`
    const output = transformThemeVariables({ '--lumiverse-gradient-modal': value }, project.boost).variables['--lumiverse-gradient-modal']
    expect(output).toContain('linear-gradient(\n  135deg,'); expect(output).toContain('var(--lumiverse-bg)'); expect(output).toContain('rgba('); expect(output).toContain(', 0.98)'); expect(output).not.toContain('rgba(20, 17, 28, .98)')
  })
  test('transforms embedded hex and rgb tokens in radial gradients', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff1493', alpha: 1 }; project.boost.originalSaturation = 0
    const value = 'radial-gradient(circle at 30% 40%, #123 0%, rgb(20, 30, 40) 55%, rgba(50, 60, 70, .4) 100%)'
    const result = transformThemeVariables({ '--lumiverse-card-image-bg': value }, project.boost), output = result.variables['--lumiverse-card-image-bg']
    expect(output).toStartWith('radial-gradient(circle at 30% 40%, #'); expect(output).toContain(' 0%'); expect(output).toContain(' 55%'); expect(output).toContain(' 100%)')
    expect(output).not.toContain('#123 0%'); expect(output).not.toContain('rgb(20, 30, 40)'); expect(output).not.toContain('rgba(50, 60, 70, .4)'); expect(output).toContain(', 0.4)')
    expect(result.diagnostics).toMatchObject({ standaloneColorCount: 0, complexColorCount: 1, transformedColorTokenCount: 3, changedCount: 1 })
  })
  test('preserves unknown standalone literal colors instead of assigning them to Primary', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff1493', alpha: 1 }; project.boost.originalSaturation = 0
    const source = { '--rgb': 'rgb(20, 30, 40)', '--hsl': 'hsl(276, 3%, 12%)', '--hsla': 'hsla(276, 3%, 12%, .35)' }, result = transformThemeVariables(source, project.boost)
    expect(result.variables).toEqual(source); expect(result.diagnostics.roleCounts.preserve).toBe(3); expect(result.diagnostics.changedCount).toBe(0)
  })
  test('transforms safe color-mix literals but never scans strings or URL payloads', () => {
    const project = createProject(); project.boost.enabled = true; project.boost.colorsEnabled = true; project.boost.primary = { color: '#ff0000', alpha: 1 }; project.boost.originalSaturation = 0
    const mixed = 'color-mix(in srgb, #336699 25%, var(--lumiverse-bg))', url = `url("data:image/svg+xml,%3Csvg%20fill='#fff'%3E") center / cover`, string = '"literal #fff rgba(1, 2, 3, .5)"'
    const result = transformThemeVariables({ '--lumiverse-card-bg': mixed, '--lumiverse-image': url, '--lumiverse-string': string }, project.boost)
    expect(result.variables['--lumiverse-card-bg']).toStartWith('color-mix(in srgb, #'); expect(result.variables['--lumiverse-card-bg']).not.toContain('#336699'); expect(result.variables['--lumiverse-card-bg']).toContain('var(--lumiverse-bg)')
    expect(result.variables['--lumiverse-image']).toBe(url); expect(result.variables['--lumiverse-string']).toBe(string); expect(result.diagnostics.complexColorCount).toBe(1); expect(result.diagnostics.preservedCount).toBe(2)
  })
})
