import { Window } from 'happy-dom'

function escapeCssIdentifier(value: string): string {
  // Tests only need the browser contract, not a second selector engine. Keep the
  // fallback conservative and standards-safe for generated Palette identifiers.
  return String(value).replace(/[^A-Za-z0-9_-]/g, (char) => `\\${char.codePointAt(0)?.toString(16)} `)
}

/**
 * Bun 1.4 canary on Windows currently leaves a couple of Happy DOM realm
 * intrinsics undefined. Happy DOM's selector parser constructs errors through
 * window.SyntaxError and Palette legitimately calls CSS.escape(), so hydrate
 * those browser contracts on every test window instead of making tests depend on
 * Palette's defensive production fallback.
 */
export function createHappyDomWindow(options?: ConstructorParameters<typeof Window>[0]): Window {
  const window = new Window(options)
  const realm = window as unknown as { SyntaxError?: typeof SyntaxError; CSS?: { escape?: (value: string) => string } }
  if (typeof realm.SyntaxError !== 'function') {
    Object.defineProperty(window, 'SyntaxError', { value: SyntaxError, configurable: true, writable: true })
  }
  if (!realm.CSS) Object.defineProperty(window, 'CSS', { value: {}, configurable: true, writable: true })
  if (typeof realm.CSS?.escape !== 'function') Object.defineProperty(realm.CSS!, 'escape', { value: escapeCssIdentifier, configurable: true, writable: true })
  return window
}
