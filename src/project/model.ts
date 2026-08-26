export const PROJECT_VERSION = 39 as const
export const STATE_VERSION = 39 as const

export type SelectorStrategy = 'semantic' | 'native-context-local' | 'native-registry' | 'studio-registry' | 'css-module' | 'exact-class' | 'structural' | 'volatile'
export type SelectorStability = 'high' | 'medium' | 'low'
export type TargetPersistence = 'persistent' | 'volatile'
export type TargetSource = 'native-aware' | 'dom-scoped'
export type StyleStateName = 'normal' | 'hover' | 'active' | 'focusVisible' | 'disabled'
export const STYLE_STATES: StyleStateName[] = ['normal', 'hover', 'active', 'focusVisible', 'disabled']
export type ResponsiveScopeName = 'base' | 'mobile'
export const RESPONSIVE_SCOPES: ResponsiveScopeName[] = ['base', 'mobile']
export const MOBILE_BREAKPOINT_PX = 720

export interface GradientStop { color: string; alpha: number; position: number }
export interface LinearGradient { type: 'linear'; angle: number; stops: GradientStop[] }
export interface BackgroundImageConfig {
  assetPath: string; size: 'cover' | 'contain' | 'auto'; positionX: number; positionY: number
  repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y'; blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light'
  /** Paint normally, or use the asset alpha as a tintable stencil/mask. */
  renderMode?: 'image' | 'mask'
  maskColor?: string
  maskAlpha?: number
  /** Useful for replacing native SVG/icon contents while keeping their layout box. */
  hideContents?: boolean
}
export interface BackgroundPacket {
  id: string; type: 'background'; mode: 'solid' | 'gradient' | 'image'
  solid: { color: string; alpha: number }; gradient: LinearGradient; image: BackgroundImageConfig
}
export interface PatternPacket {
  id: string; type: 'pattern'
  pattern: 'dots' | 'grid' | 'checker' | 'diamonds' | 'stripes' | 'grain'
  color: string; alpha: number; scale: number; angle: number
}
export type TextInkMode = 'cascade' | 'force'
export interface TextPacket {
  id: string; type: 'text'; colorMode: 'solid' | 'gradient'
  /** Cascade sets a default color while allowing authored descendant colors to win. Force also owns WebKit text fill for hostile/native controls. */
  inkMode: TextInkMode
  solid: { color: string; alpha: number }; gradient: LinearGradient
  strokeWidth?: number; strokeColor?: string; strokeAlpha?: number
  shadow?: { x: number; y: number; blur: number; color: string; alpha: number }
}
export interface ContentPacket { id: string; type: 'content'; value: string }
export interface TypographyPacket {
  id: string; type: 'typography'
  fontSize?: number; fontSizeUnit?: 'px' | 'rem'; fontFamily?: string; fontWeight?: number | string
  fontStyle?: 'normal' | 'italic'; textAlign?: 'left' | 'center' | 'right' | 'justify'
  lineHeight?: number; letterSpacing?: number
  transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}
export interface BorderPacket { id: string; type: 'border'; width: number; style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none'; color: string; alpha: number }
export interface CornersPacket { id: string; type: 'corners'; linked: boolean; topLeft: number; topRight: number; bottomRight: number; bottomLeft: number; unit: 'px' }
export interface BoxSpacing { linked: boolean; top: number; right: number; bottom: number; left: number; unit: 'px' }
export interface SpacingPacket { id: string; type: 'spacing'; padding?: BoxSpacing; margin?: BoxSpacing; gap?: number }
export interface ShadowPacket { id: string; type: 'shadow'; x: number; y: number; blur: number; spread: number; color: string; alpha: number; inset: boolean }
export interface GlassPacket {
  id: string; type: 'glass'; tintColor?: string; tintAlpha?: number; blur: number; saturation: number
  borderColor?: string; borderAlpha?: number; borderWidth?: number; shadowStrength?: number; innerHighlight?: number
}
export interface OpacityPacket { id: string; type: 'opacity'; value: number }
export interface VisibilityPacket { id: string; type: 'visibility'; mode: 'visible' | 'invisible' | 'gone' }

export const COMPOSER_ICON_ACTIONS = ['home','regen','continue','oneliner','persona','connections','altFields','addons','promptVariables','guides','quickReplies','tools','extras','selectMessages'] as const
export type ComposerIconAction = (typeof COMPOSER_ICON_ACTIONS)[number]
export type ComposerIconFamily = 'native' | 'manga' | 'editorial' | 'journal' | 'visual-novel'
export interface StudioSvgAsset { id: string; name: string; svg: string; createdAt: number }
/** @deprecated v35: SVG storage is project-wide, not composer-only. */
export type ComposerSvgAsset = StudioSvgAsset
export interface ComposerIconsPacket {
  id: string; type: 'composer-icons'; family: ComposerIconFamily; size: number
  /** Optional per-action SVG snapshots. Unassigned actions fall back to the selected family. */
  customIcons?: Partial<Record<ComposerIconAction, string>>
}
export interface SvgAssetPacket {
  id: string; type: 'svg-asset'
  /** Sanitized SVG snapshot. Library deletion never breaks an authored theme. */
  svg: string
  assetId?: string
  assetName?: string
  renderMode: 'mask' | 'image'
  color: string
  alpha: number
  fit: 'contain' | 'cover'
  positionX: number
  positionY: number
}

/** Strip harmless standalone-file wrappers before validating/storing the SVG root. */
function stripSvgFilePreamble(value: string): string | null {
  let svg = value.replace(/^\uFEFF/, '').trimStart()
  // Common editors/exporters prepend an XML declaration. It is irrelevant once the SVG is embedded.
  svg = svg.replace(/^<\?xml\b[\s\S]*?\?>\s*/i, '')

  // Accept leading comments and legacy DOCTYPE declarations, but never keep the DOCTYPE.
  // Removing it also prevents PUBLIC/SYSTEM entity resolution from surviving into the stored asset.
  for (let pass = 0; pass < 8; pass += 1) {
    const before = svg
    svg = svg.replace(/^<!--[\s\S]*?-->\s*/, '')
    if (/^<!doctype\b/i.test(svg)) {
      let quote: '\"' | "'" | null = null
      let internalSubsetDepth = 0
      let end = -1
      for (let index = 0; index < svg.length; index += 1) {
        const character = svg[index]
        if (quote) {
          if (character === quote) quote = null
          continue
        }
        if (character === '\"' || character === "'") { quote = character; continue }
        if (character === '[') { internalSubsetDepth += 1; continue }
        if (character === ']' && internalSubsetDepth > 0) { internalSubsetDepth -= 1; continue }
        if (character === '>' && internalSubsetDepth === 0) { end = index + 1; break }
      }
      if (end < 0) return null
      svg = svg.slice(end).trimStart()
    }
    if (svg === before) break
  }
  return svg
}

/** Keep user SVGs reusable without allowing executable/remote SVG payloads into CSS masks. */
export function normalizeSvgSource(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const stripped = stripSvgFilePreamble(value)
  if (!stripped) return null
  let svg = stripped.trim().slice(0, 24000)
  if (!/^<svg\b/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) return null
  svg = svg
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/<image\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:href|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  if (/javascript\s*:|data\s*:\s*text\/html|url\s*\(/i.test(svg)) return null
  return /^<svg\b/i.test(svg) && /<\/svg>\s*$/i.test(svg) ? svg : null
}
/** @deprecated v35 alias retained for old integrations/tests. */
export const normalizeComposerSvgSource = normalizeSvgSource
export interface ImageMaskEdge { enabled: boolean; solidUntil: number; fadeUntil: number }
export interface ImageCustomMask {
  horizontal: ImageMaskEdge & { side: 'left' | 'right' }
  top: ImageMaskEdge
  bottom: ImageMaskEdge
  combine: 'intersect' | 'add' | 'subtract' | 'exclude'
}

export interface MediaFlowPacket {
  id: string; type: 'media-flow'
  /** Native leaves the host layout alone. Natural turns media into a sane block without forcing width. Full gives the element the whole reading measure. */
  mode: 'native' | 'natural' | 'full'
  /** Defensive escape hatch for native thumbnail wrappers/buttons that clip authored media. */
  unclipped: boolean
}
export interface ImagePacket {
  id: string; type: 'image'; brightness: number; saturation: number; contrast: number; grayscale: number; hueRotate: number; blur: number
  /** Runtime source treatment. Full swaps supported Lumiverse thumbnail avatar URLs to their original resolver endpoint without touching React state. */
  sourceQuality?: 'native' | 'auto' | 'full'
  objectFit: 'native' | 'cover' | 'contain' | 'fill' | 'scale-down'; objectPositionX: number; objectPositionY: number
  /** When true the image box itself fills its available frame before object-fit is applied. */
  fillFrame?: boolean
  /** v8 legacy visual translation; retained only for lossless reads and no longer emitted. */
  offsetX: number; offsetY: number
  /** Native leaves the app/theme mask untouched. None explicitly clears it. Fade uses the friendly one-edge control; Custom owns a multi-edge mask recipe. */
  maskMode?: 'native' | 'none' | 'fade' | 'custom'
  customMask?: ImageCustomMask
  fade: { direction: 'none' | 'top' | 'right' | 'bottom' | 'left' | 'radial'; amount: number }
}
export interface PositionPacket {
  id: string; type: 'position'; mode: 'flow' | 'nudge' | 'anchored' | 'sticky' | 'screen'
  top?: number; right?: number; bottom?: number; left?: number; unit: 'px' | 'rem' | '%'
  /** Human-facing nudge axes: positive X moves right; positive Y moves down. */
  nudgeX?: number; nudgeY?: number
  layer: 'normal' | 'raised' | 'overlay' | 'custom'; zIndex?: number
  /** Logical centering for normal-flow blocks without assuming a flex/grid parent. */
  flowAlign?: 'native' | 'center'
  anchorSelector?: string; anchorLabel?: string
}
export interface TransformPacket {
  id: string; type: 'transform'
  /** Clockwise visual rotation in degrees. */
  rotate: number
  /** Scale is linked by default so one control behaves like familiar visual sizing. */
  scaleLinked: boolean
  scaleX: number
  scaleY: number
  /** Skew deliberately owns CSS transform while translate/rotate/scale stay on individual properties. */
  skewX: number
  skewY: number
}
/** Retained for lossless Phase Two migration; new layout alignment belongs in Layout. */
export interface AlignmentPacket { id: string; type: 'alignment'; text?: 'left' | 'center' | 'right'; horizontal?: 'start' | 'center' | 'end' | 'space-between'; vertical?: 'start' | 'center' | 'end' }

export type DimensionUnit = 'px' | 'rem' | '%' | 'vw' | 'vh' | 'em'
export type DimensionValue = { mode: 'native' | 'content' | 'parent' } | { mode: 'fixed'; value: number; unit: DimensionUnit }
export type GridColumns = { mode: 'auto' } | { mode: 'count'; count: number } | { mode: 'auto-fit'; min: DimensionValue }
export interface LayoutPacket {
  id: string; type: 'layout'; display: 'normal' | 'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'contents' | 'none'; direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'; wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
  align?: 'start' | 'center' | 'end' | 'stretch'; gap?: DimensionValue; gridColumns?: GridColumns
}
export interface LayoutItemPacket {
  id: string; type: 'layout-item'; sizeInParent: 'natural' | 'fill' | 'fixed'
  grow?: number; shrink?: number; basis?: DimensionValue; alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch'; order?: number
}
export interface SizeBoundary { selector: string; label: string }
export interface SizePacket {
  id: string; type: 'size'; width?: DimensionValue; height?: DimensionValue; minWidth?: DimensionValue; maxWidth?: DimensionValue
  minHeight?: DimensionValue; maxHeight?: DimensionValue; aspectRatio?: { width: number; height: number }
  boundary?: SizeBoundary; mobileSafe?: boolean
}

export type StylePacket = (BackgroundPacket | PatternPacket | TextPacket | ContentPacket | TypographyPacket | BorderPacket | CornersPacket | SpacingPacket | ShadowPacket | GlassPacket | OpacityPacket | VisibilityPacket | ComposerIconsPacket | SvgAssetPacket | MediaFlowPacket | ImagePacket | PositionPacket | TransformPacket | AlignmentPacket | LayoutPacket | LayoutItemPacket | SizePacket) & {
  /** Optional sparse-ownership metadata used by Read Style. Undefined means the packet owns its full semantic output; an array means only those observed fields were explicitly edited. */
  editedFields?: string[]
}
export type PacketType = StylePacket['type']
export type StatePacketStacks = { normal: StylePacket[] } & Partial<Record<Exclude<StyleStateName, 'normal'>, StylePacket[]>>

export interface StudioTarget {
  selector: string; strategy: SelectorStrategy; stability: SelectorStability; persistence: TargetPersistence; source: TargetSource
  label?: string; nativeComponentId?: string; nativeContextSelector?: string; localSelector?: string
  overrideStrength?: 'normal' | 'strong'
}
export interface ComponentOverride {
  id: string
  target: StudioTarget
  /** Base/all-sizes authored state. Kept on the historical `states` key for lossless compatibility. */
  states: StatePacketStacks
  /** Phone-only authored deltas. Absence means this target inherits/falls through to Base/native CSS. */
  mobileStates?: StatePacketStacks
}

export type LayoutGroupMode = 'row' | 'column' | 'grid'
export type LayoutGroupCrossAlign = 'stretch' | 'start' | 'center' | 'end'
export type LayoutGroupJustify = 'stretch' | 'start' | 'center' | 'end'
export type LayoutGroupSiblingMode = 'full-width' | 'join-layout'
export interface LayoutGroupState {
  mode: LayoutGroupMode
  columns: number
  gap: DimensionValue
  justify: LayoutGroupJustify
  align: LayoutGroupCrossAlign
  otherSiblings: LayoutGroupSiblingMode
}
export interface LayoutGroupMember { id: string; label: string; target: StudioTarget }
export type LayoutGroupContentTarget = 'icons' | 'text' | 'buttons' | 'images'
export interface LayoutGroupStyleBucket {
  members: StylePacket[]
  contents: Partial<Record<LayoutGroupContentTarget, StylePacket[]>>
  frame: StylePacket[]
}
export interface LayoutGroupStyles {
  base: LayoutGroupStyleBucket
  mobile?: LayoutGroupStyleBucket
}
export interface LayoutGroup {
  id: string
  name: string
  parent: StudioTarget
  members: LayoutGroupMember[]
  base: LayoutGroupState
  mobile?: LayoutGroupState
  /** Shared visual treatment compiled across the virtual group without reparenting DOM. */
  styles?: LayoutGroupStyles
  /** Optional Style Library provenance. Recipe-owned groups can be reset without touching hand-built groups. */
  recipeSource?: { presetId: string; groupId: string }
}

export interface RecipePacketLayer { presetId: string; packet: StylePacket }
export interface RecipePacketSlot {
  id: string
  target: StudioTarget
  type: PacketType
  /** Base or phone-only recipe ownership. Older saved slots normalize to Base. */
  scope: ResponsiveScopeName
  base?: StylePacket
  layers: RecipePacketLayer[]
}

export interface ThemeTokenOverride { variable: string; value: string }
export interface ThemeAssetReference { assetId?: string; path: string; name?: string; mimeType?: string; contentUrl?: string }

export interface StudioFontFace {
  id: string; family: string; source: { type: 'theme-asset'; path: string }
  weight?: number | string; style?: 'normal' | 'italic'; display?: 'swap' | 'block' | 'fallback' | 'optional'
}
export interface StylePreset { id: string; name: string; states: Partial<Record<StyleStateName, StylePacket[]>> }

/** Cross-project reusable authored styling. Stored globally in Palette state, not inside one theme project. */
export interface SavedStyleBundle {
  id: string
  name: string
  scope: 'target' | 'component' | 'bundle'
  sourceLabel?: string
  sourceProjectName?: string
  overrides: ComponentOverride[]
  createdAt: number
  updatedAt: number
}
export interface BoostColor { color: string; alpha: number }
export type BoostPaletteRole = 'primary' | 'secondary' | 'accent' | 'surface' | 'text' | 'muted' | 'border'
export interface SmartInvertConfig { enabled: boolean; strength: number; preserveAccents: boolean; preserveMedia: boolean }
export interface ProjectBoost {
  enabled: boolean
  colorsEnabled: boolean
  typographyEnabled: boolean
  canvasEnabled: boolean
  mode: 'recolor' | 'smart-invert'
  primary: BoostColor
  secondary?: BoostColor
  contrast: number
  brightness: number
  originalSaturation: number
  canvasOpacity: number
  /** Direct treatment for the mounted wallpaper layer. */
  wallpaperTreatmentEnabled: boolean
  wallpaperOpacity: number
  wallpaperBlur: number
  wallpaperSaturation: number
  wallpaperContrast: number
  wallpaperBrightness: number
  /** Keep transformed interactive foregrounds readable against their surfaces. */
  protectControls: boolean
  typography: { fontFamily?: string; scale?: number }
  /** Phase Four semantic palette retained as explicit post-transform compatibility overrides. */
  legacyPalette?: Partial<Record<BoostPaletteRole, BoostColor>>
  shuffleSeed: number
}

export interface ThemeStudioProject {
  version: typeof PROJECT_VERSION; id: string; name: string; tokens: ThemeTokenOverride[]; componentOverrides: ComponentOverride[]; layoutGroups: LayoutGroup[]
  /** Persistent recipe layer ledger. Reset Pack/Recipe survives reloads and only peels the layers it owns. */
  recipeSlots: RecipePacketSlot[]
  customCss: string; assets: ThemeAssetReference[]; nativeAssetBundleId?: string; fonts: StudioFontFace[]; presets: StylePreset[]; svgAssets: StudioSvgAsset[]; boost: ProjectBoost
  createdAt: number; updatedAt: number
}
export interface ThemeStudioState { version: typeof STATE_VERSION; activeProjectId: string; projects: ThemeStudioProject[]; savedStyles: SavedStyleBundle[] }

export function newId(prefix: string): string { return `${prefix}_${crypto.randomUUID()}` }
export function createGradient(): LinearGradient { return { type: 'linear', angle: 135, stops: [{ color: '#f06bc8', alpha: 1, position: 0 }, { color: '#7658ff', alpha: 1, position: 100 }] } }
export function createBackgroundPacket(): BackgroundPacket {
  return { id: newId('packet'), type: 'background', mode: 'solid', solid: { color: '#5f4b8b', alpha: 1 }, gradient: createGradient(), image: { assetPath: '', size: 'cover', positionX: 50, positionY: 50, repeat: 'no-repeat', renderMode: 'image', maskColor: '#ffffff', maskAlpha: 1, hideContents: false } }
}
export function createStylePacket(type: PacketType): StylePacket {
  const id = newId('packet')
  switch (type) {
    case 'background': return createBackgroundPacket()
    case 'pattern': return { id, type, pattern: 'dots', color: '#ffffff', alpha: 0.12, scale: 18, angle: 45 }
    case 'text': return { id, type, colorMode: 'solid', inkMode: 'cascade', solid: { color: '#f4eef8', alpha: 1 }, gradient: createGradient(), strokeWidth: 0, strokeColor: '#000000', strokeAlpha: 1 }
    case 'content': return { id, type, value: 'LABEL' }
    case 'typography': return { id, type, fontSize: 15, fontSizeUnit: 'px', fontWeight: 500, textAlign: 'left', lineHeight: 1.4, letterSpacing: 0, transform: 'none' }
    case 'border': return { id, type, width: 1, style: 'solid', color: '#ffffff', alpha: 0.2 }
    case 'corners': return { id, type, linked: true, topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12, unit: 'px' }
    case 'spacing': return { id, type, padding: { linked: true, top: 12, right: 12, bottom: 12, left: 12, unit: 'px' }, gap: 8 }
    case 'shadow': return { id, type, x: 0, y: 10, blur: 28, spread: 0, color: '#000000', alpha: 0.28, inset: false }
    case 'glass': return { id, type, blur: 14, saturation: 1.15, borderColor: '#ffffff', borderAlpha: 0.12, borderWidth: 1, shadowStrength: 0.22, innerHighlight: 0.06 }
    case 'opacity': return { id, type, value: 0.8 }
    case 'visibility': return { id, type, mode: 'gone' }
    case 'composer-icons': return { id, type, family: 'native', size: 14, customIcons: {} }
    case 'svg-asset': return { id, type, svg: '', renderMode: 'mask', color: '#ffffff', alpha: 1, fit: 'contain', positionX: 50, positionY: 50 }
    case 'media-flow': return { id, type, mode: 'native', unclipped: false }
    case 'image': return { id, type, brightness: 1, saturation: 1, contrast: 1, grayscale: 0, hueRotate: 0, blur: 0, sourceQuality: 'native', objectFit: 'native', objectPositionX: 50, objectPositionY: 50, fillFrame: false, offsetX: 0, offsetY: 0, fade: { direction: 'none', amount: 28 } }
    case 'position': return { id, type, mode: 'flow', unit: 'px', layer: 'normal', flowAlign: 'native', nudgeX: 0, nudgeY: 0 }
    case 'transform': return { id, type, rotate: 0, scaleLinked: true, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 }
    case 'alignment': return { id, type, text: 'left', horizontal: 'start', vertical: 'center' }
    case 'layout': return { id, type, display: 'normal', direction: 'row', wrap: 'nowrap', justify: 'start', align: 'center', gap: { mode: 'fixed', value: 8, unit: 'px' }, gridColumns: { mode: 'auto' } }
    case 'layout-item': return { id, type, sizeInParent: 'natural', basis: { mode: 'native' }, alignSelf: 'auto', order: 0 }
    case 'size': return { id, type, width: { mode: 'native' }, height: { mode: 'native' }, mobileSafe: true }
  }
}
export function createBoost(): ProjectBoost { return { enabled: false, colorsEnabled: false, typographyEnabled: false, canvasEnabled: false, mode: 'recolor', primary: { color: '#9370db', alpha: 1 }, secondary: { color: '#786bf0', alpha: 1 }, contrast: 0, brightness: 0, originalSaturation: 0.2, canvasOpacity: 1, wallpaperTreatmentEnabled: false, wallpaperOpacity: 1, wallpaperBlur: 0, wallpaperSaturation: 1, wallpaperContrast: 1, wallpaperBrightness: 1, protectControls: true, typography: {}, shuffleSeed: 1 } }
export function createProject(name = 'Untitled Theme'): ThemeStudioProject {
  const now = Date.now()
  return { version: PROJECT_VERSION, id: newId('project'), name, tokens: [], componentOverrides: [], layoutGroups: [], recipeSlots: [], customCss: '', assets: [], nativeAssetBundleId: undefined, fonts: [], presets: [], svgAssets: [], boost: createBoost(), createdAt: now, updatedAt: now }
}
export function createInitialState(): ThemeStudioState { const project = createProject('My Theme'); return { version: STATE_VERSION, activeProjectId: project.id, projects: [project], savedStyles: [] } }
export function clonePacketStack(packets: StylePacket[]): StylePacket[] { return structuredClone(packets).map((packet) => ({ ...packet, id: newId('packet') })) }
export function statePackets(override: ComponentOverride, state: StyleStateName): StylePacket[] { return override.states[state] ?? [] }
export function effectivePacketsForState(override: ComponentOverride, state: StyleStateName): StylePacket[] {
  if (state === 'normal') return structuredClone(override.states.normal)
  const byType = new Map<PacketType, StylePacket>(override.states.normal.map((packet) => [packet.type, structuredClone(packet)]))
  for (const packet of override.states[state] ?? []) byType.set(packet.type, structuredClone(packet))
  return [...byType.values()]
}
export function stateInheritanceSummary(override: ComponentOverride, state: StyleStateName): { inherited: PacketType[]; explicit: PacketType[] } {
  const explicit = (override.states[state] ?? []).map((packet) => packet.type)
  const explicitSet = new Set(explicit)
  return { inherited: state === 'normal' ? [] : override.states.normal.map((packet) => packet.type).filter((type) => !explicitSet.has(type)), explicit }
}
