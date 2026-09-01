import {
  PROJECT_VERSION, STATE_VERSION, STYLE_STATES, COMPOSER_ICON_ACTIONS, createBoost, createGradient, createInitialState, normalizeSvgSource, normalizeSvgTargetPath,
  type AlignmentPacket, type BackgroundPacket, type BorderPacket, type BoxSpacing, type ComponentOverride, type ContentPacket,
  type CornersPacket, type GlassPacket, type ImagePacket, type MaskPacket, type ComposerIconsPacket, type PatternPacket, type LayoutGroup, type LayoutGroupState, type LayoutGroupStyleBucket, type LayoutGroupContentTarget, type LayoutItemPacket, type LayoutPacket, type PlacementPacket, type OpacityPacket, type PositionPacket, type ShadowPacket,
  type SizePacket, type SpacingPacket, type StatePacketStacks, type StylePacket, type StudioFontFace, type TransformPacket, type StudioSvgAsset, type SvgAssetPacket, type MediaFlowPacket,
  type StylePreset, type SavedStyleBundle, type StudioTarget, type TextPacket, type TypographyPacket, type TextEntryPacket, type VisibilityPacket, type RecipePacketSlot, type ThemeStudioProject, type ThemeStudioState,
} from './model'
import { alpha, bounded, normalizeDimension, percentage } from './values'
import { canonicalizeSavedContextSelector, composeContextSelector } from '../registry/selector-utils'
import { portableRandomUUID } from '../utils/random-id'

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function string(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback }
function identifier(value: Record<string, unknown>): string { return string(value.id) || portableRandomUUID() }

const MESSAGE_COMPONENT_RE = /(?:^|[\/:_-])(BubbleMessage|MinimalMessage)(?:$|[\/:_-])/i
function legacyMessageComponentLabel(targetValue: Record<string, unknown>, value: Record<string, unknown>): 'BubbleMessage' | 'MinimalMessage' | undefined {
  const native = string(targetValue.nativeComponentId ?? value.nativeComponentId ?? value.componentId)
  const explicit = string(targetValue.nativeContextSelector)
  const label = string(targetValue.label ?? value.label)
  if (/BubbleMessage/i.test(native) || /data-component=["\']BubbleMessage["\']/i.test(explicit) || /\bBubbleMessage\b/i.test(label)) return 'BubbleMessage'
  if (/MinimalMessage/i.test(native) || /data-component=["\']MinimalMessage["\']/i.test(explicit) || /\bMinimalMessage\b/i.test(label)) return 'MinimalMessage'
  const match = native.match(MESSAGE_COMPONENT_RE)
  return match?.[1] === 'BubbleMessage' || match?.[1] === 'MinimalMessage' ? match[1] : undefined
}
const EXPLICIT_GLOBAL_SCOPE_RE = /\b(similar|everywhere|global|all similar)\b/i
const CSS_MODULE_SELECTOR_RE = /\[class\*=["\']_[A-Za-z][A-Za-z0-9_-]*?_["\']\]/
function repairLegacyMessageSelector(selector: string, targetValue: Record<string, unknown>, value: Record<string, unknown>, _sourceVersion: number): string {
  const component = legacyMessageComponentLabel(targetValue, value)
  if (!component) return selector
  const label = string(targetValue.label ?? value.label)
  // This is an invariant repair, not a one-shot version migration. V27.2 could
  // normalize a stranded selector into schema v15 before it had enough metadata
  // to repair it, which made the version gate permanently preserve the leak. Any
  // message-owned, non-global CSS-module target must remain under its message root.
  if (EXPLICIT_GLOBAL_SCOPE_RE.test(label)) return selector
  if (!CSS_MODULE_SELECTOR_RE.test(selector)) return selector
  const rooted = new RegExp(`^\\[data-component=["']${component}["']\\]`, 'i')
  return selector.split(/,(?![^()]*\))/).map((branch) => {
    const trimmed = branch.trim()
    return rooted.test(trimmed) ? trimmed : `[data-component="${component}"] ${trimmed}`
  }).join(',\n')
}
function messageComponentFromTarget(target: ComponentOverride['target']): 'BubbleMessage' | 'MinimalMessage' | undefined {
  const probe = {
    nativeComponentId: target.nativeComponentId,
    nativeContextSelector: target.nativeContextSelector,
    label: target.label,
  } as Record<string, unknown>
  const explicit = legacyMessageComponentLabel(probe, probe)
  if (explicit) return explicit
  if (/\[data-component=["']BubbleMessage["']\]/i.test(target.selector)) return 'BubbleMessage'
  if (/\[data-component=["']MinimalMessage["']\]/i.test(target.selector)) return 'MinimalMessage'
  return undefined
}
function repairV274FalseMessageRehome(entry: ComponentOverride, sourceVersion: number): ComponentOverride {
  // V27.4's project-wide orphan inference was too eager: if a project contained one
  // message family, it could prepend that message root to unrelated native targets
  // such as ChatView's Bar Wrapper / Chat Toolbar. Those poisoned records are
  // identifiable because the selector says "message-owned" while the surviving
  // native component metadata says otherwise.
  if (sourceVersion !== 17) return entry
  const target = entry.target
  const selectorRoot = target.selector.match(/^\s*\[data-component=["'](BubbleMessage|MinimalMessage)["']\]\s+/i)?.[1]
  if (!selectorRoot || !target.localSelector || !CSS_MODULE_SELECTOR_RE.test(target.localSelector)) return entry
  const nativeProbe = {
    nativeComponentId: target.nativeComponentId,
    nativeContextSelector: undefined,
    label: undefined,
  } as Record<string, unknown>
  const nativeMessage = legacyMessageComponentLabel(nativeProbe, nativeProbe)
  if (!target.nativeComponentId || nativeMessage) return entry

  const savedContext = target.nativeContextSelector?.trim()
  const savedContextMessage = savedContext
    ? legacyMessageComponentLabel({ nativeContextSelector: savedContext } as Record<string, unknown>, {} as Record<string, unknown>)
    : undefined
  const selector = savedContext && !savedContextMessage
    ? `${savedContext} ${target.localSelector}`
    : target.localSelector

  return {
    ...entry,
    target: {
      ...target,
      selector,
      nativeContextSelector: savedContext && !savedContextMessage ? savedContext : undefined,
    },
  }
}

function repairProjectMessageScopeOrphans(overrides: ComponentOverride[], sourceVersion: number): ComponentOverride[] {
  const repaired = overrides.map((entry) => repairV274FalseMessageRehome(entry, sourceVersion))
  const projectComponents = new Set(repaired.map((entry) => messageComponentFromTarget(entry.target)).filter((entry): entry is 'BubbleMessage' | 'MinimalMessage' => Boolean(entry)))
  // If a historical save already discarded the target's native component id, infer
  // only when the project itself has one unambiguous message family. Crucially, an
  // explicit non-message native owner is never rehomed just because that project
  // also contains MinimalMessage/BubbleMessage styles.
  if (projectComponents.size !== 1) return repaired
  const component = [...projectComponents][0]
  const rootSelector = `[data-component="${component}"]`
  const rooted = new RegExp(`^\\[data-component=["']${component}["']\\]`, 'i')
  return repaired.map((entry) => {
    const target = entry.target
    const label = target.label ?? ''
    if (EXPLICIT_GLOBAL_SCOPE_RE.test(label) || !CSS_MODULE_SELECTOR_RE.test(target.selector)) return entry
    if (/\[data-component=["'](?:BubbleMessage|MinimalMessage)["']\]/i.test(target.selector)) return entry

    const explicitNativeOwnership = Boolean(target.nativeComponentId?.trim() || target.nativeContextSelector?.trim())
    if (explicitNativeOwnership && !messageComponentFromTarget(target)) return entry

    const looksContextual = target.source === 'native-aware' || target.strategy === 'native-context-local' || /\b(ancestor|picked|part)\b/i.test(label)
    if (!looksContextual) return entry
    const selector = target.selector.split(/,(?![^()]*\))/).map((branch) => {
      const trimmed = branch.trim()
      return rooted.test(trimmed) ? trimmed : `${rootSelector} ${trimmed}`
    }).join(',\n')
    return {
      ...entry,
      target: {
        ...target, selector, source: 'native-aware',
        nativeComponentId: target.nativeComponentId ?? `mounted:${component}`,
        nativeContextSelector: target.nativeContextSelector ?? rootSelector,
        localSelector: target.localSelector ?? target.selector,
      },
    }
  })
}



function repairRedundantContextComposition(overrides: ComponentOverride[]): ComponentOverride[] {
  // Some native registry/local-part combinations arrived already rooted, then the
  // old composer rooted them a second time. Repair only when the target's saved
  // context/local decomposition can reconstruct the canonical selector exactly.
  // This now also catches the V27.9 image shape `App > App > Avatar > img`, where
  // localSelector itself was fine but the complete contextual selector was wrapped
  // one additional time. Recursive Row > Row remains legal without that proof.
  return overrides.map((entry) => {
    const target = entry.target
    const repaired = canonicalizeSavedContextSelector(target.selector, target.nativeContextSelector, target.localSelector)
    return repaired === target.selector.trim() ? entry : { ...entry, target: { ...target, selector: repaired } }
  })
}

function repairV275TransparentSparseBorders(overrides: ComponentOverride[], sourceVersion: number): ComponentOverride[] {
  // Read Style intentionally stores sparse authored deltas, but v27.5 compiled Border
  // through one shorthand. If the source row had no visible border, its observed color
  // alpha was often 0. Editing only Width + Color therefore produced a perfectly scoped
  // `border: 20px solid rgba(..., 0)` — visually indistinguishable from a dead selector.
  // A color edit on a fully transparent observed border is treated as paint activation.
  if (sourceVersion > 18) return overrides
  const repairStacks = (stacks: StatePacketStacks): StatePacketStacks => Object.fromEntries(
    Object.entries(stacks).map(([state, packets]) => [state, (packets ?? []).map((packet) => {
      if (packet.type !== 'border' || packet.editedFields === undefined) return packet
      const edited = new Set(packet.editedFields)
      if (!edited.has('color') || edited.has('alpha') || packet.alpha > .001) return packet
      return { ...packet, alpha: 1, editedFields: [...edited, 'alpha'] } as StylePacket
    })]),
  ) as StatePacketStacks
  return overrides.map((entry) => ({
    ...entry,
    states: repairStacks(entry.states),
    ...(entry.mobileStates ? { mobileStates: repairStacks(entry.mobileStates) } : {}),
  }))
}

function box(value: unknown): BoxSpacing | undefined { return record(value) ? { linked: value.linked !== false, top: bounded(value.top, 0, 0, 500), right: bounded(value.right, 0, 0, 500), bottom: bounded(value.bottom, 0, 0, 500), left: bounded(value.left, 0, 0, 500), unit: 'px' } : undefined }
function gradient(value: unknown) {
  if (!record(value)) return createGradient()
  const stops = (Array.isArray(value.stops) ? value.stops : []).filter(record).map((stop) => ({ color: string(stop.color, '#000000'), alpha: alpha(stop.alpha), position: percentage(stop.position) }))
  return { type: 'linear' as const, angle: bounded(value.angle, 135, -100_000, 100_000), stops: stops.length >= 2 ? stops : createGradient().stops }
}

function normalizePacketBase(value: unknown): StylePacket | null {
  if (!record(value)) return null
  const id = identifier(value)
  if (value.type === 'background') {
    const solid = record(value.solid) ? value.solid : {}; const image = record(value.image) ? value.image : {}
    return { id, type: 'background', mode: value.mode === 'gradient' || value.mode === 'image' ? value.mode : 'solid', solid: { color: string(solid.color, '#5f4b8b'), alpha: alpha(solid.alpha) }, gradient: gradient(value.gradient), image: { assetPath: string(image.assetPath), size: image.size === 'contain' || image.size === 'auto' ? image.size : 'cover', positionX: percentage(image.positionX, 50), positionY: percentage(image.positionY, 50), repeat: ['repeat', 'repeat-x', 'repeat-y'].includes(String(image.repeat)) ? image.repeat as 'repeat' | 'repeat-x' | 'repeat-y' : 'no-repeat', blendMode: ['normal', 'multiply', 'screen', 'overlay', 'soft-light'].includes(String(image.blendMode)) ? image.blendMode as BackgroundPacket['image']['blendMode'] : undefined, renderMode: image.renderMode === 'mask' ? 'mask' : 'image', maskColor: string(image.maskColor, '#ffffff'), maskAlpha: alpha(image.maskAlpha, 1), hideContents: image.hideContents === true } } satisfies BackgroundPacket
  }
  if (value.type === 'pattern') return {
    id, type: 'pattern',
    pattern: ['grid', 'checker', 'diamonds', 'stripes', 'grain'].includes(String(value.pattern)) ? value.pattern as PatternPacket['pattern'] : 'dots',
    color: string(value.color, '#ffffff'),
    alpha: alpha(value.alpha, .12),
    scale: bounded(value.scale, 18, 4, 240),
    angle: bounded(value.angle, 45, -3600, 3600),
  } satisfies PatternPacket
  if (value.type === 'text') {
    const solid = record(value.solid) ? value.solid : { color: value.color, alpha: value.alpha }
    const shadow = record(value.shadow) ? value.shadow : undefined
    return {
      id, type: 'text', colorMode: value.colorMode === 'gradient' ? 'gradient' : 'solid',
      // Pre-v37 solid Text Style always forced WebKit fill. Preserve that on reload; new packets default to cascade-safe ink.
      inkMode: value.inkMode === 'cascade' ? 'cascade' : 'force',
      solid: { color: string(solid.color, '#f4eef8'), alpha: alpha(solid.alpha) }, gradient: gradient(value.gradient),
      strokeWidth: value.strokeWidth === undefined ? 0 : bounded(value.strokeWidth, 0, 0, 100),
      strokeColor: typeof value.strokeColor === 'string' ? value.strokeColor : '#000000',
      strokeAlpha: value.strokeAlpha === undefined ? 1 : alpha(value.strokeAlpha),
      outlineMode: value.outlineMode === 'outside' ? 'outside' : 'edge',
      shadow: shadow ? { x: bounded(shadow.x, 0, -10000, 10000), y: bounded(shadow.y, 2, -10000, 10000), blur: bounded(shadow.blur, 8, 0, 1000), color: string(shadow.color, '#000000'), alpha: alpha(shadow.alpha, .35) } : undefined,
    } satisfies TextPacket
  }
  if (value.type === 'content') return { id, type: 'content', value: string(value.value, 'LABEL').slice(0, 4000), source: value.source === 'title' || value.source === 'aria-label' ? value.source : 'literal' } satisfies ContentPacket
  if (value.type === 'typography') return {
    id, type: 'typography',
    fontSize: value.fontSize === undefined ? undefined : bounded(value.fontSize, 15, 1, 10000),
    fontSizeUnit: value.fontSizeUnit === 'rem' ? 'rem' : 'px',
    fontFamily: typeof value.fontFamily === 'string' ? value.fontFamily : undefined,
    fontWeight: typeof value.fontWeight === 'number' || typeof value.fontWeight === 'string' ? value.fontWeight : undefined,
    fontStyle: value.fontStyle === 'italic' ? 'italic' : value.fontStyle === 'normal' ? 'normal' : undefined,
    textAlign: ['left', 'center', 'right', 'justify'].includes(String(value.textAlign)) ? value.textAlign as TypographyPacket['textAlign'] : undefined,
    lineHeight: value.lineHeight === undefined ? undefined : bounded(value.lineHeight, 1.4, 0.1, 20),
    letterSpacing: value.letterSpacing === undefined ? undefined : bounded(value.letterSpacing, 0, -1000, 1000),
    transform: ['uppercase', 'lowercase', 'capitalize'].includes(String(value.transform)) ? value.transform as TypographyPacket['transform'] : 'none',
  } satisfies TypographyPacket
  if (value.type === 'text-entry') return {
    id, type: 'text-entry',
    insetX: bounded(value.insetX, 12, 0, 500),
    insetY: bounded(value.insetY, 9, 0, 500),
    fontSize: value.fontSize === undefined ? undefined : bounded(value.fontSize, 15, 1, 10000),
    fontSizeUnit: value.fontSizeUnit === 'rem' ? 'rem' : 'px',
    fontFamily: typeof value.fontFamily === 'string' ? value.fontFamily : undefined,
    fontWeight: typeof value.fontWeight === 'number' || typeof value.fontWeight === 'string' ? value.fontWeight : undefined,
    fontStyle: value.fontStyle === 'italic' ? 'italic' : value.fontStyle === 'normal' ? 'normal' : undefined,
    lineHeight: value.lineHeight === undefined ? undefined : bounded(value.lineHeight, 1.5, 0.1, 20),
    letterSpacing: value.letterSpacing === undefined ? undefined : bounded(value.letterSpacing, 0, -1000, 1000),
    placeholderColor: string(value.placeholderColor, '#72777a'),
    placeholderAlpha: alpha(value.placeholderAlpha, .65),
    placeholderStyle: value.placeholderStyle === 'normal' ? 'normal' : 'italic',
    placeholderWeight: typeof value.placeholderWeight === 'number' || typeof value.placeholderWeight === 'string' ? value.placeholderWeight : 400,
  } satisfies TextEntryPacket
  if (value.type === 'border') return { id, type: 'border', width: bounded(value.width, 1, 0, 1000), style: ['dashed', 'dotted', 'double', 'none'].includes(String(value.style)) ? value.style as BorderPacket['style'] : 'solid', color: string(value.color, '#ffffff'), alpha: alpha(value.alpha) } satisfies BorderPacket
  if (value.type === 'corners') return { id, type: 'corners', linked: value.linked !== false, topLeft: bounded(value.topLeft, 0, 0, 99999), topRight: bounded(value.topRight, 0, 0, 99999), bottomRight: bounded(value.bottomRight, 0, 0, 99999), bottomLeft: bounded(value.bottomLeft, 0, 0, 99999), unit: 'px' } satisfies CornersPacket
  if (value.type === 'spacing') return { id, type: 'spacing', padding: box(value.padding), margin: box(value.margin), gap: value.gap === undefined ? undefined : bounded(value.gap, 0, 0, 10000) } satisfies SpacingPacket
  if (value.type === 'shadow') return { id, type: 'shadow', x: bounded(value.x, 0, -10000, 10000), y: bounded(value.y, 8, -10000, 10000), blur: bounded(value.blur, 20, 0, 10000), spread: bounded(value.spread, 0, -10000, 10000), color: string(value.color, '#000000'), alpha: alpha(value.alpha, 0.25), inset: value.inset === true } satisfies ShadowPacket
  if (value.type === 'glass') return { id, type: 'glass', tintColor: typeof value.tintColor === 'string' ? value.tintColor : undefined, tintAlpha: value.tintAlpha === undefined ? undefined : alpha(value.tintAlpha), blur: bounded(value.blur, 14, 0, 1000), saturation: bounded(value.saturation, 1.15, 0, 10), borderColor: typeof value.borderColor === 'string' ? value.borderColor : undefined, borderAlpha: value.borderAlpha === undefined ? undefined : alpha(value.borderAlpha), borderWidth: value.borderWidth === undefined ? undefined : bounded(value.borderWidth, 1, 0, 1000), shadowStrength: value.shadowStrength === undefined ? undefined : alpha(value.shadowStrength), innerHighlight: value.innerHighlight === undefined ? undefined : alpha(value.innerHighlight) } satisfies GlassPacket
  if (value.type === 'opacity') return { id, type: 'opacity', value: alpha(value.value) } satisfies OpacityPacket
  if (value.type === 'visibility') return { id, type: 'visibility', mode: value.mode === 'invisible' ? 'invisible' : value.mode === 'visible' ? 'visible' : 'gone' } satisfies VisibilityPacket
  if (value.type === 'composer-icons') {
    const rawCustom = record(value.customIcons) ? value.customIcons : {}
    const customIcons: ComposerIconsPacket['customIcons'] = {}
    for (const action of COMPOSER_ICON_ACTIONS) { const svg = normalizeSvgSource(rawCustom[action]); if (svg) customIcons[action] = svg }
    return { id, type: 'composer-icons', family: ['manga', 'editorial', 'journal', 'visual-novel'].includes(String(value.family)) ? value.family as ComposerIconsPacket['family'] : 'native', size: bounded(value.size, 14, 8, 32), ...(Object.keys(customIcons).length ? { customIcons } : {}) } satisfies ComposerIconsPacket
  }
  if (value.type === 'svg-asset') {
    const svg = normalizeSvgSource(value.svg) ?? ''
    return { id, type: 'svg-asset', svg, assetId: typeof value.assetId === 'string' ? value.assetId : undefined, assetName: typeof value.assetName === 'string' ? value.assetName.slice(0, 80) : undefined, targetMode: value.targetMode === 'replace' ? 'replace' : 'surface', svgPath: normalizeSvgTargetPath(value.svgPath), svgLabel: typeof value.svgLabel === 'string' ? value.svgLabel.slice(0, 120) : undefined, renderMode: value.renderMode === 'image' ? 'image' : 'mask', colorMode: value.colorMode === 'inherit' ? 'inherit' : 'custom', color: string(value.color, '#ffffff'), alpha: alpha(value.alpha), fit: value.fit === 'cover' ? 'cover' : 'contain', positionX: percentage(value.positionX, 50), positionY: percentage(value.positionY, 50), size: value.size === undefined ? undefined : bounded(value.size, 16, 4, 512), rotate: bounded(value.rotate, 0, -3600, 3600) } satisfies SvgAssetPacket
  }
  if (value.type === 'media-flow') return { id, type: 'media-flow', mode: value.mode === 'full' ? 'full' : value.mode === 'natural' ? 'natural' : 'native', unclipped: value.unclipped === true } satisfies MediaFlowPacket
  if (value.type === 'image') {
    return { id, type: 'image', brightness: bounded(value.brightness, 1, 0, 4), saturation: bounded(value.saturation, 1, 0, 4), contrast: bounded(value.contrast, 1, 0, 4), grayscale: bounded(value.grayscale, 0, 0, 1), hueRotate: bounded(value.hueRotate, 0, -3600, 3600), blur: bounded(value.blur, 0, 0, 100), sourceQuality: value.sourceQuality === 'full' ? 'full' : value.sourceQuality === 'auto' ? 'auto' : 'native', objectFit: ['cover', 'contain', 'fill', 'scale-down'].includes(String(value.objectFit)) ? value.objectFit as ImagePacket['objectFit'] : 'native', objectPositionX: percentage(value.objectPositionX, 50), objectPositionY: percentage(value.objectPositionY, 50), fillFrame: value.fillFrame === true, offsetX: bounded(value.offsetX, 0, -10000, 10000), offsetY: bounded(value.offsetY, 0, -10000, 10000) } satisfies ImagePacket
  }
  if (value.type === 'mask') {
    const fade = record(value.fade) ? value.fade : {}
    const custom = record(value.customMask) ? value.customMask : undefined
    const edge = (raw: unknown, fallback: { enabled: boolean; solidUntil: number; fadeUntil: number }) => {
      const source = record(raw) ? raw : {}
      const solidUntil = Math.max(0, Math.min(99, percentage(source.solidUntil, fallback.solidUntil)))
      const fadeUntil = Math.max(solidUntil + 1, Math.min(100, percentage(source.fadeUntil, fallback.fadeUntil)))
      return { enabled: source.enabled === undefined ? fallback.enabled : source.enabled === true, solidUntil, fadeUntil }
    }
    const customMask = custom ? {
      horizontal: { ...edge(custom.horizontal, { enabled: true, solidUntil: 25, fadeUntil: 90 }), side: record(custom.horizontal) && custom.horizontal.side === 'left' ? 'left' as const : 'right' as const },
      top: edge(custom.top, { enabled: true, solidUntil: 85, fadeUntil: 100 }),
      bottom: edge(custom.bottom, { enabled: true, solidUntil: 55, fadeUntil: 100 }),
      combine: ['add', 'subtract', 'exclude'].includes(String(custom.combine)) ? custom.combine as 'add' | 'subtract' | 'exclude' : 'intersect' as const,
    } : undefined
    const direction = ['top', 'right', 'bottom', 'left', 'radial'].includes(String(fade.direction)) ? fade.direction as MaskPacket['fade']['direction'] : 'none'
    const explicitMode = ['native', 'none', 'fade', 'custom'].includes(String(value.maskMode)) ? value.maskMode as MaskPacket['maskMode'] : undefined
    const maskMode: MaskPacket['maskMode'] = explicitMode ?? (direction !== 'none' ? 'fade' : customMask ? 'custom' : 'native')
    return { id, type: 'mask', maskMode, customMask, fade: { direction, amount: percentage(fade.amount, 28) } } satisfies MaskPacket
  }
  if (value.type === 'position') {
    const top = value.top === undefined ? undefined : bounded(value.top, 0, -100000, 100000), right = value.right === undefined ? undefined : bounded(value.right, 0, -100000, 100000), bottom = value.bottom === undefined ? undefined : bounded(value.bottom, 0, -100000, 100000), left = value.left === undefined ? undefined : bounded(value.left, 0, -100000, 100000)
    const nudgeX = value.nudgeX === undefined ? (left ?? 0) - (right ?? 0) : bounded(value.nudgeX, 0, -100000, 100000)
    const nudgeY = value.nudgeY === undefined ? (top ?? 0) - (bottom ?? 0) : bounded(value.nudgeY, 0, -100000, 100000)
    return { id, type: 'position', mode: ['nudge', 'anchored', 'sticky', 'screen'].includes(String(value.mode)) ? value.mode as PositionPacket['mode'] : 'flow', top, right, bottom, left, nudgeX, nudgeY, unit: value.unit === 'rem' || value.unit === '%' ? value.unit : 'px', layer: ['raised', 'overlay', 'custom'].includes(String(value.layer)) ? value.layer as PositionPacket['layer'] : 'normal', zIndex: value.zIndex === undefined ? undefined : bounded(value.zIndex, 0, -2147483647, 2147483647), flowAlign: value.flowAlign === 'center' ? 'center' : 'native', anchorSelector: typeof value.anchorSelector === 'string' && value.anchorSelector.trim() ? value.anchorSelector : undefined, anchorLabel: typeof value.anchorLabel === 'string' && value.anchorLabel.trim() ? value.anchorLabel : undefined } satisfies PositionPacket
  }
  if (value.type === 'transform') return {
    id, type: 'transform',
    rotate: bounded(value.rotate, 0, -3600, 3600),
    scaleLinked: value.scaleLinked !== false,
    scaleX: bounded(value.scaleX, 1, 0.01, 20),
    scaleY: bounded(value.scaleY, value.scaleLinked === false ? 1 : bounded(value.scaleX, 1, 0.01, 20), 0.01, 20),
    skewX: bounded(value.skewX, 0, -89, 89),
    skewY: bounded(value.skewY, 0, -89, 89),
  } satisfies TransformPacket
  if (value.type === 'alignment') return { id, type: 'alignment', text: ['left', 'center', 'right'].includes(String(value.text)) ? value.text as AlignmentPacket['text'] : undefined, horizontal: ['start', 'center', 'end', 'space-between'].includes(String(value.horizontal)) ? value.horizontal as AlignmentPacket['horizontal'] : undefined, vertical: ['start', 'center', 'end'].includes(String(value.vertical)) ? value.vertical as AlignmentPacket['vertical'] : undefined } satisfies AlignmentPacket
  if (value.type === 'layout') {
    const displays: LayoutPacket['display'][] = ['normal', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'none']
    const directions: NonNullable<LayoutPacket['direction']>[] = ['row', 'column', 'row-reverse', 'column-reverse']
    const wraps: NonNullable<LayoutPacket['wrap']>[] = ['nowrap', 'wrap', 'wrap-reverse']
    const columns = record(value.gridColumns) ? value.gridColumns : {}
    const gridColumns = columns.mode === 'count' ? { mode: 'count' as const, count: bounded(columns.count, 2, 1, 24) }
      : columns.mode === 'auto-fit' ? { mode: 'auto-fit' as const, min: normalizeDimension(columns.min, { mode: 'fixed', value: 180, unit: 'px' }) }
        : { mode: 'auto' as const }
    return { id, type: 'layout', display: displays.includes(value.display as LayoutPacket['display']) ? value.display as LayoutPacket['display'] : 'normal', direction: directions.includes(value.direction as NonNullable<LayoutPacket['direction']>) ? value.direction as LayoutPacket['direction'] : 'row', wrap: wraps.includes(value.wrap as NonNullable<LayoutPacket['wrap']>) ? value.wrap as LayoutPacket['wrap'] : 'nowrap', justify: ['center', 'end', 'space-between', 'space-around', 'space-evenly'].includes(String(value.justify)) ? value.justify as LayoutPacket['justify'] : 'start', align: ['start', 'end', 'stretch'].includes(String(value.align)) ? value.align as LayoutPacket['align'] : 'center', gap: value.gap === undefined ? undefined : normalizeDimension(value.gap, { mode: 'fixed', value: 8, unit: 'px' }), gridColumns } satisfies LayoutPacket
  }
  if (value.type === 'layout-item') return { id, type: 'layout-item', sizeInParent: value.sizeInParent === 'fill' || value.sizeInParent === 'fixed' ? value.sizeInParent : 'natural', grow: value.grow === undefined ? undefined : bounded(value.grow, 0, 0, 100), shrink: value.shrink === undefined ? undefined : bounded(value.shrink, 1, 0, 100), basis: value.basis === undefined ? undefined : normalizeDimension(value.basis), alignSelf: ['auto', 'start', 'center', 'end', 'stretch'].includes(String(value.alignSelf)) ? value.alignSelf as LayoutItemPacket['alignSelf'] : 'auto', order: value.order === undefined ? undefined : bounded(value.order, 0, -10000, 10000) } satisfies LayoutItemPacket
  if (value.type === 'placement') return { id, type: 'placement', horizontal: ['start', 'center', 'end', 'stretch'].includes(String(value.horizontal)) ? value.horizontal as PlacementPacket['horizontal'] : 'native', vertical: ['start', 'center', 'end', 'stretch'].includes(String(value.vertical)) ? value.vertical as PlacementPacket['vertical'] : 'native' } satisfies PlacementPacket
  if (value.type === 'size') { const boundary = record(value.boundary) && string(value.boundary.selector).trim() ? { selector: string(value.boundary.selector), label: string(value.boundary.label, 'Boundary') } : undefined; return { id, type: 'size', width: value.width === undefined ? undefined : normalizeDimension(value.width), height: value.height === undefined ? undefined : normalizeDimension(value.height), minWidth: value.minWidth === undefined ? undefined : normalizeDimension(value.minWidth), maxWidth: value.maxWidth === undefined ? undefined : normalizeDimension(value.maxWidth), minHeight: value.minHeight === undefined ? undefined : normalizeDimension(value.minHeight), maxHeight: value.maxHeight === undefined ? undefined : normalizeDimension(value.maxHeight), aspectRatio: record(value.aspectRatio) ? { width: bounded(value.aspectRatio.width, 1, 0.001, 10000), height: bounded(value.aspectRatio.height, 1, 0.001, 10000) } : undefined, boundary, mobileSafe: value.mobileSafe !== false } satisfies SizePacket }
  return null
}
export function normalizePacket(value: unknown): StylePacket | null {
  const packet = normalizePacketBase(value)
  if (!packet || !record(value)) return packet
  if (Array.isArray(value.editedFields)) {
    packet.editedFields = [...new Set(value.editedFields.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim())).map((entry) => entry.trim()))]
  }
  return packet
}

function legacyTypographyPacket(value: unknown): TypographyPacket | null {
  if (!record(value) || value.type !== 'text') return null
  const hasTypography = value.fontSize !== undefined || value.fontFamily !== undefined || value.fontWeight !== undefined || value.fontStyle !== undefined || value.textAlign !== undefined || value.lineHeight !== undefined || value.letterSpacing !== undefined
  if (!hasTypography) return null
  return {
    id: `${identifier(value)}_typography`, type: 'typography',
    fontSize: value.fontSize === undefined ? undefined : bounded(value.fontSize, 15, 1, 10000),
    fontSizeUnit: value.fontSizeUnit === 'rem' ? 'rem' : 'px',
    fontFamily: typeof value.fontFamily === 'string' ? value.fontFamily : undefined,
    fontWeight: typeof value.fontWeight === 'number' || typeof value.fontWeight === 'string' ? value.fontWeight : undefined,
    fontStyle: value.fontStyle === 'italic' ? 'italic' : value.fontStyle === 'normal' ? 'normal' : undefined,
    textAlign: ['left', 'center', 'right', 'justify'].includes(String(value.textAlign)) ? value.textAlign as TypographyPacket['textAlign'] : undefined,
    lineHeight: value.lineHeight === undefined ? undefined : bounded(value.lineHeight, 1.4, 0.1, 20),
    letterSpacing: value.letterSpacing === undefined ? undefined : bounded(value.letterSpacing, 0, -1000, 1000),
    transform: 'none',
  }
}
const LEGACY_IMAGE_FIELD_ROOTS = new Set(['brightness','saturation','contrast','grayscale','hueRotate','blur','sourceQuality','objectFit','objectPositionX','objectPositionY','fillFrame','offsetX','offsetY'])
const LEGACY_MASK_FIELD_ROOTS = new Set(['maskMode','customMask','fade'])
function editedRoot(field: string): string { return field.split('.')[0] ?? field }
function keepEditedRoots<T extends StylePacket>(packet: T, roots: Set<string>): T {
  if (packet.editedFields === undefined) return packet
  return { ...packet, editedFields: packet.editedFields.filter((field) => roots.has(editedRoot(field))) } as T
}
function legacyImageHasIntent(value: unknown): boolean {
  if (!record(value) || value.type !== 'image') return false
  if (Array.isArray(value.editedFields)) return value.editedFields.some((field) => typeof field === 'string' && LEGACY_IMAGE_FIELD_ROOTS.has(editedRoot(field)))
  return bounded(value.brightness, 1, 0, 4) !== 1
    || bounded(value.saturation, 1, 0, 4) !== 1
    || bounded(value.contrast, 1, 0, 4) !== 1
    || bounded(value.grayscale, 0, 0, 1) !== 0
    || bounded(value.hueRotate, 0, -3600, 3600) !== 0
    || bounded(value.blur, 0, 0, 100) !== 0
    || value.sourceQuality === 'auto' || value.sourceQuality === 'full'
    || ['cover', 'contain', 'fill', 'scale-down'].includes(String(value.objectFit))
    || percentage(value.objectPositionX, 50) !== 50 || percentage(value.objectPositionY, 50) !== 50
    || value.fillFrame === true
    || bounded(value.offsetX, 0, -10000, 10000) !== 0 || bounded(value.offsetY, 0, -10000, 10000) !== 0
}
function packetList(value: unknown): StylePacket[] {
  const result: StylePacket[] = []
  for (const raw of Array.isArray(value) ? value : []) {
    if (record(raw) && raw.type === 'image') {
      const migratedMask = legacyMaskPacket(raw)
      const normalizedImage = normalizePacket(raw)
      // A legacy wrapper could contain an Image packet that only ever owned its hidden
      // mask controls. Do not migrate that into a meaningless default Image card.
      if (normalizedImage?.type === 'image' && (!migratedMask || legacyImageHasIntent(raw))) result.push(keepEditedRoots(normalizedImage, LEGACY_IMAGE_FIELD_ROOTS))
      if (migratedMask) result.push(migratedMask)
    } else {
      const packet = normalizePacket(raw); if (packet) result.push(packet)
    }
    const typography = legacyTypographyPacket(raw); if (typography) result.push(typography)
  }
  return result
}
function states(value: Record<string, unknown>): StatePacketStacks {
  if (record(value.states)) {
    const result: StatePacketStacks = { normal: packetList(value.states.normal) }
    for (const state of STYLE_STATES.slice(1)) { const list = packetList(value.states[state]); if (list.length) result[state] = list }
    return result
  }
  return { normal: packetList(value.packets) }
}
function override(value: unknown, sourceVersion = 0): ComponentOverride | null {
  if (!record(value)) return null
  const targetValue = record(value.target) ? value.target : value
  const rawSelector = string(targetValue.selector)
  if (!rawSelector.trim()) return null
  const selector = repairLegacyMessageSelector(rawSelector, targetValue, value, sourceVersion)
  const allowedStrategies = ['semantic', 'native-context-local', 'native-registry', 'studio-registry', 'css-module', 'exact-class', 'structural', 'volatile']
  const strategy = allowedStrategies.includes(String(targetValue.strategy ?? value.selectorStrategy)) ? String(targetValue.strategy ?? value.selectorStrategy) as ComponentOverride['target']['strategy'] : 'structural'
  const nativeComponentId = string(targetValue.nativeComponentId ?? value.nativeComponentId ?? value.componentId) || undefined
  const explicitSource = targetValue.source === 'native-aware' || targetValue.source === 'dom-scoped' ? targetValue.source : undefined
  const source: ComponentOverride['target']['source'] = explicitSource ?? (nativeComponentId ? 'native-aware' : 'dom-scoped')
  return { id: identifier(value), target: { selector, strategy, stability: targetValue.stability === 'high' || targetValue.stability === 'medium' ? targetValue.stability : strategy === 'structural' || strategy === 'volatile' ? 'low' : 'medium', persistence: targetValue.persistence === 'volatile' ? 'volatile' : 'persistent', source, label: string(targetValue.label) || undefined, nativeComponentId, nativeContextSelector: string(targetValue.nativeContextSelector) || undefined, localSelector: string(targetValue.localSelector) || undefined, overrideStrength: targetValue.overrideStrength === 'strong' ? 'strong' : 'normal' }, states: states(value), ...(record(value.mobileStates) ? { mobileStates: states({ states: value.mobileStates }) } : {}) }
}
function storedTarget(value: unknown): StudioTarget | null {
  if (!record(value)) return null
  const selector = string(value.selector).trim()
  if (!selector) return null
  const allowedStrategies = ['semantic', 'native-context-local', 'native-registry', 'studio-registry', 'css-module', 'exact-class', 'structural', 'volatile']
  const strategy = allowedStrategies.includes(String(value.strategy)) ? String(value.strategy) as StudioTarget['strategy'] : 'structural'
  const nativeComponentId = string(value.nativeComponentId) || undefined
  const explicitSource = value.source === 'native-aware' || value.source === 'dom-scoped' ? value.source : undefined
  return {
    selector, strategy,
    stability: value.stability === 'high' || value.stability === 'medium' ? value.stability : strategy === 'structural' || strategy === 'volatile' ? 'low' : 'medium',
    persistence: value.persistence === 'volatile' ? 'volatile' : 'persistent',
    source: explicitSource ?? (nativeComponentId ? 'native-aware' : 'dom-scoped'),
    label: string(value.label) || undefined, nativeComponentId, nativeContextSelector: string(value.nativeContextSelector) || undefined,
    localSelector: string(value.localSelector) || undefined, overrideStrength: value.overrideStrength === 'strong' ? 'strong' : 'normal',
  }
}
function layoutGroupState(value: unknown, fallback?: LayoutGroupState): LayoutGroupState {
  const entry = record(value) ? value : {}
  const mode = entry.mode === 'row' || entry.mode === 'column' || entry.mode === 'grid' ? entry.mode : fallback?.mode ?? 'row'
  const justify = ['start','center','end','stretch'].includes(String(entry.justify)) ? entry.justify as LayoutGroupState['justify'] : fallback?.justify ?? 'stretch'
  const align = ['start','center','end','stretch'].includes(String(entry.align)) ? entry.align as LayoutGroupState['align'] : fallback?.align ?? 'stretch'
  return {
    mode, columns: bounded(entry.columns, fallback?.columns ?? 2, 1, 12),
    gap: normalizeDimension(entry.gap, fallback?.gap ?? { mode: 'fixed', value: 8, unit: 'px' }),
    justify, align, otherSiblings: entry.otherSiblings === 'join-layout' || entry.otherSiblings === 'full-width' ? entry.otherSiblings : fallback?.otherSiblings ?? 'full-width',
  }
}
function layoutGroupStyleBucket(value: unknown, fallback?: LayoutGroupStyleBucket): LayoutGroupStyleBucket {
  const entry = record(value) ? value : {}
  const contentsValue = record(entry.contents) ? entry.contents : {}
  const contents: LayoutGroupStyleBucket['contents'] = {}
  for (const target of ['icons','text','buttons','images'] as LayoutGroupContentTarget[]) {
    const parsed = packetList(contentsValue[target])
    if (parsed.length) contents[target] = parsed
    else if (fallback?.contents[target]?.length) contents[target] = structuredClone(fallback.contents[target])
  }
  return {
    members: packetList(entry.members).length ? packetList(entry.members) : structuredClone(fallback?.members ?? []),
    contents,
    frame: packetList(entry.frame).length ? packetList(entry.frame) : structuredClone(fallback?.frame ?? []),
  }
}
function layoutGroup(value: unknown): LayoutGroup | null {
  if (!record(value)) return null
  const parent = storedTarget(value.parent)
  if (!parent || parent.persistence !== 'persistent') return null
  const members = (Array.isArray(value.members) ? value.members : []).filter(record).map((entry) => {
    const target = storedTarget(entry.target)
    if (!target || target.persistence !== 'persistent') return null
    return { id: identifier(entry), label: string(entry.label, target.label ?? 'Item').slice(0, 120), target }
  }).filter((entry): entry is LayoutGroup['members'][number] => entry !== null)
  const unique = [...new Map(members.map((entry) => [entry.target.selector, entry])).values()]
  if (unique.length < 2) return null
  const base = layoutGroupState(value.base)
  const stylesValue = record(value.styles) ? value.styles : null
  const baseStyles = layoutGroupStyleBucket(stylesValue?.base)
  const styles = stylesValue ? { base: baseStyles, ...(record(stylesValue.mobile) ? { mobile: layoutGroupStyleBucket(stylesValue.mobile, baseStyles) } : {}) } : undefined
  const recipeSourceValue = record(value.recipeSource) ? value.recipeSource : null
  const recipeSource = recipeSourceValue && string(recipeSourceValue.presetId).trim() && string(recipeSourceValue.groupId).trim()
    ? { presetId: string(recipeSourceValue.presetId).slice(0, 160), groupId: string(recipeSourceValue.groupId).slice(0, 160) }
    : undefined
  return { id: identifier(value), name: string(value.name, unique.map((entry) => entry.label).join(' + ')).slice(0, 120), parent, members: unique, base, ...(record(value.mobile) ? { mobile: layoutGroupState(value.mobile, base) } : {}), ...(styles ? { styles } : {}), ...(recipeSource ? { recipeSource } : {}) }
}

function legacyMaskPacket(value: unknown, idSuffix = '_mask'): MaskPacket | null {
  if (!record(value) || value.type !== 'image') return null
  const fade = record(value.fade) ? value.fade : {}
  const direction = String(fade.direction ?? 'none')
  const mode = String(value.maskMode ?? '')
  const valueHasMask = ['none', 'fade', 'custom'].includes(mode) || ['top', 'right', 'bottom', 'left', 'radial'].includes(direction)
  const sparseHasMask = Array.isArray(value.editedFields)
    ? value.editedFields.some((field) => typeof field === 'string' && LEGACY_MASK_FIELD_ROOTS.has(editedRoot(field)))
    : valueHasMask
  if (!valueHasMask || !sparseHasMask) return null
  const migrated = normalizePacket({ ...value, id: `${identifier(value)}${idSuffix}`, type: 'mask', maskMode: mode || (direction !== 'none' ? 'fade' : 'native') })
  return migrated?.type === 'mask' ? keepEditedRoots(migrated, LEGACY_MASK_FIELD_ROOTS) : null
}

function recipeSlots(value: unknown): RecipePacketSlot[] {
  if (!record(value)) return []
  const target = storedTarget(value.target)
  if (!target || target.persistence !== 'persistent') return []
  const allowedTypes = new Set(['background','pattern','text','typography','text-entry','border','corners','spacing','shadow','glass','opacity','visibility','composer-icons','svg-asset','media-flow','image','mask','position','transform','alignment','layout','layout-item','placement','size'])
  const type = string(value.type) as RecipePacketSlot['type']
  if (!allowedTypes.has(type)) return []
  const rawLayers = (Array.isArray(value.layers) ? value.layers : []).filter(record)
  const base = normalizePacket(value.base)
  const layers = rawLayers.map((entry) => {
    const presetId = string(entry.presetId).trim()
    const rawPacket = entry.packet
    const packet = normalizePacket(rawPacket)
    if (!presetId || !packet || packet.type !== type) return null
    if (type === 'image' && legacyMaskPacket(rawPacket) && !legacyImageHasIntent(rawPacket)) return null
    return { presetId: presetId.slice(0, 160), packet: packet.type === 'image' ? keepEditedRoots(packet, LEGACY_IMAGE_FIELD_ROOTS) : packet }
  }).filter((entry): entry is RecipePacketSlot['layers'][number] => entry !== null)
  const normalizedBase = base && base.type === type && !(type === 'image' && legacyMaskPacket(value.base) && !legacyImageHasIntent(value.base))
    ? (base.type === 'image' ? keepEditedRoots(base, LEGACY_IMAGE_FIELD_ROOTS) : base)
    : undefined
  const scope = value.scope === 'mobile' ? 'mobile' : 'base'
  const slotId = identifier(value)
  const result: RecipePacketSlot[] = []
  if (layers.length) result.push({ id: slotId, target, type, scope, ...(normalizedBase ? { base: normalizedBase } : {}), layers })

  // Quick-style provenance used the same pre-v42 Image trench coat. Preserve reset/edit
  // ownership by migrating the mask half into a sibling Mask recipe slot as well.
  if (type === 'image') {
    const maskLayers: RecipePacketSlot['layers'] = rawLayers.flatMap((entry) => {
      const presetId = string(entry.presetId).trim()
      const packet = legacyMaskPacket(entry.packet)
      return presetId && packet ? [{ presetId: presetId.slice(0, 160), packet }] : []
    })
    if (maskLayers.length) {
      const maskBase = legacyMaskPacket(value.base)
      result.push({ id: `${slotId}_mask`, target: structuredClone(target), type: 'mask', scope, ...(maskBase ? { base: maskBase } : {}), layers: maskLayers })
    }
  }
  return result
}

function font(value: unknown): StudioFontFace | null {
  if (!record(value) || !record(value.source) || value.source.type !== 'theme-asset' || !string(value.family).trim() || !string(value.source.path).trim()) return null
  return { id: identifier(value), family: string(value.family).slice(0, 120), source: { type: 'theme-asset', path: string(value.source.path) }, weight: typeof value.weight === 'number' || typeof value.weight === 'string' ? value.weight : 400, style: value.style === 'italic' ? 'italic' : 'normal', display: ['block', 'fallback', 'optional'].includes(String(value.display)) ? value.display as StudioFontFace['display'] : 'swap' }
}

function svgAsset(value: unknown): StudioSvgAsset | null {
  if (!record(value)) return null
  const svg = normalizeSvgSource(value.svg)
  if (!svg) return null
  return { id: identifier(value), name: (string(value.name).trim() || 'Saved SVG').slice(0, 80), svg, createdAt: bounded(value.createdAt, Date.now(), 0, Number.MAX_SAFE_INTEGER) }
}

function project(value: unknown): ThemeStudioProject | null {
  if (!record(value) || !string(value.id)) return null
  const sourceVersion = bounded(value.version, 0, 0, Number.MAX_SAFE_INTEGER)
  const now = Date.now(); const boostValue = record(value.boost) ? value.boost : {}; const paletteValue = record(boostValue.palette) ? boostValue.palette : {}; const legacyValue = record(boostValue.legacyPalette) ? boostValue.legacyPalette : {}; const legacyPalette: NonNullable<ThemeStudioProject['boost']['legacyPalette']> = {}
  for (const role of ['primary', 'secondary', 'accent', 'surface', 'text', 'muted', 'border'] as const) { const entry = paletteValue[role]; if (record(entry) && string(entry.color)) legacyPalette[role] = { color: string(entry.color), alpha: alpha(entry.alpha) } }
  for (const role of ['primary', 'secondary', 'accent', 'surface', 'text', 'muted', 'border'] as const) { const entry = legacyValue[role]; if (record(entry) && string(entry.color)) legacyPalette[role] = { color: string(entry.color), alpha: alpha(entry.alpha) } }
  const typography = record(boostValue.typography) ? boostValue.typography : {}; const invert = record(boostValue.smartInvert) ? boostValue.smartInvert : {}
  const defaultBoost = createBoost(); const primaryValue = record(boostValue.primary) ? boostValue.primary : legacyPalette.primary; const secondaryValue = record(boostValue.secondary) ? boostValue.secondary : legacyPalette.secondary
  const hasLegacyIntent = Object.keys(legacyPalette).length > 0 || typeof typography.fontFamily === 'string' || typography.scale !== undefined || invert.enabled === true
  const legacyEnabled = boostValue.enabled === true || (boostValue.enabled === undefined && hasLegacyIntent)
  const typographyEnabled = boostValue.typographyEnabled === true || (boostValue.typographyEnabled === undefined && legacyEnabled && (typeof typography.fontFamily === 'string' || typography.scale !== undefined))
  const colorsEnabled = boostValue.colorsEnabled === true || (boostValue.colorsEnabled === undefined && legacyEnabled)
  const canvasEnabled = boostValue.canvasEnabled === true
  const boost: ThemeStudioProject['boost'] = {
    enabled: legacyEnabled || colorsEnabled || typographyEnabled || canvasEnabled,
    colorsEnabled, typographyEnabled, canvasEnabled,
    mode: boostValue.mode === 'smart-invert' || (boostValue.mode === undefined && invert.enabled === true) ? 'smart-invert' : 'recolor',
    primary: record(primaryValue) && string(primaryValue.color) ? { color: string(primaryValue.color), alpha: alpha(primaryValue.alpha) } : defaultBoost.primary,
    secondary: record(secondaryValue) && string(secondaryValue.color) ? { color: string(secondaryValue.color), alpha: alpha(secondaryValue.alpha) } : structuredClone(defaultBoost.secondary),
    contrast: bounded(boostValue.contrast, defaultBoost.contrast, -1, 1), brightness: bounded(boostValue.brightness, defaultBoost.brightness, -1, 1), originalSaturation: bounded(boostValue.originalSaturation, defaultBoost.originalSaturation, 0, 1), canvasOpacity: bounded(boostValue.canvasOpacity, defaultBoost.canvasOpacity, 0, 1),
    wallpaperTreatmentEnabled: boostValue.wallpaperTreatmentEnabled === true,
    wallpaperOpacity: bounded(boostValue.wallpaperOpacity, defaultBoost.wallpaperOpacity, 0, 1),
    wallpaperBlur: bounded(boostValue.wallpaperBlur, defaultBoost.wallpaperBlur, 0, 48),
    wallpaperSaturation: bounded(boostValue.wallpaperSaturation, defaultBoost.wallpaperSaturation, 0, 3),
    wallpaperContrast: bounded(boostValue.wallpaperContrast, defaultBoost.wallpaperContrast, 0.25, 3),
    wallpaperBrightness: bounded(boostValue.wallpaperBrightness, defaultBoost.wallpaperBrightness, 0.1, 3),
    protectControls: boostValue.protectControls !== false,
    typography: { fontFamily: typeof typography.fontFamily === 'string' ? typography.fontFamily : undefined, scale: typography.scale === undefined ? undefined : bounded(typography.scale, 1, 0.25, 4) },
    legacyPalette: Object.keys(legacyPalette).length ? legacyPalette : undefined,
    shuffleSeed: bounded(boostValue.shuffleSeed, defaultBoost.shuffleSeed, 1, 0x7fffffff),
  }
  const componentOverrides = repairRedundantContextComposition(repairV275TransparentSparseBorders(
    repairProjectMessageScopeOrphans((Array.isArray(value.componentOverrides) ? value.componentOverrides : []).map((entry) => override(entry, sourceVersion)).filter((entry): entry is ComponentOverride => entry !== null), sourceVersion),
    sourceVersion,
  ))
  return { version: PROJECT_VERSION, id: string(value.id), name: (string(value.name).trim() || 'Untitled Theme').slice(0, 120), tokens: (Array.isArray(value.tokens) ? value.tokens : []).filter(record).filter((entry) => typeof entry.variable === 'string' && typeof entry.value === 'string').map((entry) => ({ variable: String(entry.variable), value: String(entry.value) })), componentOverrides, layoutGroups: (Array.isArray(value.layoutGroups) ? value.layoutGroups : []).map(layoutGroup).filter((entry): entry is LayoutGroup => entry !== null), recipeSlots: (Array.isArray(value.recipeSlots) ? value.recipeSlots : []).flatMap(recipeSlots), customCss: string(value.customCss), assets: (Array.isArray(value.assets) ? value.assets : []).filter(record).filter((entry) => typeof entry.path === 'string').map((entry) => ({ assetId: typeof entry.assetId === 'string' ? entry.assetId : undefined, path: String(entry.path), name: typeof entry.name === 'string' ? entry.name : undefined, mimeType: typeof entry.mimeType === 'string' ? entry.mimeType : undefined, contentUrl: typeof entry.contentUrl === 'string' ? entry.contentUrl : undefined })), nativeAssetBundleId: typeof value.nativeAssetBundleId === 'string' ? value.nativeAssetBundleId : undefined, fonts: (Array.isArray(value.fonts) ? value.fonts : []).map(font).filter((entry): entry is StudioFontFace => entry !== null), presets: (Array.isArray(value.presets) ? value.presets : []).filter(record).map((entry): StylePreset => ({ id: identifier(entry), name: string(entry.name, 'Untitled preset').slice(0, 120), states: Object.fromEntries(STYLE_STATES.map((state) => [state, packetList(record(entry.states) ? entry.states[state] : undefined)]).filter(([, list]) => (list as StylePacket[]).length)) })), svgAssets: (Array.isArray(value.svgAssets) ? value.svgAssets : Array.isArray(value.composerSvgs) ? value.composerSvgs : []).map(svgAsset).filter((entry): entry is StudioSvgAsset => entry !== null), boost, createdAt: bounded(value.createdAt, now, 0, Number.MAX_SAFE_INTEGER), updatedAt: bounded(value.updatedAt, now, 0, Number.MAX_SAFE_INTEGER) }
}


function savedStyleBundle(value: unknown): SavedStyleBundle | null {
  if (!record(value)) return null
  const overrides = (Array.isArray(value.overrides) ? value.overrides : []).map((entry) => override(entry, STATE_VERSION)).filter((entry): entry is ComponentOverride => entry !== null)
  if (!overrides.length) return null
  const now = Date.now()
  return {
    id: identifier(value),
    name: (string(value.name).trim() || 'Saved style').slice(0, 120),
    scope: value.scope === 'bundle' ? 'bundle' : value.scope === 'component' ? 'component' : 'target',
    sourceLabel: string(value.sourceLabel).trim().slice(0, 160) || undefined,
    sourceProjectName: string(value.sourceProjectName).trim().slice(0, 120) || undefined,
    overrides,
    createdAt: bounded(value.createdAt, now, 0, Number.MAX_SAFE_INTEGER),
    updatedAt: bounded(value.updatedAt, now, 0, Number.MAX_SAFE_INTEGER),
  }
}

/** Migrate Phase One/Two data to targets + state stacks without rewriting old selectors. */
export function normalizeState(value: unknown): ThemeStudioState {
  if (!record(value)) return createInitialState()
  const projects = (Array.isArray(value.projects) ? value.projects : []).map(project).filter((entry): entry is ThemeStudioProject => entry !== null)
  if (!projects.length) return createInitialState()
  const requested = string(value.activeProjectId)
  return { version: STATE_VERSION, activeProjectId: projects.some((entry) => entry.id === requested) ? requested : projects[0].id, projects, savedStyles: (Array.isArray(value.savedStyles) ? value.savedStyles : []).map(savedStyleBundle).filter((entry): entry is SavedStyleBundle => entry !== null) }
}
