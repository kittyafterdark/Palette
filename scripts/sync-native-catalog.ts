import fs from 'node:fs'
import path from 'node:path'

interface CatalogEntry {
  id: string
  label: string
  area: string
  sources: Array<'css' | 'tsx'>
  selectors: string[]
  cssClasses: string[]
  nativeKey: string
}

const excluded = [
  '/custom-css/', '/modals/CustomCSSModal', '/modals/PropsReference', '/auth/',
  '/shared/ModalShell', '/shared/ErrorBoundary', '/settings/AccountSettings',
  '/settings/OperatorPanel', '/settings/UserManagement',
]

function normalize(value: string): string {
  return value.replaceAll('\\', '/')
}

function componentName(file: string): string {
  return path.basename(file).replace(/\.module\.css$|\.tsx$/, '')
}

function relativeSource(file: string, frontendRoot: string): string {
  return normalize(path.relative(frontendRoot, file))
}

function nativeKey(file: string, frontendRoot: string): string {
  return relativeSource(file, frontendRoot).replace(/\.module\.css$|\.tsx$/, '')
}

function category(file: string, frontendRoot: string): string {
  const rel = relativeSource(file, frontendRoot)
  const marker = 'src/components/'
  if (!rel.startsWith(marker)) return 'App'
  const parts = rel.slice(marker.length).split('/')
  const root = parts[0]
  const map: Record<string, string> = {
    chat: 'Chat', panels: 'Panels', modals: 'Modals', shared: 'Shared', settings: 'Settings',
    spindle: 'Spindle', auth: 'Auth', landing: 'Landing',
  }
  if (root === 'panels' && parts[1]?.includes('-')) {
    const label = parts[1].replaceAll('-', ' ').replace(/\bpanel\b/i, '').trim()
    if (label) return label.replace(/^./, (char) => char.toUpperCase())
  }
  return map[root] ?? root.replace(/^./, (char) => char.toUpperCase())
}

function sourceClasses(css: string): string[] {
  const result = new Set<string>()
  for (const match of css.matchAll(/\.([_a-zA-Z][_a-zA-Z0-9-]*)/g)) {
    const name = match[1]
    if (!name.startsWith('lumiverse-') && !name.startsWith('lcs-')) result.add(name)
  }
  return [...result].slice(0, 80)
}

function sourceDataComponents(tsx: string): string[] {
  const result = new Set<string>()
  for (const match of tsx.matchAll(/data-component\s*=\s*["']([^"']+)["']/g)) result.add(match[1])
  return [...result]
}

function isExcluded(file: string): boolean {
  const normalized = normalize(file)
  return excluded.some((entry) => normalized.includes(entry))
}

function readVersion(lumiverseRoot: string): string {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(lumiverseRoot, 'package.json'), 'utf8')) as { version?: unknown }
    return typeof data.version === 'string' ? data.version : 'unknown'
  } catch {
    return 'unknown'
  }
}

const cwd = process.cwd()

function isLumiverseRoot(directory: string): boolean {
  return fs.existsSync(path.join(directory, 'frontend', 'src', 'theme', 'variables.css'))
    && fs.existsSync(path.join(directory, 'frontend', 'src', 'components'))
    && fs.existsSync(path.join(directory, 'package.json'))
}

function discoverLumiverseRoot(start: string): string | null {
  let directory = path.resolve(start)
  while (true) {
    if (isLumiverseRoot(directory)) return directory
    // Workspace checkouts commonly place the extension beside Lumiverse.
    const sibling = path.join(directory, 'Lumiverse')
    if (isLumiverseRoot(sibling)) return sibling
    const parent = path.dirname(directory)
    if (parent === directory) return null
    directory = parent
  }
}

const lumiverseRoot = process.env.LUMIVERSE_SOURCE
  ? path.resolve(process.env.LUMIVERSE_SOURCE)
  : discoverLumiverseRoot(cwd)

if (!lumiverseRoot) {
  throw new Error(`Could not discover a Lumiverse source root by walking upward from ${cwd}. Set LUMIVERSE_SOURCE to the Lumiverse checkout path.`)
}
const frontendRoot = path.join(lumiverseRoot, 'frontend')
const sourceRoot = path.join(frontendRoot, 'src')

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Lumiverse frontend source was not found at ${sourceRoot}. Check LUMIVERSE_SOURCE.`)
}

function walkFiles(directory: string, suffix: string, output: string[] = []): string[] {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) walkFiles(absolute, suffix, output)
    else if (entry.isFile() && entry.name.endsWith(suffix)) output.push(absolute)
  }
  return output
}

const cssFiles = walkFiles(sourceRoot, '.module.css').filter((file) => !isExcluded(file))
const tsxFiles = walkFiles(sourceRoot, '.tsx').filter((file) => !isExcluded(file))

const entries = new Map<string, CatalogEntry>()

function getOrCreate(file: string): CatalogEntry {
  const key = nativeKey(file, frontendRoot)
  const existing = entries.get(key)
  if (existing) return existing
  const name = componentName(file)
  const created: CatalogEntry = {
    id: key,
    label: name,
    area: category(file, frontendRoot),
    sources: [],
    selectors: [],
    cssClasses: [],
    nativeKey: key,
  }
  entries.set(key, created)
  return created
}

for (const file of cssFiles) {
  const entry = getOrCreate(file)
  entry.sources.push('css')
  entry.cssClasses = sourceClasses(fs.readFileSync(file, 'utf8'))
}

for (const file of tsxFiles) {
  // The native Theme Editor is CSS-module-led: TSX enriches a matching CSS
  // entry but does not create an extra catalog row on its own.
  const entry = entries.get(nativeKey(file, frontendRoot))
  if (!entry) continue
  entry.sources.push('tsx')
  const values = sourceDataComponents(fs.readFileSync(file, 'utf8'))
    .filter((value) => value.toLowerCase() === entry.label.toLowerCase())
  entry.selectors.push(...values.map((value) => `[data-component="${value}"]`))
}

const catalog = [...entries.values()]
  .map((entry) => ({ ...entry, sources: [...new Set(entry.sources)], selectors: [...new Set(entry.selectors)] }))
  .sort((a, b) => a.area.localeCompare(b.area) || a.label.localeCompare(b.label))

const variablesCss = fs.readFileSync(path.join(sourceRoot, 'theme', 'variables.css'), 'utf8')
const rootBlock = variablesCss.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? ''
const variables: Record<string, string> = {}
// Match Lumiverse's own extract-css-vars.ts so the Studio Reference count and
// contents stay aligned with the native Theme Editor panel.
for (const match of rootBlock.matchAll(/(--lumiverse-[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
  variables[match[1]] = match[2].trim()
}

const output = `import type { NativeThemeComponent } from '../registry/types'\n\n` +
  `// AUTO-GENERATED from the Lumiverse staging source. DO NOT EDIT.\n` +
  `export const GENERATED_NATIVE_COMPONENTS: NativeThemeComponent[] = ${JSON.stringify(catalog, null, 2)}\n` +
  `export const GENERATED_NATIVE_VARIABLES: Record<string, string> = ${JSON.stringify(variables, null, 2)}\n` +
  `export const GENERATED_NATIVE_SOURCE = ${JSON.stringify({
    lumiverseVersion: readVersion(lumiverseRoot),
    generatedAt: Date.now(),
  }, null, 2)} as const\n`

const outPath = path.join(cwd, 'src', 'nativeBridge', 'generated-native-data.ts')
fs.writeFileSync(outPath, output)
console.log(`Synced ${catalog.length} native components and ${Object.keys(variables).length} CSS variables.`)
