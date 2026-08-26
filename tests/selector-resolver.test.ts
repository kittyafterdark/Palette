import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'
import { normalizeCssModuleClass, rankSelectorCandidates, resolveCatalogComponent, resolveElement } from '../src/registry/selector-resolver'
import type { NativeThemeComponent } from '../src/registry/types'
import { appendPseudoToSelectorList, composeContextSelector, evaluateSelectorHealth, simplifyRedundantModuleSegments } from '../src/registry/selector-utils'

let testWindow: Window
let previous: Record<string, unknown>
beforeEach(() => {
  testWindow = new Window({ url: 'http://localhost/' })
  previous = { window: globalThis.window, document: globalThis.document, CSS: globalThis.CSS, Element: globalThis.Element }
  Object.assign(globalThis, { window: testWindow, document: testWindow.document, CSS: testWindow.CSS, Element: testWindow.Element })
})
afterEach(async () => { await testWindow.close(); Object.assign(globalThis, previous) })

function component(label: string, cssClasses: string[]): NativeThemeComponent {
  return { id: `src/${label}`, label, area: 'Test', sources: ['css', 'tsx'], selectors: [`[data-component="${label}"]`], cssClasses, nativeKey: `src/${label}` }
}

describe('CSS-module selector normalization', () => {
  test('normalizes generated classes and rejects unrelated classes', () => {
    expect(normalizeCssModuleClass('_actionBtn_61cpx_196')).toEqual({ localName: 'actionBtn', selector: '[class*="_actionBtn_"]' })
    expect(normalizeCssModuleClass('actionBtn')).toBeNull()
    expect(normalizeCssModuleClass('_actionBtn_short')).toBeNull()
  })
  test('stable local selectors rank above whole-component and volatile selectors', () => {
    const ranked = rankSelectorCandidates([
      { selector: 'main > div', strategy: 'structural', stability: 'low', matchCount: 1 },
      { selector: '[class*="_card_"]', strategy: 'css-module', stability: 'medium', matchCount: 20 },
      { selector: '[data-component="CharacterCard"]', strategy: 'native-registry', stability: 'high', matchCount: 20 },
    ])
    expect(ranked.map((entry) => entry.strategy)).toEqual(['css-module', 'native-registry', 'structural'])
  })
})

describe('target, native context and scope separation', () => {
  test('a native ancestor never replaces the clicked button target', () => {
    document.body.innerHTML = '<div data-component="LandingPage"><button class="_chatButton_abcd_123">Chats</button></div>'
    const resolution = resolveElement(document.querySelector('button')!, [component('LandingPage', ['chatButton'])])
    expect(resolution.target.element?.tagName).toBe('BUTTON')
    expect(resolution.target.recommended.selector).toBe('[data-component="LandingPage"] [class*="_chatButton_"]')
    expect(resolution.nativeContext?.component.label).toBe('LandingPage')
    expect(resolution.activeScopeId).toBe('context:src/LandingPage')
    expect(resolution.scopeCandidates.find((entry) => entry.id === resolution.activeScopeId)?.selector).not.toBe('[data-component="LandingPage"]')
    expect(resolution.scopeCandidates.some((entry) => entry.type === 'native-ancestor' && entry.label === 'LandingPage')).toBe(true)
  })

  test('picking an SVG path promotes only to its meaningful button', () => {
    document.body.innerHTML = '<div data-component="LandingPage"><button class="_actionButton_abcd_123"><svg><path /></svg></button></div>'
    const resolution = resolveElement(document.querySelector('path')!, [component('LandingPage', ['actionButton'])])
    expect(resolution.target.element).toBe(document.querySelector('button')!)
    expect(resolution.target.tagName).toBe('button')
    expect(resolution.nativeContext?.component.label).toBe('LandingPage')
  })

  test('a native root with a concrete CSS-module part defaults to that painted part', () => {
    document.body.innerHTML = '<div data-component="CharacterCard" class="_card_abcd_1"></div>'
    const resolution = resolveElement(document.querySelector('div')!, [component('CharacterCard', ['card'])])
    expect(resolution.activeScopeId).toBe('part:src/CharacterCard:card')
    expect(resolution.scopeCandidates.find((entry) => entry.id === resolution.activeScopeId)?.selector).toBe('[data-component="CharacterCard"][class*="_card_"]')
  })

  test('discovers edit-part CSS-module classes inside a data-component even without the native catalog', () => {
    document.body.innerHTML = '<div data-component="BubbleMessage" class="_card_abcd_1"><div class="_avatarBg_abcd_2"><img class="_avatarBgImg_abcd_3" /></div><div class="_content_abcd_4"></div></div>'
    const resolution = resolveElement(document.querySelector('[data-component="BubbleMessage"]')!, [])
    const parts = resolution.scopeCandidates.filter((entry) => entry.type === 'native-part')
    expect(resolution.nativeContext?.component.label).toBe('BubbleMessage')
    expect(parts.map((entry) => entry.label)).toContain('Avatar Bg Img')
    expect(parts.find((entry) => entry.label === 'Avatar Bg Img')?.selector).toBe('[data-component="BubbleMessage"] [class*="_avatarBgImg_"]')
    expect(parts.map((entry) => entry.label)).toContain('Content')
  })

  test('keeps edit-part inventories for nested native component contexts', () => {
    document.body.innerHTML = `
      <div data-component="BubbleMessage" class="_card_bubblex_1">
        <div class="_content_bubblex_2"></div>
        <div data-component="SwipeControls" class="_controls_swipesx_1">
          <button class="_btn_swipesx_2">‹</button><span class="_counter_swipesx_3">2 / 2</span><button class="_btn_swipesx_4">›</button>
        </div>
      </div>`
    const bubble = component('BubbleMessage', ['card', 'content'])
    const swipes = component('SwipeControls', ['controls', 'btn', 'counter'])
    const resolution = resolveElement(document.querySelector('[data-component="SwipeControls"]')!, [bubble, swipes])
    const parts = resolution.scopeCandidates.filter((entry) => entry.type === 'native-part')
    expect(parts.some((entry) => entry.componentId === swipes.id && entry.label === 'Counter')).toBe(true)
    expect(parts.some((entry) => entry.componentId === bubble.id && entry.label === 'Content')).toBe(true)
  })


  test('catalog selection prefers the mounted data-component root and then its first concrete part', () => {
    const entry = component('InputArea', ['container', 'textarea'])
    entry.selectors = []
    document.body.innerHTML = '<div data-component="InputArea" class="_container_45ujh_3"><textarea class="_textarea_45ujh_4"></textarea></div>'
    const resolution = resolveCatalogComponent(entry)
    expect(resolution.target.recommended.selector).toBe('[data-component="InputArea"]')
    expect(resolution.activeScopeId).toBe('part:src/InputArea:container')
    expect(resolution.scopeCandidates.find((scope) => scope.id === resolution.activeScopeId)?.selector).toBe('[data-component="InputArea"][class*="_container_"]')
  })

  test('native component class parts become first-class persistent scopes', () => {
    document.body.innerHTML = '<div data-component="InputArea"><div class="_container_45ujh_3"><textarea class="_textarea_45ujh_4"></textarea></div></div>'
    const resolution = resolveElement(document.querySelector('[data-component="InputArea"]')!, [component('InputArea', ['container', 'textarea'])])
    const container = resolution.scopeCandidates.find((entry) => entry.type === 'native-part' && entry.selector.includes('_container_'))
    expect(container?.selector).toBe('[data-component="InputArea"] [class*="_container_"]')
    expect(container?.persistence).toBe('persistent')
    expect(container?.label).toContain('Container')
  })

  test('InputArea controls without useful classes stay styleable through ARIA/title semantics', () => {
    document.body.innerHTML = '<div data-component="InputArea"><div class="_actionBar_abcd_1"><button aria-label="Tools"><svg><path /></svg></button><button title="Extras"></button></div></div>'
    const entry = component('InputArea', ['actionBar'])
    const tools = resolveElement(document.querySelector('path')!, [entry])
    const toolsScope = tools.scopeCandidates.find((scope) => scope.id === tools.activeScopeId)
    expect(tools.target.element?.tagName).toBe('BUTTON')
    expect(toolsScope?.selector).toBe('[data-component="InputArea"] button[aria-label="Tools"]')
    expect(toolsScope?.persistence).toBe('persistent')
    const extras = resolveElement(document.querySelector('button[title="Extras"]')!, [entry])
    expect(extras.scopeCandidates.find((scope) => scope.id === extras.activeScopeId)?.selector).toBe('[data-component="InputArea"] button[title="Extras"]')
  })

  test('ComposerActionBarLive wrappers provide stable action selectors ahead of title/ARIA fallbacks', () => {
    document.body.innerHTML = `
      <div data-component="InputArea">
        <div class="_actionBar_abcd_1">
          <span class="_composerReorderUnit_abcd_2" data-composer-action="home" data-toolbar-action="home" style="display:contents">
            <button title="Back to home"><svg><path id="home-path" /></svg></button>
          </span>
        </div>
        <div class="_extensionToolbar_abcd_3"><span data-spindle-mount="chat_toolbar"><button title="Extension action"></button></span></div>
      </div>`
    const entry = component('InputArea', ['actionBar', 'composerReorderUnit', 'extensionToolbar'])
    const home = resolveElement(document.querySelector('#home-path')!, [entry])
    const active = home.scopeCandidates.find((scope) => scope.id === home.activeScopeId)
    expect(home.target.element?.tagName).toBe('BUTTON')
    expect(active?.selector).toContain('[data-component="InputArea"] [data-composer-action="home"][data-toolbar-action="home"] button')
    expect(active?.persistence).toBe('persistent')
    expect(home.targetLevels.some((level) => level.label === 'Composer action · home')).toBe(true)

    const extension = resolveElement(document.querySelector('button[title="Extension action"]')!, [entry])
    expect(extension.targetLevels.some((level) => level.label === 'Extension toolbar mount')).toBe(true)
  })

  test('reused module locals under App keep a nearby module family anchor', () => {
    document.body.innerHTML = `
      <div class="_app_rootx_1">
        <div class="_characterCard_chars_1"><div id="char-avatar" class="_avatar_chars_2"></div></div>
        <div class="_otherSurface_other_1"><div class="_avatar_other_2"></div></div>
      </div>`
    const app = component('App', ['app'])
    const resolution = resolveElement(document.querySelector('#char-avatar')!, [app])
    const active = resolution.scopeCandidates.find((scope) => scope.id === resolution.activeScopeId)
    expect(active?.selector).toContain('[class*="_app_"]')
    expect(active?.selector).toContain('[class*="_characterCard_"] [class*="_avatar_"]')
    expect(active?.selector).not.toBe('[class*="_app_"] [class*="_avatar_"]')
  })


  test('prefers a surface-specific native browser context over generic App while keeping broader scopes available', () => {
    document.body.innerHTML = `
      <div class="_app_shellx_1 _browser_charx_1">
        <div class="_folderGroups_charx_2"><div class="_row_charx_3"><div class="_avatar_charx_4"><img id="character-image" /></div></div></div>
      </div>
      <div class="_app_shellx_2 _browser_persx_1">
        <div class="_folderGroups_persx_2"><div class="_row_persx_3"><div class="_avatar_persx_4"><img id="persona-image" /></div></div></div>
      </div>`
    const app: NativeThemeComponent = { id: 'src/App', label: 'App', area: 'Test', sources: ['css', 'tsx'], selectors: ['[class*="_app_"]'], cssClasses: ['app'], nativeKey: 'src/App' }
    const characters: NativeThemeComponent = { id: 'src/CharacterBrowser', label: 'CharacterBrowser', area: 'Panels', sources: ['css', 'tsx'], selectors: ['._browser_charx_1'], cssClasses: ['browser', 'folderGroups', 'row', 'avatar'], nativeKey: 'src/CharacterBrowser' }
    const personas: NativeThemeComponent = { id: 'src/PersonaBrowser', label: 'PersonaBrowser', area: 'Panels', sources: ['css', 'tsx'], selectors: ['._browser_persx_1'], cssClasses: ['browser', 'folderGroups', 'row', 'avatar'], nativeKey: 'src/PersonaBrowser' }

    const character = resolveElement(document.querySelector('#character-image')!, [app, characters, personas])
    expect(character.nativeContext?.component.label).toBe('CharacterBrowser')
    const activeCharacter = character.scopeCandidates.find((scope) => scope.id === character.activeScopeId)!
    expect(activeCharacter.componentId).toBe('src/CharacterBrowser')
    expect(activeCharacter.selector).toContain('._browser_charx_1')
    expect(activeCharacter.selector).toContain('[class*="_avatar_"] img')
    expect(character.scopeCandidates.some((scope) => scope.componentId === 'src/App' && scope.label.includes('App panels'))).toBe(true)
    expect(character.scopeCandidates.some((scope) => scope.type === 'similar-elements' && scope.label === 'Similar images in all panels')).toBe(true)

    const persona = resolveElement(document.querySelector('#persona-image')!, [app, characters, personas])
    expect(persona.nativeContext?.component.label).toBe('PersonaBrowser')
    const activePersona = persona.scopeCandidates.find((scope) => scope.id === persona.activeScopeId)!
    expect(activePersona.componentId).toBe('src/PersonaBrowser')
    expect(activePersona.selector).toContain('._browser_persx_1')
    expect(activePersona.selector).not.toContain('._browser_charx_1')
  })

  test('Spindle drawer-tab roots outrank unrelated module guesses and name the surface', () => {
    document.body.innerHTML = `
      <div data-spindle-drawer-tab="personas" style="width:100%;height:100%">
        <div class="_manager_persx_1">
          <div id="persona-row" class="_row_persx_2"><span class="_tags_persx_3">Tags</span></div>
        </div>
      </div>`
    const qwen: NativeThemeComponent = { id: 'src/QwenCustomVoiceManager', label: 'QwenCustomVoiceManager', area: 'Panels', sources: ['css', 'tsx'], selectors: ['[class*="_manager_"]'], cssClasses: ['manager', 'row', 'tags'], nativeKey: 'src/QwenCustomVoiceManager' }
    const resolution = resolveElement(document.querySelector('#persona-row')!, [qwen])
    expect(resolution.nativeContext?.component.label).toBe('Personas')
    expect(resolution.nativeContext?.component.id).toBe('mounted:drawer:personas')
    const active = resolution.scopeCandidates.find((scope) => scope.id === resolution.activeScopeId)
    expect(active?.selector).toContain('[data-spindle-drawer-tab="personas"]')
    expect(active?.selector).toContain('[class*="_row_"]')
    expect(resolution.scopeCandidates.some((scope) => scope.componentId === qwen.id)).toBe(false)
    expect(resolution.targetLevels.some((level) => level.label === 'Personas')).toBe(true)
  })

  test('real semantic surface ownership beats a noisy module-name guess', () => {
    const noisyClasses = ['manager', 'folderRow', ...Array.from({ length: 80 }, (_, index) => `part${index}`)]
    const noisyNodes = noisyClasses.map((name, index) => `<span class="_${name}_persx_${index + 10}"></span>`).join('')
    document.body.innerHTML = `<div data-component="PersonaManager" class="_editor_persx_1"><div class="_manager_persx_2"><div id="persona-folder" class="_folderRow_persx_3">${noisyNodes}</div></div></div>`
    const qwen: NativeThemeComponent = { id: 'src/QwenCustomVoiceManager', label: 'QwenCustomVoiceManager', area: 'Panels', sources: ['css', 'tsx'], selectors: ['[class*="_manager_"]'], cssClasses: noisyClasses, nativeKey: 'src/QwenCustomVoiceManager' }
    const resolution = resolveElement(document.querySelector('#persona-folder')!, [qwen])
    expect(resolution.nativeContext?.component.label).toBe('PersonaManager')
    expect(resolution.scopeCandidates.some((scope) => scope.componentId === qwen.id && scope.label.includes('QwenCustomVoiceManager'))).toBe(false)
    expect(resolution.scopeCandidates.find((scope) => scope.id === resolution.activeScopeId)?.selector).toContain('[data-component="PersonaManager"]')
  })

  test('ambiguous mounted module identity cannot name a native surface', () => {
    document.body.innerHTML = `<div class="_app_shellx_1"><div class="_manager_persx_2"><div id="folder" class="_folderRow_persx_3"></div></div></div>`
    const app: NativeThemeComponent = { id: 'src/App', label: 'App', area: 'Test', sources: ['css', 'tsx'], selectors: ['[class*="_app_"]'], cssClasses: ['app'], nativeKey: 'src/App' }
    const qwen: NativeThemeComponent = { id: 'src/QwenCustomVoiceManager', label: 'QwenCustomVoiceManager', area: 'Panels', sources: ['css', 'tsx'], selectors: ['[class*="_manager_"]'], cssClasses: ['manager', 'folderRow'], moduleIdentityHashes: [], moduleIdentityReliable: false, nativeKey: 'src/QwenCustomVoiceManager' }
    const resolution = resolveElement(document.querySelector('#folder')!, [app, qwen])
    expect(resolution.nativeContext?.component.label).toBe('App')
    expect(resolution.scopeCandidates.some((scope) => scope.componentId === qwen.id)).toBe(false)
  })

  test('does not invent a specific browser owner when public catalog selectors are identical', () => {
    document.body.innerHTML = '<div class="_app_samex_1 _browser_samex_2"><div class="_avatar_samex_3"><img id="ambiguous-image" /></div></div>'
    const app: NativeThemeComponent = { id: 'src/App', label: 'App', area: 'Test', sources: ['css', 'tsx'], selectors: ['[class*="_app_"]'], cssClasses: ['app'], nativeKey: 'src/App' }
    const characters: NativeThemeComponent = { id: 'src/CharacterBrowser', label: 'CharacterBrowser', area: 'Panels', sources: ['css', 'tsx'], selectors: ['[class*="_browser_"]'], cssClasses: ['browser', 'avatar'], nativeKey: 'src/CharacterBrowser' }
    const personas: NativeThemeComponent = { id: 'src/PersonaBrowser', label: 'PersonaBrowser', area: 'Panels', sources: ['css', 'tsx'], selectors: ['[class*="_browser_"]'], cssClasses: ['browser', 'avatar'], nativeKey: 'src/PersonaBrowser' }

    const resolution = resolveElement(document.querySelector('#ambiguous-image')!, [app, characters, personas])
    expect(resolution.nativeContext?.component.label).not.toBe('CharacterBrowser')
    expect(resolution.nativeContext?.component.label).not.toBe('PersonaBrowser')
  })

  test('a BubbleMessage name remains the target while BubbleMessage is context', () => {
    document.body.innerHTML = '<div data-component="BubbleMessage"><span class="_nameChar_abcd_1">Mira</span></div>'
    const resolution = resolveElement(document.querySelector('span')!, [component('BubbleMessage', ['nameChar'])])
    expect(resolution.target.tagName).toBe('span')
    expect(resolution.target.recommended.selector).toBe('[data-component="BubbleMessage"] [class*="_nameChar_"]')
    expect(resolution.nativeContext?.component.label).toBe('BubbleMessage')
    expect(resolution.activeScopeId).toBe('context:src/BubbleMessage')
    expect(resolution.scopeCandidates.find((entry) => entry.id === resolution.activeScopeId)?.persistence).toBe('persistent')
  })

  test('message scopes split assistant, user, and both while pairing *User CSS-module parts', () => {
    document.body.innerHTML = `
      <div data-component="BubbleMessage" class="_card_abcd_1">
        <span class="_name_abcd_2">Mira</span><div class="_content_abcd_3"></div><div class="_actionsWrap_abcd_8"></div>
      </div>
      <div data-component="BubbleMessage" class="_card_abcd_4 _user_abcd_5">
        <span class="_nameUser_abcd_6">Me</span><div class="_contentUser_abcd_7"></div><div class="_actionsWrap_abcd_9"></div>
      </div>`
    const entry = component('BubbleMessage', ['card', 'user', 'name', 'nameUser', 'content', 'contentUser', 'actionsWrap'])
    const assistant = resolveElement(document.querySelector('._name_abcd_2')!, [entry])
    const active = assistant.scopeCandidates.find((scope) => scope.id === assistant.activeScopeId)!
    expect(active.messageSide).toBe('assistant')
    expect(active.selector).toContain(':not([class*="_user_"])')
    const family = assistant.scopeCandidates.filter((scope) => scope.messageFamilyId === active.messageFamilyId)
    const user = family.find((scope) => scope.messageSide === 'user')!
    const both = family.find((scope) => scope.messageSide === 'both')!
    expect(user.selector).toContain('[class*="_user_"] [class*="_nameUser_"]')
    expect(both.selector).toContain('[class*="_name_"]')
    expect(both.selector).toContain('[class*="_nameUser_"]')
    expect(both.selector).toContain(',')

    const nameParts = assistant.scopeCandidates.filter((scope) => scope.type === 'native-part' && scope.label === 'Name')
    expect(nameParts.some((scope) => scope.messageSide === 'assistant' && scope.selector.includes('_name_'))).toBe(true)
    expect(nameParts.some((scope) => scope.messageSide === 'user' && scope.selector.includes('_nameUser_'))).toBe(true)
    expect(assistant.scopeCandidates.some((scope) => scope.type === 'native-part' && scope.label === 'Name User')).toBe(false)
  })

  test('shared message parts isolate by the user marker even without a *User counterpart class', () => {
    document.body.innerHTML = `
      <div data-component="MinimalMessage" class="_card_efgh_1"><div class="_actionsWrap_efgh_2"></div></div>
      <div data-component="MinimalMessage" class="_card_efgh_3 _user_efgh_4"><div class="_actionsWrap_efgh_5"></div></div>`
    const entry = component('MinimalMessage', ['card', 'user', 'actionsWrap'])
    const resolution = resolveElement(document.querySelector('._actionsWrap_efgh_2')!, [entry])
    const actions = resolution.scopeCandidates.filter((scope) => scope.type === 'native-part' && scope.label === 'Actions Wrap')
    expect(actions.find((scope) => scope.messageSide === 'assistant')?.selector).toContain(':not([class*="_user_"]) [class*="_actionsWrap_"]')
    expect(actions.find((scope) => scope.messageSide === 'user')?.selector).toContain('[class*="_user_"] [class*="_actionsWrap_"]')
  })

  test('picking a user-only part defaults the message facet to User', () => {
    document.body.innerHTML = `
      <div data-component="BubbleMessage" class="_card_ijkl_1"><span class="_name_ijkl_2">Mira</span></div>
      <div data-component="BubbleMessage" class="_card_ijkl_3 _user_ijkl_4"><span class="_nameUser_ijkl_5">Me</span></div>`
    const entry = component('BubbleMessage', ['card', 'user', 'name', 'nameUser'])
    const resolution = resolveElement(document.querySelector('._nameUser_ijkl_5')!, [entry])
    expect(resolution.scopeCandidates.find((scope) => scope.id === resolution.activeScopeId)?.messageSide).toBe('user')
  })


  test('ancestor scopes inside MinimalMessage stay component-contextual instead of leaking globally', () => {
    document.body.innerHTML = '<div data-component="MinimalMessage" class="_card_scope_1"><div class="_avatar_scope_2"><img class="_image_scope_3"></div></div><div data-component="CharacterCard"><div class="_avatar_other_1"></div></div>'
    const resolution = resolveElement(document.querySelector('._image_scope_3')!, [component('MinimalMessage', ['card', 'avatar', 'image'])])
    const avatarLevel = resolution.targetLevels.find((level) => level.element === document.querySelector('._avatar_scope_2'))!
    const avatarScope = resolution.scopeCandidates.find((scope) => scope.id === avatarLevel.scopeId)!
    expect(avatarScope.selector).toContain('[data-component="MinimalMessage"]')
    expect(avatarScope.selector).toContain('[class*="_avatar_"]')
    expect(avatarScope.selector).not.toBe('[class*="_avatar_"]')
  })

  test('composes contextual selectors and reports missing selector health', () => {
    expect(composeContextSelector('[data-component="BubbleMessage"]', '[class*="_nameChar_"]')).toBe('[data-component="BubbleMessage"] [class*="_nameChar_"]')
    expect(composeContextSelector('[class*="_row_"]', '[class*="_row_"] [class*="_desc_"]')).toBe('[class*="_row_"] [class*="_desc_"]')
    expect(composeContextSelector('[data-component="InputArea"]', ':scope[class*="_container_"]')).toBe('[data-component="InputArea"][class*="_container_"]')
    expect(composeContextSelector('.bad, .shape', '.local')).toBeNull()
    expect(evaluateSelectorHealth('.not-mounted').status).toBe('missing')
    expect(appendPseudoToSelectorList('.assistant, .user', '::before')).toBe('.assistant::before,\n.user::before')
  })

  test('simplifies repeated module segments only when the mounted match set is unchanged', () => {
    document.body.innerHTML = '<div class="_row_abcd_1"><div class="_row_abcd_2"><span class="_desc_abcd_3"></span></div></div>'
    expect(simplifyRedundantModuleSegments('[class*="_row_"] [class*="_row_"] [class*="_desc_"]')).toBe('[class*="_row_"] [class*="_desc_"]')
    document.body.innerHTML = '<div class="_row_abcd_1"><span class="_desc_abcd_4"></span><div class="_row_abcd_2"><span class="_desc_abcd_3"></span></div></div>'
    expect(simplifyRedundantModuleSegments('[class*="_row_"] [class*="_row_"] [class*="_desc_"]')).toBe('[class*="_row_"] [class*="_row_"] [class*="_desc_"]')
  })

  test('DOM-only CSS-module targets remain persistent without native metadata', () => {
    document.body.innerHTML = '<div class="_weirdExtensionPanel_abcd_42"></div>'
    const resolution = resolveElement(document.querySelector('div')!, [])
    expect(resolution.nativeContext).toBeUndefined()
    expect(resolution.activeScopeId).toBe('similar')
    const scope = resolution.scopeCandidates.find((entry) => entry.id === 'similar')!
    expect(scope.source).toBe('dom-scoped'); expect(scope.persistence).toBe('persistent'); expect(scope.selector).toBe('[class*="_weirdExtensionPanel_"]')
  })

  test('a structural mounted-node identity is explicitly volatile', () => {
    document.body.innerHTML = '<main><div><span>plain</span></div></main>'
    const resolution = resolveElement(document.querySelector('span')!, [])
    expect(resolution.activeScopeId).toBe('mounted')
    expect(resolution.scopeCandidates[0].persistence).toBe('volatile')
  })
  test('a stable unique semantic data id is persistent even without native context', () => {
    document.body.innerHTML = '<article data-message-id="m-123">Message</article>'
    const resolution = resolveElement(document.querySelector('article')!, [])
    expect(resolution.target.recommended.selector).toBe('[data-message-id="m-123"]')
    expect(resolution.scopeCandidates.find((entry) => entry.id === resolution.activeScopeId)?.persistence).toBe('persistent')
  })
})
