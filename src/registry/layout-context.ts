import type { LayoutContext, NativeThemeComponent, SelectionScope, SizeControllerInfo } from './types'

const MODULE_CLASS = /^_([A-Za-z][A-Za-z0-9_-]*?)_[A-Za-z0-9]{4,}_[0-9]+$/
function friendly(element: Element): string { const local = [...element.classList].map((name) => name.match(MODULE_CLASS)?.[1]).find(Boolean); return local?.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ') ?? element.getAttribute('data-component') ?? element.tagName.toLowerCase() }
function selector(element: Element): string | undefined { const component = element.getAttribute('data-component'); if (component) return `[data-component="${component.replaceAll('"', '\\"')}"]`; const local = [...element.classList].map((name) => name.match(MODULE_CLASS)?.[1]).find(Boolean); return local ? `[class*="_${local}_"]` : element.id ? `#${element.id}` : undefined }
function styleOf(element: Element): CSSStyleDeclaration { return typeof getComputedStyle === 'function' ? getComputedStyle(element) : (element as HTMLElement).style }

export function inspectLayoutContext(element: Element, components: NativeThemeComponent[] = []): LayoutContext {
  const parent = element.parentElement
  if (!parent) return { parentLabel: 'No layout parent', parentDisplay: 'none', isFlex: false, isGrid: false }
  const display = styleOf(parent).display || 'block', componentName = parent.getAttribute('data-component')?.toLowerCase(), component = components.find((entry) => entry.label.toLowerCase() === componentName)
  return { parentElement: parent, parentLabel: friendly(parent), parentDisplay: display, parentSelector: selector(parent), parentNativeComponentId: component?.id, isFlex: /flex/.test(display), isGrid: /grid/.test(display) }
}

/** Conservative recommendation for media whose rendered size is owned by a stable wrapper. */
export function detectSizeController(element: Element, scopes: SelectionScope[] = []): SizeControllerInfo | undefined {
  if (!['img', 'video', 'canvas', 'svg'].includes(element.tagName.toLowerCase())) return undefined
  const media = styleOf(element), fillsWrapper = /^(100%|auto)$/.test(media.width) || /^(100%|auto)$/.test(media.height) || media.maxWidth === '100%' || media.objectFit !== ''
  if (!fillsWrapper) return undefined
  let current = element.parentElement; let depth = 0
  while (current && depth++ < 4) {
    const style = styleOf(current), stable = selector(current), ownsSize = /\d(?:px|rem|em|vw|vh|%)/.test(`${style.width} ${style.height} ${style.maxWidth} ${style.maxHeight}`) || ['hidden', 'clip'].includes(style.overflow) || ['relative', 'absolute'].includes(style.position)
    if (stable && ownsSize) { const scope = scopes.find((entry) => entry.element === current); return { element: current, label: friendly(current), selector: stable, scopeId: scope?.id, reason: `${element.tagName.toLowerCase()} fills a constrained wrapper; size the wrapper for predictable layout.` } }
    current = current.parentElement
  }
  return undefined
}
