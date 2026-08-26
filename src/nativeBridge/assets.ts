import type { SpindleFrontendContext, SpindleThemeAsset, SpindleUploadFile } from 'lumiverse-spindle-types'
import type { NativeThemeAsset } from '../registry/types'

export function adaptNativeAsset(asset: SpindleThemeAsset): NativeThemeAsset {
  return {
    id: asset.id,
    name: asset.originalFilename,
    path: asset.cssPath,
    contentUrl: asset.contentUrl,
    slug: asset.slug,
    mimeType: asset.mimeType,
    size: asset.sizeBytes,
    bundleId: asset.bundleId,
    tags: asset.tags ? [...asset.tags] : undefined,
    metadata: asset.metadata ? structuredClone(asset.metadata) : undefined,
  }
}

export async function listNativeThemeAssets(ctx: SpindleFrontendContext, bundleId: string): Promise<NativeThemeAsset[]> {
  return (await ctx.theme.assets.list(bundleId)).map(adaptNativeAsset)
}

/** Public active-theme bundle lookup. Useful for borrowing an existing theme asset
 * into a Theme Studio project without guessing private filesystem URLs. */
export function activeNativeThemeBundleId(ctx: SpindleFrontendContext): string | null {
  return ctx.theme.assets.getActiveBundleId()
}

/** Clone a public native-theme asset into Theme Studio's project-owned bundle. */
export async function cloneNativeThemeAssetToBundle(ctx: SpindleFrontendContext, asset: NativeThemeAsset, bundleId: string): Promise<NativeThemeAsset> {
  const bytes = await ctx.theme.assets.getBytes(asset.id)
  const uploaded = await ctx.theme.assets.upload({
    name: asset.name || asset.slug || 'asset',
    mimeType: asset.mimeType || 'application/octet-stream',
    sizeBytes: bytes.byteLength,
    bytes,
  }, {
    bundleId,
    ...(asset.slug ? { slug: asset.slug } : {}),
    ...(asset.tags?.length ? { tags: [...asset.tags] } : {}),
    ...(asset.metadata ? { metadata: structuredClone(asset.metadata) } : {}),
  })
  return adaptNativeAsset(uploaded)
}

export async function fileToSpindleUpload(file: File): Promise<SpindleUploadFile> {
  return { name: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, bytes: new Uint8Array(await file.arrayBuffer()) }
}

export async function uploadNativeThemeAsset(ctx: SpindleFrontendContext, file: File, bundleId: string): Promise<NativeThemeAsset> {
  const uploaded = await ctx.theme.assets.upload(await fileToSpindleUpload(file), { bundleId })
  return adaptNativeAsset(uploaded)
}
