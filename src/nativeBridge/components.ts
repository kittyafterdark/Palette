import type { SpindleFrontendContext, SpindleThemeComponentCatalogEntry } from 'lumiverse-spindle-types'
import type { NativeThemeComponent } from '../registry/types'

export interface ComponentGroup { area: string; components: NativeThemeComponent[] }
const MODULE_CLASS = /^_([A-Za-z][A-Za-z0-9_-]*?)_([A-Za-z0-9]{4,})_[0-9]+$/

interface MountedComponentEvidence {
  cssClasses: string[]
  moduleIdentityHashes: string[]
  moduleIdentityReliable: boolean
}

function mountedComponentEvidence(selector: string): MountedComponentEvidence {
  if (typeof document === 'undefined') return { cssClasses: [], moduleIdentityHashes: [], moduleIdentityReliable: true }
  const names = new Set<string>()
  let roots: Element[] = []
  try { roots = [...document.querySelectorAll(selector)].slice(0, 12) } catch { return { cssClasses: [], moduleIdentityHashes: [], moduleIdentityReliable: false } }
  const rootHashSets: Array<Set<string>> = []
  for (const root of roots) {
    const rootHashes = new Set<string>()
    for (const className of root.classList) {
      const match = className.match(MODULE_CLASS)
      if (match) rootHashes.add(match[2])
    }
    if (rootHashes.size) rootHashSets.push(rootHashes)
    for (const node of [root, ...root.querySelectorAll('*')].slice(0, 220)) {
      for (const className of node.classList) {
        const match = className.match(MODULE_CLASS)
        if (match) names.add(match[1])
      }
    }
  }
  // A normalized public selector such as [class*="_manager_"] can match several
  // unrelated CSS modules at once. Only use its root hash as component-identity
  // evidence when every mounted match shares at least one module family. The
  // broad class inventory remains useful for Edit Part ergonomics, but it must not
  // be allowed to christen Persona UI as QwenCustomVoiceManager.
  let commonHashes = rootHashSets.length ? new Set(rootHashSets[0]) : new Set<string>()
  for (const hashes of rootHashSets.slice(1)) commonHashes = new Set([...commonHashes].filter((hash) => hashes.has(hash)))
  const moduleIdentityHashes = [...commonHashes]
  const moduleIdentityReliable = roots.length === 0 || rootHashSets.length <= 1 || moduleIdentityHashes.length > 0
  return { cssClasses: [...names], moduleIdentityHashes, moduleIdentityReliable }
}

export function adaptNativeComponentMetadata(input: SpindleThemeComponentCatalogEntry): NativeThemeComponent {
  const evidence = input.selector ? mountedComponentEvidence(input.selector) : { cssClasses: [], moduleIdentityHashes: [], moduleIdentityReliable: true }
  return {
    id: input.id,
    label: input.label,
    area: input.category?.trim() || 'Other',
    sources: [input.hasCss ? 'css' as const : null, input.hasTsx ? 'tsx' as const : null].filter((value): value is 'css' | 'tsx' => value !== null),
    selectors: input.selector ? [input.selector] : [],
    cssClasses: evidence.cssClasses,
    moduleIdentityHashes: evidence.moduleIdentityHashes,
    moduleIdentityReliable: evidence.moduleIdentityReliable,
    nativeKey: input.id,
  }
}

export function listNativeComponents(ctx: SpindleFrontendContext): NativeThemeComponent[] {
  return ctx.theme.catalog.listComponents().map(adaptNativeComponentMetadata)
}

export function refreshMountedComponentParts(ctx: SpindleFrontendContext, components: NativeThemeComponent[]): NativeThemeComponent[] {
  const byId = new Map(ctx.theme.catalog.listComponents().map((entry) => [entry.id, entry]))
  return components.map((component) => {
    const current = byId.get(component.id)
    return current ? adaptNativeComponentMetadata(current) : component
  })
}

export function groupNativeComponents(components: NativeThemeComponent[]): ComponentGroup[] {
  const grouped = new Map<string, NativeThemeComponent[]>()
  for (const component of components) {
    const group = grouped.get(component.area)
    if (group) group.push(component)
    else grouped.set(component.area, [component])
  }
  return [...grouped].map(([area, entries]) => ({ area, components: entries }))
}

export function findNativeComponent(components: NativeThemeComponent[], idOrLabel: string): NativeThemeComponent | undefined {
  const normalized = idOrLabel.toLowerCase()
  return components.find((component) => component.id.toLowerCase() === normalized || component.label.toLowerCase() === normalized)
}
