import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Window } from 'happy-dom'
import { createHappyDomWindow } from './support/happy-dom'
import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import { ElementPicker } from '../src/inspector/picker'
import { compileThemeProject } from '../src/compiler/compiler'
import { LiveStylesheet } from '../src/preview/live-stylesheet'
import { ProjectStore } from '../src/project/store'
import { createStylePacket } from '../src/project/model'
import { resolveElement } from '../src/registry/selector-resolver'
import type { NativeThemeComponent } from '../src/registry/types'
import { ThemeStudioUI } from '../src/ui/studio'
import { THEME_STUDIO_CSS } from '../src/ui/styles'
import { KNOWN_PART_ROLES } from '../src/presets/common-parts'
import { reverseEngineerElement } from '../src/project/reverse-engineer'
import { GENERATED_NATIVE_COMPONENTS, GENERATED_NATIVE_VARIABLES } from '../src/nativeBridge/generated-native-data'

let testWindow: Window
let previous: Record<string, unknown>

beforeEach(() => {
  testWindow = createHappyDomWindow({ url: 'http://localhost/' })
  previous = {
    window: globalThis.window,
    document: globalThis.document,
    CSS: globalThis.CSS,
    CSSStyleSheet: globalThis.CSSStyleSheet,
    Element: globalThis.Element,
    HTMLElement: globalThis.HTMLElement,
    HTMLStyleElement: globalThis.HTMLStyleElement,
    MutationObserver: globalThis.MutationObserver,
    getComputedStyle: globalThis.getComputedStyle,
    localStorage: globalThis.localStorage,
  }
  Object.assign(globalThis, {
    window: testWindow,
    document: testWindow.document,
    CSS: testWindow.CSS,
    CSSStyleSheet: testWindow.CSSStyleSheet,
    Element: testWindow.Element,
    HTMLElement: testWindow.HTMLElement,
    HTMLStyleElement: testWindow.HTMLStyleElement,
    MutationObserver: testWindow.MutationObserver,
    getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
    localStorage: testWindow.localStorage,
  })
})

afterEach(async () => {
  await testWindow.close()
  Object.assign(globalThis, previous)
})

function seedGeneratedCatalog(studio: ThemeStudioUI): void {
  const access = studio as unknown as { components: NativeThemeComponent[]; variables: Array<{ name: string; defaultValue: string; value: string; category?: string }> }
  access.components = structuredClone(GENERATED_NATIVE_COMPONENTS)
  access.variables = Object.entries(GENERATED_NATIVE_VARIABLES).map(([name, value]) => ({ name, defaultValue: value, value, category: 'Generated' }))
}

function mockContext(): SpindleFrontendContext {
  return {
    host: { capabilities: {} },
    dom: {
      createElement: (tag: keyof HTMLElementTagNameMap, attrs?: Record<string, string>) => {
        const element = document.createElement(tag)
        for (const [key, value] of Object.entries(attrs ?? {})) element.setAttribute(key, value)
        return element
      },
    },
  } as unknown as SpindleFrontendContext
}

describe('browser-owned lifecycle', () => {
  test('Read style turns authored computed presentation into editable packets without freezing an automatic size', () => {
    const style = document.createElement('style')
    style.textContent = `.read-me { color: rgb(190, 120, 255); font-size: 31px; font-weight: 700; letter-spacing: 4px; background-color: rgba(20, 10, 30, .72); border: 2px solid rgb(80, 180, 255); border-radius: 14px; padding: 8px 12px; box-shadow: 0 5px 18px rgba(0,0,0,.4); }`
    document.head.append(style)
    const target = document.createElement('h2'); target.className = 'read-me'; target.textContent = 'Reverse me'; document.body.append(target)
    const result = reverseEngineerElement(target)
    const byType = new Map(result.packets.map((packet) => [packet.type, packet]))
    expect(byType.has('text')).toBe(true)
    expect(byType.has('typography')).toBe(true)
    expect(byType.has('background')).toBe(true)
    expect(byType.has('border')).toBe(true)
    expect(byType.has('corners')).toBe(true)
    expect(byType.has('spacing')).toBe(true)
    expect(byType.has('shadow')).toBe(true)
    expect(byType.has('size')).toBe(false)
    const typography = byType.get('typography')
    expect(typography?.type === 'typography' && typography.fontSize).toBe(31)
    const text = byType.get('text')
    expect(text?.type === 'text' && text.solid.color).toBe('#be78ff')
  })


  test('Read style keeps media treatment and CSS masking as separate Image and Mask packets', () => {
    const target = document.createElement('div')
    const image = document.createElement('img')
    target.append(image)
    target.style.filter = 'brightness(0.85) saturate(0.4) contrast(1.2)'
    target.style.setProperty('-webkit-mask-image', 'linear-gradient(to bottom, #000 0%, #000 68%, transparent 100%)')
    document.body.append(target)

    const result = reverseEngineerElement(target)
    const imagePacket = result.packets.find((packet) => packet.type === 'image')
    const maskPacket = result.packets.find((packet) => packet.type === 'mask')

    expect(imagePacket?.type).toBe('image')
    expect(imagePacket?.type === 'image' && imagePacket.brightness).toBeCloseTo(0.85)
    expect(imagePacket?.type === 'image' && imagePacket.saturation).toBeCloseTo(0.4)
    expect(imagePacket?.type === 'image' && imagePacket.contrast).toBeCloseTo(1.2)
    expect(maskPacket?.type).toBe('mask')
    expect(maskPacket?.type === 'mask' && maskPacket.maskMode).toBe('fade')
    expect(maskPacket?.type === 'mask' && maskPacket.fade.direction).toBe('bottom')
    expect(maskPacket?.type === 'mask' && maskPacket.fade.amount).toBeCloseTo(32)
  })

  test('Read style capture is promoted to a strong editable target so it can beat a strong source recipe', () => {
    const store = new ProjectStore()
    const sourceTarget = { selector: '.read-source', strategy: 'css-module', stability: 'medium', persistence: 'persistent', source: 'dom-scoped', label: 'Source recipe', overrideStrength: 'strong' } as const
    const sourcePacket = createStylePacket('typography')
    if (sourcePacket.type !== 'typography') throw new Error('Expected typography packet')
    sourcePacket.fontSize = 31
    store.upsertPacket(sourceTarget, sourcePacket)

    const capturedTarget = { selector: '.read-local', strategy: 'structural', stability: 'medium', persistence: 'persistent', source: 'dom-scoped', label: 'Read style target', overrideStrength: 'strong' } as const
    const capturedPacket = createStylePacket('typography')
    if (capturedPacket.type !== 'typography') throw new Error('Expected typography packet')
    capturedPacket.fontSize = 64
    store.applyCapturedPackets(capturedTarget, [capturedPacket])

    const css = compileThemeProject(store.activeProject)
    expect(css).toContain(':where(.read-source):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__)')
    expect(css).toContain(':where(.read-local):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__)')
    expect(css).toContain('font-size: 64px !important;')
    expect(css).toContain(':where(.read-local):not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__)')
  })

  test('picker cancellation and teardown remove all extension artifacts', () => {
    const picker = new ElementPicker(mockContext())
    expect(document.querySelectorAll('[data-theme-studio-inspector]')).toHaveLength(5)
    picker.start({ onSelect: () => {}, onCancel: () => {} })
    expect(document.documentElement.style.cursor).toBe('crosshair')
    picker.cancel()
    expect(document.documentElement.style.cursor).toBe('')
    expect(picker.isActive).toBe(false)
    picker.destroy()
    expect(document.querySelectorAll('[data-theme-studio-inspector]')).toHaveLength(0)
  })

  test('picker supports one-shot selection for the compact widget', () => {
    const picker = new ElementPicker(mockContext()), target = document.createElement('button')
    document.body.append(target)
    const originalElementFromPoint = document.elementFromPoint.bind(document)
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => target })
    let selected = 0
    picker.start({ persistent: false, onSelect: () => { selected += 1 }, onCancel: () => {} })
    const access = picker as unknown as { handlePointerDown(event: PointerEvent): void }
    access.handlePointerDown({ clientX: 4, clientY: 4, preventDefault() {}, stopImmediatePropagation() {} } as PointerEvent)
    expect(selected).toBe(1)
    expect(picker.isActive).toBe(false)
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint })
    picker.destroy()
  })

  test('picker stays active after a selection until explicitly cancelled', () => {
    const picker = new ElementPicker(mockContext()), target = document.createElement('button')
    document.body.append(target)
    const originalElementFromPoint = document.elementFromPoint.bind(document)
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => target })
    let selected = 0
    picker.start({ onSelect: () => { selected += 1 }, onCancel: () => {} })
    const access = picker as unknown as { handlePointerDown(event: PointerEvent): void }
    access.handlePointerDown({ clientX: 4, clientY: 4, preventDefault() {}, stopImmediatePropagation() {} } as PointerEvent)
    expect(selected).toBe(1)
    expect(picker.isActive).toBe(true)
    picker.cancel()
    expect(picker.isActive).toBe(false)
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint })
    picker.destroy()
  })

  test('selected highlight follows viewport changes and hides after disconnection', async () => {
    const picker = new ElementPicker(mockContext()), target = document.createElement('button'); document.body.append(target)
    let left = 10; target.getBoundingClientRect = () => ({ x: left, y: 20, left, top: 20, right: left + 80, bottom: 50, width: 80, height: 30, toJSON() {} } as DOMRect)
    picker.highlight(target); const overlay = document.querySelector<HTMLElement>('[data-theme-studio-inspector="selected-overlay"]')!
    expect(overlay.style.transform).toContain('10px')
    left = 42; document.dispatchEvent(new window.Event('scroll')); await new Promise((resolve) => window.setTimeout(resolve, 25)); expect(overlay.style.transform).toContain('42px')
    target.remove(); document.dispatchEvent(new window.Event('scroll')); await new Promise((resolve) => window.setTimeout(resolve, 25)); expect(overlay.hidden).toBe(true)
    picker.destroy()
  })

  test('preview stylesheets update in place and are removed on teardown', () => {
    const preview = new LiveStylesheet(mockContext())
    expect(document.querySelectorAll('[data-theme-studio-preview]')).toHaveLength(3)
    expect(preview.updateGenerated('.target { background: #123456; }').valid).toBe(true)
    expect(preview.updateCustom('@import url("https://example.com/a.css"); .target { color: red; }').valid).toBe(true)
    expect(document.querySelector('[data-theme-studio-preview="generated"]')?.textContent).toContain('#123456')
    expect(document.querySelector('[data-theme-studio-preview="custom"]')?.textContent).toContain('@import stripped')
    expect(document.querySelector('[data-theme-studio-preview="custom"]')?.textContent).not.toContain('https://example.com')
    preview.destroy()
    expect(document.querySelectorAll('[data-theme-studio-preview]')).toHaveLength(0)
  })

  test('native Style Library dock survives host collapse and closes only when the dock shell is removed', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    const root = document.createElement('div')
    document.body.append(root)

    const hostPanel = document.createElement('aside')
    let contentHost = document.createElement('div')
    const panelRoot = document.createElement('div')
    const header = document.createElement('div')
    hostPanel.append(header, contentHost)
    contentHost.append(panelRoot)
    document.body.append(hostPanel)
    const requestCapture: { options: Record<string, unknown> | null } = { options: null }

    const context = mockContext()
    ;(context as unknown as { ui: unknown }).ui = {
      requestDockPanel(options: Record<string, unknown>) {
        requestCapture.options = options
        return {
          root: panelRoot,
          destroy() { hostPanel.remove(); panelRoot.remove() },
          expand() {
            if (panelRoot.isConnected) return
            contentHost = document.createElement('div')
            hostPanel.append(contentHost)
            contentHost.append(panelRoot)
          },
        }
      },
    }

    const store = new ProjectStore()
    const preview = new LiveStylesheet(context)
    const picker = new ElementPicker(context)
    const studio = new ThemeStudioUI(context, root, store, picker, preview)
    const access = studio as unknown as {
      mountStyleLibrary(): void
      renderStyleLibrary(): void
      setStyleLibraryPresentation(mode: 'fullscreen' | 'dock'): void
      styleLibraryOpen: boolean
      styleLibraryPresentation: 'fullscreen' | 'dock'
      styleLibraryRoot: HTMLElement | null
    }

    access.mountStyleLibrary()
    access.styleLibraryOpen = true
    access.renderStyleLibrary()
    access.setStyleLibraryPresentation('dock')

    expect(requestCapture.options?.showCollapsedTitle).toBe(true)
    expect(access.styleLibraryPresentation).toBe('dock')
    const libraryRoot = access.styleLibraryRoot
    expect(libraryRoot?.isConnected).toBe(true)
    expect(libraryRoot?.querySelector('.ts-style-library-modal')).not.toBeNull()

    // Spindle collapses by unmounting its content host. The extension root is
    // intentionally detached during that time and must remain live state.
    contentHost.remove()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(panelRoot.isConnected).toBe(false)
    expect(hostPanel.isConnected).toBe(true)
    expect(access.styleLibraryPresentation).toBe('dock')
    expect(access.styleLibraryOpen).toBe(true)
    expect(access.styleLibraryRoot).toBe(libraryRoot)
    expect(libraryRoot?.querySelector('.ts-style-library-modal')).not.toBeNull()

    // Expanding reattaches the same live extension root, preserving the library.
    contentHost = document.createElement('div')
    hostPanel.append(contentHost)
    contentHost.append(panelRoot)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(panelRoot.isConnected).toBe(true)
    expect(libraryRoot?.isConnected).toBe(true)
    expect(access.styleLibraryPresentation).toBe('dock')

    // Removing the native shell is the real close signal.
    hostPanel.remove()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(access.styleLibraryPresentation).toBe('fullscreen')
    expect(access.styleLibraryOpen).toBe(false)

    studio.destroy(); picker.destroy(); preview.destroy()
  })

  test('Apply and edit collapses and preserves a native Style Library dock for return browsing', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    const root = document.createElement('div')
    document.body.append(root)

    const hostPanel = document.createElement('aside')
    let contentHost = document.createElement('div')
    const panelRoot = document.createElement('div')
    hostPanel.append(contentHost)
    contentHost.append(panelRoot)
    document.body.append(hostPanel)
    let destroyCount = 0
    let collapseCount = 0
    let expandCount = 0

    const context = mockContext()
    ;(context as unknown as { ui: unknown }).ui = {
      requestDockPanel() {
        return {
          root: panelRoot,
          destroy() { destroyCount += 1; hostPanel.remove(); panelRoot.remove() },
          collapse() { collapseCount += 1; contentHost.remove() },
          expand() {
            expandCount += 1
            if (panelRoot.isConnected) return
            contentHost = document.createElement('div')
            hostPanel.append(contentHost)
            contentHost.append(panelRoot)
          },
        }
      },
    }

    const store = new ProjectStore()
    const preview = new LiveStylesheet(context)
    const picker = new ElementPicker(context)
    const studio = new ThemeStudioUI(context, root, store, picker, preview)
    const access = studio as unknown as {
      mountStyleLibrary(): void
      renderStyleLibrary(): void
      openStyleLibrary(): void
      setStyleLibraryPresentation(mode: 'fullscreen' | 'dock'): void
      styleLibraryOpen: boolean
      styleLibraryPresentation: 'fullscreen' | 'dock'
      styleLibraryRoot: HTMLElement | null
      styleLibraryOverlayRoot: HTMLElement | null
      styleLibraryArea: 'all' | 'message' | 'prose' | 'avatar' | 'composer' | 'global'
      workspace: 'design' | 'code' | 'themes'
    }

    access.mountStyleLibrary()
    access.styleLibraryOpen = true
    access.styleLibraryArea = 'message'
    access.renderStyleLibrary()
    access.setStyleLibraryPresentation('dock')

    expect(access.styleLibraryPresentation).toBe('dock')
    expect(hostPanel.isConnected).toBe(true)
    const dockRoot = access.styleLibraryRoot
    const initialExpandCount = expandCount
    const edit = dockRoot?.querySelector<HTMLButtonElement>('[data-edit-common-preset]:not([disabled])')
    expect(edit).not.toBeNull()
    edit?.click()

    expect(collapseCount).toBe(1)
    expect(destroyCount).toBe(0)
    expect(hostPanel.isConnected).toBe(true)
    expect(panelRoot.isConnected).toBe(false)
    expect(access.styleLibraryPresentation).toBe('dock')
    expect(access.styleLibraryOpen).toBe(true)
    expect(access.styleLibraryRoot).toBe(dockRoot)
    expect(access.styleLibraryRoot).not.toBe(access.styleLibraryOverlayRoot)
    expect(access.styleLibraryArea).toBe('message')
    expect(access.workspace).toBe('design')

    // Browse styles should return to the same dock rather than opening the
    // fullscreen overlay and forcing the user to choose Dock left again.
    access.openStyleLibrary()
    expect(expandCount).toBe(initialExpandCount + 1)
    expect(panelRoot.isConnected).toBe(true)
    expect(access.styleLibraryPresentation).toBe('dock')
    expect(access.styleLibraryOpen).toBe(true)
    expect(access.styleLibraryRoot).toBe(dockRoot)
    expect(dockRoot?.querySelector('.ts-style-library-modal')).not.toBeNull()

    studio.destroy(); picker.destroy(); preview.destroy()
  })

  test('live preview resolves canonical theme asset paths without mutating generated CSS', () => {
    const preview = new LiveStylesheet(mockContext())
    preview.setThemeAssets([{ path: './assets/mark.svg', contentUrl: 'blob:http://localhost/runtime-mark' }])
    const canonical = '.target { background-image: url("./assets/mark.svg"); }'
    expect(preview.updateGenerated(canonical).valid).toBe(true)
    const injected = document.querySelector('[data-theme-studio-preview="generated"]')?.textContent ?? ''
    expect(injected).toContain('blob:http://localhost/runtime-mark')
    expect(injected).not.toContain('./assets/mark.svg')
    expect(canonical).toContain('./assets/mark.svg')
    preview.destroy()
  })

  test('runtime selection resolves a native identity and live match count', () => {
    const component: NativeThemeComponent = {
      id: 'src/components/chat/BubbleMessage',
      label: 'BubbleMessage',
      area: 'Chat',
      sources: ['css', 'tsx'],
      selectors: ['[data-component="BubbleMessage"]'],
      cssClasses: ['bubble'],
      nativeKey: 'src/components/chat/BubbleMessage',
    }
    document.body.innerHTML = `
      <article data-component="BubbleMessage"></article>
      <article data-component="BubbleMessage"></article>
    `
    const selected = document.querySelector('[data-component="BubbleMessage"]')!
    const resolution = resolveElement(selected, [component])
    expect(resolution.nativeContext?.component.label).toBe('BubbleMessage')
    expect(resolution.target.recommended.selector).toBe('[data-component="BubbleMessage"]')
    expect(resolution.target.recommended.matchCount).toBe(2)
    expect(resolution.target.recommended.stability).toBe('high')
  })

  test('Design workspace browses the 204-entry native catalog and creates a gradient packet', () => {
    const context = mockContext()
    const root = document.createElement('div')
    document.body.append(root)
    const store = new ProjectStore()
    const preview = new LiveStylesheet(context)
    const picker = new ElementPicker(context)
    const studio = new ThemeStudioUI(context, root, store, picker, preview)
    seedGeneratedCatalog(studio)
    studio.render()

    expect(root.querySelector<HTMLInputElement>('[data-search="components"]')?.placeholder).toContain('204 components')
    root.querySelector<HTMLButtonElement>('[data-component-id="src/components/panels/character-browser/CharacterCard"]')?.click()
    root.querySelector<HTMLButtonElement>('[data-action="toggle-style-menu"]')?.click()
    root.querySelector<HTMLButtonElement>('[data-add-packet="background"]')?.click()
    expect(store.activeProject.componentOverrides).toHaveLength(1)
    expect(store.activeProject.componentOverrides[0].states.normal[0].type).toBe('background')
    expect(store.activeProject.componentOverrides[0].states.normal[0].type === 'background' && store.activeProject.componentOverrides[0].states.normal[0].mode).toBe('solid')

    root.querySelector<HTMLButtonElement>('[data-mode="gradient"]')?.click()
    expect(store.activeProject.componentOverrides[0].states.normal[0].type === 'background' && store.activeProject.componentOverrides[0].states.normal[0].mode).toBe('gradient')
    expect(root.querySelector('.ts-gradient-preview')).not.toBeNull()

    studio.destroy()
    picker.destroy()
    preview.destroy()
  })

  test('mobile floating workbench cycles inspector density without shrinking persistent controls', () => {
    const context = mockContext(); const root = document.createElement('div'); document.body.append(root)
    const store = new ProjectStore(); const preview = new LiveStylesheet(context); const picker = new ElementPicker(context); const studio = new ThemeStudioUI(context, root, store, picker, preview)
    const access = studio as unknown as { mountWidget(): void }
    access.mountWidget()
    const frame = document.querySelector<HTMLElement>('.ts-floating-editor')!
    const density = frame.querySelector<HTMLButtonElement>('[data-widget-action="cycle-density"]')!
    const minimize = frame.querySelector<HTMLButtonElement>('[data-widget-action="dock"]')!
    expect(frame.dataset.mobileDensity).toBe('100')
    expect(density.textContent).toBe('100%')
    density.click(); expect(frame.dataset.mobileDensity).toBe('80'); expect(density.textContent).toBe('80%')
    density.click(); expect(frame.dataset.mobileDensity).toBe('60'); expect(density.textContent).toBe('60%')
    density.click(); expect(frame.dataset.mobileDensity).toBe('100'); expect(density.textContent).toBe('100%')
    expect(minimize.getAttribute('aria-label')).toContain('Minimize')
    expect(minimize.querySelector('svg')).not.toBeNull()
    expect(THEME_STUDIO_CSS).toContain('--ts-mobile-scroll-gutter:18px')
    expect(THEME_STUDIO_CSS).toContain('[data-mobile-density="80"]')
    expect(THEME_STUDIO_CSS).toContain('.ts-inspector-density')
    expect(THEME_STUDIO_CSS).not.toContain('--ts-mobile-density-width')
    expect(THEME_STUDIO_CSS).toContain('width:100%;\n    max-width:100%;')
    studio.destroy(); picker.destroy(); preview.destroy()
  })

  test('rerendering controls preserves the drawer scroll position', () => {
    const context = mockContext(); const root = document.createElement('div'); document.body.append(root)
    const store = new ProjectStore(); const preview = new LiveStylesheet(context); const picker = new ElementPicker(context); const studio = new ThemeStudioUI(context, root, store, picker, preview)
    seedGeneratedCatalog(studio)
    studio.render(); root.querySelector<HTMLButtonElement>('[data-component-id="src/components/panels/character-browser/CharacterCard"]')?.click()
    const scroll = root.querySelector<HTMLElement>('.ts-scroll')!; scroll.scrollTop = 240
    root.querySelector<HTMLButtonElement>('[data-action="toggle-style-menu"]')?.click()
    expect(root.querySelector<HTMLElement>('.ts-scroll')?.scrollTop).toBe(240)
    root.querySelector<HTMLButtonElement>('[data-add-packet="text"]')?.click()
    expect(root.querySelector<HTMLElement>('.ts-scroll')?.scrollTop).toBe(240)
    studio.destroy(); picker.destroy(); preview.destroy()
  })

  test('fixed Width uses a bounded slider while exact values remain canonical outside its range', () => {
    const context = mockContext(); const root = document.createElement('div'); document.body.append(root)
    const store = new ProjectStore(); const preview = new LiveStylesheet(context); const picker = new ElementPicker(context); const studio = new ThemeStudioUI(context, root, store, picker, preview)
    seedGeneratedCatalog(studio)
    studio.render(); root.querySelector<HTMLButtonElement>('[data-component-id="src/components/panels/character-browser/CharacterCard"]')?.click(); root.querySelector<HTMLButtonElement>('[data-action="toggle-style-menu"]')?.click(); root.querySelector<HTMLButtonElement>('[data-add-packet="size"]')?.click()
    const mode = root.querySelector<HTMLSelectElement>('[data-packet-field="size-width-mode"]')!; mode.value = 'fixed'; mode.dispatchEvent(new window.Event('change'))
    const exact = root.querySelector<HTMLInputElement>('input[type="number"][data-packet-field="size-width-value"]')!; exact.value = '5000'; exact.dispatchEvent(new window.Event('change'))
    const unit = root.querySelector<HTMLSelectElement>('[data-packet-field="size-width-unit"]')!; unit.value = 'rem'; unit.dispatchEvent(new window.Event('change'))
    const packet = store.activeProject.componentOverrides[0].states.normal[0]
    expect(packet.type === 'size' && packet.width).toEqual({ mode: 'fixed', value: 5000, unit: 'rem' })
    expect(root.querySelector<HTMLInputElement>('input[type="range"][data-packet-field="size-width-value"]')?.max).toBe('80')
    expect(root.querySelector<HTMLInputElement>('input[type="number"][data-packet-field="size-width-value"]')?.value).toBe('5000')
    studio.destroy(); picker.destroy(); preview.destroy()
  })


  test('Quick Style Reset peels only that recipe and restores the layer underneath', () => {
    const context = mockContext(); const root = document.createElement('div'); document.body.append(root)
    const store = new ProjectStore(); const preview = new LiveStylesheet(context); const picker = new ElementPicker(context); const studio = new ThemeStudioUI(context, root, store, picker, preview)
    const recipes = studio as unknown as { applyCommonPreset(id: string, openEditor?: boolean, renderAfter?: boolean, recordRecent?: boolean): void; resetCommonPreset(id: string, renderAfter?: boolean): void }
    recipes.applyCommonPreset('prose-editorial-suite', false, false, false)
    const selector = KNOWN_PART_ROLES['message.h1'].selectors[0].selector
    const packets = () => store.activeProject.componentOverrides.find((entry) => entry.target.selector === selector)?.states.normal ?? []
    const suiteTypography = packets().find((packet) => packet.type === 'typography')
    expect(suiteTypography).toBeDefined()
    recipes.applyCommonPreset('prose-headings-editorial', false, false, false)
    const individualTypography = packets().find((packet) => packet.type === 'typography')
    expect(individualTypography?.id).not.toBe(suiteTypography?.id)
    recipes.resetCommonPreset('prose-headings-editorial', false)
    expect(packets().find((packet) => packet.type === 'typography')?.id).toBe(suiteTypography?.id)
    // The rest of the suite returns after the coordinated H1-H4 heading layer peels away.
    const h2Selector = KNOWN_PART_ROLES['message.h2'].selectors[0].selector
    expect(store.activeProject.componentOverrides.find((entry) => entry.target.selector === h2Selector)?.states.normal?.length).toBeGreaterThan(0)
    studio.destroy(); picker.destroy(); preview.destroy()
  })

  test('Recipe palette color experimentation does not flood Recent colors', () => {
    localStorage.setItem('theme-studio:recent-colors', JSON.stringify(['#112233']))
    const context = mockContext(); const root = document.createElement('div'); document.body.append(root)
    const store = new ProjectStore(); const preview = new LiveStylesheet(context); const picker = new ElementPicker(context); const studio = new ThemeStudioUI(context, root, store, picker, preview)
    studio.render(); root.querySelector<HTMLButtonElement>('[data-workspace="themes"]')?.click()
    const accent = root.querySelector<HTMLInputElement>('input[type="color"][data-quick-color="accent"]')!
    accent.value = '#00ff00'; accent.dispatchEvent(new window.Event('input')); accent.dispatchEvent(new window.Event('change'))
    expect(localStorage.getItem('theme-studio:recent-colors')).toBe(JSON.stringify(['#112233']))
    studio.destroy(); picker.destroy(); preview.destroy()
  })

  test('Both message scope does not borrow a one-sided authored packet and new edits compile to both branches', () => {
    const context = mockContext(); const root = document.createElement('div'); document.body.append(root)
    document.body.insertAdjacentHTML('afterbegin', `
      <div data-component="BubbleMessage" class="_card_1hvlc_3 _character_1hvlc_111">
        <div class="_bubble_1hvlc_513"><div class="_header_1hvlc_553"><div id="assistant-header-left" class="_headerLeft_1hvlc_587"></div></div></div>
      </div>
      <div data-component="BubbleMessage" class="_card_1hvlc_3 _user_1hvlc_129">
        <div class="_bubble_1hvlc_513"><div class="_header_1hvlc_553"><div id="user-header-left" class="_headerLeft_1hvlc_587"></div></div></div>
      </div>`)
    const component: NativeThemeComponent = { id: 'src/BubbleMessage', label: 'BubbleMessage', area: 'Messages', sources: ['css', 'tsx'], selectors: ['[data-component="BubbleMessage"]'], cssClasses: ['card', 'character', 'user', 'bubble', 'header', 'headerLeft'], nativeKey: 'src/BubbleMessage' }
    const selection = resolveElement(document.querySelector('#assistant-header-left')!, [component])
    const headerScopes = selection.scopeCandidates.filter((scope) => scope.type === 'native-part' && scope.label === 'Header Left')
    const assistant = headerScopes.find((scope) => scope.messageSide === 'assistant')!
    const both = headerScopes.find((scope) => scope.messageSide === 'both')!
    expect(assistant).toBeDefined(); expect(both).toBeDefined()

    const store = new ProjectStore()
    const assistantPacket = createStylePacket('spacing')
    store.upsertPacket({ selector: assistant.selector, strategy: assistant.strategy, stability: assistant.stability, persistence: assistant.persistence, source: assistant.source, label: assistant.label, nativeComponentId: assistant.nativeComponentId ?? assistant.componentId, nativeContextSelector: assistant.nativeContextSelector, localSelector: assistant.localSelector }, assistantPacket)

    selection.activeScopeId = both.id
    const preview = new LiveStylesheet(context); const picker = new ElementPicker(context); const studio = new ThemeStudioUI(context, root, store, picker, preview)
    const access = studio as unknown as { selection: ReturnType<typeof resolveElement> }
    access.selection = selection
    studio.render()

    // The assistant-only packet is context, not the editable Both stack.
    expect(root.querySelector(`[data-packet-id="${assistantPacket.id}"]`)).toBeNull()
    root.querySelector<HTMLButtonElement>('[data-action="toggle-style-menu"]')?.click()
    root.querySelector<HTMLButtonElement>('[data-add-packet="background"]')?.click()
    const bothOverride = store.activeProject.componentOverrides.find((override) => override.target.selector === both.selector)
    expect(bothOverride).toBeDefined()
    const css = compileThemeProject(store.activeProject)
    expect(css).toContain(':not([class*="_user_"]) [class*="_headerLeft_"]')
    expect(css).toContain('[class*="_user_"] [class*="_headerLeft_"]')

    studio.destroy(); picker.destroy(); preview.destroy()
  })

  test('Both message scope highlights and forced-state previews every mounted branch', () => {
    const context = mockContext(); const root = document.createElement('div'); document.body.append(root)
    document.body.insertAdjacentHTML('afterbegin', `
      <div data-component="BubbleMessage" class="_card_1hvlc_3 _character_1hvlc_111"><div id="assistant-header-left" class="_headerLeft_1hvlc_587"></div></div>
      <div data-component="BubbleMessage" class="_card_1hvlc_3 _user_1hvlc_129"><div id="user-header-left" class="_headerLeft_1hvlc_587"></div></div>`)
    const component: NativeThemeComponent = { id: 'src/BubbleMessage', label: 'BubbleMessage', area: 'Messages', sources: ['css', 'tsx'], selectors: ['[data-component="BubbleMessage"]'], cssClasses: ['card', 'character', 'user', 'headerLeft'], nativeKey: 'src/BubbleMessage' }
    const selection = resolveElement(document.querySelector('#assistant-header-left')!, [component])
    const active = selection.scopeCandidates.find((scope) => scope.id === selection.activeScopeId)!
    const both = selection.scopeCandidates.find((scope) => scope.messageFamilyId === active.messageFamilyId && scope.messageSide === 'both')!
    selection.activeScopeId = both.id
    const store = new ProjectStore(); const preview = new LiveStylesheet(context); const picker = new ElementPicker(context); const studio = new ThemeStudioUI(context, root, store, picker, preview)
    const access = studio as unknown as { selection: ReturnType<typeof resolveElement>; editingState: 'hover'; applyPreviewMarker(): void; syncSelectionHighlight(): void }
    access.selection = selection; access.editingState = 'hover'; access.applyPreviewMarker(); access.syncSelectionHighlight()
    expect(document.querySelector('#assistant-header-left')?.getAttribute('data-theme-studio-preview-state')).toBe('hover')
    expect(document.querySelector('#user-header-left')?.getAttribute('data-theme-studio-preview-state')).toBe('hover')
    studio.destroy()
    expect(document.querySelector('#assistant-header-left')?.hasAttribute('data-theme-studio-preview-state')).toBe(false)
    expect(document.querySelector('#user-header-left')?.hasAttribute('data-theme-studio-preview-state')).toBe(false)
    picker.destroy(); preview.destroy()
  })

  test('forced state marker is extension-owned and removed on teardown', () => {
    const context = mockContext(); const root = document.createElement('div'); const target = document.createElement('button'); target.className = '_testButton_abcd_1'; document.body.append(target, root)
    const store = new ProjectStore(); const preview = new LiveStylesheet(context); const picker = new ElementPicker(context); const studio = new ThemeStudioUI(context, root, store, picker, preview)
    const access = studio as unknown as { selection: ReturnType<typeof resolveElement>; editingState: 'hover'; applyPreviewMarker(): void }
    access.selection = resolveElement(target, []); access.editingState = 'hover'; access.applyPreviewMarker()
    expect(target.getAttribute('data-theme-studio-preview-state')).toBe('hover')
    studio.destroy(); expect(target.hasAttribute('data-theme-studio-preview-state')).toBe(false)
    picker.destroy(); preview.destroy()
  })
})
