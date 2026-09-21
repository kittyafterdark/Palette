import type { SpindleFrontendContext, SpindleThemePackDraft, SpindleThemePackImportResult, SpindleThemePackInstallResult } from 'lumiverse-spindle-types'
import { compileComponentOverride, compileThemeGlobalLayers } from '../compiler/compiler'
import type { ThemeStudioProject } from '../project/model'
import type { NativeThemeComponent, NativeThemeVariable } from '../registry/types'
import { nativeVariableMap } from './variables'

function joinCss(parts: string[]): string { return parts.map((value) => value.trim()).filter(Boolean).join('\n\n') }

export function projectToNativeDraft(project: ThemeStudioProject, components: NativeThemeComponent[], variables: NativeThemeVariable[], boostBaseline?: Record<string, string>): SpindleThemePackDraft {
  const componentIds = new Set(components.map((component) => component.id))
  const sourceComponents = project.sourceTheme?.components ?? {}
  const grouped = new Map<string, { css: string[]; tsx?: string; enabled: boolean }>()
  for (const [id, component] of Object.entries(sourceComponents)) grouped.set(id, { css: component.css.trim() ? [component.css] : [], tsx: component.tsx, enabled: component.enabled })

  // Source CSS is the immutable-by-default baseline. Palette's global compiler
  // layers come afterward, followed by generated target rules and handwritten
  // Custom CSS. This keeps visual edits non-destructive while preserving a
  // source fork exactly when the user explicitly edits it.
  const globalParts: string[] = []
  if (project.sourceTheme?.globalCSS.trim()) globalParts.push(project.sourceTheme.globalCSS)

  // Boost stays a live pre-CSS layer while authoring, but native handoff is the distribution
  // boundary: bake the current Boost result into Global so exported/installed themes keep it.
  // Prefer the runtime's canonical worker baseline so a catalog already painted by Boost can
  // never become Boost's own export source.
  // Lumiverse owns its native variables on the root inline style. Native handoff must
  // preserve Palette's live root-inline-important authority or baked Boost/token values
  // are present in Global CSS but lose the cascade and become inert.
  globalParts.push(compileThemeGlobalLayers(project, boostBaseline ?? nativeVariableMap(variables), true, 'strong'))
  for (const override of project.componentOverrides) {
    const css = compileComponentOverride(override)
    if (!css.trim()) continue
    const nativeId = override.target.nativeComponentId
    if (nativeId && componentIds.has(nativeId)) {
      const source = sourceComponents[nativeId]
      // A disabled imported native section stays disabled. Palette-generated
      // overrides still work, but live in Global rather than reviving source CSS.
      if (source && !source.enabled) {
        globalParts.push(css)
        continue
      }
      const bucket = grouped.get(nativeId) ?? { css: [], tsx: undefined, enabled: true }
      bucket.css.push(css)
      bucket.enabled = true
      grouped.set(nativeId, bucket)
    } else globalParts.push(css)
  }
  if (project.customCss.trim()) globalParts.push(`/* Palette · Custom CSS */\n${project.customCss.trim()}`)
  return {
    name: project.name,
    author: project.sourceTheme?.author?.trim() || 'Palette',
    description: project.sourceTheme?.description?.trim() || 'Authored visually in Lumiverse Palette.',
    globalCSS: joinCss(globalParts),
    components: Object.fromEntries([...grouped].map(([id, value]) => [id, { css: joinCss(value.css), ...(value.tsx !== undefined ? { tsx: value.tsx } : {}), enabled: value.enabled }])),
    assetBundleId: project.nativeAssetBundleId ?? null,
  }
}

export async function exportLumitheme(ctx: SpindleFrontendContext, draft: SpindleThemePackDraft): Promise<Uint8Array> {
  return ctx.theme.packs.exportDraft(draft)
}

export async function importLumitheme(ctx: SpindleFrontendContext, bytes: Uint8Array): Promise<SpindleThemePackImportResult> {
  return ctx.theme.packs.importArchive(bytes)
}

export async function sendToLumiverse(ctx: SpindleFrontendContext, draft: SpindleThemePackDraft, saveToLibrary = true): Promise<SpindleThemePackInstallResult> {
  return ctx.theme.packs.installDraft(draft, { apply: true, saveToLibrary })
}
