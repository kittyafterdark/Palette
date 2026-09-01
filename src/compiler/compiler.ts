import type {
  AlignmentPacket, BackgroundPacket, BorderPacket, ComponentOverride, ContentPacket, CornersPacket, DimensionValue, GlassPacket, ImagePacket, MaskPacket, ComposerIconsPacket, SvgAssetPacket, LayoutGroup, LayoutGroupState, LayoutItemPacket, LayoutPacket, PlacementPacket,
  OpacityPacket, PatternPacket, PositionPacket, ShadowPacket, SizePacket, SpacingPacket, StatePacketStacks, StylePacket, StyleStateName, TransformPacket, ImageCustomMask, MediaFlowPacket,
  StudioFontFace, StudioTarget, TextPacket, TypographyPacket, TextEntryPacket, VisibilityPacket, ThemeStudioProject, ThemeTokenOverride, ResponsiveScopeName,
} from '../project/model'
import { COMPOSER_ICON_ACTIONS, MOBILE_BREAKPOINT_PX, STYLE_STATES, normalizeSvgSource, normalizeSvgTargetPath } from '../project/model'
import { compileDimension } from '../project/values'
import { colorWithAlpha } from './color'
import { deriveBoostTokenOverrides } from './boost'
import { canonicalizeSavedContextSelector, splitSelectorList } from '../registry/selector-utils'

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min)) }
function number(value: number, digits = 2): string { const finite = Number.isFinite(value) ? value : 0; return String(Math.round(finite * (10 ** digits)) / (10 ** digits)) }
function angle(value: number): number { return Math.round(((Number.isFinite(value) ? value : 0) % 360 + 360) % 360) }
function safe(value: string, fallback: string): string { const trimmed = value.trim(); return !trimmed || /[;{}]/.test(trimmed) ? fallback : trimmed }
function lines(entries: Array<[string, string] | null | undefined>): string { return entries.filter((entry): entry is [string, string] => Boolean(entry)).map(([property, value]) => `${property}: ${value};`).join('\n') }
function sparseFields(packet: StylePacket): Set<string> | null {
  return packet.editedFields === undefined ? null : new Set(packet.editedFields)
}
function ownsField(packet: StylePacket, ...fields: string[]): boolean {
  const edited = sparseFields(packet)
  if (edited === null) return true
  return fields.some((field) => edited.has(field) || [...edited].some((entry) => entry.startsWith(`${field}.`) || field.startsWith(`${entry}.`)))
}
function cssProperty(line: string): string {
  const index = line.indexOf(':')
  return index > 0 ? line.slice(0, index).trim().toLowerCase() : ''
}
function declarationOwnedBy(packet: StylePacket, property: string): boolean {
  if (packet.editedFields === undefined) return true
  if (!packet.editedFields.length) return false
  switch (packet.type) {
    case 'background': return ownsField(packet, 'mode', 'solid', 'gradient', 'image')
    case 'pattern': return ownsField(packet, 'pattern', 'color', 'alpha', 'scale', 'angle')
    case 'content': return property === 'content' && ownsField(packet, 'value', 'source')
    case 'text':
      if (['color','background-image','background-clip','-webkit-background-clip'].includes(property)) return ownsField(packet, 'colorMode', 'solid', 'gradient')
      if (property === '-webkit-text-fill-color') return packet.colorMode === 'gradient' ? ownsField(packet, 'colorMode', 'gradient') : packet.inkMode === 'force' && ownsField(packet, 'inkMode', 'colorMode', 'solid')
      if (property === '-webkit-text-stroke') return packet.outlineMode !== 'outside' && ownsField(packet, 'outlineMode', 'strokeWidth', 'strokeColor', 'strokeAlpha')
      if (property === 'text-shadow') return ownsField(packet, 'shadow') || packet.outlineMode === 'outside' && ownsField(packet, 'outlineMode', 'strokeWidth', 'strokeColor', 'strokeAlpha')
      return false
    case 'typography': {
      if (property === 'font-size') return ownsField(packet, 'fontSize', 'fontSizeUnit')
      const map: Record<string, string> = { 'font-family':'fontFamily', 'font-weight':'fontWeight', 'font-style':'fontStyle', 'text-align':'textAlign', 'line-height':'lineHeight', 'letter-spacing':'letterSpacing', 'text-transform':'transform' }
      return Boolean(map[property] && ownsField(packet, map[property]))
    }
    case 'text-entry': {
      if (property === 'padding' || property === 'box-sizing') return ownsField(packet, 'insetX', 'insetY')
      if (property === 'font-size') return ownsField(packet, 'fontSize', 'fontSizeUnit')
      const map: Record<string, string> = { 'font-family':'fontFamily', 'font-weight':'fontWeight', 'font-style':'fontStyle', 'line-height':'lineHeight', 'letter-spacing':'letterSpacing' }
      return Boolean(map[property] && ownsField(packet, map[property]))
    }
    case 'border': return ownsField(packet, 'width', 'style', 'color', 'alpha')
    case 'corners': return ownsField(packet, 'linked', 'topLeft', 'topRight', 'bottomRight', 'bottomLeft')
    case 'spacing': return property === 'padding' ? ownsField(packet, 'padding') : property === 'margin' ? ownsField(packet, 'margin') : property === 'gap' ? ownsField(packet, 'gap') : false
    case 'shadow': return ownsField(packet, 'x', 'y', 'blur', 'spread', 'color', 'alpha', 'inset')
    case 'glass':
      if (property === 'background') return ownsField(packet, 'tintColor', 'tintAlpha')
      if (property === 'backdrop-filter' || property === '-webkit-backdrop-filter') return ownsField(packet, 'blur', 'saturation')
      if (property === 'border') return ownsField(packet, 'borderColor', 'borderAlpha', 'borderWidth')
      if (property === 'box-shadow') return ownsField(packet, 'shadowStrength', 'innerHighlight')
      return false
    case 'opacity': return ownsField(packet, 'value')
    case 'visibility': return ownsField(packet, 'mode')
    case 'composer-icons': return false
    case 'svg-asset':
      if (['background-image','background-size','background-repeat','background-position'].includes(property)) return ownsField(packet, 'svg', 'renderMode', 'fit', 'positionX', 'positionY')
      if (property === 'background-color') return ownsField(packet, 'renderMode', 'color', 'alpha')
      if (['mask-image','-webkit-mask-image','mask-size','-webkit-mask-size','mask-repeat','-webkit-mask-repeat','mask-position','-webkit-mask-position'].includes(property)) return ownsField(packet, 'svg', 'renderMode', 'fit', 'positionX', 'positionY')
      return false
    case 'media-flow':
      if (['display','width','max-width','height','max-height','aspect-ratio','float','clear','box-sizing','margin-inline','overflow'].includes(property)) return ownsField(packet, 'mode', 'unclipped')
      return false
    case 'image':
      if (property === 'filter') return ownsField(packet, 'brightness', 'saturation', 'contrast', 'grayscale', 'hueRotate', 'blur')
      if (['object-fit','object-position','width','height','display'].includes(property)) return ownsField(packet, 'objectFit', 'objectPositionX', 'objectPositionY', 'fillFrame')
      return false
    case 'mask':
      if (property === 'mask-image' || property === '-webkit-mask-image') return ownsField(packet, 'maskMode', 'customMask', 'fade')
      if (property === 'mask-composite' || property === '-webkit-mask-composite') return ownsField(packet, 'maskMode', 'customMask')
      return false
    case 'position':
      if (property === 'position') return ownsField(packet, 'mode')
      if (property === 'translate') return ownsField(packet, 'mode', 'nudgeX', 'nudgeY', 'unit')
      if (['top','right','bottom','left'].includes(property)) return ownsField(packet, property, 'unit', 'mode')
      if (property === 'z-index') return ownsField(packet, 'layer', 'zIndex')
      if (property === 'margin-inline') return ownsField(packet, 'flowAlign', 'mode')
      return false
    case 'transform':
      if (property === 'rotate') return ownsField(packet, 'rotate')
      if (property === 'scale') return ownsField(packet, 'scaleLinked', 'scaleX', 'scaleY')
      if (property === 'transform') return ownsField(packet, 'skewX', 'skewY')
      return false
    case 'alignment': return property === 'text-align' ? ownsField(packet, 'text') : property === 'justify-content' ? ownsField(packet, 'horizontal') : property === 'align-items' ? ownsField(packet, 'vertical') : false
    case 'layout': {
      const map: Record<string, string> = { display:'display', 'flex-direction':'direction', 'flex-wrap':'wrap', 'justify-content':'justify', 'align-items':'align', gap:'gap', 'grid-template-columns':'gridColumns' }
      return Boolean(map[property] && ownsField(packet, map[property]))
    }
    case 'layout-item':
      if (['flex-grow','flex-shrink'].includes(property)) return ownsField(packet, 'sizeInParent', property === 'flex-grow' ? 'grow' : 'shrink')
      if (property === 'flex-basis') return ownsField(packet, 'sizeInParent', 'basis')
      if (property === 'align-self') return ownsField(packet, 'alignSelf')
      if (property === 'order') return ownsField(packet, 'order')
      return false
    case 'placement':
      if (['width','margin-inline-start','margin-inline-end','justify-self'].includes(property)) return ownsField(packet, 'horizontal')
      if (['height','margin-block-start','margin-block-end','align-self'].includes(property)) return ownsField(packet, 'vertical')
      return false
    case 'size': {
      const map: Record<string, string> = { width:'width', height:'height', 'min-width':'minWidth', 'max-width':'maxWidth', 'min-height':'minHeight', 'max-height':'maxHeight', 'aspect-ratio':'aspectRatio' }
      return Boolean(map[property] && ownsField(packet, map[property]))
    }
  }
}
function filterSparseDeclaration(packet: StylePacket, declaration: string): string {
  if (packet.editedFields === undefined) return declaration
  return declaration.split('\n').filter((line) => declarationOwnedBy(packet, cssProperty(line))).join('\n')
}
function gradientValue(packet: { angle: number; stops: BackgroundPacket['gradient']['stops'] }): string {
  const stops = [...packet.stops].sort((a, b) => a.position - b.position).map((stop) => `${colorWithAlpha(stop.color, stop.alpha)} ${Math.round(clamp(stop.position, 0, 100))}%`)
  return `linear-gradient(${angle(packet.angle)}deg, ${stops.join(', ')})`
}

export function compileBackgroundPacket(packet: BackgroundPacket): string {
  if (packet.mode === 'solid') return `background: ${colorWithAlpha(packet.solid.color, packet.solid.alpha)};`
  if (packet.mode === 'gradient') return `background: ${gradientValue(packet.gradient)};`
  const path = packet.image.assetPath.trim()
  if (!path || /["'(){};]/.test(path)) return ''
  if (packet.image.renderMode === 'mask') {
    const tint = colorWithAlpha(packet.image.maskColor ?? '#ffffff', packet.image.maskAlpha ?? 1)
    return lines([
      ['background', tint],
      ['-webkit-mask-image', `url("${path}")`], ['mask-image', `url("${path}")`],
      ['-webkit-mask-size', packet.image.size], ['mask-size', packet.image.size],
      ['-webkit-mask-position', `${number(clamp(packet.image.positionX, 0, 100))}% ${number(clamp(packet.image.positionY, 0, 100))}%`],
      ['mask-position', `${number(clamp(packet.image.positionX, 0, 100))}% ${number(clamp(packet.image.positionY, 0, 100))}%`],
      ['-webkit-mask-repeat', packet.image.repeat], ['mask-repeat', packet.image.repeat],
    ])
  }
  return lines([
    ['background-image', `url("${path}")`], ['background-size', packet.image.size],
    ['background-position', `${number(clamp(packet.image.positionX, 0, 100))}% ${number(clamp(packet.image.positionY, 0, 100))}%`],
    ['background-repeat', packet.image.repeat], packet.image.blendMode ? ['background-blend-mode', packet.image.blendMode] : null,
  ])
}

interface PatternLayers { images: string[]; sizes: string[]; positions: string[]; repeats: string[] }
function patternLayers(packet: PatternPacket): PatternLayers {
  const color = colorWithAlpha(packet.color, packet.alpha)
  const scale = Math.max(4, Math.min(240, Number.isFinite(packet.scale) ? packet.scale : 18))
  const px = number(scale)
  const line = `${color} 1px, transparent 1px`
  switch (packet.pattern) {
    case 'grid': return {
      images: [`linear-gradient(${color} 1px, transparent 1px)`, `linear-gradient(90deg, ${color} 1px, transparent 1px)`],
      sizes: [`${px}px ${px}px`, `${px}px ${px}px`], positions: ['0 0', '0 0'], repeats: ['repeat', 'repeat'],
    }
    case 'checker': return {
      images: [`conic-gradient(from ${angle(packet.angle)}deg, ${color} 25%, transparent 0 50%, ${color} 0 75%, transparent 0)`],
      sizes: [`${px}px ${px}px`], positions: ['0 0'], repeats: ['repeat'],
    }
    case 'diamonds': return {
      images: [
        `linear-gradient(${angle(packet.angle)}deg, transparent 46%, ${color} 47% 53%, transparent 54%)`,
        `linear-gradient(${angle(-packet.angle)}deg, transparent 46%, ${color} 47% 53%, transparent 54%)`,
      ],
      sizes: [`${px}px ${px}px`, `${px}px ${px}px`], positions: ['0 0', '0 0'], repeats: ['repeat', 'repeat'],
    }
    case 'stripes': return {
      images: [`repeating-linear-gradient(${angle(packet.angle)}deg, ${color} 0 2px, transparent 2px ${number(Math.max(4, scale / 2))}px)`],
      sizes: ['auto'], positions: ['0 0'], repeats: ['repeat'],
    }
    case 'grain': {
      const dot = (x: number, y: number, alphaScale: number) => `radial-gradient(circle at ${x}% ${y}%, ${colorWithAlpha(packet.color, packet.alpha * alphaScale)} 0 0.7px, transparent 0.9px)`
      return {
        images: [dot(18, 22, 1), dot(74, 38, .72), dot(42, 78, .58), dot(88, 84, .46)],
        sizes: [`${px}px ${px}px`, `${number(scale * 1.3)}px ${number(scale * 1.3)}px`, `${number(scale * .82)}px ${number(scale * .82)}px`, `${number(scale * 1.7)}px ${number(scale * 1.7)}px`],
        positions: ['0 0', '5px 3px', '2px 7px', '9px 1px'], repeats: ['repeat', 'repeat', 'repeat', 'repeat'],
      }
    }
    case 'dots':
    default: return {
      images: [`radial-gradient(circle, ${color} 0 1.2px, transparent 1.35px)`],
      sizes: [`${px}px ${px}px`], positions: ['0 0'], repeats: ['repeat'],
    }
  }
}
export function compilePatternPacket(packet: PatternPacket): string {
  const layers = patternLayers(packet)
  return lines([
    ['background-image', layers.images.join(', ')],
    ['background-size', layers.sizes.join(', ')],
    ['background-position', layers.positions.join(', ')],
    ['background-repeat', layers.repeats.join(', ')],
  ])
}
function compileBackgroundAndPattern(background: BackgroundPacket, pattern: PatternPacket): string {
  const layers = patternLayers(pattern)
  if (background.mode === 'solid') return lines([
    ['background-color', colorWithAlpha(background.solid.color, background.solid.alpha)],
    ['background-image', layers.images.join(', ')],
    ['background-size', layers.sizes.join(', ')],
    ['background-position', layers.positions.join(', ')],
    ['background-repeat', layers.repeats.join(', ')],
  ])
  if (background.mode === 'gradient') return lines([
    ['background-image', [...layers.images, gradientValue(background.gradient)].join(', ')],
    ['background-size', [...layers.sizes, 'auto'].join(', ')],
    ['background-position', [...layers.positions, '0 0'].join(', ')],
    ['background-repeat', [...layers.repeats, 'no-repeat'].join(', ')],
  ])
  const path = background.image.assetPath.trim()
  if (!path || /["'(){};]/.test(path)) return compilePatternPacket(pattern)
  const blend = background.image.blendMode
  return lines([
    ['background-image', [...layers.images, `url("${path}")`].join(', ')],
    ['background-size', [...layers.sizes, background.image.size].join(', ')],
    ['background-position', [...layers.positions, `${number(clamp(background.image.positionX, 0, 100))}% ${number(clamp(background.image.positionY, 0, 100))}%`].join(', ')],
    ['background-repeat', [...layers.repeats, background.image.repeat].join(', ')],
    blend ? ['background-blend-mode', [...layers.images.map(() => 'normal'), blend].join(', ')] : null,
  ])
}
function compileOutsideTextOutline(width: number, color: string): string[] {
  const radius = clamp(width, 0, 16)
  if (radius <= 0) return []
  const shadows: string[] = []
  const rings = Math.max(1, Math.ceil(radius))
  const samples = 16
  for (let ring = 1; ring <= rings; ring += 1) {
    const r = Math.min(ring, radius)
    for (let sample = 0; sample < samples; sample += 1) {
      const angle = Math.PI * 2 * sample / samples
      const x = number(Math.cos(angle) * r)
      const y = number(Math.sin(angle) * r)
      shadows.push(`${x}px ${y}px 0 ${color}`)
    }
  }
  return shadows
}
export function compileTextPacket(packet: TextPacket): string {
  const colorDeclarations: Array<[string, string]> = packet.colorMode === 'gradient'
    ? [['color', colorWithAlpha(packet.gradient.stops[0]?.color ?? '#ffffff', packet.gradient.stops[0]?.alpha ?? 1)], ['background-image', gradientValue(packet.gradient)], ['background-clip', 'text'], ['-webkit-background-clip', 'text'], ['-webkit-text-fill-color', 'transparent']]
    : [['color', colorWithAlpha(packet.solid.color, packet.solid.alpha)], ...(packet.inkMode === 'force' ? [['-webkit-text-fill-color', colorWithAlpha(packet.solid.color, packet.solid.alpha)] as [string, string]] : [])]
  const shadow = packet.shadow
  const strokeWidth = clamp(packet.strokeWidth ?? 0, 0, 100)
  const strokeColor = colorWithAlpha(packet.strokeColor ?? '#000000', packet.strokeAlpha ?? 1)
  const outsideOutline = packet.outlineMode === 'outside' ? compileOutsideTextOutline(strokeWidth, strokeColor) : []
  const textShadows = [
    ...outsideOutline,
    ...(shadow ? [`${number(shadow.x)}px ${number(shadow.y)}px ${number(clamp(shadow.blur, 0, 1000))}px ${colorWithAlpha(shadow.color, shadow.alpha)}`] : []),
  ]
  return lines([
    ...colorDeclarations,
    packet.outlineMode !== 'outside' && strokeWidth > 0 ? ['-webkit-text-stroke', `${number(strokeWidth)}px ${strokeColor}`] : null,
    textShadows.length ? ['text-shadow', textShadows.join(', ')] : null,
  ])
}
export function compileContentPacket(packet: ContentPacket): string {
  if (packet.source === 'title') return 'content: attr(title);'
  if (packet.source === 'aria-label') return 'content: attr(aria-label);'
  const escaped = String(packet.value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/\r?\n/g, '\\A ')
  return `content: "${escaped}";`
}
export function compileTypographyPacket(packet: TypographyPacket): string {
  return lines([
    packet.fontSize !== undefined ? ['font-size', `${number(clamp(packet.fontSize, 0.01, 10000))}${packet.fontSizeUnit === 'rem' ? 'rem' : 'px'}`] : null,
    packet.fontFamily ? ['font-family', safe(packet.fontFamily, 'inherit')] : null,
    packet.fontWeight !== undefined ? ['font-weight', safe(String(packet.fontWeight), 'inherit')] : null,
    packet.fontStyle ? ['font-style', packet.fontStyle] : null,
    packet.textAlign ? ['text-align', packet.textAlign] : null,
    packet.lineHeight !== undefined ? ['line-height', number(clamp(packet.lineHeight, 0.1, 20))] : null,
    packet.letterSpacing !== undefined ? ['letter-spacing', `${number(clamp(packet.letterSpacing, -1000, 1000))}px`] : null,
    packet.transform && packet.transform !== 'none' ? ['text-transform', packet.transform] : null,
  ])
}
/** Compile the metric half of Text Entry. The same declaration is replayed onto Lumiverse's hidden autosize mirror. */
export function compileTextEntryPacket(packet: TextEntryPacket): string {
  return lines([
    ['padding', `${number(clamp(packet.insetY, 0, 500))}px ${number(clamp(packet.insetX, 0, 500))}px`],
    ['box-sizing', 'border-box'],
    packet.fontSize !== undefined ? ['font-size', `${number(clamp(packet.fontSize, 0.01, 10000))}${packet.fontSizeUnit === 'rem' ? 'rem' : 'px'}`] : null,
    packet.fontFamily ? ['font-family', safe(packet.fontFamily, 'inherit')] : null,
    packet.fontWeight !== undefined ? ['font-weight', safe(String(packet.fontWeight), 'inherit')] : null,
    packet.fontStyle ? ['font-style', packet.fontStyle] : null,
    packet.lineHeight !== undefined ? ['line-height', number(clamp(packet.lineHeight, 0.1, 20))] : null,
    packet.letterSpacing !== undefined ? ['letter-spacing', `${number(clamp(packet.letterSpacing, -1000, 1000))}px`] : null,
  ])
}
function compileTextEntryPlaceholderPacket(packet: TextEntryPacket): string {
  const ownsInk = ownsField(packet, 'placeholderColor', 'placeholderAlpha')
  return lines([
    ownsInk ? ['color', colorWithAlpha(packet.placeholderColor, clamp(packet.placeholderAlpha, 0, 1))] : null,
    ownsInk ? ['-webkit-text-fill-color', colorWithAlpha(packet.placeholderColor, clamp(packet.placeholderAlpha, 0, 1))] : null,
    ownsInk ? ['opacity', '1'] : null,
    ownsField(packet, 'placeholderStyle') && packet.placeholderStyle ? ['font-style', packet.placeholderStyle] : null,
    ownsField(packet, 'placeholderWeight') && packet.placeholderWeight !== undefined ? ['font-weight', safe(String(packet.placeholderWeight), 'inherit')] : null,
  ])
}
export function compileBorderPacket(packet: BorderPacket): string { return `border: ${number(packet.style === 'none' ? 0 : clamp(packet.width, 0, 1000))}px ${packet.style} ${colorWithAlpha(packet.color, packet.alpha)};` }
function compileSparseBorderPacket(packet: BorderPacket & { editedFields?: string[] }): string {
  if (packet.editedFields === undefined) return compileBorderPacket(packet)
  const edited = new Set(packet.editedFields)
  const colorEdited = edited.has('color')
  const alphaEdited = edited.has('alpha')
  const effectiveAlpha = colorEdited && !alphaEdited && packet.alpha <= .001 ? 1 : packet.alpha
  return lines([
    edited.has('width') ? ['border-width', `${number(packet.style === 'none' ? 0 : clamp(packet.width, 0, 1000))}px`] : null,
    edited.has('style') ? ['border-style', packet.style] : null,
    colorEdited || alphaEdited ? ['border-color', colorWithAlpha(packet.color, effectiveAlpha)] : null,
  ])
}
export function compileCornersPacket(packet: CornersPacket): string { const values = [packet.topLeft, packet.topRight, packet.bottomRight, packet.bottomLeft].map((value) => `${number(clamp(value, 0, 99999))}px`); return `border-radius: ${values.every((value) => value === values[0]) ? values[0] : values.join(' ')};` }
function boxValue(box: NonNullable<SpacingPacket['padding']>, min = 0): string { const values = [box.top, box.right, box.bottom, box.left].map((value) => `${number(clamp(value, min, 10000))}px`); return values.every((value) => value === values[0]) ? values[0] : values.join(' ') }
export function compileSpacingPacket(packet: SpacingPacket): string { return lines([packet.padding ? ['padding', boxValue(packet.padding, 0)] : null, packet.margin ? ['margin', boxValue(packet.margin, -10000)] : null, packet.gap !== undefined ? ['gap', `${number(clamp(packet.gap, 0, 10000))}px`] : null]) }
export function shadowValue(packet: ShadowPacket): string { return `${packet.inset ? 'inset ' : ''}${number(packet.x)}px ${number(packet.y)}px ${number(clamp(packet.blur, 0, 10000))}px ${number(packet.spread)}px ${colorWithAlpha(packet.color, packet.alpha)}` }
export function compileShadowPacket(packet: ShadowPacket): string { return `box-shadow: ${shadowValue(packet)};` }
export function compileGlassPacket(packet: GlassPacket, options: { includeTint?: boolean; includeBorder?: boolean; includeShadow?: boolean } = {}): string {
  const filters = `blur(${number(clamp(packet.blur, 0, 1000))}px) saturate(${number(clamp(packet.saturation, 0, 10))})`; const shadows: string[] = []
  if ((packet.innerHighlight ?? 0) > 0) shadows.push(`inset 0 1px 0 ${colorWithAlpha('#ffffff', packet.innerHighlight)}`)
  if ((packet.shadowStrength ?? 0) > 0) shadows.push(`0 12px 32px ${colorWithAlpha('#000000', packet.shadowStrength)}`)
  return lines([(options.includeTint ?? true) && packet.tintColor ? ['background', colorWithAlpha(packet.tintColor, packet.tintAlpha ?? 1)] : null, ['backdrop-filter', filters], ['-webkit-backdrop-filter', filters], (options.includeBorder ?? true) && packet.borderColor && packet.borderWidth !== undefined ? ['border', `${number(clamp(packet.borderWidth, 0, 1000))}px solid ${colorWithAlpha(packet.borderColor, packet.borderAlpha ?? 1)}`] : null, (options.includeShadow ?? true) && shadows.length ? ['box-shadow', shadows.join(', ')] : null])
}
export function compileOpacityPacket(packet: OpacityPacket): string { return `opacity: ${number(clamp(packet.value, 0, 1), 3)};` }
export function compileVisibilityPacket(packet: VisibilityPacket): string { return packet.mode === 'gone' ? 'display: none;' : packet.mode === 'invisible' ? 'visibility: hidden;' : 'visibility: visible;' }
function imageMaskEdgeGradient(direction: 'left' | 'right' | 'top' | 'bottom', edge: { solidUntil: number; fadeUntil: number }): string {
  const solid = clamp(edge.solidUntil, 0, 99)
  const fadeUntil = Math.max(solid + 1, clamp(edge.fadeUntil, 1, 100))
  return fadeUntil >= 99.999
    ? `linear-gradient(to ${direction}, #000 0%, #000 ${number(solid)}%, transparent 100%)`
    : `linear-gradient(to ${direction}, #000 0%, #000 ${number(solid)}%, transparent ${number(fadeUntil)}%, transparent 100%)`
}
export function compileImageCustomMask(mask: ImageCustomMask): { image: string; standardComposite?: string; webkitComposite?: string } {
  const layers: string[] = []
  if (mask.horizontal.enabled) layers.push(imageMaskEdgeGradient(mask.horizontal.side, mask.horizontal))
  if (mask.bottom.enabled) layers.push(imageMaskEdgeGradient('bottom', mask.bottom))
  if (mask.top.enabled) layers.push(imageMaskEdgeGradient('top', mask.top))
  if (!layers.length) return { image: 'none' }
  if (layers.length === 1) return { image: layers[0] }
  const standard = mask.combine === 'subtract' ? 'subtract' : mask.combine === 'exclude' ? 'exclude' : mask.combine === 'add' ? 'add' : 'intersect'
  const webkit = mask.combine === 'subtract' ? 'source-out' : mask.combine === 'exclude' ? 'xor' : mask.combine === 'add' ? 'source-over' : 'source-in'
  return { image: layers.join(', '), standardComposite: Array(layers.length - 1).fill(standard).join(', '), webkitComposite: Array(layers.length - 1).fill(webkit).join(', ') }
}
function effectiveMaskMode(packet: MaskPacket): 'native' | 'none' | 'fade' | 'custom' {
  return packet.maskMode ?? (packet.fade.direction !== 'none' ? 'fade' : 'native')
}
export function compileMaskPacket(packet: MaskPacket): string {
  const mode = effectiveMaskMode(packet)
  const fade = clamp(packet.fade.amount, 0, 100), keep = number(100 - fade)
  const easyMask = packet.fade.direction === 'right' ? `linear-gradient(to right, #000 0%, #000 ${keep}%, transparent 100%)`
    : packet.fade.direction === 'left' ? `linear-gradient(to left, #000 0%, #000 ${keep}%, transparent 100%)`
      : packet.fade.direction === 'bottom' ? `linear-gradient(to bottom, #000 0%, #000 ${keep}%, transparent 100%)`
        : packet.fade.direction === 'top' ? `linear-gradient(to top, #000 0%, #000 ${keep}%, transparent 100%)`
          : packet.fade.direction === 'radial' ? `radial-gradient(circle at center, #000 0%, #000 ${keep}%, transparent 100%)` : ''
  const custom = mode === 'custom' && packet.customMask ? compileImageCustomMask(packet.customMask) : undefined
  const mask = mode === 'none' ? 'none' : mode === 'fade' ? easyMask : mode === 'custom' ? (custom?.image ?? 'none') : ''
  return lines([
    mask ? ['mask-image', mask] : null, mask ? ['-webkit-mask-image', mask] : null,
    custom?.standardComposite ? ['mask-composite', custom.standardComposite] : null,
    custom?.webkitComposite ? ['-webkit-mask-composite', custom.webkitComposite] : null,
  ])
}
export function compileImagePacket(packet: ImagePacket): string {
  const filters: string[] = []
  if (Math.abs(packet.brightness - 1) > .0001) filters.push(`brightness(${number(clamp(packet.brightness, 0, 4), 3)})`)
  if (Math.abs(packet.saturation - 1) > .0001) filters.push(`saturate(${number(clamp(packet.saturation, 0, 4), 3)})`)
  if (Math.abs(packet.contrast - 1) > .0001) filters.push(`contrast(${number(clamp(packet.contrast, 0, 4), 3)})`)
  if (packet.grayscale > .0001) filters.push(`grayscale(${number(clamp(packet.grayscale, 0, 1), 3)})`)
  if (Math.abs(packet.hueRotate) > .0001) filters.push(`hue-rotate(${number(packet.hueRotate)}deg)`)
  if (packet.blur > .0001) filters.push(`blur(${number(clamp(packet.blur, 0, 100))}px)`)
  return lines([
    filters.length ? ['filter', filters.join(' ')] : null,
    packet.objectFit !== 'native' ? ['object-fit', packet.objectFit] : null,
    packet.fillFrame && packet.objectFit !== 'native' ? ['width', '100%'] : null,
    packet.fillFrame && packet.objectFit !== 'native' ? ['height', '100%'] : null,
    packet.fillFrame && packet.objectFit !== 'native' ? ['display', 'block'] : null,
    packet.objectFit !== 'native' ? ['object-position', `${number(clamp(packet.objectPositionX, 0, 100))}% ${number(clamp(packet.objectPositionY, 0, 100))}%`] : null,
  ])
}
export function compilePositionPacket(packet: PositionPacket & { editedFields?: string[] }): string {
  // Flow normally preserves native positioning. A sparse packet that explicitly
  // owns only `mode` is the responsive reset form used to release a Base
  // anchored/sticky composition without changing ordinary flow semantics.
  const resetsAuthoredPosition = packet.mode === 'flow' && packet.editedFields?.includes('mode')
  const position = resetsAuthoredPosition ? 'static' : packet.mode === 'flow' || packet.mode === 'nudge' ? undefined : packet.mode === 'anchored' ? 'absolute' : packet.mode === 'sticky' ? 'sticky' : 'fixed'
  const offset = (name: string, value: number | undefined): [string, string] | null => {
    if (packet.mode === 'anchored') return [name, value === undefined ? 'auto' : `${number(value)}${packet.unit}`]
    return value === undefined ? null : [name, `${number(value)}${packet.unit}`]
  }
  const zIndex = packet.layer === 'raised' ? '10' : packet.layer === 'overlay' ? '100' : packet.layer === 'custom' && packet.zIndex !== undefined ? number(clamp(packet.zIndex, -2147483647, 2147483647), 0) : undefined
  // Nudge is intentionally transform-only: it must preserve the element's native
  // positioning contract (absolute, sticky, flow, etc.) and only move the rendered
  // box. Anchored owns both absolute placement and its translate baseline. Both
  // modes still emit zero translate so responsive scopes can reset inherited motion.
  const nudge = packet.mode === 'anchored' || packet.mode === 'nudge'
    ? `${number(packet.nudgeX ?? 0)}${packet.unit} ${number(packet.nudgeY ?? 0)}${packet.unit}`
    : undefined
  const flowCenter = (packet.mode === 'flow' || packet.mode === 'nudge') && packet.flowAlign === 'center' ? 'auto' : undefined
  return lines([position ? ['position', position] : null, nudge ? ['translate', nudge] : null, flowCenter ? ['margin-inline', flowCenter] : null, packet.mode !== 'nudge' ? offset('top', packet.top) : null, packet.mode !== 'nudge' ? offset('right', packet.right) : null, packet.mode !== 'nudge' ? offset('bottom', packet.bottom) : null, packet.mode !== 'nudge' ? offset('left', packet.left) : null, zIndex ? ['z-index', zIndex] : null])
}
export function compileTransformPacket(packet: TransformPacket): string {
  const rotate = Math.abs(packet.rotate) > .0001 ? `${number(clamp(packet.rotate, -3600, 3600))}deg` : undefined
  const scaleX = clamp(packet.scaleX, .01, 20), scaleY = clamp(packet.scaleY, .01, 20)
  const scale = Math.abs(scaleX - 1) > .0001 || Math.abs(scaleY - 1) > .0001
    ? (Math.abs(scaleX - scaleY) < .0001 ? number(scaleX, 3) : `${number(scaleX, 3)} ${number(scaleY, 3)}`)
    : undefined
  const skewX = clamp(packet.skewX, -89, 89), skewY = clamp(packet.skewY, -89, 89)
  const skew = Math.abs(skewX) > .0001 || Math.abs(skewY) > .0001
    ? `skew(${number(skewX)}deg, ${number(skewY)}deg)`
    : undefined
  return lines([rotate ? ['rotate', rotate] : null, scale ? ['scale', scale] : null, skew ? ['transform', skew] : null])
}
export function compileAlignmentPacket(packet: AlignmentPacket): string { const horizontal = packet.horizontal === 'start' ? 'flex-start' : packet.horizontal === 'end' ? 'flex-end' : packet.horizontal; const vertical = packet.vertical === 'start' ? 'flex-start' : packet.vertical === 'end' ? 'flex-end' : packet.vertical; return lines([packet.text ? ['text-align', packet.text] : null, horizontal ? ['justify-content', horizontal] : null, vertical ? ['align-items', vertical] : null]) }
export function compileLayoutPacket(packet: LayoutPacket): string {
  const flex = packet.display === 'flex' || packet.display === 'inline-flex'; const grid = packet.display === 'grid' || packet.display === 'inline-grid'; const active = flex || grid
  const justify = packet.justify === 'start' ? 'flex-start' : packet.justify === 'end' ? 'flex-end' : packet.justify; const align = packet.align === 'start' ? 'flex-start' : packet.align === 'end' ? 'flex-end' : packet.align
  const gridMin = packet.gridColumns?.mode === 'auto-fit' ? compileDimension(packet.gridColumns.min) : ''
  const columns = grid && packet.gridColumns?.mode === 'count' ? `repeat(${Math.round(clamp(packet.gridColumns.count, 1, 24))}, minmax(0, 1fr))`
    : grid && packet.gridColumns?.mode === 'auto-fit' && gridMin ? `repeat(auto-fit, minmax(${gridMin}, 1fr))` : undefined
  const gap = packet.gap ? compileDimension(packet.gap) : ''
  return lines([packet.display !== 'normal' ? ['display', packet.display] : null, flex && packet.direction ? ['flex-direction', packet.direction] : null, flex && packet.wrap ? ['flex-wrap', packet.wrap] : null, active && justify ? ['justify-content', justify] : null, active && align ? ['align-items', align] : null, active && gap ? ['gap', gap] : null, columns ? ['grid-template-columns', columns] : null])
}
export function compileLayoutItemPacket(packet: LayoutItemPacket): string {
  const fill = packet.sizeInParent === 'fill'; const fixed = packet.sizeInParent === 'fixed'
  const align = packet.alignSelf === 'start' ? 'flex-start' : packet.alignSelf === 'end' ? 'flex-end' : packet.alignSelf
  return lines([
    fill ? ['flex-grow', '1'] : packet.grow !== undefined ? ['flex-grow', number(clamp(packet.grow, 0, 100))] : null,
    fill ? ['flex-shrink', '1'] : packet.shrink !== undefined ? ['flex-shrink', number(clamp(packet.shrink, 0, 100))] : null,
    fill ? ['flex-basis', '0'] : fixed && packet.basis && compileDimension(packet.basis) ? ['flex-basis', compileDimension(packet.basis)] : null,
    align && align !== 'auto' ? ['align-self', align] : null,
    packet.order !== undefined && packet.order !== 0 ? ['order', number(clamp(packet.order, -10000, 10000), 0)] : null,
  ])
}
/** Compile friendly placement intent into broadly compatible logical CSS.
 * Horizontal auto margins work in normal block flow, Flex, and Grid. Grid's justify-self
 * is emitted as a harmless extra hint. Vertical alignment combines align-self with
 * logical auto margins; normal block flow may not have free vertical space to distribute. */
export function compilePlacementPacket(packet: PlacementPacket): string {
  const horizontal = packet.horizontal
  const vertical = packet.vertical
  const width = horizontal === 'stretch' ? '100%' : horizontal === 'native' ? undefined : 'fit-content'
  const marginInlineStart = horizontal === 'center' || horizontal === 'end' ? 'auto' : horizontal === 'start' || horizontal === 'stretch' ? '0' : undefined
  const marginInlineEnd = horizontal === 'center' || horizontal === 'start' ? 'auto' : horizontal === 'end' || horizontal === 'stretch' ? '0' : undefined
  const justifySelf = horizontal === 'native' ? undefined : horizontal
  const height = vertical === 'stretch' ? '100%' : undefined
  const marginBlockStart = vertical === 'center' || vertical === 'end' ? 'auto' : vertical === 'start' || vertical === 'stretch' ? '0' : undefined
  const marginBlockEnd = vertical === 'center' || vertical === 'start' ? 'auto' : vertical === 'end' || vertical === 'stretch' ? '0' : undefined
  const alignSelf = vertical === 'native' ? undefined : vertical
  return lines([
    width ? ['width', width] : null,
    marginInlineStart ? ['margin-inline-start', marginInlineStart] : null,
    marginInlineEnd ? ['margin-inline-end', marginInlineEnd] : null,
    justifySelf ? ['justify-self', justifySelf] : null,
    height ? ['height', height] : null,
    marginBlockStart ? ['margin-block-start', marginBlockStart] : null,
    marginBlockEnd ? ['margin-block-end', marginBlockEnd] : null,
    alignSelf ? ['align-self', alignSelf] : null,
  ])
}
export function compileSizePacket(packet: SizePacket): string {
  const dimension = (property: string, value: DimensionValue | undefined): [string, string] | null => { const compiled = value ? compileDimension(value) : ''; return compiled ? [property, compiled] : null }
  return lines([dimension('width', packet.width), dimension('height', packet.height), dimension('min-width', packet.minWidth), dimension('max-width', packet.maxWidth), dimension('min-height', packet.minHeight), dimension('max-height', packet.maxHeight), packet.aspectRatio ? ['aspect-ratio', `${number(packet.aspectRatio.width)} / ${number(packet.aspectRatio.height)}`] : null])
}

export function compileMediaFlowPacket(packet: MediaFlowPacket): string {
  if (packet.mode === 'native' && !packet.unclipped) return ''
  const full = packet.mode === 'full'
  const natural = packet.mode === 'natural' || full
  return lines([
    natural ? ['display', 'block'] : null,
    full ? ['width', '100%'] : null,
    natural ? ['max-width', '100%'] : null,
    natural ? ['height', 'auto'] : null,
    natural ? ['max-height', 'none'] : null,
    natural ? ['aspect-ratio', 'auto'] : null,
    natural ? ['float', 'none'] : null,
    natural ? ['clear', 'both'] : null,
    natural ? ['box-sizing', 'border-box'] : null,
    natural ? ['margin-inline', 'auto'] : null,
    packet.unclipped ? ['overflow', 'visible'] : null,
  ])
}

export function compileSvgAssetPacket(packet: SvgAssetPacket): string {
  // Replace mode is emitted by helper rules against the discovered nested SVG,
  // not against the semantic target's own box. Surface mode preserves the
  // original SVG Asset behavior used by ornaments and pseudo-planes.
  if (packet.targetMode === 'replace') return ''
  const svg = normalizeSvgSource(packet.svg)
  if (!svg) return ''
  const asset = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  const position = `${number(clamp(packet.positionX, 0, 100), 1)}% ${number(clamp(packet.positionY, 0, 100), 1)}%`
  if (packet.renderMode === 'image') return lines([
    ['background-image', asset], ['background-size', packet.fit], ['background-repeat', 'no-repeat'], ['background-position', position],
  ])
  return lines([
    ['background-color', colorWithAlpha(packet.color, clamp(packet.alpha, 0, 1))],
    ['-webkit-mask-image', asset], ['mask-image', asset],
    ['-webkit-mask-size', packet.fit], ['mask-size', packet.fit],
    ['-webkit-mask-repeat', 'no-repeat'], ['mask-repeat', 'no-repeat'],
    ['-webkit-mask-position', position], ['mask-position', position],
  ])
}

const packetOrder: StylePacket['type'][] = ['visibility', 'background', 'pattern', 'media-flow', 'image', 'mask', 'svg-asset', 'composer-icons', 'content', 'text', 'typography', 'text-entry', 'border', 'corners', 'spacing', 'shadow', 'glass', 'opacity', 'position', 'transform', 'alignment', 'layout-item', 'layout', 'placement', 'size']
function compilePacket(packet: StylePacket, all: StylePacket[]): string {
  let declaration = ''
  switch (packet.type) {
    case 'background': declaration = compileBackgroundPacket(packet); break
    case 'pattern': declaration = compilePatternPacket(packet); break
    case 'content': declaration = compileContentPacket(packet); break
    case 'text': declaration = compileTextPacket(packet); break
    case 'typography': declaration = compileTypographyPacket(packet); break
    case 'text-entry': declaration = compileTextEntryPacket(packet); break
    case 'border': declaration = compileSparseBorderPacket(packet); break
    case 'corners': declaration = compileCornersPacket(packet); break
    case 'spacing': declaration = compileSpacingPacket(packet); break
    case 'shadow': declaration = compileShadowPacket(packet); break
    case 'glass': declaration = compileGlassPacket(packet, { includeTint: !all.some((entry) => entry.type === 'background' || entry.type === 'pattern' || entry.type === 'text' && entry.colorMode === 'gradient'), includeBorder: !all.some((entry) => entry.type === 'border'), includeShadow: !all.some((entry) => entry.type === 'shadow') }); break
    case 'opacity': declaration = compileOpacityPacket(packet); break
    case 'visibility': declaration = compileVisibilityPacket(packet); break
    case 'media-flow': declaration = compileMediaFlowPacket(packet); break
    case 'image': declaration = compileImagePacket(packet); break
    case 'mask': declaration = compileMaskPacket(packet); break
    case 'svg-asset': declaration = compileSvgAssetPacket(packet); break
    case 'composer-icons': declaration = ''; break
    case 'position': declaration = compilePositionPacket(packet); break
    case 'transform': declaration = compileTransformPacket(packet); break
    case 'alignment': declaration = compileAlignmentPacket(packet); break
    case 'layout-item': declaration = compileLayoutItemPacket(packet); break
    case 'placement': declaration = compilePlacementPacket(packet); break
    case 'layout': declaration = compileLayoutPacket(packet); break
    case 'size': declaration = compileSizePacket(packet); break
  }
  return filterSparseDeclaration(packet, declaration)
}
function splitPseudoElement(selector: string): { base: string; pseudo: string } { const match = selector.match(/^(.*?)(::(?:before|after|placeholder))$/); return match ? { base: match[1], pseudo: match[2] } : { base: selector, pseudo: '' } }

// Strong means authoritative, not merely `!important`. Native Lumiverse themes and
// Quick Styles can also contain !important declarations; if both sides are important,
// selector specificity decides the winner and a freshly edited local target can still
// lose. Normalize every Strong selector to the same fixed artificial specificity so
// source order becomes deterministic: the latest Theme Studio override wins regardless
// of how complicated the source selector was. :where() deliberately zeros the original
// selector specificity while the impossible :not(#id) guards add a stable authority
// tier without changing which real elements match.
const AUTHORITY_GUARDS = ':not(#__theme_studio_authority_a__):not(#__theme_studio_authority_b__)'
export function authoritySelector(selector: string): string {
  return splitSelectorList(selector).map((branch) => {
    const { base, pseudo } = splitPseudoElement(branch)
    return `:where(${base})${AUTHORITY_GUARDS}${pseudo}`
  }).join(',\n')
}
function ruleSelector(selector: string, strength: 'normal' | 'strong'): string { return strength === 'strong' ? authoritySelector(selector) : selector }

function stateSelector(selector: string, state: StyleStateName): string {
  if (state === 'normal') return selector
  return splitSelectorList(selector).flatMap((branch) => {
    const { base, pseudo } = splitPseudoElement(branch)
    if (state === 'focusVisible') return [`${base}:focus-visible${pseudo}`]
    if (state === 'disabled') return [`${base}:disabled${pseudo}`, `${base}[aria-disabled="true"]${pseudo}`]
    return [`${base}:${state}${pseudo}`]
  }).join(',\n')
}
function previewSelector(selector: string, state: StyleStateName): string {
  return splitSelectorList(selector).map((branch) => { const { base, pseudo } = splitPseudoElement(branch); return `${base}[data-theme-studio-preview-state="${state}"]${pseudo}` }).join(',\n')
}
function strengthenDeclaration(line: string): string {
  const trimmed = line.trim()
  if (!trimmed || trimmed.endsWith('!important;') || !trimmed.endsWith(';') || !trimmed.includes(':')) return line
  return `${trimmed.slice(0, -1)} !important;`
}
const SLOT_LABELS: Record<StylePacket['type'], string> = {
  visibility: 'Visibility',
  background: 'Background',
  pattern: 'Pattern',
  'media-flow': 'Media Flow',
  image: 'Image',
  mask: 'Mask',
  'composer-icons': 'Composer Icons',
  'svg-asset': 'SVG Asset',
  content: 'Generated Content',
  text: 'Ink',
  typography: 'Typography',
  'text-entry': 'Text Entry',
  border: 'Border',
  corners: 'Corners',
  spacing: 'Spacing',
  shadow: 'Shadow',
  glass: 'Glass',
  opacity: 'Opacity',
  position: 'Position & Layer',
  transform: 'Transform',
  alignment: 'Alignment',
  'layout-item': 'Layout Item',
  placement: 'Quick Align',
  layout: 'Container Layout',
  size: 'Size',
}
function compileRule(selector: string, packets: StylePacket[], strength: 'normal' | 'strong' = 'normal'): string {
  const ordered = [...packets].sort((a, b) => packetOrder.indexOf(a.type) - packetOrder.indexOf(b.type))
  const declarations: string[] = []
  for (const packet of ordered) {
    const declaration = compilePacket(packet, ordered)
    if (declaration) declarations.push(declaration)
  }
  const compiledSelector = ruleSelector(selector, strength)
  return declarations.length ? [`${compiledSelector} {`, ...declarations.flatMap((declaration) => declaration.split('\n').map((line) => `  ${strength === 'strong' ? strengthenDeclaration(line) : line}`)), '}'].join('\n') : ''
}
function canonicalPacketSlots(packets: StylePacket[]): Array<{ key: string; label: string; packets: StylePacket[] }> {
  // Project state normally upserts one packet per semantic category already, but
  // the compiler is the final authority: stale/imported stacks can still contain
  // duplicates. Collapse them deterministically so one target/state/scope owns
  // exactly one generated slot per category. The last packet wins, mirroring the
  // normal cascade without growing new CSS strata.
  const latestByType = new Map<StylePacket['type'], StylePacket>()
  for (const packet of packets) latestByType.set(packet.type, packet)
  const ordered = [...latestByType.values()].sort((a, b) => packetOrder.indexOf(a.type) - packetOrder.indexOf(b.type))
  const background = ordered.find((packet): packet is BackgroundPacket => packet.type === 'background')
  const pattern = ordered.find((packet): packet is PatternPacket => packet.type === 'pattern')
  const composePaint = Boolean(background && pattern && (background as StylePacket).editedFields === undefined && (pattern as StylePacket).editedFields === undefined)
  const slots: Array<{ key: string; label: string; packets: StylePacket[] }> = []
  if (composePaint && background && pattern) {
    slots.push({ key: 'paint', label: 'Background + Pattern', packets: [background, pattern] })
  }
  for (const packet of ordered) {
    if (composePaint && (packet.type === 'background' || packet.type === 'pattern')) continue
    slots.push({ key: packet.type, label: SLOT_LABELS[packet.type], packets: [packet] })
  }
  return slots
}
function generatedContentSelector(selector: string): string {
  // CSS `content` is consistently useful on generated pseudo-surfaces, not on
  // ordinary elements in Chromium. When a user adds Generated Content directly
  // to a real element, Palette treats it as a visual ::after skin while leaving
  // the real element as the semantic/layout target. Explicit pseudo targets stay
  // exactly where the user put them.
  return splitSelectorList(selector).map((branch) => {
    const trimmed = branch.trim()
    const { pseudo } = splitPseudoElement(trimmed)
    return pseudo ? trimmed : `${trimmed}::after`
  }).join(',\n')
}
function compileCanonicalSlot(selector: string, slot: { key: string; label: string; packets: StylePacket[] }, strength: 'normal' | 'strong'): string {
  if (slot.key === 'paint' && slot.packets.length === 2) {
    const background = slot.packets.find((packet): packet is BackgroundPacket => packet.type === 'background')
    const pattern = slot.packets.find((packet): packet is PatternPacket => packet.type === 'pattern')
    if (background && pattern) {
      const declaration = compileBackgroundAndPattern(background, pattern)
      const compiledSelector = ruleSelector(selector, strength)
      return declaration ? [`/* Slot · ${slot.label} */`, `${compiledSelector} {`, ...declaration.split('\n').map((line) => `  ${strength === 'strong' ? strengthenDeclaration(line) : line}`), '}'].join('\n') : ''
    }
  }
  const slotSelector = slot.key === 'content' ? generatedContentSelector(selector) : selector
  const rule = compileRule(slotSelector, slot.packets, strength)
  return rule ? `/* Slot · ${slot.label} */\n${rule}` : ''
}
function compileCanonicalSlots(selector: string, packets: StylePacket[], strength: 'normal' | 'strong' = 'normal'): string[] {
  return canonicalPacketSlots(packets).map((slot) => compileCanonicalSlot(selector, slot, strength)).filter(Boolean)
}
export interface PreviewCompileOptions { forcedOverrideId?: string; forcedState?: Exclude<StyleStateName, 'normal'>; forcedScope?: ResponsiveScopeName; includeBoost?: boolean }
function importantValue(value: string, strength: 'normal' | 'strong'): string { return strength === 'strong' ? `${value} !important` : value }
function surfaceSupportRule(selector: string, strength: 'normal' | 'strong' = 'normal', packets: StylePacket[] = []): string {
  const branches = splitSelectorList(selector).map((branch) => splitPseudoElement(branch))
  if (!branches.length || branches.some((branch) => !branch.pseudo)) return ''
  const supportBase = ruleSelector(branches.map((branch) => branch.base).join(',\n'), strength)
  const supportSurface = ruleSelector(selector, strength)
  // Frame-like pseudo surfaces want inset:0. Decorative planes with an authored
  // anchored Position packet need free edges so top/right/bottom/left actually
  // move the ornament instead of fighting the default inset on every side.
  const positionedPlane = packets.some((packet) => packet.type === 'position' && packet.mode === 'anchored')
  const negativePlane = packets.some((packet) => packet.type === 'position' && packet.layer === 'custom' && (packet.zIndex ?? 0) < 0)
  const inset = positionedPlane ? 'auto' : '0'
  return [`${supportBase} {`, `  position: ${importantValue('relative', strength)};`, negativePlane ? `  isolation: ${importantValue('isolate', strength)};` : '', '}', `${supportSurface} {`, `  content: ${importantValue('""', strength)};`, `  position: ${importantValue('absolute', strength)};`, `  inset: ${importantValue(inset, strength)};`, `  border-radius: ${importantValue('inherit', strength)};`, `  pointer-events: ${importantValue('none', strength)};`, '}'].filter(Boolean).join('\n')
}


const COMPOSER_ICON_BODIES: Record<(typeof COMPOSER_ICON_ACTIONS)[number], string> = {
  home: '<path d="M4 10.5 12 4l8 6.5v8.5h-5v-5H9v5H4Z"/>',
  regen: '<path d="M19 8a7 7 0 1 0 1 7"/><path d="M19 3v5h-5"/>',
  continue: '<path d="M5 12h12"/><path d="m13 7 5 5-5 5"/>',
  oneliner: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h8M8 14h5"/>',
  persona: '<circle cx="12" cy="8" r="3.3"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/>',
  connections: '<path d="M9.5 14.5 7 17a3 3 0 0 1-4.2-4.2l3.5-3.5a3 3 0 0 1 4.2 0"/><path d="m14.5 9.5 2.5-2.5a3 3 0 0 1 4.2 4.2l-3.5 3.5a3 3 0 0 1-4.2 0"/><path d="m9 15 6-6"/>',
  altFields: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="11" cy="18" r="1.5"/>',
  addons: '<path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4z"/><path d="M16.5 14v5M14 16.5h5"/>',
  promptVariables: '<path d="M6 5h12v14H6z"/><path d="M9 9h6M9 13h4"/><path d="M15.5 15.5 19 19"/>',
  guides: '<path d="M12 3 8.5 10 12 21l3.5-11Z"/><circle cx="12" cy="10" r="1.4"/>',
  quickReplies: '<path d="M4 5h16v11H9l-5 4Z"/><path d="M8 9h8M8 12h5"/>',
  tools: '<path d="M14.5 5.2a5 5 0 0 0-5.7 6.6L4 16.6 7.4 20l4.8-4.8a5 5 0 0 0 6.6-5.7l-3.4 3.4-3-3Z"/>',
  extras: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
  selectMessages: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="m8.5 9 1.5 1.5L13 7.5M8.5 15 10 16.5l3-3"/>',
}
export function composerIconSvgDataUri(family: ComposerIconsPacket['family'], action: (typeof COMPOSER_ICON_ACTIONS)[number]): string {
  const body = COMPOSER_ICON_BODIES[action]
  const familyAccent = family === 'manga'
    ? '<path d="M2.5 2.5h4M2.5 2.5v4M21.5 21.5h-4M21.5 21.5v-4"/>'
    : family === 'editorial'
      ? '<path d="M5 22h14"/>'
      : family === 'journal'
        ? '<path d="M4 21c5-1 11-1 16 0"/>'
        : family === 'visual-novel'
          ? '<path d="M3 7V3h4M17 3h4v4M21 17v4h-4"/>'
          : ''
  const strokeWidth = family === 'manga' ? '2.15' : family === 'editorial' ? '1.35' : family === 'journal' ? '1.75' : '1.55'
  const linecap = family === 'manga' ? 'square' : 'round'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="${linecap}" stroke-linejoin="round">${body}${familyAccent}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
function composerIconRules(selector: string, packet: ComposerIconsPacket, strength: 'normal' | 'strong'): string {
  const custom = packet.customIcons ?? {}
  const scopedMatch = selector.match(/\[data-composer-action=["']([^"']+)["']\]\[data-toolbar-action=["']\1["']\]/)
  const scopedAction = scopedMatch && (COMPOSER_ICON_ACTIONS as readonly string[]).includes(scopedMatch[1]) ? scopedMatch[1] as (typeof COMPOSER_ICON_ACTIONS)[number] : null
  const replaceActions = (scopedAction ? [scopedAction] : [...COMPOSER_ICON_ACTIONS]).filter((action) => packet.family !== 'native' || Boolean(normalizeSvgSource(custom[action])))
  if (!replaceActions.length) return ''
  const size = number(clamp(packet.size, 8, 32), 1)
  const buttonFor = (action: (typeof COMPOSER_ICON_ACTIONS)[number]) => scopedAction ? `${selector} > button` : `${selector} [data-composer-action="${action}"][data-toolbar-action="${action}"] > button`
  const buttons = replaceActions.map(buttonFor)
  const svgs = buttons.map((button) => `${button} svg`).join(',\n')
  const pseudos = buttons.map((button) => `${button}::before`).join(',\n')
  const rules: string[] = [
    `/* Composer icon family · ${packet.family}${Object.keys(custom).length ? ' + saved overrides' : ''} */`,
    `${ruleSelector(svgs, strength)} {\n  display: ${importantValue('none', strength)};\n}`,
    `${ruleSelector(pseudos, strength)} {\n  content: ${importantValue('\"\"', strength)};\n  display: ${importantValue('block', strength)};\n  width: ${importantValue(`${size}px`, strength)};\n  height: ${importantValue(`${size}px`, strength)};\n  flex: ${importantValue('0 0 auto', strength)};\n  background-color: ${importantValue('currentColor', strength)};\n  -webkit-mask-size: ${importantValue('contain', strength)};\n  mask-size: ${importantValue('contain', strength)};\n  -webkit-mask-repeat: ${importantValue('no-repeat', strength)};\n  mask-repeat: ${importantValue('no-repeat', strength)};\n  -webkit-mask-position: ${importantValue('center', strength)};\n  mask-position: ${importantValue('center', strength)};\n}`,
  ]
  for (const action of replaceActions) {
    const pseudo = `${buttonFor(action)}::before`
    const saved = normalizeSvgSource(custom[action])
    const asset = saved ? `data:image/svg+xml,${encodeURIComponent(saved)}` : composerIconSvgDataUri(packet.family, action)
    rules.push(`${ruleSelector(pseudo, strength)} {\n  -webkit-mask-image: ${importantValue(`url("${asset}")`, strength)};\n  mask-image: ${importantValue(`url("${asset}")`, strength)};\n}`)
  }
  return rules.join('\n')
}

function svgReplacementSelector(selector: string, packet: SvgAssetPacket): string {
  const path = normalizeSvgTargetPath(packet.svgPath) ?? 'svg'
  if (path === ':self') return selector
  return splitSelectorList(selector).map((branch) => `${branch.trim()} ${path}`).join(',\n')
}
function svgReplacementDescendants(selector: string): string {
  return splitSelectorList(selector).map((branch) => `${branch.trim()} *`).join(',\n')
}
function svgReplacementRules(selector: string, packet: SvgAssetPacket, strength: 'normal' | 'strong'): string {
  if (packet.targetMode !== 'replace' || !ownsField(packet, 'svg', 'targetMode', 'svgPath', 'renderMode', 'colorMode', 'color', 'alpha', 'fit', 'positionX', 'positionY', 'size', 'rotate')) return ''
  const svg = normalizeSvgSource(packet.svg)
  if (!svg) return ''
  const target = svgReplacementSelector(selector, packet)
  const descendants = svgReplacementDescendants(target)
  const encoded = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  const position = `${number(clamp(packet.positionX, 0, 100), 1)}% ${number(clamp(packet.positionY, 0, 100), 1)}%`
  const alpha = clamp(packet.alpha, 0, 1)
  const inheritedColor = alpha >= .999 ? 'currentColor' : `color-mix(in srgb, currentColor ${number(alpha * 100, 1)}%, transparent)`
  const stencilColor = packet.colorMode === 'inherit' ? inheritedColor : colorWithAlpha(packet.color, alpha)
  const size = packet.size === undefined ? '' : `${number(clamp(packet.size, 4, 512), 1)}px`
  const rotate = number(packet.rotate ?? 0, 1)
  const declarations = packet.renderMode === 'image'
    ? [
        ['background-color', 'transparent'], ['background-image', encoded], ['background-size', packet.fit], ['background-repeat', 'no-repeat'], ['background-position', position],
        ['-webkit-mask-image', 'none'], ['mask-image', 'none'],
      ] as Array<[string, string]>
    : [
        ['background-image', 'none'], ['background-color', stencilColor],
        ['-webkit-mask-image', encoded], ['mask-image', encoded], ['-webkit-mask-size', packet.fit], ['mask-size', packet.fit],
        ['-webkit-mask-repeat', 'no-repeat'], ['mask-repeat', 'no-repeat'], ['-webkit-mask-position', position], ['mask-position', position],
      ] as Array<[string, string]>
  if (size) declarations.push(['width', size], ['height', size], ['flex', `0 0 ${size}`])
  if (rotate !== '0') declarations.push(['rotate', `${rotate}deg`])
  declarations.push(['fill', 'transparent'], ['stroke', 'transparent'])
  const body = declarations.map(([property, value]) => `  ${property}: ${importantValue(value, strength)};`).join('\n')
  return [
    `/* SVG/Icon replacement · ${(packet.svgLabel ?? packet.assetName ?? 'nested SVG').replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ').slice(0, 120)} */`,
    `${ruleSelector(target, strength)} {\n${body}\n}`,
    `${ruleSelector(descendants, strength)} {\n  opacity: ${importantValue('0', strength)};\n  fill: ${importantValue('transparent', strength)};\n  stroke: ${importantValue('transparent', strength)};\n}`,
  ].join('\n')
}

function helperRulesForPackets(selector: string, packets: StylePacket[], strength: 'normal' | 'strong' = 'normal'): string[] {
  const rules: string[] = []
  for (const packet of packets) {
    if (packet.type === 'svg-asset' && packet.targetMode === 'replace') { const rule = svgReplacementRules(selector, packet, strength); if (rule) rules.push(rule) }
    if (packet.type === 'composer-icons' && ownsField(packet, 'family', 'customIcons')) { const rule = composerIconRules(selector, packet, strength); if (rule) rules.push(rule) }
    if (packet.type === 'background' && packet.mode === 'image' && packet.image.renderMode === 'mask' && packet.image.hideContents) {
      rules.push([`/* Mask replacement · hide native contents */`, `${ruleSelector(`${selector} > *`, strength)} {`, `  display: ${importantValue('none', strength)};`, '}'].join('\n'))
    }
    if (packet.type === 'position' && packet.mode === 'anchored' && packet.anchorSelector?.trim() && ownsField(packet, 'mode', 'anchorSelector', 'anchorLabel')) {
      // Anchoring only needs a containing block fallback. Keep this deliberately
      // low-specificity and non-important so it cannot overwrite an anchor's own
      // authored absolute/sticky/fixed Position packet when anchors are nested.
      const anchorSelector = splitSelectorList(packet.anchorSelector).map((branch) => `:where(${branch.trim()})`).join(',\n')
      rules.push([`/* Position anchor · ${packet.anchorLabel ?? 'ancestor'} */`, `${anchorSelector} {`, '  position: relative;', '}'].join('\n'))
    }
    if (packet.type === 'text-entry') {
      const roots = [...new Set(splitSelectorList(selector).map((branch) => branch.match(/^(.*?\[data-component=["']InputArea["']\])/i)?.[1]?.trim()).filter((entry): entry is string => Boolean(entry)))]
      if (roots.length) {
        const mirrorDeclaration = filterSparseDeclaration(packet, compileTextEntryPacket(packet))
        if (mirrorDeclaration) {
          const mirrorSelector = roots.map((root) => `${root} [class*="_textareaMirror_"]`).join(',\n')
          rules.push([`/* Text Entry mirror sync · keep autosize metrics honest */`, `${ruleSelector(mirrorSelector, strength)} {`, ...mirrorDeclaration.split('\n').map((line) => `  ${strength === 'strong' ? strengthenDeclaration(line) : line}`), '}'].join('\n'))
        }
        const placeholderDeclaration = compileTextEntryPlaceholderPacket(packet)
        if (placeholderDeclaration) {
          const placeholderSelector = splitSelectorList(selector).map((branch) => `${splitPseudoElement(branch).base}::placeholder`).join(',\n')
          rules.push([`/* Text Entry placeholder appearance */`, `${ruleSelector(placeholderSelector, strength)} {`, ...placeholderDeclaration.split('\n').map((line) => `  ${strength === 'strong' ? strengthenDeclaration(line) : line}`), '}'].join('\n'))
        }
      }
    }
    if (packet.type === 'size' && packet.boundary?.selector?.trim() && ownsField(packet, 'boundary', 'width', 'maxWidth')) rules.push([`/* Responsive size boundary · ${packet.boundary.label} */`, `${ruleSelector(packet.boundary.selector, strength)} {`, `  container-type: ${importantValue('inline-size', strength)};`, '}'].join('\n'))
  }
  return rules
}
function mobileSafetyRule(selector: string, packets: StylePacket[], strength: 'normal' | 'strong' = 'normal'): string {
  const size = packets.find((packet): packet is SizePacket => packet.type === 'size')
  if (!size?.mobileSafe || ((size as StylePacket).editedFields !== undefined && !ownsField(size, 'mobileSafe', 'width', 'height'))) return ''
  const entries: Array<[string, string] | null> = []
  if (size.width?.mode === 'fixed') entries.push(['width', `min(${compileDimension(size.width)}, calc(100vw - 24px))`], ['max-width', 'calc(100vw - 24px)'])
  if (size.height?.mode === 'fixed') entries.push(['height', `min(${compileDimension(size.height)}, calc(100dvh - 24px))`], ['max-height', 'calc(100dvh - 24px)'])
  const declarations = lines(entries)
  return declarations ? ['@media (max-width: 720px) {', `  ${ruleSelector(selector, strength)} {`, ...declarations.split('\n').map((line) => `    ${strength === 'strong' ? strengthenDeclaration(line) : line}`), '  }', '}'].join('\n') : ''
}
function indentBlock(value: string, spaces = 2): string {
  const pad = ' '.repeat(spaces)
  return value.split('\n').map((line) => line ? `${pad}${line}` : line).join('\n')
}
const GLOBAL_TARGET_LABEL_RE = /\b(similar|everywhere|global|all similar)\b/i
const LOCAL_MODULE_SELECTOR_RE = /\[class\*=["']_[A-Za-z][A-Za-z0-9_-]*?_["']\]/
function messageContextFromTarget(target: StudioTarget): string | undefined {
  const explicit = target.nativeContextSelector?.trim() ?? ''
  // A nativeContextSelector is not automatically a message context. V27.4-era
  // safety code accidentally treated App/Badge/ChatView context metadata as if it
  // were BubbleMessage/MinimalMessage ownership and prepended that context again at
  // compile time. That is how `App > Avatar > img` became `App > App > Avatar > img`.
  if (/\[data-component=["']BubbleMessage["']\]/i.test(explicit)) return explicit
  if (/\[data-component=["']MinimalMessage["']\]/i.test(explicit)) return explicit
  const native = target.nativeComponentId ?? ''
  if (/BubbleMessage/i.test(native)) return '[data-component="BubbleMessage"]'
  if (/MinimalMessage/i.test(native)) return '[data-component="MinimalMessage"]'
  return undefined
}
export function compileSafeTargetSelector(target: StudioTarget): string | null {
  // Treat saved context/local metadata as the canonical decomposition before any
  // safety guards run. This makes the compiler/runtime self-healing even before a
  // migrated project is re-saved: `App > App > Avatar > img` becomes
  // `App > Avatar > img`, which also lets Full Source find the mounted image.
  const selector = canonicalizeSavedContextSelector(target.selector, target.nativeContextSelector, target.localSelector)
  if (!selector || target.source !== 'native-aware' || GLOBAL_TARGET_LABEL_RE.test(target.label ?? '') || !LOCAL_MODULE_SELECTOR_RE.test(selector)) return selector
  // `App > Avatar` is not meaningful ownership: `_avatar_` exists in messages,
  // character/persona cards, profile surfaces, and more. Older Theme Studio picks
  // could therefore resize every avatar in Lumiverse. New picks retain a nearby
  // module ancestor; quarantine the historical two-segment App form so it cannot
  // keep poisoning message avatars. The explicit Similar/everywhere scope remains
  // the escape hatch for intentionally global edits.
  const nativeContext = target.nativeContextSelector?.trim() ?? ''
  const local = target.localSelector?.trim() ?? ''
  const appOwned = /(?:^|[\/:_-])App(?:$|[\/:_-])/i.test(target.nativeComponentId ?? '') || /\[class\*=["']_app_["']\]/i.test(nativeContext)
  const broadAppAvatar = /^\[class\*=["']_app_["']\]\s+\[class\*=["']_avatar_["']\]$/i.test(selector)
  const avatarLeaf = /^\[class\*=["']_avatar_["']\]$/i.test(local)
  if (appOwned && (broadAppAvatar || (avatarLeaf && selector === `${nativeContext} ${local}`.trim()))) return null
  const branches = splitSelectorList(selector)
  const bare = branches.filter((branch) => LOCAL_MODULE_SELECTOR_RE.test(branch) && !/\[data-component=["'](?:BubbleMessage|MinimalMessage)["']\]/i.test(branch))
  if (!bare.length) return selector
  const context = messageContextFromTarget(target)
  if (!context) {
    // V27.4 quarantined every native-aware CSS-module selector whose component was
    // not BubbleMessage/MinimalMessage. That stopped the avatar leak, but also made
    // perfectly valid native targets such as ChatView's Bar Wrapper and Chat Toolbar
    // impossible to style. Non-message native ownership is already a real scope
    // signal; let those selectors compile normally. Only metadata-dead native-aware
    // orphans fail closed, because those are the historical selectors that can no
    // longer prove where they belong.
    const hasNativeOwnership = Boolean(target.nativeComponentId?.trim() || target.nativeContextSelector?.trim())
    return hasNativeOwnership ? selector : null
  }
  // Message-local rules keep the stricter invariant: a CSS-module selector that is
  // known to belong to BubbleMessage/MinimalMessage is always re-rooted under that
  // message component before it can reach the stylesheet.
  return branches.map((branch) => {
    const trimmed = branch.trim()
    if (!LOCAL_MODULE_SELECTOR_RE.test(trimmed) || /\[data-component=["'](?:BubbleMessage|MinimalMessage)["']\]/i.test(trimmed)) return trimmed
    return `${context} ${trimmed}`
  }).join(',\n')
}
function compileScopedStateStacks(
  override: ComponentOverride,
  stacks: StatePacketStacks,
  scope: ResponsiveScopeName,
  preview: PreviewCompileOptions,
  inheritedSurfacePackets: StylePacket[] = [],
): string[] {
  const strength = override.target.overrideStrength ?? 'normal'
  const rules: string[] = []
  const allPackets = STYLE_STATES.flatMap((state) => stacks[state] ?? [])
  const needsSurfaceSupport = allPackets.some((packet) => packet.editedFields === undefined)
  // Responsive scopes inherit Base positioning in CSS. Pseudo-surface scaffolding
  // must make the same assumption: otherwise a Mobile paint/size-only override
  // re-emits `inset: 0`, clobbering an inherited anchored top/bottom plane and
  // collapsing both VN corner caps onto the top edge. Only Position affects the
  // scaffold geometry, so inherit that semantic signal without duplicating slots.
  const localPositions = allPackets.filter((packet) => packet.type === 'position')
  const inheritedPositions = localPositions.length
    ? []
    : inheritedSurfacePackets.filter((packet) => packet.type === 'position')
  const surfacePackets = [...allPackets, ...inheritedPositions]
  const surfaceRule = needsSurfaceSupport ? surfaceSupportRule(override.target.selector, strength, surfacePackets) : ''
  if (surfaceRule) rules.push(surfaceRule)
  const helpers = new Set<string>()
  for (const state of STYLE_STATES) {
    const packets = stacks[state] ?? []
    if (!packets.length) continue
    const canonical = stateSelector(override.target.selector, state)
    for (const helper of helperRulesForPackets(canonical, packets, strength)) helpers.add(helper)
    const forcedScope = preview.forcedScope ?? 'base'
    const selector = preview.forcedOverrideId === override.id && preview.forcedState === state && forcedScope === scope
      ? `${canonical},\n${previewSelector(override.target.selector, state)}`
      : canonical
    rules.push(...compileCanonicalSlots(selector, packets, strength))
    if (scope === 'base') {
      const mobile = mobileSafetyRule(canonical, packets, strength)
      if (mobile) rules.push(mobile)
    }
    const size = packets.find((packet): packet is SizePacket => packet.type === 'size')
    if (size?.boundary && ownsField(size, 'boundary', 'width', 'maxWidth')) {
      const important = override.target.overrideStrength === 'strong' ? ' !important' : ''
      const boundaryLines = [`${ruleSelector(canonical, strength)} {`]
      if (size.width?.mode === 'parent') boundaryLines.push(`  width: 100cqw${important};`)
      boundaryLines.push(`  max-width: 100cqw${important};`, `  box-sizing: border-box${important};`, '}')
      rules.push(`/* Slot · Responsive boundary */\n${boundaryLines.join('\n')}`)
    }
  }
  return [...helpers, ...rules]
}
export function compileComponentOverride(override: ComponentOverride, preview: PreviewCompileOptions = {}): string {
  const safeSelector = compileSafeTargetSelector(override.target)
  if (!safeSelector) return ''
  const compiledOverride = safeSelector === override.target.selector ? override : { ...override, target: { ...override.target, selector: safeSelector } }
  const label = compiledOverride.target.source === 'dom-scoped'
    ? `DOM target · ${compiledOverride.target.label ?? compiledOverride.target.selector}`
    : `${compiledOverride.target.nativeComponentId ?? 'Native target'} · ${compiledOverride.target.label ?? 'selection'}`
  const sections: string[] = []

  const baseSurfacePackets = STYLE_STATES.flatMap((state) => compiledOverride.states[state] ?? [])
  const baseRules = compileScopedStateStacks(compiledOverride, compiledOverride.states, 'base', preview)
  if (baseRules.length) sections.push(`/* Scope · Base */\n${baseRules.join('\n')}`)

  const mobileStates = compiledOverride.mobileStates
  if (mobileStates && STYLE_STATES.some((state) => mobileStates[state]?.length)) {
    const mobileRules = compileScopedStateStacks(compiledOverride, mobileStates, 'mobile', preview, baseSurfacePackets)
    if (mobileRules.length) {
      sections.push([
        `/* Scope · Mobile ≤ ${MOBILE_BREAKPOINT_PX}px */`,
        `@media (max-width: ${MOBILE_BREAKPOINT_PX}px) {`,
        indentBlock(mobileRules.join('\n'), 2),
        '}',
      ].join('\n'))
    }
  }

  return sections.length ? [`/* ${label} · canonical style slots */`, ...sections].join('\n') : ''
}

function groupMemberSelector(group: LayoutGroup): string {
  return group.members.flatMap((member) => {
    const selector = compileSafeTargetSelector(member.target)
    return selector ? splitSelectorList(selector) : []
  }).join(',\n')
}

const GROUP_CONTENT_SUFFIX = {
  icons: ':is(svg,[data-icon],[class*="_icon_"],[class*="_Icon_"])',
  text: ':is(h1,h2,h3,h4,h5,h6,p,span,label,strong,em,small,[class*="_text_"],[class*="_label_"],[class*="_title_"],[class*="_name_"])',
  buttons: ':is(button,[role="button"],[class*="_button_"],[class*="_btn_"])',
  images: ':is(img,picture,video,[class*="_image_"],[class*="_img_"])',
} as const

function groupContentSelector(group: LayoutGroup, target: keyof typeof GROUP_CONTENT_SUFFIX): string {
  const suffix = GROUP_CONTENT_SUFFIX[target]
  return group.members.flatMap((member) => {
    const selector = compileSafeTargetSelector(member.target)
    return selector ? splitSelectorList(selector).map((branch) => `${branch} ${suffix}`) : []
  }).join(',\n')
}

function compileGroupPacketSet(selector: string, packets: StylePacket[], label: string): string {
  if (!selector || !packets.length) return ''
  const rules = compileCanonicalSlots(selector, packets, 'strong')
  return rules.length ? [`/* Group ${label} */`, ...rules].join('\n') : ''
}

function compileLayoutGroupState(group: LayoutGroup, state: LayoutGroupState, frameActive = false): string {
  const parent = compileSafeTargetSelector(group.parent)
  const members = group.members.map((member) => ({ member, selector: compileSafeTargetSelector(member.target) })).filter((entry): entry is { member: LayoutGroup['members'][number]; selector: string } => Boolean(entry.selector))
  if (!parent || members.length < 2) return ''
  const columns = state.mode === 'column' ? 1 : state.mode === 'row' ? members.length : Math.max(1, Math.min(12, Math.round(state.columns)))
  const rows = Math.max(1, Math.ceil(members.length / columns))
  const gap = compileDimension(state.gap) || '0px'
  const justifyMap: Record<LayoutGroupState['justify'], string> = { stretch: 'stretch', start: 'start', center: 'center', end: 'end' }
  const alignMap: Record<LayoutGroupState['align'], string> = { stretch: 'stretch', start: 'start', center: 'center', end: 'end' }
  const parentRule = [
    `${ruleSelector(parent, 'strong')} {`,
    `  display: grid !important;`,
    `  grid-template-columns: repeat(${columns}, minmax(0, 1fr)) !important;`,
    `  gap: ${gap} !important;`,
    `  justify-items: ${justifyMap[state.justify]} !important;`,
    `  align-items: ${alignMap[state.align]} !important;`,
    '}',
  ].join('\n')
  const siblingRule = state.otherSiblings === 'full-width'
    ? [`${ruleSelector(`${parent} > *`, 'strong')} {`, '  grid-column: 1 / -1 !important;', '}'].join('\n')
    : ''
  const memberRules = members.map(({ member, selector }, index) => {
    const row = Math.floor(index / columns) + 1
    const column = (index % columns) + 1
    return [
      `/* Group member · ${member.label} */`,
      `${ruleSelector(selector, 'strong')} {`,
      frameActive ? `  grid-column: ${column} !important;` : '  grid-column: auto !important;',
      frameActive ? `  grid-row: ${row} !important;` : '',
      '  min-width: 0 !important;',
      '}',
    ].filter(Boolean).join('\n')
  }).join('\n')
  const frameGeometry = frameActive ? [
    '/* Group frame geometry */',
    `${ruleSelector(`${parent}::before`, 'strong')} {`,
    '  content: "" !important;',
    '  pointer-events: none !important;',
    '  display: block !important;',
    '  grid-column: 1 / -1 !important;',
    `  grid-row: 1 / span ${rows} !important;`,
    '  align-self: stretch !important;',
    '  justify-self: stretch !important;',
    '  min-width: 0 !important;',
    '}',
  ].join('\n') : ''
  return [parentRule, siblingRule, frameGeometry, memberRules].filter(Boolean).join('\n')
}

function compileLayoutGroupStyleBucket(group: LayoutGroup, bucket: NonNullable<LayoutGroup['styles']>['base']): string {
  const sections: string[] = []
  const memberSelector = groupMemberSelector(group)
  const members = compileGroupPacketSet(memberSelector, bucket.members, 'members')
  if (members) sections.push(members)
  for (const target of ['icons','text','buttons','images'] as const) {
    const packets = bucket.contents[target] ?? []
    const compiled = compileGroupPacketSet(groupContentSelector(group, target), packets, `contents · ${target}`)
    if (compiled) sections.push(compiled)
  }
  const parent = compileSafeTargetSelector(group.parent)
  const frame = parent ? compileGroupPacketSet(`${parent}::before`, bucket.frame, 'frame') : ''
  if (frame) sections.push(frame)
  return sections.join('\n')
}

export function compileLayoutGroup(group: LayoutGroup): string {
  if (group.members.length < 2) return ''
  const baseStyles = group.styles?.base
  const base = compileLayoutGroupState(group, group.base, Boolean(baseStyles?.frame.length))
  if (!base) return ''
  const basePaint = baseStyles ? compileLayoutGroupStyleBucket(group, baseStyles) : ''
  const sections = [`/* Layout Group · ${group.name} · ${group.members.length} members */`, `/* Scope · Base */\n${[base, basePaint].filter(Boolean).join('\n')}`]
  if (group.mobile || group.styles?.mobile) {
    const mobileState = group.mobile ?? group.base
    const mobile = compileLayoutGroupState(group, mobileState, Boolean(group.styles?.base.frame.length || group.styles?.mobile?.frame.length))
    const mobilePaint = group.styles?.mobile ? compileLayoutGroupStyleBucket(group, group.styles.mobile) : ''
    const compiled = [mobile, mobilePaint].filter(Boolean).join('\n')
    if (compiled) sections.push([`/* Scope · Mobile ≤ ${MOBILE_BREAKPOINT_PX}px */`, `@media (max-width: ${MOBILE_BREAKPOINT_PX}px) {`, indentBlock(compiled, 2), '}'].join('\n'))
  }
  return sections.join('\n')
}

function escapeCssString(value: string): string { return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/[\r\n]/g, ' ') }
function fontFormat(path: string): string | null { const extension = path.split(/[?#]/)[0].split('.').pop()?.toLowerCase(); return extension === 'woff2' ? 'woff2' : extension === 'woff' ? 'woff' : extension === 'ttf' ? 'truetype' : extension === 'otf' ? 'opentype' : null }
export function compileFontFace(font: StudioFontFace): string {
  const format = fontFormat(font.source.path); const path = font.source.path.trim()
  if (!font.family.trim() || !path || /["'(){};]/.test(path) || !format) return ''
  return ['@font-face {', `  font-family: "${escapeCssString(font.family)}";`, `  src: url("${path}") format("${format}");`, `  font-weight: ${safe(String(font.weight ?? 400), '400')};`, `  font-style: ${font.style ?? 'normal'};`, `  font-display: ${font.display ?? 'swap'};`, '}'].join('\n')
}
export function compileTokenOverrides(tokens: ThemeTokenOverride[]): string { const valid = tokens.filter((token) => /^--[a-zA-Z0-9_-]+$/.test(token.variable) && token.value.trim()); return valid.length ? ['/* Global theme tokens */', ':root {', ...valid.map((token) => `  ${token.variable}: ${safe(token.value, 'initial')};`), '}'].join('\n') : '' }
export function compileBoost(project: ThemeStudioProject, nativeVariables: Record<string, string> = {}): string {
  const declarations = Object.entries(deriveBoostTokenOverrides(project.boost, nativeVariables)).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `  ${name}: ${safe(value, 'initial')};`)
  return declarations.length ? ['/* Application-wide Palette Boost */', ':root {', ...declarations, '}'].join('\n') : ''
}
export function compileThemeGlobalLayers(project: ThemeStudioProject, nativeVariables: Record<string, string> = {}, includeBoost = false): string {
  return [...project.fonts.map(compileFontFace), includeBoost ? compileBoost(project, nativeVariables) : '', compileTokenOverrides(project.tokens)].filter(Boolean).join('\n\n')
}
function compileProject(project: ThemeStudioProject, preview: PreviewCompileOptions, nativeVariables: Record<string, string> = {}): string {
  const sections = [compileThemeGlobalLayers(project, nativeVariables, preview.includeBoost === true), ...project.componentOverrides.map((override) => compileComponentOverride(override, preview)), ...project.layoutGroups.map((group) => compileLayoutGroup(group))].filter(Boolean)
  return sections.length ? `/* Generated by Palette · ${project.name} */\n\n${sections.join('\n\n')}\n` : `/* Generated by Palette · ${project.name}\n   Add a visual style packet to produce CSS. */\n`
}
/** Canonical exportable CSS never contains preview-state debug markers. */
export function compileThemeProject(project: ThemeStudioProject, nativeVariables: Record<string, string> = {}): string { return compileProject(project, {}, nativeVariables) }
export function compilePreviewThemeProject(project: ThemeStudioProject, options: PreviewCompileOptions = {}, nativeVariables: Record<string, string> = {}): string { return compileProject(project, options, nativeVariables) }
export interface CompiledTheme { css: string; customCss: string; assets: ThemeStudioProject['assets']; tokenOverrides: ThemeStudioProject['tokens']; metadata: { name: string } }
export function compileTheme(project: ThemeStudioProject, nativeVariables: Record<string, string> = {}): CompiledTheme { return { css: compileThemeProject(project, nativeVariables), customCss: project.customCss, assets: structuredClone(project.assets), tokenOverrides: structuredClone(project.tokens), metadata: { name: project.name } } }
