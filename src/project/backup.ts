import type { SpindleFrontendContext, SpindleThemeAsset } from 'lumiverse-spindle-types'
import { newId, PROJECT_VERSION, STATE_VERSION, type ThemeStudioState } from './model'
import { normalizeState } from './migrations'

interface BackupAsset { asset: SpindleThemeAsset; base64: string }
export interface ThemesBackup {
  format: 'palette-themes-backup'
  version: 1
  createdAt: string
  state: ThemeStudioState
  assets: BackupAsset[]
}

function encode(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  return btoa(binary)
}
function decode(value: string): Uint8Array { return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)) }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function requireAssets(ctx: SpindleFrontendContext): void {
  if (!ctx.host.capabilities['theme-assets-v1']) throw new Error('This backup needs Lumiverse theme asset support.')
}

/** Snapshot before awaiting the host, so edits made during export cannot split the backup. */
export async function createThemesBackup(ctx: SpindleFrontendContext, state: ThemeStudioState): Promise<ThemesBackup> {
  const snapshot = structuredClone(state)
  const assets = new Map<string, SpindleThemeAsset>()
  for (const project of snapshot.projects) {
    if (project.nativeAssetBundleId || project.assets.some((asset) => asset.assetId)) requireAssets(ctx)
    if (project.nativeAssetBundleId) {
      for (const asset of await ctx.theme.assets.list(project.nativeAssetBundleId)) assets.set(asset.id, asset)
    }
    for (const ref of project.assets) {
      if (ref.assetId && !assets.has(ref.assetId)) throw new Error(`Missing uploaded asset in ${project.name}: ${ref.name || ref.path}`)
    }
  }
  const embedded: BackupAsset[] = []
  for (const asset of assets.values()) {
    const bytes = await ctx.theme.assets.getBytes(asset.id)
    embedded.push({ asset: { ...asset, sizeBytes: bytes.length }, base64: encode(bytes) })
  }
  return { format: 'palette-themes-backup', version: 1, createdAt: new Date().toISOString(), state: snapshot, assets: embedded }
}

/** Validate the whole envelope before any host writes; never turn arbitrary JSON into a default theme. */
export function parseThemesBackup(text: string): ThemesBackup {
  const value: unknown = JSON.parse(text)
  if (!record(value) || value.format !== 'palette-themes-backup' || value.version !== 1 || !record(value.state) || !Array.isArray(value.assets)) throw new Error('Choose a supported Palette themes backup file.')
  const state = value.state
  if (typeof state.version !== 'number' || state.version > STATE_VERSION) throw new Error('Update Palette before restoring this backup.')
  if (!Array.isArray(state.projects) || !state.projects.length || !Array.isArray(state.savedStyles)) throw new Error('The backup has no valid theme collection.')
  const ids = new Set<string>()
  for (const project of state.projects) {
    if (!record(project) || typeof project.id !== 'string' || !project.id || ids.has(project.id) || typeof project.name !== 'string' || typeof project.version !== 'number' || project.version > PROJECT_VERSION || !Array.isArray(project.componentOverrides) || !Array.isArray(project.assets)) throw new Error('The backup contains an invalid or unsupported theme.')
    ids.add(project.id)
  }
  if (!ids.has(String(state.activeProjectId))) throw new Error('The backup has an invalid active theme.')
  const assetIds = new Set<string>()
  const bundles = new Set(state.projects.map((project) => project.nativeAssetBundleId).filter(Boolean))
  for (const entry of value.assets) {
    if (!record(entry) || !record(entry.asset) || typeof entry.base64 !== 'string') throw new Error('Invalid embedded theme asset.')
    const asset = entry.asset
    if (['id', 'bundleId', 'slug', 'originalFilename', 'mimeType', 'cssPath', 'contentUrl'].some((key) => typeof asset[key] !== 'string' || !asset[key]) || assetIds.has(String(asset.id)) || !bundles.has(asset.bundleId)) throw new Error('Invalid embedded theme asset metadata.')
    if (entry.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(entry.base64) || decode(entry.base64).length !== asset.sizeBytes) throw new Error('An embedded theme asset is damaged.')
    assetIds.add(String(asset.id))
  }
  for (const project of state.projects) {
    for (const ref of project.assets) if (record(ref) && ref.assetId && !assetIds.has(String(ref.assetId))) throw new Error('The backup is missing an uploaded theme asset.')
  }
  const normalized = normalizeState(state)
  if (normalized.savedStyles.length !== state.savedStyles.length) throw new Error('The backup contains an invalid saved style.')
  return { format: 'palette-themes-backup', version: 1, createdAt: String(value.createdAt), state: normalized, assets: value.assets as unknown as BackupAsset[] }
}

function remap<T>(value: T, replacements: Map<string, string>): T {
  // One pass prevents a new URL being accidentally rewritten by another old prefix.
  const keys = [...replacements.keys()].filter(Boolean).sort((a, b) => b.length - a.length)
  const pattern = keys.length ? new RegExp(keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return pattern ? item.replace(pattern, (match) => replacements.get(match)!) : item
    if (Array.isArray(item)) return item.map(visit)
    if (record(item)) return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, visit(entry)]))
    return item
  }
  return visit(value) as T
}

/** Prepare a complete addition off-store. A failed upload leaves existing projects untouched. */
export async function restoreThemesBackup(ctx: SpindleFrontendContext, backup: ThemesBackup): Promise<ThemeStudioState> {
  if (backup.assets.length) requireAssets(ctx)
  const state = structuredClone(backup.state)
  const replacements = new Map<string, string>()
  const bundles = new Map<string, string>()
  const uploaded: string[] = []
  const replace = (old: string, next: string) => {
    if (replacements.has(old) && replacements.get(old) !== next) throw new Error('Conflicting asset paths in the backup. Restore cancelled to preserve theme references.')
    replacements.set(old, next)
  }
  try {
    for (const project of state.projects) {
      const oldBundle = project.nativeAssetBundleId
      if (!oldBundle) continue
      if (bundles.has(oldBundle)) { project.nativeAssetBundleId = bundles.get(oldBundle); continue }
      const assets = backup.assets.filter((entry) => entry.asset.bundleId === oldBundle)
      // Empty bundles need no host allocation and must not retain another instance's ID.
      project.nativeAssetBundleId = undefined
      if (!assets.length) continue
      const bundleId = ctx.theme.assets.createBundle()
      bundles.set(oldBundle, bundleId)
      project.nativeAssetBundleId = bundleId
      for (const { asset, base64 } of assets) {
        const bytes = decode(base64)
        const next = await ctx.theme.assets.upload({ name: asset.originalFilename, mimeType: asset.mimeType, sizeBytes: bytes.length, bytes }, { bundleId, slug: asset.slug, tags: asset.tags, metadata: asset.metadata })
        uploaded.push(next.id)
        replace(asset.id, next.id)
        replace(asset.contentUrl, next.contentUrl)
        // Pack-safe paths may be the same across instances (e.g. assets/wall.png).
        if (asset.cssPath !== next.cssPath) replace(asset.cssPath, next.cssPath)
      }
    }
    const result = remap(state, replacements)
    const active = state.activeProjectId
    for (const project of result.projects) {
      const oldId = project.id
      project.id = newId('project')
      if (oldId === active) result.activeProjectId = project.id
    }
    for (const style of result.savedStyles) style.id = newId('saved-style')
    return result
  } catch (error) {
    const cleanup = await Promise.allSettled(uploaded.map((id) => ctx.theme.assets.delete(id)))
    if (cleanup.some((result) => result.status === 'rejected')) throw new Error(`${error instanceof Error ? error.message : 'Restore failed'}. Some uploaded assets could not be cleaned up.`)
    throw error
  }
}
