import type { ComponentOverride } from '../project/model'
import type { MessageSideName, NativeThemeComponent, ResolvedSelection, SelectionReconciliation, SelectionScope, SelectorCandidate, TargetLevel } from './types'
import { composeContextSelector, simplifyRedundantModuleSegments, splitSelectorList } from './selector-utils'
import { detectSizeController, inspectLayoutContext } from './layout-context'

const MODULE_CLASS = /^_([A-Za-z][A-Za-z0-9_-]*?)_([A-Za-z0-9]{4,})_([0-9]+)$/
const INTERACTIVE = 'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="switch"]'
const DECORATIVE_TAGS = new Set(['svg', 'path', 'g', 'use', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse'])

function cssModuleSignature(className: string): { localName: string; hash: string } | null {
  const match = className.match(MODULE_CLASS)
  return match ? { localName: match[1], hash: match[2] } : null
}
export function normalizeCssModuleClass(className: string): { localName: string; selector: string } | null {
  const match = className.match(MODULE_CLASS)
  return match ? { localName: match[1], selector: `[class*="_${escapeAttribute(match[1])}_"]` } : null
}
function escapeAttribute(value: string): string { return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') }
function escapeIdentifier(value: string): string {
  const cssApi = globalThis.CSS as { escape?: (input: string) => string } | undefined
  return cssApi?.escape ? cssApi.escape(value) : value.replace(/[^A-Za-z0-9_-]/g, (char) => `\\${char.codePointAt(0)?.toString(16)} `)
}
function countMatches(root: ParentNode, selector: string): number { try { return root.querySelectorAll(selector).length } catch { return 0 } }

/** Promote only decorative icon descendants to a nearby interactive control. */
export function normalizeMeaningfulTarget(element: Element): Element {
  const tag = element.tagName.toLowerCase()
  const iconLike = DECORATIVE_TAGS.has(tag)
    || element.getAttribute('aria-hidden') === 'true'
    || [...element.classList].some((name) => /(^|[-_])(icon|glyph)([-_]|$)/i.test(name))
  if (!iconLike) return element
  const interactive = element.closest(INTERACTIVE)
  if (!interactive) return element
  let depth = 0
  let current: Element | null = element
  while (current && current !== interactive && depth <= 4) { current = current.parentElement; depth += 1 }
  return current === interactive && depth <= 4 ? interactive : element
}

const strategyScore: Record<SelectorCandidate['strategy'], number> = {
  semantic: 700, 'native-context-local': 650, 'studio-registry': 550, 'css-module': 450,
  'native-registry': 400, 'exact-class': 250, structural: 150, volatile: 50,
}
export function rankSelectorCandidates(candidates: SelectorCandidate[]): SelectorCandidate[] {
  return [...candidates].sort((a, b) => {
    const stability = { high: 30, medium: 20, low: 10 }
    const aScore = strategyScore[a.strategy] + stability[a.stability] - Math.min(a.matchCount, 200) / 1000
    const bScore = strategyScore[b.strategy] + stability[b.stability] - Math.min(b.matchCount, 200) / 1000
    return bScore - aScore || a.selector.localeCompare(b.selector)
  })
}
function candidate(root: ParentNode, selector: string, strategy: SelectorCandidate['strategy'], stability: SelectorCandidate['stability'], nativeComponentId?: string, warning?: string): SelectorCandidate {
  const matchCount = countMatches(root, selector)
  return { selector, strategy, stability, matchCount, nativeComponentId, warning: warning ?? (matchCount > 50 ? `Broad selector: currently matches ${matchCount} elements.` : undefined) }
}

function composerActionSemantic(element: Element): { owner: Element; selector: string; label: string } | undefined {
  const owner = element.closest('[data-composer-action], [data-toolbar-action]')
  if (!owner || !owner.closest('[data-component="InputArea"]')) return undefined
  const composerAction = owner.getAttribute('data-composer-action')
  const toolbarAction = owner.getAttribute('data-toolbar-action')
  const attributes = composerAction && toolbarAction
    ? `[data-composer-action="${escapeAttribute(composerAction)}"][data-toolbar-action="${escapeAttribute(toolbarAction)}"]`
    : composerAction
      ? `[data-composer-action="${escapeAttribute(composerAction)}"]`
      : toolbarAction
        ? `[data-toolbar-action="${escapeAttribute(toolbarAction)}"]`
        : ''
  if (!attributes) return undefined
  return { owner, selector: `[data-component="InputArea"] ${attributes}`, label: composerAction ?? toolbarAction ?? 'action' }
}

function semanticCandidates(element: Element, root: ParentNode): SelectorCandidate[] {
  const result: SelectorCandidate[] = []
  const id = element.getAttribute('id')
  if (id) result.push(candidate(root, `#${escapeIdentifier(id)}`, 'semantic', 'high'))
  const component = element.getAttribute('data-component')
  const part = element.getAttribute('data-part')
  if (component) {
    const base = `[data-component="${escapeAttribute(component)}"]`
    result.push(candidate(root, part ? `${base}[data-part="${escapeAttribute(part)}"]` : base, 'semantic', 'high'))
  } else if (part) {
    const owner = element.closest('[data-component]')?.getAttribute('data-component')
    if (owner) result.push(candidate(root, `[data-component="${escapeAttribute(owner)}"] [data-part="${escapeAttribute(part)}"]`, 'semantic', 'high'))
  }
  for (const attribute of ['data-spindle-mount', 'data-spindle-app-mount', 'data-spindle-mount-id', 'data-spindle-drawer-tab']) {
    const value = element.getAttribute(attribute)
    if (value) result.push(candidate(root, `[${attribute}="${escapeAttribute(value)}"]`, 'semantic', 'high'))
  }
  for (const attribute of ['data-message-id', 'data-character-id', 'data-chat-id', 'data-testid']) {
    const value = element.getAttribute(attribute)
    if (value && value.length <= 120) result.push(candidate(root, `[${attribute}="${escapeAttribute(value)}"]`, 'semantic', 'high'))
  }
  // Current ComposerActionBarLive gives every reorderable native action stable
  // data-composer-action + data-toolbar-action wrappers. Those wrappers are
  // display:contents, so a picked visual child should still inherit a persistent
  // selector anchored through that semantic unit instead of falling back to title/ARIA.
  const composerAction = composerActionSemantic(element)
  if (composerAction) {
    if (element === composerAction.owner) result.push(candidate(root, composerAction.selector, 'semantic', 'high'))
    else if (composerAction.owner.contains(element)) {
      const tag = element.tagName.toLowerCase()
      const role = element.getAttribute('role')
      const leaf = role ? `${tag}[role="${escapeAttribute(role)}"]` : tag
      result.push(candidate(root, `${composerAction.selector} ${leaf}`, 'semantic', 'high', undefined, `Stable composer action · ${composerAction.label}.`))
    }
  }
  const aria = element.getAttribute('aria-label')
  if (aria && aria.length <= 80) result.push(candidate(root, `${element.tagName.toLowerCase()}[aria-label="${escapeAttribute(aria)}"]`, 'semantic', 'medium', undefined, 'ARIA labels can change when the interface language changes.'))
  const title = element.getAttribute('title')
  if (title && title.length <= 100) result.push(candidate(root, `${element.tagName.toLowerCase()}[title="${escapeAttribute(title)}"]`, 'semantic', 'medium', undefined, 'Titles can change with interface copy.'))
  const name = element.getAttribute('name')
  if (name && name.length <= 100 && ['input','textarea','select','button'].includes(element.tagName.toLowerCase())) result.push(candidate(root, `${element.tagName.toLowerCase()}[name="${escapeAttribute(name)}"]`, 'semantic', 'medium'))
  return result
}
function cssClassCandidates(element: Element, root: ParentNode): SelectorCandidate[] {
  const result: SelectorCandidate[] = []
  for (const className of element.classList) {
    const normalized = normalizeCssModuleClass(className)
    if (normalized) result.push(candidate(root, normalized.selector, 'css-module', 'medium', undefined, 'Generated CSS-module suffix removed; selector targets the stable local class name.'))
    result.push(candidate(root, `.${escapeIdentifier(className)}`, 'exact-class', 'low', undefined, normalized ? 'Exact generated class may change after a Lumiverse build.' : 'Class stability is not guaranteed.'))
  }
  return result
}
export function createStructuralSelector(element: Element, maxDepth = 6): string {
  const parts: string[] = []
  let current: Element | null = element
  while (current && current !== document.body && parts.length < maxDepth) {
    let part = current.tagName.toLowerCase()
    const id = current.getAttribute('id')
    if (id) { parts.unshift(`#${escapeIdentifier(id)}`); break }
    const parent: Element | null = current.parentElement
    if (parent) {
      const siblings = [...parent.children].filter((child) => child.tagName === current?.tagName)
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`
    }
    parts.unshift(part); current = parent
  }
  return parts.join(' > ')
}
function dedupe<T extends SelectorCandidate>(entries: T[]): T[] { return [...new Map(entries.map((entry) => [entry.selector, entry])).values()] }

function directDataComponent(element: Element, components: NativeThemeComponent[]): NativeThemeComponent | undefined {
  const value = element.getAttribute('data-component')?.toLowerCase()
  return value ? components.find((entry) => entry.label.toLowerCase() === value || entry.selectors.some((selector) => selector.toLowerCase() === `[data-component="${value}"]`)) : undefined
}
interface NativeContextResolution {
  component: NativeThemeComponent
  root: Element
  score: number
  evidence: 'data-component' | 'registry' | 'module'
}

const GENERIC_COMPONENT_LABELS = new Set(['app', 'root', 'container', 'layout', 'panel', 'view'])
function isGenericComponent(component: NativeThemeComponent): boolean { return GENERIC_COMPONENT_LABELS.has(component.label.trim().toLowerCase()) }
function componentSpecificityScore(component: NativeThemeComponent): number {
  const label = component.label.trim()
  const tokens = label.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean)
  const genericPenalty = GENERIC_COMPONENT_LABELS.has(label.toLowerCase()) ? 500 : 0
  return Math.min(label.length, 40) + Math.max(0, tokens.length - 1) * 24 - genericPenalty
}
function selectorSpecificityScore(selector: string): number {
  return (selector.match(/[#.\[]/g)?.length ?? 0) * 18 + (selector.includes('data-component') ? 90 : 0)
}
function registryResolutions(element: Element, components: NativeThemeComponent[], root: ParentNode): NativeContextResolution[] {
  const matches: Array<{ component: NativeThemeComponent; selector: string; count: number }> = []
  for (const component of components) {
    let best: { selector: string; matches: number } | undefined
    for (const selector of component.selectors) {
      // A normalized public CSS-module selector can be valid for theme browsing yet
      // still match several unrelated runtime module families. The native bridge
      // marks that condition explicitly; do not treat it as component ownership.
      if (component.moduleIdentityReliable === false && !selector.includes('data-component')) continue
      const trustedHashes = component.moduleIdentityHashes ?? []
      if (trustedHashes.length && !selector.includes('data-component')) {
        const elementHashes = [...element.classList].map(cssModuleSignature).filter((value): value is NonNullable<typeof value> => value !== null).map((value) => value.hash)
        if (elementHashes.length && !elementHashes.some((hash) => trustedHashes.includes(hash))) continue
      }
      let matchesElement = false
      try { matchesElement = element.matches(selector) } catch { continue }
      if (!matchesElement) continue
      const count = countMatches(root, selector)
      if (!best || count < best.matches || count === best.matches && selector.length > best.selector.length) best = { selector, matches: count }
    }
    if (best) matches.push({ component, selector: best.selector, count: best.matches })
  }
  const selectorOwners = new Map<string, number>()
  for (const match of matches) selectorOwners.set(match.selector, (selectorOwners.get(match.selector) ?? 0) + 1)
  const result: NativeContextResolution[] = []
  for (const match of matches) {
    // If two public catalog components expose the exact same mounted selector, that
    // selector cannot tell us which surface owns the node. Do not invent certainty
    // from label length; module/data-component evidence may still disambiguate it.
    if ((selectorOwners.get(match.selector) ?? 0) > 1) continue
    const breadthPenalty = Math.min(match.count, 100) * 2
    result.push({ component: match.component, root: element, evidence: 'registry', score: 2200 + selectorSpecificityScore(match.selector) + componentSpecificityScore(match.component) - breadthPenalty })
  }
  return result.sort((a, b) => b.score - a.score)
}
function moduleResolutions(element: Element, components: NativeThemeComponent[]): NativeContextResolution[] {
  const result: NativeContextResolution[] = []
  const seenHashes = new Set<string>()
  const localOwnerCounts = new Map<string, number>()
  for (const component of components) for (const name of new Set(component.cssClasses.map((entry) => entry.toLowerCase()))) localOwnerCounts.set(name, (localOwnerCounts.get(name) ?? 0) + 1)
  const selectorOwners = new Map<string, number>()
  for (const component of components) for (const selector of new Set(component.selectors)) selectorOwners.set(selector, (selectorOwners.get(selector) ?? 0) + 1)

  for (const signature of [...element.classList].map(cssModuleSignature).filter((value): value is NonNullable<typeof value> => value !== null)) {
    if (seenHashes.has(signature.hash)) continue
    seenHashes.add(signature.hash)
    let moduleRoot = element
    while (moduleRoot.parentElement && [...moduleRoot.parentElement.classList].some((name) => cssModuleSignature(name)?.hash === signature.hash)) moduleRoot = moduleRoot.parentElement
    const localNames = new Set<string>()
    for (const node of [moduleRoot, ...moduleRoot.querySelectorAll('*')].slice(0, 160)) {
      for (const name of node.classList) { const parsed = cssModuleSignature(name); if (parsed?.hash === signature.hash) localNames.add(parsed.localName.toLowerCase()) }
    }
    const scored = components.map((component) => {
      // Mounted class inventories are useful for Edit Part, but a broad normalized
      // native selector can span several unrelated CSS modules. When the bridge
      // observed that ambiguity, do not use that component as a module-identity
      // guess at all.
      if (component.moduleIdentityReliable === false) return { component, root: moduleRoot, score: 0 }
      const trustedHashes = component.moduleIdentityHashes ?? []
      if (trustedHashes.length && !trustedHashes.includes(signature.hash)) return { component, root: moduleRoot, score: 0 }

      const names = new Set(component.cssClasses.map((name) => name.toLowerCase()))
      let overlapScore = 0
      for (const name of localNames) {
        if (!names.has(name)) continue
        const owners = localOwnerCounts.get(name) ?? 1
        // Shared locals such as manager/row/actions are weak identity evidence;
        // rarer locals carry more weight. This deliberately avoids rewarding a
        // component merely because its label is long or contains a generic word.
        overlapScore += Math.max(4, Math.round(48 / Math.sqrt(owners)))
      }
      const label = component.label.toLowerCase()
      const labelHint = [...localNames].some((name) => (localOwnerCounts.get(name) ?? 99) <= 2 && (label === name || label.includes(name) || name.includes(label))) ? 72 : 0
      const registryHint = component.selectors.some((selector) => {
        if ((selectorOwners.get(selector) ?? 0) > 1) return false
        try { return moduleRoot.matches(selector) } catch { return false }
      }) ? 180 : 0
      const hashHint = trustedHashes.includes(signature.hash) ? 260 : 0
      return { component, root: moduleRoot, score: overlapScore + labelHint + registryHint + hashHint }
    }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score)
    const top = scored[0]
    if (!top) continue
    const runnerUp = scored[1]?.score ?? Number.NEGATIVE_INFINITY
    if (top.score >= 48 && top.score - runnerUp >= 24) result.push({ ...top, evidence: 'module', score: 1400 + Math.min(top.score, 900) })
  }
  return result.sort((a, b) => b.score - a.score)
}
function contextResolutions(element: Element, components: NativeThemeComponent[], root: ParentNode): NativeContextResolution[] {
  const entries: NativeContextResolution[] = []
  const data = directDataComponent(element, components) ?? syntheticMountedComponent(element)
  if (data) entries.push({ component: data, root: element, evidence: 'data-component', score: 3200 + componentSpecificityScore(data) })
  entries.push(...registryResolutions(element, components, root), ...moduleResolutions(element, components))
  const byId = new Map<string, NativeContextResolution>()
  for (const entry of entries) {
    const existing = byId.get(entry.component.id)
    if (!existing || entry.score > existing.score) byId.set(entry.component.id, entry)
  }
  return [...byId.values()].sort((a, b) => b.score - a.score)
}
function nativeSelector(component: NativeThemeComponent, element: Element, root: ParentNode): SelectorCandidate {
  const semantic = element.getAttribute('data-component')
  // Message-side authoring needs one stable root that can be faceted with :not()/
  // :has() regardless of whichever CSS-module class a native catalog ranks first.
  if (semantic && isMessageComponentLabel(semantic)) return candidate(root, `[data-component="${escapeAttribute(semantic)}"]`, 'native-registry', 'high', component.id)
  const registry = component.selectors.find((selector) => { try { return element.matches(selector) } catch { return false } })
  if (registry) return candidate(root, simplifyRedundantModuleSegments(registry, root), 'native-registry', 'high', component.id)
  if (semantic) return candidate(root, `[data-component="${escapeAttribute(semantic)}"]`, 'native-registry', 'high', component.id)
  const moduleClass = [...element.classList].map(normalizeCssModuleClass).find(Boolean)
  return moduleClass
    ? candidate(root, moduleClass.selector, 'css-module', 'medium', component.id, 'Native scope resolved from its CSS-module root.')
    : candidate(root, createStructuralSelector(element), 'structural', 'low', component.id, 'Native scope currently requires a structural selector.')
}
function targetLabel(element: Element): string {
  const tag = element.tagName.toLowerCase()
  if (element.matches('[class*="_inlineImageBtn_"]')) return 'Inline image button'
  if (element.matches('[class*="_inlineImageWrap_"]')) return 'Inline image frame'
  if (tag === 'img' && (element.matches('[class*="_inlineImage_"]') || element.closest('[class*="_inlineImageWrap_"]'))) return 'Inline image'
  const attachmentOwner = element.closest('[class*="_attachment_"], [class*="_attachments_"], [class*="_inlineImageBtn_"], [data-component="MessageAttachments"]')
  if (attachmentOwner) return tag === 'img' ? 'Attachment image' : element === attachmentOwner ? 'Attachment' : `Attachment · ${tag}`
  if (tag === 'img') return 'Image'
  const local = [...element.classList].map(normalizeCssModuleClass).find(Boolean)?.localName
  const friendly = local?.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  const name = friendly || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('name') || (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 34)
  return name ? `${tag} · ${name}` : tag
}

function friendlyLocalName(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function contextualScopeLabel(element: Element, component: NativeThemeComponent): string {
  const target = targetLabel(element)
  return component.label.toLowerCase() === 'app' ? `${target} across App panels` : `${target} in ${component.label}`
}
function similarScopeLabel(element: Element, hasNativeContext: boolean): string {
  const tag = element.tagName.toLowerCase()
  if (tag === 'img') return hasNativeContext ? 'Similar images in all panels' : 'DOM scoped · Image'
  return hasNativeContext ? `Similar ${tag} elements everywhere` : `DOM scoped · ${targetLabel(element)}`
}
function mountedComponentLocalClasses(componentElement: Element): string[] {
  const names = new Set<string>()
  for (const node of [componentElement, ...componentElement.querySelectorAll('*')].slice(0, 260)) {
    for (const className of node.classList) {
      const parsed = normalizeCssModuleClass(className)
      if (parsed) names.add(parsed.localName)
    }
  }
  return [...names]
}

const MESSAGE_COMPONENT_LABELS = new Set(['BubbleMessage', 'MinimalMessage'])
function isMessageComponentLabel(label: string | undefined): boolean { return Boolean(label && MESSAGE_COMPONENT_LABELS.has(label)) }
function userVariantBase(localName: string, allNames: Set<string>): string | undefined {
  if (!localName.endsWith('User') || localName.length <= 4) return undefined
  const base = localName.slice(0, -4)
  return allNames.has(base) ? base : undefined
}
function mountedComponentFamilyLocalClasses(componentElement: Element, root: ParentNode): string[] {
  const label = componentElement.getAttribute('data-component')?.trim()
  if (!isMessageComponentLabel(label)) return mountedComponentLocalClasses(componentElement)
  const names = new Set<string>()
  let instances: Element[] = [componentElement]
  try { instances = [...root.querySelectorAll(`[data-component="${escapeAttribute(label!)}"]`)] } catch { /* keep current instance */ }
  for (const instance of instances.slice(0, 40)) for (const name of mountedComponentLocalClasses(instance)) names.add(name)
  return [...names]
}
interface MessageSideContext {
  element: Element
  componentLabel: 'BubbleMessage' | 'MinimalMessage'
  rootSelector: string
  assistantRootSelector: string
  userRootSelector: string
  currentSide: Exclude<MessageSideName, 'both'>
  localNames: Set<string>
}
function userMarkerPriority(value: string): number {
  if (value === 'user') return 1000
  if (value === 'cardUser' || value === 'messageUser' || value === 'bubbleUser') return 900
  if (value === 'nameUser') return 800
  if (value === 'contentUser') return 700
  return value.endsWith('User') ? 500 : 0
}
function resolveMessageSideContext(componentElement: Element, root: ParentNode, component?: NativeThemeComponent): MessageSideContext | undefined {
  const label = componentElement.getAttribute('data-component')?.trim() as MessageSideContext['componentLabel'] | undefined
  if (!isMessageComponentLabel(label)) return undefined
  const rootSelector = `[data-component="${escapeAttribute(label!)}"]`
  let instances: Element[] = [componentElement]
  try { instances = [...root.querySelectorAll(rootSelector)] } catch { /* keep current */ }
  const localNames = new Set<string>(component?.cssClasses ?? [])
  const directMarkers = new Set<string>()
  const descendantMarkers = new Set<string>()
  for (const localName of component?.cssClasses ?? []) {
    if (!userMarkerPriority(localName)) continue
    if (localName === 'user' || localName === 'cardUser' || localName === 'messageUser' || localName === 'bubbleUser') directMarkers.add(localName)
    else descendantMarkers.add(localName)
  }
  for (const instance of instances.slice(0, 40)) {
    for (const className of instance.classList) {
      const parsed = normalizeCssModuleClass(className); if (!parsed) continue
      localNames.add(parsed.localName)
      if (userMarkerPriority(parsed.localName)) directMarkers.add(parsed.localName)
    }
    for (const node of [...instance.querySelectorAll('*')].slice(0, 260)) for (const className of node.classList) {
      const parsed = normalizeCssModuleClass(className); if (!parsed) continue
      localNames.add(parsed.localName)
      if (userMarkerPriority(parsed.localName)) descendantMarkers.add(parsed.localName)
    }
  }
  const directMarker = [...directMarkers].sort((a, b) => userMarkerPriority(b) - userMarkerPriority(a) || a.localeCompare(b))[0]
  const descendantMarker = [...descendantMarkers].sort((a, b) => userMarkerPriority(b) - userMarkerPriority(a) || a.localeCompare(b))[0]
  const marker = directMarker ?? descendantMarker
  if (!marker) return undefined
  const markerSelector = `[class*="_${escapeAttribute(marker)}_"]`
  const userRootSelector = directMarker ? `${rootSelector}${markerSelector}` : `${rootSelector}:has(${markerSelector})`
  const assistantRootSelector = directMarker ? `${rootSelector}:not(${markerSelector})` : `${rootSelector}:not(:has(${markerSelector}))`
  let currentSide: Exclude<MessageSideName, 'both'> = 'assistant'
  try { currentSide = componentElement.matches(userRootSelector) ? 'user' : 'assistant' } catch { /* assistant fallback */ }
  return { element: componentElement, componentLabel: label!, rootSelector, assistantRootSelector, userRootSelector, currentSide, localNames }
}
function selectorLocalNames(selector: string): string[] {
  return [...selector.matchAll(/\[class\*=["']_([A-Za-z][A-Za-z0-9_-]*?)_["']\]/g)].map((match) => match[1])
}
function replaceLocalName(selector: string, from: string, to: string): string {
  if (from === to) return selector
  return selector.replaceAll(`_${from}_`, `_${to}_`)
}
function selectorInsideMessageRoot(selector: string, context: MessageSideContext, sideRoot: string): string {
  return splitSelectorList(selector).map((branch) => {
    if (branch.startsWith(context.rootSelector)) return `${sideRoot}${branch.slice(context.rootSelector.length)}`
    return `${sideRoot} ${branch}`
  }).join(',\n')
}
function firstElement(root: ParentNode, selector: string): Element | undefined { try { return root.querySelector(selector) ?? undefined } catch { return undefined } }
function expandMessageSideScope(scope: SelectionScope, context: MessageSideContext, root: ParentNode): SelectionScope[] {
  if (scope.persistence !== 'persistent' || scope.type === 'selector-candidate') return [scope]
  const belongs = scope.componentId?.includes(context.componentLabel)
    || scope.nativeComponentId?.includes(context.componentLabel)
    || scope.selector.includes(context.rootSelector)
    || Boolean(scope.element && context.element.contains(scope.element))
  if (!belongs && scope.type !== 'similar-elements' && scope.type !== 'context-local') return [scope]
  const locals = selectorLocalNames(scope.localSelector ?? scope.selector)
  let baseLocal: string | undefined
  let userLocal: string | undefined
  for (const local of locals) {
    const pairedBase = userVariantBase(local, context.localNames)
    if (pairedBase) { baseLocal = pairedBase; userLocal = local; break }
    if (context.localNames.has(`${local}User`)) { baseLocal = local; userLocal = `${local}User`; break }
  }
  let assistantSource = scope.selector
  let userSource = scope.selector
  if (baseLocal && userLocal) {
    assistantSource = replaceLocalName(assistantSource, userLocal, baseLocal)
    userSource = replaceLocalName(userSource, baseLocal, userLocal)
  }
  const assistantSelector = selectorInsideMessageRoot(assistantSource, context, context.assistantRootSelector)
  const userSelector = selectorInsideMessageRoot(userSource, context, context.userRootSelector)
  const bothSelector = assistantSelector === userSelector ? assistantSelector : `${assistantSelector},\n${userSelector}`
  const familyId = scope.messageFamilyId ?? scope.id
  const label = scope.label.replace(/\s+User$/i, '')
  const make = (messageSide: MessageSideName, selector: string, id: string): SelectionScope => ({
    ...scope, id, selector, label, matchCount: countMatches(root, selector), messageSide, messageFamilyId: familyId,
    element: messageSide === 'assistant' ? firstElement(root, assistantSelector) ?? scope.element : messageSide === 'user' ? firstElement(root, userSelector) ?? scope.element : scope.element ?? firstElement(root, bothSelector),
    warning: scope.warning,
  })
  return [make('both', bothSelector, scope.id), make('assistant', assistantSelector, `${scope.id}:assistant`), make('user', userSelector, `${scope.id}:user`)]
}
function expandMessageSideScopes(scopes: SelectionScope[], context: MessageSideContext, root: ParentNode): SelectionScope[] {
  return dedupeScopes(scopes.flatMap((scope) => expandMessageSideScope(scope, context, root)))
}
function syntheticMountedComponent(element: Element): NativeThemeComponent | undefined {
  const componentLabel = element.getAttribute('data-component')?.trim()
  if (componentLabel) {
    const id = `mounted:${componentLabel}`
    return {
      id, label: componentLabel, area: 'Mounted DOM', sources: ['css'], selectors: [`[data-component="${escapeAttribute(componentLabel)}"]`],
      cssClasses: mountedComponentLocalClasses(element), nativeKey: id,
    }
  }
  // Spindle drawer tabs are stable semantic surface boundaries even when the
  // mounted Lumiverse subtree has no data-component root of its own. Treat the
  // tab id as authoritative context so generic module locals such as manager/row
  // cannot rename Personas to an unrelated catalog component.
  const drawerTab = element.getAttribute('data-spindle-drawer-tab')?.trim()
  if (!drawerTab) return undefined
  const label = friendlyLocalName(drawerTab)
  const id = `mounted:drawer:${drawerTab}`
  return {
    id, label, area: 'Spindle drawer', sources: ['css'], selectors: [`[data-spindle-drawer-tab="${escapeAttribute(drawerTab)}"]`],
    cssClasses: mountedComponentLocalClasses(element), nativeKey: id,
  }
}
function componentPartScopes(component: NativeThemeComponent, componentElement: Element, root: ParentNode, contextSelector: string): SelectionScope[] {
  const scopes: SelectionScope[] = []
  const allLocalNames = [...new Set([...component.cssClasses, ...mountedComponentFamilyLocalClasses(componentElement, root)])]
  const allNameSet = new Set(allLocalNames)
  const localNames = allLocalNames.filter((name) => name !== 'user' && !userVariantBase(name, allNameSet))
  for (const localName of localNames) {
    const localSelector = `[class*="_${escapeAttribute(localName)}_"]`
    let element: Element | null = null
    try {
      element = componentElement.matches(localSelector) ? componentElement : componentElement.querySelector(localSelector)
      if (!element && isMessageComponentLabel(componentElement.getAttribute('data-component') ?? undefined)) element = root.querySelector(composeContextSelector(contextSelector, localSelector) ?? localSelector)
    } catch { element = null }
    if (!element) continue
    const composed = element === componentElement ? `${contextSelector}${localSelector}` : composeContextSelector(contextSelector, localSelector)
    if (!composed) continue
    const selector = simplifyRedundantModuleSegments(composed, root)
    scopes.push({
      ...candidate(root, selector, 'native-context-local', 'medium', component.id, `Targets the ${friendlyLocalName(localName)} part inside ${component.label}.`),
      id: `part:${component.id}:${localName}`, label: friendlyLocalName(localName), type: 'native-part', componentId: component.id,
      persistence: 'persistent', source: 'native-aware', nativeContextSelector: contextSelector, localSelector, element,
    })
  }
  return dedupeScopes(scopes).slice(0, 64)
}

function levelLabel(element: Element, picked: boolean): string {
  const component = element.getAttribute('data-component'); if (component) return component
  const drawerTab = element.getAttribute('data-spindle-drawer-tab'); if (drawerTab) return friendlyLocalName(drawerTab)
  const composerAction = element.getAttribute('data-composer-action') ?? element.getAttribute('data-toolbar-action')
  if (composerAction) return `Composer action · ${composerAction}`
  const spindleMount = element.getAttribute('data-spindle-mount')
  if (spindleMount === 'chat_toolbar') return 'Extension toolbar mount'
  const local = [...element.classList].map(normalizeCssModuleClass).find(Boolean)?.localName
  if (local) return local.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  const aria = element.getAttribute('aria-label'); if (aria) return aria
  const title = element.getAttribute('title'); if (title) return title
  const name = element.getAttribute('name'); if (name) return name
  const tag = element.tagName.toLowerCase(); return picked && tag === 'img' ? 'Image' : tag
}
function meaningfulLevel(element: Element): boolean {
  return Boolean(element.id || element.getAttribute('data-component') || element.getAttribute('data-spindle-drawer-tab') || element.getAttribute('data-part') || element.getAttribute('data-composer-action') || element.getAttribute('data-toolbar-action') || element.getAttribute('data-spindle-mount') || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('name') || element.getAttribute('role') || element.matches(INTERACTIVE) || [...element.classList].some((name) => normalizeCssModuleClass(name)))
}
function ancestorElements(element: Element, maxDepth = 10): Element[] {
  const levels: Element[] = [element]; let current = element.parentElement; let depth = 0
  while (current && current !== document.body && current !== document.documentElement && depth < maxDepth) {
    if (meaningfulLevel(current)) levels.push(current)
    if (current.hasAttribute('data-component')) break
    current = current.parentElement; depth += 1
  }
  return levels
}
function nearestStableAnchor(element: Element): { element: Element; selector: string } | undefined {
  for (let current = element.parentElement; current && current !== document.body; current = current.parentElement) {
    const composerAction = composerActionSemantic(current)
    if (composerAction && composerAction.owner === current) return { element: current, selector: composerAction.selector }
    const spindleMount = current.getAttribute('data-spindle-mount')
    if (spindleMount) return { element: current, selector: `[data-spindle-mount="${escapeAttribute(spindleMount)}"]` }
    const drawerTab = current.getAttribute('data-spindle-drawer-tab')
    if (drawerTab) return { element: current, selector: `[data-spindle-drawer-tab="${escapeAttribute(drawerTab)}"]` }
    const semantic = current.getAttribute('data-component') ? `[data-component="${escapeAttribute(current.getAttribute('data-component')!)}"]` : undefined
    const module = [...current.classList].map(normalizeCssModuleClass).find(Boolean)?.selector
    if (module || semantic) return { element: current, selector: module ?? semantic! }
  }
  return undefined
}
function anchoredLeafCandidate(element: Element, root: ParentNode): SelectorCandidate | undefined {
  const anchor = nearestStableAnchor(element); if (!anchor) return undefined
  const tag = element.tagName.toLowerCase(); const descendant = element === anchor.element ? '' : ` ${tag}`
  return candidate(root, `${anchor.selector}${descendant}`, 'css-module', 'medium', undefined, `Anchored to the stable ${levelLabel(anchor.element, false)} wrapper.`)
}

/**
 * CSS-module locals such as `avatar`, `row`, and `content` are often reused by
 * unrelated Lumiverse surfaces. When a picked node has its own module class,
 * preserve one nearby module ancestor whenever that ancestor actually narrows
 * the live match set. This turns `App > Avatar` into e.g.
 * `App > CharacterCard > Avatar` instead of styling every `_avatar_` below App.
 */
function anchoredModulePathCandidate(element: Element, root: ParentNode): SelectorCandidate | undefined {
  // A real data-component owner is already a strong semantic boundary. Do not make
  // message/native selectors needlessly brittle by inserting incidental wrappers
  // such as Header Left between MinimalMessage and Avatar. This helper is for the
  // broad CSS-module-owned surfaces (notably App) where the local class alone is
  // otherwise shared across unrelated UI families.
  if (element.closest('[data-component]')) return undefined
  const leafClass = [...element.classList].map((name) => ({ parsed: cssModuleSignature(name), normalized: normalizeCssModuleClass(name) })).find((entry) => entry.parsed && entry.normalized)
  if (!leafClass?.parsed || !leafClass.normalized) return undefined
  const leaf = leafClass.normalized
  const leafHash = leafClass.parsed.hash
  const leafCount = countMatches(root, leaf.selector)
  let fallback: SelectorCandidate | undefined
  let current = element.parentElement; let depth = 0
  while (current && current !== document.body && current !== document.documentElement && depth < 7) {
    const moduleClasses = [...current.classList]
      .map((name) => ({ parsed: cssModuleSignature(name), normalized: normalizeCssModuleClass(name) }))
      .filter((entry): entry is { parsed: NonNullable<ReturnType<typeof cssModuleSignature>>; normalized: NonNullable<ReturnType<typeof normalizeCssModuleClass>> } => Boolean(entry.parsed && entry.normalized))
    const sameModule = moduleClasses.find((entry) => entry.parsed.hash === leafHash && entry.normalized.selector !== leaf.selector)
    const anyAnchor = sameModule ?? moduleClasses.find((entry) => entry.normalized.selector !== leaf.selector)
    if (anyAnchor) {
      const selector = `${anyAnchor.normalized.selector} ${leaf.selector}`
      const matchCount = countMatches(root, selector)
      if (matchCount > 0 && (leafCount === 0 || matchCount < leafCount)) {
        const scoped = candidate(root, selector, 'native-context-local', 'medium', undefined, `Anchored to the nearby ${friendlyLocalName(anyAnchor.normalized.localName)} wrapper so this reused part stays local.`)
        // Same CSS-module hash is the strongest evidence that the wrapper and leaf
        // belong to one authored UI family. Prefer it over a merely narrowing
        // ancestor from another module.
        if (sameModule) return scoped
        fallback ??= scoped
      }
    }
    current = current.parentElement; depth += 1
  }
  return fallback
}

export function resolveElement(rawElement: Element, components: NativeThemeComponent[], root: ParentNode = document): ResolvedSelection {
  const element = normalizeMeaningfulTarget(rawElement)
  let targetCandidates = rankSelectorCandidates(dedupe([
    ...semanticCandidates(element, root), ...cssClassCandidates(element, root),
    candidate(root, createStructuralSelector(element), 'volatile', 'low', undefined, 'Temporary mounted-node identity; it may disappear after rerendering.'),
  ]))
  const modulePath = anchoredModulePathCandidate(element, root); if (modulePath) targetCandidates = rankSelectorCandidates(dedupe([...targetCandidates, modulePath]))
  const anchored = anchoredLeafCandidate(element, root); if (anchored) targetCandidates = rankSelectorCandidates(dedupe([...targetCandidates, anchored]))
  const localRecommended = targetCandidates.find((entry) => entry.strategy !== 'volatile') ?? targetCandidates[0]

  type ContextEntry = { component: NativeThemeComponent; element: Element; direct: boolean; depth: number; score: number; evidence: NativeContextResolution['evidence'] }
  const discoveredContexts: ContextEntry[] = []
  let contextDepth = 0
  for (let current: Element | null = element; current && current !== document.documentElement; current = current.parentElement, contextDepth += 1) {
    for (const resolution of contextResolutions(current, components, root)) {
      if (resolution.root !== current) continue
      const existing = discoveredContexts.find((entry) => entry.component.id === resolution.component.id)
      const next: ContextEntry = { component: resolution.component, element: current, direct: current === element, depth: contextDepth, score: resolution.score, evidence: resolution.evidence }
      if (!existing) discoveredContexts.push(next)
      else if (next.score - next.depth * 28 > existing.score - existing.depth * 28) Object.assign(existing, next)
    }
  }
  // Module-family inference is a fallback, not authority. If a real non-generic
  // data-component/public-registry owner exists around the same pick, suppress
  // conflicting module-only guesses instead of letting a shared local such as
  // `manager` rename Persona UI to QwenCustomVoiceManager.
  const trustedSpecific = discoveredContexts.filter((entry) => entry.evidence !== 'module' && !isGenericComponent(entry.component))
  const usableContexts = discoveredContexts.filter((entry) => {
    if (entry.evidence !== 'module' || !trustedSpecific.length) return true
    return !trustedSpecific.some((trusted) => trusted.element === entry.element || trusted.element.contains(entry.element))
  })
  const evidenceTier = (entry: ContextEntry): number => {
    const generic = isGenericComponent(entry.component)
    if (entry.evidence === 'data-component') return generic ? 22 : 50
    if (entry.evidence === 'registry') return generic ? 20 : 40
    return generic ? 10 : 30
  }
  const contextRank = (entry: ContextEntry): number => evidenceTier(entry) * 100_000 + Math.min(entry.score, 9_999) - entry.depth * 28
  // Specific semantic/public-registry ownership beats heuristic module overlap.
  // A specific module family may still outrank generic App when no stronger
  // surface boundary exists, preserving CharacterBrowser/PersonaBrowser scoping.
  const contexts = [...usableContexts].sort((a, b) => contextRank(b) - contextRank(a) || a.depth - b.depth || a.component.label.localeCompare(b.component.label))
  const nearest = contexts[0]
  const breadcrumb = [...usableContexts]
    .sort((a, b) => b.depth - a.depth || contextRank(b) - contextRank(a))
    .map((entry) => entry.component)
    .filter((component, index, all) => all.findIndex((entry) => entry.id === component.id) === index)
  const mounted = targetCandidates.find((entry) => entry.strategy === 'volatile') ?? localRecommended
  const scopes: SelectionScope[] = [{ ...mounted, id: 'mounted', label: `This mounted ${element.tagName.toLowerCase()} · Temporary`, type: 'mounted-element', persistence: 'volatile', source: nearest ? 'native-aware' : 'dom-scoped', element }]

  const contextualScopes: SelectionScope[] = []
  if (localRecommended.strategy !== 'volatile') {
    for (const context of contexts) {
      if (context.direct) continue
      const contextCandidate = nativeSelector(context.component, context.element, root)
      if (contextCandidate.strategy === 'structural') continue
      const composedRaw = composeContextSelector(contextCandidate.selector, localRecommended.selector)
      if (!composedRaw) continue
      const composed = simplifyRedundantModuleSegments(composedRaw, root)
      contextualScopes.push({
        ...candidate(root, composed, 'native-context-local', localRecommended.stability === 'low' ? 'medium' : localRecommended.stability, context.component.id,
          `Targets the local element only inside ${context.component.label}.`),
        id: `context:${context.component.id}`, label: contextualScopeLabel(element, context.component),
        type: 'context-local', componentId: context.component.id, persistence: 'persistent', source: 'native-aware',
        nativeContextSelector: contextCandidate.selector, localSelector: localRecommended.selector, element,
      })
    }
  }
  scopes.push(...contextualScopes)
  if (localRecommended.strategy !== 'volatile') scopes.push({ ...localRecommended, id: 'similar', label: similarScopeLabel(element, Boolean(nearest)), type: 'similar-elements', persistence: 'persistent', source: nearest ? 'native-aware' : 'dom-scoped', element })
  const levelScopes: SelectionScope[] = []
  const levels: TargetLevel[] = []
  for (const [index, levelElement] of ancestorElements(element).entries()) {
    let levelCandidates = rankSelectorCandidates(dedupe([...semanticCandidates(levelElement, root), ...cssClassCandidates(levelElement, root)]))
    const modulePath = anchoredModulePathCandidate(levelElement, root); if (modulePath) levelCandidates = rankSelectorCandidates(dedupe([...levelCandidates, modulePath]))
    const leaf = anchoredLeafCandidate(levelElement, root); if (leaf) levelCandidates = rankSelectorCandidates(dedupe([...levelCandidates, leaf]))
    const levelContext = contexts.find((context) => context.element === levelElement) ?? contexts.find((context) => context.element.contains(levelElement))
    const local = levelCandidates[0]
    if (local && levelContext && levelContext.element !== levelElement) {
      const contextCandidate = nativeSelector(levelContext.component, levelContext.element, root)
      const composedRaw = contextCandidate.strategy !== 'structural' ? composeContextSelector(contextCandidate.selector, local.selector) : null
      const composed = composedRaw ? simplifyRedundantModuleSegments(composedRaw, root) : null
      if (composed) levelCandidates = rankSelectorCandidates(dedupe([candidate(root, composed, 'native-context-local', local.stability, levelContext.component.id, `Targets ${levelLabel(levelElement, index === 0)} inside ${levelContext.component.label}.`), ...levelCandidates]))
    }
    if (!levelCandidates.length) levelCandidates = [candidate(root, createStructuralSelector(levelElement), 'volatile', 'low', undefined, 'Temporary mounted-node identity; it may disappear after rerendering.')]
    const recommendedLevel = levelCandidates.find((entry) => entry.strategy !== 'volatile') ?? levelCandidates[0]
    const scopeId = index === 0 && contextualScopes.length && recommendedLevel.strategy === 'native-context-local' ? contextualScopes[0].id : index === 0 && recommendedLevel.selector === localRecommended.selector && localRecommended.strategy !== 'volatile' ? 'similar' : `level:${index}`
    if (!scopes.some((scope) => scope.id === scopeId)) levelScopes.push({ ...recommendedLevel, id: scopeId, label: `${levelLabel(levelElement, index === 0)}${index === 0 ? ' · Picked' : ' · Ancestor'}`, type: 'context-local', componentId: levelContext?.component.id, persistence: recommendedLevel.strategy === 'volatile' ? 'volatile' : 'persistent', source: levelContext ? 'native-aware' : 'dom-scoped', element: levelElement })
    levels.push({ id: `target:${index}`, element: levelElement, label: levelLabel(levelElement, index === 0), relation: index === 0 ? 'picked' : 'ancestor', selectorCandidates: levelCandidates, recommended: recommendedLevel, nativeComponentId: levelContext?.component.id, scopeId })
    // Keep every selector shape discovered on this exact DOM node available to the
    // inspector. Scope answers "how broadly should this edit apply?" while these
    // candidate scopes answer "which selector on this same node should identify it?".
    // This is especially important for native roots that carry data-component plus
    // multiple CSS-module classes (for example BubbleMessage's painted/ghost layers).
    for (const [candidateIndex, selectorCandidate] of levelCandidates.entries()) {
      scopes.push({
        ...selectorCandidate,
        id: `selector:${index}:${candidateIndex}`,
        label: `${levelLabel(levelElement, index === 0)} selector`,
        type: 'selector-candidate',
        componentId: levelContext?.component.id,
        persistence: selectorCandidate.strategy === 'volatile' ? 'volatile' : 'persistent',
        source: levelContext ? 'native-aware' : 'dom-scoped',
        element: levelElement,
      })
    }
  }
  scopes.push(...levelScopes)
  let nearestPartScopes: SelectionScope[] = []
  if (nearest) {
    const contextCandidate = nativeSelector(nearest.component, nearest.element, root)
    if (contextCandidate.strategy !== 'structural') {
      nearestPartScopes = componentPartScopes(nearest.component, nearest.element, root, contextCandidate.selector)
      scopes.push(...nearestPartScopes)
    }
  }
  for (const context of contexts) {
    const selector = nativeSelector(context.component, context.element, root)
    if (selector.strategy === 'structural') continue
    // Edit Part is component anatomy, not a duplicate of Browse Inside. Keep the
    // mounted part catalog for every native component context in the target ladder
    // so moving to a different rung can swap the available part inventory instead
    // of leaving the nearest component's parts frozen in place.
    const isNearestContext = Boolean(nearest && context.component.id === nearest.component.id && context.element === nearest.element)
    if (!isNearestContext) scopes.push(...componentPartScopes(context.component, context.element, root, selector.selector))
    scopes.push({ ...selector, id: `native:${context.component.id}`, label: context.component.label, type: context.direct ? 'native-component' : 'native-ancestor', componentId: context.component.id, persistence: 'persistent', source: 'native-aware', element: context.element })
  }
  const direct = contexts.find((entry) => entry.direct)
  // When data-component and a CSS-module class live on the same node, edit the
  // first actual class on that node. This mirrors what a person sees in DevTools
  // and avoids landing on an abstract component shell that owns no painted box.
  const directLocal = direct ? [...direct.element.classList].map(normalizeCssModuleClass).find((entry) => entry && direct.component.cssClasses.includes(entry.localName)) : undefined
  const directPart = direct
    ? (directLocal ? nearestPartScopes.find((part) => part.id === `part:${direct.component.id}:${directLocal.localName}`) : undefined)
      ?? nearestPartScopes.find((part) => part.element === direct.element)
    : undefined
  let activeScopeId = direct ? directPart?.id ?? `native:${direct.component.id}` : contextualScopes[0]?.id ?? (localRecommended.strategy !== 'volatile' ? 'similar' : 'mounted')
  let scopeCandidates = dedupeScopes(scopes)
  const messageContextEntry = contexts.find((entry) => isMessageComponentLabel(entry.component.label))
  const messageSideContext = messageContextEntry ? resolveMessageSideContext(messageContextEntry.element, root, messageContextEntry.component) : undefined
  if (messageSideContext) {
    scopeCandidates = expandMessageSideScopes(scopeCandidates, messageSideContext, root)
    const originalActive = scopeCandidates.find((entry) => entry.id === activeScopeId)
    const familyId = originalActive?.messageFamilyId ?? originalActive?.id
    const sideActive = familyId ? scopeCandidates.find((entry) => entry.messageFamilyId === familyId && entry.messageSide === messageSideContext.currentSide) : undefined
    if (sideActive) activeScopeId = sideActive.id
  }
  const recommended = scopeCandidates.find((scope) => scope.id === activeScopeId) ?? localRecommended
  return {
    target: { element, tagName: element.tagName.toLowerCase(), label: targetLabel(element), candidates: targetCandidates, recommended },
    nativeContext: nearest ? { component: nearest.component, breadcrumb } : undefined,
    scopeCandidates, targetLevels: levels, activeScopeId,
    layoutContext: inspectLayoutContext(element, components), sizeController: detectSizeController(element, scopeCandidates),
    element, component: nearest?.component, breadcrumb, candidates: targetCandidates, recommended, tagName: element.tagName.toLowerCase(),
  }
}

function dedupeScopes(scopes: SelectionScope[]): SelectionScope[] { return [...new Map(scopes.map((scope) => [scope.id, scope])).values()] }

/** Reconnect a fresh DOM pick to the most specific existing persistent scope. */
export function reconcileSelectionWithOverrides(selection: ResolvedSelection, overrides: ComponentOverride[]): SelectionReconciliation {
  const bySelector = new Map(overrides.map((override) => [override.target.selector, override]))
  const styled = selection.scopeCandidates.filter((scope) => scope.persistence === 'persistent' && bySelector.has(scope.selector))
  for (const scope of styled) { const existing = bySelector.get(scope.selector); scope.styledOverrideId = existing?.id; scope.styledPacketCount = existing ? Object.values(existing.states).reduce((count, packets) => count + (packets?.length ?? 0), 0) : 0 }
  // Restoration is exact: an override on a breadcrumb/ancestor is context, never
  // permission to replace the clicked target. Only the already-selected scope can resume.
  const active = styled.find((scope) => scope.id === selection.activeScopeId)
  return { selection, activeOverride: active ? bySelector.get(active.selector) : undefined, styledScopeIds: styled.map((scope) => scope.id) }
}

export function resolveCatalogComponent(component: NativeThemeComponent, root: ParentNode = document): ResolvedSelection {
  const semanticSelector = `[data-component=\"${escapeAttribute(component.label)}\"]`
  const candidates: SelectorCandidate[] = component.selectors.map((selector) => candidate(root, selector, 'native-registry', 'high', component.id))
  if (countMatches(root, semanticSelector) > 0 && !component.selectors.includes(semanticSelector)) candidates.unshift(candidate(root, semanticSelector, 'native-registry', 'high', component.id))
  for (const className of component.cssClasses) {
    const selector = `[class*="_${escapeAttribute(className)}_"]`
    if (countMatches(root, selector) > 0) candidates.push(candidate(root, selector, 'css-module', 'medium', component.id, 'Resolved from the component’s native CSS-module local class.'))
  }
  const ranked = rankSelectorCandidates(dedupe(candidates))
  const recommended = ranked.find((entry) => entry.matchCount > 0) ?? ranked[0] ?? candidate(root, `[data-component="${escapeAttribute(component.label)}"]`, 'native-registry', 'high', component.id, 'This native component is not currently mounted.')
  let mountedElement: Element | undefined
  try { mountedElement = root.querySelector(recommended.selector) ?? undefined } catch { mountedElement = undefined }
  const scope: SelectionScope = { ...recommended, id: `native:${component.id}`, label: component.label, type: 'native-component', componentId: component.id, persistence: 'persistent', source: 'native-aware', element: mountedElement }
  const parts = mountedElement ? componentPartScopes(component, mountedElement, root, recommended.selector) : []
  const preferredPart = parts.find((part) => part.element === mountedElement)
  return {
    target: { element: mountedElement, tagName: mountedElement?.tagName.toLowerCase(), label: component.label, candidates: ranked.length ? ranked : [recommended], recommended },
    nativeContext: { component, breadcrumb: [component] }, scopeCandidates: [scope, ...parts], targetLevels: mountedElement ? [{ id: 'target:0', element: mountedElement, label: component.label, relation: 'picked', selectorCandidates: ranked.length ? ranked : [recommended], recommended, nativeComponentId: component.id, scopeId: scope.id }] : [], activeScopeId: preferredPart?.id ?? scope.id,
    component, breadcrumb: [component], candidates: ranked.length ? ranked : [recommended], recommended, element: mountedElement, tagName: mountedElement?.tagName.toLowerCase(),
  }
}
