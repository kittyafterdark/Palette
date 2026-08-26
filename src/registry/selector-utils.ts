import type { SelectorHealth } from './types'

function safeShape(selector: string): boolean {
  if (!selector.trim() || /[;{}]/.test(selector) || selector.trim().endsWith(',')) return false
  let square = 0; let round = 0; let quote = ''
  for (const char of selector) {
    if (quote) { if (char === quote) quote = ''; continue }
    if (char === '"' || char === "'") quote = char
    else if (char === '[') square += 1; else if (char === ']') square -= 1
    else if (char === '(') round += 1; else if (char === ')') round -= 1
    if (square < 0 || round < 0) return false
  }
  return !quote && square === 0 && round === 0
}

/** Compose native context and local target selectors conservatively.
 *
 * `localSelector` is allowed to be either genuinely local ("[class*=…]") or
 * already rooted. Native registry data and old Theme Studio saves can contain
 * both shapes. Never prepend the same context twice.
 */
export function composeContextSelector(contextSelector: string, localSelector: string): string | null {
  const context = contextSelector.trim(); const local = localSelector.trim()
  if (!safeShape(context) || !safeShape(local) || context.includes(',') || local.includes(',')) return null
  if (local === ':scope') return context
  if (local.startsWith(':scope')) return `${context}${local.slice(':scope'.length)}`
  if (local === context || local.startsWith(`${context} `) || local.startsWith(`${context}>`) || local.startsWith(`${context}+`) || local.startsWith(`${context}~`)) return local
  return `${context} ${local}`
}

/**
 * Repair a saved contextual selector when its own context/local metadata proves
 * that the native root was prepended more than once. This is deliberately
 * metadata-driven: recursive shapes such as Row > Row stay legal unless the
 * stored decomposition says the extra prefix is an authoring accident.
 */
export function canonicalizeSavedContextSelector(selector: string, contextSelector?: string, localSelector?: string): string {
  const raw = selector.trim(); const context = contextSelector?.trim() ?? ''; const local = localSelector?.trim() ?? ''
  if (!raw || !context || !local) return raw
  const canonical = composeContextSelector(context, local)
  if (!canonical) return raw
  const pseudo = raw.endsWith('::before') ? '::before' : raw.endsWith('::after') ? '::after' : ''
  let base = pseudo ? raw.slice(0, -pseudo.length).trim() : raw
  if (base === canonical) return `${canonical}${pseudo}`
  // V27.8/27.9 could preserve a selector that had already been contextualized and
  // then contextualize that complete selector one more time. Peel only exact
  // leading copies of the saved context until we reach the metadata-derived
  // canonical selector. If we cannot reach it exactly, leave the selector alone.
  let probe = base
  for (let pass = 0; pass < 8 && probe !== canonical; pass += 1) {
    const prefix = `${context} `
    if (!probe.startsWith(prefix)) break
    const next = probe.slice(prefix.length).trimStart()
    if (next !== canonical && !next.startsWith(prefix)) break
    probe = next
  }
  return probe === canonical ? `${canonical}${pseudo}` : raw
}

/**
 * Drop immediately repeated CSS-module selector segments only when doing so
 * selects the exact same mounted element set. This cleans registry/context
 * accidents like `_row_ _row_ _desc_` without breaking genuinely recursive
 * UIs where the second `_row_` is required to narrow the match.
 */
export function simplifyRedundantModuleSegments(selector: string, root: ParentNode = document): string {
  const repeated = /(\[class\*=["']_[A-Za-z][A-Za-z0-9_-]*?_["']\])\s+\1/g
  if (!repeated.test(selector)) return selector
  const matches = (value: string): Element[] | null => { try { return [...root.querySelectorAll(value)] } catch { return null } }
  let current = selector
  for (let pass = 0; pass < 8; pass += 1) {
    repeated.lastIndex = 0
    const candidate = current.replace(repeated, '$1')
    if (candidate === current) break
    const before = matches(current); const after = matches(candidate)
    if (!before || !after || before.length !== after.length || before.some((entry, index) => entry !== after[index])) break
    current = candidate
  }
  return current
}

export function splitSelectorList(selector: string): string[] {
  const parts: string[] = []; let start = 0; let paren = 0; let bracket = 0; let quote = ''; let escaped = false
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index]
    if (escaped) { escaped = false; continue }
    if (char === '\\') { escaped = true; continue }
    if (quote) { if (char === quote) quote = ''; continue }
    if (char === '"' || char === "'") { quote = char; continue }
    if (char === '(') paren += 1
    else if (char === ')') paren = Math.max(0, paren - 1)
    else if (char === '[') bracket += 1
    else if (char === ']') bracket = Math.max(0, bracket - 1)
    else if (char === ',' && paren === 0 && bracket === 0) { parts.push(selector.slice(start, index).trim()); start = index + 1 }
  }
  parts.push(selector.slice(start).trim())
  return parts.filter(Boolean)
}

export function appendPseudoToSelectorList(selector: string, pseudo: '::before' | '::after'): string {
  return splitSelectorList(selector).map((branch) => `${branch}${pseudo}`).join(',\n')
}

export function evaluateSelectorHealth(selector: string, root: ParentNode = document, broadThreshold = 100): SelectorHealth {
  try {
    const matchCount = root.querySelectorAll(selector).length
    return { selector, matchCount, status: matchCount === 0 ? 'missing' : matchCount > broadThreshold ? 'broad' : 'healthy' }
  } catch { return { selector, matchCount: 0, status: 'invalid' } }
}
