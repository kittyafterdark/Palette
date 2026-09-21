export interface LumithemeArchiveComponentSource {
  css: string
  tsx: string
  enabled: boolean
}

export interface LumithemeArchiveAssetManifestEntry {
  slug: string
  originalFilename?: string
  mimeType?: string
  archivePath: string
}

export interface LumithemeArchiveSource {
  format?: number
  name?: string
  author?: string
  description?: string
  createdAt?: number
  bundleId?: string
  globalCSS: string
  components: Record<string, LumithemeArchiveComponentSource>
  assets: LumithemeArchiveAssetManifestEntry[]
}

const LOCAL_FILE_HEADER = 0x04034b50
const CENTRAL_DIRECTORY_HEADER = 0x02014b50
const END_OF_CENTRAL_DIRECTORY = 0x06054b50
const MAX_EOCD_SEARCH = 0xffff + 22
const MAX_THEME_JSON_BYTES = 4 * 1024 * 1024

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length ? value : undefined
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const floor = Math.max(0, bytes.byteLength - MAX_EOCD_SEARCH)
  for (let offset = bytes.byteLength - 22; offset >= floor; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset
  }
  throw new Error('Invalid .lumitheme archive: ZIP directory footer not found.')
}

interface ZipEntryLocation {
  method: number
  flags: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

function locateZipEntry(bytes: Uint8Array, wantedName: string): ZipEntryLocation {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocd = findEndOfCentralDirectory(bytes)
  const entryCount = view.getUint16(eocd + 10, true)
  const centralSize = view.getUint32(eocd + 12, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error('Unsupported .lumitheme archive: ZIP64 is not supported by Palette source inspection.')
  }
  if (centralOffset + centralSize > bytes.byteLength) throw new Error('Invalid .lumitheme archive: central directory is truncated.')

  const decoder = new TextDecoder()
  let offset = centralOffset
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== CENTRAL_DIRECTORY_HEADER) {
      throw new Error('Invalid .lumitheme archive: malformed central directory entry.')
    }
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const nameStart = offset + 46
    const nameEnd = nameStart + nameLength
    if (nameEnd > bytes.byteLength) throw new Error('Invalid .lumitheme archive: truncated entry name.')
    const name = decoder.decode(bytes.subarray(nameStart, nameEnd))
    if (name === wantedName) return { method, flags, compressedSize, uncompressedSize, localHeaderOffset }
    offset = nameEnd + extraLength + commentLength
  }
  throw new Error(`Invalid .lumitheme archive: ${wantedName} is missing.`)
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot inspect compressed .lumitheme source archives.')
  const owned = bytes.slice()
  const stream = new Blob([owned.buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readZipEntry(bytes: Uint8Array, name: string): Promise<Uint8Array> {
  const location = locateZipEntry(bytes, name)
  if (location.flags & 0x1) throw new Error('Unsupported .lumitheme archive: encrypted ZIP entries are not supported.')
  if (location.uncompressedSize > MAX_THEME_JSON_BYTES) throw new Error('Invalid .lumitheme archive: theme.json is unexpectedly large.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const offset = location.localHeaderOffset
  if (offset + 30 > bytes.byteLength || view.getUint32(offset, true) !== LOCAL_FILE_HEADER) throw new Error('Invalid .lumitheme archive: theme.json local header is missing.')
  const nameLength = view.getUint16(offset + 26, true)
  const extraLength = view.getUint16(offset + 28, true)
  const start = offset + 30 + nameLength + extraLength
  const end = start + location.compressedSize
  if (end > bytes.byteLength) throw new Error('Invalid .lumitheme archive: theme.json payload is truncated.')
  const payload = bytes.subarray(start, end)
  let result: Uint8Array
  if (location.method === 0) result = payload.slice()
  else if (location.method === 8) result = await inflateRaw(payload)
  else throw new Error(`Unsupported .lumitheme archive: theme.json uses ZIP compression method ${location.method}.`)
  if (result.byteLength > MAX_THEME_JSON_BYTES) throw new Error('Invalid .lumitheme archive: theme.json expands beyond Palette\'s safety limit.')
  return result
}

export async function readLumithemeArchiveSource(bytes: Uint8Array): Promise<LumithemeArchiveSource> {
  const themeBytes = await readZipEntry(bytes, 'theme.json')
  let parsed: unknown
  try { parsed = JSON.parse(new TextDecoder().decode(themeBytes)) }
  catch { throw new Error('Invalid .lumitheme archive: theme.json is not valid JSON.') }
  if (!record(parsed)) throw new Error('Invalid .lumitheme archive: theme.json root must be an object.')

  const componentValue = record(parsed.components) ? parsed.components : {}
  const components: Record<string, LumithemeArchiveComponentSource> = {}
  for (const [id, value] of Object.entries(componentValue)) {
    if (!id.trim() || !record(value)) continue
    components[id] = {
      css: typeof value.css === 'string' ? value.css : '',
      tsx: typeof value.tsx === 'string' ? value.tsx : '',
      enabled: value.enabled !== false,
    }
  }

  const assets: LumithemeArchiveAssetManifestEntry[] = []
  if (Array.isArray(parsed.assets)) {
    for (const value of parsed.assets) {
      if (!record(value) || typeof value.archivePath !== 'string' || !value.archivePath.trim() || typeof value.slug !== 'string' || !value.slug.trim()) continue
      assets.push({
        slug: value.slug,
        originalFilename: optionalString(value.originalFilename),
        mimeType: optionalString(value.mimeType),
        archivePath: value.archivePath,
      })
    }
  }

  return {
    format: typeof parsed.format === 'number' && Number.isFinite(parsed.format) ? parsed.format : undefined,
    name: optionalString(parsed.name),
    author: optionalString(parsed.author),
    description: optionalString(parsed.description),
    createdAt: typeof parsed.createdAt === 'number' && Number.isFinite(parsed.createdAt) ? parsed.createdAt : undefined,
    bundleId: optionalString(parsed.bundleId),
    globalCSS: typeof parsed.globalCSS === 'string' ? parsed.globalCSS : '',
    components,
    assets,
  }
}
