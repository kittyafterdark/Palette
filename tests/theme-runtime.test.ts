import { describe, expect, test } from 'bun:test'
import type { SpindleFrontendContext, ThemeInfoDTO } from 'lumiverse-spindle-types'
import { ThemeRuntimeBridge } from '../src/nativeBridge/theme-runtime'
import { createBoost } from '../src/project/model'

function runtimeContext(readBaseline: () => Record<string, string>) {
  let backendListener: (payload: unknown) => void = () => {}
  let catalogReads = 0
  let baselineReads = 0
  const info: ThemeInfoDTO = { accent: '#9370db', mode: 'dark', enableGlass: true, radiusScale: 1, fontScale: 1, uiScale: 1 }
  const ctx = {
    theme: {
      catalog: {
        listVariables: () => { catalogReads += 1; return [{ name: '--lumiverse-primary', value: '#boost-poison' }] },
      },
    },
    onBackendMessage(listener: (payload: unknown) => void) { backendListener = listener; return () => {} },
    sendToBackend(payload: unknown) {
      const message = payload as Record<string, unknown>
      queueMicrotask(() => {
        if (message.type === 'theme_studio:get_theme_baseline') { baselineReads += 1; backendListener({ type: 'theme_studio:theme_baseline', requestId: message.requestId, info, variables: structuredClone(readBaseline()) })
        } else if (message.type === 'theme_studio:clear_theme_override') backendListener({ type: 'theme_studio:theme_cleared', requestId: message.requestId })
      })
    },
  } as unknown as SpindleFrontendContext
  return { ctx, get catalogReads() { return catalogReads }, get baselineReads() { return baselineReads } }
}

describe('Boost canonical source firewall', () => {
  test('never uses the frontend catalog as the transform baseline', async () => {
    const mock = runtimeContext(() => ({ '--lumiverse-primary': '#112233', '--lumiverse-bg': '#08090a' }))
    const runtime = new ThemeRuntimeBridge(mock.ctx)
    const baseline = await runtime.getBaseline()
    expect(baseline.variables['--lumiverse-primary']).toBe('#112233')
    expect(mock.catalogReads).toBe(0)
    await runtime.destroy()
  })

  test('an unboosted startup cannot poison the first later Boost activation', async () => {
    let source = { '--lumiverse-primary': '#112233', '--lumiverse-bg': '#08090a' }
    const mock = runtimeContext(() => source)
    const runtime = new ThemeRuntimeBridge(mock.ctx)

    // Startup canonicalization followed by an inactive project intentionally drops
    // the cache, because the native theme may change while Boost is off.
    await runtime.refreshBaseline()
    await runtime.sync(createBoost())

    source = { '--lumiverse-primary': '#aabbcc', '--lumiverse-bg': '#202122' }
    const boost = createBoost(); boost.enabled = true; boost.colorsEnabled = true
    await runtime.sync(boost)

    const baseline = (runtime as unknown as { baseline?: { variables: Record<string, string> } }).baseline
    expect(baseline?.variables['--lumiverse-primary']).toBe('#aabbcc')
    expect(mock.catalogReads).toBe(0)
    await runtime.destroy()
  })

  test('canonical rebasing follows a late native-theme change without accepting catalog output', async () => {
    let source = { '--lumiverse-primary': '#112233', '--lumiverse-bg': '#08090a' }
    const mock = runtimeContext(() => source)
    const runtime = new ThemeRuntimeBridge(mock.ctx)
    const boost = createBoost(); boost.enabled = true; boost.colorsEnabled = true
    await runtime.sync(boost)

    source = { '--lumiverse-primary': '#ddeeff', '--lumiverse-bg': '#303132' }
    const changed = await (runtime as unknown as { rebaseFromCanonicalIfChanged(): Promise<boolean> }).rebaseFromCanonicalIfChanged()
    const baseline = (runtime as unknown as { baseline?: { variables: Record<string, string> } }).baseline
    expect(changed).toBe(true)
    expect(baseline?.variables['--lumiverse-primary']).toBe('#ddeeff')
    expect(mock.catalogReads).toBe(0)
    await runtime.destroy()
  })

  test('typography-only Boost does not request or transform the native palette baseline', async () => {
    const mock = runtimeContext(() => ({ '--lumiverse-primary': '#112233', '--lumiverse-bg': '#08090a' }))
    const runtime = new ThemeRuntimeBridge(mock.ctx)
    const boost = createBoost(); boost.enabled = true; boost.typographyEnabled = true; boost.typography = { fontFamily: 'Georgia', scale: 1.1 }
    await runtime.sync(boost)
    expect(mock.baselineReads).toBe(0)
    expect(mock.catalogReads).toBe(0)
    const applied = (runtime as unknown as { lastAppliedVariables?: Record<string, string> }).lastAppliedVariables
    expect(applied).toEqual({ '--lumiverse-font-family': 'Georgia', '--lumiverse-font-scale': '1.1' })
    await runtime.destroy()
  })

})
