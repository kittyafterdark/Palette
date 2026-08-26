import { describe, expect, test } from 'bun:test'
import type { SpindleFrontendContext, SpindleThemeAsset } from 'lumiverse-spindle-types'
import { activeNativeThemeBundleId, adaptNativeAsset, cloneNativeThemeAssetToBundle } from '../src/nativeBridge/assets'
import { getNativeThemeCapabilities, THEME_AUTHORING_CAPABILITIES } from '../src/nativeBridge/capabilities'
import { adaptNativeComponentMetadata, groupNativeComponents, listNativeComponents } from '../src/nativeBridge/components'
import { projectToNativeDraft } from '../src/nativeBridge/themes'
import { listNativeThemeVariables, nativeVariableMap } from '../src/nativeBridge/variables'
import { createProject, createStylePacket } from '../src/project/model'

function context(capabilities: Record<string, number> = {}): SpindleFrontendContext {
  return {
    host: { capabilities },
    theme: {
      assets: {
        getActiveBundleId: () => 'bundle-active',
        createBundle: () => 'bundle-new',
        list: async () => [],
        upload: async () => { throw new Error('not used') },
        update: async () => { throw new Error('not used') },
        delete: async () => {},
        optimizeWebp: async () => { throw new Error('not used') },
        getBytes: async () => new Uint8Array(),
      },
      packs: {
        exportDraft: async () => new Uint8Array(),
        importArchive: async () => ({ draft: { name: 'Imported', globalCSS: '' }, assets: [], warnings: [] }),
        installDraft: async () => ({ bundleId: 'installed', applied: true, savedToLibrary: true, assetCount: 0, componentCount: 0 }),
      },
      catalog: {
        listComponents: () => [{ id: 'BubbleMessage', label: 'BubbleMessage', category: 'Chat', selector: '[data-component="BubbleMessage"]', hasCss: true, hasTsx: true }],
        listVariables: () => [{ name: '--lumiverse-primary', defaultValue: '#fff', value: '#eee', category: 'Primary' }],
      },
      openEditor: () => true,
    },
  } as unknown as SpindleFrontendContext
}

describe('public ctx.theme bridge', () => {
  test('feature-detects the four versioned host capabilities without heuristics', () => {
    const ctx = context({
      [THEME_AUTHORING_CAPABILITIES.assets]: 1,
      [THEME_AUTHORING_CAPABILITIES.packs]: 1,
      [THEME_AUTHORING_CAPABILITIES.catalog]: 1,
      [THEME_AUTHORING_CAPABILITIES.editor]: 1,
    })
    expect(getNativeThemeCapabilities(ctx)).toEqual({
      componentRegistry: true,
      cssVariables: true,
      listAssets: true,
      uploadAssets: true,
      exportTheme: true,
      exportLumitheme: true,
      importTheme: true,
      applyTheme: true,
      openNativeEditor: true,
    })
    expect(getNativeThemeCapabilities(context()).exportLumitheme).toBe(false)
  })

  test('adapts the sanitized native catalog without source-path knowledge', () => {
    const ctx = context()
    const [component] = listNativeComponents(ctx)
    expect(component.id).toBe('BubbleMessage')
    expect(component.area).toBe('Chat')
    expect(component.sources).toEqual(['css', 'tsx'])
    expect(component.selectors).toEqual(['[data-component="BubbleMessage"]'])
    expect(groupNativeComponents([component])).toEqual([{ area: 'Chat', components: [component] }])

    const adapted = adaptNativeComponentMetadata({ id: 'InputArea', label: 'InputArea', category: 'Chat', selector: '[data-component="InputArea"]', hasCss: true, hasTsx: false })
    expect(adapted.sources).toEqual(['css'])
    expect((adapted as unknown as Record<string, unknown>).cssPath).toBeUndefined()
  })

  test('uses the public variable catalog as the Boost baseline', () => {
    const vars = listNativeThemeVariables(context())
    expect(vars).toEqual([{ name: '--lumiverse-primary', defaultValue: '#fff', value: '#eee', category: 'Primary' }])
    expect(nativeVariableMap(vars)).toEqual({ '--lumiverse-primary': '#eee' })
  })

  test('reads the active theme bundle through the public bridge and can adopt an asset into a project bundle', async () => {
    let uploadBundle = ''
    const ctx = context() as SpindleFrontendContext
    ctx.theme.assets.getBytes = async (assetId: string) => { expect(assetId).toBe('asset-live'); return new Uint8Array([1, 2, 3]) }
    ctx.theme.assets.upload = async (file, options) => {
      uploadBundle = options.bundleId
      expect(file.name).toBe('mark.svg')
      return { id: 'asset-copy', bundleId: options.bundleId, slug: options.slug ?? 'mark', originalFilename: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes, cssPath: './assets/mark.svg', contentUrl: '/api/v1/theme-assets/asset-copy/content' }
    }
    expect(activeNativeThemeBundleId(ctx)).toBe('bundle-active')
    const adopted = await cloneNativeThemeAssetToBundle(ctx, { id: 'asset-live', bundleId: 'bundle-active', name: 'mark.svg', path: './assets/source.svg', contentUrl: '/source', mimeType: 'image/svg+xml', slug: 'mark' }, 'bundle-project')
    expect(uploadBundle).toBe('bundle-project')
    expect(adopted.path).toBe('./assets/mark.svg')
    expect(adopted.bundleId).toBe('bundle-project')
  })

  test('keeps preview URLs and canonical pack CSS paths distinct', () => {
    const source: SpindleThemeAsset = {
      id: 'asset-1', bundleId: 'bundle-1', slug: 'assets/cover.png', originalFilename: 'cover.png', mimeType: 'image/png', sizeBytes: 42,
      cssPath: './assets/cover.png', contentUrl: '/api/v1/theme-assets/asset-1/content', tags: ['cover'], metadata: { focalX: 50 },
    }
    expect(adaptNativeAsset(source)).toEqual({
      id: 'asset-1', name: 'cover.png', path: './assets/cover.png', contentUrl: '/api/v1/theme-assets/asset-1/content', slug: 'assets/cover.png', mimeType: 'image/png', size: 42,
      bundleId: 'bundle-1', tags: ['cover'], metadata: { focalX: 50 },
    })
  })

  test('builds a CSS-only native draft and groups known native components', () => {
    const project = createProject('Bridge Test')
    project.nativeAssetBundleId = 'bundle-project'
    const packet = createStylePacket('background')
    project.componentOverrides.push({
      id: 'override-1',
      target: { selector: '[data-component="BubbleMessage"]', strategy: 'native-registry', stability: 'high', persistence: 'persistent', source: 'native-aware', nativeComponentId: 'BubbleMessage' },
      states: { normal: [packet] },
    })
    project.customCss = '.loose-extension-target { opacity: .8; }'
    const draft = projectToNativeDraft(project, [{ id: 'BubbleMessage', label: 'BubbleMessage', area: 'Chat', sources: ['css', 'tsx'], selectors: ['[data-component="BubbleMessage"]'], cssClasses: [], nativeKey: 'BubbleMessage' }], [])
    expect(draft.name).toBe('Bridge Test')
    expect(draft.assetBundleId).toBe('bundle-project')
    expect(draft.components?.BubbleMessage?.css).toContain('[data-component="BubbleMessage"]')
    expect(draft.globalCSS).toContain('.loose-extension-target')
    expect((draft as unknown as Record<string, unknown>).tsx).toBeUndefined()
    expect((draft.components?.BubbleMessage as unknown as Record<string, unknown>).tsx).toBeUndefined()
    expect(draft.globalCSS).not.toContain('Application-wide Palette Boost')
  })
})
