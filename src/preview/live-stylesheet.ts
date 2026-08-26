import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import type { NativeThemeAsset } from '../registry/types'

export interface PreviewResult {
  valid: boolean
  error?: string
}

function escapeCssUrl(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n\f]/g, '')
}

/**
 * Native theme CSS owns canonical ./assets/... references, but Theme Studio's
 * live <style> tags do not execute inside that bundle. Resolve only known
 * canonical asset paths to their runtime contentUrl while previewing. Project
 * state, generated CSS, and native export stay canonical.
 */
export function resolvePreviewAssetUrls(css: string, assets: Iterable<Pick<NativeThemeAsset, 'path' | 'contentUrl'>>): string {
  const urls = new Map<string, string>()
  for (const asset of assets) {
    const path = asset.path?.trim()
    const contentUrl = asset.contentUrl?.trim()
    if (!path || !contentUrl) continue
    // Lumiverse's canonical asset CSS uses ./assets/..., but older/manual Theme
    // Studio fields often contain assets/... without the leading dot. Treat both
    // spellings as the same public bundle asset during live preview.
    const bare = path.replace(/^\.\//, '')
    urls.set(path, contentUrl)
    urls.set(bare, contentUrl)
    urls.set(`./${bare}`, contentUrl)
  }
  if (!urls.size || !css.includes('url(')) return css
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, _quote: string, rawPath: string) => {
    const contentUrl = urls.get(String(rawPath).trim())
    return contentUrl ? `url("${escapeCssUrl(contentUrl)}")` : match
  })
}

function sanitizeCustomCss(css: string): string {
  return css
    .replace(/@import\s+[^;]+;/gi, '/* @import stripped by Theme Studio */')
    .replace(/url\(\s*(['"]?)javascript:[^)'"\s]*\1\s*\)/gi, '/* unsafe url stripped */')
    .replace(/url\(\s*(['"]?)https?:\/\/[^)'"\s]+\1\s*\)/gi, '/* external url stripped */')
}

function validateCss(css: string): PreviewResult {
  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Invalid CSS' }
  }
}

/** Owns isolated replace-in-place stylesheets for committed Design, transient Design scrubs, and Custom CSS. */
export class LiveStylesheet {
  private readonly generated: HTMLStyleElement
  private readonly transient: HTMLStyleElement
  private readonly custom: HTMLStyleElement
  private transientFrame: number | null = null
  private transientPending = ''
  private themeAssets: Array<Pick<NativeThemeAsset, 'path' | 'contentUrl'>> = []

  constructor(ctx: SpindleFrontendContext) {
    this.generated = ctx.dom.createElement('style', {
      'data-theme-studio-preview': 'generated',
    })
    this.transient = ctx.dom.createElement('style', {
      'data-theme-studio-preview': 'transient-design',
    })
    this.custom = ctx.dom.createElement('style', {
      'data-theme-studio-preview': 'custom',
    })
    // Custom CSS deliberately stays last. A transient slider preview should
    // preview Design intent without unexpectedly outranking handwritten CSS.
    document.head.append(this.generated, this.transient, this.custom)
  }

  setThemeAssets(assets: Iterable<Pick<NativeThemeAsset, 'path' | 'contentUrl'>>): void {
    this.themeAssets = [...assets].map((asset) => ({ path: asset.path, contentUrl: asset.contentUrl }))
  }

  private resolveAssets(css: string): string { return resolvePreviewAssetUrls(css, this.themeAssets) }

  updateGenerated(css: string): PreviewResult {
    const resolved = this.resolveAssets(css)
    const result = validateCss(resolved)
    if (result.valid) this.generated.textContent = resolved
    return result
  }

  updateTransient(css: string): PreviewResult {
    // Generated Design preview CSS is trusted compiler output. Coalesce pointer
    // scrubs to one stylesheet mutation per animation frame so a slider can stay
    // genuinely live without turning the document style system into a rave.
    this.transientPending = css
    if (this.transientFrame === null) {
      const apply = () => {
        this.transientFrame = null
        const pending = this.resolveAssets(this.transientPending)
        const result = validateCss(pending)
        if (result.valid) this.transient.textContent = pending
      }
      this.transientFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(apply) : (setTimeout(apply, 0) as unknown as number)
    }
    return { valid: true }
  }

  clearTransient(): void {
    if (this.transientFrame !== null) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.transientFrame)
      else clearTimeout(this.transientFrame)
      this.transientFrame = null
    }
    this.transientPending = ''
    this.transient.textContent = ''
  }

  updateCustom(css: string): PreviewResult {
    const sanitized = sanitizeCustomCss(css)
    const resolved = this.resolveAssets(sanitized)
    const result = validateCss(resolved)
    if (result.valid) this.custom.textContent = resolved
    return result
  }

  destroy(): void {
    this.clearTransient()
    this.generated.remove()
    this.transient.remove()
    this.custom.remove()
  }
}

export { sanitizeCustomCss }
