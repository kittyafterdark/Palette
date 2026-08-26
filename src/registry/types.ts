import type { ComponentOverride, SelectorStability, SelectorStrategy, TargetPersistence, TargetSource } from '../project/model'

export interface NativeThemeComponent {
  id: string
  label: string
  area: string
  sources: Array<'css' | 'tsx'>
  selectors: string[]
  cssClasses: string[]
  /** Mounted CSS-module hashes observed on the component root when its public selector identifies one module family. Runtime-only picker evidence; never persisted as native metadata. */
  moduleIdentityHashes?: string[]
  /** False means the public selector currently matches multiple unrelated CSS-module root families, so module-overlap must not be used to name a picked surface. */
  moduleIdentityReliable?: boolean
  nativeKey: string
}

export interface NativeThemeVariable {
  name: string
  value?: string
  defaultValue?: string
  category?: string
}

export interface NativeThemeAsset {
  id: string
  name: string
  path: string
  contentUrl?: string
  slug?: string
  mimeType?: string
  size?: number
  bundleId?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface NativeThemeCapabilities {
  componentRegistry: boolean
  cssVariables: boolean
  listAssets: boolean
  uploadAssets: boolean
  exportTheme: boolean
  exportLumitheme: boolean
  importTheme: boolean
  applyTheme: boolean
  openNativeEditor: boolean
}

export type MessageSideName = 'assistant' | 'user' | 'both'

export interface SelectorCandidate {
  selector: string
  strategy: SelectorStrategy
  stability: SelectorStability
  matchCount: number
  warning?: string
  nativeComponentId?: string
}

export type SelectionScopeType = 'mounted-element' | 'context-local' | 'similar-elements' | 'native-component' | 'native-ancestor' | 'native-part' | 'selector-candidate'

export interface SelectionScope extends SelectorCandidate {
  id: string
  label: string
  type: SelectionScopeType
  componentId?: string
  persistence: TargetPersistence
  source: TargetSource
  nativeContextSelector?: string
  localSelector?: string
  element?: Element
  styledOverrideId?: string
  styledPacketCount?: number
  /** Message-role facet for BubbleMessage / MinimalMessage scopes. */
  messageSide?: MessageSideName
  /** Stable family id shared by Assistant/User/Both variants of the same scope. */
  messageFamilyId?: string
}


export interface TargetLevel {
  id: string
  element: Element
  label: string
  relation: 'picked' | 'ancestor'
  selectorCandidates: SelectorCandidate[]
  recommended: SelectorCandidate
  nativeComponentId?: string
  scopeId: string
}

export type SelectorHealthStatus = 'healthy' | 'missing' | 'broad' | 'invalid'
export interface SelectorHealth { selector: string; matchCount: number; status: SelectorHealthStatus }

export interface SelectionTarget {
  element?: Element
  tagName?: string
  label: string
  candidates: SelectorCandidate[]
  recommended: SelectorCandidate
}

export interface NativeComponentContext {
  component: NativeThemeComponent
  breadcrumb: NativeThemeComponent[]
}
export interface LayoutContext {
  parentElement?: Element
  parentLabel: string
  parentDisplay: string
  parentSelector?: string
  parentNativeComponentId?: string
  isFlex: boolean
  isGrid: boolean
}
export interface SizeControllerInfo {
  element: Element
  label: string
  selector: string
  scopeId?: string
  reason: string
}

export interface ResolvedSelection {
  target: SelectionTarget
  nativeContext?: NativeComponentContext
  scopeCandidates: SelectionScope[]
  targetLevels: TargetLevel[]
  activeScopeId: string
  layoutContext?: LayoutContext
  sizeController?: SizeControllerInfo
  // Phase One compatibility aliases; callers should prefer target/nativeContext.
  element?: Element
  component?: NativeThemeComponent
  breadcrumb: NativeThemeComponent[]
  candidates: SelectorCandidate[]
  recommended: SelectorCandidate
  tagName?: string
}

export interface SelectionReconciliation {
  selection: ResolvedSelection
  activeOverride?: ComponentOverride
  styledScopeIds: string[]
}
