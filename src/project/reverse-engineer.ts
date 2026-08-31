import { createStylePacket, type ImageCustomMask, type StylePacket, type TargetPersistence } from './model'

export interface AuthoredStyleSource {
  selector: string
  properties: string[]
  important: string[]
  source: string
  condition?: string
}

export interface ReverseEngineerResult {
  packets: StylePacket[]
  authoredProperties: string[]
  usedComputedFallback: boolean
  sources: AuthoredStyleSource[]
}

type SurfacePseudo = '' | '::before' | '::after'

function splitTopLevel(value: string, delimiter = ','): string[] {
  const result: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") { quote = char; continue }
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    else if (char === delimiter && depth === 0) { result.push(value.slice(start, index).trim()); start = index + 1 }
  }
  result.push(value.slice(start).trim())
  return result.filter(Boolean)
}

function selectorMatchesSurface(element: Element, selectorText: string, pseudo: SurfacePseudo): boolean {
  for (const raw of splitTopLevel(selectorText)) {
    const hasBefore = /::before\b/.test(raw)
    const hasAfter = /::after\b/.test(raw)
    if (pseudo === '::before' && !hasBefore) continue
    if (pseudo === '::after' && !hasAfter) continue
    if (!pseudo && (hasBefore || hasAfter)) continue
    const base = raw.replace(/::(?:before|after)\b/g, '')
    try { if (element.matches(base)) return true } catch { /* selector may use unsupported syntax */ }
  }
  return false
}

function walkRules(rules: CSSRuleList, element: Element, pseudo: SurfacePseudo, result: Set<string>): void {
  for (const rule of Array.from(rules)) {
    if (typeof CSSStyleRule !== 'undefined' && rule instanceof CSSStyleRule) {
      if (!selectorMatchesSurface(element, rule.selectorText, pseudo)) continue
      for (const property of Array.from(rule.style)) result.add(property.toLowerCase())
      continue
    }
    const nested = (rule as CSSRule & { cssRules?: CSSRuleList; conditionText?: string }).cssRules
    if (!nested) continue
    const condition = (rule as CSSRule & { conditionText?: string }).conditionText
    if (typeof CSSMediaRule !== 'undefined' && rule instanceof CSSMediaRule && condition && typeof matchMedia === 'function' && !matchMedia(condition).matches) continue
    walkRules(nested, element, pseudo, result)
  }
}

function sourceLabel(sheet: CSSStyleSheet): string {
  if (sheet.href) { try { return new URL(sheet.href, document.baseURI).pathname.split('/').pop() || sheet.href } catch { return sheet.href } }
  const owner = sheet.ownerNode
  if (owner instanceof HTMLStyleElement) return owner.id ? `style#${owner.id}` : owner.getAttribute('data-theme-studio-generated') !== null ? 'Theme Studio generated' : 'inline <style>'
  return 'stylesheet'
}
function walkSourceRules(rules: CSSRuleList, sheet: CSSStyleSheet, element: Element, pseudo: SurfacePseudo, result: AuthoredStyleSource[], condition?: string): void {
  for (const rule of Array.from(rules)) {
    if (typeof CSSStyleRule !== 'undefined' && rule instanceof CSSStyleRule) {
      if (!selectorMatchesSurface(element, rule.selectorText, pseudo)) continue
      const properties = Array.from(rule.style).map((property) => property.toLowerCase())
      if (!properties.length) continue
      result.push({ selector: rule.selectorText, properties, important: properties.filter((property) => rule.style.getPropertyPriority(property) === 'important'), source: sourceLabel(sheet), condition })
      continue
    }
    const nested = (rule as CSSRule & { cssRules?: CSSRuleList; conditionText?: string }).cssRules
    if (!nested) continue
    const nextCondition = (rule as CSSRule & { conditionText?: string }).conditionText || condition
    if (typeof CSSMediaRule !== 'undefined' && rule instanceof CSSMediaRule && nextCondition && typeof matchMedia === 'function' && !matchMedia(nextCondition).matches) continue
    walkSourceRules(nested, sheet, element, pseudo, result, nextCondition)
  }
}
export function collectAuthoredSources(element: Element, pseudo: SurfacePseudo = ''): AuthoredStyleSource[] {
  const result: AuthoredStyleSource[] = []
  if (!pseudo && element instanceof HTMLElement && element.style.length) {
    const properties = Array.from(element.style).map((property) => property.toLowerCase())
    result.push({ selector: 'element.style', properties, important: properties.filter((property) => element.style.getPropertyPriority(property) === 'important'), source: 'inline style' })
  }
  const sheets: CSSStyleSheet[] = [...Array.from(document.styleSheets)]
  const adopted = (document as Document & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets
  if (adopted) sheets.push(...adopted)
  for (const sheet of sheets) {
    try { if (sheet.cssRules) walkSourceRules(sheet.cssRules, sheet, element, pseudo, result) } catch { /* inaccessible stylesheet */ }
  }
  return result
}

export function collectAuthoredProperties(element: Element, pseudo: SurfacePseudo = ''): Set<string> {
  const result = new Set<string>()
  if (!pseudo && element instanceof HTMLElement) for (const property of Array.from(element.style)) result.add(property.toLowerCase())
  const sheets: CSSStyleSheet[] = [...Array.from(document.styleSheets)]
  const adopted = (document as Document & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets
  if (adopted) sheets.push(...adopted)
  for (const sheet of sheets) {
    try { if (sheet.cssRules) walkRules(sheet.cssRules, element, pseudo, result) } catch { /* cross-origin/inaccessible stylesheet */ }
  }
  return result
}

function hasAny(properties: Set<string>, names: string[]): boolean {
  for (const name of names) {
    const lower = name.toLowerCase()
    if (properties.has(lower)) return true
    if (lower.endsWith('-*')) {
      const prefix = lower.slice(0, -1)
      if ([...properties].some((property) => property.startsWith(prefix))) return true
    }
  }
  return false
}

function px(value: string): number | null {
  const match = value.trim().match(/^(-?(?:\d+\.?\d*|\.\d+))px$/i)
  return match ? Number(match[1]) : null
}
function numeric(value: string): number | null { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null }
function percentPosition(value: string): [number, number] | null {
  const bits = value.trim().split(/\s+/)
  if (bits.length < 2) return null
  const parse = (input: string) => input.endsWith('%') ? Number(input.slice(0, -1)) : null
  const x = parse(bits[0]), y = parse(bits[1]); return x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null
}

function rgba(value: string): { color: string; alpha: number } | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed || trimmed === 'transparent') return null
  const hex = trimmed.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i)
  if (hex) return { color: `#${hex[1]}`, alpha: hex[2] ? parseInt(hex[2], 16) / 255 : 1 }
  const rgb = trimmed.match(/^rgba?\((.*)\)$/i)
  if (!rgb) return null
  const body = rgb[1].replace('/', ' ')
  const parts = body.split(/[\s,]+/).filter(Boolean)
  if (parts.length < 3) return null
  const channels = parts.slice(0, 3).map((part) => part.endsWith('%') ? Math.round(Number(part.slice(0, -1)) * 2.55) : Number(part))
  if (channels.some((part) => !Number.isFinite(part))) return null
  const alphaRaw = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? Number(parts[3].slice(0, -1)) / 100 : Number(parts[3])
  const color = `#${channels.map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, '0')).join('')}`
  return { color, alpha: Number.isFinite(alphaRaw) ? Math.max(0, Math.min(1, alphaRaw)) : 1 }
}

function parseFirstShadow(value: string): { x: number; y: number; blur: number; spread: number; color: string; alpha: number; inset: boolean } | null {
  if (!value || value === 'none') return null
  const first = splitTopLevel(value)[0] ?? ''
  const colorMatch = first.match(/rgba?\([^)]*\)|#[0-9a-f]{6,8}/i)
  const color = colorMatch ? rgba(colorMatch[0]) : null
  const withoutColor = colorMatch ? first.replace(colorMatch[0], '') : first
  const numbers = withoutColor.match(/-?(?:\d+\.?\d*|\.\d+)px/g)?.map((entry) => Number(entry.slice(0, -2))) ?? []
  if (numbers.length < 2) return null
  return { x: numbers[0], y: numbers[1], blur: Math.max(0, numbers[2] ?? 0), spread: numbers[3] ?? 0, color: color?.color ?? '#000000', alpha: color?.alpha ?? 1, inset: /\binset\b/i.test(first) }
}

function parseFilterNumber(value: string, name: string, fallback: number): number {
  const match = value.match(new RegExp(`${name}\\(([-+.\\d]+)(%|deg|px)?\\)`, 'i'))
  if (!match) return fallback
  const number = Number(match[1]); if (!Number.isFinite(number)) return fallback
  return match[2] === '%' ? number / 100 : number
}
function parseMaskEdgeLayer(value: string): { direction: 'left' | 'right' | 'top' | 'bottom'; solidUntil: number; fadeUntil: number } | null {
  const direction = value.match(/linear-gradient\(\s*to\s+(left|right|top|bottom)\s*,/i)?.[1]?.toLowerCase() as 'left' | 'right' | 'top' | 'bottom' | undefined
  if (!direction) return null
  const percentages = [...value.matchAll(/(-?(?:\d+\.?\d*|\.\d+))%/g)].map((match) => Number(match[1])).filter(Number.isFinite)
  if (percentages.length < 3) return null
  return { direction, solidUntil: Math.max(0, Math.min(99, percentages[1])), fadeUntil: Math.max(1, Math.min(100, percentages[2])) }
}
function readMaskIntoPacket(style: CSSStyleDeclaration, packet: Extract<StylePacket, { type: 'mask' }>): void {
  const webkitMask = style.getPropertyValue('-webkit-mask-image').trim()
  const standardMask = style.maskImage.trim()
  const raw = webkitMask && webkitMask !== 'none'
    ? webkitMask
    : standardMask && standardMask !== 'none'
      ? standardMask
      : webkitMask || standardMask
  if (!raw) return
  if (raw === 'none') { packet.maskMode = 'none'; return }
  const layers = splitTopLevel(raw)
  const parsed = layers.map(parseMaskEdgeLayer)
  if (layers.length === 1 && /radial-gradient/i.test(raw)) { packet.maskMode = 'fade'; packet.fade.direction = 'radial'; return }
  if (layers.length === 1 && parsed[0] && parsed[0]!.fadeUntil >= 99.5) {
    packet.maskMode = 'fade'
    packet.fade.direction = parsed[0]!.direction
    packet.fade.amount = Math.max(0, Math.min(100, 100 - parsed[0]!.solidUntil))
    return
  }
  if (parsed.every(Boolean)) {
    const custom: ImageCustomMask = {
      horizontal: { enabled: false, side: 'right', solidUntil: 25, fadeUntil: 90 },
      top: { enabled: false, solidUntil: 85, fadeUntil: 100 },
      bottom: { enabled: false, solidUntil: 55, fadeUntil: 100 },
      combine: 'intersect',
    }
    for (const layer of parsed as Array<NonNullable<ReturnType<typeof parseMaskEdgeLayer>>>) {
      if (layer.direction === 'left' || layer.direction === 'right') custom.horizontal = { enabled: true, side: layer.direction, solidUntil: layer.solidUntil, fadeUntil: layer.fadeUntil }
      else custom[layer.direction] = { enabled: true, solidUntil: layer.solidUntil, fadeUntil: layer.fadeUntil }
    }
    const standard = (style.getPropertyValue('mask-composite') || '').toLowerCase()
    const webkit = (style.getPropertyValue('-webkit-mask-composite') || '').toLowerCase()
    custom.combine = standard.includes('exclude') || webkit.includes('xor') ? 'exclude'
      : standard.includes('subtract') || webkit.includes('source-out') ? 'subtract'
        : standard.includes('add') || webkit.includes('source-over') ? 'add' : 'intersect'
    packet.maskMode = 'custom'; packet.customMask = custom
    return
  }
  // We can see a mask but cannot safely translate its grammar into sliders. Keep it
  // native/observed rather than pretending Theme Studio owns something it cannot round-trip.
  packet.maskMode = 'native'
}


function parseGradient(value: string): { angle: number; stops: Array<{ color: string; alpha: number; position: number }> } | null {
  const match = value.match(/linear-gradient\((.*)\)/i)
  if (!match) return null
  const bits = splitTopLevel(match[1]); if (bits.length < 2) return null
  let angle = 180
  if (/^-?[\d.]+deg$/i.test(bits[0])) { angle = Number(bits.shift()!.slice(0, -3)) }
  else if (/^to\s+/i.test(bits[0])) {
    const direction = bits.shift()!.toLowerCase()
    angle = direction.includes('right') ? 90 : direction.includes('left') ? 270 : direction.includes('top') ? 0 : 180
  }
  const stops = bits.map((bit, index) => {
    const colorMatch = bit.match(/rgba?\([^)]*\)|#[0-9a-f]{6,8}/i); if (!colorMatch) return null
    const color = rgba(colorMatch[0]); if (!color) return null
    const positionMatch = bit.slice((colorMatch.index ?? 0) + colorMatch[0].length).match(/(-?[\d.]+)%/)
    const position = positionMatch ? Number(positionMatch[1]) : bits.length === 1 ? 0 : (index / (bits.length - 1)) * 100
    return { ...color, position: Math.max(0, Math.min(100, position)) }
  }).filter((entry): entry is { color: string; alpha: number; position: number } => Boolean(entry))
  return stops.length >= 2 ? { angle: Number.isFinite(angle) ? angle : 180, stops } : null
}

function computedFallbackHas(style: CSSStyleDeclaration, group: string): boolean {
  switch (group) {
    case 'background': return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none'
    case 'text': return Boolean(style.color)
    case 'border': return parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== 'none'
    case 'corners': return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].some((value) => (px(value) ?? 0) > 0)
    case 'spacing': return [...['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft'] as const].some((key) => Math.abs(px(style[key]) ?? 0) > .01) || Math.abs(px(style.gap) ?? 0) > .01
    case 'shadow': return style.boxShadow !== 'none'
    case 'glass': return (style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter') || 'none') !== 'none'
    case 'opacity': return Math.abs(Number(style.opacity) - 1) > .001
    case 'layout': return ['flex','inline-flex','grid','inline-grid'].includes(style.display)
    case 'position': return style.position !== 'static' || style.zIndex !== 'auto'
    case 'visibility': return style.display === 'none' || style.visibility === 'hidden'
    default: return false
  }
}

export function reverseEngineerElement(element: Element, pseudo: SurfacePseudo = ''): ReverseEngineerResult {
  const style = getComputedStyle(element, pseudo || null)
  const authored = collectAuthoredProperties(element, pseudo)
  const fallback = authored.size === 0
  const packets: StylePacket[] = []
  const wants = (group: string, properties: string[]) => hasAny(authored, properties) || (fallback && computedFallbackHas(style, group))

  const backgroundGradient = parseGradient(style.backgroundImage)
  const backgroundColor = rgba(style.backgroundColor)
  const textGradient = (style.backgroundClip === 'text' || style.webkitBackgroundClip === 'text') ? backgroundGradient : null

  if (wants('background', ['background','background-*']) && !textGradient) {
    const packet = createStylePacket('background')
    if (packet.type === 'background') {
      if (backgroundGradient) { packet.mode = 'gradient'; packet.gradient = { type: 'linear', ...backgroundGradient } }
      else if (backgroundColor) { packet.mode = 'solid'; packet.solid = backgroundColor }
      else packet.mode = 'solid'
      packets.push(packet)
    }
  }

  if (wants('text', ['color','-webkit-text-fill-color','text-shadow','-webkit-text-stroke','-webkit-text-stroke-width','-webkit-text-stroke-color','background-clip','-webkit-background-clip']) || textGradient) {
    const packet = createStylePacket('text')
    if (packet.type === 'text') {
      const foreground = rgba(style.color)
      if (textGradient) { packet.colorMode = 'gradient'; packet.gradient = { type: 'linear', ...textGradient } }
      else if (foreground) { packet.colorMode = 'solid'; packet.solid = foreground }
      if (!textGradient && authored.has('-webkit-text-fill-color')) packet.inkMode = 'force'
      const strokeWidth = px(style.webkitTextStrokeWidth)
      const strokeColor = rgba(style.webkitTextStrokeColor)
      if (strokeWidth && strokeWidth > 0) { packet.strokeWidth = strokeWidth; packet.strokeColor = strokeColor?.color ?? '#000000'; packet.strokeAlpha = strokeColor?.alpha ?? 1 }
      const shadow = parseFirstShadow(style.textShadow)
      if (shadow) packet.shadow = { x: shadow.x, y: shadow.y, blur: shadow.blur, color: shadow.color, alpha: shadow.alpha }
      packets.push(packet)
    }
  }

  if (hasAny(authored, ['font','font-*','text-align','line-height','letter-spacing','text-transform']) || fallback) {
    const packet = createStylePacket('typography')
    if (packet.type === 'typography') {
      const size = px(style.fontSize) ?? 15
      packet.fontSize = size; packet.fontSizeUnit = 'px'
      packet.fontFamily = style.fontFamily.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') || undefined
      packet.fontWeight = numeric(style.fontWeight) ?? style.fontWeight
      packet.fontStyle = style.fontStyle === 'italic' ? 'italic' : 'normal'
      packet.textAlign = style.textAlign === 'center' || style.textAlign === 'right' || style.textAlign === 'justify' ? style.textAlign : 'left'
      const linePx = px(style.lineHeight); if (linePx && size > 0) packet.lineHeight = Math.max(.1, Math.min(20, linePx / size))
      packet.letterSpacing = style.letterSpacing === 'normal' ? 0 : (px(style.letterSpacing) ?? 0)
      packet.transform = ['uppercase','lowercase','capitalize'].includes(style.textTransform) ? style.textTransform as 'uppercase' | 'lowercase' | 'capitalize' : 'none'
      packets.push(packet)
    }
  }

  if (wants('border', ['border','border-*'])) {
    const width = px(style.borderTopWidth) ?? 0
    const color = rgba(style.borderTopColor)
    const packet = createStylePacket('border')
    if (packet.type === 'border') { packet.width = width; packet.style = ['solid','dashed','dotted','double','none'].includes(style.borderTopStyle) ? style.borderTopStyle as typeof packet.style : 'solid'; if (color) { packet.color = color.color; packet.alpha = color.alpha }; packets.push(packet) }
  }

  if (wants('corners', ['border-radius','border-*-radius'])) {
    const packet = createStylePacket('corners')
    if (packet.type === 'corners') {
      packet.topLeft = px(style.borderTopLeftRadius) ?? 0; packet.topRight = px(style.borderTopRightRadius) ?? 0; packet.bottomRight = px(style.borderBottomRightRadius) ?? 0; packet.bottomLeft = px(style.borderBottomLeftRadius) ?? 0
      packet.linked = packet.topLeft === packet.topRight && packet.topLeft === packet.bottomRight && packet.topLeft === packet.bottomLeft
      packets.push(packet)
    }
  }

  if (wants('spacing', ['padding','padding-*','margin','margin-*','gap','row-gap','column-gap'])) {
    const packet = createStylePacket('spacing')
    if (packet.type === 'spacing') {
      const box = (prefix: 'padding' | 'margin') => {
        const values = [style[`${prefix}Top` as 'paddingTop'], style[`${prefix}Right` as 'paddingRight'], style[`${prefix}Bottom` as 'paddingBottom'], style[`${prefix}Left` as 'paddingLeft']].map((value) => px(value) ?? 0)
        return { linked: values.every((value) => value === values[0]), top: values[0], right: values[1], bottom: values[2], left: values[3], unit: 'px' as const }
      }
      if (hasAny(authored, ['padding','padding-*']) || fallback) packet.padding = box('padding')
      if (hasAny(authored, ['margin','margin-*']) || fallback) packet.margin = box('margin')
      const gap = px(style.gap); if (gap !== null && (hasAny(authored, ['gap','row-gap','column-gap']) || fallback)) packet.gap = gap
      packets.push(packet)
    }
  }

  if (wants('shadow', ['box-shadow'])) {
    const shadow = parseFirstShadow(style.boxShadow)
    if (shadow) { const packet = createStylePacket('shadow'); if (packet.type === 'shadow') { Object.assign(packet, shadow); packets.push(packet) } }
  }

  if (wants('glass', ['backdrop-filter','-webkit-backdrop-filter'])) {
    const filter = style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter') || ''
    const packet = createStylePacket('glass')
    if (packet.type === 'glass') { packet.blur = parseFilterNumber(filter, 'blur', 0); packet.saturation = parseFilterNumber(filter, 'saturate', 1); packet.borderWidth = 0; packet.shadowStrength = 0; packet.innerHighlight = 0; packets.push(packet) }
  }

  if (wants('opacity', ['opacity'])) { const value = Number(style.opacity); if (Number.isFinite(value)) { const packet = createStylePacket('opacity'); if (packet.type === 'opacity') { packet.value = value; packets.push(packet) } } }

  if (wants('visibility', ['visibility','display'])) {
    const packet = createStylePacket('visibility')
    if (packet.type === 'visibility') { packet.mode = style.display === 'none' ? 'gone' : style.visibility === 'hidden' ? 'invisible' : 'visible'; if (packet.mode !== 'visible' || hasAny(authored, ['visibility'])) packets.push(packet) }
  }

  const mediaElement = ['IMG','VIDEO','CANVAS','PICTURE'].includes(element.tagName)
  const mediaSurface = mediaElement || Boolean(element.querySelector('img, video, canvas, picture'))
  const authoredMask = hasAny(authored, ['mask-image','-webkit-mask-image','mask-composite','-webkit-mask-composite'])
  const authoredMediaImage = mediaSurface && hasAny(authored, mediaElement ? ['filter','object-fit','object-position','width','height'] : ['filter'])
  if (!pseudo && authoredMediaImage) {
    const packet = createStylePacket('image')
    if (packet.type === 'image') {
      const filter = style.filter || ''
      packet.brightness = parseFilterNumber(filter, 'brightness', 1); packet.saturation = parseFilterNumber(filter, 'saturate', 1); packet.contrast = parseFilterNumber(filter, 'contrast', 1); packet.grayscale = parseFilterNumber(filter, 'grayscale', 0); packet.hueRotate = parseFilterNumber(filter, 'hue-rotate', 0); packet.blur = parseFilterNumber(filter, 'blur', 0)
      if (['cover','contain','fill','scale-down'].includes(style.objectFit)) packet.objectFit = style.objectFit as typeof packet.objectFit
      const position = percentPosition(style.objectPosition); if (position) [packet.objectPositionX, packet.objectPositionY] = position
      if (style.width === '100%' && style.height === '100%') packet.fillFrame = true
      packets.push(packet)
    }
  }
  if (!pseudo && authoredMask) {
    const packet = createStylePacket('mask')
    if (packet.type === 'mask') { readMaskIntoPacket(style, packet); packets.push(packet) }
  }

  if (wants('position', ['position','top','right','bottom','left','translate','z-index'])) {
    const packet = createStylePacket('position')
    if (packet.type === 'position') {
      packet.mode = style.position === 'relative' ? 'nudge' : style.position === 'absolute' ? 'anchored' : style.position === 'sticky' ? 'sticky' : style.position === 'fixed' ? 'screen' : 'flow'
      const readOffset = (value: string) => value === 'auto' ? undefined : px(value) ?? undefined
      if (packet.mode === 'nudge') {
        const translate = style.translate.trim().split(/\s+/); packet.nudgeX = px(translate[0] ?? '') ?? 0; packet.nudgeY = px(translate[1] ?? '') ?? 0
      } else { packet.top = readOffset(style.top); packet.right = readOffset(style.right); packet.bottom = readOffset(style.bottom); packet.left = readOffset(style.left) }
      const z = numeric(style.zIndex); if (z !== null && z !== 0) { packet.layer = 'custom'; packet.zIndex = z }
      packets.push(packet)
    }
  }

  if (wants('layout', ['display','flex-*','justify-content','align-items','gap','grid-template-columns'])) {
    if (['flex','inline-flex','grid','inline-grid'].includes(style.display)) {
      const packet = createStylePacket('layout')
      if (packet.type === 'layout') {
        packet.display = style.display as typeof packet.display
        if (style.display.includes('flex')) { packet.direction = style.flexDirection as typeof packet.direction; packet.wrap = style.flexWrap as typeof packet.wrap }
        const map = (value: string) => value === 'flex-start' ? 'start' : value === 'flex-end' ? 'end' : value
        packet.justify = map(style.justifyContent) as typeof packet.justify; packet.align = map(style.alignItems) as typeof packet.align
        const gap = px(style.gap); if (gap !== null) packet.gap = { mode: 'fixed', value: gap, unit: 'px' }
        packets.push(packet)
      }
    }
  }

  if (!pseudo && hasAny(authored, ['flex-grow','flex-shrink','flex-basis','align-self','order'])) {
    const packet = createStylePacket('layout-item')
    if (packet.type === 'layout-item') {
      const grow = numeric(style.flexGrow) ?? 0, shrink = numeric(style.flexShrink) ?? 1, basis = px(style.flexBasis)
      packet.sizeInParent = grow >= 1 && shrink >= 1 && (style.flexBasis === '0px' || style.flexBasis === '0%') ? 'fill' : basis !== null ? 'fixed' : 'natural'
      packet.grow = grow; packet.shrink = shrink; if (basis !== null) packet.basis = { mode: 'fixed', value: basis, unit: 'px' }
      packet.alignSelf = style.alignSelf === 'flex-start' ? 'start' : style.alignSelf === 'flex-end' ? 'end' : ['auto','center','stretch'].includes(style.alignSelf) ? style.alignSelf as typeof packet.alignSelf : 'auto'
      packet.order = numeric(style.order) ?? 0; packets.push(packet)
    }
  }

  if (!pseudo && hasAny(authored, ['width','height','min-width','max-width','min-height','max-height','aspect-ratio'])) {
    const packet = createStylePacket('size')
    if (packet.type === 'size') {
      const dimension = (value: string) => { const parsed = px(value); return parsed === null ? undefined : { mode: 'fixed' as const, value: parsed, unit: 'px' as const } }
      if (hasAny(authored, ['width'])) packet.width = dimension(style.width)
      if (hasAny(authored, ['height'])) packet.height = dimension(style.height)
      if (hasAny(authored, ['min-width'])) packet.minWidth = dimension(style.minWidth)
      if (hasAny(authored, ['max-width'])) packet.maxWidth = dimension(style.maxWidth)
      if (hasAny(authored, ['min-height'])) packet.minHeight = dimension(style.minHeight)
      if (hasAny(authored, ['max-height'])) packet.maxHeight = dimension(style.maxHeight)
      const ratio = style.aspectRatio.match(/^([\d.]+)\s*\/\s*([\d.]+)$/); if (ratio) packet.aspectRatio = { width: Number(ratio[1]), height: Number(ratio[2]) }
      packets.push(packet)
    }
  }

  return { packets, authoredProperties: [...authored].sort(), usedComputedFallback: fallback, sources: collectAuthoredSources(element, pseudo) }
}
