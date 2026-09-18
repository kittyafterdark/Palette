import type { SpindleFrontendContext, SpindleThemePackDraft, SpindleThemePackImportResult, SpindleThemePackInstallResult } from 'lumiverse-spindle-types'
import { compileComponentOverride, compileThemeGlobalLayers } from '../compiler/compiler'
import type { ThemeStudioProject } from '../project/model'
import type { NativeThemeComponent, NativeThemeVariable } from '../registry/types'
import { nativeVariableMap } from './variables'

function joinCss(parts: string[]): string { return parts.map((value) => value.trim()).filter(Boolean).join('\n\n') }

export function projectToNativeDraft(project: ThemeStudioProject, components: NativeThemeComponent[], variables: NativeThemeVariable[], boostBaseline?: Record<string, string>): SpindleThemePackDraft {
  const componentIds = new Set(components.map((component) => component.id))
  const grouped = new Map<string, string[]>()
  // Boost stays a live pre-CSS layer while authoring, but native handoff is the distribution
  // boundary: bake the current Boost result into Global so exported/installed themes keep it.
  // Prefer the runtime's canonical worker baseline so a catalog already painted by Boost can
  // never become Boost's own export source.
  // Lumiverse owns its native variables on the root inline style. Native handoff must
  // preserve Palette's live root-inline-important authority or baked Boost/token values
  // are present in Global CSS but lose the cascade and become inert.
  const globalParts: string[] = [compileThemeGlobalLayers(project, boostBaseline ?? nativeVariableMap(variables), true, 'strong')]
  for (const override of project.componentOverrides) {
    const css = compileComponentOverride(override)
    if (!css.trim()) continue
    const nativeId = override.target.nativeComponentId
    if (nativeId && componentIds.has(nativeId)) {
      const list = grouped.get(nativeId) ?? []
      list.push(css)
      grouped.set(nativeId, list)
    } else globalParts.push(css)
  }
  if (project.customCss.trim()) globalParts.push(`/* Palette · Custom CSS */\n${project.customCss.trim()}`)
  return {
    name: project.name,
    author: 'Palette',
    description: 'Authored visually in Lumiverse Palette.',
    globalCSS: joinCss(globalParts),
    components: Object.fromEntries([...grouped].map(([id, css]) => [id, { css: joinCss(css), enabled: true }])),
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
