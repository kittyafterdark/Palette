import type { SpindleFrontendContext, ThemeInfoDTO } from 'lumiverse-spindle-types'
import { inspectBoostCssValue, transformThemeVariables, type BoostTransformDiagnostics } from '../compiler/boost'
import { parseHexColor } from '../compiler/color'
import type { BoostColor, BoostPaletteRole, ProjectBoost } from '../project/model'
import { portableRandomUUID } from '../utils/random-id'

interface ThemeBaseline { info: ThemeInfoDTO; variables: Record<string, string> }
export interface BoostRuntimeDiagnostics { authority: 'root-inline-important'; variable?: string; expected?: string; inline?: string; priority?: string; computed?: string; matches?: boolean; backendMirrored: boolean; backendError?: string }
type Pending = { resolve(value: unknown): void; reject(error: Error): void }

function themeBaselineFingerprint(baseline: ThemeBaseline): string {
  const info = baseline.info ?? ({} as ThemeInfoDTO)
  const infoKey = JSON.stringify({ accent: info.accent, mode: info.mode, enableGlass: info.enableGlass, radiusScale: info.radiusScale, fontScale: info.fontScale, uiScale: info.uiScale })
  const variablesKey = JSON.stringify(Object.entries(baseline.variables).sort(([a], [b]) => a.localeCompare(b)))
  return `${infoKey}\n${variablesKey}`
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }

function boostNeedsNativeBaseline(boost: ProjectBoost | undefined): boolean {
  return Boolean(boost?.enabled && (boost.colorsEnabled || boost.canvasEnabled))
}

export function typographyAuthorityVariables(boost: ProjectBoost): Record<string, string> {
  if (!boost.enabled || !boost.typographyEnabled) return {}
  const variables: Record<string, string> = {}
  const family = boost.typography.fontFamily?.trim()
  if (family) variables['--lumiverse-font-family'] = family
  if (boost.typography.scale !== undefined && Number.isFinite(boost.typography.scale)) variables['--lumiverse-font-scale'] = String(Math.max(.25, Math.min(4, boost.typography.scale)))
  return variables
}
function byte(value: number): string { return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0') }
export function cssColorToHex(value: string | undefined): string | undefined {
  if (!value) return undefined
  const parsed = parseHexColor(value); if (parsed) return `#${byte(parsed.r)}${byte(parsed.g)}${byte(parsed.b)}`
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (rgb) return `#${byte(Number(rgb[1]))}${byte(Number(rgb[2]))}${byte(Number(rgb[3]))}`
  if (typeof document !== 'undefined') {
    const probe = document.createElement('span'); probe.style.color = value
    if (probe.style.color) { document.documentElement.append(probe); const computed = getComputedStyle(probe).color; probe.remove(); if (computed !== value) return cssColorToHex(computed) }
  }
  return undefined
}
function cssColorToBoostColor(value: string | undefined): BoostColor | undefined {
  if (!value) return undefined
  const parsed = parseHexColor(value); if (parsed) return { color: `#${byte(parsed.r)}${byte(parsed.g)}${byte(parsed.b)}`, alpha: parsed.alpha }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)%?)?/i)
  if (rgb) { const rawAlpha = rgb[4] === undefined ? 1 : Number(rgb[4]); return { color: `#${byte(Number(rgb[1]))}${byte(Number(rgb[2]))}${byte(Number(rgb[3]))}`, alpha: Math.max(0, Math.min(1, rawAlpha > 1 ? rawAlpha / 100 : rawAlpha)) } }
  const color = cssColorToHex(value); return color ? { color, alpha: 1 } : undefined
}
export function materializeBoostBaseline(variables: Record<string, string>): Partial<Record<BoostPaletteRole, BoostColor>> {
  const names: Partial<Record<BoostPaletteRole, string>> = { primary: '--lumiverse-primary', secondary: '--lumiverse-secondary', surface: '--lumiverse-bg', text: '--lumiverse-text', muted: '--lumiverse-text-muted', border: '--lumiverse-border' }
  const result: Partial<Record<BoostPaletteRole, BoostColor>> = {}
  for (const [role, name] of Object.entries(names) as Array<[BoostPaletteRole, string]>) { const color = cssColorToBoostColor(variables[name]); if (color) result[role] = color }
  return result
}

export class ThemeRuntimeBridge {
  private readonly pending = new Map<string, Pending>()
  private readonly unsubscribe: () => void
  private revision = 0
  private operation: Promise<void> = Promise.resolve()
  private baseline?: ThemeBaseline
  private currentBoost?: ProjectBoost
  private lastDiagnostics?: BoostTransformDiagnostics
  private previewRevision = 0
  private liveVariables: Record<string, string> = {}
  private previewVariables?: Record<string, string>
  private readonly underlyingRootDeclarations = new Map<string, { value: string; priority: string }>()
  private rootStyleObserver?: MutationObserver
  private samplingNativeTheme = false
  private lastRuntimeDiagnostics?: BoostRuntimeDiagnostics
  private backendMirrored = false
  private legacyWorkerMirrorCleared = false
  private backendError?: string
  private lastAppliedVariables?: Record<string, string>
  private canvasStyle?: HTMLStyleElement
  private wallpaperStyle?: HTMLStyleElement
  private wallpaperObserver?: MutationObserver
  private sourceRefreshTimer?: ReturnType<typeof setTimeout>
  private sourceWatchRevision = 0
  constructor(private readonly ctx: SpindleFrontendContext) {
    this.unsubscribe = ctx.onBackendMessage((payload) => {
      if (!isRecord(payload) || typeof payload.type !== 'string' || !payload.type.startsWith('theme_studio:theme_') || typeof payload.requestId !== 'string') return
      const request = this.pending.get(payload.requestId); if (!request) return
      this.pending.delete(payload.requestId)
      if (payload.type === 'theme_studio:theme_error') request.reject(new Error(typeof payload.error === 'string' ? payload.error : 'Theme operation failed'))
      else request.resolve(payload.type === 'theme_studio:theme_baseline' ? { info: payload.info, variables: payload.variables } : payload)
    })
  }
  async getBaseline(): Promise<ThemeBaseline> {
    if (this.baseline) return this.baseline
    await this.clearLegacyWorkerMirrorOnce()
    // The live Boost source is *only* spindle.theme.generateVariables(). Never
    // bootstrap from the frontend variable catalog or current root declarations:
    // both are presentation surfaces and can already contain Theme Studio output.
    // Using them as an input is the feedback loop behind Boost-on-Boost drift.
    return this.baseline = await this.sampleNativeBaseline({ forceDetox: true })
  }
  get diagnostics(): BoostTransformDiagnostics | undefined { return this.lastDiagnostics ? structuredClone(this.lastDiagnostics) : undefined }
  get runtimeDiagnostics(): BoostRuntimeDiagnostics | undefined { return this.lastRuntimeDiagnostics ? structuredClone(this.lastRuntimeDiagnostics) : undefined }
  private async clearLegacyWorkerMirrorOnce(): Promise<void> {
    if (this.legacyWorkerMirrorCleared) return
    this.legacyWorkerMirrorCleared = true
    try {
      await this.request({ type: 'theme_studio:clear_theme_override' })
      await this.afterTwoPaints()
    } catch (error) {
      // v25.2 and earlier mirrored Boost through spindle.theme. A hot reload can
      // leave that extension-scoped override alive long enough to look native.
      console.warn('[Theme Studio] Could not clear a legacy worker Boost mirror before reading the native baseline.', error)
    }
  }
  private async fetchCanonicalBaseline(): Promise<ThemeBaseline> {
    const response = await this.request<unknown>({ type: 'theme_studio:get_theme_baseline' })
    if (!isRecord(response) || !isRecord(response.variables)) throw new Error('Canonical theme baseline is unavailable or malformed.')
    const variables: Record<string, string> = {}
    for (const [name, value] of Object.entries(response.variables)) if (typeof value === 'string') variables[name] = value
    if (!Object.keys(variables).length) throw new Error('Canonical theme baseline contains no variables.')
    const info = isRecord(response.info) ? response.info as unknown as ThemeInfoDTO : {} as ThemeInfoDTO
    return { info, variables }
  }
  private rootHasStaleBoostMarker(): boolean {
    if (typeof document === 'undefined') return false
    const root = document.documentElement
    return root.hasAttribute('data-theme-studio-boost-live') || root.hasAttribute('data-theme-studio-boost-previewing')
  }
  private releaseKnownRootAuthorityForSampling(): void {
    if (typeof document === 'undefined') return
    const names = new Set([...Object.keys(this.liveVariables), ...Object.keys(this.previewVariables ?? {})])
    for (const name of names) this.restoreUnderlying(name)
    document.documentElement.removeAttribute('data-theme-studio-boost-live')
    document.documentElement.removeAttribute('data-theme-studio-boost-previewing')
  }
  private seedRootFromWorkerBaseline(baseline: ThemeBaseline): void {
    if (typeof document === 'undefined') return
    const style = document.documentElement.style
    // This path is only used to detox a stale Theme Studio root layer or when the
    // user explicitly asks to Refresh source. The worker baseline is Lumiverse's
    // canonical base-theme variable generator; installing it at normal inline
    // priority removes old Theme Studio `!important` output before the current
    // Boost reclaims authority. The transform source itself remains worker-only.
    for (const [name, value] of Object.entries(baseline.variables)) {
      if (!/^--(?:lumiverse|lcs)-[a-zA-Z0-9-]+$/.test(name) || typeof value !== 'string') continue
      style.setProperty(name, value)
    }
    document.documentElement.removeAttribute('data-theme-studio-boost-live')
    document.documentElement.removeAttribute('data-theme-studio-boost-previewing')
  }
  private async sampleNativeBaseline(options: { forceDetox?: boolean } = {}): Promise<ThemeBaseline> {
    if (this.samplingNativeTheme) return await this.fetchCanonicalBaseline()

    // A plain source read never needs to touch the DOM. The worker generates the
    // native variable map from Lumiverse theme state, so it cannot observe our
    // root-inline Boost authority. DOM detox is reserved for startup/manual
    // Refresh source where old builds may have left unknown inline !important vars.
    const staleMarker = this.rootHasStaleBoostMarker()
    if (!options.forceDetox && !staleMarker) return await this.fetchCanonicalBaseline()

    this.samplingNativeTheme = true
    const hadLive = Object.keys(this.liveVariables).length > 0
    const hadPreview = Boolean(this.previewVariables && Object.keys(this.previewVariables).length)
    try {
      this.rootStyleObserver?.disconnect()
      this.rootStyleObserver = undefined
      this.releaseKnownRootAuthorityForSampling()
      const workerBaseline = await this.fetchCanonicalBaseline()
      this.seedRootFromWorkerBaseline(workerBaseline)
      await this.afterTwoPaints()
      return workerBaseline
    } finally {
      this.samplingNativeTheme = false
      if (typeof document !== 'undefined') {
        if (hadLive) document.documentElement.setAttribute('data-theme-studio-boost-live', '')
        if (hadPreview) document.documentElement.setAttribute('data-theme-studio-boost-previewing', '')
      }
      if (hadLive || hadPreview) {
        this.ensureRootStyleObserver()
        this.reassertRootAuthority()
      }
    }
  }
  private async rebaseFromCanonicalIfChanged(): Promise<boolean> {
    if (!boostNeedsNativeBaseline(this.currentBoost)) return false
    const next = await this.fetchCanonicalBaseline()
    if (this.baseline && themeBaselineFingerprint(next) === themeBaselineFingerprint(this.baseline)) return false
    this.baseline = next
    const boost = this.currentBoost ? structuredClone(this.currentBoost) : undefined
    if (boost?.enabled) await this.sync(boost)
    return true
  }
  private scheduleCanonicalRebase(): void {
    if (!boostNeedsNativeBaseline(this.currentBoost)) return
    if (this.sourceRefreshTimer) clearTimeout(this.sourceRefreshTimer)
    this.sourceRefreshTimer = setTimeout(() => {
      this.sourceRefreshTimer = undefined
      void this.rebaseFromCanonicalIfChanged().catch((error) => console.warn('[Theme Studio] Could not rebase Boost after a native theme change.', error))
    }, 120)
  }
  async stabilizeStartupSource(): Promise<void> {
    const watch = ++this.sourceWatchRevision
    // Lumiverse can finish installing the selected native theme after extensions
    // begin setup. Refresh source worked because the same canonical worker sample
    // was taken later. Watch the short startup window and atomically rebase only
    // when generateVariables() actually changes; the existing Boost stays painted
    // while the replacement transform is prepared.
    for (const delay of [80, 160, 320, 640, 1200]) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      if (watch !== this.sourceWatchRevision || !boostNeedsNativeBaseline(this.currentBoost)) return
      await this.rebaseFromCanonicalIfChanged()
    }
  }
  async refreshBaseline(): Promise<ThemeBaseline> {
    this.clearPreview()
    await this.clearLegacyWorkerMirrorOnce()
    this.baseline = undefined
    const baseline = await this.sampleNativeBaseline({ forceDetox: true })
    this.baseline = baseline
    if (this.currentBoost) await this.sync(this.currentBoost)
    return baseline
  }
  async syncFromCanonicalSource(boost: ProjectBoost): Promise<void> {
    await this.clearLegacyWorkerMirrorOnce()
    // Typography-only Boost is not a palette transform and does not need to sample
    // or carry the native variable map at all. Project switches can apply those two
    // root vars directly. Colors/Backdrop remain canonical-source transforms.
    if (!boostNeedsNativeBaseline(boost)) { this.baseline = undefined; await this.sync(boost); return }
    // Project activation is a source boundary. Keep the previous live Boost painted,
    // fetch a fresh worker-generated native map, then replace it atomically with the
    // newly selected project's transform. No catalog/root sampling is involved.
    this.baseline = await this.fetchCanonicalBaseline()
    await this.sync(boost)
  }
  async sync(boost: ProjectBoost): Promise<void> {
    this.clearPreview()
    const revision = ++this.revision; this.currentBoost = structuredClone(boost)
    this.operation = this.operation.catch(() => undefined).then(async () => {
      if (revision !== this.revision) return
      if (!boost.enabled) { this.lastDiagnostics = undefined; this.lastRuntimeDiagnostics = undefined; this.lastAppliedVariables = undefined; this.backendMirrored = false; this.backendError = undefined; this.clearLiveBoost(); this.clearCanvasOverlay(); this.clearWallpaperTreatment(); this.baseline = undefined; try { await this.request({ type: 'theme_studio:clear_theme_override' }) } catch (error) { console.warn('[Theme Studio] Could not clear worker Boost mirror; local authority was removed.', error) } return }
      if (!boostNeedsNativeBaseline(boost)) {
        await this.clearLegacyWorkerMirrorOnce(); if (revision !== this.revision) return
        const typography = typographyAuthorityVariables(boost)
        this.lastDiagnostics = undefined; this.backendMirrored = false; this.backendError = undefined; this.baseline = undefined
        this.applyLiveBoost(typography); this.lastAppliedVariables = structuredClone(typography)
        this.clearCanvasOverlay(); this.clearWallpaperTreatment(); this.updateRuntimeDiagnostics()
        return
      }
      const baseline = await this.getBaseline(); if (revision !== this.revision) return
      const transformed = transformThemeVariables(baseline.variables, boost); this.lastDiagnostics = transformed.diagnostics
      const variable = '--lumiverse-primary', baselineValue = baseline.variables[variable], outgoingValue = transformed.variables[variable]
      console.debug('[Theme Studio] Boost CSS value trace', { variable, baseline: typeof baselineValue === 'string' ? inspectBoostCssValue(baselineValue) : { json: JSON.stringify(baselineValue), type: typeof baselineValue }, outgoing: typeof outgoingValue === 'string' ? inspectBoostCssValue(outgoingValue) : { json: JSON.stringify(outgoingValue), type: typeof outgoingValue } })

      // Native Lumiverse resolves theme variables as inline declarations on <html>.
      // Claim that exact declaration block first, before the worker round-trip. If
      // the worker theme mirror is muted or temporarily unavailable, the explicit
      // Theme Studio action still works immediately instead of becoming a no-op.
      this.applyLiveBoost(transformed.variables)
      this.lastAppliedVariables = structuredClone(transformed.variables)
      // Do not mirror the transformed map back through spindle.theme while root
      // authority is active. That API participates in Lumiverse's resolved theme
      // baseline; mirroring Boost there makes the source become its own output and
      // repeated refresh/reload cycles drift the palette (Boost-on-Boost). The
      // frontend root layer is the sole live authority; worker clear remains only
      // as backward-compat cleanup for older Theme Studio builds.
      this.backendMirrored = false; this.backendError = undefined
      // A newer sync may already be queued behind this one; its inline authority
      // is allowed to replace this payload without exposing a native/base frame.
      if (revision !== this.revision) return
      await this.afterTwoPaints()
      // Theme bundles are allowed to contain their own `:root { --var: ... !important }`
      // declarations. The native Theme API cannot out-cascade those from an inline
      // variable map, so Canvas gets one tiny, explicit high-priority overlay for
      // the scene-wash family only. It is independent from Design preview layers.
      this.applyCanvasOverlay(transformed.variables, boost.canvasEnabled)
      this.applyWallpaperTreatment(boost, boost.canvasEnabled && boost.wallpaperTreatmentEnabled)
      this.updateRuntimeDiagnostics()
      if (typeof document !== 'undefined' && transformed.diagnostics.samples[0]) {
        const sample = transformed.diagnostics.samples[0], computed = getComputedStyle(document.documentElement).getPropertyValue(sample.variable).trim()
        if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) console.debug('[Theme Studio] Boost applied', { ...transformed.diagnostics, computedSample: { variable: sample.variable, expected: sample.after, computed } })
      }
    })
    await this.operation
  }

  private effectiveAuthorityVariables(): Record<string, string> {
    return this.previewVariables ?? this.liveVariables
  }
  private rememberUnderlying(name: string): void {
    if (typeof document === 'undefined' || this.underlyingRootDeclarations.has(name)) return
    const style = document.documentElement.style
    this.underlyingRootDeclarations.set(name, { value: style.getPropertyValue(name), priority: style.getPropertyPriority(name) })
  }
  private restoreUnderlying(name: string): void {
    if (typeof document === 'undefined') return
    const previous = this.underlyingRootDeclarations.get(name); if (!previous) return
    const style = document.documentElement.style
    if (previous.value) style.setProperty(name, previous.value, previous.priority)
    else style.removeProperty(name)
    this.underlyingRootDeclarations.delete(name)
  }
  private ensureRootStyleObserver(): void {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || this.rootStyleObserver) return
    this.rootStyleObserver = new MutationObserver(() => {
      if (this.samplingNativeTheme) return
      const variables = this.effectiveAuthorityVariables(); if (!Object.keys(variables).length) return
      const style = document.documentElement.style
      let needsReassert = false
      for (const [name, expected] of Object.entries(variables)) {
        const current = style.getPropertyValue(name).trim(), priority = style.getPropertyPriority(name)
        if (current === expected.trim() && priority === 'important') continue
        // Lumiverse owns the underlying inline theme map. If it reapplies a base
        // theme while Boost is active, remember that newest native declaration so
        // Reset Boost can reveal the current theme rather than a stale snapshot.
        const nativeValue = style.getPropertyValue(name)
        this.underlyingRootDeclarations.set(name, { value: nativeValue, priority })
        // Never promote a mutable root declaration into the transform source.
        // The root is a presentation surface and may contain old/current Boost
        // output. Accepting it here recreates Boost-on-Boost through the observer.
        // If this was a genuine Lumiverse theme reapplication, ask the worker for
        // a fresh generateVariables() snapshot after restoring live authority.
        needsReassert = true
      }
      if (needsReassert) { this.reassertRootAuthority(); this.scheduleCanonicalRebase() }
      else this.updateRuntimeDiagnostics()
    })
    this.rootStyleObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
  }
  private reassertRootAuthority(): void {
    if (typeof document === 'undefined') return
    const variables = this.effectiveAuthorityVariables(); if (!Object.keys(variables).length) return
    const style = document.documentElement.style
    for (const [name, value] of Object.entries(variables)) {
      this.rememberUnderlying(name)
      if (style.getPropertyValue(name).trim() === value.trim() && style.getPropertyPriority(name) === 'important') continue
      style.setProperty(name, value, 'important')
    }
    this.updateRuntimeDiagnostics()
  }
  private reconcileOwnedNames(previous: Record<string, string>, next: Record<string, string>, other: Record<string, string> = {}): void {
    for (const name of Object.keys(previous)) if (!(name in next) && !(name in other)) this.restoreUnderlying(name)
    for (const name of Object.keys(next)) if (!(name in previous) && !(name in other)) this.rememberUnderlying(name)
  }
  private applyLiveBoost(variables: Record<string, string>): void {
    if (typeof document === 'undefined' || !Object.keys(variables).length) { this.clearLiveBoost(); return }
    const previous = this.liveVariables
    this.reconcileOwnedNames(previous, variables, this.previewVariables ?? {})
    this.liveVariables = structuredClone(variables)
    document.documentElement.setAttribute('data-theme-studio-boost-live', '')
    this.ensureRootStyleObserver()
    this.reassertRootAuthority()
  }
  private clearLiveBoost(): void {
    if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-theme-studio-boost-live')
    const previous = this.liveVariables; this.liveVariables = {}
    this.reconcileOwnedNames(previous, {}, this.previewVariables ?? {})
    if (!this.previewVariables || !Object.keys(this.previewVariables).length) {
      this.rootStyleObserver?.disconnect(); this.rootStyleObserver = undefined
    }
    this.updateRuntimeDiagnostics()
  }
  private async afterTwoPaints(): Promise<void> {
    if (typeof requestAnimationFrame !== 'function') { await new Promise((resolve) => setTimeout(resolve, 0)); return }
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  }
  private updateRuntimeDiagnostics(): void {
    if (typeof document === 'undefined') { this.lastRuntimeDiagnostics = undefined; return }
    const variables = this.effectiveAuthorityVariables(), entries = Object.entries(variables)
    if (!entries.length) { this.lastRuntimeDiagnostics = undefined; return }
    const [variable, expected] = entries.find(([name]) => name === '--lumiverse-primary') ?? entries[0]
    const root = document.documentElement, inline = root.style.getPropertyValue(variable).trim(), priority = root.style.getPropertyPriority(variable), computed = getComputedStyle(root).getPropertyValue(variable).trim()
    this.lastRuntimeDiagnostics = { authority: 'root-inline-important', variable, expected, inline, priority, computed, matches: inline === expected.trim() && priority === 'important' && computed === expected.trim(), backendMirrored: this.backendMirrored, ...(this.backendError ? { backendError: this.backendError } : {}) }
  }

  async preview(boost: ProjectBoost): Promise<void> {
    const revision = ++this.previewRevision
    let variables: Record<string, string>
    if (!boostNeedsNativeBaseline(boost)) { variables = typographyAuthorityVariables(boost); this.lastDiagnostics = undefined }
    else {
      const baseline = await this.getBaseline(); if (revision !== this.previewRevision) return
      const transformed = transformThemeVariables(baseline.variables, boost); this.lastDiagnostics = transformed.diagnostics; variables = transformed.variables
    }
    if (revision !== this.previewRevision || typeof document === 'undefined') return
    const previous = this.previewVariables ?? {}
    this.reconcileOwnedNames(previous, variables, this.liveVariables)
    this.previewVariables = structuredClone(variables)
    document.documentElement.setAttribute('data-theme-studio-boost-previewing', '')
    this.ensureRootStyleObserver()
    this.reassertRootAuthority()
  }
  clearPreview(): void {
    this.previewRevision += 1
    if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-theme-studio-boost-previewing')
    const previous = this.previewVariables ?? {}; this.previewVariables = undefined
    this.reconcileOwnedNames(previous, {}, this.liveVariables)
    if (Object.keys(this.liveVariables).length) this.reassertRootAuthority()
    else { this.rootStyleObserver?.disconnect(); this.rootStyleObserver = undefined; this.updateRuntimeDiagnostics() }
  }
  private applyCanvasOverlay(variables: Record<string, string>, enabled: boolean): void {
    if (typeof document === 'undefined') return
    if (!enabled) { this.clearCanvasOverlay(); return }
    const names = ['--lumiverse-scene-text-scrim', '--lumiverse-bg-deep-080', '--lumiverse-bg-070'] as const
    const declarations = names.flatMap((name) => typeof variables[name] === 'string' ? [`  ${name}: ${variables[name]} !important;`] : [])
    if (!declarations.length) { this.clearCanvasOverlay(); return }
    document.documentElement.setAttribute('data-theme-studio-canvas-wash', '')
    const style = this.canvasStyle ?? this.ctx.dom.createElement('style', { 'data-theme-studio-canvas-wash-style': '' })
    if (!this.canvasStyle) { document.head.append(style); this.canvasStyle = style }
    style.textContent = `html:root[data-theme-studio-canvas-wash] {\n${declarations.join('\n')}\n}`
  }
  private clearCanvasOverlay(): void {
    if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-theme-studio-canvas-wash')
    this.canvasStyle?.remove(); this.canvasStyle = undefined
  }
  private refreshWallpaperMarkers(): void {
    if (typeof document === 'undefined') return
    document.querySelectorAll<HTMLElement>('[data-theme-studio-wallpaper-layer]').forEach((element) => element.removeAttribute('data-theme-studio-wallpaper-layer'))
    const candidates = [...document.querySelectorAll<HTMLElement>('[class*="_layer_"][class*="_fixed_"]')].filter((element) => {
      const backgroundImage = element.style.backgroundImage
      if (!backgroundImage || backgroundImage === 'none') return false
      if (element.closest('[data-theme-studio-root], [data-theme-studio-widget], [data-theme-studio-float]')) return false
      return /url\(/i.test(backgroundImage)
    })
    for (const element of candidates) element.setAttribute('data-theme-studio-wallpaper-layer', '')
  }
  private ensureWallpaperObserver(): void {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || this.wallpaperObserver) return
    this.wallpaperObserver = new MutationObserver(() => this.refreshWallpaperMarkers())
    this.wallpaperObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] })
  }
  private applyWallpaperTreatment(boost: ProjectBoost, enabled: boolean): void {
    if (typeof document === 'undefined') return
    if (!enabled) { this.clearWallpaperTreatment(); return }
    this.refreshWallpaperMarkers()
    this.ensureWallpaperObserver()
    const opacity = Math.max(0, Math.min(1, boost.wallpaperOpacity))
    const blur = Math.max(0, Math.min(48, boost.wallpaperBlur))
    const saturation = Math.max(0, Math.min(3, boost.wallpaperSaturation))
    const contrast = Math.max(.25, Math.min(3, boost.wallpaperContrast))
    const brightness = Math.max(.1, Math.min(3, boost.wallpaperBrightness))
    const style = this.wallpaperStyle ?? this.ctx.dom.createElement('style', { 'data-theme-studio-wallpaper-treatment': '' })
    if (!this.wallpaperStyle) { document.head.append(style); this.wallpaperStyle = style }
    style.textContent = `[data-theme-studio-wallpaper-layer] {
  opacity: ${opacity.toFixed(3)} !important;
  filter: blur(${blur.toFixed(2)}px) saturate(${saturation.toFixed(3)}) contrast(${contrast.toFixed(3)}) brightness(${brightness.toFixed(3)}) !important;
  will-change: opacity, filter;
}`
  }
  private clearWallpaperTreatment(): void {
    if (typeof document !== 'undefined') document.querySelectorAll<HTMLElement>('[data-theme-studio-wallpaper-layer]').forEach((element) => element.removeAttribute('data-theme-studio-wallpaper-layer'))
    this.wallpaperObserver?.disconnect(); this.wallpaperObserver = undefined
    this.wallpaperStyle?.remove(); this.wallpaperStyle = undefined
  }
  async clear(): Promise<void> { this.clearPreview(); this.clearLiveBoost(); this.lastAppliedVariables = undefined; this.lastRuntimeDiagnostics = undefined; this.backendMirrored = false; this.backendError = undefined; this.clearCanvasOverlay(); this.clearWallpaperTreatment(); const revision = ++this.revision; this.operation = this.operation.catch(() => undefined).then(async () => { if (revision !== this.revision) return; try { await this.request({ type: 'theme_studio:clear_theme_override' }) } catch (error) { console.warn('[Theme Studio] Could not clear worker Boost mirror during cleanup.', error) } }); await this.operation }
  async destroy(): Promise<void> {
    this.sourceWatchRevision += 1
    if (this.sourceRefreshTimer) { clearTimeout(this.sourceRefreshTimer); this.sourceRefreshTimer = undefined }
    try { await this.clear() } finally { this.unsubscribe(); for (const pending of this.pending.values()) pending.reject(new Error('Theme Studio unloaded')); this.pending.clear() }
  }
  private request<T = unknown>(payload: Record<string, unknown>): Promise<T> {
    const requestId = portableRandomUUID()
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve: resolve as (value: unknown) => void, reject }); this.ctx.sendToBackend({ ...payload, requestId })
      setTimeout(() => { const pending = this.pending.get(requestId); if (pending) { this.pending.delete(requestId); pending.reject(new Error('Theme operation timed out')) } }, 10_000)
    })
  }
}
