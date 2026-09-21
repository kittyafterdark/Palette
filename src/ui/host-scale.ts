const NATIVE_UI_SCALE_PROPERTY = '--lumiverse-ui-scale'

function parsedScale(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0.001) return null
  return trimmed.endsWith('%') ? parsed / 100 : parsed
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
 * Lumiverse's app shell is zoomed by native UI scale. Palette is a tooling
 * surface, so cancel that visual zoom for the docked editor without shrinking
 * its authored layout box. The previous footprint compensation multiplied the
 * editor width/height by the host scale as well, which double-counted the host
 * drawer sizing and produced the narrow "diet Palette" column at 0.8x.
 *
 * Font scale remains independent via --lumiverse-font-scale inside Palette CSS.
 */
export function applyDockUiScaleIsolation(root: HTMLElement, scale: number, enabled = true): void {
  const normalized = Number.isFinite(scale) && scale > 0.001 ? scale : 1
  // v45 briefly wrote scaled footprint values inline. Always clear those
  // extension-owned leftovers so a hot reload cannot strand the narrow layout.
  root.style.removeProperty('width')
  root.style.removeProperty('height')
  root.style.removeProperty('max-height')
  if (!enabled || Math.abs(normalized - 1) <= 0.001) {
    root.style.removeProperty('zoom')
    root.removeAttribute('data-ts-ui-scale-isolated')
    return
  }
  root.style.setProperty('zoom', String(1 / normalized))
  root.setAttribute('data-ts-ui-scale-isolated', String(normalized))
}
