const NATIVE_UI_SCALE_PROPERTY = '--lumiverse-ui-scale'

type ZoomAwareElement = Element & { currentCSSZoom?: number }

function parsedScale(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0.001) return null
  return trimmed.endsWith('%') ? parsed / 100 : parsed
}

function currentCssZoom(element: Element | null): number | null {
  if (!element) return null
  const value = Number((element as ZoomAwareElement).currentCSSZoom)
  return Number.isFinite(value) && value > 0.001 ? value : null
}

/** Read Lumiverse's published UI zoom multiplier. */
export function nativeUiScale(scope?: Element): number {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return 1
  const published = parsedScale(getComputedStyle(document.documentElement).getPropertyValue(NATIVE_UI_SCALE_PROPERTY))
  if (published) return published

  // Defensive fallback for hosts that apply CSS zoom but do not publish the token.
  // `zoom` is not inherited, so multiply only the actual ancestor declarations.
  let scale = 1
  let current: Element | null = scope?.parentElement ?? document.body?.firstElementChild ?? null
  while (current) {
    const raw = getComputedStyle(current).getPropertyValue('zoom')
    const zoom = parsedScale(raw)
    if (zoom) scale *= zoom
    current = current.parentElement
    if (current === document.documentElement) break
  }
  return Number.isFinite(scale) && scale > 0.001 ? scale : 1
}

/**
 * Read the CSS zoom inherited from a Palette portal's *actual* parent chain.
 *
 * This deliberately differs from nativeUiScale(): the published Lumiverse token
 * describes the app shell, but Palette's mini widget / floating editor are
 * portalled to document.body. Some host layouts leave body unzoomed while others
 * zoom it too. Using the token blindly therefore either leaves a real coordinate
 * mismatch in place or over-enlarges an already-unscaled portal.
 */
export function ancestorUiScale(surface?: Element | null): number {
  if (!surface || typeof document === 'undefined' || typeof getComputedStyle !== 'function') return 1
  const parent = surface.parentElement
  if (!parent) return 1

  // Chromium exposes the effective CSS zoom of an element, including ancestor
  // zoom. Read the parent rather than the Palette surface itself so repeated
  // synchronization stays stable after we apply our inverse zoom to the child.
  const effective = currentCssZoom(parent)
  if (effective) return effective

  // Compatibility fallback for DOMs/browsers without currentCSSZoom.
  let scale = 1
  let current: Element | null = parent
  while (current) {
    const zoom = parsedScale(getComputedStyle(current).getPropertyValue('zoom'))
    if (zoom) scale *= zoom
    current = current.parentElement
  }
  return Number.isFinite(scale) && scale > 0.001 ? scale : 1
}

function applyInverseUiZoom(root: HTMLElement, scale: number, enabled: boolean): void {
  const normalized = Number.isFinite(scale) && scale > 0.001 ? scale : 1
  if (!enabled || Math.abs(normalized - 1) <= 0.001) {
    root.style.removeProperty('zoom')
    root.removeAttribute('data-ts-ui-scale-isolated')
    return
  }
  root.style.setProperty('zoom', String(1 / normalized))
  root.setAttribute('data-ts-ui-scale-isolated', String(normalized))
}

/**
 * Cancel actual host CSS zoom for body-portalled Palette chrome. This keeps the
 * visual widget and the browser's pointer hit-test coordinates in the same
 * space instead of compensating against a token that may describe another DOM
 * branch entirely.
 */
export function applyPortalUiScaleIsolation(root: HTMLElement, scale: number, enabled = true): void {
  applyInverseUiZoom(root, scale, enabled)
}


export type PortalDragGeometry = {
  startRect: { left: number; top: number; width: number; height: number }
  startLeft: number
  startTop: number
  deltaX: number
  deltaY: number
  /** Fallback only. CSS zoom can make a fixed child's positional scale differ
   * from the ancestor's published/effective zoom. */
  ancestorScale: number
  /** Measured CSS-left/top -> viewport-pixel response for this exact surface. */
  positionScaleX?: number
  positionScaleY?: number
  viewportWidth: number
  viewportHeight: number
  padding?: number
}

export type PortalPositionScale = { x: number; y: number }

function validPositionScale(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0.001 ? Number(value) : fallback
}

/**
 * Measure how authored `left` / `top` coordinates on this fixed portal map to
 * rendered viewport pixels. Nested CSS `zoom` is not reliably described by the
 * host scale token: a counter-zoomed child can have a different positional
 * response from either its ancestor zoom or its rendered-size ratio.
 *
 * The probe is synchronous and restored before the browser can paint. That
 * gives drag math the browser's real coordinate conversion rather than another
 * inferred scale, avoiding the "release, re-grab, move a little farther"
 * convergence bug.
 */
export function measurePortalPositionScale(surface: HTMLElement, fallbackScale = ancestorUiScale(surface), probe = 32): PortalPositionScale {
  const fallback = Number.isFinite(fallbackScale) && fallbackScale > 0.001 ? fallbackScale : 1
  if (typeof getComputedStyle !== 'function' || probe <= 0) return { x: fallback, y: fallback }

  const computed = getComputedStyle(surface)
  const computedLeft = Number.parseFloat(computed.left)
  const computedTop = Number.parseFloat(computed.top)
  const baseline = surface.getBoundingClientRect()
  const inlineLeft = surface.style.getPropertyValue('left')
  const inlineTop = surface.style.getPropertyValue('top')
  const leftPriority = surface.style.getPropertyPriority('left')
  const topPriority = surface.style.getPropertyPriority('top')
  let x = fallback
  let y = fallback

  const restore = (property: 'left' | 'top', value: string, priority: string) => {
    if (value) surface.style.setProperty(property, value, priority)
    else surface.style.removeProperty(property)
  }

  try {
    if (Number.isFinite(computedLeft)) {
      surface.style.setProperty('left', `${computedLeft + probe}px`)
      const shifted = surface.getBoundingClientRect()
      x = validPositionScale((shifted.left - baseline.left) / probe, fallback)
      restore('left', inlineLeft, leftPriority)
    }
    if (Number.isFinite(computedTop)) {
      surface.style.setProperty('top', `${computedTop + probe}px`)
      const shifted = surface.getBoundingClientRect()
      y = validPositionScale((shifted.top - baseline.top) / probe, fallback)
    }
  } finally {
    restore('left', inlineLeft, leftPriority)
    restore('top', inlineTop, topPriority)
  }

  return { x, y }
}

/**
 * Convert viewport pointer movement into the local CSS coordinates used by a
 * body-portalled fixed surface whose parent chain may be CSS-zoomed.
 *
 * Pointer/client coordinates and getBoundingClientRect() are rendered viewport
 * pixels, while `left` / `top` are authored in the containing block's local
 * coordinate space.  Under Lumiverse UI scale those spaces diverge.  Clamp in
 * rendered space (using the rendered rect, never offsetWidth/offsetHeight), then
 * divide only the positional correction by the ancestor zoom before writing the
 * local CSS offsets.
 */
export function portalDragPosition(input: PortalDragGeometry): { left: number; top: number } {
  const padding = Number.isFinite(input.padding) ? Math.max(0, Number(input.padding)) : 8
  const fallbackScale = Number.isFinite(input.ancestorScale) && input.ancestorScale > 0.001 ? input.ancestorScale : 1
  const scaleX = validPositionScale(input.positionScaleX, fallbackScale)
  const scaleY = validPositionScale(input.positionScaleY, fallbackScale)
  const viewportWidth = Math.max(0, Number.isFinite(input.viewportWidth) ? input.viewportWidth : 0)
  const viewportHeight = Math.max(0, Number.isFinite(input.viewportHeight) ? input.viewportHeight : 0)
  const renderedWidth = Math.max(0, Number.isFinite(input.startRect.width) ? input.startRect.width : 0)
  const renderedHeight = Math.max(0, Number.isFinite(input.startRect.height) ? input.startRect.height : 0)
  const maxRenderedLeft = Math.max(padding, viewportWidth - renderedWidth - padding)
  const maxRenderedTop = Math.max(padding, viewportHeight - renderedHeight - padding)
  const desiredRenderedLeft = Math.max(padding, Math.min(maxRenderedLeft, input.startRect.left + input.deltaX))
  const desiredRenderedTop = Math.max(padding, Math.min(maxRenderedTop, input.startRect.top + input.deltaY))
  return {
    left: input.startLeft + (desiredRenderedLeft - input.startRect.left) / scaleX,
    top: input.startTop + (desiredRenderedTop - input.startRect.top) / scaleY,
  }
}

/**
 * Lumiverse's app shell is zoomed by native UI scale. Palette is a tooling
 * surface, so cancel that visual zoom for the docked editor without shrinking
 * its authored layout box. The previous footprint compensation multiplied the
 * editor width/height by the host scale as well, which double-counted the host
 * drawer sizing and produced the narrow "diet Palette" column at 0.8x.
 *
 * Font scale remains independent via --lumiverse-font-scale inside Palette CSS.
 */
export function applyDockUiScaleIsolation(root: HTMLElement, scale: number, enabled = true): void {
  // v45 briefly wrote scaled footprint values inline. Always clear those
  // extension-owned leftovers so a hot reload cannot strand the narrow layout.
  root.style.removeProperty('width')
  root.style.removeProperty('height')
  root.style.removeProperty('max-height')
  applyInverseUiZoom(root, scale, enabled)
}
