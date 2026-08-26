import type { ProjectStore } from '../project/store'
import { STYLE_STATES, type ComponentOverride, type ImagePacket, type ThemeStudioProject } from '../project/model'
import { compileSafeTargetSelector } from '../compiler/compiler'

export type ImageSourceQuality = 'native' | 'auto' | 'full'
type ImageSourceTier = 'sm' | 'lg' | 'full'

interface TrackedImage {
  nativeSrc: string
  nativeSrcset: string | null
  appliedSrc: string
  appliedSrcset: string | null
  mode: Exclude<ImageSourceQuality, 'native'>
  tier?: ImageSourceTier
  awaitingSource?: string
}

function serializeLikeInput(url: URL, input: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(input) || input.startsWith('//')) return url.href
  return `${url.pathname}${url.search}${url.hash}`
}

function parsedSupportedSource(input: string, base = typeof location !== 'undefined' ? location.href : 'http://localhost/'): { url: URL; input: string; tier: ImageSourceTier; directPath: string } | null {
  const trimmed = input.trim()
  if (!trimmed || /^(?:data:|blob:)/i.test(trimmed)) return null
  let url: URL
  try { url = new URL(trimmed, base) } catch { return null }

  const avatarRoute = /^\/api\/v1\/(?:characters|personas)\/[^/]+\/avatar\/?$/i.test(url.pathname)
  const directImageRoute = /^\/api\/v1\/images\/[^/]+\/?$/i.test(url.pathname)
  if (avatarRoute || directImageRoute) {
    const rawTier = url.searchParams.get('size')
    const tier: ImageSourceTier = rawTier === 'sm' || rawTier === 'lg' ? rawTier : 'full'
    return { url, input: trimmed, tier, directPath: url.pathname.replace(/\/$/, '') }
  }

  const thumbnailPath = url.pathname.match(/^(\/api\/v1\/images\/[^/]+)\/(?:thumbnail|thumb)(?:\/(sm|lg))?\/?$/i)
  if (!thumbnailPath) return null
  const queryTier = url.searchParams.get('size')
  const pathTier = thumbnailPath[2]?.toLowerCase()
  const tier: ImageSourceTier = queryTier === 'sm' || queryTier === 'lg' ? queryTier : pathTier === 'sm' || pathTier === 'lg' ? pathTier : 'lg'
  return { url, input: trimmed, tier, directPath: thumbnailPath[1] }
}

/**
 * Resolve a supported Lumiverse avatar/image source to a requested tier. `full`
 * means the original resolver (no size query). Unknown URLs are deliberately left
 * alone rather than guessing at application data.
 */
export function deriveImageSourceTier(input: string, tier: ImageSourceTier, base = typeof location !== 'undefined' ? location.href : 'http://localhost/'): string | null {
  const parsed = parsedSupportedSource(input, base)
  if (!parsed) return null
  parsed.url.pathname = parsed.directPath
  if (tier === 'full') parsed.url.searchParams.delete('size')
  else parsed.url.searchParams.set('size', tier)
  return serializeLikeInput(parsed.url, parsed.input)
}

/** Convert Lumiverse's known avatar/image thumbnail routes to their full resolver. */
export function deriveFullImageSource(input: string, base = typeof location !== 'undefined' ? location.href : 'http://localhost/'): string | null {
  const parsed = parsedSupportedSource(input, base)
  if (!parsed || parsed.tier === 'full') return null
  return deriveImageSourceTier(input, 'full', base)
}

function imageSourcePackets(override: ComponentOverride, mobile: boolean): ImagePacket[] {
  const packets: ImagePacket[] = []
  const add = (items: readonly unknown[] | undefined) => {
    for (const packet of items ?? []) {
      if ((packet as ImagePacket)?.type !== 'image') continue
      const quality = (packet as ImagePacket).sourceQuality ?? 'native'
      if (quality === 'auto' || quality === 'full') packets.push(packet as ImagePacket)
    }
  }
  for (const state of STYLE_STATES) add(override.states[state])
  if (mobile) for (const state of STYLE_STATES) add(override.mobileStates?.[state])
  return packets
}

function activeImageSourceTargets(project: ThemeStudioProject): Array<{ selector: string; quality: Exclude<ImageSourceQuality, 'native'> }> {
  const mobile = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 720px)').matches
  const result: Array<{ selector: string; quality: Exclude<ImageSourceQuality, 'native'> }> = []
  for (const override of project.componentOverrides) {
    if (/::(?:before|after)\s*$/i.test(override.target.selector)) continue
    const packets = imageSourcePackets(override, mobile)
    if (!packets.length) continue
    const selector = compileSafeTargetSelector(override.target)
    if (!selector) continue
    result.push({ selector, quality: packets.some((packet) => packet.sourceQuality === 'full') ? 'full' : 'auto' })
  }
  return result
}

function imagesForSelector(selector: string): HTMLImageElement[] {
  try {
    const result = new Set<HTMLImageElement>()
    for (const element of document.querySelectorAll(selector)) {
      if (element instanceof HTMLImageElement) result.add(element)
      else for (const image of element.querySelectorAll('img')) result.add(image)
    }
    return [...result]
  } catch {
    return []
  }
}

function tierRank(tier: ImageSourceTier): number { return tier === 'sm' ? 0 : tier === 'lg' ? 1 : 2 }
function nextTier(tier: ImageSourceTier): ImageSourceTier { return tier === 'sm' ? 'lg' : 'full' }
function effectivePixelScale(): number {
  const dpr = typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1
  // Auto aims for a clean UI image, not maximum-density art. A capped DPR keeps
  // large list surfaces from immediately promoting every thumbnail to original.
  return Math.min(1.35, Math.max(1, dpr)) * 1.05
}
function imageNeedsMorePixels(image: HTMLImageElement): boolean {
  if (!image.naturalWidth || !image.naturalHeight) return false
  const rect = image.getBoundingClientRect()
  if (rect.width <= 1 || rect.height <= 1) return false
  const scale = effectivePixelScale()
  return image.naturalWidth + 2 < rect.width * scale || image.naturalHeight + 2 < rect.height * scale
}

/**
 * Small DOM-mutation bridge for presentation-only properties React does not expose
 * through CSS. It never replaces components or owns application state. Full always
 * requests the original image. Auto begins with Lumiverse's native tier and only
 * promotes sm -> lg -> original when the mounted surface actually outruns the
 * currently loaded pixels. Auto never downshifts during a mounted session, avoiding
 * source churn while a Size slider is moving.
 */
export class ImageSourceRuntime {
  private readonly tracked = new Map<HTMLImageElement, TrackedImage>()
  private readonly unsubscribe: () => void
  private readonly observer: MutationObserver
  private readonly resizeObserver?: ResizeObserver
  private queued = false
  private destroyed = false
  private readonly onImageLoad = (event: Event) => {
    if (!(event.target instanceof HTMLImageElement)) return
    const state = this.tracked.get(event.target)
    if (!state) return
    if (state.awaitingSource === (event.target.getAttribute('src') ?? '')) state.awaitingSource = undefined
    this.queueSync()
  }

  constructor(private readonly store: ProjectStore) {
    this.unsubscribe = store.subscribe(() => this.queueSync())
    this.observer = new MutationObserver(() => this.queueSync())
    this.observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'srcset'] })
    this.resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.queueSync()) : undefined
    document.addEventListener('load', this.onImageLoad, true)
    this.sync()
  }

  private queueSync(): void {
    if (this.destroyed || this.queued) return
    this.queued = true
    queueMicrotask(() => { this.queued = false; if (!this.destroyed) this.sync() })
  }

  private stateFor(image: HTMLImageElement, mode: Exclude<ImageSourceQuality, 'native'>): TrackedImage {
    const currentSrc = image.getAttribute('src') ?? ''
    const currentSrcset = image.getAttribute('srcset')
    let state = this.tracked.get(image)
    if (!state) {
      state = { nativeSrc: currentSrc, nativeSrcset: currentSrcset, appliedSrc: '', appliedSrcset: currentSrcset, mode }
      this.tracked.set(image, state)
      this.resizeObserver?.observe(image)
    } else {
      if (currentSrc !== state.appliedSrc) state.nativeSrc = currentSrc
      if (currentSrcset !== state.appliedSrcset) state.nativeSrcset = currentSrcset
      if (state.mode !== mode) {
        // An explicit Native/Auto/Full mode change is allowed to choose a new tier;
        // automatic resizing inside Auto only moves upward from there.
        state.mode = mode
        state.tier = undefined
      }
    }
    return state
  }

  private applySource(image: HTMLImageElement, state: TrackedImage, source: string): void {
    const changed = image.getAttribute('src') !== source
    if (changed) image.setAttribute('src', source)
    // A thumbnail srcset can override src during candidate selection. Controlled
    // modes temporarily remove it, then restore the latest native value on exit.
    if (image.hasAttribute('srcset')) image.removeAttribute('srcset')
    state.appliedSrc = source
    state.appliedSrcset = null
    state.awaitingSource = changed ? source : undefined
  }

  private applyFull(image: HTMLImageElement): void {
    const state = this.stateFor(image, 'full')
    const parsed = parsedSupportedSource(state.nativeSrc)
    if (!parsed) { state.appliedSrc = image.getAttribute('src') ?? ''; state.appliedSrcset = image.getAttribute('srcset'); return }
    const full = deriveImageSourceTier(state.nativeSrc, 'full')
    if (!full) return
    state.tier = 'full'
    this.applySource(image, state, full)
  }

  private applyAuto(image: HTMLImageElement): void {
    const state = this.stateFor(image, 'auto')
    const parsed = parsedSupportedSource(state.nativeSrc)
    if (!parsed) { state.appliedSrc = image.getAttribute('src') ?? ''; state.appliedSrcset = image.getAttribute('srcset'); return }

    if (!state.tier) state.tier = parsed.tier
    // If React already supplied the original, Auto has nothing useful to do.
    if (parsed.tier === 'full') { state.tier = 'full'; state.appliedSrc = image.getAttribute('src') ?? ''; state.appliedSrcset = image.getAttribute('srcset'); return }

    // Once a controlled candidate has loaded, only promote if its real intrinsic
    // pixels are still smaller than the rendered surface. No guessed sm/lg sizes.
    if (!state.awaitingSource && imageNeedsMorePixels(image) && state.tier !== 'full') state.tier = nextTier(state.tier)
    // Never let a stale state choose a tier below what Lumiverse itself supplied.
    if (tierRank(state.tier) < tierRank(parsed.tier)) state.tier = parsed.tier

    const source = deriveImageSourceTier(state.nativeSrc, state.tier)
    if (!source) return
    if (state.tier === parsed.tier && image.getAttribute('src') === state.nativeSrc && image.getAttribute('srcset') === state.nativeSrcset) {
      state.appliedSrc = state.nativeSrc
      state.appliedSrcset = state.nativeSrcset
      return
    }
    this.applySource(image, state, source)
  }

  private restore(image: HTMLImageElement, state: TrackedImage): void {
    this.resizeObserver?.unobserve(image)
    if (!image.isConnected) return
    if (image.getAttribute('src') === state.appliedSrc && image.getAttribute('src') !== state.nativeSrc) image.setAttribute('src', state.nativeSrc)
    if (state.nativeSrcset === null) image.removeAttribute('srcset')
    else if (image.getAttribute('srcset') !== state.nativeSrcset) image.setAttribute('srcset', state.nativeSrcset)
  }

  sync(): void {
    if (this.destroyed) return
    const desired = new Map<HTMLImageElement, Exclude<ImageSourceQuality, 'native'>>()
    for (const target of activeImageSourceTargets(this.store.activeProject)) {
      for (const image of imagesForSelector(target.selector)) {
        const previous = desired.get(image)
        desired.set(image, previous === 'full' || target.quality === 'full' ? 'full' : 'auto')
      }
    }
    for (const [image, quality] of desired) quality === 'full' ? this.applyFull(image) : this.applyAuto(image)
    for (const [image, state] of [...this.tracked]) {
      if (desired.has(image)) continue
      this.restore(image, state)
      this.tracked.delete(image)
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.observer.disconnect()
    this.resizeObserver?.disconnect()
    document.removeEventListener('load', this.onImageLoad, true)
    this.unsubscribe()
    for (const [image, state] of this.tracked) this.restore(image, state)
    this.tracked.clear()
  }
}
