import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import { colorWithAlpha } from '../compiler/color'
import { authoritySelector, compileComponentOverride, compileImageCustomMask, compileLayoutGroup, compilePreviewThemeProject, compileSafeTargetSelector, compileThemeProject, composerIconSvgDataUri } from '../compiler/compiler'
import { validateOverride } from '../compiler/validation'
import { ElementPicker, type GeometryGuideMode } from '../inspector/picker'
import { activeNativeThemeBundleId, cloneNativeThemeAssetToBundle, exportLumitheme, getNativeThemeCapabilities, groupNativeComponents, importLumitheme, listNativeComponents, listNativeThemeAssets, listNativeThemeVariables, nativeVariableMap, projectToNativeDraft, refreshMountedComponentParts, sendToLumiverse, uploadNativeThemeAsset } from '../nativeBridge'
import { COMPOSER_ICON_ACTIONS, MOBILE_BREAKPOINT_PX, STYLE_STATES, createStylePacket, newId, normalizeSvgSource, stateInheritanceSummary, type BoxSpacing, type ComposerIconAction, type ComponentOverride, type DimensionValue, type LayoutGroup, type LayoutGroupContentTarget, type LayoutGroupMember, type LayoutGroupState, type LayoutGroupStyleBucket, type ImageCustomMask, type ImagePacket, type MaskPacket, type RecipePacketSlot, type PacketType, type ResponsiveScopeName, type StatePacketStacks, type StudioTarget, type StylePacket, type StyleStateName } from '../project/model'
import { isMediaElement } from '../project/smart-invert'
import { reverseEngineerElement } from '../project/reverse-engineer'
import { ProjectStore } from '../project/store'
import { LiveStylesheet, type PreviewResult } from '../preview/live-stylesheet'
import { normalizeCssModuleClass, reconcileSelectionWithOverrides, resolveCatalogComponent, resolveElement } from '../registry/selector-resolver'
import { inspectLayoutContext } from '../registry/layout-context'
import type { MessageSideName, NativeThemeAsset, NativeThemeCapabilities, NativeThemeComponent, NativeThemeVariable, ResolvedSelection, SelectionScope } from '../registry/types'
import { appendPseudoToSelectorList, evaluateSelectorHealth } from '../registry/selector-utils'
import type { ThemeRuntimeBridge } from '../nativeBridge/theme-runtime'
import { knownTypographyChoices } from '../nativeBridge/fonts'
import { COMMON_PART_PRESETS, KNOWN_PART_ROLES, applyTextInkPolicyForRole, presetRoles, targetForKnownRole, type CommonPartPreset, type KnownPartRoleId } from '../presets/common-parts'
import { STYLE_LIBRARY_AREAS, STYLE_LIBRARY_PACKS, STYLE_LIBRARY_RECIPES, packCompatiblePresetIds, packDefaultPresetIds, packDefaultPresetIdsForLayout, packForId, packPresetIds, recipeMetaForId, styleLibraryFamilies, styleLibraryPackSearchText, styleLibrarySearchText, type MessageLayoutSupport, type PackWorkbenchLayout, type StyleLibraryArea, type StyleLibraryItemKey, type StyleLibraryPack, type StyleLibraryRecipeMeta } from '../presets/style-library'
import { MESSAGE_LAYOUT_AUDITS } from '../presets/message-anatomy'
import { BUILTIN_ORNAMENTS, builtinOrnament } from '../presets/ornaments'

type WorkspaceTab = 'design' | 'code' | 'themes'
type ResourceTab = 'components' | 'assets' | 'reference'
const PACKETS: Array<{ type: PacketType; group: 'Paint' | 'Shape' | 'Layout' | 'Typography' | 'Effects'; label: string; icon: string; hint: string }> = [
  { type: 'background', group: 'Paint', label: 'Background', icon: '◫', hint: 'Color, gradient, or asset' },
  { type: 'pattern', group: 'Paint', label: 'Pattern', icon: '⠿', hint: 'Dots, grid, checker, diamonds, or grain' },
  { type: 'image', group: 'Paint', label: 'Image', icon: '▧', hint: 'Tone, source quality, crop, and focal position' },
  { type: 'mask', group: 'Paint', label: 'Mask', icon: '◩', hint: 'Fade, clear, or combine mask edges' },
  { type: 'svg-asset', group: 'Paint', label: 'SVG / Icon', icon: '◆', hint: 'Replace nested SVGs or place reusable vector art' },
  { type: 'text', group: 'Paint', label: 'Ink', icon: 'T◈', hint: 'Color, gradient, stroke, and glow for text or glyphs' },
  { type: 'border', group: 'Paint', label: 'Border', icon: '□', hint: 'Edge, weight, and color' },
  { type: 'shadow', group: 'Paint', label: 'Shadow', icon: '◒', hint: 'Depth and glow' },
  { type: 'glass', group: 'Paint', label: 'Glass', icon: '◇', hint: 'Blur and translucent depth' },
  { type: 'media-flow', group: 'Layout', label: 'Media Flow', icon: '▤', hint: 'Natural or full-width media blocks' },
  { type: 'content', group: 'Typography', label: 'Generated Content', icon: '✎', hint: 'Literal label or symbol on a pseudo-surface' },
  { type: 'text-entry', group: 'Typography', label: 'Text Entry', icon: '⌨', hint: 'Typing inset, metrics, and placeholder' },
  { type: 'corners', group: 'Shape', label: 'Corners', icon: '⌜', hint: 'Round the silhouette' },
  { type: 'size', group: 'Shape', label: 'Size', icon: '↔', hint: 'Auto, fit, fill, or fixed' },
  { type: 'spacing', group: 'Shape', label: 'Spacing', icon: '↔', hint: 'Padding, margin, and gap' },
  { type: 'layout', group: 'Layout', label: 'Container', icon: '▦', hint: 'Arrange children' },
  { type: 'placement', group: 'Layout', label: 'Quick Align', icon: '⌗', hint: 'Left, center, right, top, or bottom without CSS trivia' },
  { type: 'layout-item', group: 'Layout', label: 'Layout Item', icon: '▣', hint: 'Advanced flex/grid item behavior' },
  { type: 'position', group: 'Layout', label: 'Position & Layer', icon: '⌖', hint: 'Flow, anchor, and stacking' },
  { type: 'transform', group: 'Shape', label: 'Transform', icon: '⟳', hint: 'Rotate, scale, and skew' },
  { type: 'typography', group: 'Typography', label: 'Typography', icon: 'Aa', hint: 'Typeface, scale, spacing, and case' },
  { type: 'opacity', group: 'Effects', label: 'Opacity', icon: '◐', hint: 'Whole-element transparency' },
  { type: 'visibility', group: 'Effects', label: 'Visibility', icon: '◉', hint: 'Show, hide, or remove from layout' },
  { type: 'composer-icons', group: 'Effects', label: 'Composer Icons', icon: '✣', hint: 'Native or themed composer glyph family' },
]
const GROUP_MEMBER_PACKETS: PacketType[] = ['background','pattern','text','mask','typography','border','corners','spacing','shadow','glass','opacity','visibility','transform']
const GROUP_FRAME_PACKETS: PacketType[] = ['background','pattern','mask','border','corners','shadow','glass','opacity']
const GROUP_CONTENT_PACKETS: Record<LayoutGroupContentTarget, PacketType[]> = {
  icons: ['text','opacity'],
  text: ['text','typography','opacity'],
  buttons: ['background','text','typography','border','corners','spacing','shadow','glass','opacity'],
  images: ['image','mask','border','corners','shadow','opacity'],
}
type TargetSurface = 'element' | 'before' | 'after'
type QuickStyleLayer = { presetId: string; packet: StylePacket }
type QuickStyleSlot = { projectId: string; target: StudioTarget; type: StylePacket['type']; scope: ResponsiveScopeName; base?: StylePacket; layers: QuickStyleLayer[] }
type ObservedReadSession = { key: string; target: StudioTarget; packets: StylePacket[]; authoredProperties: string[]; usedComputedFallback: boolean; sources: ReturnType<typeof reverseEngineerElement>['sources'] }
type StyleMapEntry = { id: string; element: Element; label: string; component: string; summary: string; result: ReturnType<typeof reverseEngineerElement> }
type GroupDraftMember = { element: Element; selection: ResolvedSelection; target: StudioTarget; label: string }
type LayoutGroupDraft = { parentElement: Element | null; parentTarget: StudioTarget | null; parentLabel: string; members: GroupDraftMember[]; error: string }
type StyleLibraryDockHandle = { root: HTMLElement; destroy(): void; expand?(): void; collapse?(): void }
type StyleLibraryDockRequester = {
  requestDockPanel?: (options: { edge: 'left'; title: string; size: number; minSize: number; maxSize: number; resizable: boolean; startCollapsed: boolean; respectRequestedEdge?: boolean; showCollapsedTitle?: boolean }) => StyleLibraryDockHandle
}
type StyleLibraryPresentation = 'fullscreen' | 'dock'
const REPLACED_SURFACE_TAGS = new Set(['img', 'video', 'canvas', 'iframe', 'object', 'embed'])
const COMPOSER_ACTION_LABELS: Record<ComposerIconAction, string> = {
  home: 'Home', regen: 'Regenerate', continue: 'Continue', oneliner: 'One-liner', persona: 'Persona', connections: 'Connections', altFields: 'Fields', addons: 'Add-ons', promptVariables: 'Variables', guides: 'Guided gen', quickReplies: 'Quick replies', tools: 'Tools', extras: 'More', selectMessages: 'Select'
}
const COMPOSER_MOCK_ACTIONS: ComposerIconAction[] = ['home','regen','continue','oneliner','persona','connections','altFields','addons','guides','extras']
function composerSvgDataUri(svg: string): string { return `data:image/svg+xml,${encodeURIComponent(svg)}` }



function escapeHtml(value: unknown): string { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') }
function escapeCssIdentifier(value: string): string {
  const css = globalThis.CSS as { escape?: (input: string) => string } | undefined
  if (typeof css?.escape === 'function') return css.escape(value)
  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)
}
function formatBytes(value?: number): string { return value === undefined ? '' : value < 1024 ? `${value} B` : value < 1048576 ? `${Math.round(value / 1024)} KB` : `${(value / 1048576).toFixed(1)} MB` }
function stabilityLabel(value: string): string { return value === 'high' ? 'Good' : value === 'medium' ? 'Fair' : 'Fragile' }
function percent(value: number | undefined, fallback = 1): number { return Math.round((Number.isFinite(value) ? value! : fallback) * 100) }
function defaultImageCustomMask(): ImageCustomMask {
  return { horizontal: { enabled: true, side: 'right', solidUntil: 25, fadeUntil: 90 }, top: { enabled: true, solidUntil: 85, fadeUntil: 100 }, bottom: { enabled: true, solidUntil: 55, fadeUntil: 100 }, combine: 'intersect' }
}
function maskMode(packet: MaskPacket): 'native' | 'none' | 'fade' | 'custom' { return packet.maskMode ?? (packet.fade.direction !== 'none' ? 'fade' : 'native') }
function colorInput(value: string | undefined, fallback = '#000000'): string { return /^#[0-9a-f]{6}$/i.test(value ?? '') ? value! : fallback }
function activeScope(selection: ResolvedSelection): SelectionScope { return selection.scopeCandidates.find((scope) => scope.id === selection.activeScopeId) ?? selection.scopeCandidates[0] }
function selectorForSurface(selector: string, surface: TargetSurface): string { return surface === 'before' ? appendPseudoToSelectorList(selector, '::before') : surface === 'after' ? appendPseudoToSelectorList(selector, '::after') : selector }
type SvgTargetCandidate = { element: SVGElement; path: string; label: string }
function relativeSvgPath(root: Element, svg: SVGElement): string {
  if (root === svg) return ':self'
  const segments: string[] = []
  let current: Element | null = svg
  while (current && current !== root) {
    const parent: Element | null = current.parentElement
    if (!parent) break
    const tag = current.tagName.toLowerCase()
    const sameTag = [...parent.children].filter((child) => child.tagName.toLowerCase() === tag)
    const index = sameTag.indexOf(current)
    segments.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${Math.max(0, index) + 1})` : tag)
    current = parent
  }
  return current === root ? `> ${segments.join(' > ')}` : 'svg'
}
function svgTargetLabel(svg: SVGElement, index: number): string {
  const semantic = svg.getAttribute('aria-label') || svg.getAttribute('title') || svg.getAttribute('data-icon')
  const classes = [...svg.classList].filter((name) => !/_[a-z0-9]{5,}_/i.test(name)).slice(0, 2).join(' · ')
  const label = semantic || classes || `SVG ${index + 1}`
  return label.length > 56 ? `${label.slice(0, 53)}…` : label
}
function svgTargetsForElement(root: Element | null | undefined): SvgTargetCandidate[] {
  if (!root) return []
  const svgs = root.matches('svg') ? [root as SVGElement] : [...root.querySelectorAll<SVGElement>('svg')]
  return svgs.slice(0, 16).map((svg, index) => ({ element: svg, path: relativeSvgPath(root, svg), label: svgTargetLabel(svg, index) }))
}
function structureNodeLabel(element: Element): string {
  const tag = element.tagName.toLowerCase()
  if (element.matches('[class*="_inlineImageBtn_"]')) return 'Inline image button'
  if (element.matches('[class*="_inlineImageWrap_"]')) return 'Inline image frame'
  if (tag === 'img' && (element.matches('[class*="_inlineImage_"]') || element.closest('[class*="_inlineImageWrap_"]'))) return 'Inline image'
  const attachmentOwner = element.closest('[class*="_attachment_"], [class*="_attachments_"], [class*="_inlineImageBtn_"], [data-component="MessageAttachments"]')
  if (attachmentOwner) return tag === 'img' ? 'Attachment image' : element === attachmentOwner ? 'Attachment' : `Attachment · ${tag}`
  const component = element.getAttribute('data-component')?.trim()
  if (component) return component
  const composerAction = element.getAttribute('data-composer-action')?.trim() ?? element.getAttribute('data-toolbar-action')?.trim()
  if (composerAction) return `Composer action · ${composerAction}`
  const spindleMount = element.getAttribute('data-spindle-mount')?.trim()
  if (spindleMount === 'chat_toolbar') return 'Extension toolbar mount'
  const part = element.getAttribute('data-part')?.trim()
  if (part) return part.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  const semantic = element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('name') || element.getAttribute('role')
  if (semantic && /^(button|a|input|textarea|select|summary)$/.test(tag)) return semantic
  const local = [...element.classList].map(normalizeCssModuleClass).find(Boolean)?.localName
  if (local) return local.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  if (semantic) return semantic
  if (/^h[1-6]$/.test(tag)) return tag.toUpperCase()
  return tag === 'img' ? 'Image' : tag
}
function structureNodeInteresting(element: Element): boolean {
  const tag = element.tagName.toLowerCase()
  return Boolean(element.id || element.getAttribute('data-component') || element.getAttribute('data-part') || element.getAttribute('data-composer-action') || element.getAttribute('data-toolbar-action') || element.getAttribute('data-spindle-mount') || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('name') || element.getAttribute('role') || [...element.classList].some((name) => normalizeCssModuleClass(name)) || /^(button|a|input|textarea|select|summary|img|video|canvas|h[1-6]|p|blockquote|pre|code|strong|em|span)$/.test(tag))
}
type StructureNode = { element: Element; depth: number; label: string; tag: string }
function collectStructureNodes(root: Element, maxDepth = 8, maxNodes = 96): StructureNode[] {
  const result: StructureNode[] = []
  const visit = (parent: Element, depth: number) => {
    if (depth > maxDepth || result.length >= maxNodes) return
    for (const child of [...parent.children]) {
      if (result.length >= maxNodes) break
      if (child.closest('[data-theme-studio-root],[data-theme-studio-widget],[data-theme-studio-style-map]')) continue
      if (structureNodeInteresting(child)) result.push({ element: child, depth, label: structureNodeLabel(child), tag: child.tagName.toLowerCase() })
      visit(child, depth + 1)
    }
  }
  visit(root, 1)
  return result
}
function defaultLayoutGroupState(memberCount = 2): LayoutGroupState {
  return { mode: 'row', columns: Math.max(2, Math.min(12, memberCount)), gap: { mode: 'fixed', value: 8, unit: 'px' }, justify: 'stretch', align: 'stretch', otherSiblings: 'full-width' }
}
function emptyLayoutGroupStyleBucket(): LayoutGroupStyleBucket { return { members: [], contents: {}, frame: [] } }
function groupStateForScope(group: LayoutGroup, scope: ResponsiveScopeName): LayoutGroupState { return scope === 'mobile' ? (group.mobile ?? group.base) : group.base }
function mergePacketLists(base: StylePacket[], delta: StylePacket[] = []): StylePacket[] {
  const byType = new Map<PacketType, StylePacket>(base.map((packet) => [packet.type, packet]))
  for (const packet of delta) byType.set(packet.type, packet)
  return [...byType.values()]
}
function groupStyleBucketForScope(group: LayoutGroup, scope: ResponsiveScopeName): LayoutGroupStyleBucket {
  const base = group.styles?.base ?? emptyLayoutGroupStyleBucket()
  if (scope === 'base') return base
  const mobile = group.styles?.mobile
  if (!mobile) return base
  const contents: LayoutGroupStyleBucket['contents'] = {}
  for (const target of ['icons','text','buttons','images'] as LayoutGroupContentTarget[]) {
    const merged = mergePacketLists(base.contents[target] ?? [], mobile.contents[target] ?? [])
    if (merged.length) contents[target] = merged
  }
  return { members: mergePacketLists(base.members, mobile.members), contents, frame: mergePacketLists(base.frame, mobile.frame) }
}

function defaultResponsiveScope(): ResponsiveScopeName {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'base'
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches ? 'mobile' : 'base'
}
function responsiveStacksFor(override: ComponentOverride | null | undefined, scope: ResponsiveScopeName): StatePacketStacks {
  if (!override) return { normal: [] }
  return scope === 'mobile' ? (override.mobileStates ?? { normal: [] }) : override.states
}
function packetDiffFields(before: StylePacket, after: StylePacket): string[] {
  const fields = new Set<string>()
  const walk = (left: unknown, right: unknown, path: string) => {
    if (Object.is(left, right)) return
    if (Array.isArray(left) || Array.isArray(right)) { fields.add(path); return }
    if (left && right && typeof left === 'object' && typeof right === 'object') {
      const keys = new Set([...Object.keys(left as object), ...Object.keys(right as object)])
      for (const key of keys) { if (key === 'id' || key === 'editedFields') continue; walk((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], path ? `${path}.${key}` : key) }
      return
    }
    if (path) fields.add(path)
  }
  walk(before, after, '')
  return [...fields].filter(Boolean)
}
function mergeEditedFields(packet: StylePacket, changed: string[]): StylePacket {
  if (packet.editedFields === undefined) return packet
  return { ...packet, editedFields: [...new Set([...(packet.editedFields ?? []), ...changed])] } as StylePacket
}
function pathValue(value: unknown, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, value)
}
function setPathValue(value: unknown, path: string, next: unknown): void {
  const keys = path.split('.').filter(Boolean)
  if (!keys.length || !value || typeof value !== 'object') return
  let current = value as Record<string, unknown>
  for (const key of keys.slice(0, -1)) {
    const candidate = current[key]
    if (!candidate || typeof candidate !== 'object') current[key] = {}
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = structuredClone(next)
}
function hydrateSparsePacket(packet: StylePacket, observed?: StylePacket): StylePacket {
  if (packet.editedFields === undefined || !observed || observed.type !== packet.type) return packet
  const merged = structuredClone(observed) as StylePacket
  merged.id = packet.id
  merged.editedFields = [...packet.editedFields]
  for (const field of packet.editedFields) setPathValue(merged, field, pathValue(packet, field))
  return merged
}
function workspaceIcon(tab: WorkspaceTab): string {
  if (tab === 'design') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.8-10.8a2.1 2.1 0 0 0-3-3L5 17v3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m13.8 8.2 3 3" stroke="currentColor" stroke-width="1.7"/></svg>`
  if (tab === 'code') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 9h14M10 9v11" stroke="currentColor" stroke-width="1.7"/></svg>`
}

function shuffleIcon(className = ''): string {
  return `<svg ${className ? `class="${className}" ` : ''}viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3.2c2.2 0 3.3 1.2 4.6 3.1l.7 1c1.3 1.9 2.4 3.1 4.6 3.1H20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="m17 11 3 3-3 3M4 17h3.2c1.8 0 2.9-.8 4-2.2M14.2 8.6c.8-.9 1.7-1.6 3-1.6H20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="m17 4 3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
function mobileEdgeIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-5 5m5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
function minimizeIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18h14M12 5v9m0 0-4-4m4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
function widgetToolIcon(action: 'pick' | 'guides' | 'zap' | 'code' | 'float'): string {
  if (action === 'pick') return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`
  if (action === 'guides') return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" stroke="currentColor" stroke-width="1.1" opacity=".85"/></svg>`
  if (action === 'zap') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.5 2-7 11h5L10.5 22l7-12h-5l1-8Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`
  if (action === 'code') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4c-2 0-3 1-3 3v2c0 1.6-.8 2.5-2 3 1.2.5 2 1.4 2 3v2c0 2 1 3 3 3M15 4c2 0 3 1 3 3v2c0 1.6.8 2.5 2 3-1.2.5-2 1.4-2 3v2c0 2-1 3-3 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16 17 7M11 7h6v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 16v3H5V7h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

function overrideForSelection(selection: ResolvedSelection | null, overrides: ComponentOverride[], surface: TargetSurface = 'element'): ComponentOverride | null {
  return selection ? overrides.find((entry) => entry.target.selector === selectorForSurface(activeScope(selection).selector, surface)) ?? null : null
}

function mountedElementsForScope(selection: ResolvedSelection | null): Element[] {
  if (!selection) return []
  const scope = activeScope(selection)
  if (scope.messageSide === 'both') {
    try {
      const mounted = [...document.querySelectorAll(scope.selector)]
      if (mounted.length) return mounted
    } catch { /* fall back to the representative picked element */ }
  }
  const element = scope.element ?? selection.target.element
  return element?.isConnected ? [element] : []
}

/**
 * CSS does not care whether the picker and a recipe arrived at the same node
 * through the exact same selector string. The Design reader should not either.
 * Keep exact-scope editing semantics, but surface any authored Palette
 * override whose selector actually matches the mounted element being inspected.
 *
 * Message facets are stricter: editing a matched-but-different selector must
 * materialize under the active Assistant/User/Both target instead of mutating
 * the source rule. In particular, Both is a selector list, not permission for
 * the originally clicked speaker to impersonate both branches.
 */
function shouldLocalizeMatchedMessageOverride(selection: ResolvedSelection | null, override: ComponentOverride, surface: TargetSurface = 'element'): boolean {
  if (!selection || surface !== 'element') return false
  const scope = activeScope(selection)
  if (!scope.messageSide) return false
  return override.target.selector !== selectorForSurface(scope.selector, surface)
}

function matchingOverridesForSelection(selection: ResolvedSelection | null, overrides: ComponentOverride[], surface: TargetSurface = 'element'): ComponentOverride[] {
  if (!selection) return []
  const exact = overrideForSelection(selection, overrides, surface)
  if (surface !== 'element') return exact ? [exact] : []
  const scope = activeScope(selection)
  const elements = mountedElementsForScope(selection)
  if (!elements.length) return exact ? [exact] : []
  const matches: ComponentOverride[] = []
  if (exact) matches.push(exact)
  for (const override of overrides) {
    if (override === exact || /::(?:before|after)\s*$/.test(override.target.selector)) continue
    try {
      // Both means common coverage. A one-sided Assistant/User override may match
      // the representative picked node, but it is not an authored Both style.
      // Requiring coverage of every mounted branch prevents that packet from
      // masquerading as the active combined target in the editor.
      const applies = scope.messageSide === 'both'
        ? elements.every((element) => element.matches(override.target.selector))
        : elements.some((element) => element.matches(override.target.selector))
      if (applies) matches.push(override)
    } catch { /* invalid/transient selector: ignore in the ephemeral reader */ }
  }
  return matches
}

export class ThemeStudioUI {
  private components: NativeThemeComponent[] = []
  private variables: NativeThemeVariable[] = []
  /** Assets owned by the active Palette project bundle. */
  private assets: NativeThemeAsset[] = []
  /** Read-only catalog from Lumiverse's currently active native theme bundle. */
  private activeThemeAssets: NativeThemeAsset[] = []
  private sourceThemeBundleId: string | null = null
  private readonly capabilities: NativeThemeCapabilities
  private nativeActionStatus = ''
  private selection: ResolvedSelection | null = null
  private designTool: 'pick' | 'group' = 'pick'
  private pickerMode: 'pick' | 'group' | null = null
  private layoutGroupDraft: LayoutGroupDraft | null = null
  private activeLayoutGroupId: string | null = null
  private groupEditorTab: 'layout' | 'members' | 'contents' | 'frame' = 'layout'
  private groupContentTarget: LayoutGroupContentTarget = 'icons'
  private workspace: WorkspaceTab = 'design'
  private resource: ResourceTab = 'components'
  private componentSearch = ''
  private variableSearch = ''
  private assetError = ''
  private boostError = ''
  private previewResult: PreviewResult = { valid: true }
  private suppressRender = false
  private packetMenuOpen = false
  private editingState: StyleStateName = 'normal'
  private editingScope: ResponsiveScopeName = defaultResponsiveScope()
  private responsiveScopePinned = false
  private guidesEnabled = true
  private guideMode: 'smart' | GeometryGuideMode = 'smart'
  private activeGuidePacketType: PacketType | null = null
  private targetSurface: TargetSurface = 'element'
  private readonly collapsedPackets = new Set<string>()
  private recentColors: string[] = []
  private quickAccent = '#9370db'
  private quickText = '#f4eef8'
  private quickIntensity = 80
  private quickLookSource = 'current'
  private quickLookPage = 0
  private styleLibraryRoot: HTMLElement | null = null
  private styleLibraryOverlayRoot: HTMLElement | null = null
  private styleLibraryDock: StyleLibraryDockHandle | null = null
  private styleLibraryDockDisconnectObserver?: MutationObserver
  private styleLibraryPresentation: StyleLibraryPresentation = 'fullscreen'
  private styleLibraryOpen = false
  private styleLibraryFiltersOpen = false
  private styleLibraryArea: 'all' | StyleLibraryArea = 'all'
  private styleLibraryFamily = 'all'
  private styleLibraryLayout: 'all' | MessageLayoutSupport = 'all'
  private styleLibraryShowPackOwned = true
  private styleLibraryQuery = ''
  private styleLibraryView: 'browse' | 'recent' | 'applied' | 'favorites' | 'my-styles' = 'browse'
  private styleLibraryPackId: string | null = null
  private styleLibraryMobileBrowseCollapsed = false
  private styleLibraryFavorites = new Set<StyleLibraryItemKey>()
  private styleLibraryRecent: StyleLibraryItemKey[] = []
  private savedStyleChooserOpen = false
  private readonly savedStyleSelection = new Set<string>()
  private styleLibraryScrollTop = 0
  private styleLibraryPackScrollTop = 0
  private styleLibraryPackSidebarScrollTop = 0
  private composerWorkshopRole: KnownPartRoleId | null = null
  private composerWorkshopAction: ComposerIconAction = 'home'
  private composerWorkshopSidecarScrollTop = 0
  private composerWorkshopAnatomyScrollTop = 0
  private readonly styleLibraryPackLayouts = new Map<string, PackWorkbenchLayout>()
  private readonly styleLibraryPackSelections = new Map<string, Set<string>>()
  private observedRead: ObservedReadSession | null = null
  private styleMapRoot: HTMLElement | null = null
  private styleMapOpen = false
  private styleMapQuery = ''
  private styleMapEntries: StyleMapEntry[] = []
  /** Persistent recipe layers let Reset reveal the style underneath instead of deleting unrelated/manual packets, even after reload. */
  private readonly quickStyleSlots = new Map<string, QuickStyleSlot>()
  private readonly hydratedRecipeProjects = new Set<string>()
  private widgetRoot: HTMLElement | null = null
  private floatingFrame: HTMLElement | null = null
  private floatingBody: HTMLElement | null = null
  private drawerHost: HTMLElement | null = null
  private drawerPlaceholder: HTMLElement | null = null
  private widgetExpanded = false
  private widgetHidden = false
  private widgetPopover: 'zap' | 'code' | null = null
  private widgetContextMenuOpen = false
  private widgetContextDismissBound = false
  private editorFloating = false
  private mobileFloatSnap: 'peek' | 'work' | 'full' = 'work'
  private mobileFloatEdge: 'top' | 'bottom' = 'bottom'
  private mobileInspectorDensity: 100 | 80 | 60 = 100
  private markedElements: Element[] = []
  private structureNodes: Element[] = []
  /** Transient DOM references backing Group's structural target pickers. Rebuilt on every render. */
  private groupDraftRetargetElements: Element[] = []
  private groupDraftCandidateElements: Element[] = []
  private readonly unsubscribeStore: () => void
  private assetProjectId: string
  private scrollResizeObserver?: ResizeObserver
  private readonly handleViewportResize = () => {
    this.syncScrollViewport()
    if (this.styleLibraryPresentation === 'dock' && !this.canDockStyleLibrary()) this.setStyleLibraryPresentation('fullscreen')
    if (this.responsiveScopePinned) return
    const nextScope = defaultResponsiveScope()
    if (nextScope !== this.editingScope) { this.editingScope = nextScope; this.render() }
  }
  private readonly handleDrawerWheel = (event: WheelEvent) => {
    if (this.editorFloating || event.defaultPrevented) return
    const scroller = this.root.querySelector<HTMLElement>('.ts-scroll')
    if (!scroller || !this.root.contains(event.target as Node) || scroller.scrollHeight <= scroller.clientHeight + 1) return
    const target = event.target instanceof Element ? event.target : null
    const nested = target?.closest<HTMLElement>('.ts-resource-list,.ts-font-grid,.ts-part-grid,.ts-structure-tree,.ts-code')
    if (nested && nested !== scroller && scroller.contains(nested)) {
      const canUp = nested.scrollTop > 0
      const canDown = nested.scrollTop + nested.clientHeight < nested.scrollHeight - 1
      if ((event.deltaY < 0 && canUp) || (event.deltaY > 0 && canDown)) return
    }
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? Math.max(1, scroller.clientHeight) : 1
    const before = scroller.scrollTop
    scroller.scrollTop += event.deltaY * multiplier
    if (scroller.scrollTop !== before) { event.preventDefault(); event.stopPropagation() }
  }

  constructor(private readonly ctx: SpindleFrontendContext, private readonly root: HTMLElement, private readonly store: ProjectStore, private readonly picker: ElementPicker, private readonly preview: LiveStylesheet, private readonly themeRuntime?: ThemeRuntimeBridge) {
    this.capabilities = getNativeThemeCapabilities(ctx)
    this.root.setAttribute('data-theme-studio-root', '')
    this.recentColors = this.loadRecentColors()
    this.styleLibraryFavorites = this.loadStyleLibraryFavorites()
    this.styleLibraryRecent = this.loadStyleLibraryRecent()
    this.ensureQuickStyleSlotsHydrated()
    this.assetProjectId = store.snapshot.activeProjectId
    this.unsubscribeStore = store.subscribe((state) => {
      if (state.activeProjectId !== this.assetProjectId) {
        this.assetProjectId = state.activeProjectId
        this.assets = []
        this.activeThemeAssets = []
        this.preview.setThemeAssets([])
        void this.refreshAssets()
      }
      if (this.suppressRender) this.suppressRender = false; else this.render()
    })
  }
  async initialize(): Promise<void> {
    this.mountWidget()
    this.mountStyleLibrary()
    this.mountStyleMap()
    if (typeof ResizeObserver !== 'undefined' && this.drawerHost) { this.scrollResizeObserver = new ResizeObserver(() => this.syncScrollViewport()); this.scrollResizeObserver.observe(this.drawerHost) }
    if (typeof window !== 'undefined') window.addEventListener('resize', this.handleViewportResize)
    this.root.addEventListener('wheel', this.handleDrawerWheel, { passive: false })
    await this.refreshNativeCatalog()
    await this.refreshAssets()
    this.render()
  }
  destroy(): void { this.clearBoostPreview(); this.clearPreviewMarker(); this.picker.clearHighlight(); this.unsubscribeStore(); this.scrollResizeObserver?.disconnect(); if (typeof window !== 'undefined') window.removeEventListener('resize', this.handleViewportResize); this.root.removeEventListener('wheel', this.handleDrawerWheel); this.dockEditor(); this.widgetRoot?.remove(); this.floatingFrame?.remove(); this.drawerPlaceholder?.remove(); this.destroyStyleLibraryDock(); this.styleLibraryOverlayRoot?.remove(); this.styleLibraryRoot = null; this.styleMapRoot?.remove(); this.root.replaceChildren() }

  render(): void {
    this.ensureQuickStyleSlotsHydrated()
    const scrollTop = this.root.querySelector<HTMLElement>('.ts-scroll')?.scrollTop ?? 0
    if (this.styleLibraryOpen && this.styleLibraryRoot) {
      if (this.styleLibraryPackId) {
        this.styleLibraryPackScrollTop = this.styleLibraryRoot.querySelector<HTMLElement>('.ts-pack-main')?.scrollTop ?? this.styleLibraryPackScrollTop
        this.styleLibraryPackSidebarScrollTop = this.styleLibraryRoot.querySelector<HTMLElement>('.ts-pack-sidebar')?.scrollTop ?? this.styleLibraryPackSidebarScrollTop
      } else {
        this.styleLibraryScrollTop = this.styleLibraryRoot.querySelector<HTMLElement>('.ts-style-library-scroll')?.scrollTop ?? this.styleLibraryScrollTop
        this.composerWorkshopSidecarScrollTop = this.styleLibraryRoot.querySelector<HTMLElement>('.ts-composer-sidecar-scroll')?.scrollTop ?? this.composerWorkshopSidecarScrollTop
        this.composerWorkshopAnatomyScrollTop = this.styleLibraryRoot.querySelector<HTMLElement>('.ts-composer-workshop-groups')?.scrollTop ?? this.composerWorkshopAnatomyScrollTop
      }
    }
    const openDetails = this.captureOpenDetails()
    const innerScroll = this.captureInnerScroll()
    const nativeVariables = nativeVariableMap(this.variables)
    const generatedCss = compileThemeProject(this.store.activeProject, nativeVariables)
    const currentOverride = overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface)
    this.preview.updateGenerated(compilePreviewThemeProject(this.store.activeProject, this.editingState === 'normal' ? { includeBoost: false } : { forcedOverrideId: currentOverride?.id, forcedState: this.editingState, includeBoost: false }, nativeVariables))
    this.previewResult = this.preview.updateCustom(this.store.activeProject.customCss)
    this.root.innerHTML = `<div class="ts-shell">${this.renderProjectBar()}<nav class="ts-tabbar" aria-label="Palette workspaces">
      ${(['design', 'code', 'themes'] as WorkspaceTab[]).map((tab) => `<button class="ts-tab" type="button" data-workspace="${tab}" aria-selected="${this.workspace === tab}">${tab[0].toUpperCase()}${tab.slice(1)}</button>`).join('')}
      </nav>${this.workspace === 'design' ? this.renderWorkbar(currentOverride) : ''}<main class="ts-scroll"><div class="ts-inspector-density">${this.workspace === 'design' ? this.renderDesign() : this.workspace === 'code' ? this.renderCode(generatedCss) : this.renderThemes()}</div></main></div>`
    this.bindCommon()
    if (this.workspace === 'design') this.bindDesign()
    if (this.workspace === 'code') this.bindCode()
    if (this.workspace === 'themes') this.bindThemes()
    this.restoreOpenDetails(openDetails)
    this.restoreInnerScroll(innerScroll)
    this.syncSelectionHighlight()
    this.syncScrollViewport()
    const scroller = this.root.querySelector<HTMLElement>('.ts-scroll')
    if (scroller) scroller.scrollTop = scrollTop
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => { this.syncScrollViewport(); const current = this.root.querySelector<HTMLElement>('.ts-scroll'); if (current) current.scrollTop = scrollTop })
    this.renderWidget()
    this.renderStyleLibrary()
    this.renderStyleMap()
  }

  private syncScrollViewport(): void {
    const scroller = this.root.querySelector<HTMLElement>('.ts-scroll')
    if (!scroller) return
    // Floating mode already has a definite flex height. The Spindle drawer is
    // less predictable across desktop/mobile shells, so give its one real
    // scroll surface an explicit pixel viewport derived from the mounted tab.
    if (this.editorFloating) { scroller.style.removeProperty('height'); scroller.style.removeProperty('max-height'); return }
    const host = this.drawerHost ?? this.root.parentElement
    if (!host || typeof window === 'undefined') return
    const top = scroller.getBoundingClientRect().top
    const hostRect = host.getBoundingClientRect()
    const hostBottom = hostRect.bottom > top ? hostRect.bottom : window.innerHeight
    const bottom = Math.min(window.innerHeight, hostBottom)
    const available = Math.floor(bottom - top)
    if (available > 96) {
      scroller.style.height = `${available}px`
      scroller.style.maxHeight = `${available}px`
    }
  }

  private detailKey(detail: HTMLDetailsElement): string {
    const packetId = detail.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId ?? 'global'
    const summary = detail.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') ?? 'details'
    return `${packetId}:${summary}`
  }
  private captureOpenDetails(): Set<string> {
    return new Set([...this.root.querySelectorAll<HTMLDetailsElement>('details[open]')].map((detail) => this.detailKey(detail)))
  }
  private restoreOpenDetails(keys: Set<string>): void {
    if (!keys.size) return
    this.root.querySelectorAll<HTMLDetailsElement>('details').forEach((detail) => { if (keys.has(this.detailKey(detail))) detail.open = true })
  }
  private scrollKey(element: HTMLElement): string {
    const packetId = element.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId ?? 'global'
    return `${packetId}:${[...element.classList].find((name) => name === 'ts-font-grid' || name === 'ts-part-grid' || name === 'ts-preset-categories') ?? 'scroll'}`
  }
  private captureInnerScroll(): Map<string, { top: number; left: number }> {
    const result = new Map<string, { top: number; left: number }>()
    this.root.querySelectorAll<HTMLElement>('.ts-font-grid,.ts-part-grid,.ts-preset-categories').forEach((element) => result.set(this.scrollKey(element), { top: element.scrollTop, left: element.scrollLeft }))
    return result
  }
  private restoreInnerScroll(values: Map<string, { top: number; left: number }>): void {
    if (!values.size) return
    this.root.querySelectorAll<HTMLElement>('.ts-font-grid,.ts-part-grid,.ts-preset-categories').forEach((element) => { const value = values.get(this.scrollKey(element)); if (value) { element.scrollTop = value.top; element.scrollLeft = value.left } })
  }

  private mountWidget(): void {
    if (this.widgetRoot || typeof document === 'undefined' || !document.body) return
    this.drawerHost = this.root.parentElement
    this.widgetRoot = document.createElement('div')
    this.widgetRoot.className = 'ts-widget-root'
    this.widgetRoot.setAttribute('data-theme-studio-widget', 'dock')
    this.widgetRoot.setAttribute('aria-live', 'polite')

    this.floatingFrame = document.createElement('section')
    this.floatingFrame.className = 'ts-floating-editor'
    this.floatingFrame.setAttribute('data-theme-studio-widget', 'editor')
    this.floatingFrame.hidden = true
    this.floatingFrame.innerHTML = `<div class="ts-mobile-sheet-handle" data-mobile-sheet-drag-handle aria-hidden="true"><i></i></div><header class="ts-floating-editor-head" data-widget-drag-handle><div class="ts-floating-editor-title"><strong>Palette</strong><span data-widget-floating-target>No target selected</span></div><nav class="ts-floating-workspaces" aria-label="Palette workspace">${(['design', 'code', 'themes'] as WorkspaceTab[]).map((tab) => `<button type="button" data-widget-workspace="${tab}" aria-pressed="${this.workspace === tab}" title="${tab[0].toUpperCase()}${tab.slice(1)}" aria-label="${tab[0].toUpperCase()}${tab.slice(1)}">${workspaceIcon(tab)}</button>`).join('')}</nav><div class="ts-floating-editor-actions" role="toolbar" aria-label="Palette window actions"><button class="ts-mobile-edge-toggle" type="button" data-widget-action="toggle-mobile-edge" title="Attach editor to top" aria-label="Attach floating editor to top">${mobileEdgeIcon()}</button><button class="ts-mobile-density-toggle" type="button" data-widget-action="cycle-density" title="Inspector density 100%" aria-label="Inspector density 100%">100%</button><span class="ts-floating-action-divider" aria-hidden="true"></span><button class="ts-floating-minimize" type="button" data-widget-action="dock" title="Minimize Palette to the sidebar" aria-label="Minimize Palette to the sidebar">${minimizeIcon()}</button><button class="ts-floating-close" type="button" data-widget-action="collapse" title="Close Palette" aria-label="Close Palette">×</button></div></header><div class="ts-floating-editor-body"></div>`
    this.floatingBody = this.floatingFrame.querySelector<HTMLElement>('.ts-floating-editor-body')

    this.drawerPlaceholder = document.createElement('div')
    this.drawerPlaceholder.className = 'ts-drawer-placeholder'
    this.drawerPlaceholder.hidden = true
    this.drawerPlaceholder.setAttribute('data-theme-studio-widget', 'placeholder')
    this.drawerPlaceholder.innerHTML = `<strong>Palette is floating.</strong><span>The live editor is detached so you can style drawers, popovers, and modals without losing access to it.</span><button type="button" data-widget-action="dock-placeholder">Return editor here</button>`
    this.drawerHost?.append(this.drawerPlaceholder)
    document.body.append(this.widgetRoot, this.floatingFrame)
    try {
      const saved = JSON.parse(localStorage.getItem('theme-studio:widget-position') ?? 'null') as { left?: string; top?: string } | null
      if (saved?.left && saved?.top) { this.widgetRoot.style.left = saved.left; this.widgetRoot.style.top = saved.top; this.widgetRoot.style.right = 'auto'; this.widgetRoot.style.bottom = 'auto' }
    } catch { /* local widget position is best-effort */ }
    try { this.widgetHidden = localStorage.getItem('theme-studio:widget-hidden') === '1' } catch { this.widgetHidden = false }

    try {
      const savedFloat = JSON.parse(localStorage.getItem('theme-studio:floating-editor') ?? 'null') as { left?: string; top?: string; mobileSnap?: 'peek' | 'work' | 'full'; mobileEdge?: 'top' | 'bottom'; mobileDensity?: 100 | 80 | 60 } | null
      if (savedFloat?.mobileSnap) this.mobileFloatSnap = savedFloat.mobileSnap
      if (savedFloat?.mobileEdge === 'top' || savedFloat?.mobileEdge === 'bottom') this.mobileFloatEdge = savedFloat.mobileEdge
      if (savedFloat?.mobileDensity === 80 || savedFloat?.mobileDensity === 60 || savedFloat?.mobileDensity === 100) this.mobileInspectorDensity = savedFloat.mobileDensity
      this.floatingFrame.dataset.mobileSnap = this.mobileFloatSnap
      this.floatingFrame.dataset.mobileEdge = this.mobileFloatEdge
      this.floatingFrame.dataset.mobileDensity = String(this.mobileInspectorDensity)
      if (savedFloat?.left && savedFloat?.top) { this.floatingFrame.style.left = savedFloat.left; this.floatingFrame.style.top = savedFloat.top; this.floatingFrame.style.right = 'auto'; this.floatingFrame.style.bottom = 'auto' }
    } catch { /* local floating-editor state is best-effort */ }

    this.floatingFrame.querySelector('[data-widget-action="dock"]')?.addEventListener('click', () => this.dockEditor())
    this.floatingFrame.querySelector('[data-widget-action="collapse"]')?.addEventListener('click', () => { this.dockEditor(); this.widgetExpanded = false; this.renderWidget() })
    this.floatingFrame.querySelector('[data-widget-action="toggle-mobile-edge"]')?.addEventListener('click', () => this.toggleMobileFloatEdge())
    this.floatingFrame.querySelector('[data-widget-action="cycle-density"]')?.addEventListener('click', () => this.cycleMobileInspectorDensity())
    this.floatingFrame.querySelectorAll<HTMLButtonElement>('[data-widget-workspace]').forEach((button) => button.addEventListener('click', () => { this.clearBoostPreview(); this.workspace = button.dataset.widgetWorkspace as WorkspaceTab; if (this.workspace === 'design') void this.refreshNativeCatalog(false); this.render() }))
    this.drawerPlaceholder.querySelector('[data-widget-action="dock-placeholder"]')?.addEventListener('click', () => this.dockEditor())
    this.syncMobileEdgeControl()
    this.syncMobileDensityControl()
    this.bindFloatingDrag()
  }

  private mountStyleMap(): void {
    if (this.styleMapRoot || typeof document === 'undefined' || !document.body) return
    this.styleMapRoot = document.createElement('div')
    this.styleMapRoot.className = 'ts-style-map-root'
    this.styleMapRoot.setAttribute('data-theme-studio-style-map', '')
    this.styleMapRoot.hidden = true
    this.styleMapRoot.addEventListener('click', (event) => {
      const target = event.target as Element | null
      if (target?.closest('[data-style-map-close]') || target === this.styleMapRoot) { this.styleMapOpen = false; this.renderStyleMap(); return }
      const inspect = target?.closest<HTMLElement>('[data-style-map-inspect]')
      if (!inspect) return
      const entry = this.styleMapEntries.find((item) => item.id === inspect.dataset.styleMapInspect)
      if (!entry?.element.isConnected) return
      this.clearPreviewMarker()
      this.targetSurface = 'element'
      this.editingState = 'normal'
      this.ensureFreshMountedComponentParts()
      this.selection = reconcileSelectionWithOverrides(resolveElement(entry.element, this.components), this.store.activeProject.componentOverrides).selection
      this.workspace = 'design'
      this.styleMapOpen = false
      this.observeSelection()
      this.render()
    })
    this.styleMapRoot.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement | null
      if (!input?.matches('[data-style-map-search]')) return
      this.styleMapQuery = input.value
      this.renderStyleMap()
      const next = this.styleMapRoot?.querySelector<HTMLInputElement>('[data-style-map-search]')
      next?.focus(); next?.setSelectionRange(next.value.length, next.value.length)
    })
    document.body.append(this.styleMapRoot)
  }

  private styleMapLabel(element: Element): { label: string; component: string } {
    const componentNode = element.closest<HTMLElement>('[data-component]')
    const component = componentNode?.dataset.component ?? 'DOM'
    const aria = element.getAttribute('aria-label') || element.getAttribute('title') || (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.name || element.placeholder : '')
    const tag = element.tagName.toLowerCase()
    const heading = /^h[1-6]$/.test(tag) ? tag.toUpperCase() : ''
    const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 54)
    const partClass = [...element.classList].map((name) => name.match(/^_([^_]+)_/)?.[1]).find(Boolean)
    const label = aria || heading || partClass?.replace(/([a-z])([A-Z])/g, '$1 $2') || (['p','blockquote','pre','code'].includes(tag) ? tag : '') || text || tag
    return { label: label || tag, component }
  }

  private scanStyleMap(): void {
    if (typeof document === 'undefined') { this.styleMapEntries = []; return }
    const selector = '[data-component],h1,h2,h3,h4,blockquote,pre,code,p,button,input,textarea,select,[role="button"],[role="dialog"]'
    const seen = new Set<Element>()
    const entries: StyleMapEntry[] = []
    for (const element of Array.from(document.querySelectorAll(selector))) {
      if (seen.has(element) || element.closest('[data-theme-studio-root],[data-theme-studio-widget],[data-theme-studio-style-library],[data-theme-studio-style-map]')) continue
      const rect = element.getBoundingClientRect()
      if (!element.isConnected || rect.width < 1 || rect.height < 1) continue
      seen.add(element)
      const result = reverseEngineerElement(element)
      if (!result.packets.length && !result.authoredProperties.length) continue
      const { label, component } = this.styleMapLabel(element)
      const style = getComputedStyle(element)
      const bits: string[] = []
      if (style.fontSize) bits.push(`${style.fontSize} ${style.fontFamily.split(',')[0].replace(/["']/g, '').trim()}`)
      if (style.display) bits.push(style.display)
      if (result.sources.some((source) => source.important.length)) bits.push('!important')
      entries.push({ id: `map_${entries.length}`, element, label, component, summary: bits.slice(0, 3).join(' · '), result })
      if (entries.length >= 160) break
    }
    this.styleMapEntries = entries
  }

  private renderStyleMap(): void {
    if (!this.styleMapRoot) return
    this.styleMapRoot.hidden = !this.styleMapOpen
    if (!this.styleMapOpen) { this.styleMapRoot.replaceChildren(); return }
    const query = this.styleMapQuery.trim().toLowerCase()
    const entries = query ? this.styleMapEntries.filter((entry) => `${entry.label} ${entry.component} ${entry.summary} ${entry.result.sources.map((source) => `${source.selector} ${source.source}`).join(' ')}`.toLowerCase().includes(query)) : this.styleMapEntries
    const grouped = new Map<string, StyleMapEntry[]>()
    for (const entry of entries) grouped.set(entry.component, [...(grouped.get(entry.component) ?? []), entry])
    this.styleMapRoot.innerHTML = `<section class="ts-style-map-modal" role="dialog" aria-modal="true" aria-label="Read page"><header class="ts-style-map-head"><div><span class="ts-kicker">Style map</span><strong>Read page</strong><small>Nothing is captured until you edit it.</small></div><button class="ts-btn ts-btn-icon" type="button" data-style-map-close aria-label="Close style map">×</button></header><div class="ts-style-map-toolbar"><input class="ts-search" type="search" data-style-map-search value="${escapeHtml(this.styleMapQuery)}" placeholder="Find headings, buttons, inputs, components…"><span>${entries.length} visible styled targets</span></div><div class="ts-style-map-list">${entries.length ? [...grouped].map(([component, items]) => `<section class="ts-style-map-group"><div class="ts-group-title">${escapeHtml(component)} · ${items.length}</div>${items.map((entry) => { const source = entry.result.sources.at(-1); const props = entry.result.authoredProperties.slice(0, 5).join(', '); return `<button class="ts-style-map-item" type="button" data-style-map-inspect="${entry.id}"><span><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(entry.summary || props || 'Computed presentation')}</small></span><span class="ts-style-map-source"><b>${escapeHtml(source?.source ?? (entry.result.usedComputedFallback ? 'computed' : 'authored'))}</b><small>${escapeHtml(source?.selector ?? props)}</small></span><span aria-hidden="true">›</span></button>` }).join('')}</section>`).join('') : '<div class="ts-empty">No visible styled targets match this search.</div>'}</div></section>`
  }

  private openStyleMap(): void {
    this.scanStyleMap()
    this.styleMapOpen = true
    this.renderStyleMap()
  }

  private mountStyleLibrary(): void {
    if (this.styleLibraryOverlayRoot || typeof document === 'undefined' || !document.body) return
    this.styleLibraryOverlayRoot = document.createElement('div')
    this.styleLibraryOverlayRoot.className = 'ts-style-library-root'
    this.styleLibraryOverlayRoot.setAttribute('data-theme-studio-widget', 'style-library')
    this.styleLibraryOverlayRoot.hidden = true
    document.body.append(this.styleLibraryOverlayRoot)
    this.styleLibraryRoot = this.styleLibraryOverlayRoot
  }

  private canDockStyleLibrary(): boolean {
    if (typeof window === 'undefined' || window.innerWidth <= 760) return false
    return typeof (this.ctx.ui as unknown as StyleLibraryDockRequester).requestDockPanel === 'function'
  }

  private openStyleLibrary(): void {
    this.styleLibraryOpen = true
    // A docked library is persistent UI, even while Spindle has its content host
    // collapsed. Reopening Browse should therefore expand that same dock instead
    // of spawning the fullscreen overlay and making the user dock it again.
    if (this.styleLibraryPresentation === 'dock') this.styleLibraryDock?.expand?.()
    this.renderStyleLibrary()
  }

  private captureStyleLibraryScrollState(): void {
    const root = this.styleLibraryRoot
    if (!root || !this.styleLibraryOpen) return
    if (this.styleLibraryPackId) {
      this.styleLibraryPackScrollTop = root.querySelector<HTMLElement>('.ts-pack-main')?.scrollTop ?? this.styleLibraryPackScrollTop
      this.styleLibraryPackSidebarScrollTop = root.querySelector<HTMLElement>('.ts-pack-sidebar')?.scrollTop ?? this.styleLibraryPackSidebarScrollTop
      return
    }
    this.styleLibraryScrollTop = root.querySelector<HTMLElement>('.ts-style-library-scroll')?.scrollTop ?? this.styleLibraryScrollTop
    this.composerWorkshopSidecarScrollTop = root.querySelector<HTMLElement>('.ts-composer-sidecar-scroll')?.scrollTop ?? this.composerWorkshopSidecarScrollTop
    this.composerWorkshopAnatomyScrollTop = root.querySelector<HTMLElement>('.ts-composer-workshop-groups')?.scrollTop ?? this.composerWorkshopAnatomyScrollTop
  }

  private destroyStyleLibraryDock(): void {
    this.styleLibraryDockDisconnectObserver?.disconnect()
    this.styleLibraryDockDisconnectObserver = undefined
    this.styleLibraryDock?.destroy()
    this.styleLibraryDock = null
  }

  private setStyleLibraryPresentation(next: StyleLibraryPresentation): void {
    if (next === this.styleLibraryPresentation) return
    if (next === 'dock' && !this.canDockStyleLibrary()) return
    this.captureStyleLibraryScrollState()

    if (next === 'dock') {
      const requestDockPanel = (this.ctx.ui as unknown as StyleLibraryDockRequester).requestDockPanel
      if (!requestDockPanel || typeof document === 'undefined') return
      const panel = requestDockPanel.call(this.ctx.ui, {
        edge: 'left',
        title: 'Palette · Style Library',
        size: 440,
        minSize: 340,
        maxSize: 720,
        resizable: true,
        startCollapsed: false,
        respectRequestedEdge: true,
        showCollapsedTitle: true,
      })
      const dockRoot = document.createElement('div')
      dockRoot.className = 'ts-style-library-root ts-style-library-root-docked'
      dockRoot.setAttribute('data-theme-studio-widget', 'style-library')
      panel.root.classList.add('ts-style-library-dock-host')
      panel.root.replaceChildren(dockRoot)
      this.styleLibraryDock = panel
      this.styleLibraryPresentation = 'dock'
      this.styleLibraryRoot = dockRoot
      if (this.styleLibraryOverlayRoot) {
        this.styleLibraryOverlayRoot.hidden = true
        this.styleLibraryOverlayRoot.replaceChildren()
      }
      if (typeof MutationObserver !== 'undefined' && document.body) {
        // Spindle deliberately detaches the extension root while a native dock is
        // collapsed, then reattaches that same live root when the user expands it.
        // Watching panel.root.isConnected therefore mistakes ordinary collapse for
        // panel destruction and kills Palette's dock state. Capture the host dock
        // shell instead: its content host may come and go, but the shell survives a
        // collapse and only disconnects when the native panel is actually closed.
        let dockShell = panel.root.isConnected ? panel.root.parentElement?.parentElement ?? null : null
        const observer = new MutationObserver(() => {
          if (this.styleLibraryDock !== panel || this.styleLibraryPresentation !== 'dock') { observer.disconnect(); return }
          if (!dockShell && panel.root.isConnected) dockShell = panel.root.parentElement?.parentElement ?? null
          if (!dockShell || dockShell.isConnected) return
          observer.disconnect()
          this.styleLibraryDockDisconnectObserver = undefined
          this.styleLibraryDock = null
          this.styleLibraryPresentation = 'fullscreen'
          this.styleLibraryRoot = this.styleLibraryOverlayRoot
          this.styleLibraryOpen = false
          this.styleLibraryFiltersOpen = false
          this.styleLibraryPackId = null
          this.renderStyleLibrary()
        })
        observer.observe(document.body, { childList: true, subtree: true })
        this.styleLibraryDockDisconnectObserver = observer
      }
      panel.expand?.()
      this.renderStyleLibrary()
      return
    }

    this.destroyStyleLibraryDock()
    this.styleLibraryPresentation = 'fullscreen'
    this.styleLibraryRoot = this.styleLibraryOverlayRoot
    this.renderStyleLibrary()
  }

  private renderStyleLibraryPresentationButton(): string {
    if (!this.canDockStyleLibrary() && this.styleLibraryPresentation !== 'dock') return ''
    const docked = this.styleLibraryPresentation === 'dock'
    return `<button class="ts-btn ts-library-presentation-toggle" type="button" data-library-action="presentation" title="${docked ? 'Return Style Library to fullscreen' : 'Dock Style Library on the left'}" aria-label="${docked ? 'Return Style Library to fullscreen' : 'Dock Style Library on the left'}"><span aria-hidden="true">${docked ? '⛶' : '⇤'}</span><span>${docked ? 'Fullscreen' : 'Dock left'}</span></button>`
  }

  private loadStyleLibraryFavorites(): Set<StyleLibraryItemKey> {
    try {
      if (typeof localStorage === 'undefined') return new Set()
      const parsed = JSON.parse(localStorage.getItem('theme-studio:style-library-favorites') ?? '[]')
      return new Set(Array.isArray(parsed) ? parsed.filter((value): value is StyleLibraryItemKey => typeof value === 'string' && /^(recipe|pack):/.test(value)) : [])
    } catch { return new Set() }
  }

  private loadStyleLibraryRecent(): StyleLibraryItemKey[] {
    try {
      if (typeof localStorage === 'undefined') return []
      const parsed = JSON.parse(localStorage.getItem('theme-studio:style-library-recent') ?? '[]')
      return Array.isArray(parsed) ? parsed.filter((value): value is StyleLibraryItemKey => typeof value === 'string' && /^(recipe|pack):/.test(value)).slice(0, 20) : []
    } catch { return [] }
  }

  private saveStyleLibraryFavorites(): void {
    try { localStorage.setItem('theme-studio:style-library-favorites', JSON.stringify([...this.styleLibraryFavorites])) } catch { /* best effort */ }
  }

  private noteStyleLibraryRecent(key: StyleLibraryItemKey): void {
    this.styleLibraryRecent = [key, ...this.styleLibraryRecent.filter((entry) => entry !== key)].slice(0, 20)
    try { localStorage.setItem('theme-studio:style-library-recent', JSON.stringify(this.styleLibraryRecent)) } catch { /* best effort */ }
  }

  private toggleStyleLibraryFavorite(key: StyleLibraryItemKey): void {
    if (this.styleLibraryFavorites.has(key)) this.styleLibraryFavorites.delete(key)
    else this.styleLibraryFavorites.add(key)
    this.saveStyleLibraryFavorites()
    this.renderStyleLibrary()
  }

  private packAppliedCount(pack: StyleLibraryPack): number { return packPresetIds(pack).filter((id) => this.commonPresetApplied(id)).length }

  private packWorkbenchLayout(packId: string): PackWorkbenchLayout { return this.styleLibraryPackLayouts.get(packId) ?? 'all' }
  private packWorkbenchSelectionKey(packId: string, layout: PackWorkbenchLayout): string { return `${packId}:${layout}` }
  private packWorkbenchSelection(pack: StyleLibraryPack, layout = this.packWorkbenchLayout(pack.id)): Set<string> {
    const key = this.packWorkbenchSelectionKey(pack.id, layout)
    let selected = this.styleLibraryPackSelections.get(key)
    if (!selected) {
      selected = new Set(packDefaultPresetIdsForLayout(pack, layout))
      this.styleLibraryPackSelections.set(key, selected)
    }
    return selected
  }
  private setPackWorkbenchLayout(packId: string, layout: PackWorkbenchLayout): void {
    const pack = packForId(packId)
    if (!pack || (layout !== 'all' && !pack.supports.includes(layout))) return
    this.styleLibraryPackLayouts.set(packId, layout)
    this.packWorkbenchSelection(pack, layout)
    this.renderStyleLibrary()
  }
  private adoptPackPalette(packId: string): void {
    const palette = packForId(packId)?.defaultPalette
    if (!palette) return
    this.quickAccent = palette.accent
    this.quickText = palette.text
    this.quickIntensity = palette.intensity
  }
  private togglePackWorkbenchPreset(packId: string, presetId: string): void {
    const pack = packForId(packId)
    if (!pack) return
    const layout = this.packWorkbenchLayout(packId)
    if (!packCompatiblePresetIds(pack, layout).includes(presetId)) return
    const selected = this.packWorkbenchSelection(pack, layout)
    if (selected.has(presetId)) selected.delete(presetId); else selected.add(presetId)
    this.renderStyleLibrary()
  }
  private setPackWorkbenchSelection(packId: string, mode: 'defaults' | 'all' | 'clear'): void {
    const pack = packForId(packId)
    if (!pack) return
    const layout = this.packWorkbenchLayout(packId)
    const selected = this.packWorkbenchSelection(pack, layout)
    selected.clear()
    const ids = mode === 'defaults' ? packDefaultPresetIdsForLayout(pack, layout) : mode === 'all' ? packCompatiblePresetIds(pack, layout) : []
    for (const id of ids) selected.add(id)
    this.renderStyleLibrary()
  }
  private togglePackWorkbenchSection(packId: string, sectionLabel: string): void {
    const pack = packForId(packId)
    const section = pack?.sections.find((entry) => entry.label === sectionLabel)
    if (!pack || !section) return
    const layout = this.packWorkbenchLayout(packId)
    const compatible = new Set(packCompatiblePresetIds(pack, layout))
    const ids = section.presetIds.filter((id) => compatible.has(id))
    const selected = this.packWorkbenchSelection(pack, layout)
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
    for (const id of ids) { if (allSelected) selected.delete(id); else selected.add(id) }
    this.renderStyleLibrary()
  }
  private applyPackWorkbenchSelection(packId: string): void {
    const pack = packForId(packId)
    if (!pack) return
    const layout = this.packWorkbenchLayout(packId)
    const compatible = new Set(packCompatiblePresetIds(pack, layout))
    const selected = [...this.packWorkbenchSelection(pack, layout)].filter((id) => compatible.has(id))
    for (const presetId of selected) this.applyCommonPreset(presetId, false, false, false)
    if (selected.length) this.noteStyleLibraryRecent(`pack:${pack.id}` as StyleLibraryItemKey)
    this.render()
  }
  private resetPackWorkbenchSelection(packId: string): void {
    const pack = packForId(packId)
    if (!pack) return
    const layout = this.packWorkbenchLayout(packId)
    const compatible = new Set(packCompatiblePresetIds(pack, layout))
    for (const presetId of this.packWorkbenchSelection(pack, layout)) if (compatible.has(presetId)) this.resetCommonPreset(presetId, false)
    this.render()
  }

  private libraryFilteredRecipes(): StyleLibraryRecipeMeta[] {
    if (this.styleLibraryView === 'my-styles') return []
    let entries = STYLE_LIBRARY_RECIPES.filter((entry) => {
      if (this.styleLibraryArea !== 'all' && entry.area !== this.styleLibraryArea) return false
      if (this.styleLibraryFamily !== 'all' && entry.family !== this.styleLibraryFamily) return false
      if (!this.styleLibraryShowPackOwned && STYLE_LIBRARY_PACKS.some((pack) => packPresetIds(pack).includes(entry.preset.id))) return false
      if (this.styleLibraryLayout !== 'all') {
        if (!['message', 'prose', 'avatar'].includes(entry.area)) return false
        if (!entry.supports.includes(this.styleLibraryLayout)) return false
      }
      const key = `recipe:${entry.preset.id}` as StyleLibraryItemKey
      if (this.styleLibraryView === 'favorites' && !this.styleLibraryFavorites.has(key)) return false
      if (this.styleLibraryView === 'applied' && !this.commonPresetApplied(entry.preset.id)) return false
      if (this.styleLibraryView === 'recent' && !this.styleLibraryRecent.includes(key)) return false
      return true
    })
    if (this.styleLibraryView === 'recent') {
      const rank = new Map(this.styleLibraryRecent.map((key, index) => [key, index]))
      entries = entries.sort((a, b) => (rank.get(`recipe:${a.preset.id}` as StyleLibraryItemKey) ?? 999) - (rank.get(`recipe:${b.preset.id}` as StyleLibraryItemKey) ?? 999))
    }
    return entries
  }

  private libraryFilteredPacks(): StyleLibraryPack[] {
    if (this.styleLibraryView === 'my-styles') return []
    let packs = STYLE_LIBRARY_PACKS.filter((pack) => {
      if (this.styleLibraryArea !== 'all' && !pack.areas.includes(this.styleLibraryArea)) return false
      if (this.styleLibraryLayout !== 'all' && !pack.supports.includes(this.styleLibraryLayout)) return false
      const key = `pack:${pack.id}` as StyleLibraryItemKey
      if (this.styleLibraryView === 'favorites' && !this.styleLibraryFavorites.has(key)) return false
      if (this.styleLibraryView === 'applied' && this.packAppliedCount(pack) === 0) return false
      if (this.styleLibraryView === 'recent' && !this.styleLibraryRecent.includes(key)) return false
      return true
    })
    if (this.styleLibraryView === 'recent') {
      const rank = new Map(this.styleLibraryRecent.map((key, index) => [key, index]))
      packs = packs.sort((a, b) => (rank.get(`pack:${a.id}` as StyleLibraryItemKey) ?? 999) - (rank.get(`pack:${b.id}` as StyleLibraryItemKey) ?? 999))
    }
    return packs
  }

  private renderPackCard(pack: StyleLibraryPack): string {
    const total = packPresetIds(pack).length
    const applied = this.packAppliedCount(pack)
    const favorite = this.styleLibraryFavorites.has(`pack:${pack.id}` as StyleLibraryItemKey)
    return `<article class="ts-pack-card" data-library-card="pack:${escapeHtml(pack.id)}" data-library-kind="pack" data-library-pack="${escapeHtml(pack.id)}" data-library-search="${escapeHtml(styleLibraryPackSearchText(pack))}"><button class="ts-pack-open" type="button"><div class="ts-pack-preview" data-pack-preview="${escapeHtml(pack.preview)}"><span class="ts-pack-panel ts-pack-panel-a"></span><span class="ts-pack-panel ts-pack-panel-b"></span><strong>${escapeHtml(pack.name)}</strong><small>${escapeHtml(pack.areas.map((area) => STYLE_LIBRARY_AREAS.find((entry) => entry.id === area)?.label ?? area).join(' · '))}</small></div><div class="ts-pack-copy"><div><strong>${escapeHtml(pack.name)}</strong>${applied ? `<span class="ts-chip">${applied}/${total} applied</span>` : ''}</div><span>${total} styles · ${pack.supports.length === 2 ? 'Bubble + Minimal' : pack.supports[0]}</span></div></button><button class="ts-btn ts-btn-icon ts-pack-favorite" type="button" data-library-favorite="pack:${escapeHtml(pack.id)}" aria-label="${favorite ? 'Remove' : 'Add'} ${escapeHtml(pack.name)} ${favorite ? 'from' : 'to'} favorites" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button></article>`
  }

  private packAssetBinding(packId: string, slotId: string): ComponentOverride | undefined {
    const prefix = `Pack asset · ${packId}:${slotId} · `
    return this.store.activeProject.componentOverrides.find((override) => override.target.label?.startsWith(prefix))
  }

  private persistedAssetCatalog(): NativeThemeAsset[] {
    return this.store.activeProject.assets.map((asset) => ({
      id: asset.assetId ?? `persisted:${asset.path}`,
      name: asset.name ?? asset.path.split('/').pop() ?? asset.path,
      path: asset.path,
      contentUrl: asset.contentUrl,
      mimeType: asset.mimeType,
      bundleId: this.store.activeProject.nativeAssetBundleId,
    }))
  }

  /** Project assets win by path; active-theme assets are read-only borrowable sources. */
  private availableThemeAssets(): NativeThemeAsset[] {
    const byPath = new Map<string, NativeThemeAsset>()
    for (const asset of [...this.persistedAssetCatalog(), ...this.activeThemeAssets, ...this.assets]) {
      const bare = asset.path.replace(/^\.\//, '')
      byPath.set(bare, asset)
    }
    return [...byPath.values()]
  }

  private async ensureProjectOwnedAssetPath(assetPath: string): Promise<string> {
    const path = assetPath.trim()
    if (!path || path.startsWith('data:')) return path
    const bare = path.replace(/^\.\//, '')
    const source = this.availableThemeAssets().find((asset) => asset.path.replace(/^\.\//, '') === bare)
    if (!source) return path
    const projectBundleId = await this.ensureProjectBundleId()
    if (source.bundleId && source.bundleId !== projectBundleId && !source.id.startsWith('persisted:')) {
      const adopted = await cloneNativeThemeAssetToBundle(this.ctx, source, projectBundleId)
      await this.refreshAssets()
      return adopted.path
    }
    return source.path
  }

  private async commitBackgroundAssetField(input: HTMLInputElement | HTMLSelectElement): Promise<void> {
    try {
      input.value = await this.ensureProjectOwnedAssetPath(input.value)
      this.assetError = ''
      this.preview.clearTransient()
      this.handlePacketField(input)
    } catch (error) {
      this.assetError = `Could not adopt asset into this project: ${error instanceof Error ? error.message : 'unknown error'}`
      this.render()
    }
  }

  private async bindPackAssetFromPath(packId: string, slotId: string, assetPath: string): Promise<void> {
    const path = assetPath.trim()
    if (!path) { this.applyPackAssetBinding(packId, slotId, { assetPath: '' }); return }
    try {
      const builtin = path.startsWith('builtin:') ? builtinOrnament(path.slice('builtin:'.length)) : undefined
      const ownedPath = builtin?.assetPath ?? await this.ensureProjectOwnedAssetPath(path)
      this.assetError = ''
      this.applyPackAssetBinding(packId, slotId, { assetPath: ownedPath })
    } catch (error) {
      this.assetError = `Could not adopt asset into this project: ${error instanceof Error ? error.message : 'unknown error'}`
      this.render()
    }
  }

  private packAssetAnchors(pack: StyleLibraryPack): Array<{ id: KnownPartRoleId; label: string }> {
    const ids: KnownPartRoleId[] = ['message.frame','header.root','header.left','avatar.frame','avatar.backdrop','name.character','meta.row','meta.pill','message.content','message.thinking','message.thinking.header','message.thinking.toggle','message.greetings','message.swipes','actions.pill','minimal.frame','minimal.header','minimal.avatar.frame','minimal.name','minimal.meta.pill','minimal.content','minimal.actions','input.shell','input.actionbar']
    return ids
      .filter((id) => !(id.startsWith('minimal.') && !pack.supports.includes('minimal')))
      .filter((id) => !(['message.frame','header.root','header.left','avatar.frame','avatar.backdrop','name.character','meta.row','meta.pill','message.content','actions.pill'] as KnownPartRoleId[]).includes(id) || pack.supports.includes('bubble'))
      .map((id) => ({ id, label: KNOWN_PART_ROLES[id].label }))
  }

  private defaultPackAssetAnchor(pack: StyleLibraryPack, slotId: string): KnownPartRoleId {
    const slot = pack.assetSlots.find((entry) => entry.id === slotId)
    if (slot?.defaultAnchor) return slot.defaultAnchor
    const layout = this.packWorkbenchLayout(pack.id)
    const minimal = layout === 'minimal' || (layout === 'all' && !pack.supports.includes('bubble') && pack.supports.includes('minimal'))
    if (slotId === 'portrait') return minimal ? 'minimal.avatar.frame' : 'avatar.frame'
    if (/masthead|mark|logo/i.test(slotId)) return minimal ? 'minimal.header' : 'header.root'
    return minimal ? 'minimal.frame' : 'message.frame'
  }

  private packAssetState(pack: StyleLibraryPack, slotId: string): { assetPath: string; anchorRole: KnownPartRoleId; surface: 'before'|'after'; corner: 'tl'|'tr'|'bl'|'br'; x: number; y: number; size: number } {
    const binding = this.packAssetBinding(pack.id, slotId)
    const background = binding?.states.normal.find((packet) => packet.type === 'background')
    const position = binding?.states.normal.find((packet) => packet.type === 'position')
    const sizePacket = binding?.states.normal.find((packet) => packet.type === 'size')
    const labelRole = binding?.target.label?.split(' · ').at(-1) as KnownPartRoleId | undefined
    const anchorRole = labelRole && KNOWN_PART_ROLES[labelRole] ? labelRole : this.defaultPackAssetAnchor(pack, slotId)
    const slot = pack.assetSlots.find((entry) => entry.id === slotId)
    const surface: 'before'|'after' = binding?.target.selector.trim().endsWith('::before') ? 'before' : binding ? 'after' : (slot?.defaultSurface ?? 'after')
    const defaultCorner = slot?.defaultCorner ?? 'tl'
    const corner: 'tl'|'tr'|'bl'|'br' = position?.type === 'position' && position.right !== undefined ? (position.bottom !== undefined ? 'br' : 'tr') : position?.type === 'position' && position.bottom !== undefined ? 'bl' : binding ? 'tl' : defaultCorner
    const x = position?.type === 'position' ? (corner.endsWith('r') ? -(position.right ?? 0) : (position.left ?? 0)) : (slot?.defaultX ?? 0)
    const y = position?.type === 'position' ? (corner.startsWith('b') ? -(position.bottom ?? 0) : (position.top ?? 0)) : (slot?.defaultY ?? 0)
    const fallbackSize = slot?.defaultSize ?? (slotId === 'portrait' ? 180 : /mark|icon/i.test(slotId) ? 16 : 96)
    const width = sizePacket?.type === 'size' && sizePacket.width?.mode === 'fixed' ? sizePacket.width.value : fallbackSize
    return { assetPath: background?.type === 'background' && background.mode === 'image' ? background.image.assetPath : '', anchorRole, surface, corner, x, y, size: width }
  }

  private applyPackAssetBinding(packId: string, slotId: string, patch: Partial<{ assetPath: string; anchorRole: KnownPartRoleId; surface: 'before'|'after'; corner: 'tl'|'tr'|'bl'|'br'; x: number; y: number; size: number }>): void {
    const pack = packForId(packId); if (!pack) return
    const slot = pack.assetSlots.find((entry) => entry.id === slotId)
    const placement = slot?.placement ?? 'plane'
    const maskPlacement = placement === 'stencil' || placement === 'plane-stencil'
    const next = { ...this.packAssetState(pack, slotId), ...patch }
    const old = this.packAssetBinding(packId, slotId); if (old) this.store.restoreTarget([old.target.selector])
    if (!next.assetPath) return
    const anchor = targetForKnownRole(next.anchorRole)
    const token = `${packId}-${slotId}`.replace(/[^a-z0-9_-]+/gi, '-')
    // Keep bound assets on their own selector identity so removing a slot never
    // restores the recipe-authored packets that may target the same element.
    const uniqueAnchorSelector = `${anchor.selector}:where(:not([data-theme-studio-asset-slot="${token}"]))`
    const target: StudioTarget = placement === 'stencil'
      ? { ...anchor, selector: uniqueAnchorSelector, label: `Pack asset · ${packId}:${slotId} · ${next.anchorRole}`, overrideStrength: 'strong' }
      : { ...anchor, selector: `${uniqueAnchorSelector}::${next.surface}`, label: `Pack asset · ${packId}:${slotId} · ${next.anchorRole}`, overrideStrength: 'strong' }

    const background = createStylePacket('background')
    if (background.type === 'background') {
      background.mode = 'image'
      background.image.assetPath = next.assetPath
      background.image.size = slotId === 'portrait' ? 'cover' : 'contain'
      background.image.positionX = 50
      background.image.positionY = 50
      background.image.repeat = 'no-repeat'
      if (maskPlacement) {
        background.image.renderMode = 'mask'
        background.image.maskColor = this.quickAccent
        background.image.maskAlpha = 1
        background.image.hideContents = placement === 'stencil'
      }
    }

    const size = createStylePacket('size')
    if (size.type === 'size') {
      const value = Math.max(8, Math.min(600, next.size))
      size.width = { mode: 'fixed', value, unit: 'px' }
      size.height = { mode: 'fixed', value, unit: 'px' }
    }

    if (placement === 'stencil') {
      for (const packet of [background, size]) this.store.upsertPacket(target, packet, 'normal', 'base')
      return
    }

    const position = createStylePacket('position')
    if (position.type === 'position') {
      position.mode = 'anchored'
      position.anchorSelector = anchor.selector
      position.anchorLabel = anchor.label
      position.unit = 'px'
      position.layer = next.surface === 'before' ? 'normal' : 'custom'
      if (next.surface === 'after') position.zIndex = 120
      if (next.corner.startsWith('b')) position.bottom = -next.y; else position.top = next.y
      if (next.corner.endsWith('r')) position.right = -next.x; else position.left = next.x
    }
    for (const packet of [background, position, size]) this.store.upsertPacket(target, packet, 'normal', 'base')
  }

  private renderPackAssetSlot(pack: StyleLibraryPack, slot: StyleLibraryPack['assetSlots'][number]): string {
    if (slot.kind !== 'image') return `<div class="ts-pack-asset"><span class="ts-pack-asset-icon">⠿</span><div><strong>${escapeHtml(slot.label)}</strong><span>${escapeHtml(slot.defaultLabel)}</span><small>${escapeHtml(slot.description)}</small></div><span class="ts-chip">Procedural</span></div>`
    const state = this.packAssetState(pack, slot.id)
    const images = this.availableThemeAssets().filter((asset) => asset.mimeType?.startsWith('image/'))
    const builtIns = (slot.builtInIds ?? []).map((id) => builtinOrnament(id)).filter((entry): entry is NonNullable<ReturnType<typeof builtinOrnament>> => Boolean(entry))
    const normalizedStatePath = state.assetPath.replace(/^\.\//, '')
    const selected = images.find((asset) => asset.path.replace(/^\.\//, '') === normalizedStatePath)
    const selectedBuiltIn = builtIns.find((entry) => entry.assetPath === state.assetPath)
    const anchors = this.packAssetAnchors(pack)
    const builtInOptions = builtIns.length ? `<optgroup label="Built-in ornaments">${builtIns.map((entry) => `<option value="builtin:${escapeHtml(entry.id)}" ${entry.assetPath === state.assetPath ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}</optgroup>` : ''
    const themeOptions = images.length ? `<optgroup label="Project + current theme">${images.map((asset) => `<option value="${escapeHtml(asset.path)}" ${asset.path.replace(/^\.\//, '') === normalizedStatePath ? 'selected' : ''}>${escapeHtml(asset.name)}</option>`).join('')}</optgroup>` : ''
    const assetSelect = `<label class="ts-label">Asset<select class="ts-input" data-pack-asset-path="${escapeHtml(slot.id)}" data-pack-id="${escapeHtml(pack.id)}"><option value="">${escapeHtml(slot.defaultLabel)}</option>${builtInOptions}${themeOptions}</select></label>`
    const selectedLabel = selectedBuiltIn?.label ?? selected?.name ?? slot.defaultLabel
    const head = `<div class="ts-pack-asset-bound-head"><span class="ts-pack-asset-preview-mini">${selected?.contentUrl ? `<img src="${escapeHtml(selected.contentUrl)}" alt="">` : (slot.placement === 'stencil' || slot.placement === 'plane-stencil') ? '✦' : '▧'}</span><div><strong>${escapeHtml(slot.label)}</strong><span>${escapeHtml(selectedLabel)}</span></div><span class="ts-chip">${slot.optional ? 'Optional' : 'Required'}</span></div>`

    if (slot.placement === 'stencil') {
      const stencilControls = state.assetPath
        ? `<div class="ts-pack-asset-placement"><label class="ts-label">Size <span data-pack-asset-size-value="${escapeHtml(slot.id)}">${state.size}px</span><input class="ts-range" type="range" min="8" max="96" value="${state.size}" data-pack-asset-size="${escapeHtml(slot.id)}" data-pack-id="${escapeHtml(pack.id)}"></label><p class="ts-note">Stencil replaces the native icon box using the image alpha. Tint follows the current pack accent; refine the resulting Background packet in Design if you want a different color.</p></div>`
        : `<p class="ts-note">The built-in pack mark already skins the native icon. Pick any PNG/SVG here to replace it with a project-owned stencil.${images.length ? '' : ' No project or current-theme images are available yet.'}</p>`
      return `<div class="ts-pack-asset ts-pack-asset-bound">${head}<small>${escapeHtml(slot.description)}</small>${assetSelect}${stencilControls}</div>`
    }

    const padLeft = 50 + Math.max(-200, Math.min(200, state.x)) / 4
    const padTop = 50 + Math.max(-200, Math.min(200, state.y)) / 4
    return `<div class="ts-pack-asset ts-pack-asset-bound">${head}<small>${escapeHtml(slot.description)}</small>${assetSelect}${state.assetPath ? `<div class="ts-pack-asset-placement"><label class="ts-label">Anchor to<select class="ts-input" data-pack-asset-anchor="${escapeHtml(slot.id)}" data-pack-id="${escapeHtml(pack.id)}">${anchors.map((anchor) => `<option value="${escapeHtml(anchor.id)}" ${anchor.id === state.anchorRole ? 'selected' : ''}>${escapeHtml(anchor.label)}</option>`).join('')}</select></label><div class="ts-field"><span class="ts-label">Layer</span><div class="ts-segment" role="group" aria-label="Decorative asset layer"><button type="button" data-pack-asset-surface="before" data-pack-id="${escapeHtml(pack.id)}" data-slot-id="${escapeHtml(slot.id)}" aria-pressed="${state.surface === 'before'}">Back</button><button type="button" data-pack-asset-surface="after" data-pack-id="${escapeHtml(pack.id)}" data-slot-id="${escapeHtml(slot.id)}" aria-pressed="${state.surface === 'after'}">Front</button></div></div><div class="ts-asset-corners" aria-label="Anchor corner"><button type="button" data-pack-asset-corner="tl" data-pack-id="${escapeHtml(pack.id)}" data-slot-id="${escapeHtml(slot.id)}" aria-pressed="${state.corner === 'tl'}" title="Top left">↖</button><button type="button" data-pack-asset-corner="tr" data-pack-id="${escapeHtml(pack.id)}" data-slot-id="${escapeHtml(slot.id)}" aria-pressed="${state.corner === 'tr'}" title="Top right">↗</button><button type="button" data-pack-asset-corner="bl" data-pack-id="${escapeHtml(pack.id)}" data-slot-id="${escapeHtml(slot.id)}" aria-pressed="${state.corner === 'bl'}" title="Bottom left">↙</button><button type="button" data-pack-asset-corner="br" data-pack-id="${escapeHtml(pack.id)}" data-slot-id="${escapeHtml(slot.id)}" aria-pressed="${state.corner === 'br'}" title="Bottom right">↘</button></div><div class="ts-offset-pad ts-asset-offset-pad" data-pack-asset-pad="${escapeHtml(slot.id)}" data-pack-id="${escapeHtml(pack.id)}" data-pack-asset-pad-x="${state.x}" data-pack-asset-pad-y="${state.y}" style="--ts-offset-left:${padLeft}%;--ts-offset-top:${padTop}%"><button type="button" class="ts-offset-dot" aria-label="Drag asset offset" title="Drag asset"></button></div><div class="ts-offset-values ts-pack-asset-offsets"><label><span>X · right +</span><input class="ts-number" type="number" value="${state.x}" data-pack-asset-x="${escapeHtml(slot.id)}" data-pack-id="${escapeHtml(pack.id)}"></label><label><span>Y · down +</span><input class="ts-number" type="number" value="${state.y}" data-pack-asset-y="${escapeHtml(slot.id)}" data-pack-id="${escapeHtml(pack.id)}"></label></div><label class="ts-label">Size <span data-pack-asset-size-value="${escapeHtml(slot.id)}">${state.size}px</span><input class="ts-range" type="range" min="10" max="320" value="${state.size}" data-pack-asset-size="${escapeHtml(slot.id)}" data-pack-id="${escapeHtml(pack.id)}"></label><p class="ts-note">Pick a wrapper, choose Back (::before) or Front (::after), then drag the asset into place. Every usable wrapper gives the pack another decorative plane without touching React DOM.${slot.placement === 'plane-stencil' ? ' This slot uses the asset alpha as a tintable stencil.' : ''}</p></div>` : `<p class="ts-note">Choose a native image and Palette will place it as a pointer-safe decorative layer. Then anchor and drag it into place instead of writing positioning CSS.${images.length ? '' : ' No project or current-theme images are available yet.'}</p>`}</div>`
  }

  private renderPackDetail(pack: StyleLibraryPack): string {
    const ids = packPresetIds(pack)
    const applied = this.packAppliedCount(pack)
    const favorite = this.styleLibraryFavorites.has(`pack:${pack.id}` as StyleLibraryItemKey)
    const compactSidebar = this.styleLibraryPresentation === 'dock' || (typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 760px)')?.matches))
    const workbenchOpen = compactSidebar ? '' : ' open'
    const layout = this.packWorkbenchLayout(pack.id)
    const compatibleIds = packCompatiblePresetIds(pack, layout)
    const compatible = new Set(compatibleIds)
    const selected = this.packWorkbenchSelection(pack, layout)
    const selectedIds = [...selected].filter((id) => compatible.has(id))
    const selectedApplied = selectedIds.filter((id) => this.commonPresetApplied(id)).length
    const layoutLabel = layout === 'all' ? 'Both layouts' : layout === 'bubble' ? 'BubbleMessage' : 'MinimalMessage'
    const assetRows = pack.assetSlots.map((slot) => this.renderPackAssetSlot(pack, slot)).join('')
    const sections = pack.sections.map((section, index) => {
      const entries = section.presetIds.map((id) => COMMON_PART_PRESETS.find((preset) => preset.id === id)).filter((preset): preset is CommonPartPreset => Boolean(preset))
      const sectionCompatible = section.presetIds.filter((id) => compatible.has(id))
      const sectionChosen = sectionCompatible.filter((id) => selected.has(id)).length
      const allChosen = sectionCompatible.length > 0 && sectionChosen === sectionCompatible.length
      return `<section class="ts-library-group ts-pack-recipe-section" data-pack-section="${index}"><div class="ts-library-group-head ts-pack-section-head"><div><strong>${escapeHtml(section.label)}</strong><small>${sectionCompatible.length === entries.length ? `${sectionChosen}/${sectionCompatible.length} chosen` : `${sectionChosen}/${sectionCompatible.length} compatible chosen · ${entries.length - sectionCompatible.length} other layout`}</small></div><div class="ts-pack-section-tools"><span>${entries.length}</span><button class="ts-btn" type="button" data-pack-toggle-section="${escapeHtml(section.label)}" data-pack-id="${escapeHtml(pack.id)}" ${sectionCompatible.length ? '' : 'disabled'}>${allChosen ? 'Clear section' : 'Choose section'}</button></div></div>${this.renderPresetCards(entries, { library: true, packId: pack.id, selectedPresetIds: selected, packLayout: layout })}</section>`
    }).join('')
    const coverage = pack.areas.map((area) => STYLE_LIBRARY_AREAS.find((entry) => entry.id === area)?.label ?? area).join(' · ')
    const sectionNav = pack.sections.map((section, index) => `<button type="button" data-pack-scroll-section="${index}" aria-current="${index === 0 ? 'true' : 'false'}"><span>${escapeHtml(section.label)}</span><small>${section.presetIds.length}</small></button>`).join('')
    const recipeManifest = pack.sections.map((section) => {
      const rows = section.presetIds.map((id) => {
        const preset = COMMON_PART_PRESETS.find((entry) => entry.id === id)
        if (!preset) return ''
        const meta = recipeMetaForId(id)
        const isCompatible = compatible.has(id)
        const isSelected = selected.has(id) && isCompatible
        const isApplied = this.commonPresetApplied(id)
        return `<button class="ts-pack-manifest-row" type="button" data-pack-select-preset="${escapeHtml(id)}" data-pack-id="${escapeHtml(pack.id)}" aria-pressed="${isSelected}" ${isCompatible ? '' : 'disabled'}><span class="ts-pack-check" aria-hidden="true">${isSelected ? '✓' : ''}</span><span><strong>${escapeHtml(preset.name)}</strong><small>${isCompatible ? (meta?.supports.length === 2 ? 'Both layouts' : meta?.supports[0] === 'minimal' ? 'Minimal' : 'Bubble') : `Not used in ${layoutLabel}`}</small></span>${isApplied ? '<i>Applied</i>' : ''}</button>`
      }).join('')
      return `<div class="ts-pack-manifest-group"><span>${escapeHtml(section.label)}</span>${rows}</div>`
    }).join('')
    return `<header class="ts-style-library-head ts-pack-detail-head"><div class="ts-pack-head-title"><button class="ts-btn ts-btn-icon" type="button" data-library-action="back" aria-label="Back to style library">←</button><div><p class="ts-kicker">Style pack workbench</p><h2 id="ts-style-library-title">${escapeHtml(pack.name)}</h2></div></div><div class="ts-pack-head-actions">${this.renderStyleLibraryPresentationButton()}<button class="ts-btn ts-btn-icon" type="button" data-library-favorite="pack:${escapeHtml(pack.id)}" aria-label="${favorite ? 'Remove pack from favorites' : 'Favorite pack'}" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button><button class="ts-btn ts-btn-icon" type="button" data-library-action="close" aria-label="Close style library">×</button></div></header><div class="ts-pack-workspace"><main class="ts-pack-main"><div class="ts-pack-hero" data-pack-layout-preview="${layout}"><div class="ts-pack-preview ts-pack-preview-large" data-pack-preview="${escapeHtml(pack.preview)}"><span class="ts-pack-panel ts-pack-panel-a"></span><span class="ts-pack-panel ts-pack-panel-b"></span><span class="ts-pack-preview-rail"></span><strong>${escapeHtml(pack.name)}</strong><small>${escapeHtml(coverage)}</small></div><div class="ts-pack-summary"><div class="ts-pack-summary-row"><span class="ts-library-badge ts-library-family">${escapeHtml(pack.family)}</span><span class="ts-library-badge">${ids.length} styles</span><span class="ts-library-badge">${escapeHtml(layoutLabel)}</span></div><strong>${selectedIds.length} selected</strong></div></div><nav class="ts-pack-section-nav" aria-label="Pack sections"><span>Jump to</span>${sectionNav}</nav><div class="ts-pack-detail-scroll">${sections}</div></main><aside class="ts-pack-sidebar" aria-label="${escapeHtml(pack.name)} pack controls"><div class="ts-pack-sidebar-inner"><section class="ts-pack-side-actions ts-pack-workbench-actions"><div class="ts-pack-side-heading"><div><span class="ts-kicker">Workbench</span><strong>${escapeHtml(pack.name)}</strong></div><span class="ts-chip">${applied}/${ids.length} applied</span></div><div class="ts-pack-layout-picker" role="group" aria-label="Pack message layout"><button type="button" data-pack-layout="all" data-pack-id="${escapeHtml(pack.id)}" aria-pressed="${layout === 'all'}">Both</button><button type="button" data-pack-layout="bubble" data-pack-id="${escapeHtml(pack.id)}" aria-pressed="${layout === 'bubble'}" ${pack.supports.includes('bubble') ? '' : 'disabled'}>Bubble</button><button type="button" data-pack-layout="minimal" data-pack-id="${escapeHtml(pack.id)}" aria-pressed="${layout === 'minimal'}" ${pack.supports.includes('minimal') ? '' : 'disabled'}>Minimal</button></div><div class="ts-pack-selection-summary"><div><strong>${selectedIds.length}</strong><span>chosen</span></div><div><strong>${selectedApplied}</strong><span>already applied</span></div><div><strong>${compatibleIds.length}</strong><span>compatible</span></div></div><div class="ts-pack-selection-tools"><button type="button" data-pack-selection-mode="defaults" data-pack-id="${escapeHtml(pack.id)}">Defaults</button><button type="button" data-pack-selection-mode="all" data-pack-id="${escapeHtml(pack.id)}">All compatible</button><button type="button" data-pack-selection-mode="clear" data-pack-id="${escapeHtml(pack.id)}" ${selectedIds.length ? '' : 'disabled'}>Clear</button></div><div class="ts-pack-main-actions ts-pack-main-actions-workbench"><button class="ts-btn ts-btn-primary" type="button" data-pack-apply-selection="${escapeHtml(pack.id)}" ${selectedIds.length ? '' : 'disabled'}>Apply selection</button><button class="ts-btn" type="button" data-pack-reset-selection="${escapeHtml(pack.id)}" ${selectedApplied ? '' : 'disabled'}>Reset selection</button></div><div class="ts-pack-secondary-actions"><button class="ts-btn" type="button" data-library-pack-apply="${escapeHtml(pack.id)}">Apply all</button><button class="ts-btn ts-btn-danger" type="button" data-library-pack-reset="${escapeHtml(pack.id)}" ${applied ? '' : 'disabled'}>Reset pack</button></div></section><details class="ts-pack-side-section ts-pack-recipe-manifest"${workbenchOpen}><summary><div><strong>Recipe set</strong><span>${selectedIds.length} chosen · ${compatibleIds.length} compatible</span></div><span class="ts-chip">Workbench</span><i aria-hidden="true">⌄</i></summary><div class="ts-pack-side-body"><div class="ts-pack-manifest">${recipeManifest}</div></div></details><details class="ts-pack-side-section"><summary><div><strong>Refine palette</strong><span>Accent, text, and intensity</span></div><span class="ts-chip">Build-a-Bear</span><i aria-hidden="true">⌄</i></summary><div class="ts-pack-side-body">${this.renderQuickPalette()}</div></details><details class="ts-pack-side-section"><summary><div><strong>Asset slots</strong><span>${pack.assetSlots.length} declared · safe defaults</span></div><span class="ts-chip">Foundation</span><i aria-hidden="true">⌄</i></summary><div class="ts-pack-side-body"><div class="ts-pack-assets">${assetRows}</div></div></details></div></aside></div>`
  }

  private styleLibraryActiveFilterCount(): number {
    // Surface is a first-class browse axis rendered directly in the library.
    // Only tucked-away compatibility/family constraints count as hidden filters.
    return Number(this.styleLibraryFamily !== 'all') + Number(this.styleLibraryLayout !== 'all')
  }

  private renderStyleLibraryFilterDialog(families: string[]): string {
    if (!this.styleLibraryFiltersOpen) return ''
    const active = this.styleLibraryActiveFilterCount()
    return `<div class="ts-library-filter-layer"><button class="ts-library-filter-scrim" type="button" data-library-filter-action="close" aria-label="Close filters"></button><section class="ts-library-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="ts-library-filter-title"><header><div><p class="ts-kicker">Browse controls</p><h3 id="ts-library-filter-title">More filters</h3><span>Surface stays visible in the library. Use this sheet only for message compatibility and style-family narrowing.</span></div><button class="ts-btn ts-btn-icon" type="button" data-library-filter-action="close" aria-label="Close filters">×</button></header><div class="ts-library-filter-body"><section><div class="ts-library-filter-label"><strong>Message layout</strong><span>Compatibility, not guesswork</span></div><div class="ts-library-filter-grid ts-library-filter-grid-small"><button type="button" data-library-layout="all" aria-pressed="${this.styleLibraryLayout === 'all'}">Any</button><button type="button" data-library-layout="bubble" aria-pressed="${this.styleLibraryLayout === 'bubble'}">Bubble</button><button type="button" data-library-layout="minimal" aria-pressed="${this.styleLibraryLayout === 'minimal'}">Minimal</button></div></section><section><div class="ts-library-filter-label"><strong>Style family</strong><span>Filters recipe cards only</span></div><div class="ts-library-family-grid"><button type="button" data-library-family="all" aria-pressed="${this.styleLibraryFamily === 'all'}">All families</button>${families.map((family) => `<button type="button" data-library-family="${escapeHtml(family)}" aria-pressed="${this.styleLibraryFamily === family}">${escapeHtml(family)}</button>`).join('')}</div></section></div><footer><span>${active ? `${active} active filter${active === 1 ? '' : 's'}` : 'No extra filters'}</span><button class="ts-btn" type="button" data-library-filter-action="reset" ${active ? '' : 'disabled'}>Clear filters</button><button class="ts-btn ts-btn-primary" type="button" data-library-filter-action="close">Show results</button></footer></section></div>`
  }

  private renderStyleLibrary(): void {
    const root = this.styleLibraryRoot
    if (!root) return
    if (!this.styleLibraryOpen) { root.hidden = true; root.replaceChildren(); return }
    if (this.styleLibraryPackId) {
      this.styleLibraryPackScrollTop = root.querySelector<HTMLElement>('.ts-pack-main')?.scrollTop ?? this.styleLibraryPackScrollTop
      this.styleLibraryPackSidebarScrollTop = root.querySelector<HTMLElement>('.ts-pack-sidebar')?.scrollTop ?? this.styleLibraryPackSidebarScrollTop
    }
    root.hidden = false
    const pack = this.styleLibraryPackId ? packForId(this.styleLibraryPackId) : undefined
    const docked = this.styleLibraryPresentation === 'dock'
    const backdrop = docked ? '' : '<div class="ts-style-library-backdrop" data-library-action="close"></div>'
    const modalA11y = docked ? 'role="region"' : 'role="dialog" aria-modal="true"'
    if (pack) {
      this.styleLibraryFiltersOpen = false
      root.innerHTML = `${backdrop}<section class="ts-style-library-modal ts-preset-library ts-pack-detail" ${modalA11y} aria-labelledby="ts-style-library-title" style="--ts-quick-accent:${escapeHtml(this.quickAccent)};--ts-quick-text:${escapeHtml(this.quickText)};--ts-quick-intensity:${this.quickIntensity / 100}">${this.renderPackDetail(pack)}</section>`
      this.bindStyleLibrary()
      const packMain = root.querySelector<HTMLElement>('.ts-pack-main')
      const packSidebar = root.querySelector<HTMLElement>('.ts-pack-sidebar')
      if (packMain) packMain.scrollTop = this.styleLibraryPackScrollTop
      if (packSidebar) packSidebar.scrollTop = this.styleLibraryPackSidebarScrollTop
      return
    }
    const recipes = this.libraryFilteredRecipes()
    const packs = this.libraryFilteredPacks()
    const families = styleLibraryFamilies()
    const minimal = MESSAGE_LAYOUT_AUDITS.minimal
    const layoutNote = this.styleLibraryLayout === 'minimal'
      ? `<div class="ts-library-audit"><div><strong>MinimalMessage has real adapters now.</strong><span>${Object.keys(minimal.roles).length} mapped roles are available; Manga is the first pack using them instead of borrowing BubbleMessage choreography.</span></div><span class="ts-chip">${minimal.catalogClasses.length} native parts</span></div>`
      : ''
    const groups = this.styleLibraryArea === 'all'
      ? STYLE_LIBRARY_AREAS.filter((area) => area.id !== 'all').map((area) => ({ label: area.label, entries: recipes.filter((entry) => entry.area === area.id) })).filter((group) => group.entries.length)
      : [{ label: STYLE_LIBRARY_AREAS.find((area) => area.id === this.styleLibraryArea)?.label ?? 'Styles', entries: recipes }]
    const viewLabels = { browse: 'Browse', recent: 'Recent', applied: 'Applied', favorites: 'Favorites', 'my-styles': 'My Styles' } as const
    const viewTabs = ([['browse','Browse'],['recent','Recent'],['applied','Applied'],['favorites','Favorites'],['my-styles','My Styles']] as const).map(([id,label]) => `<button type="button" data-library-view="${id}" aria-pressed="${this.styleLibraryView === id}"><span>${id === 'favorites' ? '☆' : id === 'recent' ? '↺' : id === 'applied' ? '✓' : id === 'my-styles' ? '✦' : '▦'}</span>${label}</button>`).join('')
    const emptyCopy = this.styleLibraryView === 'my-styles' ? 'Save a target, component, or hand-picked Bundle from Design and it will live here across theme projects.' : this.styleLibraryView === 'favorites' ? 'Favorite a style or pack and it will wait here for you.' : this.styleLibraryView === 'recent' ? 'Apply or open something and it will appear here.' : this.styleLibraryView === 'applied' ? 'No Quick Style layers are currently applied in this project.' : this.styleLibraryLayout === 'minimal' ? 'Try the Manga pack: it contains the first real MinimalMessage composition.' : 'Try another surface or clear the filters.'
    const activeFilters = this.styleLibraryActiveFilterCount()
    const surfaceTabs = STYLE_LIBRARY_AREAS.map((area) => `<button type="button" data-library-area="${area.id}" aria-pressed="${this.styleLibraryArea === area.id}">${escapeHtml(area.label)}</button>`).join('')
    const filterChips = [
      this.styleLibraryLayout !== 'all' ? `<button type="button" data-library-clear-filter="layout">${escapeHtml(this.styleLibraryLayout === 'bubble' ? 'Bubble' : 'Minimal')} <span>×</span></button>` : '',
      this.styleLibraryFamily !== 'all' ? `<button type="button" data-library-clear-filter="family">${escapeHtml(this.styleLibraryFamily)} family <span>×</span></button>` : '',
    ].filter(Boolean).join('')
    const composerWorkshop = this.styleLibraryView === 'browse' && this.styleLibraryArea === 'composer' ? this.renderComposerWorkshop() : ''
    const savedStyles = this.store.snapshot.savedStyles
    const totalCopy = this.styleLibraryView === 'my-styles' ? `${savedStyles.length} saved style${savedStyles.length === 1 ? '' : 's'}` : `${recipes.length} style${recipes.length === 1 ? '' : 's'} · ${packs.length} pack${packs.length === 1 ? '' : 's'}`
    root.innerHTML = `${backdrop}<section class="ts-style-library-modal ts-preset-library ts-library-browser" ${modalA11y} aria-labelledby="ts-style-library-title" style="--ts-quick-accent:${escapeHtml(this.quickAccent)};--ts-quick-text:${escapeHtml(this.quickText)};--ts-quick-intensity:${this.quickIntensity / 100}"><header class="ts-style-library-head"><div><p class="ts-kicker">Style library</p><h2 id="ts-style-library-title">${this.styleLibraryView === 'my-styles' ? 'My Styles' : 'Browse looks'}</h2><span>${this.styleLibraryView === 'my-styles' ? 'Reusable semantic looks you saved yourself. Apply them across theme projects without copying CSS.' : 'Packs are collections. Styles are the pieces. Search the warehouse without wearing the inventory terminal as a hat.'}</span></div><div class="ts-style-library-head-actions">${this.renderStyleLibraryPresentationButton()}<button class="ts-btn ts-btn-icon" type="button" data-library-action="close" aria-label="Close style library">×</button></div></header><div class="ts-library-workspace"><aside class="ts-library-sidebar"><nav class="ts-library-view-nav" aria-label="Library view">${viewTabs}</nav><section class="ts-library-side-status"><span class="ts-kicker">${escapeHtml(viewLabels[this.styleLibraryView])}</span><strong data-library-result-count>${escapeHtml(totalCopy)}</strong><p>${this.styleLibraryView === 'browse' ? 'Explore packs and individual styles.' : this.styleLibraryView === 'recent' ? 'Things you touched lately.' : this.styleLibraryView === 'applied' ? 'Layers currently contributing.' : this.styleLibraryView === 'my-styles' ? 'Reusable looks you authored yourself.' : 'Your saved fashion crimes.'}</p></section><details class="ts-library-tune"><summary><div><strong>Tune previews</strong><span><i style="--swatch:${escapeHtml(this.quickAccent)}"></i><i style="--swatch:${escapeHtml(this.quickText)}"></i>${this.quickIntensity}%</span></div><b>⌄</b></summary><div class="ts-library-tune-body">${this.renderQuickPalette()}</div></details></aside><section class="ts-library-results${this.styleLibraryMobileBrowseCollapsed ? ' is-mobile-browse-collapsed' : ''}"><button class="ts-library-mobile-browse-toggle" type="button" data-library-action="mobile-browse-toggle" aria-expanded="${!this.styleLibraryMobileBrowseCollapsed}"><span><small>Browse controls</small><strong>${this.styleLibraryView === 'my-styles' ? 'My Styles' : this.styleLibraryArea === 'all' ? 'All styles' : escapeHtml(STYLE_LIBRARY_AREAS.find((entry) => entry.id === this.styleLibraryArea)?.label ?? 'Styles')}</strong></span><b aria-hidden="true">⌄</b></button><div class="ts-library-results-toolbar"><div class="ts-library-results-title"><div class="ts-library-results-heading"><span class="ts-kicker">${escapeHtml(viewLabels[this.styleLibraryView])}</span><strong>${this.styleLibraryView === 'my-styles' ? 'Saved by you' : this.styleLibraryArea === 'all' ? 'All styles' : escapeHtml(STYLE_LIBRARY_AREAS.find((entry) => entry.id === this.styleLibraryArea)?.label ?? 'Styles')}</strong></div>${this.styleLibraryView === 'my-styles' ? '' : `<nav class="ts-library-surface-nav" aria-label="Library surface">${surfaceTabs}</nav>`}<span data-library-result-count>${escapeHtml(totalCopy)}</span></div><div class="ts-library-search-row"><label class="ts-library-search"><span>Search library</span><input class="ts-search" type="search" value="${escapeHtml(this.styleLibraryQuery)}" placeholder="${this.styleLibraryView === 'my-styles' ? 'Search your saved styles…' : 'minimal portrait, manga heading, glass composer…'}" data-library-search></label>${this.styleLibraryView === 'my-styles' ? '' : `<button class="ts-library-pack-owned-toggle" type="button" data-library-pack-owned aria-pressed="${this.styleLibraryShowPackOwned}" title="${this.styleLibraryShowPackOwned ? 'Hide' : 'Show'} individual styles that also belong to a pack"><span class="ts-library-toggle-track" aria-hidden="true"><i></i></span><span>Show pack-owned</span></button><button class="ts-btn ts-library-filter-trigger" type="button" data-library-filter-action="open" aria-expanded="${this.styleLibraryFiltersOpen}">More filters${activeFilters ? `<span>${activeFilters}</span>` : ''}</button>`}</div>${filterChips && this.styleLibraryView !== 'my-styles' ? `<div class="ts-library-active-filters"><span>Extra filters</span>${filterChips}<button type="button" data-library-filter-action="reset">Clear all</button></div>` : ''}</div><main class="ts-style-library-scroll">${this.styleLibraryView === 'my-styles' ? (savedStyles.length ? `<section class="ts-library-group ts-saved-style-group"><div class="ts-library-group-head"><div><strong>My Styles</strong><small>Cross-project semantic styles · apply without copying CSS</small></div><span>${savedStyles.length}</span></div><div class="ts-saved-style-grid">${savedStyles.map((style) => this.renderSavedStyleCard(style)).join('')}</div></section>` : `<div class="ts-library-empty"><strong>Nothing saved yet.</strong><span>${escapeHtml(emptyCopy)}</span></div>`) : `${layoutNote}${composerWorkshop}${packs.length ? `<section class="ts-library-group ts-pack-group"><div class="ts-library-group-head"><div><strong>Packs</strong><small>Coordinated collections · open before applying</small></div><span>${packs.length}</span></div><div class="ts-pack-grid">${packs.map((entry) => this.renderPackCard(entry)).join('')}</div></section>` : ''}${groups.length ? groups.map((group) => `<section class="ts-library-group"><div class="ts-library-group-head"><div><strong>${escapeHtml(group.label)}</strong><small>Individual styles · apply here or pencil into Design</small></div><span>${group.entries.length}</span></div>${this.renderPresetCards(group.entries.map((entry) => entry.preset), { library: true })}</section>`).join('') : !packs.length ? `<div class="ts-library-empty"><strong>Nothing here yet.</strong><span>${escapeHtml(emptyCopy)}</span></div>` : ''}`}</main></section></div>${this.renderStyleLibraryFilterDialog(families)}</section>`
    this.bindStyleLibrary()
    const composerSidecar = root.querySelector<HTMLElement>('.ts-composer-workshop-sidecar')
    if (composerSidecar) this.bindDesign(composerSidecar)
    const composerSidecarScroll = root.querySelector<HTMLElement>('.ts-composer-sidecar-scroll')
    if (composerSidecarScroll && this.composerWorkshopSidecarScrollTop) composerSidecarScroll.scrollTop = this.composerWorkshopSidecarScrollTop
    const composerAnatomyScroll = root.querySelector<HTMLElement>('.ts-composer-workshop-groups')
    if (composerAnatomyScroll && this.composerWorkshopAnatomyScrollTop) composerAnatomyScroll.scrollTop = this.composerWorkshopAnatomyScrollTop
    this.applyLibrarySearch()
    const scroller = root.querySelector<HTMLElement>('.ts-style-library-scroll')
    if (scroller && this.styleLibraryScrollTop) scroller.scrollTop = this.styleLibraryScrollTop
  }

  private applyLibrarySearch(): void {
    const root = this.styleLibraryRoot
    if (!root) return
    const terms = this.styleLibraryQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
    root.querySelectorAll<HTMLElement>('[data-library-card]').forEach((card) => {
      const haystack = card.dataset.librarySearch ?? ''
      card.hidden = terms.length > 0 && !terms.every((term) => haystack.includes(term))
    })
    root.querySelectorAll<HTMLElement>('.ts-library-group').forEach((group) => { group.hidden = !group.querySelector('[data-library-card]:not([hidden])') })
    const visibleRecipes = root.querySelectorAll('[data-library-kind="recipe"]:not([hidden])').length
    const visiblePacks = root.querySelectorAll('[data-library-kind="pack"]:not([hidden])').length
    const visibleSaved = root.querySelectorAll('[data-library-kind="saved"]:not([hidden])').length
    root.querySelectorAll<HTMLElement>('[data-library-result-count]').forEach((count) => { count.textContent = this.styleLibraryView === 'my-styles' ? `${visibleSaved} saved style${visibleSaved === 1 ? '' : 's'}` : `${visibleRecipes} style${visibleRecipes === 1 ? '' : 's'} · ${visiblePacks} pack${visiblePacks === 1 ? '' : 's'}` })
  }

  private bindStyleLibrary(): void {
    const root = this.styleLibraryRoot
    if (!root) return
    root.querySelectorAll<HTMLElement>('[data-library-action="close"]').forEach((element) => element.addEventListener('click', () => {
      this.styleLibraryOpen = false
      this.styleLibraryFiltersOpen = false
      this.styleLibraryPackId = null
      if (this.styleLibraryPresentation === 'dock') this.setStyleLibraryPresentation('fullscreen')
      else this.renderStyleLibrary()
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-library-action="presentation"]').forEach((button) => button.addEventListener('click', () => this.setStyleLibraryPresentation(this.styleLibraryPresentation === 'dock' ? 'fullscreen' : 'dock')))
    root.querySelector<HTMLButtonElement>('[data-library-action="mobile-browse-toggle"]')?.addEventListener('click', () => { this.styleLibraryMobileBrowseCollapsed = !this.styleLibraryMobileBrowseCollapsed; this.renderStyleLibrary() })
    root.querySelectorAll<HTMLButtonElement>('[data-library-filter-action]').forEach((button) => button.addEventListener('click', () => { const action = button.dataset.libraryFilterAction; if (action === 'open') this.styleLibraryFiltersOpen = true; else if (action === 'close') this.styleLibraryFiltersOpen = false; else if (action === 'reset') { this.styleLibraryFamily = 'all'; this.styleLibraryLayout = 'all' } this.renderStyleLibrary() }))
    root.querySelectorAll<HTMLButtonElement>('[data-library-clear-filter]').forEach((button) => button.addEventListener('click', () => { const filter = button.dataset.libraryClearFilter; if (filter === 'area') this.styleLibraryArea = 'all'; else if (filter === 'family') this.styleLibraryFamily = 'all'; else if (filter === 'layout') this.styleLibraryLayout = 'all'; this.renderStyleLibrary() }))
    root.querySelector<HTMLElement>('[data-library-action="back"]')?.addEventListener('click', () => { this.styleLibraryPackId = null; this.styleLibraryPackScrollTop = 0; this.styleLibraryPackSidebarScrollTop = 0; this.renderStyleLibrary() })
    root.querySelectorAll<HTMLButtonElement>('[data-library-view]').forEach((button) => button.addEventListener('click', () => { this.styleLibraryView = button.dataset.libraryView as typeof this.styleLibraryView; this.styleLibraryPackId = null; this.renderStyleLibrary() }))
    root.querySelectorAll<HTMLButtonElement>('[data-library-area]').forEach((button) => button.addEventListener('click', () => { this.styleLibraryArea = button.dataset.libraryArea as 'all' | StyleLibraryArea; if (this.styleLibraryArea !== 'composer') { this.composerWorkshopRole = null; this.composerWorkshopAnatomyScrollTop = 0 } this.renderStyleLibrary() }))
    root.querySelectorAll<HTMLButtonElement>('[data-composer-workshop-role]').forEach((button) => button.addEventListener('click', () => { const roleId = button.dataset.composerWorkshopRole as KnownPartRoleId | undefined; if (roleId && KNOWN_PART_ROLES[roleId]) this.openKnownRoleInComposerWorkshop(roleId) }))
    root.querySelector<HTMLElement>('.ts-composer-workshop-preview')?.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-composer-mock-role]') : null
      const roleId = target?.dataset.composerMockRole as KnownPartRoleId | undefined
      const action = target?.dataset.composerMockAction as ComposerIconAction | undefined
      if (action && COMPOSER_ICON_ACTIONS.includes(action)) { this.openComposerActionInWorkshop(action); return }
      if (roleId && KNOWN_PART_ROLES[roleId]) this.openKnownRoleInComposerWorkshop(roleId)
    })
    root.querySelector<HTMLButtonElement>('[data-composer-workshop-back]')?.addEventListener('click', () => { this.composerWorkshopRole = null; this.composerWorkshopSidecarScrollTop = 0; this.packetMenuOpen = false; this.renderStyleLibrary() })
    root.querySelector<HTMLButtonElement>('[data-composer-workshop-full-design]')?.addEventListener('click', () => { if (!this.composerWorkshopRole) return; if (this.composerWorkshopRole === 'input.actionbar' && this.selection && activeScope(this.selection).selector.includes('[data-composer-action=')) { this.composerWorkshopRole = null; this.leaveStyleLibraryForDesign(); this.workspace = 'design'; this.render(); return } this.openKnownRoleInDesign(this.composerWorkshopRole) })
    root.querySelector<HTMLButtonElement>('[data-composer-workshop-add-icons]')?.addEventListener('click', () => {
      if (this.composerWorkshopRole !== 'input.actionbar' || !this.selection || activeScope(this.selection).persistence !== 'persistent') return
      const packet = createStylePacket('composer-icons')
      this.activeGuidePacketType = 'composer-icons'
      this.packetMenuOpen = false
      this.store.upsertPacket(this.targetForSelection(), packet, this.editingState, this.editingScope)
      this.revealStylePacket(packet.id)
    })
    root.querySelector<HTMLButtonElement>('[data-library-pack-owned]')?.addEventListener('click', () => { this.styleLibraryShowPackOwned = !this.styleLibraryShowPackOwned; this.renderStyleLibrary() })
    root.querySelectorAll<HTMLButtonElement>('[data-library-family]').forEach((button) => button.addEventListener('click', () => { this.styleLibraryFamily = button.dataset.libraryFamily ?? 'all'; this.renderStyleLibrary() }))
    root.querySelectorAll<HTMLButtonElement>('[data-library-family-jump]').forEach((button) => button.addEventListener('click', () => { this.styleLibraryFamily = button.dataset.libraryFamilyJump ?? 'all'; this.styleLibraryFiltersOpen = false; this.renderStyleLibrary() }))
    root.querySelectorAll<HTMLButtonElement>('[data-library-layout]').forEach((button) => button.addEventListener('click', () => { this.styleLibraryLayout = button.dataset.libraryLayout as 'all' | MessageLayoutSupport; this.renderStyleLibrary() }))
    root.querySelectorAll<HTMLElement>('[data-library-pack]').forEach((button) => button.addEventListener('click', () => { const scroller = root.querySelector<HTMLElement>('.ts-style-library-scroll'); this.styleLibraryScrollTop = scroller?.scrollTop ?? 0; this.styleLibraryFiltersOpen = false; this.styleLibraryPackId = button.dataset.libraryPack ?? null; if (this.styleLibraryPackId) this.adoptPackPalette(this.styleLibraryPackId); this.styleLibraryPackScrollTop = 0; this.styleLibraryPackSidebarScrollTop = 0; this.renderStyleLibrary() }))
    root.querySelectorAll<HTMLButtonElement>('[data-library-favorite]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); const key = button.dataset.libraryFavorite as StyleLibraryItemKey | undefined; if (key) this.toggleStyleLibraryFavorite(key) }))
    root.querySelectorAll<HTMLButtonElement>('[data-library-pack-apply]').forEach((button) => button.addEventListener('click', () => this.applyStylePack(button.dataset.libraryPackApply ?? '')))
    root.querySelectorAll<HTMLButtonElement>('[data-library-pack-reset]').forEach((button) => button.addEventListener('click', () => this.resetStylePack(button.dataset.libraryPackReset ?? '')))
    root.querySelectorAll<HTMLButtonElement>('[data-saved-style-apply]').forEach((button) => button.addEventListener('click', () => { if (this.store.applySavedStyle(button.dataset.savedStyleApply ?? '')) this.renderStyleLibrary() }))
    root.querySelectorAll<HTMLButtonElement>('[data-saved-style-rename]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.savedStyleRename ?? ''; const current = this.store.snapshot.savedStyles.find((entry) => entry.id === id); if (!current || typeof window === 'undefined') return; const name = window.prompt?.('Rename saved style', current.name); if (name?.trim()) this.store.renameSavedStyle(id, name) }))
    root.querySelectorAll<HTMLButtonElement>('[data-saved-style-delete]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.savedStyleDelete ?? ''; const current = this.store.snapshot.savedStyles.find((entry) => entry.id === id); if (!current || typeof window === 'undefined') return; if (window.confirm?.(`Delete “${current.name}” from My Styles?`)) this.store.removeSavedStyle(id) }))
    root.querySelectorAll<HTMLSelectElement>('[data-pack-asset-path]').forEach((input) => input.addEventListener('change', () => void this.bindPackAssetFromPath(input.dataset.packId ?? '', input.dataset.packAssetPath ?? '', input.value)))
    root.querySelectorAll<HTMLSelectElement>('[data-pack-asset-anchor]').forEach((input) => input.addEventListener('change', () => this.applyPackAssetBinding(input.dataset.packId ?? '', input.dataset.packAssetAnchor ?? '', { anchorRole: input.value as KnownPartRoleId })))
    root.querySelectorAll<HTMLButtonElement>('[data-pack-asset-surface]').forEach((button) => button.addEventListener('click', () => this.applyPackAssetBinding(button.dataset.packId ?? '', button.dataset.slotId ?? '', { surface: (button.dataset.packAssetSurface ?? 'after') as 'before'|'after' })))
    root.querySelectorAll<HTMLButtonElement>('[data-pack-asset-corner]').forEach((button) => button.addEventListener('click', () => this.applyPackAssetBinding(button.dataset.packId ?? '', button.dataset.slotId ?? '', { corner: (button.dataset.packAssetCorner ?? 'tl') as 'tl'|'tr'|'bl'|'br' })))
    root.querySelectorAll<HTMLElement>('[data-pack-asset-pad]').forEach((pad) => {
      const packId = pad.dataset.packId ?? ''
      const slotId = pad.dataset.packAssetPad ?? ''
      const xInput = pad.parentElement?.querySelector<HTMLInputElement>(`[data-pack-asset-x="${escapeCssIdentifier(slotId)}"]`)
      const yInput = pad.parentElement?.querySelector<HTMLInputElement>(`[data-pack-asset-y="${escapeCssIdentifier(slotId)}"]`)
      let nextX = Number(pad.dataset.packAssetPadX) || 0
      let nextY = Number(pad.dataset.packAssetPadY) || 0
      const preview = (event: PointerEvent) => {
        const rect = pad.getBoundingClientRect()
        nextX = Math.round(Math.max(-200, Math.min(200, ((event.clientX - rect.left) / Math.max(1, rect.width) - .5) * 400)))
        nextY = Math.round(Math.max(-200, Math.min(200, ((event.clientY - rect.top) / Math.max(1, rect.height) - .5) * 400)))
        pad.style.setProperty('--ts-offset-left', `${50 + nextX / 4}%`)
        pad.style.setProperty('--ts-offset-top', `${50 + nextY / 4}%`)
        if (xInput) xInput.value = String(nextX)
        if (yInput) yInput.value = String(nextY)
      }
      pad.addEventListener('pointerdown', (event) => { pad.setPointerCapture(event.pointerId); preview(event) })
      pad.addEventListener('pointermove', (event) => { if (pad.hasPointerCapture(event.pointerId)) preview(event) })
      pad.addEventListener('pointerup', (event) => { if (pad.hasPointerCapture(event.pointerId)) pad.releasePointerCapture(event.pointerId); this.applyPackAssetBinding(packId, slotId, { x: nextX, y: nextY }) })
    })
    root.querySelectorAll<HTMLInputElement>('[data-pack-asset-x]').forEach((input) => input.addEventListener('change', () => this.applyPackAssetBinding(input.dataset.packId ?? '', input.dataset.packAssetX ?? '', { x: Number(input.value) || 0 })))
    root.querySelectorAll<HTMLInputElement>('[data-pack-asset-y]').forEach((input) => input.addEventListener('change', () => this.applyPackAssetBinding(input.dataset.packId ?? '', input.dataset.packAssetY ?? '', { y: Number(input.value) || 0 })))
    root.querySelectorAll<HTMLInputElement>('[data-pack-asset-size]').forEach((input) => {
      input.addEventListener('input', () => { const label = root.querySelector<HTMLElement>(`[data-pack-asset-size-value="${escapeCssIdentifier(input.dataset.packAssetSize ?? '')}"]`); if (label) label.textContent = `${Math.round(Number(input.value) || 0)}px` })
      input.addEventListener('change', () => this.applyPackAssetBinding(input.dataset.packId ?? '', input.dataset.packAssetSize ?? '', { size: Number(input.value) || 96 }))
    })
    root.querySelectorAll<HTMLButtonElement>('[data-pack-layout]').forEach((button) => button.addEventListener('click', () => this.setPackWorkbenchLayout(button.dataset.packId ?? '', button.dataset.packLayout as PackWorkbenchLayout)))
    root.querySelectorAll<HTMLButtonElement>('[data-pack-select-preset]').forEach((button) => button.addEventListener('click', () => this.togglePackWorkbenchPreset(button.dataset.packId ?? '', button.dataset.packSelectPreset ?? '')))
    root.querySelectorAll<HTMLButtonElement>('[data-pack-selection-mode]').forEach((button) => button.addEventListener('click', () => this.setPackWorkbenchSelection(button.dataset.packId ?? '', button.dataset.packSelectionMode as 'defaults' | 'all' | 'clear')))
    root.querySelectorAll<HTMLButtonElement>('[data-pack-toggle-section]').forEach((button) => button.addEventListener('click', () => this.togglePackWorkbenchSection(button.dataset.packId ?? '', button.dataset.packToggleSection ?? '')))
    root.querySelectorAll<HTMLButtonElement>('[data-pack-apply-selection]').forEach((button) => button.addEventListener('click', () => this.applyPackWorkbenchSelection(button.dataset.packApplySelection ?? '')))
    root.querySelectorAll<HTMLButtonElement>('[data-pack-reset-selection]').forEach((button) => button.addEventListener('click', () => this.resetPackWorkbenchSelection(button.dataset.packResetSelection ?? '')))
    const packMain = root.querySelector<HTMLElement>('.ts-pack-main')
    const packNav = root.querySelector<HTMLElement>('.ts-pack-section-nav')
    const packNavButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-pack-scroll-section]')]
    const packSections = [...root.querySelectorAll<HTMLElement>('[data-pack-section]')]
    const syncPackSectionNav = () => {
      if (!packMain || !packNav || !packSections.length) return
      const mainTop = packMain.getBoundingClientRect().top
      const threshold = mainTop + packNav.offsetHeight + 22
      let activeIndex = 0
      packSections.forEach((section, index) => {
        if (section.getBoundingClientRect().top <= threshold) activeIndex = index
      })
      packNavButtons.forEach((button, index) => button.setAttribute('aria-current', index === activeIndex ? 'true' : 'false'))
    }
    packNavButtons.forEach((button) => button.addEventListener('click', () => {
      const section = root.querySelector<HTMLElement>(`[data-pack-section="${escapeCssIdentifier(button.dataset.packScrollSection ?? '')}"]`)
      if (!section || !packMain) return
      const mainRect = packMain.getBoundingClientRect()
      const navHeight = packNav?.offsetHeight ?? 0
      const top = section.getBoundingClientRect().top - mainRect.top + packMain.scrollTop - navHeight - 10
      packMain.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }))
    packMain?.addEventListener('scroll', syncPackSectionNav, { passive: true })
    syncPackSectionNav()
    root.querySelectorAll<HTMLButtonElement>('[data-apply-common-preset]').forEach((button) => button.addEventListener('click', () => this.applyCommonPreset(button.dataset.applyCommonPreset ?? '', false)))
    root.querySelectorAll<HTMLButtonElement>('[data-edit-common-preset]').forEach((button) => button.addEventListener('click', () => { this.leaveStyleLibraryForDesign(); this.applyCommonPreset(button.dataset.editCommonPreset ?? '', true) }))
    root.querySelectorAll<HTMLButtonElement>('[data-reset-common-preset]').forEach((button) => button.addEventListener('click', () => this.resetCommonPreset(button.dataset.resetCommonPreset ?? '')))
    const search = root.querySelector<HTMLInputElement>('[data-library-search]')
    search?.addEventListener('input', () => { this.styleLibraryQuery = search.value; this.applyLibrarySearch() })
    const setQuickColor = (key: 'accent' | 'text', value: string) => {
      if (!/^#[0-9a-f]{6}$/i.test(value)) return
      if (key === 'accent') this.quickAccent = value.toLowerCase(); else this.quickText = value.toLowerCase()
      root.style.setProperty(key === 'accent' ? '--ts-quick-accent' : '--ts-quick-text', value)
      root.querySelector<HTMLElement>('.ts-preset-library')?.style.setProperty(key === 'accent' ? '--ts-quick-accent' : '--ts-quick-text', value)
      this.root.querySelector<HTMLElement>('.ts-preset-library')?.style.setProperty(key === 'accent' ? '--ts-quick-accent' : '--ts-quick-text', value)
      root.querySelectorAll<HTMLInputElement>(`[data-quick-color="${key}"]`).forEach((peer) => { if (peer.value !== value) peer.value = value })
      // Palette changes are CSS-variable driven. Keep the library/pack viewport
      // stable instead of rebuilding the modal just because a swatch committed.
    }
    root.querySelectorAll<HTMLInputElement>('[data-quick-color]').forEach((input) => {
      input.addEventListener('input', () => { if (input.type === 'color') setQuickColor(input.dataset.quickColor as 'accent' | 'text', input.value) })
      input.addEventListener('change', () => setQuickColor(input.dataset.quickColor as 'accent' | 'text', input.value))
    })
    root.querySelectorAll<HTMLButtonElement>('[data-quick-recent]').forEach((button) => button.addEventListener('click', () => { const color = button.dataset.quickRecent; if (color) setQuickColor('accent', color) }))
    const range = root.querySelector<HTMLInputElement>('[data-quick-intensity]')
    const number = root.querySelector<HTMLInputElement>('[data-quick-intensity-number]')
    const preview = (raw: string) => {
      const value = Math.max(0, Math.min(100, Number(raw) || 0)); this.quickIntensity = value
      if (range) range.value = String(value); if (number) number.value = String(value)
      const label = root.querySelector<HTMLElement>('[data-quick-intensity-value]'); if (label) label.textContent = `${Math.round(value)}%`
      root.querySelector<HTMLElement>('.ts-preset-library')?.style.setProperty('--ts-quick-intensity', String(value / 100))
      this.root.querySelector<HTMLElement>('.ts-preset-library')?.style.setProperty('--ts-quick-intensity', String(value / 100))
    }
    range?.addEventListener('input', () => preview(range.value))
    range?.addEventListener('change', () => preview(range.value))
    number?.addEventListener('change', () => preview(number.value))
  }

  private saveFloatingState(): void {
    const frame = this.floatingFrame
    if (!frame) return
    try { localStorage.setItem('theme-studio:floating-editor', JSON.stringify({ left: frame.style.left, top: frame.style.top, mobileSnap: this.mobileFloatSnap, mobileEdge: this.mobileFloatEdge, mobileDensity: this.mobileInspectorDensity })) } catch { /* best effort */ }
  }

  private syncMobileEdgeControl(): void {
    const frame = this.floatingFrame
    const button = frame?.querySelector<HTMLButtonElement>('[data-widget-action="toggle-mobile-edge"]')
    if (!frame || !button) return
    frame.dataset.mobileEdge = this.mobileFloatEdge
    const destination = this.mobileFloatEdge === 'bottom' ? 'top' : 'bottom'
    button.title = `Attach editor to ${destination}`
    button.setAttribute('aria-label', `Attach floating editor to ${destination}`)
  }

  private syncMobileDensityControl(): void {
    const frame = this.floatingFrame
    const button = frame?.querySelector<HTMLButtonElement>('[data-widget-action="cycle-density"]')
    if (!frame || !button) return
    frame.dataset.mobileDensity = String(this.mobileInspectorDensity)
    button.textContent = `${this.mobileInspectorDensity}%`
    button.title = `Inspector density ${this.mobileInspectorDensity}% · tap for ${this.mobileInspectorDensity === 100 ? '80%' : this.mobileInspectorDensity === 80 ? '60%' : '100%'}`
    button.setAttribute('aria-label', button.title)
  }

  private cycleMobileInspectorDensity(): void {
    this.mobileInspectorDensity = this.mobileInspectorDensity === 100 ? 80 : this.mobileInspectorDensity === 80 ? 60 : 100
    this.syncMobileDensityControl()
    this.saveFloatingState()
  }

  private toggleMobileFloatEdge(): void {
    this.mobileFloatEdge = this.mobileFloatEdge === 'bottom' ? 'top' : 'bottom'
    this.syncMobileEdgeControl()
    this.saveFloatingState()
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(() => this.syncSelectionHighlight()))
    else this.syncSelectionHighlight()
  }

  private bindFloatingDrag(): void {
    const frame = this.floatingFrame
    const desktopHandle = frame?.querySelector<HTMLElement>('[data-widget-drag-handle]')
    const mobileHandle = frame?.querySelector<HTMLElement>('[data-mobile-sheet-drag-handle]')
    if (!frame || !desktopHandle || !mobileHandle) return

    desktopHandle.addEventListener('pointerdown', (event) => {
      if ((event.target as Element | null)?.closest('button')) return
      const mobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 600px)').matches
      if (mobile) return
      const start = frame.getBoundingClientRect()
      const startX = event.clientX, startY = event.clientY
      desktopHandle.setPointerCapture?.(event.pointerId)
      const move = (moveEvent: PointerEvent) => {
        const maxLeft = Math.max(8, window.innerWidth - frame.offsetWidth - 8)
        const maxTop = Math.max(8, window.innerHeight - Math.min(frame.offsetHeight, window.innerHeight - 16) - 8)
        frame.style.left = `${Math.max(8, Math.min(maxLeft, start.left + moveEvent.clientX - startX))}px`
        frame.style.top = `${Math.max(8, Math.min(maxTop, start.top + moveEvent.clientY - startY))}px`
        frame.style.right = 'auto'; frame.style.bottom = 'auto'
      }
      const up = (upEvent: PointerEvent) => {
        desktopHandle.releasePointerCapture?.(upEvent.pointerId)
        desktopHandle.removeEventListener('pointermove', move)
        desktopHandle.removeEventListener('pointerup', up)
        desktopHandle.removeEventListener('pointercancel', up)
        this.saveFloatingState()
        if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => this.syncSelectionHighlight())
      }
      desktopHandle.addEventListener('pointermove', move)
      desktopHandle.addEventListener('pointerup', up)
      desktopHandle.addEventListener('pointercancel', up)
    })

    mobileHandle.addEventListener('pointerdown', (event) => {
      const mobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 600px)').matches
      if (!mobile) return
      const start = frame.getBoundingClientRect()
      const startY = event.clientY
      mobileHandle.setPointerCapture?.(event.pointerId)
      // Seed the transient height with the actual rendered height. The anchored
      // edge never moves during the drag; only the opposite edge follows the
      // handle, so grabbing it cannot teleport the sheet.
      frame.style.setProperty('--ts-mobile-drag-height', `${Math.round(start.height)}px`)
      frame.dataset.mobileDragging = 'true'
      const move = (moveEvent: PointerEvent) => {
        const minHeight = Math.max(210, window.innerHeight * .30)
        const maxHeight = Math.max(minHeight, window.innerHeight * .92)
        const delta = this.mobileFloatEdge === 'bottom' ? startY - moveEvent.clientY : moveEvent.clientY - startY
        const height = Math.max(minHeight, Math.min(maxHeight, start.height + delta))
        frame.style.setProperty('--ts-mobile-drag-height', `${Math.round(height)}px`)
      }
      const up = (upEvent: PointerEvent) => {
        mobileHandle.releasePointerCapture?.(upEvent.pointerId)
        mobileHandle.removeEventListener('pointermove', move)
        mobileHandle.removeEventListener('pointerup', up)
        mobileHandle.removeEventListener('pointercancel', up)
        const ratio = frame.getBoundingClientRect().height / Math.max(1, window.innerHeight)
        this.mobileFloatSnap = ratio < .50 ? 'peek' : ratio < .80 ? 'work' : 'full'
        frame.dataset.mobileSnap = this.mobileFloatSnap
        delete frame.dataset.mobileDragging
        frame.style.removeProperty('--ts-mobile-drag-height')
        frame.style.height = ''
        this.saveFloatingState()
        if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => requestAnimationFrame(() => this.syncSelectionHighlight()))
      }
      mobileHandle.addEventListener('pointermove', move)
      mobileHandle.addEventListener('pointerup', up)
      mobileHandle.addEventListener('pointercancel', up)
    })
  }

  private floatEditor(workspace: WorkspaceTab = 'design'): void {
    if (!this.floatingFrame || !this.floatingBody || !this.drawerHost) return
    this.workspace = workspace
    this.editorFloating = true
    this.floatingFrame.hidden = false
    if (this.drawerPlaceholder) this.drawerPlaceholder.hidden = false
    this.floatingBody.append(this.root)
    this.render()
  }

  private dockEditor(): void {
    if (!this.editorFloating || !this.drawerHost) return
    this.drawerHost.insertBefore(this.root, this.drawerPlaceholder)
    this.editorFloating = false
    if (this.drawerPlaceholder) this.drawerPlaceholder.hidden = true
    if (this.floatingFrame) this.floatingFrame.hidden = true
    this.syncScrollViewport()
    this.renderWidget()
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => this.syncSelectionHighlight())
  }

  private widgetRelatedScope(): SelectionScope | undefined {
    if (!this.selection) return undefined
    const current = activeScope(this.selection)
    return this.selection.scopeCandidates.find((scope) => scope.persistence === 'persistent' && scope.selector !== current.selector && scope.type === 'similar-elements')
      ?? this.selection.scopeCandidates.find((scope) => scope.persistence === 'persistent' && scope.selector !== current.selector && scope.type === 'context-local')
  }

  private targetFromResolvedScope(selection: ResolvedSelection, scope: SelectionScope): StudioTarget {
    const existing = this.store.activeProject.componentOverrides.find((override) => override.target.selector === scope.selector)
    return {
      selector: scope.selector, strategy: scope.strategy, stability: scope.stability, persistence: scope.persistence, source: scope.source, label: scope.label,
      nativeComponentId: scope.nativeComponentId ?? scope.componentId ?? selection.nativeContext?.component.id, nativeContextSelector: scope.nativeContextSelector, localSelector: scope.localSelector,
      overrideStrength: existing?.target.overrideStrength ?? 'normal',
    }
  }
  private targetFromScope(scope: SelectionScope): StudioTarget {
    if (!this.selection) throw new Error('No Palette selection')
    return this.targetFromResolvedScope(this.selection, scope)
  }
  private groupScopeForSelection(selection: ResolvedSelection): SelectionScope {
    const pickedLevel = selection.targetLevels.find((level) => level.relation === 'picked')
    const pickedScope = pickedLevel ? selection.scopeCandidates.find((scope) => scope.id === pickedLevel.scopeId) : undefined
    const preferred = [pickedScope, activeScope(selection), ...selection.scopeCandidates].filter((entry): entry is SelectionScope => Boolean(entry))
    return preferred.find((scope) => scope.persistence === 'persistent' && scope.type !== 'similar-elements')
      ?? preferred.find((scope) => scope.persistence === 'persistent')
      ?? activeScope(selection)
  }

  private authoredSaveStyleOverrides(): ComponentOverride[] {
    return this.store.activeProject.componentOverrides.filter((entry) => entry.target.persistence === 'persistent')
  }

  private currentSaveStyleOverrides(kind: 'target' | 'component'): ComponentOverride[] {
    if (!this.selection) return []
    const project = this.store.activeProject
    const scope = activeScope(this.selection)
    const baseSelector = scope.selector
    if (kind === 'target') {
      const selectors = new Set([baseSelector, appendPseudoToSelectorList(baseSelector, '::before'), appendPseudoToSelectorList(baseSelector, '::after')])
      return project.componentOverrides.filter((entry) => selectors.has(entry.target.selector))
    }
    const componentId = scope.nativeComponentId ?? scope.componentId ?? this.selection.nativeContext?.component.id
    const contextSelector = scope.nativeContextSelector ?? this.selection.nativeContext?.component.selectors?.[0]
    const drawerTab = componentId?.match(/^mounted:drawer:(.+)$/)?.[1]
      ?? contextSelector?.match(/\[data-spindle-drawer-tab=["']([^"']+)["']\]/)?.[1]
    const matches = project.componentOverrides.filter((entry) => {
      if (drawerTab && this.drawerTabForSavedStyleOverride(entry) === drawerTab) return true
      if (componentId && entry.target.nativeComponentId === componentId) return true
      if (contextSelector && (entry.target.nativeContextSelector === contextSelector || entry.target.selector.includes(contextSelector))) return true
      return false
    })
    return matches.length ? matches : this.currentSaveStyleOverrides('target')
  }

  private savedStyleOverrideKey(override: ComponentOverride): string { return override.id }
  private savedStylePacketCount(override: ComponentOverride): number {
    return STYLE_STATES.reduce((sum, state) => sum + (override.states[state]?.length ?? 0) + (override.mobileStates?.[state]?.length ?? 0), 0)
  }
  private savedStyleDrawerLabel(drawerTab: string): string {
    return drawerTab.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }
  private drawerTabForSavedStyleOverride(override: ComponentOverride): string | undefined {
    const metadata = override.target.nativeComponentId?.match(/^mounted:drawer:(.+)$/)?.[1]
    if (metadata) return metadata
    for (const selector of [override.target.nativeContextSelector, override.target.selector]) {
      const encoded = selector?.match(/\[data-spindle-drawer-tab=["']([^"']+)["']\]/)?.[1]
      if (encoded) return encoded
    }
    if (typeof document === 'undefined') return undefined
    const selector = override.target.selector.replace(/::(?:before|after)\b/g, '')
    try {
      const drawerTabs = new Set<string>()
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 40)) {
        const drawerTab = element.closest('[data-spindle-drawer-tab]')?.getAttribute('data-spindle-drawer-tab')?.trim()
        if (drawerTab) drawerTabs.add(drawerTab)
      }
      return drawerTabs.size === 1 ? [...drawerTabs][0] : undefined
    } catch {
      return undefined
    }
  }
  private savedStyleComponentLabel(override: ComponentOverride): string {
    const drawerTab = this.drawerTabForSavedStyleOverride(override)
    if (drawerTab) return this.savedStyleDrawerLabel(drawerTab)
    const native = override.target.nativeComponentId ? this.components.find((entry) => entry.id === override.target.nativeComponentId)?.label : undefined
    if (native) return native
    return override.target.label?.split(' · ')[0] ?? 'Other'
  }
  private savedStyleTargetLabel(override: ComponentOverride): string {
    const pseudo = /::(before|after)\s*$/.exec(override.target.selector)?.[1]
    const base = override.target.label ?? override.target.localSelector ?? override.target.selector
    return pseudo ? `${base} · ${pseudo === 'before' ? 'Back layer' : 'Front layer'}` : base
  }
  private beginSavedStyleChooser(): void {
    this.savedStyleChooserOpen = true
    this.savedStyleSelection.clear()
    for (const override of this.currentSaveStyleOverrides('component')) this.savedStyleSelection.add(this.savedStyleOverrideKey(override))
    if (!this.savedStyleSelection.size) for (const override of this.currentSaveStyleOverrides('target')) this.savedStyleSelection.add(this.savedStyleOverrideKey(override))
    this.render()
  }
  private chosenSavedStyleOverrides(): ComponentOverride[] {
    return this.authoredSaveStyleOverrides().filter((entry) => this.savedStyleSelection.has(this.savedStyleOverrideKey(entry)))
  }
  private saveCurrentStyle(kind: 'target' | 'component' | 'bundle'): void {
    if (!this.selection || typeof window === 'undefined') return
    const overrides = kind === 'bundle' ? this.chosenSavedStyleOverrides() : this.currentSaveStyleOverrides(kind)
    if (!overrides.length) { window.alert?.('Nothing authored here yet. Add or edit a style first.'); return }
    const scope = activeScope(this.selection)
    const componentLabel = this.selection.nativeContext?.component.label
    const suggested = kind === 'bundle' ? `${componentLabel ?? 'Palette'} bundle` : kind === 'component' ? `${componentLabel ?? scope.label} style` : `${scope.label} style`
    const name = window.prompt?.('Save to My Styles', suggested)
    if (name === null || !name?.trim()) return
    const sourceLabel = kind === 'bundle' ? `${overrides.length} selected parts` : kind === 'component' ? componentLabel ?? scope.label : scope.label
    const saved = this.store.saveStyle(name, overrides, { scope: kind, sourceLabel })
    if (!saved) return
    this.savedStyleChooserOpen = false
    this.savedStyleSelection.clear()
    this.styleLibraryView = 'my-styles'
    this.styleLibraryPackId = null
    this.openStyleLibrary()
  }

  private renderSavedStyleChooser(): string {
    if (!this.savedStyleChooserOpen) return ''
    const authored = this.authoredSaveStyleOverrides()
    const groups = new Map<string, ComponentOverride[]>()
    for (const override of authored) {
      const label = this.savedStyleComponentLabel(override)
      groups.set(label, [...(groups.get(label) ?? []), override])
    }
    const rows = [...groups.entries()].map(([label, entries]) => `<section class="ts-save-style-group"><header><strong>${escapeHtml(label)}</strong><button type="button" data-save-style-group="${escapeHtml(label)}">Select group</button></header>${entries.map((override) => { const key = this.savedStyleOverrideKey(override); return `<label class="ts-save-style-check"><input type="checkbox" data-save-style-choice="${escapeHtml(key)}" ${this.savedStyleSelection.has(key) ? 'checked' : ''}><span><strong>${escapeHtml(this.savedStyleTargetLabel(override))}</strong><small>${this.savedStylePacketCount(override)} packet${this.savedStylePacketCount(override) === 1 ? '' : 's'}</small></span></label>` }).join('')}</section>`).join('')
    return `<div class="ts-save-style-chooser"><div class="ts-save-style-chooser-head"><div><strong>Choose parts</strong><span>Build a reusable multi-component bundle from authored Palette targets.</span></div><button type="button" class="ts-btn ts-btn-icon" data-action="save-style-chooser-close" aria-label="Close">×</button></div><div class="ts-save-style-chooser-list">${rows || '<div class="ts-empty">Nothing authored in this project yet.</div>'}</div><footer><span><b data-save-style-selected-count>${this.savedStyleSelection.size}</b> selected</span><button class="ts-btn" type="button" data-action="save-style-clear">Clear</button><button class="ts-btn ts-btn-primary" type="button" data-action="save-style-bundle" ${this.savedStyleSelection.size ? '' : 'disabled'}>Save bundle</button></footer></div>`
  }

  private savedStyleResolution(style: typeof this.store.snapshot.savedStyles[number]): { merge: number; add: number; mounted: number; unmounted: number } {
    let merge = 0, add = 0, mounted = 0, unmounted = 0
    const current = this.store.activeProject.componentOverrides
    for (const override of style.overrides) {
      if (current.some((entry) => entry.target.selector === override.target.selector)) merge++; else add++
      const selector = override.target.selector.replace(/::(?:before|after)\s*$/, '')
      try { if (document.querySelector(selector)) mounted++; else unmounted++ } catch { unmounted++ }
    }
    return { merge, add, mounted, unmounted }
  }

  private renderSavedStyleCard(style: typeof this.store.snapshot.savedStyles[number]): string {
    const packetCount = style.overrides.reduce((count, override) => count + this.savedStylePacketCount(override), 0)
    const search = [style.name, style.sourceLabel, style.sourceProjectName, style.scope, ...style.overrides.map((entry) => entry.target.label ?? entry.target.selector)].filter(Boolean).join(' ').toLowerCase()
    const resolution = this.savedStyleResolution(style)
    const badge = style.scope === 'bundle' ? 'Bundle' : style.scope === 'component' ? 'Component' : 'Target'
    return `<article class="ts-saved-style-card" data-library-card="saved:${escapeHtml(style.id)}" data-library-kind="saved" data-library-search="${escapeHtml(search)}"><div class="ts-saved-style-mark" aria-hidden="true">✦</div><div class="ts-saved-style-copy"><div class="ts-saved-style-title"><strong>${escapeHtml(style.name)}</strong><span class="ts-chip">${badge}</span></div><span>${escapeHtml(style.sourceLabel ?? 'Reusable style')} · ${style.overrides.length} target${style.overrides.length === 1 ? '' : 's'} · ${packetCount} packet${packetCount === 1 ? '' : 's'}</span>${style.sourceProjectName ? `<small>Saved from ${escapeHtml(style.sourceProjectName)}</small>` : ''}<details class="ts-saved-style-resolution"><summary>Apply preview · ${resolution.mounted} mounted${resolution.unmounted ? ` · ${resolution.unmounted} not mounted` : ''}</summary><div><span>${resolution.merge} existing target${resolution.merge === 1 ? '' : 's'} will merge</span><span>${resolution.add} new target${resolution.add === 1 ? '' : 's'} will be added</span>${resolution.unmounted ? `<span>${resolution.unmounted} selector${resolution.unmounted === 1 ? '' : 's'} are not mounted right now; they can still be authored.</span>` : ''}</div></details></div><div class="ts-saved-style-actions"><button class="ts-btn ts-btn-primary" type="button" data-saved-style-apply="${escapeHtml(style.id)}">Apply</button><button class="ts-btn ts-btn-icon" type="button" data-saved-style-rename="${escapeHtml(style.id)}" aria-label="Rename ${escapeHtml(style.name)}">✎</button><button class="ts-btn ts-btn-icon ts-btn-danger" type="button" data-saved-style-delete="${escapeHtml(style.id)}" aria-label="Delete ${escapeHtml(style.name)}">×</button></div></article>`
  }

  private zapScope(scope: SelectionScope | undefined): void {
    if (!scope || scope.persistence !== 'persistent') return
    const packet = createStylePacket('visibility')
    if (packet.type === 'visibility') packet.mode = 'gone'
    this.store.upsertPacket(this.targetFromScope(scope), packet, 'normal', this.editingScope)
    // Keep the Zap tray open so users can one-shot pick and zap a whole run of
    // controls without reopening the tool after every target.
  }

  private async copySelector(value: string): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return }
    } catch { /* fall through to a tiny legacy copy shim */ }
    const textarea = document.createElement('textarea')
    textarea.value = value; textarea.style.position = 'fixed'; textarea.style.opacity = '0'
    document.body.append(textarea); textarea.select()
    try { document.execCommand?.('copy') } finally { textarea.remove() }
  }

  private insertSelectorIntoCustomCss(scope: SelectionScope | undefined): void {
    if (!scope) return
    const selector = selectorForSurface(scope.selector, scope.id === this.selection?.activeScopeId ? this.targetSurface : 'element')
    const current = this.store.activeProject.customCss.trimEnd()
    const spacer = current ? '\n\n' : ''
    const snippet = `${selector} {\n  \n}`
    this.widgetPopover = null
    this.store.setCustomCss(`${current}${spacer}${snippet}\n`)
    this.floatEditor('code')
    setTimeout(() => {
      const textarea = this.root.querySelector<HTMLTextAreaElement>('[data-custom-css]')
      if (!textarea) return
      const start = textarea.value.lastIndexOf('  \n}') + 2
      textarea.focus(); textarea.setSelectionRange(start, start)
    }, 0)
  }

  private renderWidgetPopover(): string {
    if (!this.selection || !this.widgetPopover) return ''
    const current = activeScope(this.selection)
    const related = this.widgetRelatedScope()
    if (this.widgetPopover === 'zap') return `<div class="ts-widget-popover ts-widget-zap"><div class="ts-widget-popover-actions"><button type="button" data-widget-zap="current">Zap this scope</button><button type="button" data-widget-zap="related" ${related ? '' : 'disabled'}>Zap related elements</button><button type="button" data-widget-action="popover-close">Cancel</button></div><code>[1] ${escapeHtml(current.selector)}</code>${related ? `<code>[2] ${escapeHtml(related.selector)}</code>` : ''}<p>Zap compiles to Palette Visibility → Gone, so it stays editable and reversible.</p></div>`
    return `<div class="ts-widget-popover ts-widget-code"><div class="ts-widget-popover-actions"><button type="button" data-widget-insert="current">Insert selector for this</button><button type="button" data-widget-insert="related" ${related ? '' : 'disabled'}>Insert selector for related</button><button type="button" data-widget-action="popover-close">Cancel</button></div><code>[1] ${escapeHtml(selectorForSurface(current.selector, this.targetSurface))}</code>${related ? `<code>[2] ${escapeHtml(related.selector)}</code>` : ''}<p>Insert opens the floating Code editor with a ready-to-edit custom CSS rule.</p></div>`
  }

  private renderWidgetBoostStrip(): string {
    const boost = this.store.activeProject.boost
    const primary = boost.primary.color
    const secondary = boost.secondary?.color ?? primary
    const font = boost.typography.fontFamily ?? 'Native font'
    const active = [boost.colorsEnabled ? 'Colors' : '', boost.canvasEnabled ? 'Canvas' : '', boost.typographyEnabled ? 'Type' : ''].filter(Boolean)
    const status = boost.enabled ? active.join(' + ') : 'Boost off'
    return `<div class="ts-widget-boost-row"><button class="ts-widget-boost" type="button" data-widget-action="float-themes" title="Open Full App Boost"><span class="ts-widget-swatches"><i style="--swatch:${escapeHtml(primary)}"></i><i style="--swatch:${escapeHtml(secondary)}"></i></span><span><strong>${escapeHtml(status)}</strong><small>${boost.typographyEnabled ? escapeHtml(font) : 'Open app-wide styling'}</small></span><b aria-hidden="true">›</b></button><button class="ts-widget-boost-shuffle" type="button" data-widget-action="shuffle-boost" ${boost.colorsEnabled ? '' : 'disabled'} title="Shuffle Boost colors" aria-label="Shuffle Boost colors">${shuffleIcon()}</button></div>`
  }

  private setWidgetHidden(hidden: boolean): void {
    this.widgetHidden = hidden
    this.widgetContextMenuOpen = false
    if (hidden) { this.widgetExpanded = false; this.widgetPopover = null }
    try { localStorage.setItem('theme-studio:widget-hidden', hidden ? '1' : '0') } catch { /* best effort */ }
    if (this.widgetRoot) this.widgetRoot.hidden = hidden
    if (!hidden) this.renderWidget()
  }

  private bindWidgetContextMenu(): void {
    const shell = this.widgetRoot?.querySelector<HTMLElement>('.ts-widget-launch-shell')
    if (!shell || this.widgetExpanded || this.widgetHidden) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let fired = false
    let startX = 0, startY = 0
    const clear = () => { if (timer) clearTimeout(timer); timer = undefined }
    const open = () => {
      this.widgetContextMenuOpen = true
      this.renderWidget()
      if (this.widgetContextDismissBound || typeof document === 'undefined') return
      this.widgetContextDismissBound = true
      setTimeout(() => document.addEventListener('pointerdown', (event) => {
        this.widgetContextDismissBound = false
        const target = event.target instanceof Element ? event.target : null
        if (target?.closest('[data-theme-studio-widget="dock"]')) return
        if (!this.widgetContextMenuOpen) return
        this.widgetContextMenuOpen = false
        this.renderWidget()
      }, { capture: true, once: true }), 0)
    }

    shell.addEventListener('contextmenu', (event) => {
      event.preventDefault(); event.stopPropagation(); clear(); open()
    })
    shell.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.pointerType === 'mouse') return
      fired = false; startX = event.clientX; startY = event.clientY; clear()
      timer = setTimeout(() => { fired = true; open() }, 650)
    })
    shell.addEventListener('pointermove', (event) => {
      if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 10) clear()
    })
    shell.addEventListener('pointerup', clear); shell.addEventListener('pointercancel', clear); shell.addEventListener('pointerleave', clear)
    shell.addEventListener('click', (event) => { if (!fired) return; event.preventDefault(); event.stopImmediatePropagation(); fired = false }, true)
  }

  private renderWidget(): void {
    if (!this.widgetRoot) return
    this.widgetRoot.hidden = this.widgetHidden
    if (this.widgetHidden) return
    const scope = this.selection ? activeScope(this.selection) : undefined
    const label = scope?.label ?? 'Pick something'
    const context = this.selection?.nativeContext?.component.label
    const floatingTarget = this.floatingFrame?.querySelector<HTMLElement>('[data-widget-floating-target]')
    if (floatingTarget) floatingTarget.textContent = this.selection ? `${label}${context && context !== label ? ` · ${context}` : ''}` : 'No target selected'
    this.floatingFrame?.querySelectorAll<HTMLButtonElement>('[data-widget-workspace]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.widgetWorkspace === this.workspace)))
    if (!this.widgetExpanded) {
      this.widgetRoot.innerHTML = `<div class="ts-widget-launch-shell"><button class="ts-widget-grip" type="button" data-widget-launch-drag-handle title="Drag Palette" aria-label="Drag Palette">⋮</button><button class="ts-widget-launch" type="button" data-widget-action="expand" title="Open Palette widget" aria-label="Open Palette widget"><span>◫</span>${this.picker.isActive ? '<i>Pick</i>' : ''}</button>${this.widgetContextMenuOpen ? '<div class="ts-widget-context-menu" role="menu" aria-label="Palette widget options"><button type="button" role="menuitem" data-widget-action="hide-widget">Hide mini widget</button></div>' : ''}</div>`
    } else {
      this.widgetRoot.innerHTML = `<aside class="ts-widget-panel"><header data-widget-panel-drag-handle><div><span class="ts-widget-mark">◫</span><strong>${escapeHtml(this.store.activeProject.name)}</strong></div><button type="button" data-widget-action="collapse" aria-label="Collapse Palette widget">×</button></header><button class="ts-widget-target" type="button" data-widget-action="float"><span>${escapeHtml(label)}</span><small>${context && context !== label ? escapeHtml(context) : scope ? (scope.matchCount ? 'Ready to edit' : 'Target is not mounted') : 'Click Pick to inspect'}</small></button>${this.renderWidgetBoostStrip()}<div class="ts-widget-tools" role="toolbar" aria-label="Palette quick tools"><button type="button" data-widget-action="pick" aria-pressed="${this.picker.isActive}" title="${this.picker.isActive ? 'Done picking' : 'Pick one element'}">${widgetToolIcon('pick')}<small>${this.picker.isActive ? 'Done' : 'Pick'}</small></button><button type="button" data-widget-action="guides" aria-pressed="${this.guidesEnabled}" title="Toggle geometry guides">${widgetToolIcon('guides')}<small>Guides</small></button><button type="button" data-widget-action="zap" aria-pressed="${this.widgetPopover === 'zap'}" ${this.selection ? '' : 'disabled'} title="Hide the selected scope">${widgetToolIcon('zap')}<small>Zap</small></button><button type="button" data-widget-action="code" aria-pressed="${this.widgetPopover === 'code'}" ${this.selection ? '' : 'disabled'} title="Selector and Code tools">${widgetToolIcon('code')}<small>Code</small></button><button type="button" data-widget-action="float" title="Float the full editor over the app">${widgetToolIcon('float')}<small>Float</small></button></div>${this.renderWidgetPopover()}</aside>`
    }
    this.bindWidget()
    this.bindWidgetContextMenu()
  }

  private bindWidget(): void {
    if (!this.widgetRoot) return
    this.widgetRoot.querySelector('[data-widget-action="expand"]')?.addEventListener('click', () => { this.widgetContextMenuOpen = false; this.widgetExpanded = true; this.renderWidget() })
    this.widgetRoot.querySelector('[data-widget-action="hide-widget"]')?.addEventListener('click', () => this.setWidgetHidden(true))
    this.widgetRoot.querySelector('[data-widget-action="collapse"]')?.addEventListener('click', () => { this.widgetExpanded = false; this.widgetPopover = null; this.renderWidget() })
    this.widgetRoot.querySelector('[data-widget-action="pick"]')?.addEventListener('click', () => this.startPicker('widget'))
    this.widgetRoot.querySelector('[data-widget-action="guides"]')?.addEventListener('click', () => { this.guidesEnabled = !this.guidesEnabled; this.syncSelectionHighlight(); this.render(); })
    this.widgetRoot.querySelectorAll('[data-widget-action="float"]').forEach((button) => button.addEventListener('click', () => this.floatEditor('design')))
    this.widgetRoot.querySelector('[data-widget-action="zap"]')?.addEventListener('click', () => { this.widgetPopover = this.widgetPopover === 'zap' ? null : 'zap'; this.renderWidget() })
    this.widgetRoot.querySelector('[data-widget-action="code"]')?.addEventListener('click', () => { this.widgetPopover = this.widgetPopover === 'code' ? null : 'code'; this.renderWidget() })
    this.widgetRoot.querySelector('[data-widget-action="popover-close"]')?.addEventListener('click', () => { this.widgetPopover = null; this.renderWidget() })
    this.widgetRoot.querySelector('[data-widget-zap="current"]')?.addEventListener('click', () => this.zapScope(this.selection ? activeScope(this.selection) : undefined))
    this.widgetRoot.querySelector('[data-widget-zap="related"]')?.addEventListener('click', () => this.zapScope(this.widgetRelatedScope()))
    this.widgetRoot.querySelector('[data-widget-insert="current"]')?.addEventListener('click', () => this.insertSelectorIntoCustomCss(this.selection ? activeScope(this.selection) : undefined))
    this.widgetRoot.querySelector('[data-widget-insert="related"]')?.addEventListener('click', () => this.insertSelectorIntoCustomCss(this.widgetRelatedScope()))
    this.widgetRoot.querySelector('[data-widget-action="float-themes"]')?.addEventListener('click', () => this.floatEditor('themes'))
    this.widgetRoot.querySelector('[data-widget-action="shuffle-boost"]')?.addEventListener('click', () => { this.clearBoostPreview(); this.store.shuffleBoost([]) })
    this.bindWidgetPanelDrag()
  }

  private bindWidgetPanelDrag(): void {
    const root = this.widgetRoot
    const handle = root?.querySelector<HTMLElement>('[data-widget-panel-drag-handle], [data-widget-launch-drag-handle]')
    if (!root || !handle) return
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return
      const eventTarget = event.target as Element | null
      if (eventTarget?.closest('button') && !eventTarget.closest('[data-widget-launch-drag-handle]')) return
      const start = root.getBoundingClientRect(), startX = event.clientX, startY = event.clientY
      handle.setPointerCapture?.(event.pointerId)
      const move = (moveEvent: PointerEvent) => {
        const width = Math.max(42, root.offsetWidth), height = Math.max(42, root.offsetHeight)
        const left = Math.max(8, Math.min(Math.max(8, window.innerWidth - width - 8), start.left + moveEvent.clientX - startX))
        const top = Math.max(8, Math.min(Math.max(8, window.innerHeight - height - 8), start.top + moveEvent.clientY - startY))
        root.style.left = `${left}px`; root.style.top = `${top}px`; root.style.right = 'auto'; root.style.bottom = 'auto'
      }
      const up = (upEvent: PointerEvent) => {
        handle.releasePointerCapture?.(upEvent.pointerId)
        handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up)
        try { localStorage.setItem('theme-studio:widget-position', JSON.stringify({ left: root.style.left, top: root.style.top })) } catch { /* best effort */ }
      }
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up)
    })
  }

  private renderProjectBar(): string {
    const state = this.store.snapshot
    return `<div class="ts-project-bar"><select class="ts-project-select" data-action="select-project" aria-label="Active Palette project">${state.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${project.id === state.activeProjectId ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}</select><button class="ts-btn ts-btn-icon" data-action="create-project" type="button" title="Create project" aria-label="Create project">＋</button><button class="ts-btn ts-btn-icon ts-btn-danger" data-action="delete-project" type="button" title="Delete current project" aria-label="Delete current project" ${state.projects.length <= 1 ? 'disabled' : ''}>×</button></div>`
  }
  private renderDesign(options: { sidecar?: boolean } = {}): string {
    const sidecar = Boolean(options.sidecar)
    if (this.designTool === 'group' && !sidecar) return this.renderGroupDesign()
    const override = overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface)
    const matchingOverrides = matchingOverridesForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface)
    const exactComposerActionSidecar = Boolean(sidecar && this.composerWorkshopRole === 'input.actionbar' && this.selection && /\[data-composer-action=["']/.test(activeScope(this.selection).selector))
    const activeStacks = responsiveStacksFor(override, this.editingScope)
    const rawOwnedPackets = activeStacks[this.editingState] ?? []
    const observed = this.observedForCurrent()
    const authoredPacketEntries = matchingOverrides.flatMap((matchingOverride) => {
      const stacks = responsiveStacksFor(matchingOverride, this.editingScope)
      return (stacks[this.editingState] ?? [])
        // Composer Composer treats a clicked mock glyph as an exact-action editor.
        // A broader pack/action-bar Composer Icons packet still supplies the mounted
        // base wardrobe, but editing that inherited packet here would restyle every
        // action. Keep it out of this sidecar so the user authors an exact override.
        .filter((packet) => !(exactComposerActionSidecar && matchingOverride !== override && packet.type === 'composer-icons'))
        .map((packet) => ({ override: matchingOverride, packet: hydrateSparsePacket(packet, observed?.packets.find((source) => source.type === packet.type)) }))
    })
    const authoredTypes = new Set(authoredPacketEntries.map((entry) => entry.packet.type))
    const observedPackets = observed?.packets.filter((packet) => !authoredTypes.has(packet.type)) ?? []
    const packets = [...authoredPacketEntries.map((entry) => entry.packet), ...observedPackets]
    const observedOverride: ComponentOverride | null = observed ? { id: `observed:${observed.key}`, target: observed.target, states: this.editingScope === 'base' ? { normal: observed.packets } : { normal: [] }, ...(this.editingScope === 'mobile' ? { mobileStates: { normal: observed.packets } } : {}) } : null
    const matchedAuthoredOverrides = [...new Set(authoredPacketEntries.filter((entry) => entry.override !== override).map((entry) => entry.override))]
    const matchedAuthoredCount = matchedAuthoredOverrides.length
    const matchedPacketEntries = authoredPacketEntries.filter((entry) => matchedAuthoredOverrides.includes(entry.override))
    const matchedPacketLabels = [...new Set(matchedPacketEntries.map((entry) => PACKETS.find((definition) => definition.type === entry.packet.type)?.label ?? entry.packet.type))]
    const matchedRecipeNames = [...new Set(matchedPacketEntries.map((entry) => this.recipeOwnershipForPacket(entry.override, entry.packet)?.presetName ?? 'Manual style'))]
    const matchedPacketSummary = matchedPacketLabels.length > 6 ? `${matchedPacketLabels.slice(0, 6).join(', ')} + ${matchedPacketLabels.length - 6} more` : matchedPacketLabels.join(', ')
    const matchedOwnerSummary = matchedRecipeNames.length > 3 ? `${matchedRecipeNames.slice(0, 3).join(' + ')} + ${matchedRecipeNames.length - 3} more` : matchedRecipeNames.join(' + ')
    const persistent = this.selection ? activeScope(this.selection).persistence === 'persistent' : false
    const selectedElement = this.selection ? activeScope(this.selection).element ?? this.selection.target.element : undefined
    const parentDisplay = selectedElement?.parentElement ? getComputedStyle(selectedElement.parentElement).display : undefined
    const scopedOverride = override ? { ...override, states: activeStacks } : null
    const warnings = scopedOverride ? validateOverride(scopedOverride, { parentDisplay }).filter((warning) => warning.state === this.editingState) : []
    const inheritance = scopedOverride && this.editingState !== 'normal' ? stateInheritanceSummary(scopedOverride, this.editingState) : null
    return `${sidecar ? '' : `<section class="ts-section"><p class="ts-kicker">Selected</p>${this.renderSelection()}</section>`}
      <section class="ts-section ${sidecar ? 'ts-design-sidecar-stack' : ''}"><div class="ts-style-stack-head"><p class="ts-kicker">Style stack</p><div class="ts-style-stack-tools">${sidecar ? '' : `<details class="ts-save-style-menu"><summary class="ts-btn" title="Save authored styling for reuse in another theme">✦<span>Save style</span></summary><div class="ts-save-style-popover"><button type="button" data-action="save-style-target" ${this.currentSaveStyleOverrides('target').length ? '' : 'disabled'}><strong>This target</strong><span>Current element plus its decorative layers.</span></button><button type="button" data-action="save-style-component" ${this.currentSaveStyleOverrides('component').length ? '' : 'disabled'}><strong>This component</strong><span>Everything authored under ${escapeHtml(this.selection?.nativeContext?.component.label ?? 'this component')}.</span></button><button type="button" data-action="save-style-choose" ${this.authoredSaveStyleOverrides().length ? '' : 'disabled'}><strong>Choose parts…</strong><span>Pick authored targets across components and save them as a Bundle.</span></button></div></details><button class="ts-btn" type="button" data-action="read-page" title="Map visible authored styles across the page">${workspaceIcon('themes')}<span>Read page</span></button>`}<button class="ts-btn ts-read-style" type="button" data-action="reverse-engineer" title="Inspect the visible style without capturing it" ${this.selection && activeScope(this.selection).persistence === 'persistent' && (activeScope(this.selection).element ?? this.selection.target.element) ? '' : 'disabled'}>${workspaceIcon('design')}<span>Read style</span></button>${observed ? '<button class="ts-btn ts-btn-icon" type="button" data-action="clear-read-style" title="Stop reading this source" aria-label="Stop reading this source">×</button>' : ''}</div></div>${sidecar ? '' : this.renderSavedStyleChooser()}${matchedAuthoredCount ? `<div class="ts-observed-banner"><strong>Applied Palette styles · ${matchedPacketEntries.length} packet${matchedPacketEntries.length === 1 ? '' : 's'}</strong><span>${escapeHtml(matchedOwnerSummary || `${matchedAuthoredCount} authored selector${matchedAuthoredCount === 1 ? '' : 's'}`)}${matchedPacketSummary ? ` · ${escapeHtml(matchedPacketSummary)}` : ''}. These are the actual matching packet cards rendered below, even when Pick used a different temporary selector.</span></div>` : ''}${observed ? `<div class="ts-observed-banner"><strong>Reading source</strong><span>${observed.sources.length ? `${observed.sources.length} matching authored rule${observed.sources.length === 1 ? '' : 's'}` : observed.usedComputedFallback ? 'computed presentation' : 'authored presentation'} · nothing is added to generated CSS until you edit it.</span></div>` : ''}${this.renderResponsiveChooser(override)}${this.renderStateChooser(override)}
      ${inheritance ? `<div class="ts-card"><div class="ts-label">${this.editingState === 'focusVisible' ? 'Focus' : this.editingState} is a delta over Normal</div><p class="ts-note">${inheritance.inherited.length ? `Inherited: ${inheritance.inherited.join(', ')}.` : 'No Normal packet types are currently inherited.'}${inheritance.explicit.length ? ` State overrides: ${inheritance.explicit.join(', ')}.` : ' Normal styles still apply through the CSS cascade.'}</p><div class="ts-actions"><button class="ts-btn" type="button" data-action="copy-normal" ${activeStacks.normal.length ? '' : 'disabled'}>Copy Normal</button><button class="ts-btn ts-btn-danger" type="button" data-action="reset-state" ${packets.length ? '' : 'disabled'}>Reset state</button></div></div>` : ''}
      ${packets.length ? `${authoredPacketEntries.map((entry) => this.renderPacket(entry.override, entry.packet)).join('')}${observedOverride ? observedPackets.map((packet) => this.renderPacket(observedOverride, packet)).join('') : ''}` : `<div class="ts-card ts-empty">${this.selection ? persistent ? `No ${this.editingState}-specific changes. ${this.editingState === 'normal' ? '' : 'Normal styles still apply through the CSS cascade.'}` : 'This mounted-node scope is temporary. Choose a persistent scope before adding reusable styles.' : 'Pick an element or browse the native component catalog first.'}</div>`}
      ${warnings.map((warning) => `<div class="ts-warning">${escapeHtml(warning.message)}</div>`).join('')}
      <div class="ts-actions"><button class="ts-btn ts-btn-block" type="button" data-action="toggle-style-menu" ${this.selection && persistent ? '' : 'disabled'}>＋ Add Style</button></div>
      ${this.packetMenuOpen && this.selection && persistent ? this.renderPacketMenu(packets) : ''}</section>
      ${sidecar ? '' : `<section class="ts-section ts-native-references"><p class="ts-kicker">Native references</p>${this.renderResources()}</section>`}`
  }

  private renderGroupList(): string {
    const groups = this.store.activeProject.layoutGroups
    if (!groups.length) return '<div class="ts-group-empty">No saved groups yet.</div>'
    return `<div class="ts-group-list">${groups.map((group) => `<button class="ts-group-list-item" type="button" data-group-select="${escapeHtml(group.id)}" aria-pressed="${this.activeLayoutGroupId === group.id}"><span><strong>${escapeHtml(group.name)}</strong><small>${group.members.length} members · ${escapeHtml(group.parent.label ?? 'shared parent')}</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`
  }

  private renderGroupDraft(): string {
    const draft = this.layoutGroupDraft ?? { parentElement: null, parentTarget: null, parentLabel: '', members: [], error: '' }
    const picking = this.pickerMode === 'group' && this.picker.isActive
    this.groupDraftRetargetElements = []
    this.groupDraftCandidateElements = []
    const members = draft.members.map((member, index) => {
      const seen = new Set<Element>()
      const candidates: Array<{ element: Element; label: string }> = []
      const addCandidate = (element: Element, prefix: string) => {
        if (seen.has(element)) return
        const resolved = this.groupTargetForElement(element)
        if (!resolved) return
        seen.add(element)
        candidates.push({ element, label: `${prefix} · ${resolved.label}` })
      }
      addCandidate(member.element, 'Current')
      for (const entry of collectStructureNodes(member.element, 3, 14)) addCandidate(entry.element, 'Inside')
      for (const level of member.selection.targetLevels) if (level.element !== member.element) addCandidate(level.element, 'Up')
      const options = candidates.map((candidate) => {
        const value = this.groupDraftRetargetElements.push(candidate.element) - 1
        return `<option value="${value}" ${candidate.element === member.element ? 'selected' : ''}>${escapeHtml(candidate.label)}</option>`
      }).join('')
      return `<div class="ts-group-member"><span class="ts-group-member-number">${index + 1}</span><div class="ts-group-member-main"><span class="ts-group-member-copy"><strong>${escapeHtml(member.label)}</strong><small>${escapeHtml(member.target.selector)}</small></span>${candidates.length > 1 ? `<select class="ts-group-target-select" data-group-retarget-draft="${index}" aria-label="Choose a nearby target for ${escapeHtml(member.label)}">${options}</select>` : ''}</div><button class="ts-btn ts-btn-icon" type="button" data-group-remove-draft="${index}" title="Remove from group" aria-label="Remove ${escapeHtml(member.label)}">×</button></div>`
    }).join('')
    let addSibling = ''
    if (draft.parentElement && draft.parentTarget) {
      const selectedElements = new Set(draft.members.map((member) => member.element))
      const selectedSelectors = new Set(draft.members.map((member) => member.target.selector))
      const candidates = [...draft.parentElement.children].flatMap((element) => {
        if (selectedElements.has(element)) return []
        const resolved = this.groupTargetForElement(element)
        if (!resolved || selectedSelectors.has(resolved.target.selector)) return []
        return [{ element, label: resolved.label }]
      })
      if (candidates.length) {
        const options = candidates.map((candidate) => {
          const value = this.groupDraftCandidateElements.push(candidate.element) - 1
          return `<option value="${value}">${escapeHtml(candidate.label)}</option>`
        }).join('')
        addSibling = `<div class="ts-group-add-row"><span>Add sibling</span><select class="ts-group-add-select" data-group-add-draft aria-label="Add a child of ${escapeHtml(draft.parentLabel)}"><option value="">Choose a child of ${escapeHtml(draft.parentLabel)}…</option>${options}</select></div>`
      }
    }
    return `<article class="ts-card ts-group-builder"><div class="ts-group-head"><div><span class="ts-kicker">New layout group</span><strong>${draft.members.length ? `${draft.members.length} selected` : 'Pick siblings'}</strong><small>${draft.parentElement ? `Shared parent · ${escapeHtml(draft.parentLabel)}` : draft.members.length ? 'Targets currently land under different parents. Use the target dropdowns to line them up.' : 'Start with any item. The rest must share its direct parent.'}</small></div><button class="ts-btn ${picking ? 'ts-btn-primary' : ''}" type="button" data-group-action="pick">${picking ? 'Stop picking' : draft.members.length ? 'Add siblings' : 'Pick siblings'}</button></div>${members ? `<div class="ts-group-members">${members}</div>${addSibling}` : '<div class="ts-group-drop"><strong>① ②</strong><span>Pick two or more sibling elements.</span></div>'}${draft.error ? `<div class="ts-warning">${escapeHtml(draft.error)}</div>` : ''}<div class="ts-actions"><button class="ts-btn ts-btn-primary" type="button" data-group-action="create" ${draft.members.length >= 2 && draft.parentTarget ? '' : 'disabled'}>Create group</button><button class="ts-btn" type="button" data-group-action="clear" ${draft.members.length ? '' : 'disabled'}>Clear</button><button class="ts-btn" type="button" data-group-action="cancel">Cancel</button></div></article>`
  }

  private groupStylePackets(group: LayoutGroup): { packets: StylePacket[]; allowed: PacketType[]; key: string; label: string } {
    const bucket = groupStyleBucketForScope(group, this.editingScope)
    if (this.groupEditorTab === 'members') return { packets: bucket.members, allowed: GROUP_MEMBER_PACKETS, key: 'members', label: 'Members' }
    if (this.groupEditorTab === 'contents') return { packets: bucket.contents[this.groupContentTarget] ?? [], allowed: GROUP_CONTENT_PACKETS[this.groupContentTarget], key: `contents:${this.groupContentTarget}`, label: `Contents · ${this.groupContentTarget}` }
    if (this.groupEditorTab === 'frame') return { packets: bucket.frame, allowed: GROUP_FRAME_PACKETS, key: 'frame', label: 'Frame' }
    return { packets: [], allowed: [], key: 'layout', label: 'Layout' }
  }

  private renderGroupPacketEditor(group: LayoutGroup): string {
    const context = this.groupStylePackets(group)
    const synthetic: ComponentOverride = { id: `group-style:${group.id}:${context.key}:${this.editingScope}`, target: group.parent, states: { normal: context.packets } }
    const contentPicker = this.groupEditorTab === 'contents' ? `<div class="ts-group-content-targets" role="group" aria-label="Contents target">${([['icons','Icons'],['text','Text'],['buttons','Buttons'],['images','Images']] as const).map(([value,label]) => `<button type="button" data-group-content-target="${value}" aria-pressed="${this.groupContentTarget === value}">${label}</button>`).join('')}</div>` : ''
    const note = this.groupEditorTab === 'members'
      ? '<p class="ts-utility-note">Applies the same treatment to every selected member.</p>'
      : this.groupEditorTab === 'contents'
        ? '<p class="ts-utility-note">Styles matching contents inside every member.</p>'
        : '<p class="ts-utility-note">Draws one shared layer behind the occupied group tracks. No wrapper is inserted.</p>'
    return `${contentPicker}${note}${context.packets.length ? context.packets.map((packet) => this.renderPacket(synthetic, packet)).join('') : '<div class="ts-card ts-empty">No shared styles yet.</div>'}<div class="ts-actions"><button class="ts-btn ts-btn-block" type="button" data-group-action="toggle-style-menu">＋ Add Style</button></div>${this.packetMenuOpen ? this.renderPacketMenu(context.packets, context.allowed) : ''}`
  }

  private renderGroupEditor(group: LayoutGroup): string {
    const state = groupStateForScope(group, this.editingScope)
    const inheritedMobile = this.editingScope === 'mobile' && !group.mobile
    const gap = state.gap.mode === 'fixed' ? state.gap : { mode: 'fixed' as const, value: 8, unit: 'px' as const }
    const memberRows = group.members.map((member, index) => `<div class="ts-group-member"><span class="ts-group-member-number">${index + 1}</span><span><strong>${escapeHtml(member.label)}</strong><small>${escapeHtml(member.target.selector)}</small></span></div>`).join('')
    const layoutBody = `<div class="ts-group-layout-modes" role="group" aria-label="Group layout"><button type="button" data-group-mode="row" aria-pressed="${state.mode === 'row'}"><strong>Row</strong><small>Members side by side</small></button><button type="button" data-group-mode="column" aria-pressed="${state.mode === 'column'}"><strong>Column</strong><small>Members stacked</small></button><button type="button" data-group-mode="grid" aria-pressed="${state.mode === 'grid'}"><strong>Grid</strong><small>Choose the columns</small></button></div>${state.mode === 'grid' ? `<div class="ts-field"><label class="ts-label">Columns</label><input class="ts-number" type="number" min="1" max="12" value="${state.columns}" data-group-columns></div>` : ''}<div class="ts-field"><div class="ts-range-head"><label class="ts-label">Gap</label><strong data-group-gap-value>${gap.value}${gap.unit}</strong></div><div class="ts-range-row"><input class="ts-range" type="range" min="0" max="96" step="1" value="${gap.value}" data-group-gap-range><div class="ts-value-unit"><input class="ts-number" type="number" min="0" max="999" step="1" value="${gap.value}" data-group-gap-number><select class="ts-input" data-group-gap-unit>${['px','rem','%'].map((unit) => `<option ${gap.unit === unit ? 'selected' : ''}>${unit}</option>`).join('')}</select></div></div></div><div class="ts-inline-fields"><div class="ts-field"><label class="ts-label">Across</label><select class="ts-input" data-group-justify>${[['stretch','Fill'],['start','Start'],['center','Center'],['end','End']].map(([value,label]) => `<option value="${value}" ${state.justify === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div class="ts-field"><label class="ts-label">Down</label><select class="ts-input" data-group-align>${[['stretch','Fill'],['start','Start'],['center','Center'],['end','End']].map(([value,label]) => `<option value="${value}" ${state.align === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div></div><div class="ts-group-siblings"><div><strong>Other siblings</strong><small>The group uses the real shared parent. Unselected children can stay full width or join the tracks.</small></div><div class="ts-segment"><button type="button" data-group-siblings="full-width" aria-pressed="${state.otherSiblings === 'full-width'}">Full width</button><button type="button" data-group-siblings="join-layout" aria-pressed="${state.otherSiblings === 'join-layout'}">Join layout</button></div></div>${this.editingScope === 'mobile' && group.mobile ? '<div class="ts-actions"><button class="ts-btn" type="button" data-group-action="reset-mobile">Reset mobile layout</button></div>' : ''}`
    const editorBody = this.groupEditorTab === 'layout' ? layoutBody : this.renderGroupPacketEditor(group)
    return `<article class="ts-card ts-group-editor" data-layout-group-id="${escapeHtml(group.id)}"><div class="ts-group-head"><div><span class="ts-kicker">Layout group</span><input class="ts-group-name" type="text" maxlength="120" value="${escapeHtml(group.name)}" data-group-name aria-label="Group name"><small>${group.members.length} members · inside ${escapeHtml(group.parent.label ?? 'shared parent')}</small></div><button class="ts-btn ts-btn-danger" type="button" data-group-action="delete">Ungroup</button></div><div class="ts-group-responsive"><div><span class="ts-kicker">Editing scope</span><strong>${this.editingScope === 'mobile' ? `Mobile ≤ ${MOBILE_BREAKPOINT_PX}px${inheritedMobile ? ' · inherits Base layout' : ''}` : 'Base / all sizes'}</strong></div><div class="ts-responsive-switch"><button class="ts-btn" type="button" data-group-responsive-scope="base" aria-pressed="${this.editingScope === 'base'}">Base</button><button class="ts-btn" type="button" data-group-responsive-scope="mobile" aria-pressed="${this.editingScope === 'mobile'}">Mobile${group.mobile || group.styles?.mobile ? ' · edited' : ''}</button></div></div><div class="ts-group-editor-tabs" role="tablist" aria-label="Group editing"><button type="button" data-group-editor-tab="layout" aria-pressed="${this.groupEditorTab === 'layout'}">Layout</button><button type="button" data-group-editor-tab="members" aria-pressed="${this.groupEditorTab === 'members'}">Members</button><button type="button" data-group-editor-tab="contents" aria-pressed="${this.groupEditorTab === 'contents'}">Contents</button><button type="button" data-group-editor-tab="frame" aria-pressed="${this.groupEditorTab === 'frame'}">Frame</button></div>${editorBody}<details class="ts-group-members-detail"><summary>Members <span>${group.members.length}</span></summary><div class="ts-group-members">${memberRows}</div></details></article>`
  }

  private renderGroupDesign(): string {
    const group = this.activeLayoutGroupId ? this.store.activeProject.layoutGroups.find((entry) => entry.id === this.activeLayoutGroupId) : undefined
    return `<section class="ts-section"><div class="ts-style-stack-head"><div><p class="ts-kicker">Groups</p><strong class="ts-group-title">Arrange + style together</strong></div><button class="ts-btn ts-btn-primary" type="button" data-group-action="new">＋ New group</button></div>${this.layoutGroupDraft ? this.renderGroupDraft() : group ? this.renderGroupEditor(group) : '<div class="ts-card ts-empty">Pick Group above or create a group. Groups can arrange members, share styles, target repeated contents, and draw a frame without reparenting DOM nodes.</div>'}</section><section class="ts-section"><div class="ts-style-stack-head"><p class="ts-kicker">Saved groups</p><span class="ts-meta">${this.store.activeProject.layoutGroups.length}</span></div>${this.renderGroupList()}</section>`
  }

  private renderWorkbar(override: ComponentOverride | null): string {
    const levels = this.selection?.targetLevels ?? []
    const scope = this.selection ? activeScope(this.selection) : undefined
    const activeLevelIndex = scope ? Math.max(0, levels.findIndex((level) => level.element === scope.element)) : -1
    const canChild = this.designTool === 'pick' && activeLevelIndex > 0
    const canParent = this.designTool === 'pick' && activeLevelIndex >= 0 && activeLevelIndex < levels.length - 1
    const hidden = this.designTool === 'pick' && Boolean(override?.states.normal?.find((packet) => packet.type === 'visibility' && packet.mode === 'gone'))
    const picking = this.pickerMode === 'pick' && this.picker.isActive
    const grouping = this.designTool === 'group'
    const groupingPick = this.pickerMode === 'group' && this.picker.isActive
    const groupCount = this.layoutGroupDraft?.members.length ?? 0
    return `<div class="ts-workbar" role="toolbar" aria-label="Palette inspect tools">
      <div class="ts-workbar-primary">
        <div class="ts-workbar-group ts-workbar-mode-group">
          <button class="ts-btn ${picking ? 'ts-btn-primary' : ''}" type="button" data-action="pick-element" aria-pressed="${picking}">${picking ? 'Done' : '⌖ Pick'}</button>
          <button class="ts-btn ${grouping ? 'ts-btn-primary' : ''}" type="button" data-action="group-mode" aria-pressed="${grouping}">▦ Group${groupingPick && groupCount ? ` · ${groupCount}` : ''}</button>
        </div>
        <span class="ts-workbar-divider" aria-hidden="true"></span>
        <div class="ts-workbar-group ts-workbar-guide-group">
          <button class="ts-btn ts-guide-toggle" type="button" data-action="toggle-guides" aria-pressed="${this.guidesEnabled}">Guides</button>
          <select class="ts-input ts-guide-mode" data-action="guide-mode" aria-label="Guide visualization" ${this.guidesEnabled ? '' : 'disabled'}>
            <option value="smart" ${this.guideMode === 'smart' ? 'selected' : ''}>Smart</option>
            <option value="box" ${this.guideMode === 'box' ? 'selected' : ''}>Box</option>
            <option value="layout" ${this.guideMode === 'layout' ? 'selected' : ''}>Layout</option>
            <option value="size" ${this.guideMode === 'size' ? 'selected' : ''}>Size</option>
            <option value="outline" ${this.guideMode === 'outline' ? 'selected' : ''}>Outline</option>
          </select>
        </div>
      </div>
      <div class="ts-workbar-group ts-workbar-secondary ${this.designTool === 'group' ? 'is-group-mode' : ''}">
        <button class="ts-btn ts-btn-icon" type="button" data-action="target-child" title="Move down" aria-label="Move down one target level" ${canChild ? '' : 'disabled'}>↓</button>
        <button class="ts-btn ts-btn-icon" type="button" data-action="target-parent" title="Move up" aria-label="Move up one target level" ${canParent ? '' : 'disabled'}>↑</button>
        <button class="ts-btn ts-hide-toggle" type="button" data-action="toggle-hide" aria-pressed="${hidden}" title="${hidden ? 'Restore this target' : 'Remove this target from layout'}" ${this.designTool === 'pick' && this.selection && activeScope(this.selection).persistence === 'persistent' ? '' : 'disabled'}>${hidden ? 'Show' : 'Hide'}</button>
        <button class="ts-btn ts-btn-icon ts-widget-visibility-toggle" type="button" data-action="toggle-widget" aria-pressed="${!this.widgetHidden}" title="${this.widgetHidden ? 'Show' : 'Hide'} floating Palette tools" aria-label="${this.widgetHidden ? 'Show' : 'Hide'} floating Palette tools">◫</button>
      </div>
    </div>${picking ? '<div class="ts-picking-banner ts-picking-banner-sticky"><strong>Picking is on</strong><span>Click anything to inspect it. Esc or Done exits.</span></div>' : groupingPick ? `<div class="ts-picking-banner ts-picking-banner-sticky"><strong>Grouping is on</strong><span>${groupCount ? `${groupCount} selected · ` : ''}Pick sibling elements. Click a selected item again to remove it.</span></div>` : ''}`
  }

  private renderResponsiveChooser(override: ComponentOverride | null): string {
    const baseCount = STYLE_STATES.reduce((count, state) => count + (override?.states[state]?.length ?? 0), 0)
    const mobileCount = STYLE_STATES.reduce((count, state) => count + (override?.mobileStates?.[state]?.length ?? 0), 0)
    return `<div class="ts-responsive-row"><div><span class="ts-kicker">Editing scope</span><strong>${this.editingScope === 'mobile' ? `Mobile ≤ ${MOBILE_BREAKPOINT_PX}px` : 'Base / all sizes'}</strong></div><div class="ts-responsive-switch" role="group" aria-label="Responsive editing scope"><button class="ts-btn" type="button" data-responsive-scope="base" aria-pressed="${this.editingScope === 'base'}">Base${baseCount ? ` · ${baseCount}` : ''}</button><button class="ts-btn" type="button" data-responsive-scope="mobile" aria-pressed="${this.editingScope === 'mobile'}">Mobile${mobileCount ? ` · ${mobileCount}` : ''}</button></div></div>`
  }
  private renderStateChooser(override: ComponentOverride | null): string {
    const stacks = responsiveStacksFor(override, this.editingScope)
    return `<div class="ts-state-row" role="group" aria-label="Style state">${STYLE_STATES.map((state) => `<button class="ts-btn" type="button" data-style-state="${state}" aria-pressed="${this.editingState === state}">${state === 'focusVisible' ? 'Focus' : state[0].toUpperCase() + state.slice(1)}${stacks[state]?.length ? ` · ${stacks[state]!.length}` : ''}</button>`).join('')}</div>`
  }

  private renderSelection(): string {
    if (!this.selection) { this.structureNodes = []; return `<div class="ts-target-empty"><div class="ts-target-empty-mark">⌖</div><div><strong>Pick something to style</strong><p>Click any visible Lumiverse element. Palette will find a reusable scope when it can.</p></div><button class="ts-btn ts-btn-primary" type="button" data-action="pick-element">Pick element</button></div>` }
    const scope = activeScope(this.selection)
    const target = this.selection.target
    const selectedOverride = overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface)
    const context = this.selection.nativeContext
    const health = scope.persistence === 'persistent' ? evaluateSelectorHealth(scope.selector) : null
    const layout = scope.element ? inspectLayoutContext(scope.element, this.components) : this.selection.layoutContext
    const controller = this.selection.sizeController
    const levels = this.selection.targetLevels
    const pickedLevel = levels[0]
    const activeLevel = levels.find((level) => level.element === scope.element)
    const editingLabel = scope.type === 'native-part' ? scope.label : activeLevel?.label ?? scope.label
    const scopeMatchCount = health?.matchCount ?? scope.matchCount
    const riskLabel = scope.persistence !== 'persistent' ? 'Temporary' : health?.status === 'healthy' ? 'Reusable' : health?.status === 'broad' ? 'Broad' : health?.status === 'missing' ? 'Missing' : health?.status === 'invalid' ? 'Invalid' : stabilityLabel(scope.stability)
    const restoreSelectors = [scope.selector, selectorForSurface(scope.selector, 'before'), selectorForSurface(scope.selector, 'after')]
    const restoreCount = this.store.activeProject.componentOverrides.filter((entry) => restoreSelectors.includes(entry.target.selector)).length
    const selectedGone = this.overrideVisibilityGone(selectedOverride ?? undefined)
    const ladder = [...levels].reverse().map((level) => {
      const selectors = this.selection?.scopeCandidates.filter((entry) => entry.element === level.element).map((entry) => entry.selector) ?? []
      const matchedOverrides = this.store.activeProject.componentOverrides.filter((override) => selectors.some((selector) => override.target.selector === selector || override.target.selector === selectorForSurface(selector, 'before') || override.target.selector === selectorForSurface(selector, 'after')))
      const styled = matchedOverrides.reduce((count, override) => count + Object.values(override.states).reduce((sum, packets) => sum + (packets?.length ?? 0), 0) + Object.values(override.mobileStates ?? {}).reduce((sum, packets) => sum + (packets?.length ?? 0), 0), 0)
      const hidden = matchedOverrides.some((override) => selectors.includes(override.target.selector) && this.overrideVisibilityGone(override))
      const isActive = level.element === scope.element && scope.type !== 'native-part'
      const isPicked = level.relation === 'picked'
      return `<button class="ts-target-crumb" type="button" data-target-level="${escapeHtml(level.id)}" aria-pressed="${isActive}" title="${hidden ? 'Hidden with display: none · ' : ''}${isPicked ? 'Originally picked element' : `Edit ${escapeHtml(level.label)}`}"><span>${escapeHtml(level.label)}</span>${hidden ? '<i class="ts-hidden-mark" aria-label="Hidden">×</i>' : ''}${styled ? `<b>${styled}</b>` : ''}${isPicked ? '<i aria-hidden="true">⌖</i>' : ''}</button>`
    }).join('<span class="ts-target-chevron" aria-hidden="true">›</span>')
    const activeMessageSide = scope.messageSide
    const chooseSideVariant = (entries: SelectionScope[], side: MessageSideName | undefined): SelectionScope[] => {
      const grouped = new Map<string, SelectionScope[]>()
      for (const entry of entries) { const key = entry.messageFamilyId ?? entry.id; grouped.set(key, [...(grouped.get(key) ?? []), entry]) }
      return [...grouped.values()].map((family) => family.find((entry) => entry.messageSide === side) ?? family.find((entry) => entry.messageSide === 'both') ?? family[0]).filter(Boolean)
    }
    // Edit Part follows the component family owned by the rung/part currently being
    // edited. Browse Inside, below, follows the exact mounted node. Keeping those
    // roots separate restores the useful distinction between authored component
    // anatomy and literal descendant DOM.
    const activeComponentId = scope.componentId ?? activeLevel?.nativeComponentId ?? context?.component.id
    const partScopes = chooseSideVariant(this.selection.scopeCandidates.filter((entry) => entry.type === 'native-part' && (!activeComponentId || entry.componentId === activeComponentId)), activeMessageSide)
    const componentScopes = chooseSideVariant(this.selection.scopeCandidates.filter((entry) => (entry.type === 'native-component' || entry.type === 'native-ancestor') && (!activeComponentId || entry.componentId === activeComponentId)), activeMessageSide)
    const componentScope = componentScopes[0]
    const partComponentLabel = this.components.find((entry) => entry.id === activeComponentId)?.label ?? componentScope?.label ?? context?.component.label ?? editingLabel
    const activePartLabel = scope.type === 'native-part' && (!activeComponentId || scope.componentId === activeComponentId) ? scope.label : partComponentLabel
    const partRail = partScopes.length ? `<details class="ts-part-browser ts-part-row"><summary><span class="ts-part-current"><small>Edit part</small><strong>${escapeHtml(activePartLabel)}</strong></span><b>${partScopes.length + (componentScope ? 1 : 0)} available</b><i aria-hidden="true">⌄</i></summary><div class="ts-part-grid">${componentScope ? `<button class="ts-part-chip" type="button" data-scope-chip="${escapeHtml(componentScope.id)}" aria-pressed="${scope.messageFamilyId ? scope.messageFamilyId === componentScope.messageFamilyId : scope.id === componentScope.id}"><span>Component</span>${escapeHtml(partComponentLabel)}</button>` : ''}${partScopes.map((entry) => `<button class="ts-part-chip" type="button" data-scope-chip="${escapeHtml(entry.id)}" aria-pressed="${scope.messageFamilyId ? scope.messageFamilyId === entry.messageFamilyId : scope.id === entry.id}"><span>Part</span>${escapeHtml(entry.label)}</button>`).join('')}</div><p class="ts-structure-note">Component anatomy across the mounted family. Change the target ladder rung to inspect a different component family's parts.</p></details>` : ''
    const structureRoot = scope.element ?? activeLevel?.element ?? target.element
    const structureEntries = structureRoot ? collectStructureNodes(structureRoot) : []
    this.structureNodes = structureEntries.map((entry) => entry.element)
    const structureRail = structureEntries.length ? `<details class="ts-structure-browser"><summary><span><small>Browse inside</small><strong>${escapeHtml(structureRoot ? structureNodeLabel(structureRoot) : editingLabel)}</strong></span><b>${structureEntries.length} node${structureEntries.length === 1 ? '' : 's'}</b><i aria-hidden="true">⌄</i></summary><div class="ts-structure-tree">${structureEntries.map((entry, index) => `<button type="button" class="ts-structure-node" data-structure-node="${index}" style="--ts-tree-depth:${Math.min(entry.depth, 8)}" aria-current="${entry.element === scope.element ? 'true' : 'false'}"><span>${escapeHtml(entry.label)}</span><small>${escapeHtml(entry.tag)}</small></button>`).join('')}</div><p class="ts-structure-note">Exact mounted descendants of the current target. Use Edit Part for the broader component anatomy, including sibling parts that are not inside this node.</p></details>` : ''
    const tag = (scope.element ?? target.element)?.tagName.toLowerCase() ?? ''
    const pseudoSupported = !REPLACED_SURFACE_TAGS.has(tag)
    if (!pseudoSupported && this.targetSurface !== 'element') this.targetSurface = 'element'
    const surfaceLabel = this.targetSurface === 'before' ? 'Back layer' : this.targetSurface === 'after' ? 'Front layer' : 'Element'
    const sideFamily = scope.messageFamilyId ? this.selection.scopeCandidates.filter((entry) => entry.messageFamilyId === scope.messageFamilyId && entry.messageSide) : []
    const availableMessageSides = (['assistant', 'user', 'both'] as MessageSideName[]).filter((side) => sideFamily.some((entry) => entry.messageSide === side && entry.matchCount > 0 || side === 'both' && entry.messageSide === side))
    const messageSideControl = scope.messageFamilyId && sideFamily.length > 1 ? `<div class="ts-target-message-side"><span>Message</span><div class="ts-segment ts-segment-three" role="group" aria-label="Message side"><button type="button" data-message-side="assistant" aria-pressed="${scope.messageSide === 'assistant'}" ${availableMessageSides.includes('assistant') ? '' : 'disabled'}>Assistant</button><button type="button" data-message-side="user" aria-pressed="${scope.messageSide === 'user'}" ${availableMessageSides.includes('user') ? '' : 'disabled'}>User</button><button type="button" data-message-side="both" aria-pressed="${scope.messageSide === 'both'}">Both</button></div></div>` : ''
    const scopeChoices = this.selection.scopeCandidates.filter((entry) => entry.id === scope.id || (entry.type !== 'selector-candidate' && (!entry.messageSide || entry.messageSide === scope.messageSide) && (scope.element ? entry.element === scope.element : entry.type !== 'native-part')))
    const dynamicInstanceSelector = /\[(?:aria-label|title)=[^\]]+\]/i.test(scope.selector)
    const genericCandidates = dynamicInstanceSelector && scope.element ? this.selection.scopeCandidates.filter((entry) => entry.id !== scope.id && entry.element === scope.element && entry.persistence === 'persistent' && !/\[(?:aria-label|title)=[^\]]+\]/i.test(entry.selector) && (!scope.messageSide || !entry.messageSide || entry.messageSide === scope.messageSide)) : []
    const genericScope = genericCandidates.sort((a, b) => {
      const typeRank = (entry: SelectionScope) => entry.type === 'native-part' ? 0 : entry.type === 'context-local' ? 1 : entry.type === 'selector-candidate' ? 2 : entry.type === 'similar-elements' ? 3 : 4
      const strategyRank = (entry: SelectionScope) => entry.strategy === 'semantic' ? 0 : entry.strategy === 'native-context-local' ? 1 : entry.strategy === 'studio-registry' ? 2 : entry.strategy === 'css-module' ? 3 : entry.strategy === 'native-registry' ? 4 : entry.strategy === 'structural' ? 5 : entry.strategy === 'exact-class' ? 9 : 10
      const stabilityRank = (entry: SelectionScope) => entry.stability === 'high' ? 0 : entry.stability === 'medium' ? 1 : 2
      return typeRank(a) - typeRank(b) || strategyRank(a) - strategyRank(b) || stabilityRank(a) - stabilityRank(b) || a.selector.length - b.selector.length
    })[0]
    const compiledSelector = selectorForSurface(scope.selector, this.targetSurface)
    return `<div class="ts-target-panel">
      <div class="ts-target-head"><div class="ts-target-identity"><div class="ts-target-eyebrow"><span>${context ? escapeHtml(context.component.label) : 'DOM mode'}</span><span>${escapeHtml(riskLabel)}</span></div><div class="ts-target-title">${escapeHtml(editingLabel)} <span class="ts-target-surface-label">${escapeHtml(surfaceLabel)}</span>${selectedGone ? '<span class="ts-target-hidden-badge"><i>×</i> Hidden</span>' : ''}</div>${pickedLevel && pickedLevel.element !== scope.element ? `<div class="ts-target-picked">Picked ${escapeHtml(pickedLevel.label)}</div>` : ''}</div><div class="ts-target-head-meta"><span>${scopeMatchCount} match${scopeMatchCount === 1 ? '' : 'es'}</span>${restoreCount ? `<button class="ts-btn ts-restore-target" type="button" data-action="restore-target" title="Remove Palette styles from this target">↺ Restore</button>` : ''}</div></div>
      ${levels.length ? `<div class="ts-target-ladder" aria-label="Target ladder">${ladder}</div>` : ''}
      ${partRail}
      ${structureRail}
      <div class="ts-target-controls">${messageSideControl}<div class="ts-target-surface"><span>Surface</span><div class="ts-segment ts-segment-three"><button type="button" data-target-surface="element" aria-pressed="${this.targetSurface === 'element'}">Element</button><button type="button" data-target-surface="before" aria-pressed="${this.targetSurface === 'before'}" ${pseudoSupported ? '' : 'disabled'}>Back layer</button><button type="button" data-target-surface="after" aria-pressed="${this.targetSurface === 'after'}" ${pseudoSupported ? '' : 'disabled'}>Front layer</button></div></div>
      <div class="ts-target-scope"><label for="ts-scope">Scope</label><select class="ts-input" id="ts-scope" data-action="select-scope">${scopeChoices.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === this.selection?.activeScopeId ? 'selected' : ''}>${entry.styledOverrideId ? `Styled ${entry.styledPacketCount ?? 0} · ` : ''}${escapeHtml(entry.label)}</option>`).join('')}</select></div>
      </div>
      ${!pseudoSupported ? `<div class="ts-target-surface-note">${tag === 'img' ? 'Images' : 'This element'} can’t host decorative layers directly. Pick its wrapper or another part to add an overlay or backdrop.</div>` : this.targetSurface !== 'element' ? '<div class="ts-target-surface-note">Palette supplies the decorative-layer plumbing. Add Background, Border, or Effects normally.</div>' : ''}
      ${genericScope ? `<div class="ts-target-suggestion ts-generic-selector-suggestion"><span>This selector is tied to the current <code>${scope.selector.includes('[title=') ? 'title' : 'aria-label'}</code> value. Use the reusable group selector instead?</span><button class="ts-btn" type="button" data-action="use-generic-scope" data-scope-id="${escapeHtml(genericScope.id)}">Use generic · ${escapeHtml(genericScope.label)}</button></div>` : ''}
      ${scope.warning ? `<div class="ts-warning ts-target-warning">${escapeHtml(scope.warning)}</div>` : ''}
      ${controller && controller.element !== scope.element ? `<div class="ts-target-suggestion"><span>${escapeHtml(controller.reason)}</span><button class="ts-btn" type="button" data-action="select-size-controller" ${controller.scopeId ? '' : 'disabled'}>Edit ${escapeHtml(controller.label)}</button></div>` : ''}
      <details class="ts-target-details"><summary>Target details</summary><div class="ts-target-details-body"><div class="ts-label">Compiled selector</div><code class="ts-selector-code">${escapeHtml(compiledSelector)}</code><div class="ts-meta"><span>Strategy <strong>${escapeHtml(scope.strategy)}</strong></span><span>Stability <strong>${stabilityLabel(scope.stability)}</strong></span><span>Persistence <strong>${scope.persistence === 'persistent' ? 'Reusable' : 'Temporary'}</strong></span>${context ? `<span>Component <strong>${escapeHtml(context.component.label)}</strong></span>` : ''}</div>${layout ? `<div class="ts-target-detail-row"><span>Layout parent</span><strong>${escapeHtml(layout.parentLabel)}</strong><small>${escapeHtml(layout.parentDisplay)}</small></div>` : ''}${selectedOverride ? `<div class="ts-override-strength"><div><strong>Native override</strong><small>${selectedOverride.target.overrideStrength === 'strong' ? 'Strong uses !important plus a fixed authority tier so stubborn native/Quick Style rules cannot out-specificity your local edit.' : 'Normal stays friendly to the ordinary cascade.'}</small></div><div class="ts-segment"><button type="button" data-override-strength="normal" aria-pressed="${selectedOverride.target.overrideStrength !== 'strong'}">Normal</button><button type="button" data-override-strength="strong" aria-pressed="${selectedOverride.target.overrideStrength === 'strong'}">Strong</button></div></div>` : ''}<div class="ts-actions"><button class="ts-btn" type="button" data-action="smart-invert" ${this.targetSurface === 'element' && scope.persistence === 'persistent' && (scope.element ?? target.element) && !isMediaElement((scope.element ?? target.element)!) ? '' : 'disabled'}>Smart Invert target</button></div></div></details>
    </div>`
  }

  private renderPacketMenu(existing: StylePacket[], allowed?: PacketType[]): string {
    const used = new Set(existing.map((packet) => packet.type))
    const allow = allowed ? new Set(allowed) : null
    const groups: Array<(typeof PACKETS)[number]['group']> = ['Paint', 'Shape', 'Layout', 'Typography', 'Effects']
    const composerIconsRelevant = Boolean(this.selection && (() => {
      const scope = activeScope(this.selection!)
      const selector = scope.selector.toLowerCase()
      const label = `${scope.label ?? ''} ${this.selection!.target.label ?? ''}`.toLowerCase()
      return selector.includes('_actionbar_') || selector.includes('[data-composer-action=') || label.includes('composer action bar') || label.includes('native composer action bar') || label.includes('composer action')
    })())
    const mediaFlowRelevant = Boolean(this.selection && (() => {
      const scope = activeScope(this.selection!)
      const selector = scope.selector.toLowerCase()
      const label = `${scope.label ?? ''} ${this.selection!.target.label ?? ''}`.toLowerCase()
      const tag = scope.element?.tagName.toLowerCase() ?? ''
      return ['img','picture','figure','video'].includes(tag) || /inlineimage|attachment|:has\(img\)|messagecontent.*(?:img|p)/.test(selector) || /media|image|attachment|photo/.test(label)
    })())
    const textEntryRelevant = Boolean(this.selection && this.targetSurface === 'element' && (() => {
      const scope = activeScope(this.selection!)
      const selector = scope.selector.toLowerCase()
      const label = `${scope.label ?? ''} ${this.selection!.target.label ?? ''}`.toLowerCase()
      const tag = scope.element?.tagName.toLowerCase() ?? ''
      return (tag === 'textarea' && (selector.includes('chat-message') || label.includes('message'))) || selector.includes('textarea[name="chat-message"]') || label.includes('composer textarea') || label.includes('message textarea')
    })())
    const svgTargetCount = this.selection && this.targetSurface === 'element' ? svgTargetsForElement(activeScope(this.selection).element ?? this.selection.target.element).length : 0
    const visible = PACKETS.filter((entry) => (!allow || allow.has(entry.type)) && (entry.type !== 'composer-icons' || composerIconsRelevant || used.has('composer-icons')) && (entry.type !== 'media-flow' || mediaFlowRelevant || used.has('media-flow')) && (entry.type !== 'text-entry' || textEntryRelevant || used.has('text-entry')))
    return `<div class="ts-card ts-style-menu">${groups.map((group) => { const entries = visible.filter((entry) => entry.group === group); return entries.length ? `<section class="ts-style-group"><div class="ts-group-title">${group}</div><div class="ts-style-grid">${entries.map((entry) => { const hint = entry.type === 'svg-asset' && svgTargetCount ? `${svgTargetCount} SVG${svgTargetCount === 1 ? '' : 's'} found · replace or restyle` : entry.hint; return `<button class="ts-style-option ${entry.type === 'svg-asset' && svgTargetCount ? 'is-capability-match' : ''}" type="button" data-add-packet="${entry.type}" ${used.has(entry.type) ? 'disabled' : ''}><span class="ts-style-icon" aria-hidden="true">${entry.icon}</span><span><strong>${entry.label}</strong><small>${hint}</small></span></button>` }).join('')}</div></section>` : '' }).join('')}</div>`
  }
  private packetShell(override: ComponentOverride, packet: StylePacket, title: string, summary: string, body: string): string {
    const definition = PACKETS.find((entry) => entry.type === packet.type)
    const collapsed = this.collapsedPackets.has(packet.id)
    const observedOnly = override.id.startsWith('observed:') || packet.editedFields?.length === 0
    const sparseOwned = packet.editedFields !== undefined && packet.editedFields.length > 0
    const recipeOwner = observedOnly ? null : this.recipeOwnershipForPacket(override, packet)
    const recipeOwned = Boolean(recipeOwner)
    const badge = observedOnly
      ? '<span class="ts-packet-origin">Observed</span>'
      : sparseOwned
        ? `<span class="ts-packet-origin is-owned">${packet.editedFields!.length} edited</span>`
        : recipeOwner
          ? `<span class="ts-packet-origin is-owned" title="Owned by ${escapeHtml(recipeOwner.presetName)}">${recipeOwner.changedCount ? `${recipeOwner.changedCount} edited · Pack` : 'Pack edited'}</span>`
          : ''
    return `<article class="ts-card ts-packet ${collapsed ? 'is-collapsed' : ''} ${observedOnly ? 'is-observed' : ''} ${sparseOwned ? 'is-sparse-owned' : ''} ${recipeOwned ? 'is-recipe-owned' : ''}" data-override-id="${escapeHtml(override.id)}" data-packet-id="${escapeHtml(packet.id)}" data-packet-type="${escapeHtml(packet.type)}"><div class="ts-packet-head"><button class="ts-packet-toggle" type="button" data-action="toggle-packet" aria-expanded="${!collapsed}" title="${collapsed ? 'Open' : 'Collapse'} ${escapeHtml(title)}"><span class="ts-packet-icon" aria-hidden="true">${escapeHtml(definition?.icon ?? '◇')}</span><span class="ts-packet-copy"><strong class="ts-packet-title">${escapeHtml(title)} ${badge}</strong><span class="ts-packet-summary">${escapeHtml(summary)}</span></span><span class="ts-packet-chevron" aria-hidden="true">⌄</span></button>${observedOnly ? '' : `<button class="ts-btn ts-btn-icon ts-btn-danger ts-packet-remove" type="button" data-action="remove-packet" title="Remove style" aria-label="Remove ${escapeHtml(title)} style">×</button>`}</div>${collapsed ? '' : `<div class="ts-packet-body">${observedOnly ? '<p class="ts-observed-note">Source values are shown here, but Palette owns none of them yet. Change a control to capture only that edit.</p>' : ''}${body}</div>`}</article>`
  }
  private rangeField(label: string, field: string, value: number, min: number, max: number, unit = ''): string {
    return `<div class="ts-field"><label class="ts-label">${label}<span data-range-display="${field}" data-range-unit="${unit}">${value}${unit}</span></label><div class="ts-range-row"><input class="ts-range" type="range" min="${min}" max="${max}" value="${value}" data-packet-field="${field}"><input class="ts-number" type="number" min="${min}" max="${max}" value="${value}" data-packet-field="${field}" aria-label="${label}"></div></div>`
  }
  private boxSpacingAdvanced(label: 'Padding' | 'Margin', field: 'spacing-padding' | 'spacing-margin', value: BoxSpacing | undefined): string {
    const current = value ?? { linked: true, top: 0, right: 0, bottom: 0, left: 0, unit: 'px' as const }
    const min = field === 'spacing-padding' ? 0 : -500
    const sides = ([['top', 'Top'], ['right', 'Right'], ['bottom', 'Bottom'], ['left', 'Left']] as const)
      .map(([side, sideLabel]) => `<label class="ts-label">${sideLabel}<input class="ts-number" type="number" min="${min}" max="500" step="1" value="${current[side]}" data-packet-field="${field}-${side}" aria-label="${label} ${sideLabel.toLowerCase()}"></label>`)
      .join('')
    return `<details class="ts-advanced ts-spacing-advanced"><summary>Advanced ${label.toLowerCase()}</summary><div class="ts-box-grid">${sides}</div><p class="ts-note">Edit sides independently here. Moving the main ${label.toLowerCase()} slider links all four sides again.</p></details>`
  }
  private renderRecentColors(field: string): string {
    if (!this.recentColors.length) return ''
    return `<div class="ts-recent"><span>Recent</span><div class="ts-recent-swatches">${this.recentColors.map((color) => `<button type="button" class="ts-recent-swatch" data-recent-color="${escapeHtml(color)}" data-recent-field="${escapeHtml(field)}" style="--ts-recent:${escapeHtml(color)}" title="Use ${escapeHtml(color)}" aria-label="Use recent color ${escapeHtml(color)}"></button>`).join('')}</div></div>`
  }
  private colorField(label: string, field: string, value: string, alpha?: number): string {
    return `<div class="ts-field"><label class="ts-label">${label}</label><div class="ts-color-row"><label class="ts-color-picker" title="Open color picker"><input class="ts-color" type="color" value="${escapeHtml(colorInput(value))}" data-packet-field="${field}" aria-label="Pick ${label.toLowerCase()} color"><span>Pick</span></label><input class="ts-input" type="text" value="${escapeHtml(value)}" data-packet-field="${field}" aria-label="${label} value"></div>${this.renderRecentColors(field)}</div>${alpha === undefined ? '' : this.rangeField(`${label} opacity`, `${field}-alpha`, percent(alpha), 0, 100, '%')}`
  }
  private dimensionField(label: string, field: string, value: DimensionValue | undefined): string {
    const current = value ?? { mode: 'native' as const }
    const ranges = { px: [0, 1200, 1], '%': [0, 100, 1], rem: [0, 80, 0.25], em: [0, 80, 0.25], vw: [0, 100, 1], vh: [0, 100, 1] } as const
    const fixed = current.mode === 'fixed' ? current : { mode: 'fixed' as const, value: 0, unit: 'px' as const }
    const [min, max, step] = ranges[fixed.unit]
    const sliderValue = Math.max(min, Math.min(max, fixed.value))
    return `<div class="ts-field"><label class="ts-label">${label}</label><div class="ts-dimension-row ${current.mode === 'fixed' ? 'is-fixed' : ''}"><select class="ts-input" data-packet-field="${field}-mode">${[['native', 'Auto'], ['content', 'Fit'], ['parent', 'Fill'], ['fixed', 'Fixed']].map(([mode, name]) => `<option value="${mode}" ${current.mode === mode ? 'selected' : ''}>${name}</option>`).join('')}</select>${current.mode === 'fixed' ? `<input class="ts-range ts-dimension-slider" type="range" min="${min}" max="${max}" step="${step}" value="${sliderValue}" data-packet-field="${field}-value" aria-label="${label} slider"><div class="ts-value-unit"><input class="ts-number" type="number" step="any" value="${fixed.value}" data-packet-field="${field}-value" aria-label="${label} exact value"><select class="ts-input" data-packet-field="${field}-unit" aria-label="${label} unit">${['px', 'rem', '%', 'vw', 'vh', 'em'].map((unit) => `<option ${fixed.unit === unit ? 'selected' : ''}>${unit}</option>`).join('')}</select></div>` : ''}</div></div>`
  }
  private primaryDimensionField(label: string, field: string, value: DimensionValue | undefined): string {
    const current = value ?? { mode: 'native' as const }
    const ranges = { px: [0, 1200, 1], '%': [0, 100, 1], rem: [0, 80, 0.25], em: [0, 80, 0.25], vw: [0, 100, 1], vh: [0, 100, 1] } as const
    const fixed = current.mode === 'fixed' ? current : { mode: 'fixed' as const, value: 100, unit: 'px' as const }
    const [min, max, step] = ranges[fixed.unit]
    const sliderValue = Math.max(min, Math.min(max, fixed.value))
    return `<div class="ts-field ts-primary-size"><label class="ts-label">${label}</label><div class="ts-primary-dimension ${current.mode === 'fixed' ? 'is-fixed' : ''}"><select class="ts-input ts-size-mode" data-packet-field="${field}-mode">${[['native', 'Auto'], ['content', 'Fit'], ['parent', 'Fill'], ['fixed', 'Fixed']].map(([mode, name]) => `<option value="${mode}" ${current.mode === mode ? 'selected' : ''}>${name}</option>`).join('')}</select>${current.mode === 'fixed' ? `<input class="ts-range ts-size-slider" type="range" min="${min}" max="${max}" step="${step}" value="${sliderValue}" data-packet-field="${field}-value" aria-label="${label} slider"><div class="ts-value-unit"><input class="ts-number" type="number" step="any" value="${fixed.value}" data-packet-field="${field}-value" aria-label="${label} exact value"><select class="ts-input" data-packet-field="${field}-unit" aria-label="${label} unit">${['px', 'rem', '%', 'vw', 'vh', 'em'].map((unit) => `<option ${fixed.unit === unit ? 'selected' : ''}>${unit}</option>`).join('')}</select></div>` : ''}</div>${current.mode === 'fixed' ? `<p class="ts-note ts-slider-hint">Slider ${min}–${max}${fixed.unit}; exact values outside it stay valid.</p>` : ''}</div>`
  }
  private boundaryChoices(): Array<{ selector: string; label: string }> {
    if (!this.selection) return []
    const scope = activeScope(this.selection)
    const element = scope.element ?? this.selection.target.element
    const choices: Array<{ selector: string; label: string }> = []
    for (const level of this.selection.targetLevels) {
      if (!level.element || !element || level.element === element || !level.element.contains(element)) continue
      choices.push({ selector: level.recommended.selector, label: level.label })
    }
    for (const candidate of this.selection.scopeCandidates) {
      if (!candidate.element || !element || candidate.element === element || !candidate.element.contains(element)) continue
      choices.push({ selector: candidate.selector, label: candidate.label })
    }
    const seen = new Set<string>()
    return choices.filter((choice) => choice.selector && !seen.has(choice.selector) && seen.add(choice.selector)).slice(0, 16)
  }
  private sizeBoundaryField(packet: Extract<StylePacket, { type: 'size' }>): string {
    const choices = this.boundaryChoices()
    const selected = packet.boundary?.selector ?? ''
    const hasStored = selected && !choices.some((choice) => choice.selector === selected)
    return `<div class="ts-field ts-boundary-field"><label class="ts-label">Keep inside <span>responsive boundary</span></label><select class="ts-input" data-packet-field="size-boundary"><option value="">No extra boundary</option>${hasStored ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(packet.boundary?.label ?? 'Saved boundary')}</option>` : ''}${choices.map((choice) => `<option value="${escapeHtml(choice.selector)}" ${choice.selector === selected ? 'selected' : ''}>${escapeHtml(choice.label)}</option>`).join('')}</select>${packet.boundary ? `<p class="ts-note">Palette treats <strong>${escapeHtml(packet.boundary.label)}</strong> as the sizing boundary instead of making you reason about containing blocks.</p>` : '<p class="ts-note">Useful when the target should never outgrow a wrapper such as Bubble or Header.</p>'}</div><label class="ts-check ts-mobile-safe"><input type="checkbox" data-packet-field="size-mobile-safe" ${packet.mobileSafe !== false ? 'checked' : ''}> Keep fixed size phone-safe <span>adds a small-screen rule only when needed</span></label>`
  }
  private positionAnchorChoices(): Array<{ selector: string; label: string }> { return this.boundaryChoices() }
  private fontSamples(field: 'typography' | 'boost', selected?: string): string {
    const fonts = knownTypographyChoices(this.store.activeProject).slice(0, 32)
    const safeSelected = selected?.replace(/[;{}]/g, '')
    const buttons = [`<button type="button" class="ts-font-sample" data-${field}-font-sample="" aria-pressed="${!selected}"><span style="font-family:inherit">Aa</span><small>Native</small></button>`, ...fonts.map((font) => { const safeFont = font.replace(/[;{}]/g, ''); return `<button type="button" class="ts-font-sample" data-${field}-font-sample="${escapeHtml(font)}" aria-pressed="${selected === font}"><span style="font-family:&quot;${escapeHtml(safeFont)}&quot;">Aa</span><small>${escapeHtml(font)}</small></button>` })]
    return `<details class="ts-font-browser"><summary><span class="ts-font-current-aa" style="font-family:${safeSelected ? `&quot;${escapeHtml(safeSelected)}&quot;` : 'inherit'}">Aa</span><strong>${escapeHtml(selected || 'Native font')}</strong><small>Browse ${fonts.length + 1}</small><i aria-hidden="true">⌄</i></summary><div class="ts-font-grid">${buttons.join('')}</div></details>`
  }

  private renderPacket(override: ComponentOverride, packet: StylePacket): string {
    switch (packet.type) {
      case 'background': {
        const gradient = packet.gradient
        const preview = `linear-gradient(${gradient.angle}deg, ${gradient.stops.map((stop) => `${colorWithAlpha(stop.color, stop.alpha)} ${stop.position}%`).join(', ')})`
        const imageCount = this.availableThemeAssets().filter((asset) => asset.mimeType?.startsWith('image/')).length
        const renderMode = packet.image.renderMode ?? 'image'
        const imageControls = `<div class="ts-field"><label class="ts-label">Theme asset path <span>${imageCount} available image${imageCount === 1 ? '' : 's'}</span></label><input class="ts-input" type="text" list="ts-assets-${escapeHtml(packet.id)}" value="${escapeHtml(packet.image.assetPath)}" placeholder="./assets/image.png" data-packet-field="background-image-path"><datalist id="ts-assets-${escapeHtml(packet.id)}">${this.availableThemeAssets().filter((asset) => asset.mimeType?.startsWith('image/')).map((asset) => `<option value="${escapeHtml(asset.path)}">${escapeHtml(asset.name)}</option>`).join('')}</datalist><p class="ts-note">Choose an uploaded Lumiverse asset or keep any canonical <code>./assets/…</code> path.</p></div><div class="ts-field"><label class="ts-label">Render</label><div class="ts-segment"><button type="button" data-background-image-render="image" aria-pressed="${renderMode === 'image'}">Image</button><button type="button" data-background-image-render="mask" aria-pressed="${renderMode === 'mask'}">Stencil</button></div></div>${renderMode === 'mask' ? `${this.colorField('Stencil color', 'background-mask-color', packet.image.maskColor ?? '#ffffff', packet.image.maskAlpha ?? 1)}<label class="ts-check"><input type="checkbox" data-packet-field="background-mask-hide-contents" ${packet.image.hideContents ? 'checked' : ''}> Replace native contents <span>hides direct SVG/icon children but keeps this box</span></label><p class="ts-note">Stencil uses the asset alpha as a tintable mask. It is ideal for replacing native SVG marks without changing layout.</p>` : ''}<div class="ts-field"><label class="ts-label">Fit</label><select class="ts-input" data-packet-field="background-image-size">${['cover', 'contain', 'auto'].map((value) => `<option ${packet.image.size === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div>${this.rangeField('Horizontal position', 'background-image-x', packet.image.positionX, 0, 100, '%')}${this.rangeField('Vertical position', 'background-image-y', packet.image.positionY, 0, 100, '%')}`
        const body = `<div class="ts-label">Fill</div><div class="ts-segment ts-segment-three"><button type="button" data-mode="solid" aria-pressed="${packet.mode === 'solid'}">Solid</button><button type="button" data-mode="gradient" aria-pressed="${packet.mode === 'gradient'}">Gradient</button><button type="button" data-mode="image" aria-pressed="${packet.mode === 'image'}">Image</button></div>${packet.mode === 'solid'
          ? this.colorField('Color', 'background-solid', packet.solid.color, packet.solid.alpha)
          : packet.mode === 'gradient' ? `<div class="ts-gradient-preview" style="background:${escapeHtml(preview)}"></div>${this.rangeField('Angle', 'gradient-angle', gradient.angle, 0, 359, '°')}${gradient.stops.map((stop, index) => `<div class="ts-stop-block"><div class="ts-stop-head"><div class="ts-label">Stop ${index + 1}</div>${gradient.stops.length > 2 ? `<button class="ts-btn ts-btn-icon ts-stop-remove" type="button" data-gradient-remove="${index}" aria-label="Remove gradient stop ${index + 1}">×</button>` : ''}</div>${this.colorField('Color', `gradient-stop-${index}`, stop.color, stop.alpha)}${this.rangeField('Position', `gradient-position-${index}`, stop.position, 0, 100, '%')}</div>`).join('')}<div class="ts-gradient-actions"><button class="ts-btn" type="button" data-gradient-add ${gradient.stops.length >= 6 ? 'disabled' : ''}>＋ Add stop</button><span>${gradient.stops.length}/6 stops</span></div>` : imageControls}`
        return this.packetShell(override, packet, 'Background', packet.mode === 'solid' ? packet.solid.color : packet.mode === 'gradient' ? 'Gradient' : renderMode === 'mask' ? 'Stencil asset' : 'Asset image', body)
      }
      case 'pattern': {
        const names: Record<typeof packet.pattern, string> = { dots: 'Dots', grid: 'Grid', checker: 'Checker', diamonds: 'Diamonds', stripes: 'Stripes', grain: 'Grain' }
        const body = `<div class="ts-field"><label class="ts-label">Pattern</label><div class="ts-pattern-grid">${(['dots','grid','checker','diamonds','stripes','grain'] as const).map((value) => `<button type="button" data-pattern-type="${value}" aria-pressed="${packet.pattern === value}"><span data-pattern-chip="${value}" style="--pattern-color:${escapeHtml(colorWithAlpha(packet.color, packet.alpha))}"></span>${names[value]}</button>`).join('')}</div></div>${this.colorField('Pattern color', 'pattern-color', packet.color, packet.alpha)}${this.rangeField('Scale', 'pattern-scale', packet.scale, 4, 120, 'px')}${packet.pattern === 'stripes' || packet.pattern === 'checker' || packet.pattern === 'diamonds' ? this.rangeField('Angle', 'pattern-angle', packet.angle, 0, 180, '°') : ''}<p class="ts-note">Pattern is composited with Background instead of replacing it, so gradients and images can stay underneath.</p>`
        return this.packetShell(override, packet, 'Pattern', `${names[packet.pattern]} · ${packet.scale}px`, body)
      }
      case 'composer-icons': {
        const families = ([['native','Native'],['manga','Manga'],['editorial','Editorial'],['journal','Journal'],['visual-novel','Visual Novel']] as const)
        const action = this.composerWorkshopAction
        const custom = packet.customIcons ?? {}
        const saved = this.store.activeProject.svgAssets
        const overrideCount = Object.keys(custom).length
        const summary = `${packet.family === 'native' ? 'Native glyphs' : `${families.find(([value]) => value === packet.family)?.[1] ?? packet.family} glyphs`}${overrideCount ? ` · ${overrideCount} saved override${overrideCount === 1 ? '' : 's'}` : ''}`
        const actionButtons = COMPOSER_ICON_ACTIONS.map((value) => `<button type="button" data-composer-icon-action="${value}" aria-pressed="${action === value}" title="${escapeHtml(COMPOSER_ACTION_LABELS[value])}"><span>${escapeHtml(COMPOSER_ACTION_LABELS[value])}</span>${custom[value] ? '<i>custom</i>' : ''}</button>`).join('')
        const savedGrid = saved.length ? `<div class="ts-saved-svg-grid">${saved.map((entry) => `<div class="ts-saved-svg-item"><button type="button" data-composer-svg-apply="${escapeHtml(entry.id)}" title="Use ${escapeHtml(entry.name)} for ${escapeHtml(COMPOSER_ACTION_LABELS[action])}"><span style="--ts-composer-svg:url(${escapeHtml(composerSvgDataUri(entry.svg))})"></span><strong>${escapeHtml(entry.name)}</strong></button><button type="button" class="ts-saved-svg-delete" data-composer-svg-delete="${escapeHtml(entry.id)}" aria-label="Delete ${escapeHtml(entry.name)}">×</button></div>`).join('')}</div>` : '<div class="ts-empty-inline">No saved SVGs yet. Add one below and it joins this wardrobe.</div>'
        const activeOverride = custom[action] ? `<div class="ts-composer-icon-current"><span style="--ts-composer-svg:url(${escapeHtml(composerSvgDataUri(custom[action]!))})"></span><div><strong>${escapeHtml(COMPOSER_ACTION_LABELS[action])}</strong><small>Saved SVG override</small></div><button class="ts-btn" type="button" data-composer-svg-clear>Use family default</button></div>` : `<div class="ts-composer-icon-current"><span class="ts-icon-family-sample ts-icon-family-${packet.family}">✦</span><div><strong>${escapeHtml(COMPOSER_ACTION_LABELS[action])}</strong><small>Using ${escapeHtml(packet.family === 'native' ? 'native icon' : `${families.find(([value]) => value === packet.family)?.[1] ?? packet.family} family`)}</small></div></div>`
        return this.packetShell(override, packet, 'Composer Icons', summary, `<p class="ts-note">Choose a wardrobe for native composer actions, then override any individual action with a saved SVG. Buttons, order, badges, and click behavior stay native.</p><div class="ts-field"><label class="ts-label">Icon family</label><div class="ts-icon-family-grid">${families.map(([value,label]) => `<button type="button" data-composer-icon-family="${value}" aria-pressed="${packet.family === value}"><span class="ts-icon-family-sample ts-icon-family-${value}">✦</span><strong>${label}</strong></button>`).join('')}</div></div>${this.rangeField('Glyph size', 'composer-icons-size', packet.size, 8, 24, 'px')}<div class="ts-field"><label class="ts-label">Action <span>pick a slot to accessorize</span></label><div class="ts-composer-action-picker">${actionButtons}</div></div>${activeOverride}<div class="ts-field"><label class="ts-label">Saved SVG wardrobe <span>${saved.length}</span></label>${savedGrid}</div><details class="ts-advanced ts-svg-save"><summary>＋ Store a new SVG</summary><div class="ts-svg-save-fields"><input class="ts-input" type="text" data-composer-svg-name placeholder="Glyph name"><input class="ts-input" type="file" accept=".svg,image/svg+xml" data-composer-svg-file><textarea class="ts-input ts-svg-source" rows="5" data-composer-svg-source placeholder="Paste <svg …>…</svg> here, or choose an SVG file above."></textarea><div class="ts-actions"><button class="ts-btn ts-btn-primary" type="button" data-composer-svg-save>Save to wardrobe</button><span class="ts-svg-save-status" aria-live="polite"></span></div></div></details><p class="ts-note">Saved glyphs are project-owned and reusable. Palette strips scripts, remote links, image embeds, and inline event/style payloads before storing them.</p>`)
      }
      case 'svg-asset': {
        const saved = this.store.activeProject.svgAssets
        const targetElement = this.selection && this.targetSurface === 'element' ? (activeScope(this.selection).element ?? this.selection.target.element) : undefined
        const svgTargets = svgTargetsForElement(targetElement)
        const targetMode = packet.targetMode ?? 'surface'
        const previewUri = packet.svg ? composerSvgDataUri(packet.svg) : ''
        const savedGrid = saved.length ? `<div class="ts-saved-svg-grid">${saved.map((entry) => `<div class="ts-saved-svg-item"><button type="button" data-svg-asset-apply="${escapeHtml(entry.id)}" title="Use ${escapeHtml(entry.name)}"><span style="--ts-composer-svg:url(${escapeHtml(composerSvgDataUri(entry.svg))})"></span><strong>${escapeHtml(entry.name)}</strong></button><button type="button" class="ts-saved-svg-delete" data-svg-library-delete="${escapeHtml(entry.id)}" aria-label="Delete ${escapeHtml(entry.name)}">×</button></div>`).join('')}</div>` : '<div class="ts-empty-inline">Nothing saved yet. Store an SVG below and it joins this project wardrobe.</div>'
        const builtinGrid = `<div class="ts-saved-svg-grid ts-svg-builtin-grid">${BUILTIN_ORNAMENTS.map((entry) => `<div class="ts-saved-svg-item"><button type="button" data-svg-builtin-apply="${escapeHtml(entry.id)}" title="Use Palette built-in: ${escapeHtml(entry.label)}" aria-pressed="${packet.assetId === `builtin:${entry.id}`}"><span style="--ts-composer-svg:url(${escapeHtml(entry.assetPath)})"></span><strong>${escapeHtml(entry.label)}</strong></button></div>`).join('')}</div>`
        const active = packet.svg ? `<div class="ts-composer-icon-current"><span style="--ts-composer-svg:url(${escapeHtml(previewUri)})"></span><div><strong>${escapeHtml(packet.assetName ?? 'Custom SVG')}</strong><small>${targetMode === 'replace' ? `Replacing ${escapeHtml(packet.svgLabel ?? 'nested SVG')}` : packet.renderMode === 'mask' ? 'Tintable stencil' : 'Full-color image'}</small></div><button class="ts-btn" type="button" data-svg-asset-clear>Default</button></div>` : '<div class="ts-empty-inline">Choose a Palette SVG, a saved SVG, or paste your own.</div>'
        const modeSwitch = svgTargets.length || targetMode === 'replace' ? `<div class="ts-field"><label class="ts-label">Use as</label><div class="ts-segment"><button type="button" data-svg-target-mode="replace" aria-pressed="${targetMode === 'replace'}" ${svgTargets.length || targetMode === 'replace' ? '' : 'disabled'}>Replace icon</button><button type="button" data-svg-target-mode="surface" aria-pressed="${targetMode !== 'replace'}">Paint surface</button></div>${svgTargets.length ? `<p class="ts-note">Palette found ${svgTargets.length} inline SVG${svgTargets.length === 1 ? '' : 's'} inside this target. Replace mode keeps the native SVG box/click target and swaps only its pixels.</p>` : '<p class="ts-note">The saved replacement path is kept even if this particular mount is temporarily missing its SVG.</p>'}</div>` : ''
        const targetPicker = targetMode === 'replace' ? `<div class="ts-field"><label class="ts-label">SVG target <span>${svgTargets.length || 'saved path'}</span></label>${svgTargets.length ? `<div class="ts-svg-target-picker">${svgTargets.map((entry, index) => `<button type="button" data-svg-target-path="${escapeHtml(entry.path)}" data-svg-target-label="${escapeHtml(entry.label)}" aria-pressed="${packet.svgPath === entry.path || (!packet.svgPath && index === 0)}"><span>${index + 1}</span><strong>${escapeHtml(entry.label)}</strong></button>`).join('')}${svgTargets.length > 1 ? `<button type="button" data-svg-target-path="svg" data-svg-target-label="All SVGs" aria-pressed="${packet.svgPath === 'svg'}"><span>∞</span><strong>All SVGs</strong></button>` : ''}</div>` : `<code class="ts-selector-code">${escapeHtml(packet.svgPath ?? 'svg')}</code>`}</div>` : ''
        const renderMode = `<div class="ts-field"><label class="ts-label">Render</label><div class="ts-segment"><button type="button" data-svg-render-mode="mask" aria-pressed="${packet.renderMode === 'mask'}">Tintable</button><button type="button" data-svg-render-mode="image" aria-pressed="${packet.renderMode === 'image'}">Preserve colors</button></div></div>`
        const tint = packet.renderMode === 'mask' ? (targetMode === 'replace' ? `<div class="ts-field"><label class="ts-label">Color</label><div class="ts-segment"><button type="button" data-svg-color-mode="inherit" aria-pressed="${(packet.colorMode ?? 'inherit') === 'inherit'}">Inherit icon color</button><button type="button" data-svg-color-mode="custom" aria-pressed="${packet.colorMode === 'custom'}">Custom</button></div></div>${packet.colorMode === 'custom' ? this.colorField('Custom color', 'svg-asset-color', packet.color, packet.alpha) : this.rangeField('Opacity', 'svg-asset-opacity', Math.round(packet.alpha * 100), 0, 100, '%')}` : this.colorField('Stencil color', 'svg-asset-color', packet.color, packet.alpha)) : ''
        const replaceGeometry = targetMode === 'replace' ? `<div class="ts-field"><label class="ts-label">Icon box</label><div class="ts-segment"><button type="button" data-svg-size-mode="native" aria-pressed="${packet.size === undefined}">Native size</button><button type="button" data-svg-size-mode="fixed" aria-pressed="${packet.size !== undefined}">Fixed</button></div></div>${packet.size !== undefined ? this.rangeField('Size', 'svg-asset-size', packet.size, 4, 128, 'px') : ''}${this.rangeField('Rotation', 'svg-asset-rotate', packet.rotate ?? 0, -180, 180, '°')}` : `${this.rangeField('Horizontal position','svg-asset-x',packet.positionX,0,100,'%')}${this.rangeField('Vertical position','svg-asset-y',packet.positionY,0,100,'%')}`
        const fit = `<div class="ts-field"><label class="ts-label">Fit</label><div class="ts-segment"><button type="button" data-svg-fit="contain" aria-pressed="${packet.fit === 'contain'}">Contain</button><button type="button" data-svg-fit="cover" aria-pressed="${packet.fit === 'cover'}">Cover</button></div></div>`
        const custom = `<details class="ts-advanced ts-svg-save"><summary>＋ Custom SVG</summary><div class="ts-svg-save-fields"><input class="ts-input" type="text" data-svg-library-name placeholder="SVG name"><input class="ts-input" type="file" accept=".svg,image/svg+xml" data-svg-library-file><textarea class="ts-input ts-svg-source" rows="5" data-svg-library-source placeholder="Paste <svg …>…</svg> here, or choose an SVG file above."></textarea><div class="ts-actions"><button class="ts-btn ts-btn-primary" type="button" data-svg-custom-use>Use once</button><button class="ts-btn" type="button" data-svg-library-save>Save + use</button><span class="ts-svg-save-status" aria-live="polite"></span></div></div></details>`
        const libraries = `<details class="ts-advanced ts-svg-library" open><summary>Palette library <span>${BUILTIN_ORNAMENTS.length}</span></summary>${builtinGrid}</details><details class="ts-advanced ts-svg-library" ${saved.length ? 'open' : ''}><summary>Saved SVGs <span>${saved.length}</span></summary>${savedGrid}</details>${custom}`
        const note = targetMode === 'replace' ? '<p class="ts-note">Replacement is CSS-only: Palette paints the selected inline SVG box with your vector and makes the native SVG descendants transparent. Event handlers, button semantics, layout ownership, and React DOM stay untouched.</p>' : '<p class="ts-note">Surface mode is the original SVG Asset primitive: use it on an element or Front/Back layer for reusable vector ornaments.</p>'
        return this.packetShell(override, packet, 'SVG / Icon', targetMode === 'replace' ? `Replace · ${packet.svgLabel ?? (svgTargets[0]?.label ?? 'SVG')}` : packet.svg ? (packet.assetName ?? 'Vector surface') : 'Vector surface', `${modeSwitch}${targetPicker}${active}${renderMode}${tint}${fit}${replaceGeometry}${libraries}${note}`)
      }
      case 'media-flow': {
        const label = packet.mode === 'full' ? 'Full width' : packet.mode === 'natural' ? 'Natural block' : 'Native flow'
        return this.packetShell(override, packet, 'Media Flow', label, `<p class="ts-utility-note">Normalize images and their wrappers without writing defensive thumbnail CSS by hand.</p><div class="ts-field"><label class="ts-label">Placement</label><select class="ts-input" data-packet-field="media-flow-mode"><option value="native" ${packet.mode === 'native' ? 'selected' : ''}>Native</option><option value="natural" ${packet.mode === 'natural' ? 'selected' : ''}>Natural block</option><option value="full" ${packet.mode === 'full' ? 'selected' : ''}>Full width</option></select></div><label class="ts-check"><input type="checkbox" data-packet-field="media-flow-unclipped" ${packet.unclipped ? 'checked' : ''}> Let media escape thumbnail clipping</label><p class="ts-note">Natural keeps media in normal document flow with its own aspect ratio. Full width also claims the entire reading measure. Unclipped is useful for native attachment buttons and wrappers.</p>`)
      }
      case 'image': {
        const sourceQuality = packet.sourceQuality ?? 'native'
        const targetTag = (this.selection ? activeScope(this.selection).element ?? this.selection.target.element : undefined)?.tagName.toLowerCase()
        const mediaTarget = !targetTag || ['img','video','canvas','picture'].includes(targetTag)
        const toneBits = [sourceQuality === 'full' ? 'full source' : sourceQuality === 'auto' ? 'auto source' : '', packet.brightness !== 1 ? `${Math.round(packet.brightness * 100)}% brightness` : '', packet.saturation !== 1 ? `${Math.round(packet.saturation * 100)}% saturation` : '', packet.objectFit !== 'native' && (packet.objectPositionX !== 50 || packet.objectPositionY !== 50) ? `framed ${packet.objectPositionX}% / ${packet.objectPositionY}%` : ''].filter(Boolean)
        const sourceQualityHelp = sourceQuality === 'full' ? '<div class="ts-warning">Full loads the original file. Large lists can get heavy.</div>' : sourceQuality === 'auto' ? '<p class="ts-note">Auto starts with Lumiverse’s thumbnail and steps up only when the displayed image needs more pixels.</p>' : '<p class="ts-note">Native keeps Lumiverse’s chosen image size.</p>'
        const fitNote = mediaTarget ? '' : '<p class="ts-note">This semantic target is a wrapper rather than the media node. Tone and source quality still affect descendant imagery; Crop / fit only has CSS meaning on an actual image/video/canvas. Use Browse Inside when you need object-fit on the leaf.</p>'
        const body = `<div class="ts-image-preview"><span>Image treatment</span><strong>${toneBits.length ? escapeHtml(toneBits.join(' · ')) : 'Natural'}</strong></div><div class="ts-field"><label class="ts-label">Source quality <span>for enlarged images</span></label><div class="ts-segment ts-segment-three"><button type="button" data-image-quality="native" aria-pressed="${sourceQuality === 'native'}">Native</button><button type="button" data-image-quality="auto" aria-pressed="${sourceQuality === 'auto'}">Auto</button><button type="button" data-image-quality="full" aria-pressed="${sourceQuality === 'full'}">Full</button></div>${sourceQualityHelp}</div>${this.rangeField('Brightness', 'image-brightness', Math.round(packet.brightness * 100), 0, 250, '%')}${this.rangeField('Saturation', 'image-saturation', Math.round(packet.saturation * 100), 0, 300, '%')}${this.rangeField('Contrast', 'image-contrast', Math.round(packet.contrast * 100), 0, 250, '%')}<details class="ts-advanced"><summary>More tone controls</summary>${this.rangeField('Grayscale', 'image-grayscale', Math.round(packet.grayscale * 100), 0, 100, '%')}${this.rangeField('Hue', 'image-hue', Math.round(packet.hueRotate), -180, 180, '°')}${this.rangeField('Blur', 'image-blur', packet.blur, 0, 30, 'px')}</details><div class="ts-field"><label class="ts-label">Crop / fit</label><div class="ts-segment ts-segment-five">${([['native', 'Natural'], ['cover', 'Cover'], ['contain', 'Contain'], ['fill', 'Stretch'], ['scale-down', 'Down']] as const).map(([value, label]) => `<button type="button" data-image-fit="${value}" aria-pressed="${packet.objectFit === value}">${label}</button>`).join('')}</div></div>${packet.objectFit !== 'native' ? `<label class="ts-check ts-fill-frame"><input type="checkbox" data-packet-field="image-fill-frame" ${packet.fillFrame ? 'checked' : ''}> Fill the available frame</label><div class="ts-image-move"><label class="ts-label">Move inside frame <span>picture, not container</span></label><div class="ts-direction-range"><div><span>Left</span><strong>Horizontal</strong><span>Right</span></div><input class="ts-range" type="range" min="0" max="100" value="${packet.objectPositionX}" data-packet-field="image-position-x"></div><div class="ts-direction-range"><div><span>Up</span><strong>Vertical</strong><span>Down</span></div><input class="ts-range" type="range" min="0" max="100" value="${packet.objectPositionY}" data-packet-field="image-position-y"></div><p class="ts-note">Moves the picture inside its frame via focal position. The image box itself stays put.</p></div>` : '<p class="ts-note">Choose Cover, Contain, Stretch, or Down to control where the picture sits inside its frame.</p>'}${fitNote}`
        return this.packetShell(override, packet, 'Image', toneBits.length ? toneBits.join(' · ') : 'Natural', body)
      }
      case 'mask': {
        const mode = maskMode(packet)
        const customMask = packet.customMask ?? defaultImageCustomMask()
        const label = mode === 'native' ? 'Native' : mode === 'none' ? 'Cleared' : mode === 'custom' ? 'Custom edges' : packet.fade.direction !== 'none' ? `${packet.fade.direction} fade` : 'Fade'
        const fadeButtons: Array<[Exclude<typeof packet.fade.direction, 'none'>, string]> = [['top', '↑'], ['right', '→'], ['bottom', '↓'], ['left', '←'], ['radial', '◎']]
        const customPreview = compileImageCustomMask(customMask)
        const customPreviewStyle = `mask-image:${customPreview.image};-webkit-mask-image:${customPreview.image};${customPreview.standardComposite ? `mask-composite:${customPreview.standardComposite};` : ''}${customPreview.webkitComposite ? `-webkit-mask-composite:${customPreview.webkitComposite};` : ''}`
        const maskBody = mode === 'native'
          ? '<p class="ts-note">Keeps whatever mask Lumiverse or the current theme already applies. Read Style can inspect supported native multi-edge masks without taking ownership.</p>'
          : mode === 'none'
            ? '<div class="ts-mask-clear-note"><strong>Native mask suppressed.</strong><span>Palette emits mask-image: none in both standard and WebKit forms.</span></div>'
            : mode === 'fade'
              ? `<div class="ts-field"><label class="ts-label">Fade edge <span>pick a side</span></label><div class="ts-fade-grid ts-fade-grid-five">${fadeButtons.map(([value, arrow]) => `<button type="button" data-image-fade="${value}" aria-pressed="${packet.fade.direction === value}" title="Fade ${value}">${arrow}</button>`).join('')}</div></div>${this.rangeField('Softness', 'image-fade-amount', packet.fade.amount, 1, 90, '%')}`
              : `<div class="ts-mask-preview"><span>Mask preview</span><i style="${escapeHtml(customPreviewStyle)}"></i></div><div class="ts-mask-layer"><div class="ts-mask-layer-head"><strong>Side fade</strong><label class="ts-check"><input type="checkbox" data-packet-field="image-mask-horizontal-enabled" ${customMask.horizontal.enabled ? 'checked' : ''}> On</label></div><div class="ts-segment ts-segment-two"><button type="button" data-image-mask-side="left" aria-pressed="${customMask.horizontal.side === 'left'}">← Left</button><button type="button" data-image-mask-side="right" aria-pressed="${customMask.horizontal.side === 'right'}">Right →</button></div>${this.rangeField('Solid until', 'image-mask-horizontal-solid', customMask.horizontal.solidUntil, 0, 99, '%')}${this.rangeField('Transparent by', 'image-mask-horizontal-fade', customMask.horizontal.fadeUntil, 1, 100, '%')}</div><div class="ts-mask-layer"><div class="ts-mask-layer-head"><strong>Top fade</strong><label class="ts-check"><input type="checkbox" data-packet-field="image-mask-top-enabled" ${customMask.top.enabled ? 'checked' : ''}> On</label></div>${this.rangeField('Solid until', 'image-mask-top-solid', customMask.top.solidUntil, 0, 99, '%')}${this.rangeField('Transparent by', 'image-mask-top-fade', customMask.top.fadeUntil, 1, 100, '%')}</div><div class="ts-mask-layer"><div class="ts-mask-layer-head"><strong>Bottom fade</strong><label class="ts-check"><input type="checkbox" data-packet-field="image-mask-bottom-enabled" ${customMask.bottom.enabled ? 'checked' : ''}> On</label></div>${this.rangeField('Solid until', 'image-mask-bottom-solid', customMask.bottom.solidUntil, 0, 99, '%')}${this.rangeField('Transparent by', 'image-mask-bottom-fade', customMask.bottom.fadeUntil, 1, 100, '%')}</div><div class="ts-field"><label class="ts-label">Combine layers</label><select class="ts-input" data-packet-field="image-mask-combine"><option value="intersect" ${customMask.combine === 'intersect' ? 'selected' : ''}>Intersect</option><option value="add" ${customMask.combine === 'add' ? 'selected' : ''}>Add</option><option value="subtract" ${customMask.combine === 'subtract' ? 'selected' : ''}>Subtract</option><option value="exclude" ${customMask.combine === 'exclude' ? 'selected' : ''}>Exclude</option></select></div><p class="ts-note">Each enabled edge becomes one mask layer. Palette emits the matching standard mask-composite and WebKit compositing operation.</p>`
        const body = `<section class="ts-magic-effects ts-mask-effects"><div class="ts-magic-head"><div><strong>Mask</strong><span>fade, clear, or combine edge layers</span></div></div><div class="ts-segment ts-segment-four ts-mask-modes">${(['native','none','fade','custom'] as const).map((value) => `<button type="button" data-image-mask-mode="${value}" aria-pressed="${mode === value}">${value === 'native' ? 'Native' : value === 'none' ? 'None' : value === 'fade' ? 'Fade' : 'Custom'}</button>`).join('')}</div>${maskBody}</section><p class="ts-note">Mask is surface-level CSS and can be used on media, wrappers, pseudo-elements, SVG/icon surfaces, and other normal boxes.</p>`
        return this.packetShell(override, packet, 'Mask', label, body)
      }
      case 'content': {
        const source = packet.source ?? 'literal'
        const summary = source === 'literal' ? (packet.value.trim() ? (packet.value.trim().length > 28 ? `${packet.value.trim().slice(0, 28)}…` : packet.value.trim()) : 'Empty generated label') : source === 'title' ? 'From title' : 'From aria-label'
        return this.packetShell(override, packet, 'Generated Content', summary, `<div class="ts-field"><label class="ts-label">Source</label><div class="ts-segment ts-segment-three"><button type="button" data-content-source="literal" aria-pressed="${source === 'literal'}">Literal</button><button type="button" data-content-source="title" aria-pressed="${source === 'title'}">Title</button><button type="button" data-content-source="aria-label" aria-pressed="${source === 'aria-label'}">ARIA label</button></div></div>${source === 'literal' ? `<div class="ts-field"><label class="ts-label">Label or symbol</label><input class="ts-input" type="text" maxlength="4000" value="${escapeHtml(packet.value)}" data-packet-field="content-value"></div>` : `<p class="ts-note">Palette mirrors the element’s native ${source === 'title' ? '<code>title</code>' : '<code>aria-label</code>'} into this pseudo-surface. Handy for text-skinned icon controls without hard-coding every button.</p>`}<p class="ts-note">On a normal element, Palette emits this label on its <code>::after</code> skin automatically. If you already selected Back/Front, it stays on that explicit pseudo-surface. Typography, Ink, Spacing, Position, and Transform control how it looks.</p>`)
      }
      case 'text': {
        const gradientPreview = `linear-gradient(${packet.gradient.angle}deg, ${packet.gradient.stops.map((stop) => `${colorWithAlpha(stop.color, stop.alpha)} ${stop.position}%`).join(', ')})`
        const colorControls = `<div class="ts-label">Fill</div><div class="ts-segment"><button type="button" data-text-mode="solid" aria-pressed="${packet.colorMode === 'solid'}">Solid</button><button type="button" data-text-mode="gradient" aria-pressed="${packet.colorMode === 'gradient'}">Gradient</button></div>${packet.colorMode === 'solid' ? `${this.colorField('Color', 'text-color', packet.solid.color, packet.solid.alpha)}<div class="ts-field"><label class="ts-label">Descendant colors <span>${packet.inkMode === 'force' ? 'locked' : 'respected'}</span></label><div class="ts-segment"><button type="button" data-text-ink-mode="cascade" aria-pressed="${packet.inkMode !== 'force'}">Respect</button><button type="button" data-text-ink-mode="force" aria-pressed="${packet.inkMode === 'force'}">Override</button></div><p class="ts-note">Respect keeps child dialogue/font colors, but still beats an inline color on the exact element you targeted so repaired legacy <code>&lt;font&gt;</code> spans stay inkable. Override also owns WebKit text fill for controls that fight normal color.</p></div>` : `<div class="ts-gradient-preview" style="background:${escapeHtml(gradientPreview)}"></div>${this.rangeField('Angle', 'text-gradient-angle', packet.gradient.angle, 0, 359, '°')}${packet.gradient.stops.map((stop, index) => `<div class="ts-stop-block"><div class="ts-stop-head"><div class="ts-label">Stop ${index + 1}</div>${packet.gradient.stops.length > 2 ? `<button class="ts-btn ts-btn-icon ts-stop-remove" type="button" data-gradient-remove="${index}" aria-label="Remove gradient stop ${index + 1}">×</button>` : ''}</div>${this.colorField('Color', `text-gradient-stop-${index}`, stop.color, stop.alpha)}${this.rangeField('Position', `text-gradient-position-${index}`, stop.position, 0, 100, '%')}</div>`).join('')}<div class="ts-gradient-actions"><button class="ts-btn" type="button" data-gradient-add ${packet.gradient.stops.length >= 6 ? 'disabled' : ''}>＋ Add stop</button><span>${packet.gradient.stops.length}/6 stops</span></div>`}`
        const shadow = packet.shadow
        const outlineMode = packet.outlineMode ?? 'edge'
        const summaryBits = [packet.colorMode === 'gradient' ? 'Gradient' : packet.solid.color, (packet.strokeWidth ?? 0) > 0 ? `${packet.strokeWidth}px ${outlineMode === 'outside' ? 'outside outline' : 'edge outline'}` : '', shadow ? 'shadow' : ''].filter(Boolean)
        return this.packetShell(override, packet, 'Ink', summaryBits.join(' · '), `${colorControls}<section class="ts-magic-effects"><div class="ts-field"><label class="ts-label">Outline <span>${packet.strokeWidth ?? 0}px</span></label><div class="ts-segment ts-segment-two"><button type="button" data-text-outline-mode="edge" aria-pressed="${outlineMode === 'edge'}">Edge</button><button type="button" data-text-outline-mode="outside" aria-pressed="${outlineMode === 'outside'}">Outside</button></div><p class="ts-note">Edge uses the browser’s glyph stroke. Outside builds a crisp shadow ring behind the glyph so thicker outlines do not eat into the fill.</p>${this.rangeField('Thickness', 'text-stroke-width', packet.strokeWidth ?? 0, 0, 8, 'px')}${(packet.strokeWidth ?? 0) > 0 ? this.colorField('Outline color', 'text-stroke', packet.strokeColor ?? '#000000', packet.strokeAlpha ?? 1) : ''}</div>${this.rangeField('Glow', 'text-glow-strength', shadow && Math.abs(shadow.x) < .001 && Math.abs(shadow.y) < .001 ? shadow.blur : 0, 0, 48, 'px')}</section><details class="ts-advanced"><summary>Shadow & glow · advanced</summary><label class="ts-check"><input type="checkbox" data-packet-field="text-shadow-enabled" ${shadow ? 'checked' : ''}> Add text shadow</label>${shadow ? `${this.rangeField('Horizontal', 'text-shadow-x', shadow.x, -50, 50, 'px')}${this.rangeField('Vertical', 'text-shadow-y', shadow.y, -50, 50, 'px')}${this.rangeField('Blur', 'text-shadow-blur', shadow.blur, 0, 80, 'px')}${this.colorField('Shadow color', 'text-shadow-color', shadow.color, shadow.alpha)}` : '<p class="ts-note">Turn this on for a custom shadow, glow, or halo.</p>'}</details>`)
      }
      case 'typography': {
        const fontLabel = packet.fontFamily?.trim() || 'Native font'
        const size = packet.fontSize ?? 15
        const unit = packet.fontSizeUnit ?? 'px'
        const summary = `${fontLabel} · ${size}${unit}${packet.fontWeight ? ` · ${packet.fontWeight}` : ''}`
        const align = packet.textAlign ?? 'left'
        const transform = packet.transform ?? 'none'
        return this.packetShell(override, packet, 'Typography', summary, `<div class="ts-field"><label class="ts-label">Typeface <span>known loaded fonts</span></label>${this.fontSamples('typography', packet.fontFamily)}<details class="ts-advanced"><summary>Custom family</summary><input class="ts-input" type="text" value="${escapeHtml(packet.fontFamily ?? '')}" data-packet-field="typography-family" list="ts-font-families"><datalist id="ts-font-families">${knownTypographyChoices(this.store.activeProject).map((font) => `<option value="${escapeHtml(font)}"></option>`).join('')}</datalist></details></div><div class="ts-field"><label class="ts-label">Scale <span>${size}${unit}</span></label><div class="ts-type-scale-row"><input class="ts-range" type="range" min="${unit === 'rem' ? .5 : 8}" max="${unit === 'rem' ? 6 : 96}" step="${unit === 'rem' ? .05 : 1}" value="${Math.max(unit === 'rem' ? .5 : 8, Math.min(unit === 'rem' ? 6 : 96, size))}" data-packet-field="typography-size" aria-label="Font size slider"><div class="ts-value-unit ts-type-size"><input class="ts-number" type="number" min="0.01" max="500" step="any" value="${size}" data-packet-field="typography-size" aria-label="Font size"><select class="ts-input" data-packet-field="typography-size-unit" aria-label="Font size unit"><option value="px" ${unit === 'px' ? 'selected' : ''}>px</option><option value="rem" ${unit === 'rem' ? 'selected' : ''}>rem</option></select></div></div><p class="ts-note">Drag for quick sizing; exact values stay editable.</p></div><div class="ts-inline-fields"><div class="ts-field"><label class="ts-label">Weight</label><select class="ts-input" data-packet-field="typography-weight">${[300, 400, 500, 600, 700, 800, 900].map((weight) => `<option value="${weight}" ${Number(packet.fontWeight ?? 500) === weight ? 'selected' : ''}>${weight}</option>`).join('')}</select></div><div class="ts-field"><label class="ts-label">Style</label><select class="ts-input" data-packet-field="typography-style"><option value="normal" ${(packet.fontStyle ?? 'normal') === 'normal' ? 'selected' : ''}>Regular</option><option value="italic" ${packet.fontStyle === 'italic' ? 'selected' : ''}>Italic</option></select></div></div><div class="ts-field"><label class="ts-label">Alignment</label><div class="ts-segment ts-segment-four">${(['left','center','right','justify'] as const).map((value) => `<button type="button" data-typography-align="${value}" aria-pressed="${align === value}">${value === 'justify' ? 'Justify' : value[0].toUpperCase() + value.slice(1)}</button>`).join('')}</div></div><details class="ts-advanced"><summary>Spacing & case</summary>${this.rangeField('Line height', 'typography-line-height', Math.round((packet.lineHeight ?? 1.4) * 100), 80, 300, '%')}${this.rangeField('Letter spacing', 'typography-letter-spacing', packet.letterSpacing ?? 0, -5, 20, 'px')}<div class="ts-field"><label class="ts-label">Case</label><select class="ts-input" data-packet-field="typography-transform">${([['none','As typed'],['uppercase','UPPERCASE'],['lowercase','lowercase'],['capitalize','Capitalize']] as const).map(([value,label]) => `<option value="${value}" ${transform === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div></details>`)
      }
      case 'text-entry': {
        const size = packet.fontSize ?? 15
        const unit = packet.fontSizeUnit ?? 'px'
        const fontLabel = packet.fontFamily?.trim() || 'Native font'
        const summary = `${packet.insetX}px × ${packet.insetY}px inset · ${fontLabel} ${size}${unit}`
        return this.packetShell(override, packet, 'Text Entry', summary, `<p class="ts-utility-note">Moves the placeholder and typed text together. Palette also mirrors sizing metrics to Lumiverse’s hidden autosize mirror so the composer keeps measuring itself correctly.</p><div class="ts-inline-fields"><div class="ts-field"><label class="ts-label">Horizontal inset</label><input class="ts-number" type="number" min="0" max="96" step="1" value="${packet.insetX}" data-packet-field="text-entry-inset-x"></div><div class="ts-field"><label class="ts-label">Vertical inset</label><input class="ts-number" type="number" min="0" max="96" step="1" value="${packet.insetY}" data-packet-field="text-entry-inset-y"></div></div><div class="ts-field"><label class="ts-label">Typeface</label><input class="ts-input" type="text" value="${escapeHtml(packet.fontFamily ?? '')}" data-packet-field="text-entry-family" list="ts-text-entry-font-families"><datalist id="ts-text-entry-font-families">${knownTypographyChoices(this.store.activeProject).map((font) => `<option value="${escapeHtml(font)}"></option>`).join('')}</datalist></div><div class="ts-field"><label class="ts-label">Scale <span>${size}${unit}</span></label><div class="ts-type-scale-row"><input class="ts-range" type="range" min="${unit === 'rem' ? .5 : 8}" max="${unit === 'rem' ? 6 : 72}" step="${unit === 'rem' ? .05 : 1}" value="${Math.max(unit === 'rem' ? .5 : 8, Math.min(unit === 'rem' ? 6 : 72, size))}" data-packet-field="text-entry-size" aria-label="Text entry font size"><div class="ts-value-unit ts-type-size"><input class="ts-number" type="number" min="0.01" max="500" step="any" value="${size}" data-packet-field="text-entry-size"><select class="ts-input" data-packet-field="text-entry-size-unit"><option value="px" ${unit === 'px' ? 'selected' : ''}>px</option><option value="rem" ${unit === 'rem' ? 'selected' : ''}>rem</option></select></div></div></div><div class="ts-inline-fields"><div class="ts-field"><label class="ts-label">Weight</label><select class="ts-input" data-packet-field="text-entry-weight">${[300,400,500,600,700,800,900].map((weight) => `<option value="${weight}" ${Number(packet.fontWeight ?? 400) === weight ? 'selected' : ''}>${weight}</option>`).join('')}</select></div><div class="ts-field"><label class="ts-label">Style</label><select class="ts-input" data-packet-field="text-entry-style"><option value="normal" ${(packet.fontStyle ?? 'normal') === 'normal' ? 'selected' : ''}>Regular</option><option value="italic" ${packet.fontStyle === 'italic' ? 'selected' : ''}>Italic</option></select></div></div><div class="ts-field"><label class="ts-label">Placeholder</label>${this.colorField('Ink', 'text-entry-placeholder-color', packet.placeholderColor, packet.placeholderAlpha)}</div><div class="ts-inline-fields"><div class="ts-field"><label class="ts-label">Placeholder style</label><select class="ts-input" data-packet-field="text-entry-placeholder-style"><option value="normal" ${(packet.placeholderStyle ?? 'normal') === 'normal' ? 'selected' : ''}>Regular</option><option value="italic" ${packet.placeholderStyle === 'italic' ? 'selected' : ''}>Italic</option></select></div><div class="ts-field"><label class="ts-label">Placeholder weight</label><select class="ts-input" data-packet-field="text-entry-placeholder-weight">${[300,400,500,600,700,800,900].map((weight) => `<option value="${weight}" ${Number(packet.placeholderWeight ?? 400) === weight ? 'selected' : ''}>${weight}</option>`).join('')}</select></div></div><details class="ts-advanced"><summary>Text metrics</summary>${this.rangeField('Line height', 'text-entry-line-height', Math.round((packet.lineHeight ?? 1.5) * 100), 80, 300, '%')}${this.rangeField('Letter spacing', 'text-entry-letter-spacing', packet.letterSpacing ?? 0, -5, 20, 'px')}<p class="ts-note">These metrics are synchronized to the hidden textarea mirror. Placeholder-only color/style stays on <code>::placeholder</code>.</p></details>`)
      }
      case 'visibility': {
        const labels = { visible: 'Visible', invisible: 'Hidden but keeps space', gone: 'Removed from layout' } as const
        return this.packetShell(override, packet, 'Visibility', labels[packet.mode], `<div class="ts-field"><label class="ts-label">Visibility</label><div class="ts-visibility-modes">${([['visible','Visible','Normal rendering'],['invisible','Invisible','Keep its space'],['gone','Gone','Remove from layout']] as const).map(([value,label,hint]) => `<button type="button" data-visibility-mode="${value}" aria-pressed="${packet.mode === value}"><strong>${label}</strong><small>${hint}</small></button>`).join('')}</div></div><p class="ts-note">“Gone” is the simple <code>display: none</code> nuke. Remove this packet to return fully to native behavior.</p>`)
      }
      case 'border': return this.packetShell(override, packet, 'Border', `${packet.width}px ${packet.style}`, `${this.rangeField('Width', 'border-width', packet.width, 0, 20, 'px')}<div class="ts-field"><label class="ts-label">Style</label><select class="ts-input" data-packet-field="border-style">${['solid', 'dashed', 'dotted', 'double', 'none'].map((v) => `<option ${packet.style === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>${this.colorField('Color', 'border-color', packet.color, packet.alpha)}`)
      case 'corners': {
        const cornerFields = ([
          ['topLeft', 'Top left', packet.topLeft, 'tl'],
          ['topRight', 'Top right', packet.topRight, 'tr'],
          ['bottomLeft', 'Bottom left', packet.bottomLeft, 'bl'],
          ['bottomRight', 'Bottom right', packet.bottomRight, 'br'],
        ] as const)
        const controls = packet.linked ? this.rangeField('Radius', 'corners-all', packet.topLeft, 0, 100, 'px') : `<div class="ts-corner-grid" aria-label="Independent corner radii">${cornerFields.map(([key, label, value, area]) => `<label class="ts-corner-field ts-corner-${area}"><span>${label}</span><input class="ts-number" type="number" min="0" max="9999" value="${value}" data-packet-field="corners-${key}" aria-label="${label} radius"></label>`).join('')}<span class="ts-corner-diagram" aria-hidden="true"></span></div>`
        return this.packetShell(override, packet, 'Corners', packet.linked ? `${packet.topLeft}px` : 'Independent', `${controls}<label class="ts-check"><input type="checkbox" data-packet-field="corners-linked" ${packet.linked ? 'checked' : ''}> Link corners</label>`)
      }
      case 'spacing': {
        const padding = packet.padding ?? { linked: true, top: 0, right: 0, bottom: 0, left: 0, unit: 'px' as const }
        const margin = packet.margin ?? { linked: true, top: 0, right: 0, bottom: 0, left: 0, unit: 'px' as const }
        const paddingSummary = padding.linked || [padding.top, padding.right, padding.bottom, padding.left].every((value) => value === padding.top) ? `${padding.top}px` : 'custom'
        const marginSummary = margin.linked || [margin.top, margin.right, margin.bottom, margin.left].every((value) => value === margin.top) ? `${margin.top}px` : 'custom'
        return this.packetShell(override, packet, 'Spacing', `Padding ${paddingSummary} · margin ${marginSummary}${packet.gap ? ` · gap ${packet.gap}px` : ''}`, `${this.rangeField('Padding', 'spacing-padding', padding.top, 0, 200, 'px')}${this.boxSpacingAdvanced('Padding', 'spacing-padding', packet.padding)}${this.rangeField('Margin', 'spacing-margin', margin.top, -200, 200, 'px')}${this.boxSpacingAdvanced('Margin', 'spacing-margin', packet.margin)}${this.rangeField('Gap', 'spacing-gap', packet.gap ?? 0, 0, 200, 'px')}${this.layoutWarning('gap')}`)
      }
      case 'shadow': {
        const strength = Math.max(0, Math.min(100, Math.round(packet.blur * 2.2)))
        return this.packetShell(override, packet, 'Shadow', `${packet.inset ? 'Pressed' : 'Lifted'} · ${packet.blur}px blur`, `<section class="ts-magic-effects"><div class="ts-segment"><button type="button" data-shadow-trick="lift" aria-pressed="${!packet.inset}">Lift</button><button type="button" data-shadow-trick="press" aria-pressed="${packet.inset}">Press</button></div>${this.rangeField('Strength', 'shadow-magic-strength', strength, 0, 100, '%')}</section><details class="ts-advanced"><summary>Shadow recipe · advanced</summary>${this.rangeField('Horizontal', 'shadow-x', packet.x, -100, 100, 'px')}${this.rangeField('Vertical', 'shadow-y', packet.y, -100, 100, 'px')}${this.rangeField('Blur', 'shadow-blur', packet.blur, 0, 100, 'px')}${this.rangeField('Spread', 'shadow-spread', packet.spread, -100, 100, 'px')}${this.colorField('Color', 'shadow-color', packet.color, packet.alpha)}<label class="ts-check"><input type="checkbox" data-packet-field="shadow-inset" ${packet.inset ? 'checked' : ''}> Inset</label></details>`)
      }
      case 'glass': {
        const frost = Math.max(0, Math.min(100, Math.round(packet.blur / 0.42)))
        return this.packetShell(override, packet, 'Glass', `${packet.blur}px frost`, `<section class="ts-magic-effects">${this.rangeField('Frost', 'glass-frost-strength', frost, 0, 100, '%')}</section><details class="ts-advanced"><summary>Glass recipe · advanced</summary><label class="ts-check"><input type="checkbox" data-packet-field="glass-tint-enabled" ${packet.tintColor ? 'checked' : ''}> Add tint when no Background packet exists</label>${packet.tintColor ? this.colorField('Tint', 'glass-tint', packet.tintColor, packet.tintAlpha ?? 0.12) : ''}${this.rangeField('Blur', 'glass-blur', packet.blur, 0, 100, 'px')}${this.rangeField('Saturation', 'glass-saturation', Math.round(packet.saturation * 100), 0, 300, '%')}${this.colorField('Border', 'glass-border', packet.borderColor ?? '#ffffff', packet.borderAlpha ?? 0.12)}${this.rangeField('Border width', 'glass-border-width', packet.borderWidth ?? 1, 0, 20, 'px')}${this.rangeField('Depth', 'glass-depth', percent(packet.shadowStrength, 0.22), 0, 100, '%')}${this.rangeField('Inner highlight', 'glass-highlight', percent(packet.innerHighlight, 0.06), 0, 100, '%')}</details>`)
      }
      case 'opacity': return this.packetShell(override, packet, 'Opacity', `${percent(packet.value)}%`, `${this.rangeField('Element opacity', 'element-opacity', percent(packet.value), 0, 100, '%')}<p class="ts-note">Affects the entire element, including its contents. Background transparency belongs in Background.</p>`)
      case 'alignment': return this.packetShell(override, packet, 'Alignment', `${packet.horizontal ?? 'start'} / ${packet.vertical ?? 'center'}`, `<div class="ts-field"><label class="ts-label">Text</label><select class="ts-input" data-packet-field="alignment-text">${['left', 'center', 'right'].map((v) => `<option ${packet.text === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="ts-field"><label class="ts-label">Horizontal</label><select class="ts-input" data-packet-field="alignment-horizontal">${['start', 'center', 'end', 'space-between'].map((v) => `<option ${packet.horizontal === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="ts-field"><label class="ts-label">Vertical</label><select class="ts-input" data-packet-field="alignment-vertical">${['start', 'center', 'end'].map((v) => `<option ${packet.vertical === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>${this.layoutWarning('alignment')}`)
      case 'layout': {
        const flex = packet.display === 'flex' || packet.display === 'inline-flex', grid = packet.display === 'grid' || packet.display === 'inline-grid', columns = packet.gridColumns ?? { mode: 'auto' as const }
        return this.packetShell(override, packet, 'Container', packet.display === 'normal' ? 'Native layout' : packet.display, `<p class="ts-utility-note">Controls how this element arranges its direct children.</p><div class="ts-field"><label class="ts-label">Layout</label><select class="ts-input" data-packet-field="layout-display">${[['normal', 'Native'], ['block', 'Block'], ['inline', 'Inline'], ['inline-block', 'Inline block'], ['flex', 'Flex row'], ['grid', 'Grid'], ['contents', 'Contents / dissolve wrapper']].map(([value, label]) => `<option value="${value}" ${packet.display === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${packet.display === 'normal' ? '<p class="ts-note">Native preserves the target’s existing layout.</p>' : `${flex ? `<div class="ts-inline-fields"><div class="ts-field"><label class="ts-label">Direction</label><select class="ts-input" data-packet-field="layout-direction">${['row', 'column', 'row-reverse', 'column-reverse'].map((value) => `<option ${packet.direction === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="ts-field"><label class="ts-label">Wrap</label><select class="ts-input" data-packet-field="layout-wrap">${['nowrap', 'wrap', 'wrap-reverse'].map((value) => `<option ${packet.wrap === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div></div>` : ''}${grid ? `<div class="ts-field"><label class="ts-label">Columns</label><select class="ts-input" data-packet-field="layout-grid-mode">${[['auto', 'Auto'], ['count', 'Fixed count'], ['auto-fit', 'Auto fit']].map(([value, label]) => `<option value="${value}" ${columns.mode === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${columns.mode === 'count' ? `<div class="ts-field"><label class="ts-label">Column count</label><input class="ts-number" type="number" min="1" max="24" value="${columns.count}" data-packet-field="layout-grid-count"></div>` : columns.mode === 'auto-fit' ? this.dimensionField('Minimum card width', 'layout-grid-min', columns.min) : ''}` : ''}${flex || grid ? `<p class="ts-utility-note">${flex ? 'Direction sets the child flow. Distribute moves items along it; Align moves them across it.' : 'Columns set the tracks. Distribute and Align place content inside the grid.'}</p><div class="ts-inline-fields"><div class="ts-field"><label class="ts-label">Distribute</label><select class="ts-input" data-packet-field="layout-justify">${['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'].map((value) => `<option ${packet.justify === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="ts-field"><label class="ts-label">Align</label><select class="ts-input" data-packet-field="layout-align">${['start', 'center', 'end', 'stretch'].map((value) => `<option ${packet.align === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div></div>${this.dimensionField('Gap', 'layout-gap', packet.gap)}` : ''}`}`)
      }
      case 'placement': {
        const horizontalLabel = ({ native: 'Native', start: 'Left', center: 'Center', end: 'Right', stretch: 'Fill' } as const)[packet.horizontal]
        const verticalLabel = ({ native: 'Native', start: 'Top', center: 'Center', end: 'Bottom', stretch: 'Fill' } as const)[packet.vertical]
        const summary = packet.horizontal === 'native' && packet.vertical === 'native' ? 'Native placement' : [packet.horizontal !== 'native' ? horizontalLabel : '', packet.vertical !== 'native' ? verticalLabel : ''].filter(Boolean).join(' · ')
        const context = this.quickAlignContext(packet.vertical)
        return this.packetShell(override, packet, 'Quick Align', summary, `<p class="ts-utility-note">Tell Palette where this element should sit. It resolves the boring CSS mechanics with logical margins and layout alignment.</p><div class="ts-field"><label class="ts-label">Horizontal</label><div class="ts-quick-align-axis ts-segment ts-segment-five">${([['native','Native'],['start','Left'],['center','Center'],['end','Right'],['stretch','Fill']] as const).map(([value,label]) => `<button type="button" data-placement-horizontal="${value}" aria-pressed="${packet.horizontal === value}">${label}</button>`).join('')}</div></div><div class="ts-field"><label class="ts-label">Vertical <span>when the parent provides free height</span></label><div class="ts-quick-align-axis ts-segment ts-segment-five">${([['native','Native'],['start','Top'],['center','Center'],['end','Bottom'],['stretch','Fill']] as const).map(([value,label]) => `<button type="button" data-placement-vertical="${value}" aria-pressed="${packet.vertical === value}">${label}</button>`).join('')}</div></div>${context}`)
      }
      case 'layout-item': return this.packetShell(override, packet, 'Layout Item', packet.sizeInParent === 'fill' ? 'Fill remaining' : packet.sizeInParent === 'natural' ? 'Natural' : 'Fixed basis', `<p class="ts-note">Controls how this item behaves inside its layout parent.</p><div class="ts-field"><label class="ts-label">Size in parent</label><div class="ts-segment ts-segment-three">${([['natural', 'Natural'], ['fill', 'Fill'], ['fixed', 'Fixed']] as const).map(([value, label]) => `<button type="button" data-layout-item-size="${value}" aria-pressed="${packet.sizeInParent === value}">${label}</button>`).join('')}</div></div>${packet.sizeInParent === 'fixed' ? this.dimensionField('Basis', 'layout-item-basis', packet.basis) : ''}<div class="ts-inline-fields"><div class="ts-field"><label class="ts-label">Align self</label><select class="ts-input" data-packet-field="layout-item-align">${['auto', 'start', 'center', 'end', 'stretch'].map((value) => `<option ${packet.alignSelf === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="ts-field"><label class="ts-label">Order</label><input class="ts-number" type="number" value="${packet.order ?? 0}" data-packet-field="layout-item-order"></div></div>${this.layoutItemWarning()}`)
      case 'position': {
        const anchors = this.positionAnchorChoices(), selectedAnchor = packet.anchorSelector ?? ''
        const modeLabels: Record<typeof packet.mode, string> = { flow: 'Flow', nudge: 'Nudge', anchored: 'Anchored', sticky: 'Sticky', screen: 'Screen' }
        const layerLabels = { normal: 'Normal', raised: 'Raised', overlay: 'Front', custom: 'Custom' } as const
        const nudgeWords = packet.mode === 'nudge' || packet.mode === 'anchored' ? [packet.nudgeX ? `${Math.abs(packet.nudgeX)}${packet.unit} ${packet.nudgeX > 0 ? 'right' : 'left'}` : '', packet.nudgeY ? `${Math.abs(packet.nudgeY)}${packet.unit} ${packet.nudgeY > 0 ? 'down' : 'up'}` : ''].filter(Boolean).join(' · ') : ''
        const flowWord = (packet.mode === 'flow' || packet.mode === 'nudge') && packet.flowAlign === 'center' ? 'Centered block' : ''
        const summary = packet.mode === 'anchored' ? `Anchored to ${packet.anchorLabel ?? 'ancestor'}${nudgeWords ? ` · ${nudgeWords}` : ''} · ${layerLabels[packet.layer]}` : packet.mode === 'nudge' ? `${nudgeWords || 'No movement'}${flowWord ? ` · ${flowWord}` : ''} · ${layerLabels[packet.layer]}` : `${modeLabels[packet.mode]}${flowWord ? ` · ${flowWord}` : ''} · ${layerLabels[packet.layer]}`
        const nudgeLeft = 50 + Math.max(-200, Math.min(200, packet.nudgeX ?? 0)) / 4
        const nudgeTop = 50 + Math.max(-200, Math.min(200, packet.nudgeY ?? 0)) / 4
        const nudgeControls = packet.mode === 'nudge' || packet.mode === 'anchored' ? `<div class="ts-nudge-panel"><div class="ts-offset-pad" data-offset-pad data-packet-id="${escapeHtml(packet.id)}" style="--ts-offset-left:${nudgeLeft}%;--ts-offset-top:${nudgeTop}%"><span class="ts-offset-axis ts-offset-axis-x"></span><span class="ts-offset-axis ts-offset-axis-y"></span><button type="button" class="ts-offset-dot" aria-label="Drag to move element" title="Drag to move"></button></div><div class="ts-offset-values"><label><span>X · right +</span><input class="ts-number" type="number" value="${packet.nudgeX ?? 0}" data-packet-field="position-nudge-x"></label><label><span>Y · down +</span><input class="ts-number" type="number" value="${packet.nudgeY ?? 0}" data-packet-field="position-nudge-y"></label><button class="ts-btn" type="button" data-offset-reset="${escapeHtml(packet.id)}">Center</button></div></div>` : ''
        const offsets = packet.mode === 'flow' || packet.mode === 'nudge' ? '' : `<div class="ts-offset-grid">${(['top', 'right', 'bottom', 'left'] as const).map((side) => `<label><span>${side[0].toUpperCase()}${side.slice(1)}</span><input class="ts-number" type="number" step="any" placeholder="—" value="${packet[side] ?? ''}" data-packet-field="position-${side}"></label>`).join('')}</div>`
        const unitControl = packet.mode === 'flow' ? '' : `<div class="ts-field"><label class="ts-label">Movement unit</label><select class="ts-input" data-packet-field="position-unit">${['px', 'rem', '%'].map((unit) => `<option ${packet.unit === unit ? 'selected' : ''}>${unit}</option>`).join('')}</select></div>`
        const flowPlacement = packet.mode === 'flow' || packet.mode === 'nudge' ? `<div class="ts-field"><label class="ts-label">Flow placement</label><div class="ts-segment">${([['native', 'Native'], ['center', 'Center block']] as const).map(([value, label]) => `<button type="button" data-position-flow-align="${value}" aria-pressed="${(packet.flowAlign ?? 'native') === value}">${label}</button>`).join('')}</div><p class="ts-note">Center block uses logical auto margins, so it works in ordinary document flow without requiring a flex/grid parent.</p></div>` : ''
        return this.packetShell(override, packet, 'Position & Layer', summary, `<div class="ts-field"><label class="ts-label">Position</label><div class="ts-position-modes">${([['flow', 'Flow', 'Stay in normal layout'], ['nudge', 'Nudge', 'Offset from natural spot'], ['anchored', 'Anchored', 'Pin inside an ancestor'], ['sticky', 'Sticky', 'Stick while scrolling'], ['screen', 'Screen', 'Pin to viewport']] as const).map(([value, label, hint]) => `<button type="button" data-position-mode="${value}" aria-pressed="${packet.mode === value}"><strong>${label}</strong><small>${hint}</small></button>`).join('')}</div></div>${flowPlacement}${packet.mode === 'anchored' ? `<div class="ts-field"><label class="ts-label">Anchor to <span>relative to</span></label><select class="ts-input" data-packet-field="position-anchor"><option value="">Choose an ancestor…</option>${anchors.map((anchor) => `<option value="${escapeHtml(anchor.selector)}" ${selectedAnchor === anchor.selector ? 'selected' : ''}>${escapeHtml(anchor.label)}</option>`).join('')}</select>${packet.anchorSelector ? `<p class="ts-note">Palette adds the positioning context to <strong>${escapeHtml(packet.anchorLabel ?? 'this ancestor')}</strong> as an explicit generated helper.</p>` : ''}</div>` : ''}${nudgeControls}${offsets}${unitControl}<div class="ts-field"><label class="ts-label">Layer</label><div class="ts-segment ts-segment-four">${([['normal', 'Normal'], ['raised', 'Raised'], ['overlay', 'Front'], ['custom', 'Custom']] as const).map(([value, label]) => `<button type="button" data-position-layer="${value}" aria-pressed="${packet.layer === value}">${label}</button>`).join('')}</div></div>${packet.layer === 'custom' ? `<div class="ts-field"><label class="ts-label">Custom layer index</label><input class="ts-number" type="number" value="${packet.zIndex ?? 1}" data-packet-field="position-z"></div>` : ''}`)
      }
      case 'transform': {
        const rotateSummary = Math.abs(packet.rotate) > .001 ? `${packet.rotate > 0 ? '+' : ''}${packet.rotate}°` : 'No rotation'
        const scaleSummary = Math.abs(packet.scaleX - 1) > .001 || Math.abs(packet.scaleY - 1) > .001 ? `${Math.round(packet.scaleX * 100)}%${packet.scaleLinked ? '' : ` × ${Math.round(packet.scaleY * 100)}%`}` : '100%'
        const skewSummary = Math.abs(packet.skewX) > .001 || Math.abs(packet.skewY) > .001 ? `skew ${packet.skewX}° / ${packet.skewY}°` : ''
        const summary = [rotateSummary, scaleSummary, skewSummary].filter(Boolean).join(' · ')
        const rotateButtons = [-5, -2, 0, 2, 5].map((value) => `<button type="button" data-transform-rotate="${value}" aria-pressed="${Math.abs(packet.rotate - value) < .001}">${value > 0 ? '+' : ''}${value}°</button>`).join('')
        return this.packetShell(override, packet, 'Transform', summary, `<p class="ts-note">Changes the visual angle and shape without moving the element's layout slot. Nudge stays independent.</p><div class="ts-field"><label class="ts-label">Rotate <span>clockwise +</span></label><div class="ts-segment ts-segment-five">${rotateButtons}</div></div>${this.rangeField('Rotation', 'transform-rotate', packet.rotate, -45, 45, '°')}<div class="ts-field"><label class="ts-label">Scale</label><label class="ts-check"><input type="checkbox" data-packet-field="transform-scale-linked" ${packet.scaleLinked ? 'checked' : ''}> Link horizontal + vertical</label></div>${this.rangeField(packet.scaleLinked ? 'Scale' : 'Horizontal scale', 'transform-scale-x', Math.round(packet.scaleX * 100), 50, 150, '%')}${packet.scaleLinked ? '' : this.rangeField('Vertical scale', 'transform-scale-y', Math.round(packet.scaleY * 100), 50, 150, '%')}<details class="ts-advanced"><summary>Skew</summary><p class="ts-note">Skew owns the CSS <code>transform</code> property. Use it deliberately on native UI that already transforms itself.</p>${this.rangeField('Horizontal tilt', 'transform-skew-x', packet.skewX, -30, 30, '°')}${this.rangeField('Vertical tilt', 'transform-skew-y', packet.skewY, -30, 30, '°')}</details><button class="ts-btn" type="button" data-transform-reset="${escapeHtml(packet.id)}">Reset transform</button>`)
      }
      case 'size': {
        const fmt = (dimension: DimensionValue | undefined) => { if (!dimension || dimension.mode === 'native') return 'Auto'; if (dimension.mode === 'content') return 'Fit'; if (dimension.mode === 'parent') return 'Fill'; if (dimension.mode === 'fixed') return `${dimension.value}${dimension.unit}`; return 'Auto' }
        return this.packetShell(override, packet, 'Size', `${fmt(packet.width)} × ${fmt(packet.height)}${packet.boundary ? ` · inside ${packet.boundary.label}` : ''}`, `<div class="ts-size-primary">${this.primaryDimensionField('Width', 'size-width', packet.width)}${this.primaryDimensionField('Height', 'size-height', packet.height)}</div>${this.sizeBoundaryField(packet)}<details class="ts-advanced"><summary>Constraints</summary>${this.dimensionField('Minimum width', 'size-minWidth', packet.minWidth)}${this.dimensionField('Maximum width', 'size-maxWidth', packet.maxWidth)}${this.dimensionField('Minimum height', 'size-minHeight', packet.minHeight)}${this.dimensionField('Maximum height', 'size-maxHeight', packet.maxHeight)}</details>`)
      }
    }
  }

  private layoutWarning(kind: 'gap' | 'alignment'): string {
    const element = this.selection?.target.element
    if (!element?.isConnected) return ''
    const display = getComputedStyle(element).display
    return ['flex', 'grid', 'inline-flex', 'inline-grid'].includes(display) ? '' : `<div class="ts-warning">${kind === 'gap' ? 'Gap' : 'Content alignment'} usually requires a flex or grid target. Current display is ${escapeHtml(display || 'unknown')}; Palette will not change it automatically.</div>`
  }
  private layoutItemWarning(): string {
    const element = this.selection ? (activeScope(this.selection).element ?? this.selection.target.element) : undefined
    const parent = element?.parentElement
    if (!parent?.isConnected) return ''
    const context = inspectLayoutContext(element!, this.components)
    const supported = context.isFlex || context.isGrid
    return `<div class="ts-layout-parent-context"><div><span class="ts-kicker">Layout parent</span><strong>${escapeHtml(context.parentLabel)}</strong><small>${escapeHtml(context.parentDisplay || 'unknown')}${context.parentSelector ? ` · ${escapeHtml(context.parentSelector)}` : ''}</small></div><button class="ts-btn" type="button" data-action="edit-layout-parent">Edit parent</button></div>${supported ? '' : `<div class="ts-warning">Layout Item usually requires a flex or grid parent. Current parent is <strong>${escapeHtml(context.parentLabel)}</strong> with display <strong>${escapeHtml(context.parentDisplay || 'unknown')}</strong>. If you only want left / center / right placement, use <strong>Quick Align</strong> instead. <button class="ts-btn ts-warning-action" type="button" data-action="edit-layout-parent">Edit parent</button></div>`}`
  }

  private quickAlignContext(vertical: 'native' | 'start' | 'center' | 'end' | 'stretch'): string {
    const element = this.selection ? (activeScope(this.selection).element ?? this.selection.target.element) : undefined
    if (!element?.isConnected) return '<p class="ts-note">Horizontal placement resolves through logical margins and remains reusable without requiring Flex or Grid.</p>'
    const context = inspectLayoutContext(element, this.components)
    const parentDisplay = context.parentDisplay || 'unknown'
    const horizontal = '<small>Horizontal → logical auto margins + fit-content. Explicit Size still wins.</small>'
    const verticalWarning = vertical !== 'native' && !context.isFlex && !context.isGrid
      ? `<div class="ts-warning">Vertical Quick Align may have no free space to distribute because <strong>${escapeHtml(context.parentLabel)}</strong> uses <strong>${escapeHtml(parentDisplay)}</strong>. Horizontal placement still works. Use Position when you need pinned vertical placement.</div>`
      : ''
    return `<div class="ts-layout-parent-context ts-quick-align-context"><div><span class="ts-kicker">Resolved inside</span><strong>${escapeHtml(context.parentLabel)}</strong><small>${escapeHtml(parentDisplay)}${context.parentSelector ? ` · ${escapeHtml(context.parentSelector)}` : ''}</small>${horizontal}</div><button class="ts-btn" type="button" data-action="edit-layout-parent">Edit parent</button></div>${verticalWarning}`
  }

  private renderResources(): string {
    return `<div class="ts-resource-tabs">${(['components', 'assets', 'reference'] as ResourceTab[]).map((tab) => `<button class="ts-btn" type="button" data-resource="${tab}" aria-pressed="${this.resource === tab}">${tab[0].toUpperCase()}${tab.slice(1)}</button>`).join('')}</div>${this.resource === 'components' ? this.renderComponents() : this.resource === 'assets' ? this.renderAssets() : this.renderVariables()}`
  }
  private renderComponents(): string {
    const query = this.componentSearch.toLowerCase().trim()
    const filtered = query ? this.components.filter((entry) => entry.label.toLowerCase().includes(query) || entry.area.toLowerCase().includes(query)) : this.components
    return `<input class="ts-search" type="search" data-search="components" placeholder="Search ${this.components.length} components…" value="${escapeHtml(this.componentSearch)}"><div class="ts-resource-list" style="margin-top:8px">${filtered.length ? groupNativeComponents(filtered).map((group) => `<div class="ts-group-title">${escapeHtml(group.area)}</div>${group.components.map((component) => `<button class="ts-list-item" type="button" data-component-id="${escapeHtml(component.id)}"><span class="ts-list-primary">${escapeHtml(component.label)}</span><span class="ts-source-row">${component.sources.map((source) => `<span class="ts-chip">${source}</span>`).join('')}</span></button>`).join('')}`).join('') : '<div class="ts-empty">No components found.</div>'}</div>`
  }
  private renderAssets(): string {
    const fontAssets = this.assets.filter((asset) => /\.(woff2?|ttf|otf)$/i.test(asset.path))
    const bundle = this.store.activeProject.nativeAssetBundleId
    const rows = this.assets.map((asset) => `<div class="ts-native-asset"><div class="ts-native-asset-preview">${asset.mimeType?.startsWith('image/') && asset.contentUrl ? `<img src="${escapeHtml(asset.contentUrl)}" alt="">` : '<span>◇</span>'}</div><div class="ts-native-asset-copy"><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.mimeType ?? 'file')} · ${escapeHtml(formatBytes(asset.size))}</span><code>${escapeHtml(asset.path)}</code></div><div class="ts-native-asset-actions">${asset.mimeType?.startsWith('image/') ? `<button class="ts-btn ts-btn-icon" type="button" data-native-optimize="${escapeHtml(asset.id)}" title="Optimize as WebP">◫</button>` : ''}<button class="ts-btn ts-btn-icon ts-btn-danger" type="button" data-native-delete="${escapeHtml(asset.id)}" title="Delete native asset">×</button></div></div>`).join('')
    const borrowedRows = this.activeThemeAssets.map((asset) => `<div class="ts-native-asset"><div class="ts-native-asset-preview">${asset.mimeType?.startsWith('image/') && asset.contentUrl ? `<img src="${escapeHtml(asset.contentUrl)}" alt="">` : '<span>◇</span>'}</div><div class="ts-native-asset-copy"><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.mimeType ?? 'file')} · current theme</span><code>${escapeHtml(asset.path)}</code></div><div class="ts-native-asset-actions"><span class="ts-chip">Borrowable</span></div></div>`).join('')
    const projectList = rows || '<div class="ts-empty">No project-owned assets yet.</div>'
    const activeList = borrowedRows ? `<div class="ts-group-title">Current theme · borrow on use</div>${borrowedRows}` : ''
    return `<div class="ts-actions" style="margin:0 0 8px"><button class="ts-btn" type="button" data-action="refresh-assets" ${this.capabilities.listAssets ? '' : 'disabled'}>↻ Refresh</button><button class="ts-btn ts-btn-primary" type="button" data-action="upload-asset" ${this.capabilities.uploadAssets ? '' : 'disabled'}>Upload asset</button><button class="ts-btn" type="button" data-action="open-native-assets" ${this.capabilities.openNativeEditor ? '' : 'disabled'}>Native Assets</button><input type="file" data-native-asset-file hidden multiple></div><p class="ts-note">${bundle ? `Project bundle · ${escapeHtml(bundle)}` : 'No project bundle yet. The first upload or borrowed asset creates one.'} Current-theme assets are read-only sources here; choosing one in Background or a pack slot copies it into this project before authoring. Palette uses <code>contentUrl</code> only for previews and persists canonical <code>./assets/…</code> paths.</p>${this.assetError ? `<div class="ts-warning">${escapeHtml(this.assetError)}</div>` : ''}${fontAssets.length ? `<div class="ts-card" style="margin-bottom:8px"><div class="ts-label">Register asset font</div><input class="ts-input" data-font-family placeholder="Family name"><select class="ts-input" data-font-asset style="margin-top:7px">${fontAssets.map((asset) => `<option value="${escapeHtml(asset.path)}">${escapeHtml(asset.name)}</option>`).join('')}</select><button class="ts-btn" type="button" data-action="register-font" style="margin-top:7px">Register font</button>${this.store.activeProject.fonts.map((font) => `<div class="ts-meta" style="margin-top:6px"><span><strong>${escapeHtml(font.family)}</strong> · ${escapeHtml(font.source.path)}</span><button class="ts-btn ts-btn-danger" type="button" data-remove-font="${escapeHtml(font.id)}">Remove</button></div>`).join('')}</div>` : ''}<div class="ts-resource-list"><div class="ts-group-title">Project assets</div>${projectList}${activeList}</div>`
  }
  private renderVariables(): string {
    const query = this.variableSearch.toLowerCase().trim()
    const filtered = query ? this.variables.filter((entry) => entry.name.toLowerCase().includes(query) || entry.category?.toLowerCase().includes(query)) : this.variables
    const grouped = new Map<string, NativeThemeVariable[]>()
    for (const variable of filtered) { const key = variable.category ?? 'Other'; grouped.set(key, [...(grouped.get(key) ?? []), variable]) }
    return `<input class="ts-search" type="search" data-search="variables" placeholder="Search ${this.variables.length} variables…" value="${escapeHtml(this.variableSearch)}"><div class="ts-resource-list" style="margin-top:8px">${filtered.length ? [...grouped].map(([category, entries]) => `<div class="ts-group-title">${escapeHtml(category)}</div>${entries.map((entry) => `<div class="ts-variable"><code>${escapeHtml(entry.name)}</code><span>${escapeHtml(entry.value ?? entry.defaultValue ?? '')}</span></div>`).join('')}`).join('') : '<div class="ts-empty">No variables found.</div>'}</div>`
  }
  private renderCode(generatedCss: string): string {
    return `<section class="ts-section"><div class="ts-code-label"><p class="ts-kicker" style="margin:0">Generated CSS</p><span class="ts-chip">Compiler owned</span></div><textarea class="ts-textarea ts-code ts-code-generated" readonly spellcheck="false">${escapeHtml(generatedCss)}</textarea></section><section class="ts-section"><div class="ts-code-label"><p class="ts-kicker" style="margin:0">Custom CSS</p><span data-custom-status class="${this.previewResult.valid ? 'ts-status-ok' : 'ts-status-error'}">${this.previewResult.valid ? 'Previewing' : escapeHtml(this.previewResult.error ?? 'Invalid CSS')}</span></div><textarea class="ts-textarea ts-code ts-code-custom" data-custom-css spellcheck="false" placeholder="/* Advanced CSS stays separate from visual packets. */">${escapeHtml(this.store.activeProject.customCss)}</textarea><p class="ts-note">Generated CSS loads first. Custom CSS loads afterward so advanced users can deliberately override visual output.</p></section><section class="ts-section ts-code-handoff"><div class="ts-code-label"><div><p class="ts-kicker" style="margin:0">Native handoff</p><p class="ts-note">The canonical Lumiverse bridge owns assets, .lumitheme encoding, installation, and native editor navigation.</p></div><span class="ts-chip">ctx.theme</span></div><div class="ts-actions ts-native-handoff-actions"><button class="ts-btn ts-btn-primary" type="button" data-native-action="install" ${this.capabilities.applyTheme ? '' : 'disabled'}>Send to Lumiverse</button><button class="ts-btn" type="button" data-native-action="export" ${this.capabilities.exportLumitheme ? '' : 'disabled'}>Export .lumitheme</button><button class="ts-btn" type="button" data-native-action="import" ${this.capabilities.importTheme ? '' : 'disabled'}>Import .lumitheme</button><button class="ts-btn" type="button" data-native-action="editor" ${this.capabilities.openNativeEditor ? '' : 'disabled'}>Open native editor</button><input type="file" accept=".lumitheme,application/zip" data-native-theme-file hidden></div>${this.nativeActionStatus ? `<div class="ts-native-status">${escapeHtml(this.nativeActionStatus)}</div>` : ''}<p class="ts-note">Send installs a fresh native bundle and saves the result to Lumiverse's theme library. Import is intentionally inert: it becomes a new Palette project and does not apply itself.</p></section>`
  }
  private renderPresetPreview(preview: string): string {
    return `<div class="ts-preset-preview" data-preset-preview="${escapeHtml(preview)}" aria-hidden="true"><span class="ts-preview-avatar"></span><span class="ts-preview-name">Gabrielle</span><span class="ts-preview-line ts-preview-line-a"></span><span class="ts-preview-line ts-preview-line-b"></span><span class="ts-preview-meta">#0 · 5:23 PM</span></div>`
  }
  private ensureQuickStyleSlotsHydrated(): void {
    const project = this.store.activeProject
    if (this.hydratedRecipeProjects.has(project.id)) return
    for (const slot of project.recipeSlots ?? []) {
      const scope = slot.scope ?? 'base'
      const key = `${project.id}\u0000${slot.target.selector}\u0000${slot.type}\u0000${scope}`
      this.quickStyleSlots.set(key, { projectId: project.id, target: structuredClone(slot.target), type: slot.type, scope, base: slot.base ? structuredClone(slot.base) : undefined, layers: slot.layers.map((layer) => ({ presetId: layer.presetId, packet: structuredClone(layer.packet) })) })
    }
    this.hydratedRecipeProjects.add(project.id)
  }
  private persistQuickStyleSlots(): void {
    const projectId = this.store.activeProject.id
    const slots: RecipePacketSlot[] = [...this.quickStyleSlots.values()].filter((slot) => slot.projectId === projectId && slot.layers.length).map((slot) => ({
      id: newId('recipe-slot'), target: structuredClone(slot.target), type: slot.type, scope: slot.scope, ...(slot.base ? { base: structuredClone(slot.base) } : {}), layers: slot.layers.map((layer) => ({ presetId: layer.presetId, packet: structuredClone(layer.packet) })),
    }))
    this.suppressRender = true
    this.store.setRecipeSlots(slots)
  }
  private quickStyleSlotKey(target: StudioTarget, type: StylePacket['type'], scope: ResponsiveScopeName = 'base'): string { return `${this.store.activeProject.id}\u0000${target.selector}\u0000${type}\u0000${scope}` }
  private currentPacketFor(target: StudioTarget, type: StylePacket['type'], scope: ResponsiveScopeName = 'base'): StylePacket | undefined {
    const override = this.store.activeProject.componentOverrides.find((entry) => entry.target.selector === target.selector)
    const packets = scope === 'mobile' ? override?.mobileStates?.normal : override?.states.normal
    return packets?.find((packet) => packet.type === type)
  }
  private recipeOwnershipForPacket(override: ComponentOverride, packet: StylePacket): { presetName: string; changedCount: number } | null {
    this.ensureQuickStyleSlotsHydrated()
    const slot = this.quickStyleSlots.get(this.quickStyleSlotKey(override.target, packet.type, this.editingScope))
    const layer = slot?.layers.at(-1)
    if (!slot || !layer || layer.packet.id !== packet.id) return null
    const presetName = COMMON_PART_PRESETS.find((preset) => preset.id === layer.presetId)?.name ?? layer.presetId
    const baseline = slot.base ? structuredClone(slot.base) : createStylePacket(packet.type)
    return { presetName, changedCount: packetDiffFields(baseline, packet).length }
  }
  private trackQuickStylePacket(presetId: string, target: StudioTarget, packet: StylePacket, scope: ResponsiveScopeName = 'base'): void {
    const key = this.quickStyleSlotKey(target, packet.type, scope)
    const current = this.currentPacketFor(target, packet.type, scope)
    let slot = this.quickStyleSlots.get(key)
    if (!slot) {
      slot = { projectId: this.store.activeProject.id, target: structuredClone(target), type: packet.type, scope, base: current ? structuredClone(current) : undefined, layers: [] }
      this.quickStyleSlots.set(key, slot)
    } else {
      const top = slot.layers.at(-1)
      // Design edits keep a packet id, so capture those edits in the active layer.
      // A different id means the user replaced this slot outside Quick Styles;
      // that new manual packet becomes the safe baseline and stale recipe layers go away.
      if (top && current?.id === top.packet.id) top.packet = structuredClone(current)
      else if ((top && current?.id !== top.packet.id) || (!top && current?.id !== slot.base?.id)) {
        slot.base = current ? structuredClone(current) : undefined
        slot.layers = []
      }
      slot.target = structuredClone(target)
    }
    slot.layers = slot.layers.filter((layer) => layer.presetId !== presetId)
    slot.layers.push({ presetId, packet: structuredClone(packet) })
  }
  private presetTargetForRole(roleId: KnownPartRoleId): StudioTarget {
    const role = KNOWN_PART_ROLES[roleId]
    const target = targetForKnownRole(roleId)
    const component = role.source === 'dom-scoped' ? undefined : this.components.find((entry) => entry.label === role.component)
    if (component) target.nativeComponentId = component.id
    return target
  }

  private overrideVisibilityGone(override: ComponentOverride | undefined): boolean {
    if (!override) return false
    const baseVisibility = (override.states.normal ?? []).find((packet) => packet.type === 'visibility')
    if (this.editingScope === 'base') return baseVisibility?.type === 'visibility' && baseVisibility.mode === 'gone'
    const mobileVisibility = (override.mobileStates?.normal ?? []).find((packet) => packet.type === 'visibility')
    if (mobileVisibility?.type === 'visibility') return mobileVisibility.mode === 'gone'
    return baseVisibility?.type === 'visibility' && baseVisibility.mode === 'gone'
  }

  private mountedElementForKnownRole(roleId: KnownPartRoleId, selector?: string): Element | null {
    const role = KNOWN_PART_ROLES[roleId]
    const candidates = selector ? [{ selector }] : role.selectors
    for (const entry of candidates) {
      const query = entry.selector.replace(/::(?:before|after|placeholder)\s*$/i, '')
      try {
        const element = document.querySelector(query)
        if (!element) continue
        if (roleId === 'input.placeholder' && !element.hasAttribute('placeholder')) continue
        return element
      } catch { /* keep trying candidates */ }
    }
    return null
  }

  private knownRoleMounted(roleId: KnownPartRoleId): boolean { return Boolean(this.mountedElementForKnownRole(roleId)) }

  private knownRoleHidden(roleId: KnownPartRoleId): boolean {
    const target = this.presetTargetForRole(roleId)
    const override = this.store.activeProject.componentOverrides.find((entry) => entry.target.selector === target.selector)
    return this.overrideVisibilityGone(override)
  }

  private selectKnownRole(roleId: KnownPartRoleId): boolean {
    const target = this.presetTargetForRole(roleId)
    const mounted = this.mountedElementForKnownRole(roleId, target.selector)
    const component = target.nativeComponentId ? this.components.find((entry) => entry.id === target.nativeComponentId) : undefined
    let selection = mounted ? resolveElement(mounted, this.components) : component ? resolveCatalogComponent(component) : null
    if (!selection) return false
    let scope = selection.scopeCandidates.find((entry) => entry.selector === target.selector)
    if (!scope) {
      let matchCount = 0
      const mountedSelector = target.selector.replace(/::(?:before|after|placeholder)\s*$/i, '')
      try { matchCount = [...document.querySelectorAll(mountedSelector)].filter((element) => roleId !== 'input.placeholder' || element.hasAttribute('placeholder')).length } catch { matchCount = 0 }
      scope = {
        id: `known-role:${roleId}`,
        selector: target.selector,
        strategy: target.strategy,
        stability: target.stability,
        matchCount,
        nativeComponentId: target.nativeComponentId,
        label: target.label ?? KNOWN_PART_ROLES[roleId].label,
        type: 'context-local',
        componentId: target.nativeComponentId,
        persistence: 'persistent',
        source: target.source,
        nativeContextSelector: target.nativeContextSelector,
        localSelector: target.localSelector,
        element: mounted ?? undefined,
      }
      selection.scopeCandidates.unshift(scope)
    }
    selection.activeScopeId = scope.id
    this.selection = reconcileSelectionWithOverrides(selection, this.store.activeProject.componentOverrides).selection
    this.clearPreviewMarker()
    this.targetSurface = 'element'
    this.editingState = 'normal'
    this.editingScope = 'base'
    this.packetMenuOpen = false
    this.activeGuidePacketType = null
    this.observedRead = null
    return true
  }

  private leaveStyleLibraryForDesign(): void {
    this.captureStyleLibraryScrollState()
    if (this.styleLibraryPresentation === 'dock') {
      // Apply/Edit is a workspace handoff, not a request to forget that the user
      // chose docked browsing. Tuck the native panel away but keep its live root,
      // filters, pack workbench, and presentation ownership intact. The user can
      // expand the edge tab directly, or Browse styles will expand this same dock.
      this.styleLibraryDock?.collapse?.()
      return
    }
    this.styleLibraryOpen = false
    this.styleLibraryFiltersOpen = false
    this.styleLibraryPackId = null
  }

  private openKnownRoleInDesign(roleId: KnownPartRoleId): void {
    if (!this.selectKnownRole(roleId)) return
    this.composerWorkshopRole = null
    this.leaveStyleLibraryForDesign()
    this.workspace = 'design'
    this.render()
  }

  private openKnownRoleInComposerWorkshop(roleId: KnownPartRoleId): void {
    const wasEditing = this.composerWorkshopRole !== null
    if (!this.selectKnownRole(roleId)) return
    this.composerWorkshopRole = roleId
    if (!wasEditing) this.composerWorkshopSidecarScrollTop = 0
    this.designTool = 'pick'
    this.render()
  }

  private composerActionTarget(action: ComposerIconAction): StudioTarget {
    return {
      selector: `[data-component="InputArea"] [data-composer-action="${action}"][data-toolbar-action="${action}"]`,
      strategy: 'studio-registry', stability: 'high', persistence: 'persistent', source: 'dom-scoped',
      label: `${COMPOSER_ACTION_LABELS[action]} composer action`, overrideStrength: 'strong',
    }
  }

  private selectComposerAction(action: ComposerIconAction): boolean {
    const target = this.composerActionTarget(action)
    let mounted: Element | null = null
    try { mounted = document.querySelector(target.selector) } catch { mounted = null }
    if (!mounted) return false
    let selection = resolveElement(mounted, this.components)
    let scope = selection.scopeCandidates.find((entry) => entry.selector === target.selector)
    if (!scope) {
      let matchCount = 0
      try { matchCount = document.querySelectorAll(target.selector).length } catch { matchCount = 0 }
      scope = { id: `composer-action:${action}`, selector: target.selector, strategy: target.strategy, stability: target.stability, matchCount, label: target.label ?? COMPOSER_ACTION_LABELS[action], type: 'context-local', persistence: 'persistent', source: 'dom-scoped', element: mounted }
      selection.scopeCandidates.unshift(scope)
    }
    selection.activeScopeId = scope.id
    this.selection = reconcileSelectionWithOverrides(selection, this.store.activeProject.componentOverrides).selection
    this.clearPreviewMarker(); this.targetSurface = 'element'; this.editingState = 'normal'; this.editingScope = 'base'; this.packetMenuOpen = false; this.activeGuidePacketType = null; this.observedRead = null
    return true
  }

  private openComposerActionInWorkshop(action: ComposerIconAction): void {
    const wasEditing = this.composerWorkshopRole !== null
    if (!this.selectComposerAction(action)) return
    this.composerWorkshopAction = action
    this.composerWorkshopRole = 'input.actionbar'
    if (!wasEditing) this.composerWorkshopSidecarScrollTop = 0
    this.designTool = 'pick'
    this.render()
  }

  private composerPreviewPackets(roleId: KnownPartRoleId): StylePacket[] {
    const target = this.presetTargetForRole(roleId)
    return this.store.activeProject.componentOverrides.find((entry) => entry.target.selector === target.selector)?.states.normal ?? []
  }

  private composerPreviewStyleForPackets(packets: StylePacket[]): string {
    const declarations: string[] = []
    for (const packet of packets) {
      if (packet.type === 'background') {
        if (packet.mode === 'solid') declarations.push(`background:${colorWithAlpha(packet.solid.color, packet.solid.alpha)}`)
        else if (packet.mode === 'gradient') declarations.push(`background:linear-gradient(${packet.gradient.angle}deg,${packet.gradient.stops.map((stop) => `${colorWithAlpha(stop.color, stop.alpha)} ${stop.position}%`).join(',')})`)
      } else if (packet.type === 'text' && packet.colorMode === 'solid') declarations.push(`color:${colorWithAlpha(packet.solid.color, packet.solid.alpha)}`)
      else if (packet.type === 'border') declarations.push(`border:${packet.width}px ${packet.style} ${colorWithAlpha(packet.color, packet.alpha)}`)
      else if (packet.type === 'corners') declarations.push(`border-radius:${packet.topLeft}px ${packet.topRight}px ${packet.bottomRight}px ${packet.bottomLeft}px`)
      else if (packet.type === 'opacity') declarations.push(`opacity:${packet.value}`)
      else if (packet.type === 'typography') {
        if (packet.fontFamily) declarations.push(`font-family:${packet.fontFamily.replace(/[;{}]/g, '')}`)
        if (packet.fontSize) declarations.push(`font-size:${packet.fontSize}${packet.fontSizeUnit ?? 'px'}`)
        if (packet.fontWeight) declarations.push(`font-weight:${packet.fontWeight}`)
      }
      else if (packet.type === 'text-entry') {
        declarations.push(`padding:${packet.insetY}px ${packet.insetX}px`)
        declarations.push('box-sizing:border-box')
        if (packet.fontFamily) declarations.push(`font-family:${packet.fontFamily.replace(/[;{}]/g, '')}`)
        if (packet.fontSize) declarations.push(`font-size:${packet.fontSize}${packet.fontSizeUnit ?? 'px'}`)
        if (packet.fontWeight) declarations.push(`font-weight:${packet.fontWeight}`)
        if (packet.fontStyle) declarations.push(`font-style:${packet.fontStyle}`)
        if (packet.lineHeight) declarations.push(`line-height:${packet.lineHeight}`)
        if (packet.letterSpacing !== undefined) declarations.push(`letter-spacing:${packet.letterSpacing}px`)
      }
    }
    return declarations.join(';')
  }

  private composerPreviewStyle(roleId: KnownPartRoleId): string { return escapeHtml(this.composerPreviewStyleForPackets(this.composerPreviewPackets(roleId))) }
  private composerPlaceholderPreviewStyle(): string {
    const direct = this.composerPreviewStyleForPackets(this.composerPreviewPackets('input.placeholder'))
    const entry = this.composerPreviewPackets('input.textarea').find((packet) => packet.type === 'text-entry')
    if (!entry || entry.type !== 'text-entry') return escapeHtml(direct)
    const inherited = [
      `color:${colorWithAlpha(entry.placeholderColor, entry.placeholderAlpha)}`,
      entry.placeholderStyle ? `font-style:${entry.placeholderStyle}` : '',
      entry.placeholderWeight !== undefined ? `font-weight:${entry.placeholderWeight}` : '',
    ].filter(Boolean).join(';')
    return escapeHtml([inherited, direct].filter(Boolean).join(';'))
  }
  private composerActionPreviewStyle(action: ComposerIconAction): string {
    const broad = this.composerPreviewStyleForPackets(this.composerPreviewPackets('input.actionbar.controls'))
    const specific = this.store.activeProject.componentOverrides.find((entry) => entry.target.selector === this.composerActionTarget(action).selector)?.states.normal ?? []
    return escapeHtml([broad, this.composerPreviewStyleForPackets(specific)].filter(Boolean).join(';'))
  }

  private composerIconPreview(action: ComposerIconAction): string | null {
    const specific = this.store.activeProject.componentOverrides.find((entry) => entry.target.selector === this.composerActionTarget(action).selector)?.states.normal.find((packet) => packet.type === 'composer-icons')
    const broadTarget = this.presetTargetForRole('input.actionbar')
    const broad = this.store.activeProject.componentOverrides.find((entry) => entry.target.selector === broadTarget.selector)?.states.normal.find((packet) => packet.type === 'composer-icons')
    const packet = specific?.type === 'composer-icons' ? specific : broad?.type === 'composer-icons' ? broad : null
    if (!packet) return null
    const custom = packet.customIcons?.[action]
    if (custom) return composerSvgDataUri(custom)
    if (packet.family === 'native') return null
    return composerIconSvgDataUri(packet.family, action)
  }

  private renderComposerWorkshop(): string {
    const sections: Array<{ id: string; label: string; hint: string; roles: Array<[KnownPartRoleId, string]> }> = [
      { id: 'frame', label: 'Frame', hint: 'Physical composer boxes', roles: [['input.shell', 'Shell'], ['input.actionbar', 'Native toolbar'], ['input.extension-toolbar', 'Extension toolbar'], ['input.field', 'Writing field']] },
      { id: 'controls', label: 'Controls', hint: 'What you press and type into', roles: [['input.actionbar.controls', 'Action buttons'], ['input.attach', 'Attachment'], ['input.textarea', 'Text entry'], ['input.placeholder', 'Placeholder'], ['input.send.shell', 'Send shell'], ['input.send', 'Send button'], ['input.send.icon', 'Send icon']] },
      { id: 'state', label: 'State', hint: 'Auxiliary composer UI', roles: [['input.status.badges', 'Badges'], ['input.status.selected', 'Selected state'], ['input.popover', 'Popover'], ['input.popover.rows', 'Popover rows'], ['input.popover.secondary', 'Popover labels']] },
    ]
    const activeRole = this.composerWorkshopRole
    const activeLabel = activeRole ? sections.flatMap((section) => section.roles).find(([role]) => role === activeRole)?.[1] ?? KNOWN_PART_ROLES[activeRole]?.label ?? 'Composer part' : ''
    const groups = sections.map((section) => `<section data-composer-workshop-section="${section.id}"><header><strong>${escapeHtml(section.label)}</strong><span>${escapeHtml(section.hint)}</span></header><div>${section.roles.map(([roleId, label]) => { const mounted = this.knownRoleMounted(roleId); const hidden = this.knownRoleHidden(roleId); return `<button type="button" data-composer-workshop-role="${roleId}" aria-pressed="${activeRole === roleId}" ${mounted ? '' : 'disabled'}><span>${escapeHtml(label)}</span>${hidden ? '<i class="ts-hidden-mark" title="Hidden with display: none" aria-label="Hidden">×</i>' : ''}<small>${mounted ? (activeRole === roleId ? 'Editing' : 'Open') : 'Not mounted'}</small></button>` }).join('')}</div></section>`).join('')
    const toolbar = COMPOSER_MOCK_ACTIONS.map((action) => { const icon = this.composerIconPreview(action); return `<button type="button" data-composer-mock-role="input.actionbar" data-composer-mock-action="${action}" aria-label="Edit ${escapeHtml(COMPOSER_ACTION_LABELS[action])} icon" aria-pressed="${activeRole === 'input.actionbar' && this.composerWorkshopAction === action}" style="${this.composerActionPreviewStyle(action)}"><i ${icon ? `class="has-svg" style="--ts-composer-svg:url(${escapeHtml(icon)})"` : ''}></i><span>${escapeHtml(COMPOSER_ACTION_LABELS[action])}</span></button>` }).join('')
    const mountedTextarea = this.mountedElementForKnownRole('input.textarea') as HTMLTextAreaElement | null
    const placeholderText = mountedTextarea?.getAttribute('placeholder') ?? 'Type a message…'
    const preview = `<div class="ts-composer-workshop-preview" data-composer-mock-role="input.shell" ${activeRole ? `data-active-composer-role="${activeRole}"` : ''} style="${this.composerPreviewStyle('input.shell')}"><div class="ts-composer-workshop-toolbar" data-composer-mock-role="input.actionbar.controls" style="${this.composerPreviewStyle('input.actionbar')}">${toolbar}</div><div class="ts-composer-workshop-input" data-composer-mock-role="input.field" style="${this.composerPreviewStyle('input.field')}"><button type="button" class="ts-composer-mock-attach" data-composer-mock-role="input.attach" aria-label="Edit attachment" style="${this.composerPreviewStyle('input.attach')}"><i></i></button><button type="button" class="ts-composer-mock-text" data-composer-mock-role="input.textarea" aria-label="Edit composer text" style="${this.composerPreviewStyle('input.textarea')}"><span data-composer-mock-role="input.placeholder" style="${this.composerPlaceholderPreviewStyle()}">${escapeHtml(placeholderText)}</span></button><span class="ts-composer-mock-send-shell" data-composer-mock-role="input.send.shell" style="${this.composerPreviewStyle('input.send.shell')}"><button type="button" class="ts-composer-mock-send" data-composer-mock-role="input.send" aria-label="Edit send button" style="${this.composerPreviewStyle('input.send')}"><i data-composer-mock-role="input.send.icon" style="${this.composerPreviewStyle('input.send.icon')}"></i></button></span></div><small class="ts-composer-preview-hint">Live-ish preview · click a part to edit it.</small></div>`
    const exactComposerOverride = activeRole === 'input.actionbar' ? overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface) : null
    const hasIconWardrobe = Boolean(exactComposerOverride && (responsiveStacksFor(exactComposerOverride, this.editingScope)[this.editingState] ?? []).some((packet) => packet.type === 'composer-icons'))
    const sidecar = activeRole ? `<aside class="ts-composer-workshop-sidecar"><header class="ts-composer-sidecar-head"><button class="ts-btn ts-btn-icon ts-composer-sidecar-back" type="button" data-composer-workshop-back aria-label="Back to composer anatomy">←</button><div><span class="ts-kicker">Composer Composer</span><strong>${escapeHtml(activeLabel)}</strong><small>${activeRole === 'input.actionbar' ? `${escapeHtml(COMPOSER_ACTION_LABELS[this.composerWorkshopAction])} · ${escapeHtml(KNOWN_PART_ROLES[activeRole]?.label ?? activeLabel)}` : escapeHtml(KNOWN_PART_ROLES[activeRole]?.label ?? activeLabel)}</small></div><div class="ts-composer-sidecar-actions">${activeRole === 'input.actionbar' && !hasIconWardrobe ? '<button class="ts-btn ts-btn-primary" type="button" data-composer-workshop-add-icons>＋ Icon wardrobe</button>' : ''}<button class="ts-btn" type="button" data-composer-workshop-full-design>Open full Design ↗</button></div></header><div class="ts-composer-sidecar-scroll">${this.renderDesign({ sidecar: true })}</div></aside>` : ''
    return `<section class="ts-composer-workshop ${activeRole ? 'is-editing' : ''}"><div class="ts-composer-workshop-copy"><div><p class="ts-kicker">Composer Composer</p><strong>Build the whole input system</strong><span>${activeRole ? 'The mock composer stays live above the packet editor. Click another part to move the sidecar without leaving Style Library.' : 'Use the anatomy list or click the mock composer itself. The existing Design packet editor opens below without leaving Style Library.'}</span></div><span class="ts-chip">${activeRole ? 'Sidecar' : 'Foundation'}</span></div><div class="ts-composer-workshop-main"><nav class="ts-composer-workshop-groups" aria-label="Composer anatomy">${groups}</nav>${preview}${sidecar}</div></section>`
  }

  private applyPresetGroups(preset: CommonPartPreset): void {
    for (const spec of preset.groups ?? []) {
      const parent = this.presetTargetForRole(spec.parentRole)
      const members = spec.memberRoles.map((roleId) => ({ id: newId('group-member'), label: KNOWN_PART_ROLES[roleId].label, target: this.presetTargetForRole(roleId) }))
      const uniqueMembers = [...new Map(members.map((member) => [member.target.selector, member])).values()]
      if (uniqueMembers.length < 2) continue
      const payload: Omit<LayoutGroup, 'id'> = {
        name: spec.name, parent, members: uniqueMembers, base: structuredClone(spec.base),
        ...(spec.mobile ? { mobile: structuredClone(spec.mobile) } : {}),
        ...(spec.createStyles ? { styles: structuredClone(spec.createStyles()) } : {}),
        recipeSource: { presetId: preset.id, groupId: spec.id },
      }
      const existing = this.store.activeProject.layoutGroups.find((group) => group.recipeSource?.presetId === preset.id && group.recipeSource.groupId === spec.id)
      this.suppressRender = true
      if (existing) this.store.updateLayoutGroup(existing.id, () => ({ ...structuredClone(payload), id: existing.id }))
      else this.store.addLayoutGroup(payload)
    }
  }
  private commonPresetApplied(presetId: string): boolean {
    this.ensureQuickStyleSlotsHydrated()
    const projectId = this.store.activeProject.id
    return [...this.quickStyleSlots.values()].some((slot) => slot.projectId === projectId && slot.layers.some((layer) => layer.presetId === presetId))
      || this.store.activeProject.layoutGroups.some((group) => group.recipeSource?.presetId === presetId)
  }
  private resetCommonPreset(presetId: string, renderAfter = true): void {
    let changed = false
    const projectId = this.store.activeProject.id
    for (const [key, slot] of [...this.quickStyleSlots]) {
      if (slot.projectId !== projectId) continue
      const index = slot.layers.findIndex((layer) => layer.presetId === presetId)
      if (index < 0) continue
      const wasTop = index === slot.layers.length - 1
      const [removed] = slot.layers.splice(index, 1)
      changed = true
      if (wasTop) {
        const current = this.currentPacketFor(slot.target, slot.type, slot.scope)
        // Only touch canonical state when the recipe being reset still owns the
        // effective packet. A later manual replacement must always win.
        if (current?.id === removed.packet.id) {
          const replacement = slot.layers.at(-1)?.packet ?? slot.base
          this.suppressRender = true
          if (replacement) this.store.upsertPacket(slot.target, replacement, 'normal', slot.scope)
          else {
            const override = this.store.activeProject.componentOverrides.find((entry) => entry.target.selector === slot.target.selector)
            if (override) this.store.removePacket(override.id, current.id, 'normal', slot.scope)
          }
        }
      }
      if (!slot.layers.length) this.quickStyleSlots.delete(key)
    }
    const recipeGroupIds = this.store.activeProject.layoutGroups.filter((group) => group.recipeSource?.presetId === presetId).map((group) => group.id)
    for (const groupId of recipeGroupIds) { this.suppressRender = true; this.store.removeLayoutGroup(groupId); changed = true }
    if (changed) this.persistQuickStyleSlots()
    if (changed && renderAfter) this.render()
  }

  private applyStylePack(packId: string): void {
    const pack = packForId(packId)
    if (!pack) return
    const layout = this.packWorkbenchLayout(packId)
    for (const presetId of packDefaultPresetIdsForLayout(pack, layout)) this.applyCommonPreset(presetId, false, false, false)
    this.noteStyleLibraryRecent(`pack:${pack.id}` as StyleLibraryItemKey)
    this.render()
  }

  private resetStylePack(packId: string): void {
    const pack = packForId(packId)
    if (!pack) return
    for (const presetId of packPresetIds(pack)) this.resetCommonPreset(presetId, false)
    const assetPrefix = `Pack asset · ${packId}:`
    const assetSelectors = this.store.activeProject.componentOverrides.filter((override) => override.target.label?.startsWith(assetPrefix)).map((override) => override.target.selector)
    if (assetSelectors.length) this.store.restoreTarget(assetSelectors)
    this.render()
  }

  private tuneCommonPackets(roleId: string, packets: StylePacket[], tuneText = true): StylePacket[] {
    const accent = this.quickAccent
    const text = this.quickText
    const intensity = Math.max(0, Math.min(1, this.quickIntensity / 100))
    const accentAlpha = (value: number | undefined, floor = .08) => Math.max(floor, Math.min(1, (value ?? 1) * (.35 + intensity * .65)))
    const textRole = /paragraph|italic|blockquote|codeblock|textarea/.test(roleId)
    return packets.map((source) => {
      const packet = structuredClone(source)
      if (packet.type === 'text' && tuneText) {
        if (packet.colorMode === 'gradient') {
          packet.gradient.stops = packet.gradient.stops.map((stop, index, all) => ({ ...stop, color: index === all.length - 1 ? text : accent }))
        } else packet.solid = { ...packet.solid, color: textRole ? text : accent }
        if (packet.shadow) packet.shadow = { ...packet.shadow, color: accent, alpha: accentAlpha(packet.shadow.alpha, .06) }
        if ((packet.strokeWidth ?? 0) > 0) { packet.strokeColor = accent; packet.strokeAlpha = accentAlpha(packet.strokeAlpha, .12) }
      }
      if (packet.type === 'border') { packet.color = accent; packet.alpha = accentAlpha(packet.alpha, .08) }
      if (packet.type === 'glass' && packet.borderColor) { packet.borderColor = accent; packet.borderAlpha = accentAlpha(packet.borderAlpha, .08) }
      if (packet.type === 'shadow' && packet.color !== '#000000') { packet.color = accent; packet.alpha = accentAlpha(packet.alpha, .05) }
      if (packet.type === 'background' && roleId === 'global.buttons' && packet.mode === 'solid') { packet.solid.color = accent; packet.solid.alpha = accentAlpha(packet.solid.alpha, .06) }
      if (packet.type === 'background' && packet.mode === 'image' && packet.image.renderMode === 'mask') { packet.image.maskColor = accent; packet.image.maskAlpha = accentAlpha(packet.image.maskAlpha, .18) }
      if (packet.type === 'text' && roleId === 'global.buttons' && packet.colorMode === 'solid') packet.solid.color = text
      return packet
    })
  }

  private renderQuickPalette(): string {
    const swatches = this.recentColors.slice(0, 8).map((color) => `<button type="button" class="ts-recent-swatch" data-quick-recent="${escapeHtml(color)}" style="--ts-recent:${escapeHtml(color)}" title="Use ${escapeHtml(color)}"></button>`).join('')
    return `<div class="ts-quick-builder"><div class="ts-quick-builder-head"><div><strong>Recipe palette</strong><span>Choose once, then browse and Apply without leaving Themes.</span></div><span class="ts-chip">Build-a-Bear</span></div><div class="ts-quick-builder-grid"><label><span>Accent</span><div class="ts-color-row"><label class="ts-color-picker" title="Open color picker"><input class="ts-color" type="color" value="${escapeHtml(colorInput(this.quickAccent, '#9370db'))}" data-quick-color="accent" aria-label="Pick recipe accent color"><span>Pick</span></label><input class="ts-input" value="${escapeHtml(this.quickAccent)}" data-quick-color="accent"></div></label><label><span>Text</span><div class="ts-color-row"><label class="ts-color-picker" title="Open color picker"><input class="ts-color" type="color" value="${escapeHtml(colorInput(this.quickText, '#f4eef8'))}" data-quick-color="text" aria-label="Pick recipe text color"><span>Pick</span></label><input class="ts-input" value="${escapeHtml(this.quickText)}" data-quick-color="text"></div></label></div><div class="ts-field ts-quick-intensity"><label class="ts-label">Intensity <span data-quick-intensity-value>${this.quickIntensity}%</span></label><div class="ts-range-row"><input class="ts-range" type="range" min="0" max="100" value="${this.quickIntensity}" data-quick-intensity><input class="ts-number" type="number" min="0" max="100" value="${this.quickIntensity}" data-quick-intensity-number></div></div>${swatches ? `<div class="ts-recent"><span>Recent accent</span><div class="ts-recent-swatches">${swatches}</div></div>` : ''}</div>`
  }

  private renderPresetCards(items: CommonPartPreset[], options: { compact?: boolean; library?: boolean; packId?: string; selectedPresetIds?: Set<string>; packLayout?: PackWorkbenchLayout } = {}): string {
    const pencil = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h3.5L18.4 9.1l-3.5-3.5L4 16.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m13.9 6.6 3.5 3.5" stroke="currentColor" stroke-width="1.7"/></svg>`
    return `<div class="ts-preset-grid${options.compact ? ' ts-preset-grid-compact' : ''}">${items.map((preset) => {
      const roles = presetRoles(preset)
      const labels = [...new Set(roles.map((role) => role.label))]
      const components = [...new Set(roles.map((role) => role.component).filter(Boolean))]
      const componentSummary = components.length > 2 ? `${components.slice(0, 2).join(' + ')} +${components.length - 2}` : components.join(' + ')
      const affectsSummary = labels.length > 3 ? `${labels.slice(0, 2).join(' + ')} + ${labels.length - 2} more` : labels.join(' + ')
      const applied = this.commonPresetApplied(preset.id)
      const meta = recipeMetaForId(preset.id)
      const support = meta?.supports ?? ['bubble']
      const layoutBadges = support.includes('bubble') && support.includes('minimal') ? '<span class="ts-library-badge">Both layouts</span>' : support.includes('minimal') ? '<span class="ts-library-badge">Minimal</span>' : '<span class="ts-library-badge">Bubble</span>'
      const scaleLabel = meta?.scale === 'small' ? `Small · ${Math.max(1, labels.length)} part${labels.length === 1 ? '' : 's'}` : meta?.scale === 'component' ? `Component · ${labels.length} parts` : meta?.scale === 'layout' ? `Layout · ${labels.length} parts` : meta?.scale === 'pack' ? `Set · ${labels.length} parts` : ''
      const scaleBadge = meta ? `<span class="ts-library-badge">${escapeHtml(scaleLabel)}</span>` : ''
      const familyBadge = options.library && meta ? (options.packId ? `<span class="ts-library-badge ts-library-family">${escapeHtml(meta.family)}</span>` : `<button class="ts-library-badge ts-library-family ts-library-family-jump" type="button" data-library-family-jump="${escapeHtml(meta.family)}" title="Show ${escapeHtml(meta.family)} styles">${escapeHtml(meta.family)}</button>`) : ''
      const favoriteKey = `recipe:${preset.id}` as StyleLibraryItemKey
      const favorite = this.styleLibraryFavorites.has(favoriteKey)
      const packCompatible = !options.packId || !options.packLayout || options.packLayout === 'all' || support.includes(options.packLayout)
      const packChosen = Boolean(options.packId && packCompatible && options.selectedPresetIds?.has(preset.id))
      const workbenchToggle = options.packId ? `<button class="ts-pack-card-select" type="button" data-pack-select-preset="${escapeHtml(preset.id)}" data-pack-id="${escapeHtml(options.packId)}" aria-pressed="${packChosen}" ${packCompatible ? '' : 'disabled'}><span aria-hidden="true">${packChosen ? '✓' : '+'}</span>${packCompatible ? (packChosen ? 'Chosen' : 'Choose') : 'Other layout'}</button>` : ''
      return `<article class="ts-preset-card${options.compact ? ' ts-preset-card-compact' : ''}${options.packId ? ' ts-pack-recipe-card' : ''}${packChosen ? ' is-pack-chosen' : ''}${!packCompatible ? ' is-pack-incompatible' : ''}" data-library-card="${escapeHtml(preset.id)}" data-library-kind="recipe" data-library-search="${escapeHtml(meta ? styleLibrarySearchText(meta) : `${preset.name} ${preset.description}`.toLowerCase())}" data-preset-applied="${applied}">${this.renderPresetPreview(preset.preview)}${workbenchToggle}<div class="ts-preset-card-copy"><div class="ts-preset-card-title"><strong>${escapeHtml(preset.name)}</strong>${applied ? '<span class="ts-chip">Applied</span>' : ''}</div>${options.library ? `<div class="ts-library-targets" title="${escapeHtml(labels.join(' + '))}"><span><b>Component</b> · ${escapeHtml(componentSummary || 'DOM')}</span><span><b>Affects</b> · ${escapeHtml(affectsSummary)}</span></div><div class="ts-library-badges">${familyBadge}${layoutBadges}${scaleBadge}</div>` : `<span title="${escapeHtml(labels.join(' + '))}">Affects · ${escapeHtml(affectsSummary)}</span>`}</div><div class="ts-preset-card-actions${options.library ? ' ts-library-card-actions' : ''}">${options.compact && applied ? `<button class="ts-btn ts-quick-revert" type="button" data-reset-common-preset="${escapeHtml(preset.id)}">Revert</button>` : `<button class="ts-btn ts-btn-primary" type="button" data-apply-common-preset="${escapeHtml(preset.id)}" ${packCompatible ? '' : 'disabled'}>Apply</button>`}<button class="ts-btn ts-btn-icon" type="button" data-edit-common-preset="${escapeHtml(preset.id)}" title="Apply and edit in Design" aria-label="Apply ${escapeHtml(preset.name)} and edit" ${packCompatible ? '' : 'disabled'}>${pencil}</button>${options.library ? `<button class="ts-btn ts-btn-icon" type="button" data-library-favorite="${favoriteKey}" aria-label="${favorite ? 'Remove' : 'Add'} ${escapeHtml(preset.name)} ${favorite ? 'from' : 'to'} favorites" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button>` : ''}${options.library ? `<button class="ts-btn ts-btn-icon ts-preset-reset" type="button" data-reset-common-preset="${escapeHtml(preset.id)}" title="Reset this recipe footprint" aria-label="Reset ${escapeHtml(preset.name)}" ${applied ? '' : 'disabled'}>↺</button>` : ''}</div></article>`
    }).join('')}</div>`
  }

  private recommendedStylePresets(): CommonPartPreset[] {
    const component = this.selection?.nativeContext?.component.label
    const ids = component === 'InputArea'
      ? ['input-glass-dock', 'input-compact', 'global-buttons-soft', 'global-textareas-glass']
      : component === 'MinimalMessage'
        ? ['manga-margin-speaker', 'manga-minimal-ink-frame', 'manga-minimal-sticker-portrait']
        : component === 'BubbleMessage' || component === 'MessageContent'
          ? ['avatar-soft-fade', 'bubble-glass-card', 'prose-headings-editorial', 'actions-quiet-pill']
          : ['avatar-soft-fade', 'prose-headings-editorial', 'input-glass-dock', 'global-buttons-soft']
    return ids.map((id) => COMMON_PART_PRESETS.find((preset) => preset.id === id)).filter((preset): preset is CommonPartPreset => Boolean(preset))
  }

  private quickLookLayout(): PackWorkbenchLayout {
    const component = this.selection?.nativeContext?.component.label
    return component === 'MinimalMessage' ? 'minimal' : component === 'BubbleMessage' || component === 'MessageContent' ? 'bubble' : 'all'
  }

  private quickLookTargetRoleIds(): Set<KnownPartRoleId> {
    const selection = this.selection
    if (!selection) return new Set()
    const scope = activeScope(selection)
    const picked = selection.targetLevels.find((level) => level.relation === 'picked')?.element ?? selection.target.element ?? scope.element ?? null
    const selector = scope.selector.replace(/::(?:before|after|placeholder)\s*$/i, '')
    const matches = new Set<KnownPartRoleId>()
    for (const role of Object.values(KNOWN_PART_ROLES)) {
      const target = this.presetTargetForRole(role.id)
      const targetSelector = target.selector.replace(/::(?:before|after|placeholder)\s*$/i, '')
      if (selector && selector === targetSelector) { matches.add(role.id); continue }
      const mounted = this.mountedElementForKnownRole(role.id, target.selector)
      if (picked && mounted === picked) matches.add(role.id)
    }
    return matches
  }

  private orderQuickLookPresets(candidates: CommonPartPreset[], targetRoles: Set<KnownPartRoleId>): CommonPartPreset[] {
    if (!targetRoles.size) return candidates
    const scaleRank = { small: 0, component: 1, layout: 2, pack: 3 } as const
    return [...candidates].sort((a, b) => {
      const aRoles = presetRoles(a)
      const bRoles = presetRoles(b)
      const aPrimary = a.steps.some((step) => step.primary && targetRoles.has(step.role)) ? 0 : 1
      const bPrimary = b.steps.some((step) => step.primary && targetRoles.has(step.role)) ? 0 : 1
      if (aPrimary !== bPrimary) return aPrimary - bPrimary
      const aScale = scaleRank[recipeMetaForId(a.id)?.scale ?? 'component']
      const bScale = scaleRank[recipeMetaForId(b.id)?.scale ?? 'component']
      if (aScale !== bScale) return aScale - bScale
      return aRoles.length - bRoles.length
    })
  }

  private quickLookPresets(): { presets: CommonPartPreset[]; label: string } {
    const targetRoles = this.quickLookTargetRoleIds()
    const targetLabel = this.selection ? activeScope(this.selection).label : ''
    if (this.quickLookSource === 'current') {
      const exact = targetRoles.size
        ? COMMON_PART_PRESETS.filter((preset) => presetRoles(preset).some((role) => targetRoles.has(role.id)))
        : []
      const presets = exact.length ? this.orderQuickLookPresets(exact, targetRoles).slice(0, 6) : this.recommendedStylePresets()
      const component = this.selection?.nativeContext?.component.label
      return { presets, label: targetLabel ? `Current target · ${targetLabel}` : component ? `Current target · ${component}` : 'Current target' }
    }
    const pack = packForId(this.quickLookSource)
    if (!pack) return { presets: this.recommendedStylePresets(), label: 'Current target' }

    const candidates = packDefaultPresetIdsForLayout(pack, this.quickLookLayout())
      .map((id) => COMMON_PART_PRESETS.find((preset) => preset.id === id))
      .filter((preset): preset is CommonPartPreset => Boolean(preset))
    const exact = targetRoles.size ? candidates.filter((preset) => presetRoles(preset).some((role) => targetRoles.has(role.id))) : []
    const exactIds = new Set(exact.map((preset) => preset.id))
    const component = this.selection?.nativeContext?.component.label
    const componentAliases = new Set<string>(component === 'MessageContent' ? ['MessageContent', 'BubbleMessage'] : component ? [component] : [])
    const componentMatches = componentAliases.size
      ? candidates.filter((preset) => !exactIds.has(preset.id) && presetRoles(preset).some((role) => componentAliases.has(role.component)))
      : []
    const directIds = new Set([...exactIds, ...componentMatches.map((preset) => preset.id)])
    const ordered = [...this.orderQuickLookPresets(exact, targetRoles), ...componentMatches, ...candidates.filter((preset) => !directIds.has(preset.id))]
    return { presets: ordered.slice(0, 6), label: `${pack.name} pack${targetLabel && exact.length ? ` · ${targetLabel}` : ''}` }
  }

  private renderCommonParts(): string {
    const quickLooks = this.quickLookPresets()
    const pages: CommonPartPreset[][] = []
    for (let index = 0; index < quickLooks.presets.length; index += 2) pages.push(quickLooks.presets.slice(index, index + 2))
    const activePage = Math.min(this.quickLookPage, Math.max(0, pages.length - 1))
    this.quickLookPage = activePage
    const sourceOptions = [`<option value="current"${this.quickLookSource === 'current' ? ' selected' : ''}>Current target</option>`, ...STYLE_LIBRARY_PACKS.map((pack) => `<option value="${escapeHtml(pack.id)}"${this.quickLookSource === pack.id ? ' selected' : ''}>${escapeHtml(pack.name)}</option>`)].join('')
    const pageMarkup = pages.map((page, index) => `<section class="ts-quick-look-page" data-quick-look-page-index="${index}" aria-label="Quick looks page ${index + 1} of ${pages.length}">${this.renderPresetCards(page, { compact: true })}</section>`).join('')
    const pagination = pages.length > 1 ? `<nav class="ts-quick-look-pagination" aria-label="Quick looks pages">${pages.map((_, index) => `<button type="button" data-quick-look-page="${index}" aria-label="Show quick looks page ${index + 1}" aria-pressed="${index === activePage}"></button>`).join('')}</nav>` : ''
    return `<section class="ts-section ts-preset-library ts-quick-front" style="--ts-quick-accent:${escapeHtml(this.quickAccent)};--ts-quick-text:${escapeHtml(this.quickText)};--ts-quick-intensity:${this.quickIntensity / 100}"><div class="ts-section-heading ts-quick-front-head"><div><p class="ts-kicker">Quick styles</p><p class="ts-note">Preview the current target or raid a pack without opening the full library.</p></div><button class="ts-btn ts-btn-primary ts-browse-styles" type="button" data-action="open-style-library">Browse styles</button></div><details class="ts-quick-palette-fold"><summary><div><strong>Recipe palette</strong><span><i style="--swatch:${escapeHtml(this.quickAccent)}"></i><i style="--swatch:${escapeHtml(this.quickText)}"></i>${this.quickIntensity}%</span></div><b aria-hidden="true">⌄</b></summary><div class="ts-quick-palette-fold-body">${this.renderQuickPalette()}</div></details><div class="ts-quick-look-switch"><label><span>Quick looks</span><select class="ts-select" data-quick-look-source aria-label="Quick looks source">${sourceOptions}</select></label><small>${escapeHtml(quickLooks.label)} · ${quickLooks.presets.length} look${quickLooks.presets.length === 1 ? '' : 's'}</small></div>${pages.length ? `<div class="ts-quick-look-carousel" data-quick-look-carousel><div class="ts-quick-look-track">${pageMarkup}</div></div>${pagination}` : `<button class="ts-library-empty-cta" type="button" data-action="open-style-library">Open the library to browse all existing looks</button>`}</section>`
  }

  private applyCommonPreset(presetId: string, openEditor = false, renderAfter = true, recordRecent = true): void {
    const preset = COMMON_PART_PRESETS.find((entry) => entry.id === presetId)
    if (!preset) return
    if (recordRecent) this.noteStyleLibraryRecent(`recipe:${preset.id}` as StyleLibraryItemKey)
    let primaryTarget: StudioTarget | null = null
    let primaryPackets: StylePacket[] = []

    for (const step of preset.steps) {
      const target = this.presetTargetForRole(step.role)
      const packets = applyTextInkPolicyForRole(step.role, this.tuneCommonPackets(step.role, step.createPackets(), step.tuneText !== false))
      for (const packet of packets) {
        this.trackQuickStylePacket(preset.id, target, packet, 'base')
        this.suppressRender = true
        this.store.upsertPacket(target, packet, 'normal', 'base')
      }
      if (step.createMobilePackets) {
        const mobilePackets = applyTextInkPolicyForRole(step.role, this.tuneCommonPackets(step.role, step.createMobilePackets(), step.tuneText !== false))
        for (const packet of mobilePackets) {
          this.trackQuickStylePacket(preset.id, target, packet, 'mobile')
          this.suppressRender = true
          this.store.upsertPacket(target, packet, 'normal', 'mobile')
        }
      }
      if (!primaryTarget || step.primary) {
        primaryTarget = target
        primaryPackets = packets
      }
    }

    this.applyPresetGroups(preset)
    this.persistQuickStyleSlots()
    if (!openEditor) { if (renderAfter) this.render(); return }

    if (primaryTarget) {
      let mounted: Element | null = null
      try { mounted = document.querySelector(primaryTarget.selector) } catch { mounted = null }
      const component = primaryTarget.nativeComponentId ? this.components.find((entry) => entry.id === primaryTarget.nativeComponentId) : undefined
      let selection = mounted ? resolveElement(mounted, this.components) : component ? resolveCatalogComponent(component) : null
      if (selection) {
        let scope = selection.scopeCandidates.find((entry) => entry.selector === primaryTarget!.selector)
        if (!scope) {
          let matchCount = 0
          try { matchCount = document.querySelectorAll(primaryTarget.selector).length } catch { matchCount = 0 }
          scope = {
            id: `preset:${preset.id}`,
            selector: primaryTarget.selector,
            strategy: primaryTarget.strategy,
            stability: primaryTarget.stability,
            matchCount,
            nativeComponentId: primaryTarget.nativeComponentId,
            label: primaryTarget.label ?? preset.name,
            type: 'context-local',
            componentId: primaryTarget.nativeComponentId,
            persistence: 'persistent',
            source: primaryTarget.source,
            nativeContextSelector: primaryTarget.nativeContextSelector,
            localSelector: primaryTarget.localSelector,
            element: mounted ?? undefined,
          }
          selection.scopeCandidates.unshift(scope)
        }
        selection.activeScopeId = scope.id
        this.selection = reconcileSelectionWithOverrides(selection, this.store.activeProject.componentOverrides).selection
      }
    }

    this.clearPreviewMarker()
    this.targetSurface = 'element'
    this.editingState = 'normal'
    this.workspace = 'design'
    this.packetMenuOpen = false
    this.activeGuidePacketType = primaryPackets[0]?.type ?? null
    this.render()
  }

  private projectSwatches(project: typeof this.store.snapshot.projects[number]): string[] {
    const colors: string[] = []
    const push = (value: unknown) => { if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) && !colors.includes(value.toLowerCase())) colors.push(value.toLowerCase()) }
    push(project.boost.primary.color); push(project.boost.secondary?.color); push(project.boost.text.color)
    for (const override of project.componentOverrides) {
      for (const packet of override.states.normal ?? []) {
        if (packet.type === 'background') { if (packet.mode === 'solid') push(packet.solid.color); else if (packet.mode === 'gradient') packet.gradient.stops.forEach((stop) => push(stop.color)) }
        else if (packet.type === 'text') push(packet.solid.color)
        else if (packet.type === 'border') push(packet.color)
        else if (packet.type === 'pattern') push(packet.color)
        else if (packet.type === 'glass') push(packet.tintColor)
        if (colors.length >= 4) break
      }
      if (colors.length >= 4) break
    }
    return colors.length ? colors.slice(0, 4) : ['#9370db', '#1c1826']
  }

  private renderProjectCard(project: typeof this.store.snapshot.projects[number]): string {
    const active = project.id === this.store.snapshot.activeProjectId
    const swatches = this.projectSwatches(project)
    const boostCount = Number(project.boost.colorsEnabled) + Number(project.boost.canvasEnabled) + Number(project.boost.typographyEnabled)
    return `<article class="ts-project-card ${active ? 'is-active' : ''}" data-project-card="${escapeHtml(project.id)}"><button class="ts-project-card-select" type="button" data-project-id="${escapeHtml(project.id)}" aria-current="${active ? 'true' : 'false'}"><span class="ts-project-swatches" aria-hidden="true">${swatches.map((color) => `<i style="--swatch:${escapeHtml(color)}"></i>`).join('')}</span><span class="ts-project-card-copy"><strong>${escapeHtml(project.name)}</strong><small>${project.componentOverrides.length} target${project.componentOverrides.length === 1 ? '' : 's'}${project.layoutGroups.length ? ` · ${project.layoutGroups.length} group${project.layoutGroups.length === 1 ? '' : 's'}` : ''}${boostCount ? ` · ${boostCount} Boost` : ''}</small></span>${active ? '<span class="ts-chip">Active</span>' : ''}</button><div class="ts-project-card-actions"><button class="ts-btn ts-btn-icon" type="button" data-project-rename="${escapeHtml(project.id)}" title="Rename" aria-label="Rename ${escapeHtml(project.name)}">✎</button><button class="ts-btn ts-btn-icon" type="button" data-project-duplicate="${escapeHtml(project.id)}" title="Duplicate" aria-label="Duplicate ${escapeHtml(project.name)}">⧉</button><button class="ts-btn ts-btn-icon ts-btn-danger" type="button" data-project-delete="${escapeHtml(project.id)}" title="Delete" aria-label="Delete ${escapeHtml(project.name)}" ${this.store.snapshot.projects.length <= 1 ? 'disabled' : ''}>×</button></div></article>`
  }

  private renderThemes(): string {
    const state = this.store.snapshot
    return `${this.renderBoost()}${this.renderCommonParts()}<section class="ts-section ts-theme-stash"><div class="ts-section-heading"><div><p class="ts-kicker">Theme stash</p><p class="ts-note">Independent Palette projects. Switch freely; reusable My Styles live across all of them.</p></div><button class="ts-btn" type="button" data-action="duplicate-project">⧉ Duplicate active</button></div><div class="ts-project-grid">${state.projects.map((project) => this.renderProjectCard(project)).join('')}</div></section>`
  }
  private renderBoost(): string {
    const boost = this.store.activeProject.boost
    const fonts = knownTypographyChoices(this.store.activeProject, this.variables), diagnostics = this.themeRuntime?.diagnostics
    const slider = (label: string, field: 'contrast' | 'brightness' | 'originalSaturation', value: number, min: number, max: number) => `<div class="ts-field"><label class="ts-label">${label}<span data-boost-value="${field}">${Math.round(value * 100)}%</span></label><input class="ts-range" type="range" min="${min}" max="${max}" value="${Math.round(value * 100)}" data-boost-param="${field}"></div>`
    const boostRecent = (key: 'primary' | 'secondary' | 'text') => this.recentColors.length ? `<div class="ts-recent"><span>Recent</span><div class="ts-recent-swatches">${this.recentColors.map((color) => `<button type="button" class="ts-recent-swatch" data-boost-recent="${key}" data-recent-color="${escapeHtml(color)}" style="--ts-recent:${escapeHtml(color)}" title="Use ${escapeHtml(color)}"></button>`).join('')}</div></div>` : ''
    const boostColorField = (key: 'primary' | 'secondary' | 'text', label: string, value: string, fallback: string) => `<div class="ts-field"><label class="ts-label">${label}</label><div class="ts-color-row"><label class="ts-color-picker" title="Open color picker"><input class="ts-color" type="color" value="${escapeHtml(colorInput(value, fallback))}" data-boost-color="${key}" aria-label="Pick ${escapeHtml(label)}"><span>Pick</span></label><input class="ts-input" value="${escapeHtml(value)}" data-boost-color="${key}"></div>${boostRecent(key)}</div>`
    const textTreatment = `<div class="ts-field ts-boost-text-treatment"><label class="ts-label">Text treatment</label><div class="ts-segment"><button type="button" data-boost-text-mode="auto" aria-pressed="${boost.textMode === 'auto'}">Auto contrast</button><button type="button" data-boost-text-mode="custom" aria-pressed="${boost.textMode === 'custom'}">Custom</button></div><p class="ts-note">Auto keeps native foreground character and repairs the main text anchor against the transformed surface. Custom uses your foreground anchor instead.</p></div>${boost.textMode === 'custom' ? boostColorField('text', 'Text anchor', boost.text.color, '#f4eef8') : ''}`
    const diagnosticRoles = diagnostics ? `<div class="ts-meta ts-boost-role-meta"><span>Primary <strong>${diagnostics.roleCounts.primary}</strong></span><span>Secondary <strong>${diagnostics.roleCounts.secondary}</strong></span><span>Surface <strong>${diagnostics.roleCounts.surface}</strong></span><span>Text <strong>${diagnostics.roleCounts.text}</strong></span><span>Muted <strong>${diagnostics.roleCounts.muted}</strong></span><span>Border <strong>${diagnostics.roleCounts.border}</strong></span><span>Neutral <strong>${diagnostics.roleCounts.neutral}</strong></span><span>Semantic <strong>${diagnostics.roleCounts.semantic}</strong></span><span>Pass-through <strong>${diagnostics.roleCounts.preserve}</strong></span></div>` : ''
    const colorsBody = boost.colorsEnabled ? `<div class="ts-segment"><button type="button" data-boost-mode="recolor" aria-pressed="${boost.mode === 'recolor'}">Recolor</button><button type="button" data-boost-mode="smart-invert" aria-pressed="${boost.mode === 'smart-invert'}">Smart Invert</button></div>
      ${boostColorField('primary', 'Primary accent', boost.primary.color, '#9370db')}
      ${boostColorField('secondary', 'Secondary accent', boost.secondary?.color ?? boost.primary.color, '#786bf0')}
      <p class="ts-note">Primary leads the theme. Secondary colors supporting accents and softly influences derived surfaces and borders.</p>
      ${textTreatment}
      ${slider('Contrast', 'contrast', boost.contrast, -100, 100)}${slider('Brightness', 'brightness', boost.brightness, -100, 100)}${slider('Original saturation', 'originalSaturation', boost.originalSaturation, 0, 100)}
      <label class="ts-check ts-boost-protect"><input type="checkbox" data-boost-protect-controls ${boost.protectControls ? 'checked' : ''}> <span><strong>Protect controls</strong><small>Repair control foregrounds that lose contrast after recoloring.</small></span></label>
      ${diagnostics ? `<details class="ts-advanced"><summary>Transform diagnostics</summary><div class="ts-meta"><span>Source <strong>${diagnostics.sourceCount}</strong></span><span>Standalone <strong>${diagnostics.standaloneColorCount}</strong></span><span>Complex <strong>${diagnostics.complexColorCount}</strong></span><span>Color tokens <strong>${diagnostics.transformedColorTokenCount}</strong></span><span>Changed <strong>${diagnostics.changedCount}</strong></span><span>Preserved <strong>${diagnostics.preservedCount}</strong></span></div>${diagnosticRoles}</details>` : ''}` : '<p class="ts-note">Leave Colors off when you only want an app-wide font change. No palette variables are transformed.</p>'
    const typographyBody = boost.typographyEnabled ? `<div class="ts-field"><label class="ts-label">Typeface <span>${fonts.length} loaded</span></label>${this.fontSamples('boost', boost.typography.fontFamily)}<details class="ts-advanced ts-font-exact"><summary>Exact font</summary><select class="ts-input ts-font-select" data-boost-font><option value="">Native font</option>${fonts.map((font) => `<option value="${escapeHtml(font)}" ${boost.typography.fontFamily === font ? 'selected' : ''}>${escapeHtml(font)}</option>`).join('')}</select></details></div><div class="ts-field"><label class="ts-label">App type scale <span data-boost-value="scale">${Math.round((boost.typography.scale ?? 1) * 100)}%</span></label><input class="ts-range" type="range" min="75" max="150" value="${Math.round((boost.typography.scale ?? 1) * 100)}" data-boost-scale></div>` : '<p class="ts-note">Typography is independent from recoloring. Turn it on to change only the app’s loaded font and scale.</p>'
    const wallpaperSlider = (label: string, key: 'opacity' | 'blur' | 'saturation' | 'contrast' | 'brightness', value: number, min: number, max: number, suffix: string, step = 1) => `<div class="ts-field"><label class="ts-label">${label}<span data-boost-wallpaper-value="${key}">${Math.round(value)}${suffix}</span></label><input class="ts-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-boost-wallpaper="${key}"></div>`
    const wallpaperTreatment = boost.wallpaperTreatmentEnabled ? `<div class="ts-boost-subsection"><div class="ts-boost-subhead"><div><strong>Wallpaper layer</strong><small>Direct treatment of the mounted wallpaper image.</small></div><label class="ts-switch"><input type="checkbox" data-boost-wallpaper-enabled checked><span aria-hidden="true"></span></label></div>${wallpaperSlider('Visibility', 'opacity', boost.wallpaperOpacity * 100, 0, 100, '%')}${wallpaperSlider('Blur', 'blur', boost.wallpaperBlur, 0, 32, 'px')}${wallpaperSlider('Saturation', 'saturation', boost.wallpaperSaturation * 100, 0, 200, '%')}${wallpaperSlider('Contrast', 'contrast', boost.wallpaperContrast * 100, 25, 200, '%')}${wallpaperSlider('Brightness', 'brightness', boost.wallpaperBrightness * 100, 10, 200, '%')}<p class="ts-note">This layer is intentionally authoritative: Palette can override Lumiverse’s inline wallpaper opacity without changing the Wallpaper setting itself.</p></div>` : `<div class="ts-boost-subsection"><div class="ts-boost-subhead"><div><strong>Wallpaper layer</strong><small>Visibility, blur, saturation, contrast, and brightness.</small></div><label class="ts-switch"><input type="checkbox" data-boost-wallpaper-enabled><span aria-hidden="true"></span></label></div><p class="ts-note">Enable direct wallpaper treatment. Disable it to fall straight back to Lumiverse’s own wallpaper opacity and image styling.</p></div>`
    const canvasBody = boost.canvasEnabled ? `${wallpaperTreatment}<div class="ts-boost-subsection"><div class="ts-boost-subhead"><div><strong>Canvas wash</strong><small>The app wash above the wallpaper.</small></div></div><div class="ts-field"><label class="ts-label">Wash strength <span data-boost-value="canvas">${Math.round(boost.canvasOpacity * 100)}%</span></label><input class="ts-range" type="range" min="0" max="100" value="${Math.round(boost.canvasOpacity * 100)}" data-boost-canvas-opacity><p class="ts-note">Fades Lumiverse’s scene wash family without touching reusable card/elevated surfaces.</p></div></div>` : '<p class="ts-note">Treat the wallpaper itself and independently control how much app canvas sits over it.</p>'
    const boostLayers = [boost.colorsEnabled ? 'Colors' : '', boost.canvasEnabled ? 'Backdrop' : '', boost.typographyEnabled ? 'Typography' : ''].filter(Boolean).join(' + ') || 'Off'
    return `<section class="ts-section"><div class="ts-boost-heading"><div><p class="ts-kicker">Full App Boost</p><p class="ts-note">Independent app-wide layers compiled from the native theme baseline. Slider thumbs update live; the app changes when you release them.</p></div><span class="ts-boost-summary">${boostLayers}</span></div><div class="ts-actions ts-boost-actions ts-boost-actions-top"><button class="ts-btn ts-btn-primary" type="button" data-action="shuffle-boost" ${boost.colorsEnabled ? '' : 'disabled'}>${shuffleIcon('ts-shuffle-icon')}<span>Shuffle colors</span></button><button class="ts-btn" type="button" data-action="refresh-boost-source">Refresh source</button><button class="ts-btn ts-btn-danger" type="button" data-action="reset-boost" ${boost.enabled ? '' : 'disabled'}>Reset Boost</button></div>
      <article class="ts-card ts-boost-card ts-boost-world-card"><div class="ts-boost-card-head"><div><strong>Boost</strong><small>Native palette + backdrop treatment</small></div><span class="ts-chip">${boost.colorsEnabled || boost.canvasEnabled ? 'On' : 'Off'}</span></div><section class="ts-boost-layer"><div class="ts-boost-layer-head"><div><strong>Colors</strong><small>Recolor the native variable map</small></div><label class="ts-switch"><input type="checkbox" data-boost-colors-enabled ${boost.colorsEnabled ? 'checked' : ''}><span aria-hidden="true"></span></label></div>${colorsBody}<div class="ts-boost-release-hint" aria-live="polite">Release to apply</div></section><section class="ts-boost-layer"><div class="ts-boost-layer-head"><div><strong>Backdrop</strong><small>Wallpaper treatment + canvas wash</small></div><label class="ts-switch"><input type="checkbox" data-boost-canvas-enabled ${boost.canvasEnabled ? 'checked' : ''}><span aria-hidden="true"></span></label></div>${canvasBody}<div class="ts-boost-release-hint" aria-live="polite">Release to apply</div></section></article>
      <article class="ts-card ts-boost-card ts-boost-typography-card"><div class="ts-boost-card-head"><div><strong>Typography</strong><small>Standalone font and global type scale</small></div><label class="ts-switch"><input type="checkbox" data-boost-typography-enabled ${boost.typographyEnabled ? 'checked' : ''}><span aria-hidden="true"></span></label></div>${typographyBody}<div class="ts-boost-release-hint" aria-live="polite">Release to apply</div></article>
      ${this.boostError ? `<div class="ts-warning">${escapeHtml(this.boostError)}</div>` : ''}</section>`
  }

  private loadRecentColors(): string[] {
    try {
      if (typeof localStorage === 'undefined') return []
      const parsed = JSON.parse(localStorage.getItem('theme-studio:recent-colors') ?? '[]')
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)).slice(0, 10) : []
    } catch { return [] }
  }
  private rememberColor(value: string): void {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return
    const normalized = value.toLowerCase()
    this.recentColors = [normalized, ...this.recentColors.filter((color) => color.toLowerCase() !== normalized)].slice(0, 10)
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('theme-studio:recent-colors', JSON.stringify(this.recentColors)) } catch { /* local preferences are best-effort */ }
  }
  private clearBoostPreview(): void {
    this.themeRuntime?.clearPreview()
  }
  private bindSettledBoostRange(input: HTMLInputElement | null, onVisual: (value: number) => void, onCommit: (value: number) => void): void {
    if (!input) return
    let pointerActive = false
    let dirty = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const card = input.closest<HTMLElement>('.ts-boost-card')
    const schedule = (delay = 140) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => commit(), delay)
    }
    const commit = () => {
      if (timer) { clearTimeout(timer); timer = null }
      if (!dirty) { card?.classList.remove('is-adjusting'); return }
      dirty = false
      card?.classList.remove('is-adjusting')
      this.clearBoostPreview()
      onCommit(Number(input.value))
    }
    input.addEventListener('pointerdown', (event) => { pointerActive = true; input.setPointerCapture?.(event.pointerId); card?.classList.add('is-adjusting') })
    input.addEventListener('input', () => {
      dirty = true
      onVisual(Number(input.value))
      card?.classList.add('is-adjusting')
      // Keyboard / accessibility adjustments have no pointerup. Settle after a
      // short quiet period instead of repainting the entire app per key repeat.
      if (!pointerActive) schedule(220)
    })
    const release = () => { pointerActive = false; if (dirty) schedule(110) }
    input.addEventListener('pointerup', release)
    input.addEventListener('pointercancel', release)
    input.addEventListener('change', () => { if (!pointerActive && dirty) schedule(110) })
    input.addEventListener('blur', () => { if (dirty) commit() })
  }
  private bindCommon(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-workspace]').forEach((button) => button.addEventListener('click', () => { this.clearBoostPreview(); this.workspace = button.dataset.workspace as WorkspaceTab; if (this.workspace === 'design') void this.refreshNativeCatalog(false); this.render() }))
    this.root.querySelector<HTMLSelectElement>('[data-action="select-project"]')?.addEventListener('change', (event) => { this.clearBoostPreview(); this.clearPreviewMarker(); this.selection = null; this.layoutGroupDraft = null; this.activeLayoutGroupId = null; this.pickerMode = null; this.targetSurface = 'element'; this.editingState = 'normal'; this.store.selectProject((event.currentTarget as HTMLSelectElement).value) })
    this.root.querySelector('[data-action="create-project"]')?.addEventListener('click', () => { this.clearBoostPreview(); this.clearPreviewMarker(); this.selection = null; this.layoutGroupDraft = null; this.activeLayoutGroupId = null; this.pickerMode = null; this.targetSurface = 'element'; this.editingState = 'normal'; this.store.create() })
    this.root.querySelectorAll('[data-action="delete-project"]').forEach((button) => button.addEventListener('click', async () => { const project = this.store.activeProject; const result = await this.ctx.ui.showConfirm({ title: 'Delete Palette project?', message: `“${project.name}” and its semantic style packets will be permanently removed.`, variant: 'danger', confirmLabel: 'Delete project' }); if (result.confirmed) { this.clearBoostPreview(); this.clearPreviewMarker(); this.selection = null; this.layoutGroupDraft = null; this.activeLayoutGroupId = null; this.pickerMode = null; this.targetSurface = 'element'; this.store.delete(project.id) } }))
  }
  private bindDesign(root: ParentNode = this.root): void {
    root.querySelectorAll<HTMLButtonElement>('[data-action="save-style-target"]').forEach((button) => button.addEventListener('click', () => this.saveCurrentStyle('target')))
    root.querySelectorAll<HTMLButtonElement>('[data-action="save-style-component"]').forEach((button) => button.addEventListener('click', () => this.saveCurrentStyle('component')))
    root.querySelectorAll<HTMLButtonElement>('[data-action="save-style-choose"]').forEach((button) => button.addEventListener('click', () => this.beginSavedStyleChooser()))
    root.querySelectorAll<HTMLButtonElement>('[data-action="save-style-chooser-close"]').forEach((button) => button.addEventListener('click', () => { this.savedStyleChooserOpen = false; this.savedStyleSelection.clear(); this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-action="save-style-clear"]').forEach((button) => button.addEventListener('click', () => { this.savedStyleSelection.clear(); this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-action="save-style-bundle"]').forEach((button) => button.addEventListener('click', () => this.saveCurrentStyle('bundle')))
    root.querySelectorAll<HTMLInputElement>('[data-save-style-choice]').forEach((input) => input.addEventListener('change', () => {
      const key = input.dataset.saveStyleChoice ?? ''
      if (!key) return
      if (input.checked) this.savedStyleSelection.add(key); else this.savedStyleSelection.delete(key)
      const count = root.querySelector<HTMLElement>('[data-save-style-selected-count]'); if (count) count.textContent = String(this.savedStyleSelection.size)
      const save = root.querySelector<HTMLButtonElement>('[data-action="save-style-bundle"]'); if (save) save.disabled = this.savedStyleSelection.size === 0
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-save-style-group]').forEach((button) => button.addEventListener('click', () => {
      const label = button.dataset.saveStyleGroup ?? ''
      const group = this.authoredSaveStyleOverrides().filter((entry) => this.savedStyleComponentLabel(entry) === label)
      const shouldSelect = group.some((entry) => !this.savedStyleSelection.has(this.savedStyleOverrideKey(entry)))
      for (const entry of group) { const key = this.savedStyleOverrideKey(entry); if (shouldSelect) this.savedStyleSelection.add(key); else this.savedStyleSelection.delete(key) }
      this.render()
    }))
    root.querySelectorAll('[data-action="pick-element"]').forEach((button) => button.addEventListener('click', () => this.startPicker()))
    root.querySelector('[data-action="group-mode"]')?.addEventListener('click', () => this.startGroupMode(false))
    root.querySelectorAll<HTMLButtonElement>('[data-group-select]').forEach((button) => button.addEventListener('click', () => {
      if (this.picker.isActive) { this.pickerMode = null; this.picker.cancel() }
      this.designTool = 'group'; this.layoutGroupDraft = null; this.activeLayoutGroupId = button.dataset.groupSelect ?? null; this.render()
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-group-action]').forEach((button) => button.addEventListener('click', () => {
      const action = button.dataset.groupAction
      if (action === 'new') { this.startGroupMode(true); return }
      if (action === 'pick') { if (this.picker.isActive && this.pickerMode === 'group') { this.pickerMode = null; this.picker.cancel() } else this.startGroupPicker(); return }
      if (action === 'create') { this.createLayoutGroupFromDraft(); return }
      if (action === 'clear') { this.layoutGroupDraft = this.newLayoutGroupDraft(); this.render(); return }
      if (action === 'cancel') { if (this.picker.isActive) { this.pickerMode = null; this.picker.cancel() }; this.layoutGroupDraft = null; this.render(); return }
      if (action === 'toggle-style-menu') { this.packetMenuOpen = !this.packetMenuOpen; this.render(); return }
      const group = this.activeLayoutGroup(); if (!group) return
      if (action === 'delete') { this.store.removeLayoutGroup(group.id); this.activeLayoutGroupId = null; this.render(); return }
      if (action === 'reset-mobile') { this.store.clearLayoutGroupMobile(group.id); this.render(); return }
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-group-remove-draft]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.groupRemoveDraft); const draft = this.layoutGroupDraft; if (!draft || !Number.isInteger(index)) return
      draft.members.splice(index, 1); draft.error = ''
      this.reconcileLayoutGroupDraftParent(draft)
      this.render()
    }))
    root.querySelectorAll<HTMLSelectElement>('[data-group-retarget-draft]').forEach((select) => select.addEventListener('change', () => {
      const memberIndex = Number(select.dataset.groupRetargetDraft)
      const elementIndex = Number(select.value)
      const element = this.groupDraftRetargetElements[elementIndex]
      if (element && Number.isInteger(memberIndex)) this.retargetLayoutGroupDraftMember(memberIndex, element)
    }))
    root.querySelector<HTMLSelectElement>('[data-group-add-draft]')?.addEventListener('change', (event) => {
      const select = event.currentTarget as HTMLSelectElement
      if (!select.value) return
      const element = this.groupDraftCandidateElements[Number(select.value)]
      if (element) { this.addLayoutGroupElement(element); this.render() }
    })
    root.querySelectorAll<HTMLButtonElement>('[data-group-responsive-scope]').forEach((button) => button.addEventListener('click', () => { this.editingScope = button.dataset.groupResponsiveScope === 'mobile' ? 'mobile' : 'base'; this.responsiveScopePinned = true; this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-group-editor-tab]').forEach((button) => button.addEventListener('click', () => { this.groupEditorTab = (button.dataset.groupEditorTab as typeof this.groupEditorTab) ?? 'layout'; this.packetMenuOpen = false; this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-group-content-target]').forEach((button) => button.addEventListener('click', () => { this.groupContentTarget = (button.dataset.groupContentTarget as LayoutGroupContentTarget) ?? 'icons'; this.packetMenuOpen = false; this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-group-mode]').forEach((button) => button.addEventListener('click', () => this.updateActiveLayoutGroupState({ mode: button.dataset.groupMode === 'column' ? 'column' : button.dataset.groupMode === 'grid' ? 'grid' : 'row' })))
    root.querySelectorAll<HTMLButtonElement>('[data-group-siblings]').forEach((button) => button.addEventListener('click', () => this.updateActiveLayoutGroupState({ otherSiblings: button.dataset.groupSiblings === 'join-layout' ? 'join-layout' : 'full-width' })))
    root.querySelector<HTMLInputElement>('[data-group-columns]')?.addEventListener('change', (event) => this.updateActiveLayoutGroupState({ columns: Math.max(1, Math.min(12, Number((event.currentTarget as HTMLInputElement).value) || 1)) }))
    root.querySelector<HTMLSelectElement>('[data-group-justify]')?.addEventListener('change', (event) => this.updateActiveLayoutGroupState({ justify: (event.currentTarget as HTMLSelectElement).value as LayoutGroupState['justify'] }))
    root.querySelector<HTMLSelectElement>('[data-group-align]')?.addEventListener('change', (event) => this.updateActiveLayoutGroupState({ align: (event.currentTarget as HTMLSelectElement).value as LayoutGroupState['align'] }))
    root.querySelector<HTMLInputElement>('[data-group-name]')?.addEventListener('change', (event) => { const group = this.activeLayoutGroup(); if (!group) return; const name = (event.currentTarget as HTMLInputElement).value.trim().slice(0,120); if (name) this.store.updateLayoutGroup(group.id, (entry) => ({ ...entry, name })) })
    const groupGapRange = root.querySelector<HTMLInputElement>('[data-group-gap-range]')
    const groupGapNumber = root.querySelector<HTMLInputElement>('[data-group-gap-number]')
    const groupGapUnit = root.querySelector<HTMLSelectElement>('[data-group-gap-unit]')
    const syncGroupGap = (raw: string) => { const value = Math.max(0, Math.min(999, Number(raw) || 0)); if (groupGapRange) groupGapRange.value = String(Math.min(96,value)); if (groupGapNumber) groupGapNumber.value = String(value); const display = root.querySelector<HTMLElement>('[data-group-gap-value]'); if (display) display.textContent = `${value}${groupGapUnit?.value ?? 'px'}` }
    groupGapRange?.addEventListener('input', () => syncGroupGap(groupGapRange.value))
    groupGapRange?.addEventListener('change', () => this.updateActiveLayoutGroupState({ gap: { mode: 'fixed', value: Number(groupGapRange.value) || 0, unit: (groupGapUnit?.value as 'px'|'rem'|'%') ?? 'px' } }))
    groupGapNumber?.addEventListener('change', () => this.updateActiveLayoutGroupState({ gap: { mode: 'fixed', value: Math.max(0, Number(groupGapNumber.value) || 0), unit: (groupGapUnit?.value as 'px'|'rem'|'%') ?? 'px' } }))
    groupGapUnit?.addEventListener('change', () => this.updateActiveLayoutGroupState({ gap: { mode: 'fixed', value: Math.max(0, Number(groupGapNumber?.value) || 0), unit: groupGapUnit.value as 'px'|'rem'|'%' } }))
    root.querySelectorAll<HTMLButtonElement>('[data-responsive-scope]').forEach((button) => button.addEventListener('click', () => {
      this.observedRead = null
      this.editingScope = button.dataset.responsiveScope === 'mobile' ? 'mobile' : 'base'
      this.responsiveScopePinned = true
      this.preview.clearTransient()
      this.render()
      this.applyPreviewMarker()
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-style-state]').forEach((button) => button.addEventListener('click', () => { this.observedRead = null; this.editingState = button.dataset.styleState as StyleStateName; this.applyPreviewMarker(); this.render() }))
    root.querySelector<HTMLButtonElement>('[data-action="copy-normal"]')?.addEventListener('click', () => { const override = overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface); if (override && this.editingState !== 'normal') this.store.copyStatePackets(override.id, 'normal', this.editingState, this.editingScope) })
    root.querySelector<HTMLButtonElement>('[data-action="reset-state"]')?.addEventListener('click', () => { const override = overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface); if (override && this.editingState !== 'normal') this.store.resetState(override.id, this.editingState, this.editingScope) })
    root.querySelector<HTMLButtonElement>('[data-action="restore-target"]')?.addEventListener('click', () => { if (!this.selection) return; const selector = activeScope(this.selection).selector; this.collapsedPackets.clear(); this.targetSurface = 'element'; this.editingState = 'normal'; this.store.restoreTarget([selector, selectorForSurface(selector, 'before'), selectorForSurface(selector, 'after')]) })
    root.querySelector<HTMLButtonElement>('[data-action="reverse-engineer"]')?.addEventListener('click', () => this.reverseEngineerTarget())
    root.querySelector<HTMLButtonElement>('[data-action="read-page"]')?.addEventListener('click', () => this.openStyleMap())
    root.querySelector<HTMLButtonElement>('[data-action="clear-read-style"]')?.addEventListener('click', () => this.clearObservedRead())
    root.querySelector('[data-action="toggle-style-menu"]')?.addEventListener('click', () => { this.packetMenuOpen = !this.packetMenuOpen; this.render() })
    root.querySelectorAll<HTMLButtonElement>('[data-add-packet]').forEach((button) => button.addEventListener('click', () => {
      const type = button.dataset.addPacket as PacketType
      let packet = createStylePacket(type)
      if (type === 'svg-asset' && packet.type === 'svg-asset' && this.selection && this.targetSurface === 'element') {
        const target = activeScope(this.selection).element ?? this.selection.target.element
        const svgs = svgTargetsForElement(target)
        if (svgs.length) packet = { ...packet, targetMode: 'replace', svgPath: svgs[0].path, svgLabel: svgs[0].label, colorMode: 'inherit' }
      }
      this.activeGuidePacketType = type
      this.packetMenuOpen = false
      if (this.designTool === 'group' && this.activeLayoutGroup() && this.groupEditorTab !== 'layout') { this.upsertActiveGroupPacket(packet); this.revealStylePacket(packet.id); return }
      if (!this.selection) return
      this.store.upsertPacket(this.targetForSelection(), packet, this.editingState, this.editingScope)
      this.revealStylePacket(packet.id)
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-action="toggle-packet"]').forEach((button) => button.addEventListener('click', () => { const packetId = button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId; if (!packetId) return; if (this.collapsedPackets.has(packetId)) this.collapsedPackets.delete(packetId); else this.collapsedPackets.add(packetId); this.render() }))
    root.querySelector<HTMLSelectElement>('[data-action="select-scope"]')?.addEventListener('change', (event) => {
      if (!this.selection) return
      this.observedRead = null; this.clearPreviewMarker(); this.targetSurface = 'element'; this.selection.activeScopeId = (event.currentTarget as HTMLSelectElement).value; this.render(); this.applyPreviewMarker()
    })
    root.querySelectorAll<HTMLButtonElement>('[data-scope-chip]').forEach((button) => button.addEventListener('click', () => { if (!this.selection) return; this.observedRead = null; this.clearPreviewMarker(); this.targetSurface = 'element'; this.selection.activeScopeId = button.dataset.scopeChip ?? this.selection.activeScopeId; this.render(); this.applyPreviewMarker() }))
    root.querySelectorAll<HTMLButtonElement>('[data-structure-node]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.structureNode); const element = this.structureNodes[index]
      if (!element?.isConnected) return
      this.observedRead = null; this.clearPreviewMarker(); this.targetSurface = 'element'; this.ensureFreshMountedComponentParts()
      this.selection = reconcileSelectionWithOverrides(resolveElement(element, this.components), this.store.activeProject.componentOverrides).selection
      this.packetMenuOpen = false; this.editingState = 'normal'; this.render(); this.applyPreviewMarker()
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-message-side]').forEach((button) => button.addEventListener('click', () => {
      if (!this.selection) return
      const current = activeScope(this.selection); const familyId = current.messageFamilyId; const side = button.dataset.messageSide as MessageSideName | undefined
      if (!familyId || !side) return
      const next = this.selection.scopeCandidates.find((entry) => entry.messageFamilyId === familyId && entry.messageSide === side)
      if (!next) return
      this.observedRead = null; this.clearPreviewMarker(); this.targetSurface = 'element'; this.selection.activeScopeId = next.id; this.render(); this.applyPreviewMarker()
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-target-surface]').forEach((button) => button.addEventListener('click', () => { this.observedRead = null; this.targetSurface = (button.dataset.targetSurface as TargetSurface) ?? 'element'; this.render(); this.applyPreviewMarker() }))
    root.querySelectorAll<HTMLButtonElement>('[data-action="use-generic-scope"]').forEach((button) => button.addEventListener('click', () => {
      if (!this.selection || !button.dataset.scopeId) return
      // This affordance is deliberately exact. The suggested candidate has
      // already been filtered to the current mounted element/message side.
      // Re-running message-family preservation here can resolve straight back
      // to the aria-label/title-specific instance we are trying to leave.
      const genericScope = this.selection.scopeCandidates.find((entry) => entry.id === button.dataset.scopeId)
      if (!genericScope) return
      this.observedRead = null
      this.clearPreviewMarker()
      this.targetSurface = 'element'
      this.selection.activeScopeId = genericScope.id
      this.render()
      this.applyPreviewMarker()
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-override-strength]').forEach((button) => button.addEventListener('click', () => { const override = overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface); if (override) this.store.setOverrideStrength(override.id, button.dataset.overrideStrength === 'strong' ? 'strong' : 'normal') }))
    root.querySelector('[data-action="toggle-guides"]')?.addEventListener('click', () => { this.guidesEnabled = !this.guidesEnabled; this.render() })
    root.querySelector<HTMLSelectElement>('[data-action="guide-mode"]')?.addEventListener('change', (event) => { this.guideMode = (event.currentTarget as HTMLSelectElement).value as typeof this.guideMode; this.syncSelectionHighlight() })
    root.querySelector('[data-action="toggle-hide"]')?.addEventListener('click', () => this.toggleSelectionHidden())
    root.querySelector('[data-action="toggle-widget"]')?.addEventListener('click', () => { this.setWidgetHidden(!this.widgetHidden); this.render() })
    root.querySelectorAll<HTMLButtonElement>('[data-target-level]').forEach((button) => button.addEventListener('click', () => this.selectTargetLevel(button.dataset.targetLevel)))
    root.querySelector('[data-action="target-parent"]')?.addEventListener('click', () => this.stepTargetLevel(1))
    root.querySelector('[data-action="target-child"]')?.addEventListener('click', () => this.stepTargetLevel(-1))
    root.querySelector('[data-action="select-size-controller"]')?.addEventListener('click', () => { if (!this.selection?.sizeController?.scopeId) return; this.targetSurface = 'element'; this.activateScopePreservingMessageSide(this.selection.sizeController.scopeId); this.render() })
    root.querySelectorAll<HTMLButtonElement>('[data-action="edit-layout-parent"]').forEach((button) => button.addEventListener('click', () => {
      if (!this.selection) return
      const element = activeScope(this.selection).element ?? this.selection.target.element
      const parent = element?.parentElement
      if (!parent?.isConnected) return
      this.observedRead = null; this.clearPreviewMarker(); this.targetSurface = 'element'; this.ensureFreshMountedComponentParts()
      this.selection = reconcileSelectionWithOverrides(resolveElement(parent, this.components), this.store.activeProject.componentOverrides).selection
      this.packetMenuOpen = false; this.editingState = 'normal'; this.render(); this.applyPreviewMarker()
    }))
    root.querySelectorAll<HTMLElement>('[data-packet-type]').forEach((article) => {
      const activate = () => { this.activeGuidePacketType = article.dataset.packetType as PacketType; if (this.guidesEnabled && this.guideMode === 'smart') this.syncSelectionHighlight() }
      article.addEventListener('pointerenter', activate); article.addEventListener('focusin', activate)
    })
    root.querySelectorAll<HTMLButtonElement>('[data-action="remove-packet"]').forEach((button) => button.addEventListener('click', () => { const article = button.closest<HTMLElement>('[data-override-id][data-packet-id]'); if (!article) return; const packetId = article.dataset.packetId ?? ''; this.collapsedPackets.delete(packetId); if ((article.dataset.overrideId ?? '').startsWith('group-style:')) this.removeActiveGroupPacket(packetId); else this.store.removePacket(article.dataset.overrideId ?? '', packetId, this.editingState, this.editingScope) }))
    root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'background' ? { ...packet, mode: button.dataset.mode === 'gradient' ? 'gradient' : button.dataset.mode === 'image' ? 'image' : 'solid' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-background-image-render]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'background' ? { ...packet, image: { ...packet.image, renderMode: button.dataset.backgroundImageRender === 'mask' ? 'mask' : 'image' } } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-text-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'text' ? { ...packet, colorMode: button.dataset.textMode === 'gradient' ? 'gradient' : 'solid' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-text-ink-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'text' ? { ...packet, inkMode: button.dataset.textInkMode === 'force' ? 'force' : 'cascade' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-text-outline-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'text' ? { ...packet, outlineMode: button.dataset.textOutlineMode === 'outside' ? 'outside' : 'edge' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-content-source]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'content' ? { ...packet, source: button.dataset.contentSource === 'title' ? 'title' : button.dataset.contentSource === 'aria-label' ? 'aria-label' : 'literal' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-gradient-add]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => {
      if (packet.type !== 'background' && packet.type !== 'text') return packet
      if (packet.gradient.stops.length >= 6) return packet
      const stops = [...packet.gradient.stops].sort((a, b) => a.position - b.position)
      let insertAt = Math.max(1, stops.length - 1)
      let widest = -1
      for (let index = 0; index < stops.length - 1; index++) { const width = stops[index + 1].position - stops[index].position; if (width > widest) { widest = width; insertAt = index + 1 } }
      const left = stops[insertAt - 1], right = stops[insertAt]
      stops.splice(insertAt, 0, { color: right?.color ?? left.color, alpha: ((left.alpha ?? 1) + (right?.alpha ?? left.alpha ?? 1)) / 2, position: Math.round((left.position + (right?.position ?? 100)) / 2) })
      return { ...packet, gradient: { ...packet.gradient, stops } }
    })))
    root.querySelectorAll<HTMLButtonElement>('[data-gradient-remove]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => {
      if (packet.type !== 'background' && packet.type !== 'text') return packet
      const index = Number(button.dataset.gradientRemove); if (!Number.isInteger(index) || packet.gradient.stops.length <= 2) return packet
      return { ...packet, gradient: { ...packet.gradient, stops: packet.gradient.stops.filter((_, stopIndex) => stopIndex !== index) } }
    })))
    root.querySelectorAll<HTMLButtonElement>('[data-typography-font-sample]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'typography' ? { ...packet, fontFamily: button.dataset.typographyFontSample?.trim() || undefined } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-typography-align]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'typography' ? { ...packet, textAlign: button.dataset.typographyAlign as typeof packet.textAlign } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-visibility-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'visibility' ? { ...packet, mode: button.dataset.visibilityMode as typeof packet.mode } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-pattern-type]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'pattern' ? { ...packet, pattern: button.dataset.patternType as typeof packet.pattern } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-composer-icon-family]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'composer-icons' ? { ...packet, family: (button.dataset.composerIconFamily === 'manga' || button.dataset.composerIconFamily === 'editorial' || button.dataset.composerIconFamily === 'journal' || button.dataset.composerIconFamily === 'visual-novel') ? button.dataset.composerIconFamily : 'native' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-composer-icon-action]').forEach((button) => button.addEventListener('click', () => { const action = button.dataset.composerIconAction as ComposerIconAction | undefined; if (!action || !COMPOSER_ICON_ACTIONS.includes(action)) return; if (this.styleLibraryOpen && this.styleLibraryArea === 'composer') this.openComposerActionInWorkshop(action); else { this.composerWorkshopAction = action; this.render() } }))
    root.querySelectorAll<HTMLButtonElement>('[data-composer-svg-apply]').forEach((button) => button.addEventListener('click', () => {
      const svg = this.store.activeProject.svgAssets.find((entry) => entry.id === button.dataset.composerSvgApply)?.svg
      if (!svg) return
      this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'composer-icons' ? { ...packet, customIcons: { ...(packet.customIcons ?? {}), [this.composerWorkshopAction]: svg } } : packet)
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-composer-svg-clear]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => {
      if (packet.type !== 'composer-icons') return packet
      const customIcons = { ...(packet.customIcons ?? {}) }; delete customIcons[this.composerWorkshopAction]
      return { ...packet, customIcons }
    })))
    root.querySelectorAll<HTMLButtonElement>('[data-composer-svg-delete]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); const id = button.dataset.composerSvgDelete; if (id) this.store.removeSvgAsset(id) }))
    root.querySelectorAll<HTMLInputElement>('[data-composer-svg-file]').forEach((input) => input.addEventListener('change', () => {
      const file = input.files?.[0]; const form = input.closest<HTMLElement>('.ts-svg-save'); const source = form?.querySelector<HTMLTextAreaElement>('[data-composer-svg-source]'); const name = form?.querySelector<HTMLInputElement>('[data-composer-svg-name]')
      if (!file || !source) return
      if (name && !name.value.trim()) name.value = file.name.replace(/\.svg$/i, '').slice(0, 80)
      const reader = new FileReader(); reader.onload = () => { source.value = typeof reader.result === 'string' ? reader.result : '' }; reader.readAsText(file)
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-composer-svg-save]').forEach((button) => button.addEventListener('click', () => {
      const form = button.closest<HTMLElement>('.ts-svg-save'); const source = form?.querySelector<HTMLTextAreaElement>('[data-composer-svg-source]'); const name = form?.querySelector<HTMLInputElement>('[data-composer-svg-name]'); const status = form?.querySelector<HTMLElement>('.ts-svg-save-status')
      const clean = normalizeSvgSource(source?.value ?? '')
      if (!clean) { if (status) status.textContent = 'That does not look like a safe standalone SVG.'; return }
      const saved = this.store.saveSvgAsset(name?.value ?? '', clean)
      if (!saved && status) status.textContent = 'Could not store SVG.'
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-target-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => {
      if (packet.type !== 'svg-asset') return packet
      const mode = button.dataset.svgTargetMode === 'replace' ? 'replace' : 'surface'
      if (mode === 'replace' && !packet.svgPath && this.selection) {
        const target = activeScope(this.selection).element ?? this.selection.target.element
        const candidate = svgTargetsForElement(target)[0]
        return { ...packet, targetMode: mode, svgPath: candidate?.path ?? 'svg', svgLabel: candidate?.label ?? 'SVG', colorMode: packet.colorMode ?? 'inherit' }
      }
      return { ...packet, targetMode: mode }
    })))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-target-path]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, targetMode: 'replace', svgPath: button.dataset.svgTargetPath ?? 'svg', svgLabel: button.dataset.svgTargetLabel ?? 'SVG' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-color-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, colorMode: button.dataset.svgColorMode === 'custom' ? 'custom' : 'inherit' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-size-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, size: button.dataset.svgSizeMode === 'fixed' ? (packet.size ?? 16) : undefined } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-builtin-apply]').forEach((button) => button.addEventListener('click', () => {
      const asset = BUILTIN_ORNAMENTS.find((entry) => entry.id === button.dataset.svgBuiltinApply)
      if (!asset) return
      this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, svg: asset.svg, assetId: `builtin:${asset.id}`, assetName: asset.label } : packet)
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-asset-clear]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, svg: '', assetId: undefined, assetName: undefined } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-library-delete]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); const id = button.dataset.svgLibraryDelete; if (id) this.store.removeSvgAsset(id) }))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-custom-use]').forEach((button) => button.addEventListener('click', () => {
      const form = button.closest<HTMLElement>('.ts-svg-save'); const source = form?.querySelector<HTMLTextAreaElement>('[data-svg-library-source]'); const name = form?.querySelector<HTMLInputElement>('[data-svg-library-name]'); const status = form?.querySelector<HTMLElement>('.ts-svg-save-status')
      const clean = normalizeSvgSource(source?.value ?? '')
      if (!clean) { if (status) status.textContent = 'That does not look like a safe standalone SVG.'; return }
      this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, svg: clean, assetId: undefined, assetName: name?.value.trim().slice(0, 80) || 'Custom SVG' } : packet)
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-asset-apply]').forEach((button) => button.addEventListener('click', () => {
      const asset = this.store.activeProject.svgAssets.find((entry) => entry.id === button.dataset.svgAssetApply)
      if (!asset) return
      this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, svg: asset.svg, assetId: asset.id, assetName: asset.name } : packet)
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-render-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, renderMode: button.dataset.svgRenderMode === 'image' ? 'image' : 'mask' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-fit]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, fit: button.dataset.svgFit === 'cover' ? 'cover' : 'contain' } : packet)))
    root.querySelectorAll<HTMLInputElement>('[data-svg-library-file]').forEach((input) => input.addEventListener('change', () => {
      const file = input.files?.[0]; const form = input.closest<HTMLElement>('.ts-svg-save'); const source = form?.querySelector<HTMLTextAreaElement>('[data-svg-library-source]'); const name = form?.querySelector<HTMLInputElement>('[data-svg-library-name]')
      if (!file || !source) return
      if (name && !name.value.trim()) name.value = file.name.replace(/\.svg$/i, '').slice(0, 80)
      const reader = new FileReader(); reader.onload = () => { source.value = typeof reader.result === 'string' ? reader.result : '' }; reader.readAsText(file)
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-svg-library-save]').forEach((button) => button.addEventListener('click', () => {
      const form = button.closest<HTMLElement>('.ts-svg-save'); const source = form?.querySelector<HTMLTextAreaElement>('[data-svg-library-source]'); const name = form?.querySelector<HTMLInputElement>('[data-svg-library-name]'); const status = form?.querySelector<HTMLElement>('.ts-svg-save-status')
      const clean = normalizeSvgSource(source?.value ?? '')
      if (!clean) { if (status) status.textContent = 'That does not look like a safe standalone SVG.'; return }
      const saved = this.store.saveSvgAsset(name?.value ?? '', clean)
      if (!saved) { if (status) status.textContent = 'Could not store SVG.'; return }
      this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'svg-asset' ? { ...packet, svg: saved.svg, assetId: saved.id, assetName: saved.name } : packet)
      if (status) status.textContent = `Saved + using ${saved.name}.`
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-image-quality]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'image' ? { ...packet, sourceQuality: button.dataset.imageQuality === 'full' ? 'full' : button.dataset.imageQuality === 'auto' ? 'auto' : 'native' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-image-fit]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'image' ? { ...packet, objectFit: button.dataset.imageFit as typeof packet.objectFit } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-image-mask-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => {
      if (packet.type !== 'mask') return packet
      const mode = button.dataset.imageMaskMode as MaskPacket['maskMode']
      return { ...packet, maskMode: mode, ...(mode === 'fade' && packet.fade.direction === 'none' ? { fade: { ...packet.fade, direction: 'bottom' as const } } : {}), ...(mode === 'custom' && !packet.customMask ? { customMask: defaultImageCustomMask() } : {}) }
    })))
    root.querySelectorAll<HTMLButtonElement>('[data-image-fade]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'mask' ? { ...packet, maskMode: 'fade', fade: { ...packet.fade, direction: button.dataset.imageFade as typeof packet.fade.direction } } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-image-mask-side]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'mask' ? { ...packet, maskMode: 'custom', customMask: { ...(packet.customMask ?? defaultImageCustomMask()), horizontal: { ...(packet.customMask ?? defaultImageCustomMask()).horizontal, side: button.dataset.imageMaskSide === 'left' ? 'left' : 'right' } } } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-placement-horizontal]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'placement' ? { ...packet, horizontal: button.dataset.placementHorizontal as typeof packet.horizontal } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-placement-vertical]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'placement' ? { ...packet, vertical: button.dataset.placementVertical as typeof packet.vertical } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-layout-item-size]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'layout-item' ? { ...packet, sizeInParent: button.dataset.layoutItemSize as typeof packet.sizeInParent } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-position-mode]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => {
      if (packet.type !== 'position') return packet
      const mode = button.dataset.positionMode as typeof packet.mode
      const firstAnchor = mode === 'anchored' && !packet.anchorSelector ? this.positionAnchorChoices()[0] : undefined
      return { ...packet, mode, top: mode === 'sticky' && packet.top === undefined ? 0 : packet.top, anchorSelector: firstAnchor?.selector ?? packet.anchorSelector, anchorLabel: firstAnchor?.label ?? packet.anchorLabel }
    })))
    root.querySelectorAll<HTMLButtonElement>('[data-position-flow-align]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'position' ? { ...packet, flowAlign: button.dataset.positionFlowAlign === 'center' ? 'center' : 'native' } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-position-layer]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'position' ? { ...packet, layer: button.dataset.positionLayer as typeof packet.layer, zIndex: button.dataset.positionLayer === 'custom' ? (packet.zIndex ?? 1) : packet.zIndex } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-transform-rotate]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'transform' ? { ...packet, rotate: Number(button.dataset.transformRotate) || 0 } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-transform-reset]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.dataset.transformReset, (packet) => packet.type === 'transform' ? { ...packet, rotate: 0, scaleLinked: true, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-shadow-trick]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId, (packet) => packet.type === 'shadow' ? { ...packet, inset: button.dataset.shadowTrick === 'press' } : packet)))
    root.querySelectorAll<HTMLElement>('[data-offset-pad]').forEach((pad) => {
      const packetId = pad.dataset.packetId
      const article = pad.closest<HTMLElement>('[data-packet-id]')
      const xInput = article?.querySelector<HTMLInputElement>('[data-packet-field="position-nudge-x"]')
      const yInput = article?.querySelector<HTMLInputElement>('[data-packet-field="position-nudge-y"]')
      let nextX = Number(xInput?.value) || 0
      let nextY = Number(yInput?.value) || 0
      const move = (event: PointerEvent) => {
        const rect = pad.getBoundingClientRect()
        nextX = Math.round(Math.max(-200, Math.min(200, ((event.clientX - rect.left) / Math.max(1, rect.width) - .5) * 400)))
        nextY = Math.round(Math.max(-200, Math.min(200, ((event.clientY - rect.top) / Math.max(1, rect.height) - .5) * 400)))
        pad.style.setProperty('--ts-offset-left', `${50 + nextX / 4}%`)
        pad.style.setProperty('--ts-offset-top', `${50 + nextY / 4}%`)
        if (xInput) xInput.value = String(nextX)
        if (yInput) yInput.value = String(nextY)
        this.previewPacketMutation(packetId, (packet) => packet.type === 'position' ? { ...packet, nudgeX: nextX, nudgeY: nextY } : packet)
      }
      pad.addEventListener('pointerdown', (event) => { pad.setPointerCapture(event.pointerId); move(event) })
      pad.addEventListener('pointermove', (event) => { if (pad.hasPointerCapture(event.pointerId)) move(event) })
      pad.addEventListener('pointerup', (event) => {
        if (pad.hasPointerCapture(event.pointerId)) pad.releasePointerCapture(event.pointerId)
        this.preview.clearTransient()
        this.updatePacket(packetId, (packet) => packet.type === 'position' ? { ...packet, nudgeX: nextX, nudgeY: nextY } : packet)
      })
      pad.addEventListener('pointercancel', () => { this.preview.clearTransient(); this.render() })
    })
    root.querySelectorAll<HTMLButtonElement>('[data-offset-reset]').forEach((button) => button.addEventListener('click', () => this.updatePacket(button.dataset.offsetReset, (packet) => packet.type === 'position' ? { ...packet, nudgeX: 0, nudgeY: 0 } : packet)))
    root.querySelectorAll<HTMLButtonElement>('[data-recent-color]').forEach((button) => button.addEventListener('click', () => {
      const color = button.dataset.recentColor, field = button.dataset.recentField, article = button.closest<HTMLElement>('[data-packet-id]')
      if (!color || !field || !article) return
      const peer = article.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-packet-field="${escapeCssIdentifier(field)}"]`)
      if (!peer) return
      peer.value = color; this.rememberColor(color); this.handlePacketField(peer)
    }))
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-packet-field]').forEach((input) => {
      const range = input.tagName === 'INPUT' && (input as HTMLInputElement).type === 'range'
      if (!range) input.addEventListener('change', () => {
        if (input.dataset.packetField === 'background-image-path') { void this.commitBackgroundAssetField(input); return }
        if (/^#[0-9a-f]{6}$/i.test(input.value)) this.rememberColor(input.value)
        this.preview.clearTransient(); this.handlePacketField(input)
      })
      if (range) {
        input.addEventListener('input', () => {
          const field = input.dataset.packetField ?? ''
          input.closest('[data-packet-id]')?.querySelectorAll<HTMLInputElement>(`[data-packet-field="${escapeCssIdentifier(field)}"]`).forEach((peer) => { if (peer !== input) peer.value = input.value })
          input.closest('[data-packet-id]')?.querySelectorAll<HTMLElement>(`[data-range-display="${escapeCssIdentifier(field)}"]`).forEach((display) => { display.textContent = `${input.value}${display.dataset.rangeUnit ?? ''}` })
          this.previewPacketField(input)
        })
        input.addEventListener('change', () => { this.preview.clearTransient(); this.handlePacketField(input) })
        input.addEventListener('pointercancel', () => { this.preview.clearTransient(); this.render() })
        input.addEventListener('keydown', (event) => { const keyboardEvent = event as KeyboardEvent; if (keyboardEvent.key === 'Escape') { keyboardEvent.preventDefault(); this.preview.clearTransient(); this.render() } })
      }
    })
    root.querySelectorAll<HTMLButtonElement>('[data-resource]').forEach((button) => button.addEventListener('click', () => { this.resource = button.dataset.resource as ResourceTab; this.render() }))
    this.bindSearch('components'); this.bindSearch('variables')
    root.querySelectorAll<HTMLButtonElement>('[data-component-id]').forEach((button) => button.addEventListener('click', () => { const component = this.components.find((entry) => entry.id === button.dataset.componentId); if (component) { this.clearPreviewMarker(); this.observedRead = null; this.targetSurface = 'element'; this.selection = resolveCatalogComponent(component); this.packetMenuOpen = false; this.editingState = 'normal'; this.render() } }))
    root.querySelector('[data-action="refresh-assets"]')?.addEventListener('click', () => void this.refreshAssets())
    const assetInput = root.querySelector<HTMLInputElement>('[data-native-asset-file]')
    root.querySelector('[data-action="upload-asset"]')?.addEventListener('click', () => assetInput?.click())
    root.querySelector('[data-action="open-native-assets"]')?.addEventListener('click', () => { if (this.capabilities.openNativeEditor) this.ctx.theme.openEditor({ target: 'assets' }) })
    assetInput?.addEventListener('change', () => { const files = assetInput.files ? [...assetInput.files] : []; if (files.length) void this.uploadNativeAssets(files); assetInput.value = '' })
    root.querySelectorAll<HTMLButtonElement>('[data-native-delete]').forEach((button) => button.addEventListener('click', () => void this.deleteNativeAsset(button.dataset.nativeDelete ?? '')))
    root.querySelectorAll<HTMLButtonElement>('[data-native-optimize]').forEach((button) => button.addEventListener('click', () => void this.optimizeNativeAsset(button.dataset.nativeOptimize ?? '')))
    root.querySelector('[data-action="smart-invert"]')?.addEventListener('click', () => this.smartInvertTarget())
    root.querySelector('[data-action="register-font"]')?.addEventListener('click', () => { const family = root.querySelector<HTMLInputElement>('[data-font-family]')?.value.trim(); const path = root.querySelector<HTMLSelectElement>('[data-font-asset]')?.value; if (family && path) this.store.registerFont({ family, source: { type: 'theme-asset', path }, weight: 400, style: 'normal', display: 'swap' }) })
    root.querySelectorAll<HTMLButtonElement>('[data-remove-font]').forEach((button) => button.addEventListener('click', () => this.store.removeFont(button.dataset.removeFont ?? '')))
  }

  private previewPacketField(input: HTMLInputElement | HTMLSelectElement): void {
    const article = input.closest<HTMLElement>('[data-override-id][data-packet-id]')
    const overrideId = article?.dataset.overrideId
    const packetId = article?.dataset.packetId
    if (!overrideId || !packetId) return
    if (overrideId.startsWith('group-style:')) {
      const group = this.activeLayoutGroup()
      const source = group ? this.groupStylePackets(group).packets.find((packet) => packet.id === packetId) : undefined
      if (!group || !source) return
      const updated = this.packetFromField(structuredClone(source), input)
      const draft = structuredClone(group)
      const base = draft.styles?.base ?? emptyLayoutGroupStyleBucket()
      const mobile = draft.styles?.mobile ?? emptyLayoutGroupStyleBucket()
      let authored = this.editingScope === 'base' ? structuredClone(base) : structuredClone(mobile)
      const current = this.groupBucketList(authored)
      authored = this.assignGroupBucketList(authored, [...current.filter((packet) => packet.type !== updated.type), updated])
      draft.styles = this.editingScope === 'base' ? { ...(draft.styles ?? { base }), base: authored } : { ...(draft.styles ?? { base }), base, mobile: authored }
      this.preview.updateTransient(compileLayoutGroup(draft))
      requestAnimationFrame(() => this.syncSelectionHighlight())
      return
    }
    const canonical = this.store.activeProject.componentOverrides.find((override) => override.id === overrideId)
    let draft: ComponentOverride | null = canonical ? structuredClone(canonical) : null
    if (!draft) {
      const observed = this.observedForCurrent()
      const sourcePacket = observed?.packets.find((packet) => packet.id === packetId)
      if (!observed || !sourcePacket) return
      const observedPackets = [{ ...structuredClone(sourcePacket), editedFields: [] } as StylePacket]
      draft = {
        id: `observed-preview:${observed.key}`,
        target: { ...observed.target, overrideStrength: 'strong' },
        states: this.editingScope === 'base' ? { normal: observedPackets } : { normal: [] },
        ...(this.editingScope === 'mobile' ? { mobileStates: { normal: observedPackets } } : {}),
      }
    }
    const draftStacks = responsiveStacksFor(draft, this.editingScope)
    const packets = draftStacks[this.editingState] ?? draftStacks.normal ?? []
    const index = packets.findIndex((packet) => packet.id === packetId)
    if (index < 0) return
    const observedPacket = this.observedForCurrent()?.packets.find((entry) => entry.type === packets[index].type)
    const before = structuredClone(hydrateSparsePacket(packets[index], observedPacket))
    const updated = this.packetFromField(structuredClone(before), input)
    const changed = packetDiffFields(before, updated)
    if (canonical && shouldLocalizeMatchedMessageOverride(this.selection, canonical, this.targetSurface)) {
      const localPacket = { ...updated, editedFields: changed } as StylePacket
      draft = { id: `localized-preview:${canonical.id}`, target: { ...this.targetForSelection(), overrideStrength: 'strong' }, states: this.editingScope === 'base' ? { normal: [], [this.editingState]: [localPacket] } : { normal: [] }, ...(this.editingScope === 'mobile' ? { mobileStates: { normal: [], [this.editingState]: [localPacket] } } : {}) }
    } else {
      packets[index] = mergeEditedFields(updated, changed)
      if (this.editingScope === 'mobile') draft.mobileStates = { ...(draft.mobileStates ?? { normal: [] }), [this.editingState]: packets }
      else draft.states = { ...draft.states, [this.editingState]: packets }
    }
    const previewOptions = this.editingState === 'normal' ? { forcedScope: this.editingScope } : { forcedOverrideId: draft.id, forcedState: this.editingState, forcedScope: this.editingScope }
    // This layer contains only the target currently being scrubbed. Boost remains
    // a separate persistent world-state layer and observed Read Style values stay
    // source-only until a control is actually changed.
    const previewTargetSelector = draft.target.overrideStrength === 'strong' ? authoritySelector(draft.target.selector) : draft.target.selector
    const noTransition = `${previewTargetSelector} { transition: none !important; }`
    this.preview.updateTransient(`${noTransition}
${compileComponentOverride(draft, previewOptions)}`)
    requestAnimationFrame(() => this.syncSelectionHighlight())
  }

  private previewPacketMutation(packetId: string | undefined, updater: (packet: StylePacket) => StylePacket): void {
    if (!packetId || !this.selection) return
    const canonical = matchingOverridesForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface).find((entry) => (responsiveStacksFor(entry, this.editingScope)[this.editingState] ?? []).some((packet) => packet.id === packetId)) ?? overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface)
    let draft: ComponentOverride | null = canonical ? structuredClone(canonical) : null
    if (!draft) {
      const observed = this.observedForCurrent()
      const sourcePacket = observed?.packets.find((packet) => packet.id === packetId)
      if (!observed || !sourcePacket) return
      const observedPackets = [{ ...structuredClone(sourcePacket), editedFields: [] } as StylePacket]
      draft = {
        id: `observed-preview:${observed.key}`,
        target: { ...observed.target, overrideStrength: 'strong' },
        states: this.editingScope === 'base' ? { normal: observedPackets } : { normal: [] },
        ...(this.editingScope === 'mobile' ? { mobileStates: { normal: observedPackets } } : {}),
      }
    }
    const stacks = responsiveStacksFor(draft, this.editingScope)
    const packets = stacks[this.editingState] ?? stacks.normal ?? []
    const index = packets.findIndex((packet) => packet.id === packetId)
    if (index < 0) return
    const observedPacket = this.observedForCurrent()?.packets.find((entry) => entry.type === packets[index].type)
    const before = structuredClone(hydrateSparsePacket(packets[index], observedPacket))
    const updated = updater(structuredClone(before))
    const changed = packetDiffFields(before, updated)
    if (canonical && shouldLocalizeMatchedMessageOverride(this.selection, canonical, this.targetSurface)) {
      const localPacket = { ...updated, editedFields: changed } as StylePacket
      draft = { id: `localized-preview:${canonical.id}`, target: { ...this.targetForSelection(), overrideStrength: 'strong' }, states: this.editingScope === 'base' ? { normal: [], [this.editingState]: [localPacket] } : { normal: [] }, ...(this.editingScope === 'mobile' ? { mobileStates: { normal: [], [this.editingState]: [localPacket] } } : {}) }
    } else {
      packets[index] = mergeEditedFields(updated, changed)
      if (this.editingScope === 'mobile') draft.mobileStates = { ...(draft.mobileStates ?? { normal: [] }), [this.editingState]: packets }
      else draft.states = { ...draft.states, [this.editingState]: packets }
    }
    const previewOptions = this.editingState === 'normal' ? { forcedScope: this.editingScope } : { forcedOverrideId: draft.id, forcedState: this.editingState, forcedScope: this.editingScope }
    const previewTargetSelector = draft.target.overrideStrength === 'strong' ? authoritySelector(draft.target.selector) : draft.target.selector
    this.preview.updateTransient(`${previewTargetSelector} { transition: none !important; }\n${compileComponentOverride(draft, previewOptions)}`)
    requestAnimationFrame(() => this.syncSelectionHighlight())
  }

  private packetFromField(packet: StylePacket, input: HTMLInputElement | HTMLSelectElement): StylePacket {
    const field = input.dataset.packetField ?? ''
    const numeric = () => Number.isFinite(Number(input.value)) ? Number(input.value) : 0
    const optionalNumeric = () => input.value.trim() === '' || !Number.isFinite(Number(input.value)) ? undefined : Number(input.value)
    const alpha = () => Math.max(0, Math.min(1, numeric() / 100))
      if (packet.type === 'background') {
        if (field === 'background-solid') return { ...packet, solid: { ...packet.solid, color: input.value } }
        if (field === 'background-solid-alpha') return { ...packet, solid: { ...packet.solid, alpha: alpha() } }
        if (field === 'gradient-angle') return { ...packet, gradient: { ...packet.gradient, angle: Math.max(0, Math.min(359, numeric())) } }
        const stopMatch = field.match(/^gradient-(stop|position)-(\d+)(-alpha)?$/)
        if (stopMatch) { const index = Number(stopMatch[2]); const stops = packet.gradient.stops.map((stop, i) => i !== index ? stop : stopMatch[1] === 'position' ? { ...stop, position: Math.max(0, Math.min(100, numeric())) } : stopMatch[3] ? { ...stop, alpha: alpha() } : { ...stop, color: input.value }); return { ...packet, gradient: { ...packet.gradient, stops } } }
        if (field === 'background-image-path') return { ...packet, image: { ...packet.image, assetPath: input.value } }
        if (field === 'background-mask-color') return { ...packet, image: { ...packet.image, maskColor: input.value } }
        if (field === 'background-mask-color-alpha') return { ...packet, image: { ...packet.image, maskAlpha: alpha() } }
        if (field === 'background-mask-hide-contents') return { ...packet, image: { ...packet.image, hideContents: (input as HTMLInputElement).checked } }
        if (field === 'background-image-size') return { ...packet, image: { ...packet.image, size: input.value as typeof packet.image.size } }
        if (field === 'background-image-x') return { ...packet, image: { ...packet.image, positionX: Math.max(0, Math.min(100, numeric())) } }
        if (field === 'background-image-y') return { ...packet, image: { ...packet.image, positionY: Math.max(0, Math.min(100, numeric())) } }
      }
      if (packet.type === 'pattern') {
        if (field === 'pattern-color') return { ...packet, color: input.value }
        if (field === 'pattern-color-alpha') return { ...packet, alpha: alpha() }
        if (field === 'pattern-scale') return { ...packet, scale: Math.max(4, Math.min(240, numeric())) }
        if (field === 'pattern-angle') return { ...packet, angle: Math.max(0, Math.min(360, numeric())) }
      }
      if (packet.type === 'composer-icons') {
        if (field === 'composer-icons-size') return { ...packet, size: Math.max(8, Math.min(32, numeric())) }
      }
      if (packet.type === 'svg-asset') {
        if (field === 'svg-asset-color') return { ...packet, color: input.value }
        if (field === 'svg-asset-color-alpha') return { ...packet, alpha: alpha() }
        if (field === 'svg-asset-opacity') return { ...packet, alpha: Math.max(0, Math.min(1, numeric() / 100)) }
        if (field === 'svg-asset-x') return { ...packet, positionX: Math.max(0, Math.min(100, numeric())) }
        if (field === 'svg-asset-y') return { ...packet, positionY: Math.max(0, Math.min(100, numeric())) }
        if (field === 'svg-asset-size') return { ...packet, size: Math.max(4, Math.min(512, numeric())) }
        if (field === 'svg-asset-rotate') return { ...packet, rotate: Math.max(-3600, Math.min(3600, numeric())) }
      }
      if (packet.type === 'media-flow') {
        if (field === 'media-flow-mode') return { ...packet, mode: input.value === 'full' ? 'full' : input.value === 'natural' ? 'natural' : 'native' }
        if (field === 'media-flow-unclipped') return { ...packet, unclipped: (input as HTMLInputElement).checked }
      }
      if (packet.type === 'image') {
        if (field === 'image-brightness') return { ...packet, brightness: Math.max(0, Math.min(2.5, numeric() / 100)) }
        if (field === 'image-saturation') return { ...packet, saturation: Math.max(0, Math.min(3, numeric() / 100)) }
        if (field === 'image-contrast') return { ...packet, contrast: Math.max(0, Math.min(2.5, numeric() / 100)) }
        if (field === 'image-grayscale') return { ...packet, grayscale: Math.max(0, Math.min(1, numeric() / 100)) }
        if (field === 'image-hue') return { ...packet, hueRotate: Math.max(-180, Math.min(180, numeric())) }
        if (field === 'image-blur') return { ...packet, blur: Math.max(0, Math.min(30, numeric())) }
        if (field === 'image-position-x') return { ...packet, objectPositionX: Math.max(0, Math.min(100, numeric())) }
        if (field === 'image-position-y') return { ...packet, objectPositionY: Math.max(0, Math.min(100, numeric())) }
        if (field === 'image-fill-frame') return { ...packet, fillFrame: (input as HTMLInputElement).checked }
      }
      if (packet.type === 'mask') {
        if (field === 'image-fade-amount') return { ...packet, maskMode: 'fade', fade: { ...packet.fade, amount: Math.max(1, Math.min(90, numeric())) } }
        const custom = packet.customMask ?? defaultImageCustomMask()
        if (field === 'image-mask-horizontal-enabled') return { ...packet, maskMode: 'custom', customMask: { ...custom, horizontal: { ...custom.horizontal, enabled: (input as HTMLInputElement).checked } } }
        if (field === 'image-mask-top-enabled') return { ...packet, maskMode: 'custom', customMask: { ...custom, top: { ...custom.top, enabled: (input as HTMLInputElement).checked } } }
        if (field === 'image-mask-bottom-enabled') return { ...packet, maskMode: 'custom', customMask: { ...custom, bottom: { ...custom.bottom, enabled: (input as HTMLInputElement).checked } } }
        if (field === 'image-mask-horizontal-solid') { const solidUntil = Math.max(0, Math.min(99, numeric())); return { ...packet, maskMode: 'custom', customMask: { ...custom, horizontal: { ...custom.horizontal, solidUntil, fadeUntil: Math.max(custom.horizontal.fadeUntil, solidUntil + 1) } } } }
        if (field === 'image-mask-horizontal-fade') { const fadeUntil = Math.max(1, Math.min(100, numeric())); return { ...packet, maskMode: 'custom', customMask: { ...custom, horizontal: { ...custom.horizontal, fadeUntil, solidUntil: Math.min(custom.horizontal.solidUntil, fadeUntil - 1) } } } }
        if (field === 'image-mask-top-solid') { const solidUntil = Math.max(0, Math.min(99, numeric())); return { ...packet, maskMode: 'custom', customMask: { ...custom, top: { ...custom.top, solidUntil, fadeUntil: Math.max(custom.top.fadeUntil, solidUntil + 1) } } } }
        if (field === 'image-mask-top-fade') { const fadeUntil = Math.max(1, Math.min(100, numeric())); return { ...packet, maskMode: 'custom', customMask: { ...custom, top: { ...custom.top, fadeUntil, solidUntil: Math.min(custom.top.solidUntil, fadeUntil - 1) } } } }
        if (field === 'image-mask-bottom-solid') { const solidUntil = Math.max(0, Math.min(99, numeric())); return { ...packet, maskMode: 'custom', customMask: { ...custom, bottom: { ...custom.bottom, solidUntil, fadeUntil: Math.max(custom.bottom.fadeUntil, solidUntil + 1) } } } }
        if (field === 'image-mask-bottom-fade') { const fadeUntil = Math.max(1, Math.min(100, numeric())); return { ...packet, maskMode: 'custom', customMask: { ...custom, bottom: { ...custom.bottom, fadeUntil, solidUntil: Math.min(custom.bottom.solidUntil, fadeUntil - 1) } } } }
        if (field === 'image-mask-combine') return { ...packet, maskMode: 'custom', customMask: { ...custom, combine: input.value === 'add' || input.value === 'subtract' || input.value === 'exclude' ? input.value : 'intersect' } }
      }
      if (packet.type === 'content' && field === 'content-value') return { ...packet, value: input.value.slice(0, 4000) }
      if (packet.type === 'text') {
        if (field === 'text-color') return { ...packet, solid: { ...packet.solid, color: input.value } }
        if (field === 'text-color-alpha') return { ...packet, solid: { ...packet.solid, alpha: alpha() } }
        if (field === 'text-gradient-angle') return { ...packet, gradient: { ...packet.gradient, angle: Math.max(0, Math.min(359, numeric())) } }
        const stopMatch = field.match(/^text-gradient-(stop|position)-(\d+)(-alpha)?$/)
        if (stopMatch) { const index = Number(stopMatch[2]); const stops = packet.gradient.stops.map((stop, i) => i !== index ? stop : stopMatch[1] === 'position' ? { ...stop, position: Math.max(0, Math.min(100, numeric())) } : stopMatch[3] ? { ...stop, alpha: alpha() } : { ...stop, color: input.value }); return { ...packet, gradient: { ...packet.gradient, stops } } }
        if (field === 'text-stroke-width') return { ...packet, strokeWidth: Math.max(0, Math.min(100, numeric())) }
        if (field === 'text-stroke') return { ...packet, strokeColor: input.value }
        if (field === 'text-stroke-alpha') return { ...packet, strokeAlpha: alpha() }
        if (field === 'text-glow-strength') {
          const blur = Math.max(0, Math.min(80, numeric()))
          if (blur <= 0) return { ...packet, shadow: packet.shadow && Math.abs(packet.shadow.x) < .001 && Math.abs(packet.shadow.y) < .001 ? undefined : packet.shadow }
          const glowColor = packet.colorMode === 'solid' ? packet.solid.color : (packet.gradient.stops[0]?.color ?? '#ffffff')
          return { ...packet, shadow: { x: 0, y: 0, blur, color: glowColor, alpha: .68 } }
        }
        if (field === 'text-shadow-enabled') return { ...packet, shadow: (input as HTMLInputElement).checked ? (packet.shadow ?? { x: 0, y: 2, blur: 8, color: '#000000', alpha: 0.35 }) : undefined }
        if (field === 'text-shadow-x') return { ...packet, shadow: { ...(packet.shadow ?? { x: 0, y: 2, blur: 8, color: '#000000', alpha: 0.35 }), x: numeric() } }
        if (field === 'text-shadow-y') return { ...packet, shadow: { ...(packet.shadow ?? { x: 0, y: 2, blur: 8, color: '#000000', alpha: 0.35 }), y: numeric() } }
        if (field === 'text-shadow-blur') return { ...packet, shadow: { ...(packet.shadow ?? { x: 0, y: 2, blur: 8, color: '#000000', alpha: 0.35 }), blur: Math.max(0, Math.min(100, numeric())) } }
        if (field === 'text-shadow-color') return { ...packet, shadow: { ...(packet.shadow ?? { x: 0, y: 2, blur: 8, color: '#000000', alpha: 0.35 }), color: input.value } }
        if (field === 'text-shadow-color-alpha') return { ...packet, shadow: { ...(packet.shadow ?? { x: 0, y: 2, blur: 8, color: '#000000', alpha: 0.35 }), alpha: alpha() } }
      }
      if (packet.type === 'typography') {
        if (field === 'typography-family') return { ...packet, fontFamily: input.value.trim() || undefined }
        if (field === 'typography-size') return { ...packet, fontSize: Math.max(0.01, Math.min(10000, numeric())) }
        if (field === 'typography-size-unit') return { ...packet, fontSizeUnit: input.value === 'rem' ? 'rem' : 'px' }
        if (field === 'typography-weight') return { ...packet, fontWeight: Math.max(100, Math.min(900, numeric())) }
        if (field === 'typography-style') return { ...packet, fontStyle: input.value === 'italic' ? 'italic' : 'normal' }
        if (field === 'typography-line-height') return { ...packet, lineHeight: Math.max(0.1, Math.min(20, numeric() / 100)) }
        if (field === 'typography-letter-spacing') return { ...packet, letterSpacing: Math.max(-1000, Math.min(1000, numeric())) }
        if (field === 'typography-transform') return { ...packet, transform: input.value as typeof packet.transform }
      }
      if (packet.type === 'text-entry') {
        if (field === 'text-entry-inset-x') return { ...packet, insetX: Math.max(0, Math.min(500, numeric())) }
        if (field === 'text-entry-inset-y') return { ...packet, insetY: Math.max(0, Math.min(500, numeric())) }
        if (field === 'text-entry-family') return { ...packet, fontFamily: input.value.trim() || undefined }
        if (field === 'text-entry-size') return { ...packet, fontSize: Math.max(0.01, Math.min(10000, numeric())) }
        if (field === 'text-entry-size-unit') return { ...packet, fontSizeUnit: input.value === 'rem' ? 'rem' : 'px' }
        if (field === 'text-entry-weight') return { ...packet, fontWeight: Math.max(100, Math.min(900, numeric())) }
        if (field === 'text-entry-style') return { ...packet, fontStyle: input.value === 'italic' ? 'italic' : 'normal' }
        if (field === 'text-entry-line-height') return { ...packet, lineHeight: Math.max(0.1, Math.min(20, numeric() / 100)) }
        if (field === 'text-entry-letter-spacing') return { ...packet, letterSpacing: Math.max(-1000, Math.min(1000, numeric())) }
        if (field === 'text-entry-placeholder-color') return { ...packet, placeholderColor: input.value }
        if (field === 'text-entry-placeholder-color-alpha') return { ...packet, placeholderAlpha: alpha() }
        if (field === 'text-entry-placeholder-style') return { ...packet, placeholderStyle: input.value === 'italic' ? 'italic' : 'normal' }
        if (field === 'text-entry-placeholder-weight') return { ...packet, placeholderWeight: Math.max(100, Math.min(900, numeric())) }
      }
      if (packet.type === 'visibility' && field === 'visibility-mode') return { ...packet, mode: input.value as typeof packet.mode }
      if (packet.type === 'border') {
        if (field === 'border-width') return { ...packet, width: Math.max(0, Math.min(20, numeric())) }
        if (field === 'border-style') return { ...packet, style: input.value as typeof packet.style }
        if (field === 'border-color') return { ...packet, color: input.value, alpha: packet.alpha <= .001 ? 1 : packet.alpha }
        if (field === 'border-color-alpha') return { ...packet, alpha: alpha() }
      }
      if (packet.type === 'corners') {
        if (field === 'corners-linked') return { ...packet, linked: (input as HTMLInputElement).checked }
        if (field === 'corners-all') { const value = Math.max(0, Math.min(9999, numeric())); return { ...packet, topLeft: value, topRight: value, bottomRight: value, bottomLeft: value } }
        const key = field.replace('corners-', '') as 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'; if (key in packet) return { ...packet, [key]: Math.max(0, Math.min(9999, numeric())) }
      }
      if (packet.type === 'spacing') {
        const box = (value: number) => ({ linked: true as const, top: value, right: value, bottom: value, left: value, unit: 'px' as const })
        if (field === 'spacing-padding') return { ...packet, padding: box(Math.max(0, Math.min(500, numeric()))) }
        if (field === 'spacing-margin') return { ...packet, margin: box(Math.max(-500, Math.min(500, numeric()))) }
        const paddingSide = field.match(/^spacing-padding-(top|right|bottom|left)$/)?.[1] as 'top' | 'right' | 'bottom' | 'left' | undefined
        if (paddingSide) { const current = packet.padding ?? box(0); return { ...packet, padding: { ...current, linked: false, [paddingSide]: Math.max(0, Math.min(500, numeric())) } } }
        const marginSide = field.match(/^spacing-margin-(top|right|bottom|left)$/)?.[1] as 'top' | 'right' | 'bottom' | 'left' | undefined
        if (marginSide) { const current = packet.margin ?? box(0); return { ...packet, margin: { ...current, linked: false, [marginSide]: Math.max(-500, Math.min(500, numeric())) } } }
        if (field === 'spacing-gap') return { ...packet, gap: Math.max(0, Math.min(500, numeric())) }
      }
      if (packet.type === 'shadow') {
        if (field === 'shadow-magic-strength') {
          const strength = Math.max(0, Math.min(100, numeric()))
          if (strength <= 0) return { ...packet, x: 0, y: 0, blur: 0, spread: 0, alpha: 0 }
          const ratio = strength / 100
          return { ...packet, x: 0, y: packet.inset ? Math.round(2 + ratio * 5) : Math.round(2 + ratio * 12), blur: Math.round(4 + ratio * 42), spread: packet.inset ? -Math.round(ratio * 7) : Math.round(ratio * 2), alpha: .08 + ratio * .30 }
        }
        if (field === 'shadow-x') return { ...packet, x: numeric() }
        if (field === 'shadow-y') return { ...packet, y: numeric() }
        if (field === 'shadow-blur') return { ...packet, blur: Math.max(0, Math.min(100, numeric())) }
        if (field === 'shadow-spread') return { ...packet, spread: numeric() }
        if (field === 'shadow-color') return { ...packet, color: input.value }
        if (field === 'shadow-color-alpha') return { ...packet, alpha: alpha() }
        if (field === 'shadow-inset') return { ...packet, inset: (input as HTMLInputElement).checked }
      }
      if (packet.type === 'glass') {
        if (field === 'glass-frost-strength') {
          const strength = Math.max(0, Math.min(100, numeric()))
          const ratio = strength / 100
          return { ...packet, blur: Math.round(ratio * 42), saturation: 1 + ratio * .7, borderWidth: strength > 0 ? Math.max(1, packet.borderWidth ?? 1) : 0, borderAlpha: strength > 0 ? .06 + ratio * .16 : 0, shadowStrength: ratio * .28, innerHighlight: ratio * .16 }
        }
        if (field === 'glass-tint-enabled') return { ...packet, tintColor: (input as HTMLInputElement).checked ? '#5f4b8b' : undefined, tintAlpha: (input as HTMLInputElement).checked ? (packet.tintAlpha ?? 0.12) : undefined }
        if (field === 'glass-tint') return { ...packet, tintColor: input.value }
        if (field === 'glass-tint-alpha') return { ...packet, tintAlpha: alpha() }
        if (field === 'glass-blur') return { ...packet, blur: Math.max(0, Math.min(100, numeric())) }
        if (field === 'glass-saturation') return { ...packet, saturation: Math.max(0, Math.min(3, numeric() / 100)) }
        if (field === 'glass-border') return { ...packet, borderColor: input.value }
        if (field === 'glass-border-alpha') return { ...packet, borderAlpha: alpha() }
        if (field === 'glass-border-width') return { ...packet, borderWidth: Math.max(0, Math.min(20, numeric())) }
        if (field === 'glass-depth') return { ...packet, shadowStrength: alpha() }
        if (field === 'glass-highlight') return { ...packet, innerHighlight: alpha() }
      }
      if (packet.type === 'opacity' && field === 'element-opacity') return { ...packet, value: alpha() }
      if (packet.type === 'position') {
        if (field === 'position-unit') return { ...packet, unit: input.value as typeof packet.unit }
        if (field === 'position-z') return { ...packet, zIndex: Math.max(-2147483648, Math.min(2147483647, Math.round(numeric()))) }
        if (field === 'position-anchor') { const anchor = this.positionAnchorChoices().find((choice) => choice.selector === input.value); return { ...packet, anchorSelector: anchor?.selector, anchorLabel: anchor?.label } }
        if (field === 'position-nudge-x') return { ...packet, nudgeX: Math.max(-100000, Math.min(100000, numeric())) }
        if (field === 'position-nudge-y') return { ...packet, nudgeY: Math.max(-100000, Math.min(100000, numeric())) }
        const side = field.match(/^position-(top|right|bottom|left)$/)?.[1] as 'top' | 'right' | 'bottom' | 'left' | undefined
        if (side) return { ...packet, [side]: optionalNumeric() }
      }
      if (packet.type === 'transform') {
        if (field === 'transform-rotate') return { ...packet, rotate: Math.max(-3600, Math.min(3600, numeric())) }
        if (field === 'transform-scale-linked') { const linked = (input as HTMLInputElement).checked; return { ...packet, scaleLinked: linked, scaleY: linked ? packet.scaleX : packet.scaleY } }
        if (field === 'transform-scale-x') { const scale = Math.max(.01, Math.min(20, numeric() / 100)); return { ...packet, scaleX: scale, scaleY: packet.scaleLinked ? scale : packet.scaleY } }
        if (field === 'transform-scale-y') return { ...packet, scaleY: Math.max(.01, Math.min(20, numeric() / 100)) }
        if (field === 'transform-skew-x') return { ...packet, skewX: Math.max(-89, Math.min(89, numeric())) }
        if (field === 'transform-skew-y') return { ...packet, skewY: Math.max(-89, Math.min(89, numeric())) }
      }
      if (packet.type === 'alignment') {
        if (field === 'alignment-text') return { ...packet, text: input.value as typeof packet.text }
        if (field === 'alignment-horizontal') return { ...packet, horizontal: input.value as typeof packet.horizontal }
        if (field === 'alignment-vertical') return { ...packet, vertical: input.value as typeof packet.vertical }
      }
      if (packet.type === 'layout') {
        if (field === 'layout-display') return { ...packet, display: input.value as typeof packet.display }
        if (field === 'layout-direction') return { ...packet, direction: input.value as typeof packet.direction }
        if (field === 'layout-wrap') return { ...packet, wrap: input.value as typeof packet.wrap }
        if (field === 'layout-justify') return { ...packet, justify: input.value as typeof packet.justify }
        if (field === 'layout-align') return { ...packet, align: input.value as typeof packet.align }
        if (field.startsWith('layout-gap-')) return { ...packet, gap: this.updateDimension(packet.gap, field.slice('layout-gap-'.length), input.value) }
        if (field === 'layout-grid-mode') return { ...packet, gridColumns: input.value === 'count' ? { mode: 'count', count: 3 } : input.value === 'auto-fit' ? { mode: 'auto-fit', min: { mode: 'fixed', value: 180, unit: 'px' } } : { mode: 'auto' } }
        if (field === 'layout-grid-count') return { ...packet, gridColumns: { mode: 'count', count: Math.max(1, Math.min(24, Math.round(numeric()))) } }
        if (field.startsWith('layout-grid-min-')) return { ...packet, gridColumns: { mode: 'auto-fit', min: this.updateDimension(packet.gridColumns?.mode === 'auto-fit' ? packet.gridColumns.min : undefined, field.slice('layout-grid-min-'.length), input.value) } }
      }
      if (packet.type === 'layout-item') {
        if (field === 'layout-item-size') return { ...packet, sizeInParent: input.value as typeof packet.sizeInParent }
        if (field === 'layout-item-align') return { ...packet, alignSelf: input.value as typeof packet.alignSelf }
        if (field === 'layout-item-order') return { ...packet, order: Math.max(-10000, Math.min(10000, Math.round(numeric()))) }
        if (field.startsWith('layout-item-basis-')) return { ...packet, basis: this.updateDimension(packet.basis, field.slice('layout-item-basis-'.length), input.value) }
      }
      if (packet.type === 'size') {
        if (field === 'size-mobile-safe') return { ...packet, mobileSafe: (input as HTMLInputElement).checked }
        if (field === 'size-boundary') { const boundary = this.boundaryChoices().find((choice) => choice.selector === input.value); return { ...packet, boundary: boundary ? { selector: boundary.selector, label: boundary.label } : undefined } }
        const match = field.match(/^size-(width|height|minWidth|maxWidth|minHeight|maxHeight)-(mode|value|unit)$/)
        if (match) { const key = match[1] as 'width' | 'height' | 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight'; return { ...packet, [key]: this.updateDimension(packet[key], match[2], input.value) } }
      }
      return packet
  }

  private handlePacketField(input: HTMLInputElement | HTMLSelectElement): void {
    const packetId = input.closest<HTMLElement>('[data-packet-id]')?.dataset.packetId
    this.updatePacket(packetId, (packet) => this.packetFromField(packet, input))
  }

  private updateDimension(current: DimensionValue | undefined, part: string, value: string): DimensionValue {
    if (part === 'mode') return value === 'fixed' ? current?.mode === 'fixed' ? current : { mode: 'fixed', value: 100, unit: 'px' } : { mode: value as 'native' | 'content' | 'parent' }
    const fixed = current?.mode === 'fixed' ? current : { mode: 'fixed' as const, value: 100, unit: 'px' as const }
    if (part === 'unit') return { ...fixed, unit: value as typeof fixed.unit }
    const number = Number(value); return { ...fixed, value: Number.isFinite(number) ? Math.max(0, Math.min(100000, number)) : fixed.value }
  }

  private bindSearch(search: 'components' | 'variables'): void {
    this.root.querySelector<HTMLInputElement>(`[data-search="${search}"]`)?.addEventListener('input', (event) => { if (search === 'components') this.componentSearch = (event.currentTarget as HTMLInputElement).value; else this.variableSearch = (event.currentTarget as HTMLInputElement).value; this.renderAndRefocus(search) })
  }
  private bindCode(): void {
    const textarea = this.root.querySelector<HTMLTextAreaElement>('[data-custom-css]'); const status = this.root.querySelector<HTMLElement>('[data-custom-status]')
    textarea?.addEventListener('input', () => { this.suppressRender = true; this.store.setCustomCss(textarea.value); this.previewResult = this.preview.updateCustom(textarea.value); if (status) { status.className = this.previewResult.valid ? 'ts-status-ok' : 'ts-status-error'; status.textContent = this.previewResult.valid ? 'Previewing' : this.previewResult.error ?? 'Invalid CSS' } })
    this.root.querySelector<HTMLButtonElement>('[data-native-action="export"]')?.addEventListener('click', () => void this.exportNativeTheme())
    this.root.querySelector<HTMLButtonElement>('[data-native-action="install"]')?.addEventListener('click', () => void this.installNativeTheme())
    this.root.querySelector<HTMLButtonElement>('[data-native-action="editor"]')?.addEventListener('click', () => { if (!this.capabilities.openNativeEditor) return; const opened = this.ctx.theme.openEditor({ target: 'global' }); this.nativeActionStatus = opened ? 'Opened Lumiverse Theme Editor.' : 'Lumiverse could not open the Theme Editor target.'; this.render() })
    const fileInput = this.root.querySelector<HTMLInputElement>('[data-native-theme-file]')
    this.root.querySelector<HTMLButtonElement>('[data-native-action="import"]')?.addEventListener('click', () => fileInput?.click())
    fileInput?.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) void this.importNativeThemeFile(file); fileInput.value = '' })
  }
  private bindThemes(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-action="save-style-target"]').forEach((button) => button.addEventListener('click', () => this.saveCurrentStyle('target')))
    this.root.querySelectorAll<HTMLButtonElement>('[data-action="save-style-component"]').forEach((button) => button.addEventListener('click', () => this.saveCurrentStyle('component')))
    this.root.querySelectorAll<HTMLButtonElement>('[data-action="open-style-library"]').forEach((button) => button.addEventListener('click', () => { const component = this.selection?.nativeContext?.component.label; this.styleLibraryLayout = component === 'MinimalMessage' ? 'minimal' : component === 'BubbleMessage' || component === 'MessageContent' ? 'bubble' : 'all'; this.openStyleLibrary() }))
    this.root.querySelector<HTMLSelectElement>('[data-quick-look-source]')?.addEventListener('change', (event) => {
      const value = (event.currentTarget as HTMLSelectElement).value
      this.quickLookSource = value === 'current' || packForId(value) ? value : 'current'
      this.quickLookPage = 0
      if (this.quickLookSource !== 'current') this.adoptPackPalette(this.quickLookSource)
      this.render()
    })
    const quickLookCarousel = this.root.querySelector<HTMLElement>('[data-quick-look-carousel]')
    const quickLookPages = quickLookCarousel ? [...quickLookCarousel.querySelectorAll<HTMLElement>('[data-quick-look-page-index]')] : []
    const updateQuickLookPage = (index: number) => {
      this.quickLookPage = Math.max(0, Math.min(quickLookPages.length - 1, index))
      this.root.querySelectorAll<HTMLButtonElement>('[data-quick-look-page]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.quickLookPage) === this.quickLookPage)))
    }
    if (quickLookCarousel) {
      let quickLookScrollFrame = 0
      quickLookCarousel.addEventListener('scroll', () => {
        if (quickLookScrollFrame || typeof requestAnimationFrame === 'undefined') return
        quickLookScrollFrame = requestAnimationFrame(() => {
          quickLookScrollFrame = 0
          const pageWidth = Math.max(1, quickLookCarousel.clientWidth)
          updateQuickLookPage(Math.round(quickLookCarousel.scrollLeft / pageWidth))
        })
      }, { passive: true })
      if (this.quickLookPage > 0 && typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => { quickLookCarousel.scrollLeft = quickLookPages[this.quickLookPage]?.offsetLeft ?? 0 })
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-quick-look-page]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.quickLookPage)
      const page = quickLookPages[index]
      if (!page || !quickLookCarousel) return
      updateQuickLookPage(index)
      quickLookCarousel.scrollTo({ left: page.offsetLeft, behavior: 'smooth' })
    }))
    this.root.querySelectorAll<HTMLButtonElement>('[data-apply-common-preset]').forEach((button) => button.addEventListener('click', () => this.applyCommonPreset(button.dataset.applyCommonPreset ?? '', false)))
    this.root.querySelectorAll<HTMLButtonElement>('[data-edit-common-preset]').forEach((button) => button.addEventListener('click', () => this.applyCommonPreset(button.dataset.editCommonPreset ?? '', true)))
    this.root.querySelectorAll<HTMLButtonElement>('[data-reset-common-preset]').forEach((button) => button.addEventListener('click', () => this.resetCommonPreset(button.dataset.resetCommonPreset ?? '')))
    const setQuickColor = (key: 'accent' | 'text', value: string) => {
      if (!/^#[0-9a-f]{6}$/i.test(value)) return
      if (key === 'accent') this.quickAccent = value.toLowerCase(); else this.quickText = value.toLowerCase()
      const library = this.root.querySelector<HTMLElement>('.ts-preset-library')
      library?.style.setProperty(key === 'accent' ? '--ts-quick-accent' : '--ts-quick-text', value)
      this.root.querySelectorAll<HTMLInputElement>(`[data-quick-color="${key}"]`).forEach((peer) => { if (peer.value !== value) peer.value = value })
    }
    this.root.querySelectorAll<HTMLInputElement>('[data-quick-color]').forEach((input) => {
      input.addEventListener('input', () => { if (input.type === 'color') setQuickColor(input.dataset.quickColor as 'accent' | 'text', input.value) })
      input.addEventListener('change', () => setQuickColor(input.dataset.quickColor as 'accent' | 'text', input.value))
    })
    this.root.querySelectorAll<HTMLButtonElement>('[data-quick-recent]').forEach((button) => button.addEventListener('click', () => { const color = button.dataset.quickRecent; if (color) setQuickColor('accent', color) }))
    const quickRange = this.root.querySelector<HTMLInputElement>('[data-quick-intensity]')
    const quickNumber = this.root.querySelector<HTMLInputElement>('[data-quick-intensity-number]')
    const previewQuickIntensity = (raw: string) => {
      const value = Math.max(0, Math.min(100, Number(raw) || 0))
      this.quickIntensity = value
      if (quickRange) quickRange.value = String(value)
      if (quickNumber) quickNumber.value = String(value)
      const label = this.root.querySelector<HTMLElement>('[data-quick-intensity-value]'); if (label) label.textContent = `${Math.round(value)}%`
      this.root.querySelector<HTMLElement>('.ts-preset-library')?.style.setProperty('--ts-quick-intensity', String(value / 100))
    }
    quickRange?.addEventListener('input', () => previewQuickIntensity(quickRange.value))
    quickRange?.addEventListener('change', () => { previewQuickIntensity(quickRange.value); this.render() })
    quickNumber?.addEventListener('change', () => { previewQuickIntensity(quickNumber.value); this.render() })
    this.root.querySelector<HTMLInputElement>('[data-boost-colors-enabled]')?.addEventListener('change', (event) => { this.clearBoostPreview(); this.store.setBoostColorsEnabled((event.currentTarget as HTMLInputElement).checked) })
    this.root.querySelector<HTMLInputElement>('[data-boost-typography-enabled]')?.addEventListener('change', (event) => { this.clearBoostPreview(); this.store.setBoostTypographyEnabled((event.currentTarget as HTMLInputElement).checked) })
    this.root.querySelector<HTMLInputElement>('[data-boost-canvas-enabled]')?.addEventListener('change', (event) => { this.clearBoostPreview(); this.store.setBoostCanvasEnabled((event.currentTarget as HTMLInputElement).checked) })
    this.root.querySelector<HTMLInputElement>('[data-boost-wallpaper-enabled]')?.addEventListener('change', (event) => { this.clearBoostPreview(); this.store.setBoostWallpaperTreatmentEnabled((event.currentTarget as HTMLInputElement).checked) })
    this.root.querySelector<HTMLInputElement>('[data-boost-protect-controls]')?.addEventListener('change', (event) => { this.clearBoostPreview(); this.store.setBoostProtectControls((event.currentTarget as HTMLInputElement).checked) })
    this.bindSettledBoostRange(this.root.querySelector<HTMLInputElement>('[data-boost-canvas-opacity]'), (value) => { const display = this.root.querySelector<HTMLElement>('[data-boost-value="canvas"]'); if (display) display.textContent = `${Math.round(value)}%` }, (value) => this.store.setBoostCanvasOpacity(value / 100))
    const wallpaperFields = {
      opacity: { factor: .01, key: 'wallpaperOpacity' as const, suffix: '%' },
      blur: { factor: 1, key: 'wallpaperBlur' as const, suffix: 'px' },
      saturation: { factor: .01, key: 'wallpaperSaturation' as const, suffix: '%' },
      contrast: { factor: .01, key: 'wallpaperContrast' as const, suffix: '%' },
      brightness: { factor: .01, key: 'wallpaperBrightness' as const, suffix: '%' },
    }
    this.root.querySelectorAll<HTMLInputElement>('[data-boost-wallpaper]').forEach((input) => {
      const field = input.dataset.boostWallpaper as keyof typeof wallpaperFields
      const config = wallpaperFields[field]
      if (!config) return
      this.bindSettledBoostRange(input, (value) => { const display = this.root.querySelector<HTMLElement>(`[data-boost-wallpaper-value="${field}"]`); if (display) display.textContent = `${Math.round(value)}${config.suffix}` }, (value) => this.store.updateBoostWallpaperTreatment({ [config.key]: value * config.factor }))
    })
    this.root.querySelectorAll<HTMLButtonElement>('[data-boost-mode]').forEach((button) => button.addEventListener('click', () => { this.clearBoostPreview(); this.store.setBoostMode(button.dataset.boostMode === 'smart-invert' ? 'smart-invert' : 'recolor') }))
    this.root.querySelectorAll<HTMLButtonElement>('[data-boost-text-mode]').forEach((button) => button.addEventListener('click', () => { this.clearBoostPreview(); this.store.setBoostTextMode(button.dataset.boostTextMode === 'custom' ? 'custom' : 'auto') }))
    const commitBoostColor = (key: 'primary' | 'secondary' | 'text', value: string) => {
      if (!/^#[0-9a-f]{6}$/i.test(value)) return
      this.rememberColor(value); this.clearBoostPreview()
      const boost = this.store.activeProject.boost, alpha = key === 'primary' ? boost.primary.alpha : key === 'secondary' ? boost.secondary?.alpha ?? 1 : boost.text.alpha
      this.store.updateBoostParameters({ [key]: { color: value, alpha } })
    }
    this.root.querySelectorAll<HTMLInputElement>('[data-boost-color]').forEach((input) => input.addEventListener('change', () => commitBoostColor(input.dataset.boostColor as 'primary' | 'secondary' | 'text', input.value)))
    this.root.querySelectorAll<HTMLButtonElement>('[data-boost-recent]').forEach((button) => button.addEventListener('click', () => { const key = button.dataset.boostRecent as 'primary' | 'secondary' | 'text', value = button.dataset.recentColor; if (value) commitBoostColor(key, value) }))
    this.root.querySelectorAll<HTMLInputElement>('[data-boost-param]').forEach((input) => {
      const key = input.dataset.boostParam as 'contrast' | 'brightness' | 'originalSaturation'
      this.bindSettledBoostRange(input, (value) => { const display = this.root.querySelector<HTMLElement>(`[data-boost-value="${key}"]`); if (display) display.textContent = `${Math.round(value)}%` }, (value) => this.store.updateBoostParameters({ [key]: value / 100 }))
    })
    this.bindSettledBoostRange(this.root.querySelector<HTMLInputElement>('[data-boost-scale]'), (value) => { const display = this.root.querySelector<HTMLElement>('[data-boost-value="scale"]'); if (display) display.textContent = `${Math.round(value)}%` }, (value) => this.store.setBoostFont(this.store.activeProject.boost.typography.fontFamily, value / 100))
    const commitFont = (fontFamily: string) => { this.clearBoostPreview(); this.store.setBoostFont(fontFamily, this.store.activeProject.boost.typography.scale ?? 1) }
    this.root.querySelector<HTMLSelectElement>('[data-boost-font]')?.addEventListener('change', (event) => commitFont((event.currentTarget as HTMLSelectElement).value))
    this.root.querySelectorAll<HTMLButtonElement>('[data-boost-font-sample]').forEach((button) => button.addEventListener('click', () => commitFont(button.dataset.boostFontSample ?? '')))
    this.root.querySelector('[data-action="shuffle-boost"]')?.addEventListener('click', () => { this.clearBoostPreview(); this.store.shuffleBoost([]) })
    this.root.querySelector('[data-action="refresh-boost-source"]')?.addEventListener('click', () => void this.refreshBoostSource())
    this.root.querySelector('[data-action="reset-boost"]')?.addEventListener('click', () => { this.clearBoostPreview(); this.store.resetBoost() })
    this.root.querySelector('[data-action="duplicate-project"]')?.addEventListener('click', () => { this.clearBoostPreview(); this.clearPreviewMarker(); this.selection = null; this.targetSurface = 'element'; this.store.duplicate() })
    this.root.querySelectorAll<HTMLButtonElement>('[data-project-id]').forEach((button) => button.addEventListener('click', () => { this.clearBoostPreview(); this.clearPreviewMarker(); this.selection = null; this.targetSurface = 'element'; this.store.selectProject(button.dataset.projectId ?? '') }))
    this.root.querySelectorAll<HTMLButtonElement>('[data-project-rename]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.projectRename ?? ''; const project = this.store.snapshot.projects.find((entry) => entry.id === id); if (!project || typeof window === 'undefined') return; const name = window.prompt?.('Rename theme', project.name); if (name?.trim()) this.store.rename(id, name) }))
    this.root.querySelectorAll<HTMLButtonElement>('[data-project-duplicate]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.projectDuplicate ?? ''; this.clearBoostPreview(); this.clearPreviewMarker(); this.selection = null; this.targetSurface = 'element'; this.store.duplicate(id) }))
    this.root.querySelectorAll<HTMLButtonElement>('[data-project-delete]').forEach((button) => button.addEventListener('click', async () => { const id = button.dataset.projectDelete ?? ''; const project = this.store.snapshot.projects.find((entry) => entry.id === id); if (!project) return; const result = await this.ctx.ui.showConfirm({ title: 'Delete Palette theme?', message: `“${project.name}” and its semantic style packets will be permanently removed.`, variant: 'danger', confirmLabel: 'Delete theme' }); if (!result.confirmed) return; this.clearBoostPreview(); this.clearPreviewMarker(); this.selection = null; this.targetSurface = 'element'; this.store.delete(id) }))
  }
  private startPicker(origin: 'main' | 'widget' = 'main'): void {
    if (this.picker.isActive && this.pickerMode === 'pick') { this.pickerMode = null; this.picker.cancel(); return }
    if (this.picker.isActive) { this.pickerMode = null; this.picker.cancel() }
    const oneShot = origin === 'widget'
    this.designTool = 'pick'; this.layoutGroupDraft = null; this.activeLayoutGroupId = null
    this.pickerMode = 'pick'
    this.picker.start({ persistent: !oneShot, onSelect: (element) => {
      this.clearPreviewMarker()
      this.targetSurface = 'element'
      this.ensureFreshMountedComponentParts()
      this.selection = reconcileSelectionWithOverrides(resolveElement(element, this.components), this.store.activeProject.componentOverrides).selection
      this.observedRead = null
      this.packetMenuOpen = false
      this.editingState = 'normal'
      this.workspace = 'design'
      if (oneShot) this.pickerMode = null
      this.render()
    }, onCancel: () => { this.pickerMode = null; this.render() } })
    this.render()
  }

  private newLayoutGroupDraft(): LayoutGroupDraft { return { parentElement: null, parentTarget: null, parentLabel: '', members: [], error: '' } }

  private startGroupMode(forceNew = false): void {
    this.workspace = 'design'
    if (this.picker.isActive && this.pickerMode === 'group' && !forceNew) { this.pickerMode = null; this.picker.cancel(); return }
    if (this.picker.isActive) { this.pickerMode = null; this.picker.cancel() }
    this.designTool = 'group'; this.observedRead = null; this.packetMenuOpen = false
    if (forceNew || !this.layoutGroupDraft) { this.layoutGroupDraft = this.newLayoutGroupDraft(); this.activeLayoutGroupId = null }
    this.startGroupPicker()
  }

  private startGroupPicker(): void {
    if (!this.layoutGroupDraft) this.layoutGroupDraft = this.newLayoutGroupDraft()
    if (this.picker.isActive) { this.pickerMode = null; this.picker.cancel() }
    this.designTool = 'group'; this.pickerMode = 'group'
    this.picker.start({ persistent: true, onSelect: (element) => { this.addLayoutGroupElement(element); this.render() }, onCancel: () => { this.pickerMode = null; this.render() } })
    this.render()
  }

  private groupTargetForElement(element: Element): { element: Element; selection: ResolvedSelection; target: StudioTarget; label: string } | null {
    const selection = resolveElement(element, this.components)
    const scope = this.groupScopeForSelection(selection)
    const picked = selection.targetLevels.find((level) => level.relation === 'picked')?.element ?? selection.target.element ?? element
    if (scope.persistence !== 'persistent') return null
    const target = { ...this.targetFromResolvedScope(selection, scope), overrideStrength: 'strong' as const }
    if (!compileSafeTargetSelector(target)) return null
    return { element: picked, selection, target, label: structureNodeLabel(picked) }
  }

  private reconcileLayoutGroupDraftParent(draft: LayoutGroupDraft): void {
    if (!draft.members.length) {
      draft.parentElement = null; draft.parentTarget = null; draft.parentLabel = ''; draft.error = ''
      return
    }
    const parents = draft.members.map((member) => member.element.parentElement)
    const parent = parents[0]
    if (!parent || parents.some((entry) => entry !== parent)) {
      draft.parentElement = null; draft.parentTarget = null; draft.parentLabel = ''
      draft.error = 'These targets are at different DOM depths. Retarget another member until they share one direct parent.'
      return
    }
    const parentResolved = this.groupTargetForElement(parent)
    if (!parentResolved) {
      draft.parentElement = parent; draft.parentTarget = null; draft.parentLabel = structureNodeLabel(parent)
      draft.error = 'The shared parent does not have a reusable selector, so Palette cannot persist this group safely.'
      return
    }
    draft.parentElement = parent
    draft.parentTarget = { ...parentResolved.target, label: parentResolved.label, overrideStrength: 'strong' }
    draft.parentLabel = parentResolved.label
    draft.error = ''
  }

  private retargetLayoutGroupDraftMember(index: number, element: Element): void {
    const draft = this.layoutGroupDraft
    if (!draft || !Number.isInteger(index) || index < 0 || index >= draft.members.length) return
    const resolved = this.groupTargetForElement(element)
    if (!resolved) { draft.error = 'That nearby target does not have a reusable selector.'; this.render(); return }
    if (draft.members.some((member, memberIndex) => memberIndex !== index && member.target.selector === resolved.target.selector)) {
      draft.error = 'That reusable target is already represented by another member.'; this.render(); return
    }
    draft.members[index] = resolved
    this.reconcileLayoutGroupDraftParent(draft)
    this.render()
  }

  private addLayoutGroupElement(element: Element): void {
    const draft = this.layoutGroupDraft ?? this.newLayoutGroupDraft()
    this.layoutGroupDraft = draft
    const resolved = this.groupTargetForElement(element)
    if (!resolved) { draft.error = 'That item does not have a reusable selector yet. Pick a stable sibling or named part.'; return }
    const existingIndex = draft.members.findIndex((member) => member.element === resolved.element)
    if (existingIndex >= 0) {
      draft.members.splice(existingIndex, 1); draft.error = ''
      this.reconcileLayoutGroupDraftParent(draft)
      return
    }
    const parent = resolved.element.parentElement
    if (!parent) { draft.error = 'That item has no layout parent.'; return }
    if (draft.parentElement && parent !== draft.parentElement) { draft.error = `Different layout parent. Pick siblings inside ${draft.parentLabel || 'the first parent'}.`; return }
    if (!draft.parentElement && draft.members.length && draft.members.some((member) => member.element.parentElement !== parent)) { draft.error = 'The current draft is between DOM depths. Retarget the existing members until they share a parent before adding another sibling.'; return }
    if (draft.members.some((member) => member.target.selector === resolved.target.selector)) { draft.error = 'That reusable target is already in the group. This version groups distinct sibling selectors.'; return }
    if (!draft.parentElement) {
      const parentResolved = this.groupTargetForElement(parent)
      if (!parentResolved) { draft.error = 'The shared parent does not have a reusable selector, so Palette cannot persist this group safely.'; return }
      draft.parentElement = parent
      draft.parentTarget = { ...parentResolved.target, label: parentResolved.label, overrideStrength: 'strong' }
      draft.parentLabel = parentResolved.label
    }
    draft.members.push(resolved)
    draft.error = ''
  }

  private createLayoutGroupFromDraft(): void {
    const draft = this.layoutGroupDraft
    if (!draft?.parentTarget || draft.members.length < 2) return
    const members: LayoutGroupMember[] = draft.members.map((member) => ({ id: newId('group-member'), label: member.label, target: { ...structuredClone(member.target), overrideStrength: 'strong' } }))
    const name = members.map((member) => member.label).join(' + ').slice(0, 120) || 'Layout group'
    this.suppressRender = true
    const group = this.store.addLayoutGroup({ name, parent: { ...structuredClone(draft.parentTarget), overrideStrength: 'strong' }, members, base: defaultLayoutGroupState(members.length) })
    this.activeLayoutGroupId = group.id; this.layoutGroupDraft = null; this.pickerMode = null
    if (this.picker.isActive) this.picker.cancel()
    this.render()
  }

  private mountedLayoutGroup(group: LayoutGroup): { parent: Element | null; members: Element[] } {
    const parentSelector = compileSafeTargetSelector(group.parent)
    if (!parentSelector) return { parent: null, members: [] }
    let parents: Element[] = []
    try { parents = [...document.querySelectorAll(parentSelector)] } catch { return { parent: null, members: [] } }
    for (const parent of parents) {
      const members: Element[] = []
      for (const member of group.members) {
        const selector = compileSafeTargetSelector(member.target)
        if (!selector) continue
        try {
          const match = [...document.querySelectorAll(selector)].find((entry) => entry.parentElement === parent)
          if (match) members.push(match)
        } catch { /* invalid imported selector; compiler will fail it closed too */ }
      }
      if (members.length >= 2) return { parent, members }
    }
    return { parent: parents[0] ?? null, members: [] }
  }

  private activeLayoutGroup(): LayoutGroup | undefined { return this.activeLayoutGroupId ? this.store.activeProject.layoutGroups.find((group) => group.id === this.activeLayoutGroupId) : undefined }

  private groupBucketList(bucket: LayoutGroupStyleBucket): StylePacket[] {
    if (this.groupEditorTab === 'members') return bucket.members
    if (this.groupEditorTab === 'contents') return bucket.contents[this.groupContentTarget] ?? []
    if (this.groupEditorTab === 'frame') return bucket.frame
    return []
  }

  private assignGroupBucketList(bucket: LayoutGroupStyleBucket, packets: StylePacket[]): LayoutGroupStyleBucket {
    if (this.groupEditorTab === 'members') return { ...bucket, members: packets }
    if (this.groupEditorTab === 'contents') return { ...bucket, contents: { ...bucket.contents, [this.groupContentTarget]: packets } }
    if (this.groupEditorTab === 'frame') return { ...bucket, frame: packets }
    return bucket
  }

  private mutateActiveGroupStyle(mutator: (authored: LayoutGroupStyleBucket, effective: LayoutGroupStyleBucket) => LayoutGroupStyleBucket): void {
    const group = this.activeLayoutGroup(); if (!group || this.groupEditorTab === 'layout') return
    this.store.updateLayoutGroup(group.id, (entry) => {
      const base = entry.styles?.base ?? emptyLayoutGroupStyleBucket()
      const mobile = entry.styles?.mobile ?? emptyLayoutGroupStyleBucket()
      const authored = this.editingScope === 'base' ? structuredClone(base) : structuredClone(mobile)
      const effective = groupStyleBucketForScope(entry, this.editingScope)
      const next = mutator(authored, effective)
      return { ...entry, styles: this.editingScope === 'base' ? { ...(entry.styles ?? { base }), base: next } : { ...(entry.styles ?? { base }), base, mobile: next } }
    })
  }

  private upsertActiveGroupPacket(packet: StylePacket): void {
    this.mutateActiveGroupStyle((authored, effective) => {
      const currentAuthored = this.groupBucketList(authored)
      const existing = currentAuthored.find((entry) => entry.type === packet.type)
      const nextPacket = { ...structuredClone(packet), id: existing?.id ?? packet.id } as StylePacket
      return this.assignGroupBucketList(authored, [...currentAuthored.filter((entry) => entry.type !== packet.type), nextPacket])
    })
  }

  private removeActiveGroupPacket(packetId: string): void {
    this.mutateActiveGroupStyle((authored, effective) => {
      const effectivePacket = this.groupBucketList(effective).find((entry) => entry.id === packetId)
      if (!effectivePacket) return authored
      return this.assignGroupBucketList(authored, this.groupBucketList(authored).filter((entry) => entry.type !== effectivePacket.type))
    })
  }

  private updateActiveLayoutGroupState(patch: Partial<LayoutGroupState>): void {
    const group = this.activeLayoutGroup(); if (!group) return
    this.store.updateLayoutGroupState(group.id, this.editingScope, patch)
  }

  private resolvedGuideMode(): GeometryGuideMode {
    if (this.guideMode !== 'smart') return this.guideMode
    switch (this.activeGuidePacketType) {
      case 'spacing': case 'border': case 'corners': case 'text-entry': return 'box'
      case 'size': case 'image': case 'media-flow': case 'position': case 'transform': return 'size'
      case 'layout': case 'layout-item': case 'placement': case 'alignment': return 'layout'
      default: return 'outline'
    }
  }
  private guideBoundaryElement(): Element | null {
    if (!this.selection || !this.activeGuidePacketType) return null
    const override = overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface)
    const packets = responsiveStacksFor(override, this.editingScope)[this.editingState] ?? []
    const packet = packets.find((entry) => entry.type === this.activeGuidePacketType)
    const selector = packet?.type === 'size' ? packet.boundary?.selector : packet?.type === 'position' ? packet.anchorSelector : undefined
    if (!selector) return null
    try { return document.querySelector(selector) } catch { return null }
  }
  private syncSelectionHighlight(): void {
    if (!this.guidesEnabled) { this.picker.clearHighlight(); return }
    if (this.designTool === 'group') {
      if (this.layoutGroupDraft?.members.length) { this.picker.highlightGroup(this.layoutGroupDraft.members.map((member) => member.element), this.layoutGroupDraft.parentElement); return }
      const group = this.activeLayoutGroup()
      if (group) { const mounted = this.mountedLayoutGroup(group); this.picker.highlightGroup(mounted.members, mounted.parent); return }
      this.picker.clearHighlight(); return
    }
    if (!this.selection) { this.picker.clearHighlight(); return }
    const scope = activeScope(this.selection)
    const elements = mountedElementsForScope(this.selection)
    if (scope.messageSide === 'both' && elements.length > 1) { this.picker.highlightGroup(elements); return }
    this.picker.highlight(elements[0] ?? scope.element ?? this.selection.target.element ?? null, this.resolvedGuideMode(), this.guideBoundaryElement())
  }
  private toggleSelectionHidden(): void {
    if (!this.selection || activeScope(this.selection).persistence !== 'persistent') return
    const previousState = this.editingState
    const override = overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface)
    const visibility = responsiveStacksFor(override, this.editingScope).normal?.find((packet) => packet.type === 'visibility')
    if (visibility?.type === 'visibility' && visibility.mode === 'gone' && override) this.store.removePacket(override.id, visibility.id, 'normal', this.editingScope)
    else {
      const packet = createStylePacket('visibility')
      if (packet.type === 'visibility') packet.mode = 'gone'
      this.store.upsertPacket(this.targetForSelection(), packet, 'normal', this.editingScope)
    }
    this.editingState = previousState
  }
  private activateScopePreservingMessageSide(scopeId: string): void {
    if (!this.selection) return
    const currentSide = activeScope(this.selection).messageSide
    const baseScope = this.selection.scopeCandidates.find((entry) => entry.id === scopeId)
    if (!baseScope) return
    const sideScope = currentSide && baseScope.messageFamilyId
      ? this.selection.scopeCandidates.find((entry) => entry.messageFamilyId === baseScope.messageFamilyId && entry.messageSide === currentSide)
      : currentSide && baseScope.element
        ? this.selection.scopeCandidates.find((entry) => entry.element === baseScope.element && entry.messageSide === currentSide && entry.persistence === 'persistent')
        : undefined
    this.selection.activeScopeId = sideScope?.id ?? baseScope.id
  }

  private selectTargetLevel(levelId: string | undefined): void {
    if (!this.selection || !levelId) return
    const level = this.selection.targetLevels.find((entry) => entry.id === levelId)
    if (!level) return
    this.clearPreviewMarker()
    this.observedRead = null
    this.targetSurface = 'element'
    this.activateScopePreservingMessageSide(level.scopeId)
    this.render()
    this.applyPreviewMarker()
  }
  private stepTargetLevel(delta: -1 | 1): void {
    if (!this.selection) return
    const scope = activeScope(this.selection)
    const current = Math.max(0, this.selection.targetLevels.findIndex((level) => level.element === scope.element))
    const next = this.selection.targetLevels[current + delta]
    if (next) this.selectTargetLevel(next.id)
  }
  private observedKey(): string | null {
    if (!this.selection) return null
    return `${this.store.activeProject.id}\u0000${selectorForSurface(activeScope(this.selection).selector, this.targetSurface)}\u0000${this.editingScope}\u0000${this.editingState}`
  }
  private observedForCurrent(): ObservedReadSession | null {
    const key = this.observedKey()
    return key && this.observedRead?.key === key ? this.observedRead : null
  }
  private observeSelection(): void {
    if (!this.selection || activeScope(this.selection).persistence !== 'persistent') return
    const element = activeScope(this.selection).element ?? this.selection.target.element
    if (!element?.isConnected) return
    const pseudo = this.targetSurface === 'before' ? '::before' : this.targetSurface === 'after' ? '::after' : ''
    const result = reverseEngineerElement(element, pseudo)
    if (!result.packets.length) return
    const target = { ...this.targetForSelection(), overrideStrength: 'strong' as const }
    this.observedRead = { key: this.observedKey()!, target, packets: result.packets.map((packet) => ({ ...structuredClone(packet), editedFields: [] } as StylePacket)), authoredProperties: result.authoredProperties, usedComputedFallback: result.usedComputedFallback, sources: result.sources }
    this.collapsedPackets.clear()
    this.packetMenuOpen = false
  }
  private clearObservedRead(): void { this.observedRead = null; this.render() }

  private targetForSelection(): StudioTarget {
    if (!this.selection) throw new Error('No Palette selection')
    const scope = activeScope(this.selection)
    const surfaceLabel = this.targetSurface === 'before' ? 'Back layer' : this.targetSurface === 'after' ? 'Front layer' : ''
    const selector = selectorForSurface(scope.selector, this.targetSurface)
    const existing = this.store.activeProject.componentOverrides.find((override) => override.target.selector === selector)
    return { selector, strategy: scope.strategy, stability: scope.stability, persistence: scope.persistence, source: scope.source, label: surfaceLabel ? `${scope.label} · ${surfaceLabel}` : scope.label, nativeComponentId: scope.nativeComponentId ?? scope.componentId ?? this.selection.nativeContext?.component.id, nativeContextSelector: scope.nativeContextSelector, localSelector: scope.localSelector, overrideStrength: existing?.target.overrideStrength ?? 'normal' }
  }
  private updatePacket(packetId: string | undefined, updater: (packet: StylePacket) => StylePacket): void {
    if (!packetId) return
    if (this.designTool === 'group' && this.groupEditorTab !== 'layout') {
      const group = this.activeLayoutGroup()
      if (group) {
        const packet = this.groupStylePackets(group).packets.find((entry) => entry.id === packetId)
        if (packet) { const updated = updater(structuredClone(packet)); if (packetDiffFields(packet, updated).length) this.upsertActiveGroupPacket(updated); return }
      }
    }
    if (!this.selection) return
    const override = matchingOverridesForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface).find((entry) => (responsiveStacksFor(entry, this.editingScope)[this.editingState] ?? []).some((packet) => packet.id === packetId)) ?? overrideForSelection(this.selection, this.store.activeProject.componentOverrides, this.targetSurface)
    const packet = responsiveStacksFor(override, this.editingScope)[this.editingState]?.find((entry) => entry.id === packetId)
    if (override && packet) {
      const observedPacket = this.observedForCurrent()?.packets.find((entry) => entry.type === packet.type)
      const before = structuredClone(hydrateSparsePacket(packet, observedPacket))
      const updated = updater(structuredClone(before))
      const changed = packetDiffFields(before, updated)
      if (!changed.length) return
      if (shouldLocalizeMatchedMessageOverride(this.selection, override, this.targetSurface)) {
        const materialized = { ...updated, id: newId('packet'), editedFields: changed } as StylePacket
        this.store.upsertPacket({ ...this.targetForSelection(), overrideStrength: 'strong' }, materialized, this.editingState, this.editingScope)
        this.revealStylePacket(materialized.id, false)
        return
      }
      this.store.upsertPacket(override.target, mergeEditedFields(updated, changed), this.editingState, this.editingScope)
      return
    }
    const observed = this.observedForCurrent()
    const source = observed?.packets.find((entry) => entry.id === packetId)
    if (!observed || !source) return
    const before = structuredClone(source)
    const updated = updater(structuredClone(source))
    const changed = packetDiffFields(before, updated)
    if (!changed.length) return
    const materialized = { ...updated, editedFields: changed } as StylePacket
    this.store.upsertPacket({ ...observed.target, overrideStrength: 'strong' }, materialized, this.editingState, this.editingScope)
    this.revealStylePacket(materialized.id, false)
  }
  private clearPreviewMarker(): void {
    for (const element of this.markedElements) element.removeAttribute('data-theme-studio-preview-state')
    this.markedElements = []
  }
  private applyPreviewMarker(): void {
    this.clearPreviewMarker()
    if (this.editingState === 'normal') return
    const elements = mountedElementsForScope(this.selection)
    for (const element of elements) if (element.isConnected) element.setAttribute('data-theme-studio-preview-state', this.editingState)
    this.markedElements = elements.filter((element) => element.isConnected)
  }
  private reverseEngineerTarget(): void {
    this.observeSelection()
    this.render()
  }
  private smartInvertTarget(): void {
    const element = this.selection ? activeScope(this.selection).element ?? this.selection.target.element : undefined; if (!element || isMediaElement(element)) return
    const style = getComputedStyle(element)
    this.store.applySmartInvertToTarget(this.targetForSelection(), { backgroundColor: style.backgroundColor, color: style.color, borderColor: style.borderColor }, { enabled: true, strength: 1, preserveAccents: true, preserveMedia: true }, this.editingState, this.editingScope)
  }
  private revealStylePacket(packetId: string, focus = true): void {
    const run = () => {
      const card = this.root.querySelector<HTMLElement>(`[data-packet-id="${escapeCssIdentifier(packetId)}"]`)
      if (!card) return
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      card.classList.remove('is-arrived')
      void card.offsetWidth
      card.classList.add('is-arrived')
      if (focus) {
        const control = card.querySelector<HTMLElement>('[data-packet-field], button:not([data-packet-remove])')
        window.setTimeout(() => control?.focus({ preventScroll: true }), 180)
      }
      window.setTimeout(() => card.classList.remove('is-arrived'), 850)
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(run))
    else setTimeout(run, 0)
  }

  private async refreshBoostSource(): Promise<void> {
    try {
      if (!this.themeRuntime) throw new Error('The live theme bridge is unavailable.')
      await this.themeRuntime.refreshBaseline(); this.boostError = ''; this.render()
    } catch (error) { this.boostError = error instanceof Error ? error.message : 'Could not refresh the native theme source.'; this.render() }
  }
  private renderAndRefocus(search: 'components' | 'variables'): void { this.render(); const input = this.root.querySelector<HTMLInputElement>(`[data-search="${search}"]`); input?.focus(); input?.setSelectionRange(input.value.length, input.value.length) }

  private async refreshNativeCatalog(render = true): Promise<void> {
    if (!this.capabilities.componentRegistry) { this.components = []; this.variables = []; if (render) this.render(); return }
    try {
      this.components = listNativeComponents(this.ctx)
      this.variables = listNativeThemeVariables(this.ctx)
      this.assetError = ''
    } catch (error) {
      this.components = []
      this.variables = []
      this.assetError = `Native catalog unavailable: ${error instanceof Error ? error.message : 'unknown error'}`
    }
    if (render) this.render()
  }

  private ensureFreshMountedComponentParts(): void {
    if (!this.capabilities.componentRegistry || !this.components.length) return
    try { this.components = refreshMountedComponentParts(this.ctx, this.components) } catch { /* catalog remains usable without live part enrichment */ }
  }

  private async ensureProjectBundleId(): Promise<string> {
    const existing = this.store.activeProject.nativeAssetBundleId
    if (existing) return existing
    const bundleId = this.ctx.theme.assets.createBundle()
    this.store.setNativeAssetBundleId(bundleId)
    return bundleId
  }

  private syncProjectAssets(): void {
    this.store.setAssets(this.assets.map((asset) => ({ assetId: asset.id, path: asset.path, name: asset.name, mimeType: asset.mimeType, contentUrl: asset.contentUrl })))
  }

  private async refreshAssets(): Promise<void> {
    if (!this.capabilities.listAssets) return
    const projectId = this.store.snapshot.activeProjectId
    const projectBundleId = this.store.activeProject.nativeAssetBundleId
    const activeBundleCandidate = activeNativeThemeBundleId(this.ctx)
    if (activeBundleCandidate && activeBundleCandidate !== projectBundleId) this.sourceThemeBundleId = activeBundleCandidate
    const activeBundleId = activeBundleCandidate && activeBundleCandidate !== projectBundleId
      ? activeBundleCandidate
      : this.sourceThemeBundleId
    const errors: string[] = []

    let projectAssets: NativeThemeAsset[] = []
    let activeAssets: NativeThemeAsset[] = []
    let projectAssetsLoaded = false

    if (projectBundleId) {
      try { projectAssets = await listNativeThemeAssets(this.ctx, projectBundleId); projectAssetsLoaded = true }
      catch (error) { errors.push(`Project assets: ${error instanceof Error ? error.message : 'unknown error'}`) }
    }

    if (this.store.snapshot.activeProjectId !== projectId) return

    if (activeBundleId && activeBundleId !== projectBundleId) {
      try { activeAssets = await listNativeThemeAssets(this.ctx, activeBundleId) }
      catch (error) { errors.push(`Active-theme assets: ${error instanceof Error ? error.message : 'unknown error'}`) }
    }

    if (this.store.snapshot.activeProjectId !== projectId) return
    this.assets = projectAssets
    this.activeThemeAssets = activeAssets
    this.preview.setThemeAssets(this.availableThemeAssets())
    this.assetError = errors.length ? `Native asset listing is partially unavailable: ${errors.join(' · ')}` : ''
    if (projectBundleId && projectAssetsLoaded) this.syncProjectAssets()
    if (this.resource === 'assets' || this.styleLibraryOpen) this.render()
  }

  private async uploadNativeAssets(files: File[]): Promise<void> {
    if (!this.capabilities.uploadAssets || !files.length) return
    try {
      const bundleId = await this.ensureProjectBundleId()
      for (const file of files) await uploadNativeThemeAsset(this.ctx, file, bundleId)
      await this.refreshAssets()
      this.nativeActionStatus = `${files.length} asset${files.length === 1 ? '' : 's'} uploaded to the project bundle.`
      this.render()
    } catch (error) { this.assetError = error instanceof Error ? error.message : 'Native asset upload failed.'; this.render() }
  }

  private async deleteNativeAsset(assetId: string): Promise<void> {
    if (!assetId || !this.capabilities.uploadAssets) return
    try { await this.ctx.theme.assets.delete(assetId); await this.refreshAssets(); this.nativeActionStatus = 'Native asset deleted.'; this.render() }
    catch (error) { this.assetError = error instanceof Error ? error.message : 'Native asset deletion failed.'; this.render() }
  }

  private async optimizeNativeAsset(assetId: string): Promise<void> {
    if (!assetId || !this.capabilities.uploadAssets) return
    try { await this.ctx.theme.assets.optimizeWebp(assetId); await this.refreshAssets(); this.nativeActionStatus = 'Image optimized through Lumiverse.'; this.render() }
    catch (error) { this.assetError = error instanceof Error ? error.message : 'Native WebP optimization failed.'; this.render() }
  }

  private nativeDraft() { return projectToNativeDraft(this.store.activeProject, this.components, this.variables) }

  private downloadBytes(bytes: Uint8Array, filename: string): void {
    const owned = bytes.slice()
    const blob = new Blob([owned.buffer], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.style.display = 'none'
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  private async exportNativeTheme(): Promise<void> {
    if (!this.capabilities.exportLumitheme) return
    try {
      const bytes = await exportLumitheme(this.ctx, this.nativeDraft())
      const safeName = this.store.activeProject.name.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'theme-studio'
      this.downloadBytes(bytes, `${safeName}.lumitheme`)
      this.nativeActionStatus = `Exported canonical .lumitheme · ${Math.round(bytes.byteLength / 1024)} KB.`
    } catch (error) { this.nativeActionStatus = `Export failed: ${error instanceof Error ? error.message : 'unknown error'}` }
    this.render()
  }

  private async installNativeTheme(): Promise<void> {
    if (!this.capabilities.applyTheme) return
    try {
      const result = await sendToLumiverse(this.ctx, this.nativeDraft(), true)
      this.nativeActionStatus = `Installed in Lumiverse · ${result.componentCount} component section${result.componentCount === 1 ? '' : 's'} · ${result.assetCount} asset${result.assetCount === 1 ? '' : 's'}${result.savedToLibrary ? ' · saved to library' : ''}. Source project assets stay in their project bundle; Lumiverse installed a fresh native bundle (${result.bundleId}).`
      this.render()
    } catch (error) { this.nativeActionStatus = `Install failed: ${error instanceof Error ? error.message : 'unknown error'}`; this.render() }
  }

  private async importNativeThemeFile(file: File): Promise<void> {
    if (!this.capabilities.importTheme) return
    try {
      const imported = await importLumitheme(this.ctx, new Uint8Array(await file.arrayBuffer()))
      const project = this.store.create(imported.draft.name || file.name.replace(/\.lumitheme$/i, ''))
      const componentCss = Object.entries(imported.draft.components ?? {}).flatMap(([id, value]) => value.css.trim() ? [`/* Imported native component · ${id} */\n${value.css.trim()}`] : [])
      this.store.setCustomCss([imported.draft.globalCSS.trim(), ...componentCss].filter(Boolean).join('\n\n'))
      this.store.setNativeAssetBundleId(imported.draft.assetBundleId ?? undefined)
      this.store.setAssets(imported.assets.map((asset) => ({ assetId: asset.id, path: asset.cssPath, contentUrl: asset.contentUrl, name: asset.originalFilename, mimeType: asset.mimeType })))
      this.nativeActionStatus = `Imported ${project.name} as an inert Palette project${imported.warnings.length ? ` · ${imported.warnings.length} native warning${imported.warnings.length === 1 ? '' : 's'}` : ''}. Nothing was applied.`
      await this.refreshAssets()
      this.workspace = 'code'
    } catch (error) { this.nativeActionStatus = `Import failed: ${error instanceof Error ? error.message : 'unknown error'}` }
    this.render()
  }
}
