import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import { normalizeMeaningfulTarget } from '../registry/selector-resolver'

export interface ElementPickerOptions {
  onSelect(element: Element): void
  onCancel(): void
  /** Persistent by default. Widget picking can opt into a single selection. */
  persistent?: boolean
}

export type GeometryGuideMode = 'outline' | 'box' | 'size' | 'layout'

function px(style: CSSStyleDeclaration, property: string): number {
  const value = Number.parseFloat(style.getPropertyValue(property))
  return Number.isFinite(value) ? value : 0
}
function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width: Math.max(0, width), height: Math.max(0, height), right: left + Math.max(0, width), bottom: top + Math.max(0, height), x: left, y: top, toJSON: () => ({}) } as DOMRect
}

interface InspectorCoordinateMap {
  originX: number
  originY: number
  scaleX: number
  scaleY: number
}

const COORDINATE_PROBE_SIZE = 100

export class ElementPicker {
  private readonly overlay: HTMLDivElement
  private readonly label: HTMLDivElement
  private readonly selectedOverlay: HTMLDivElement
  private readonly selectedLabel: HTMLDivElement
  private readonly guideLayer: HTMLDivElement
  private readonly coordinateProbe: HTMLDivElement
  private inspectorCoordinateMap: InspectorCoordinateMap = { originX: 0, originY: 0, scaleX: 1, scaleY: 1 }
  private active = false
  private hoverTarget: Element | null = null
  private selectedTarget: Element | null = null
  private groupTargets: Element[] = []
  private groupParent: Element | null = null
  private selectedFrame = 0
  private selectedResizeObserver: ResizeObserver | null = null
  private guideMode: GeometryGuideMode = 'outline'
  private guideBoundary: Element | null = null
  private options: ElementPickerOptions | null = null
  private clickSuppressionTimer: ReturnType<typeof setTimeout> | null = null

  constructor(ctx: SpindleFrontendContext) {
    this.overlay = ctx.dom.createElement('div', { 'data-theme-studio-inspector': 'overlay', 'aria-hidden': 'true' })
    this.label = ctx.dom.createElement('div', { 'data-theme-studio-inspector': 'label', 'aria-hidden': 'true' })
    this.selectedOverlay = ctx.dom.createElement('div', { 'data-theme-studio-inspector': 'selected-overlay', 'aria-hidden': 'true' })
    this.selectedLabel = ctx.dom.createElement('div', { 'data-theme-studio-inspector': 'selected-label', 'aria-hidden': 'true' })
    this.guideLayer = ctx.dom.createElement('div', { 'data-theme-studio-inspector': 'guide-layer', 'aria-hidden': 'true' })
    this.coordinateProbe = ctx.dom.createElement('div', { 'data-theme-studio-inspector-probe': 'true', 'aria-hidden': 'true' })
    // Lumiverse may scale the body with CSS zoom/transform. getBoundingClientRect()
    // already returns viewport pixels, while fixed descendants of that scaled body
    // consume coordinates in the body's local space. A hidden 100px probe lets us
    // measure that mapping instead of assuming those coordinate systems are 1:1.
    this.coordinateProbe.style.cssText = `all:initial;display:block;position:fixed;left:0;top:0;width:${COORDINATE_PROBE_SIZE}px;height:${COORDINATE_PROBE_SIZE}px;box-sizing:border-box;margin:0;padding:0;border:0;transform:none;transform-origin:0 0;pointer-events:none;visibility:hidden;z-index:-2147483648;`
    this.overlay.hidden = true; this.label.hidden = true; this.selectedOverlay.hidden = true; this.selectedLabel.hidden = true; this.guideLayer.hidden = true
    document.body.append(this.coordinateProbe, this.guideLayer, this.overlay, this.label, this.selectedOverlay, this.selectedLabel)
  }

  get isActive(): boolean { return this.active }

  start(options: ElementPickerOptions): void {
    this.stop(false)
    this.hideHover()
    this.active = true
    this.options = options
    document.addEventListener('pointermove', this.handlePointerMove, true)
    document.addEventListener('pointerdown', this.handlePointerDown, true)
    document.addEventListener('keydown', this.handleKeyDown, true)
    document.documentElement.style.cursor = 'crosshair'
  }

  cancel(): void {
    if (!this.active) return
    const callback = this.options?.onCancel
    this.stop(false)
    callback?.()
  }

  highlight(element: Element | null, mode: GeometryGuideMode = this.guideMode, boundary: Element | null = null): void {
    this.groupTargets = []; this.groupParent = null
    this.selectedTarget = element
    this.guideMode = mode
    this.guideBoundary = boundary
    this.updateSelectedListeners(Boolean(element))
    if (element) {
      this.updateSelected()
      // Float/sheet reparenting and target changes can land in the same layout
      // tick. Re-measure after the browser has completed two paint/layout turns.
      this.scheduleSelectedRefresh(true)
    } else this.hideSelected()
  }

  highlightGroup(elements: Element[], parent: Element | null = null): void {
    this.selectedTarget = null
    this.groupTargets = elements.filter((element) => element.isConnected)
    this.groupParent = parent?.isConnected ? parent : this.groupTargets[0]?.parentElement ?? null
    this.selectedOverlay.hidden = true; this.selectedLabel.hidden = true
    this.updateSelectedListeners(this.groupTargets.length > 0)
    this.updateSelected()
    this.scheduleSelectedRefresh(true)
  }

  setGuideMode(mode: GeometryGuideMode): void {
    this.guideMode = mode
    if (this.selectedTarget) { this.updateSelected(); this.scheduleSelectedRefresh(true) }
  }

  clearHighlight(): void { this.selectedTarget = null; this.groupTargets = []; this.groupParent = null; this.guideBoundary = null; this.updateSelectedListeners(false); this.hideSelected() }

  destroy(): void {
    this.stop(false)
    this.clearHighlight()
    if (this.clickSuppressionTimer) clearTimeout(this.clickSuppressionTimer)
    document.removeEventListener('click', this.suppressSelectionClick, true)
    this.overlay.remove(); this.label.remove(); this.selectedOverlay.remove(); this.selectedLabel.remove(); this.guideLayer.remove(); this.coordinateProbe.remove()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.active) return
    const element = document.elementFromPoint(event.clientX, event.clientY)
    if (!element || this.isStudioOwned(element)) { this.hoverTarget = null; this.hideHover(); return }
    this.hoverTarget = normalizeMeaningfulTarget(element)
    this.updateOverlay(this.hoverTarget, this.overlay, this.label)
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.active) return
    const element = document.elementFromPoint(event.clientX, event.clientY)
    if (!element || this.isStudioOwned(element)) return
    event.preventDefault(); event.stopImmediatePropagation()
    const callback = this.options?.onSelect
    document.addEventListener('click', this.suppressSelectionClick, { capture: true, once: true })
    this.clickSuppressionTimer = setTimeout(() => {
      document.removeEventListener('click', this.suppressSelectionClick, true)
      this.clickSuppressionTimer = null
    }, 500)
    this.hoverTarget = null; this.hideHover()
    const selected = normalizeMeaningfulTarget(element)
    // The main editor is a persistent DevTools-style picker. The compact
    // widget intentionally uses one-shot picking for a faster phone flow.
    if (this.options?.persistent === false) this.stop(false)
    callback?.(selected)
  }

  private readonly suppressSelectionClick = (event: MouseEvent): void => {
    event.preventDefault(); event.stopImmediatePropagation()
    if (this.clickSuppressionTimer) clearTimeout(this.clickSuppressionTimer)
    this.clickSuppressionTimer = null
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.active) return
    event.preventDefault(); event.stopImmediatePropagation(); this.cancel()
  }

  private readonly handleViewportChange = (): void => { this.scheduleSelectedRefresh(false) }
  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'hidden') this.scheduleSelectedRefresh(true)
  }
  private readonly handlePageShow = (): void => { this.scheduleSelectedRefresh(true) }

  private scheduleSelectedRefresh(afterLayout: boolean): void {
    if ((!this.selectedTarget && !this.groupTargets.length) || typeof window === 'undefined') return
    if (this.selectedFrame) window.cancelAnimationFrame(this.selectedFrame)
    this.selectedFrame = window.requestAnimationFrame(() => {
      this.selectedFrame = 0
      if (!afterLayout) { if (this.selectedTarget || this.groupTargets.length) this.updateSelected(); return }
      this.selectedFrame = window.requestAnimationFrame(() => {
        this.selectedFrame = 0
        if (this.selectedTarget || this.groupTargets.length) this.updateSelected()
      })
    })
  }

  private syncSelectedObserverTargets(): void {
    this.selectedResizeObserver?.disconnect()
    if ((!this.selectedTarget && !this.groupTargets.length) || typeof ResizeObserver === 'undefined') return
    if (!this.selectedResizeObserver) this.selectedResizeObserver = new ResizeObserver(() => this.scheduleSelectedRefresh(false))
    const candidates = [this.selectedTarget, this.selectedTarget?.parentElement, this.guideBoundary, this.groupParent, ...this.groupTargets].filter((entry): entry is Element => Boolean(entry?.isConnected))
    for (const element of new Set(candidates)) this.selectedResizeObserver.observe(element)
  }

  private isStudioOwned(element: Element): boolean { return Boolean(element.closest('[data-theme-studio-root], [data-theme-studio-inspector], [data-theme-studio-widget]')) }

  private refreshInspectorCoordinateMap(): void {
    const probeRect = this.coordinateProbe.getBoundingClientRect()
    const rawScaleX = probeRect.width / COORDINATE_PROBE_SIZE
    const rawScaleY = probeRect.height / COORDINATE_PROBE_SIZE
    this.inspectorCoordinateMap = {
      originX: Number.isFinite(probeRect.left) ? probeRect.left : 0,
      originY: Number.isFinite(probeRect.top) ? probeRect.top : 0,
      scaleX: Number.isFinite(rawScaleX) && rawScaleX > 0.001 ? rawScaleX : 1,
      scaleY: Number.isFinite(rawScaleY) && rawScaleY > 0.001 ? rawScaleY : 1,
    }
  }

  private toInspectorRect(viewportRect: DOMRect): DOMRect {
    const map = this.inspectorCoordinateMap
    return rect(
      (viewportRect.left - map.originX) / map.scaleX,
      (viewportRect.top - map.originY) / map.scaleY,
      viewportRect.width / map.scaleX,
      viewportRect.height / map.scaleY,
    )
  }

  private toInspectorPoint(left: number, top: number): { left: number; top: number } {
    const map = this.inspectorCoordinateMap
    return { left: (left - map.originX) / map.scaleX, top: (top - map.originY) / map.scaleY }
  }

  private elementViewportScale(target: Element, targetRect: DOMRect): { x: number; y: number } {
    const sized = target as HTMLElement
    const width = Number(sized.offsetWidth)
    const height = Number(sized.offsetHeight)
    const x = Number.isFinite(width) && width > 0 ? targetRect.width / width : 1
    const y = Number.isFinite(height) && height > 0 ? targetRect.height / height : 1
    return { x: Number.isFinite(x) && x > 0.001 ? x : 1, y: Number.isFinite(y) && y > 0.001 ? y : 1 }
  }

  private updateSelected(): void {
    if (this.groupTargets.length) { this.renderGroupGeometry(); return }
    if (!this.selectedTarget) return
    this.updateOverlay(this.selectedTarget, this.selectedOverlay, this.selectedLabel, 'below')
    this.renderGeometry(this.selectedTarget)
  }

  private renderGroupGeometry(): void {
    this.refreshInspectorCoordinateMap()
    this.guideLayer.replaceChildren()
    const members = this.groupTargets.filter((element) => element.isConnected)
    if (!members.length) { this.guideLayer.hidden = true; return }
    this.guideLayer.hidden = false
    const parent = this.groupParent?.isConnected ? this.groupParent : members[0].parentElement
    if (parent) {
      const parentRect = parent.getBoundingClientRect()
      if (parentRect.width > 0 && parentRect.height > 0) this.appendGuide('layout-parent', parentRect, 'Group parent')
    }
    members.forEach((element, index) => {
      const targetRect = element.getBoundingClientRect()
      if (targetRect.width <= 0 || targetRect.height <= 0) return
      const guide = this.appendGuide('layout-selected-child', targetRect, `${index + 1}`)
      guide.setAttribute('data-group-member', String(index + 1))
    })
  }

  private updateOverlay(target: Element, overlay: HTMLDivElement, label: HTMLDivElement, placement: 'auto' | 'below' = 'auto'): void {
    if (!target.isConnected) { overlay.hidden = true; label.hidden = true; return }
    this.refreshInspectorCoordinateMap()
    const targetRect = target.getBoundingClientRect()
    if (targetRect.width <= 0 || targetRect.height <= 0 || targetRect.bottom <= 0 || targetRect.right <= 0 || targetRect.top >= window.innerHeight || targetRect.left >= window.innerWidth) { overlay.hidden = true; label.hidden = true; return }
    const inspectorRect = this.toInspectorRect(targetRect)
    overlay.hidden = false
    overlay.style.transform = `translate(${Math.round(inspectorRect.left)}px, ${Math.round(inspectorRect.top)}px)`
    overlay.style.width = `${Math.round(inspectorRect.width)}px`; overlay.style.height = `${Math.round(inspectorRect.height)}px`
    label.hidden = false; label.textContent = this.describe(target, targetRect)
    const belowTop = targetRect.bottom + 5
    const labelTop = placement === 'below'
      ? (belowTop < window.innerHeight - 28 ? belowTop : Math.max(4, targetRect.top - 28))
      : (targetRect.top > 32 ? targetRect.top - 28 : belowTop)
    // Measure after setting the label text so thin/full-width targets do not
    // push the badge off the right edge of the viewport.
    const labelWidth = Math.max(0, label.getBoundingClientRect().width)
    const maxLeft = Math.max(4, window.innerWidth - labelWidth - 4)
    const labelLeft = Math.max(4, Math.min(maxLeft, targetRect.left))
    const inspectorLabelPoint = this.toInspectorPoint(labelLeft, labelTop)
    label.style.transform = `translate(${Math.round(inspectorLabelPoint.left)}px, ${Math.round(inspectorLabelPoint.top)}px)`
  }

  private renderGeometry(target: Element): void {
    this.guideLayer.replaceChildren()
    if (this.guideMode === 'outline' || !target.isConnected) { this.guideLayer.hidden = true; return }
    const targetRect = target.getBoundingClientRect()
    if (targetRect.width <= 0 || targetRect.height <= 0) { this.guideLayer.hidden = true; return }
    this.guideLayer.hidden = false
    if (this.guideMode === 'box') this.renderBoxModel(target, targetRect)
    else if (this.guideMode === 'size') this.renderSizeGuide(target, targetRect)
    else this.renderLayoutGuide(target, targetRect)
  }

  private appendGuide(kind: string, targetRect: DOMRect, text?: string): HTMLDivElement {
    const node = document.createElement('div')
    const inspectorRect = this.toInspectorRect(targetRect)
    node.setAttribute('data-guide-kind', kind)
    node.style.left = `${Math.round(inspectorRect.left)}px`; node.style.top = `${Math.round(inspectorRect.top)}px`
    node.style.width = `${Math.round(inspectorRect.width)}px`; node.style.height = `${Math.round(inspectorRect.height)}px`
    if (text) { const label = document.createElement('span'); label.textContent = text; node.append(label) }
    this.guideLayer.append(node)
    return node
  }

  private renderBoxModel(target: Element, targetRect: DOMRect): void {
    const style = getComputedStyle(target)
    const mtCss = px(style, 'margin-top'), mrCss = px(style, 'margin-right'), mbCss = px(style, 'margin-bottom'), mlCss = px(style, 'margin-left')
    const btCss = px(style, 'border-top-width'), brCss = px(style, 'border-right-width'), bbCss = px(style, 'border-bottom-width'), blCss = px(style, 'border-left-width')
    const ptCss = px(style, 'padding-top'), prCss = px(style, 'padding-right'), pbCss = px(style, 'padding-bottom'), plCss = px(style, 'padding-left')
    const targetScale = this.elementViewportScale(target, targetRect)
    const mt = mtCss * targetScale.y, mr = mrCss * targetScale.x, mb = mbCss * targetScale.y, ml = mlCss * targetScale.x
    const bt = btCss * targetScale.y, br = brCss * targetScale.x, bb = bbCss * targetScale.y, bl = blCss * targetScale.x
    const pt = ptCss * targetScale.y, pr = prCss * targetScale.x, pb = pbCss * targetScale.y, pl = plCss * targetScale.x
    this.appendGuide('margin', rect(targetRect.left - ml, targetRect.top - mt, targetRect.width + ml + mr, targetRect.height + mt + mb), `margin ${Math.round(mtCss)} ${Math.round(mrCss)} ${Math.round(mbCss)} ${Math.round(mlCss)}`)
    this.appendGuide('border', targetRect, `border ${Math.round(Math.max(btCss, brCss, bbCss, blCss))}px`)
    const paddingRect = rect(targetRect.left + bl, targetRect.top + bt, targetRect.width - bl - br, targetRect.height - bt - bb)
    this.appendGuide('padding', paddingRect, `padding ${Math.round(ptCss)} ${Math.round(prCss)} ${Math.round(pbCss)} ${Math.round(plCss)}`)
    const contentRect = rect(paddingRect.left + pl, paddingRect.top + pt, paddingRect.width - pl - pr, paddingRect.height - pt - pb)
    this.appendGuide('content', contentRect, `${Math.round(contentRect.width)} × ${Math.round(contentRect.height)}`)
  }

  private renderSizeGuide(target: Element, targetRect: DOMRect): void {
    const parent = this.guideBoundary?.isConnected ? this.guideBoundary : target.parentElement
    if (parent?.isConnected) {
      const parentRect = parent.getBoundingClientRect()
      if (parentRect.width > 0 && parentRect.height > 0) this.appendGuide('containing-block', parentRect, `${this.guideBoundary ? 'boundary' : 'parent'} · ${Math.round(parentRect.width)} × ${Math.round(parentRect.height)}`)
    }
    this.appendGuide('size', targetRect, `${Math.round(targetRect.width)} × ${Math.round(targetRect.height)}`)
    const centerX = targetRect.left + targetRect.width / 2, centerY = targetRect.top + targetRect.height / 2
    const x = this.appendGuide('dimension-x', rect(targetRect.left, centerY, targetRect.width, 1)); x.style.setProperty('--guide-length', `${Math.round(targetRect.width)}px`)
    const y = this.appendGuide('dimension-y', rect(centerX, targetRect.top, 1, targetRect.height)); y.style.setProperty('--guide-length', `${Math.round(targetRect.height)}px`)
  }

  private renderLayoutGuide(target: Element, targetRect: DOMRect): void {
    const ownDisplay = getComputedStyle(target).display
    const parent = target.parentElement
    const parentDisplay = parent ? getComputedStyle(parent).display : ''
    const isOwnLayout = /^(inline-)?(flex|grid)$/.test(ownDisplay)
    const layoutElement: Element = isOwnLayout ? target : parent && /^(inline-)?(flex|grid)$/.test(parentDisplay) ? parent : target
    const style = getComputedStyle(layoutElement)
    const layoutRect = layoutElement.getBoundingClientRect()
    const isFlex = style.display.includes('flex'), isGrid = style.display.includes('grid')
    this.appendGuide('layout-parent', layoutRect, isFlex ? `flex · ${style.flexDirection} · gap ${style.gap}` : isGrid ? `grid · ${style.gridTemplateColumns}` : `${style.display || 'block'} layout`)
    const children = [...layoutElement.children].filter((child) => {
      const childRect = child.getBoundingClientRect(); return childRect.width > 0 && childRect.height > 0
    }).slice(0, 40)
    for (const child of children) {
      const childRect = child.getBoundingClientRect()
      const guide = this.appendGuide(child === target ? 'layout-selected-child' : 'layout-child', childRect)
      if (child === target) guide.setAttribute('data-selected', 'true')
    }
    if (isGrid && children.length) {
      const xLines = new Set<number>(), yLines = new Set<number>()
      for (const child of children) {
        const r = child.getBoundingClientRect()
        xLines.add(Math.round(r.left)); xLines.add(Math.round(r.right)); yLines.add(Math.round(r.top)); yLines.add(Math.round(r.bottom))
      }
      for (const x of xLines) if (x > layoutRect.left + 1 && x < layoutRect.right - 1) this.appendGuide('grid-line-x', rect(x, layoutRect.top, 1, layoutRect.height))
      for (const y of yLines) if (y > layoutRect.top + 1 && y < layoutRect.bottom - 1) this.appendGuide('grid-line-y', rect(layoutRect.left, y, layoutRect.width, 1))
    }
    if (isFlex && children.length > 1) {
      const column = style.flexDirection.startsWith('column')
      const ordered = children.map((child) => child.getBoundingClientRect()).sort((a, b) => column ? a.top - b.top : a.left - b.left)
      for (let index = 0; index < ordered.length - 1; index += 1) {
        const a = ordered[index], b = ordered[index + 1]
        if (column && b.top > a.bottom) this.appendGuide('flex-gap', rect(Math.max(layoutRect.left, Math.min(a.left, b.left)), a.bottom, Math.min(layoutRect.width, Math.max(a.width, b.width)), b.top - a.bottom), `${Math.round(b.top - a.bottom)}px gap`)
        if (!column && b.left > a.right) this.appendGuide('flex-gap', rect(a.right, Math.max(layoutRect.top, Math.min(a.top, b.top)), b.left - a.right, Math.min(layoutRect.height, Math.max(a.height, b.height))), `${Math.round(b.left - a.right)}px gap`)
      }
    }
    if (isFlex) {
      const column = style.flexDirection.startsWith('column')
      const reverse = style.flexDirection.endsWith('reverse')
      const axis = document.createElement('div'); axis.setAttribute('data-guide-kind', 'flex-axis'); axis.setAttribute('data-axis', column ? 'column' : 'row'); axis.setAttribute('data-reverse', String(reverse))
      const axisViewportRect = column
        ? rect(layoutRect.left + layoutRect.width / 2, layoutRect.top + 8, 1, Math.max(0, layoutRect.height - 16))
        : rect(layoutRect.left + 8, layoutRect.top + layoutRect.height / 2, Math.max(0, layoutRect.width - 16), 1)
      const axisRect = this.toInspectorRect(axisViewportRect)
      axis.style.left = `${Math.round(axisRect.left)}px`; axis.style.top = `${Math.round(axisRect.top)}px`
      if (column) axis.style.height = `${Math.max(0, Math.round(axisRect.height))}px`
      else axis.style.width = `${Math.max(0, Math.round(axisRect.width))}px`
      this.guideLayer.append(axis)
    }
    if (!isFlex && !isGrid && target !== layoutElement) this.appendGuide('layout-selected-child', targetRect, 'selected')
  }

  private describe(element: Element, targetRect: DOMRect): string {
    const component = element.getAttribute('data-component')
    const moduleClass = [...element.classList].map((name) => name.match(/^_([A-Za-z][A-Za-z0-9_-]*?)_[A-Za-z0-9]{4,}_[0-9]+$/)?.[1]).find(Boolean)
    const aria = element.getAttribute('aria-label')
    const identity = component
      ?? moduleClass?.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
      ?? aria
      ?? element.tagName.toLowerCase()
    return `${identity}  ·  ${Math.round(targetRect.width)} × ${Math.round(targetRect.height)}`
  }

  private hideHover(): void { this.overlay.hidden = true; this.label.hidden = true }
  private hideSelected(): void { this.selectedOverlay.hidden = true; this.selectedLabel.hidden = true; this.guideLayer.hidden = true; this.guideLayer.replaceChildren() }
  private updateSelectedListeners(enabled: boolean): void {
    document.removeEventListener('scroll', this.handleViewportChange, true)
    window.removeEventListener('resize', this.handleViewportChange, true)
    window.removeEventListener('orientationchange', this.handleViewportChange, true)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange, true)
    window.removeEventListener('pageshow', this.handlePageShow, true)
    window.visualViewport?.removeEventListener('resize', this.handleViewportChange)
    window.visualViewport?.removeEventListener('scroll', this.handleViewportChange)
    if (enabled) {
      document.addEventListener('scroll', this.handleViewportChange, true)
      window.addEventListener('resize', this.handleViewportChange, true)
      window.addEventListener('orientationchange', this.handleViewportChange, true)
      document.addEventListener('visibilitychange', this.handleVisibilityChange, true)
      window.addEventListener('pageshow', this.handlePageShow, true)
      window.visualViewport?.addEventListener('resize', this.handleViewportChange)
      window.visualViewport?.addEventListener('scroll', this.handleViewportChange)
      this.syncSelectedObserverTargets()
    } else {
      this.selectedResizeObserver?.disconnect()
      if (this.selectedFrame) { window.cancelAnimationFrame(this.selectedFrame); this.selectedFrame = 0 }
    }
  }

  private stop(notifyCancel: boolean): void {
    if (!this.active) return
    this.active = false; this.hoverTarget = null
    document.removeEventListener('pointermove', this.handlePointerMove, true)
    document.removeEventListener('pointerdown', this.handlePointerDown, true)
    document.removeEventListener('keydown', this.handleKeyDown, true)
    document.documentElement.style.cursor = ''
    this.hideHover()
    const callback = notifyCancel ? this.options?.onCancel : undefined
    this.options = null; callback?.()
  }
}
