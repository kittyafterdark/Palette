import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import { ElementPicker } from './inspector/picker'
import { ProjectPersistence } from './project/persistence'
import { ProjectStore } from './project/store'
import { LiveStylesheet } from './preview/live-stylesheet'
import { ThemeStudioUI } from './ui/studio'
import { THEME_STUDIO_CSS } from './ui/styles'
import { THEME_STUDIO_GUIDE } from './ui/guide'
import { ThemeRuntimeBridge } from './nativeBridge/theme-runtime'
import { ImageSourceRuntime } from './preview/image-source-runtime'

const GUIDE_JUMP_TARGETS: Record<string, string> = {
  'palette-guide-start': 'Start here',
  'palette-guide-pick': 'Pick & scope',
  'palette-guide-packets': 'Style packets',
  'palette-guide-groups': 'Groups',
  'palette-guide-read': 'Read styles',
  'palette-guide-reuse': 'Reuse',
  'palette-guide-boost': 'Boost',
  'palette-guide-code': 'Widget & Code',
  'palette-guide-css': 'CSS field guide',
  'palette-guide-debug': 'Debugging',
}

function installGuideJumpNavigation(): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const link = target.closest<HTMLAnchorElement>('a[href^="#palette-guide-"]')
    if (!link) return
    const fragment = link.getAttribute('href')?.slice(1) ?? ''
    const headingText = GUIDE_JUMP_TARGETS[fragment]
    if (!headingText) return
    const heading = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')]
      .find((candidate) => candidate.textContent?.trim().startsWith(headingText) && candidate.getClientRects().length > 0)
    if (!heading) return
    event.preventDefault()
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}

const ICON = `
<svg viewBox="12 16 76 68" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g fill="currentColor">
    <path d="m83.328 74.188h-46.203c1.9531-0.59375 3.9062-1.4844 5.5469-2.7188 0.3125-0.10938 0.54688-0.32812 0.73438-0.57812 0.54688-0.48438 1.0625-1 1.5-1.5781 1.8281-2.4531 2.3594-5.4219 1.6562-8.0781 0.39062 0.0625 0.78125 0.10938 1.1875 0.10938h0.15625c2.0625-0.046875 3.9531-0.90625 5.3438-2.4062l17.469-18.812c2.3906-2.5781 2.3125-6.5469-0.17188-9.0469s-6.4688-2.5625-9.0469-0.17188l-18.812 17.469c-1.5156 1.3906-2.375 3.2969-2.4062 5.3438 0 0.46875 0.03125 0.9375 0.10938 1.3906-2.7969-0.6875-5.8594 0-8.0312 2.1875-2.8125 2.8125-2.7969 6.0781-2.7969 8.7188 0 2.375-0.046875 3.875-1.2344 5.0625-0.95312 0.95312-0.84375 1.8594-0.70312 2.3281 0.078125 0.25 0.23438 0.51562 0.46875 0.78125h-11.438c-0.85938 0-1.5625 0.70312-1.5625 1.5625v4c0 0.85938 0.70312 1.5625 1.5625 1.5625h66.672c0.85938 0 1.5625-0.70312 1.5625-1.5625v-4c0-0.85938-0.70312-1.5625-1.5625-1.5625zm-50.641-8.1719v-0.78125c0.59375-0.26562 1.4219-0.53125 2.0625-0.32812 0.1875 0.0625 0.73438 0.23438 1.1719 1.375 0.78125 2 1.7031 3.2656 2.5938 4.0625-2.4844 1.1406-5.2969 1.6562-6.9844 1.6875 1.1719-1.9062 1.1562-4.0781 1.1562-6.0312zm33.266-33.719c0.875 0 1.7344 0.32812 2.4062 1 1.2969 1.2969 1.3281 3.3594 0.09375 4.7031l-0.98438 1.0625-4.875-4.875 1.0625-0.98438c0.65625-0.60938 1.4844-0.90625 2.3125-0.90625zm-21.141 18.375 15.469-14.359 5.0312 5.0312-14.359 15.469c-0.8125 0.875-1.9219 1.375-3.1094 1.4062-1.1875 0.0625-2.3281-0.42188-3.1719-1.2656s-1.2969-1.9688-1.2656-3.1719c0.03125-1.1875 0.51562-2.2969 1.4062-3.1094zm-6.4688 7.2812c1.375 0 2.7344 0.51562 3.7812 1.5625 2.0469 2.0469 2.1719 5.3906 0.28125 7.9219-0.28125 0.375-0.60938 0.71875-0.96875 1.0312-0.59375-0.125-1.6406-0.89062-2.5938-3.3281-0.82812-2.1094-2.1875-2.9219-3.1719-3.2344-0.89062-0.26562-1.7656-0.23438-2.5625-0.078125 0.26562-0.8125 0.71875-1.5781 1.4531-2.3125 1.0469-1.0469 2.4062-1.5625 3.7812-1.5625zm43.422 20.234h-63.531v-0.875h63.547v0.875z"/>
    <path d="m28.625 28.828c3 0 5.4531 2.4375 5.4531 5.4531 0 0.85938 0.70312 1.5625 1.5625 1.5625s1.5625-0.70312 1.5625-1.5625c0-3 2.4375-5.4531 5.4531-5.4531 0.85938 0 1.5625-0.70312 1.5625-1.5625s-0.70312-1.5625-1.5625-1.5625c-3 0-5.4531-2.4375-5.4531-5.4531 0-0.85938-0.70312-1.5625-1.5625-1.5625s-1.5625 0.70312-1.5625 1.5625c0 3-2.4375 5.4531-5.4531 5.4531-0.85938 0-1.5625 0.70312-1.5625 1.5625s0.70312 1.5625 1.5625 1.5625zm7-3.6406c0.5625 0.8125 1.2656 1.5156 2.0781 2.0781-0.8125 0.5625-1.5156 1.2812-2.0781 2.0781-0.5625-0.8125-1.2812-1.5156-2.0781-2.0781 0.8125-0.5625 1.5156-1.2812 2.0781-2.0781z"/>
    <path d="m25.703 40.234c1.3906 0 2.5156 1.125 2.5156 2.5156 0 0.85938 0.70312 1.5625 1.5625 1.5625s1.5625-0.70312 1.5625-1.5625c0-1.3906 1.125-2.5156 2.5156-2.5156 0.85938 0 1.5625-0.70312 1.5625-1.5625s-0.70312-1.5625-1.5625-1.5625c-1.3906 0-2.5156-1.125-2.5156-2.5156 0-0.85938-0.70312-1.5625-1.5625-1.5625s-1.5625 0.70312-1.5625 1.5625c0 1.3906-1.125 2.5156-2.5156 2.5156-0.85938 0-1.5625 0.70312-1.5625 1.5625s0.70312 1.5625 1.5625 1.5625zm4.0781-1.75 0.1875 0.1875-0.1875 0.1875-0.1875-0.1875 0.1875-0.1875z"/>
    <path d="m42.312 33.469c0 0.35938-0.29688 0.65625-0.65625 0.65625-0.85938 0-1.5625 0.70312-1.5625 1.5625s0.70312 1.5625 1.5625 1.5625c0.35938 0 0.65625 0.29688 0.65625 0.65625 0 0.85938 0.70312 1.5625 1.5625 1.5625s1.5625-0.70312 1.5625-1.5625c0-0.35938 0.29688-0.65625 0.65625-0.65625 0.85938 0 1.5625-0.70312 1.5625-1.5625s-0.70312-1.5625-1.5625-1.5625c-0.35938 0-0.65625-0.29688-0.65625-0.65625 0-0.85938-0.70312-1.5625-1.5625-1.5625s-1.5625 0.70312-1.5625 1.5625z"/>
  </g>
</svg>`

export async function setup(ctx: SpindleFrontendContext): Promise<() => Promise<void>> {
  ctx.deferReady()
  const removeStyle = ctx.dom.addStyle(THEME_STUDIO_CSS)
  const removeGuideJumpNavigation = installGuideJumpNavigation()
  const tab = ctx.ui.registerDrawerTab({
    id: 'studio',
    title: 'Palette',
    shortName: 'Palette',
    headerTitle: 'Palette',
    description: 'Build, remix, and reuse visual styles across Lumiverse.',
    keywords: ['palette', 'theme', 'visual', 'css', 'design', 'picker', 'styles', 'components'],
    iconSvg: ICON,
    guide: {
      title: 'Palette',
      markdown: THEME_STUDIO_GUIDE,
    },
  })

  // Own the tab's internal viewport. Spindle drawers can nest overflow containers;
  // a definite flex/height chain keeps Palette's one scroll surface usable
  // for wheel, trackpad, and touch instead of letting the editor grow under it.
  tab.root.classList.add('ts-tab-host')

  const store = new ProjectStore()
  const persistence = new ProjectPersistence(ctx)
  try {
    store.hydrate(await persistence.load())
  } catch (error) {
    console.warn('[Palette] Could not load persisted projects; using a fresh local project.', error)
  }

  const preview = new LiveStylesheet(ctx)
  const picker = new ElementPicker(ctx)
  const themeRuntime = new ThemeRuntimeBridge(ctx)
  const imageSourceRuntime = new ImageSourceRuntime(store)
  // Keep the editor in a movable mount so Palette can undock into its own
  // floating inspector without cloning state or creating a second UI instance.
  const studioMount = document.createElement('div')
  studioMount.className = 'ts-studio-mount'
  tab.root.append(studioMount)
  const studio = new ThemeStudioUI(ctx, studioMount, store, picker, preview, themeRuntime)
  const unsubscribePersistence = store.subscribe((state) => persistence.scheduleSave(state))
  // Boost is world state, not part of every local Design edit.  Only touch the
  // native Theme API when the active project's Boost payload actually changes;
  // otherwise a width slider would repeatedly clear/reapply the whole app theme.
  let boostSignature = JSON.stringify(store.activeProject.boost)
  let boostProjectId = store.snapshot.activeProjectId
  const unsubscribeTheme = store.subscribe((state) => {
    const boost = state.projects.find((project) => project.id === state.activeProjectId)?.boost ?? store.activeProject.boost
    const nextSignature = JSON.stringify(boost)
    const projectChanged = state.activeProjectId !== boostProjectId
    boostProjectId = state.activeProjectId
    if (!projectChanged && nextSignature === boostSignature) return
    boostSignature = nextSignature
    const update = projectChanged && boost.enabled ? themeRuntime.syncFromCanonicalSource(boost) : themeRuntime.sync(boost)
    void update.catch((error) => console.warn('[Palette] Live Boost update failed.', error))
  })
  // Always canonicalize the native source once, even when the currently selected
  // project has Boost off. Otherwise an old hot-reload root layer can survive an
  // unboosted startup, lose its marker, and later become the first enabled
  // project's source. The worker generateVariables() map is our source firewall.
  try {
    await themeRuntime.refreshBaseline()
    await themeRuntime.sync(store.activeProject.boost)
  } catch (error) {
    console.warn('[Palette] Initial live Boost update failed.', error)
  }
  await studio.initialize()
  ctx.ready()
  // Native theme installation can finish a beat after extension setup. Keep the
  // first rendered Boost in place while a short worker-only source watch rebases
  // it if Lumiverse's canonical generateVariables() output changes during boot.
  if (store.activeProject.boost.enabled) void themeRuntime.stabilizeStartupSource().catch((error) => console.warn('[Palette] Startup Boost source stabilization failed.', error))

  let stopped = false
  return async () => {
    if (stopped) return
    stopped = true
    picker.destroy()
    studio.destroy()
    preview.destroy()
    imageSourceRuntime.destroy()
    unsubscribeTheme()
    try { await themeRuntime.destroy() } catch (error) { console.warn('[Palette] Live Boost cleanup failed.', error) }
    unsubscribePersistence()
    try {
      await persistence.destroy()
    } catch (error) {
      console.warn('[Palette] Final persistence flush failed during unload.', error)
    }
    tab.destroy()
    removeGuideJumpNavigation()
    removeStyle()
    ctx.dom.cleanup()
  }
}
