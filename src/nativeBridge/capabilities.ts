import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import type { NativeThemeCapabilities } from '../registry/types'

export const THEME_AUTHORING_CAPABILITIES = {
  assets: 'theme-assets-v1',
  packs: 'theme-packs-v1',
  catalog: 'theme-catalog-v1',
  editor: 'theme-editor-navigation-v1',
} as const

export function hasHostCapability(ctx: SpindleFrontendContext, key: string, minimum = 1): boolean {
  return (ctx.host.capabilities[key] ?? 0) >= minimum
}

/** Public capability detection only; no fetch/store heuristics and no private Lumiverse knowledge. */
export function getNativeThemeCapabilities(ctx: SpindleFrontendContext): NativeThemeCapabilities {
  const assets = hasHostCapability(ctx, THEME_AUTHORING_CAPABILITIES.assets)
  const packs = hasHostCapability(ctx, THEME_AUTHORING_CAPABILITIES.packs)
  const catalog = hasHostCapability(ctx, THEME_AUTHORING_CAPABILITIES.catalog)
  const editor = hasHostCapability(ctx, THEME_AUTHORING_CAPABILITIES.editor)
  return {
    componentRegistry: catalog,
    cssVariables: catalog,
    listAssets: assets,
    uploadAssets: assets,
    exportTheme: packs,
    exportLumitheme: packs,
    importTheme: packs,
    applyTheme: packs,
    openNativeEditor: editor,
  }
}
